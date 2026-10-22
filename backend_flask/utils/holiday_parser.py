"""Reads the holiday list out of an uploaded holiday PDF."""
import io
import re
from collections import Counter
from datetime import date, timedelta

from pypdf import PdfReader

MONTHS = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
}
MONTH_NAME = r'(?P<mon>jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'

DATE_PATTERNS = [
    # 26 January 2026, 26th Jan, 2026, 26-Jan-26, 26 Jan
    re.compile(r'\b(?P<d>\d{1,2})(?:st|nd|rd|th)?[\s\-/.,]*' + MONTH_NAME + r'\.?(?:[\s\-/.,]+(?P<y>\d{4}|\d{2}))?\b', re.I),
    # January 26, 2026 / Jan 26th 2026
    re.compile(r'\b' + MONTH_NAME + r'\.?[\s\-/.,]*(?P<d>\d{1,2})(?:st|nd|rd|th)?(?:,?[\s\-/.]+(?P<y>\d{4}))?\b', re.I),
    # 2026-01-26
    re.compile(r'\b(?P<y>\d{4})-(?P<m>\d{1,2})-(?P<d>\d{1,2})\b'),
    # 26.01.2026, 26/01/26, 26-01-2026 (day first, as written in India)
    re.compile(r'\b(?P<d>\d{1,2})[./-](?P<m>\d{1,2})[./-](?P<y>\d{4}|\d{2})\b'),
]

WEEKDAYS = r'\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tues?|wed|thu(?:rs?)?|fri|sat|sun)\b\.?'
# Weekday columns are dropped from names, but not the weekday inside names like "Good Friday"
NAME_WEEKDAYS = r'(?<!good )(?<!holy )(?<!ash )(?<!maundy )(?<!easter )' + WEEKDAYS
WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

HEADER_WORDS = {
    's', 'no', 'sr', 'sl', 'sno', 'serial', 'number', 'name', 'of', 'the', 'holiday', 'holidays',
    'festival', 'festivals', 'occasion', 'date', 'dates', 'day', 'days', 'weekday', 'list', 'particulars',
    'month', 'remarks', 'gazetted', 'restricted', 'optional', 'and', 'for', 'year', 'calendar',
    'academic', 'session', 'closed', 'public',
}
NOT_A_HOLIDAY = re.compile(r'^(dated?|issued|updated|w\.?\s?e\.?\s?f\.?|ref|circular|notice|no|note)\b', re.I)
DOCUMENT_META = re.compile(r'\b(?:dated?|issued|circular|notice|ref(?:erence)?|memo|order|w\.?e\.?f)\b', re.I)
RANGE_JOINERS = re.compile(r'^(?:-|to|till|until|through)$', re.I)
LIST_JOINERS = re.compile(r'^(?:&|and|,)$', re.I)
NATIONAL_KEYWORDS = ('republic', 'independence', 'gandhi', 'labour', 'labor', 'may day', 'ambedkar', 'national')
MAX_RANGE_DAYS = 10


def extract_text(pdf_bytes):
    reader = PdfReader(io.BytesIO(pdf_bytes))
    return '\n'.join(page.extract_text() or '' for page in reader.pages)


def _year_context(text):
    academic = re.search(r'\b(20\d{2})\s*[-/]\s*(?:20)?(\d{2})\b', text)
    if academic and int(academic.group(2)) == (int(academic.group(1)) + 1) % 100:
        return {'academic_start': int(academic.group(1))}
    years = Counter(int(y) for y in re.findall(r'\b(20\d{2})\b', text))
    return {'year': years.most_common(1)[0][0] if years else date.today().year}


def _resolve_year(raw, month, ctx):
    if raw:
        year = int(raw)
        return year + 2000 if year < 100 else year
    if 'academic_start' in ctx:
        return ctx['academic_start'] if month >= 7 else ctx['academic_start'] + 1
    return ctx['year']


def _find_dates(line, ctx):
    found = []
    for pattern in DATE_PATTERNS:
        for m in pattern.finditer(line):
            groups = m.groupdict()
            month = MONTHS[groups['mon'][:3].lower()] if groups.get('mon') else int(groups['m'])
            try:
                value = date(_resolve_year(groups.get('y'), month, ctx), month, int(groups['d']))
            except (ValueError, TypeError):
                continue
            found.append((m.start(), m.end(), value))
    found.sort(key=lambda f: (f[0], -(f[1] - f[0])))
    kept = []
    for item in found:
        if not kept or item[0] >= kept[-1][1]:
            kept.append(item)
    return kept


def _is_header(text):
    words = re.findall(r'[a-z]+', text.lower())
    return bool(words) and all(w in HEADER_WORDS for w in words)


def _clean_name(text):
    text = re.sub(NAME_WEEKDAYS, ' ', text, flags=re.I)
    text = re.sub(r'\b(?:19|20)\d{2}\b', ' ', text)
    text = re.sub(r'^\W*\(?\d{1,3}\s*[.)]?\s+', ' ', text.strip() + ' ')
    text = re.sub(r'(?<![A-Za-z])\d{1,3}(?![A-Za-z])', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip(' |:;,.-()[]*#')
    text = re.sub(r'^(?:to|on|and|&)\s+|\s+(?:to|on|and|&)$', '', text, flags=re.I).strip(' |:;,.-()[]')
    if len(re.findall(r'[A-Za-z]', text)) < 3 or _is_header(text) or NOT_A_HOLIDAY.match(text):
        return ''
    return text


def _date_groups(line, matches):
    """Merge dates joined by 'to' into ranges and by 'and' into lists sharing one name."""
    groups = []
    for start, end, value in matches:
        if groups:
            joiner = re.sub(WEEKDAYS, ' ', line[groups[-1]['end']:start], flags=re.I).strip(' ,()')
            if not joiner or RANGE_JOINERS.match(joiner):
                first = groups[-1]['dates'][-1]
                if 0 < (value - first).days <= MAX_RANGE_DAYS:
                    groups[-1]['dates'] += [first + timedelta(days=i) for i in range(1, (value - first).days + 1)]
                    groups[-1]['end'] = end
                    continue
            elif LIST_JOINERS.match(joiner):
                groups[-1]['dates'].append(value)
                groups[-1]['end'] = end
                continue
        groups.append({'start': start, 'end': end, 'dates': [value]})
    return groups


def _holiday_type(name):
    lower = name.lower()
    return 'national' if any(k in lower for k in NATIONAL_KEYWORDS) else 'religious'


def parse_holidays_text(text):
    ctx = _year_context(text)
    found = {}
    pending_names = []
    waiting_dates = []

    def add(dates, name):
        for d in dates:
            found.setdefault((d, name.lower()), {'date': d, 'name': name})

    for raw_line in text.splitlines():
        line = re.sub(r'\s+', ' ', raw_line.replace('\u2013', '-').replace('\u2014', '-')).strip()
        if not line:
            continue
        matches = _find_dates(line, ctx)

        if not matches:
            if _is_header(line):
                pending_names = []
                waiting_dates = []
                continue
            name = _clean_name(line)
            if not name:
                continue
            if waiting_dates:
                add(waiting_dates, name)
                waiting_dates = []
            else:
                pending_names = (pending_names + [name])[-2:]
            continue

        waiting_dates = []
        # "Dated: 18.12.2025", "Circular No. ... dated ..." etc. are letter details, not holidays
        if DOCUMENT_META.search(line[:matches[0][0]]):
            pending_names = []
            continue

        groups = _date_groups(line, matches)
        segments = []
        for i, group in enumerate(groups):
            before_start = groups[i - 1]['end'] if i else 0
            after_end = groups[i + 1]['start'] if i + 1 < len(groups) else len(line)
            segments.append((_clean_name(line[before_start:group['start']]), _clean_name(line[group['end']:after_end])))

        names_before = bool(segments[0][0])
        for group, (before, after) in zip(groups, segments):
            name = before if names_before else after
            if not name and len(groups) == 1:
                name = after or ' '.join(pending_names)
            if name:
                add(group['dates'], name)
            else:
                waiting_dates = group['dates']
        pending_names = []

    holidays = sorted(found.values(), key=lambda h: (h['date'], h['name']))
    return [{
        'date': h['date'].isoformat(),
        'name': h['name'],
        'type': _holiday_type(h['name']),
        'day': WEEKDAY_NAMES[h['date'].weekday()],
    } for h in holidays]


def parse_holiday_pdf(pdf_bytes):
    try:
        return parse_holidays_text(extract_text(pdf_bytes))
    except Exception as e:
        print(f'[HOLIDAYS] Could not read PDF: {e}')
        return []
