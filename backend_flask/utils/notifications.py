import os
import smtplib
import ssl
from datetime import timedelta, timezone
from email.message import EmailMessage
from email.utils import formataddr
from html import escape
from urllib.parse import quote

from flask import has_request_context, request

from models.user import User

# Who reviews a leave request, keyed by the requester's role
APPROVER_ROLE = {
    'faculty': 'principal',
    'coordinator': 'principal',
    'chief_coordinator': 'principal',
    'principal': 'management',
}

ROLE_NAMES = {
    'faculty': 'Faculty',
    'coordinator': 'Coordinator',
    'chief_coordinator': 'Chief Coordinator',
    'principal': 'Principal',
    'management': 'Management',
}

STATUS_COLORS = {'Pending': '#b45309', 'Approved': '#15803d', 'Rejected': '#b91c1c'}

# Leave timestamps are stored in UTC; the institute works in IST
DISPLAY_TZ = timezone(timedelta(hours=5, minutes=30))

ACTION_LABEL = 'Action Required – Review Leave Request'


def _mail_settings():
    host = os.getenv('SMTP_HOST', '').strip()
    user = os.getenv('SMTP_USER', '').strip()
    password = os.getenv('SMTP_PASSWORD', '')
    if not host or not user or not password:
        return None
    port = int(os.getenv('SMTP_PORT', '587'))
    return {
        'host': host,
        'port': port,
        'user': user,
        'password': password,
        'use_ssl': os.getenv('SMTP_USE_SSL', 'true' if port == 465 else 'false').strip().lower() in ('true', '1', 'yes'),
        'sender': os.getenv('MAIL_FROM', '').strip() or user,
        'sender_name': os.getenv('MAIL_FROM_NAME', 'LeaveLink').strip(),
    }


def _app_url():
    configured = (os.getenv('APP_URL') or '').strip()
    if configured:
        return configured.rstrip('/')
    if os.getenv('VERCEL') and has_request_context():
        host = request.headers.get('X-Forwarded-Host') or request.host
        return f'https://{host}'
    return (os.getenv('FRONTEND_URL') or 'http://localhost:5173').rstrip('/')


def review_link(leave, approver_role):
    target = quote(f'/leave-requests/{leave.id}', safe='')
    return f'{_app_url()}/login?redirect={target}&role={approver_role}'


def _format_date(value):
    return value.strftime('%d %b %Y') if value else '-'


def _application_date(leave):
    if not leave.created_at:
        return '-'
    return _format_date(leave.created_at.replace(tzinfo=timezone.utc).astimezone(DISPLAY_TZ))


def _format_days(days):
    days = float(days or 0)
    return str(int(days)) if days.is_integer() else f'{days:g}'


def _leave_rows(leave, include_decision=False):
    requester = leave.user
    rows = [
        ('Employee Name', requester.name),
        ('Role', ROLE_NAMES.get(requester.role, requester.role)),
        ('Leave Type', leave.leave_type),
        ('Application Date', _application_date(leave)),
        ('Start Date', _format_date(leave.start_date)),
        ('End Date', _format_date(leave.end_date)),
        ('Number of Leave Days', _format_days(leave.number_of_days)),
        ('Half Day / Full Day', 'Half Day' if leave.is_half_day else 'Full Day'),
        ('Reason for Leave', leave.reason),
        ('Status', leave.status),
    ]
    if include_decision:
        rows.append(('Approved By' if leave.status == 'Approved' else 'Rejected By', leave.approver_name or '-'))
        if leave.status == 'Rejected':
            rows.append(('Rejection Reason', leave.rejection_reason or 'No reason given'))
    return rows


def _build_email(to_address, subject, greeting, intro, rows, action_url=None,
                 action_label=ACTION_LABEL, action_note='You will be asked to sign in before the request opens.'):
    text_lines = [greeting, '', intro, '']
    text_lines += [f'{label}: {value}' for label, value in rows]
    if action_url:
        text_lines += ['', f'{action_label}:', action_url]
        if action_note:
            text_lines += [action_note]
    text_lines += ['', '— LeaveLink, Jagan Institute of Management Studies']

    row_html = ''.join(
        '<tr>'
        f'<td style="padding:8px 12px;border-bottom:1px solid #e6e9ef;color:#5b6779;font-size:14px;white-space:nowrap;vertical-align:top">{escape(label)}</td>'
        f'<td style="padding:8px 12px;border-bottom:1px solid #e6e9ef;color:{STATUS_COLORS.get(value, "#101826") if label == "Status" else "#101826"};'
        f'font-size:14px;font-weight:{700 if label == "Status" else 500}">{escape(str(value))}</td>'
        '</tr>'
        for label, value in rows
    )
    button_html = (
        f'<p style="margin:24px 0 8px"><a href="{escape(action_url)}" '
        'style="display:inline-block;background:#0e1a2e;color:#ffffff;text-decoration:none;font-weight:700;'
        f'font-size:15px;padding:12px 22px;border-radius:8px">{escape(action_label)}</a></p>'
        + (f'<p style="margin:0;color:#94a0b3;font-size:12px">{escape(action_note)}</p>' if action_note else '')
        if action_url else ''
    )
    table_html = f'<table style="width:100%;border-collapse:collapse">{row_html}</table>' if rows else ''
    html_body = (
        '<div style="background:#f6f7f9;padding:24px;font-family:Arial,Helvetica,sans-serif">'
        '<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6e9ef">'
        '<div style="background:#0e1a2e;color:#e8c877;padding:16px 24px;font-size:18px;font-weight:700">LeaveLink</div>'
        '<div style="padding:24px">'
        f'<p style="margin:0 0 12px;color:#101826;font-size:15px">{escape(greeting)}</p>'
        f'<p style="margin:0 0 18px;color:#101826;font-size:15px;line-height:1.5">{escape(intro)}</p>'
        f'{table_html}'
        f'{button_html}'
        '</div>'
        '<div style="padding:14px 24px;background:#f6f7f9;color:#94a0b3;font-size:12px">'
        'LeaveLink · Jagan Institute of Management Studies</div>'
        '</div></div>'
    )

    message = EmailMessage()
    message['To'] = to_address
    message['Subject'] = subject
    message.set_content('\n'.join(text_lines))
    message.add_alternative(html_body, subtype='html')
    return message


def _send(messages):
    if not messages:
        return 0
    settings = _mail_settings()
    if not settings:
        print(f'[MAIL] SMTP is not configured; skipped {len(messages)} email(s)')
        return 0

    sender = formataddr((settings['sender_name'], settings['sender']))
    sent = 0
    try:
        context = ssl.create_default_context()
        if settings['use_ssl']:
            server = smtplib.SMTP_SSL(settings['host'], settings['port'], timeout=15, context=context)
        else:
            server = smtplib.SMTP(settings['host'], settings['port'], timeout=15)
            server.starttls(context=context)
        with server:
            server.login(settings['user'], settings['password'])
            for message in messages:
                message['From'] = sender
                try:
                    server.send_message(message)
                    sent += 1
                except smtplib.SMTPException as e:
                    print(f"[MAIL] Could not send to {message['To']}: {e}")
    except Exception as e:
        print(f'[MAIL] Sending failed: {e}')
    print(f'[MAIL] Sent {sent} of {len(messages)} email(s)')
    return sent


def notify_leave_submitted(leave):
    """Confirmation to the requester and a review request to whoever can approve it."""
    try:
        requester = leave.user
        approver_role = APPROVER_ROLE.get(requester.role) if requester else None
        if not approver_role:
            return 0

        rows = _leave_rows(leave)
        role_name = ROLE_NAMES.get(requester.role, requester.role)
        messages = []
        if requester.email:
            messages.append(_build_email(
                requester.email,
                f'Leave request submitted – {leave.leave_type} ({_format_date(leave.start_date)})',
                f'Dear {requester.name},',
                f'Your leave request has been submitted successfully and is pending approval by the '
                f'{ROLE_NAMES[approver_role]}. You will receive another email once a decision is made.',
                rows,
            ))

        approvers = User.query.filter(
            User.role == approver_role,
            User.is_active.isnot(False),
            User.id != requester.id,
        ).all()
        action_url = review_link(leave, approver_role)
        for approver in approvers:
            if not approver.email:
                continue
            messages.append(_build_email(
                approver.email,
                f'Leave approval required – {requester.name} ({role_name})',
                f'Dear {approver.name},',
                f'{requester.name} ({role_name}) has submitted a leave request that requires your approval.',
                rows,
                action_url=action_url,
            ))
        return _send(messages)
    except Exception as e:
        print(f'[MAIL] Leave submission notification failed: {e}')
        return 0


def password_reset_link(token):
    return f'{_app_url()}/reset-password?token={quote(token, safe="")}'


def notify_password_reset(user, token, minutes):
    """Email a one-time link for choosing a new password."""
    try:
        link = password_reset_link(token)
        if not _mail_settings() and not os.getenv('VERCEL'):
            print(f'[MAIL] SMTP is not configured; password reset link for {user.email}: {link}')
            return 0
        message = _build_email(
            user.email,
            'Reset your LeaveLink password',
            f'Dear {user.name},',
            f'We received a request to reset the password for your LeaveLink account. '
            f'Use the button below to choose a new password. The link works once and expires in {minutes} minutes.',
            [],
            action_url=link,
            action_label='Reset Password',
            action_note='If you did not ask for this, you can ignore this email; your password will not change.',
        )
        return _send([message])
    except Exception as e:
        print(f'[MAIL] Password reset email failed: {e}')
        return 0


def notify_leave_decision(leave):
    """Tell the requester (and only the requester) that their leave was approved or rejected."""
    try:
        requester = leave.user
        if not requester or not requester.email:
            return 0
        decision = 'approved' if leave.status == 'Approved' else 'rejected'
        message = _build_email(
            requester.email,
            f'Leave request {decision} – {leave.leave_type} ({_format_date(leave.start_date)})',
            f'Dear {requester.name},',
            f'Your leave request has been {decision} by {leave.approver_name or "the approver"}.',
            _leave_rows(leave, include_decision=True),
        )
        return _send([message])
    except Exception as e:
        print(f'[MAIL] Leave decision notification failed: {e}')
        return 0
