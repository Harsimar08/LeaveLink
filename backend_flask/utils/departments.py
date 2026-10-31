"""Institute departments and which Coordinator looks after each one.

Faculty and Coordinators may belong to several departments;
they are stored in users.department as a comma-separated list, e.g. "BCA, MCA".
A teacher's Coordinators are whichever Coordinators have the same departments.
"""
from flask import g, has_request_context

DEPARTMENTS = ['MCA', 'PGDM', 'BBA', 'BCA', 'BA-ECO']
TEACHER_ROLES = ('faculty',)
DEPARTMENT_ROLES = TEACHER_ROLES + ('coordinator',)


def split_departments(value):
    if isinstance(value, (list, tuple)):
        parts = value
    else:
        parts = (value or '').split(',')
    seen = []
    for part in parts:
        name = str(part).strip()
        if name and name not in seen:
            seen.append(name)
    return seen


def normalize_departments(value):
    """Returns (stored_value, error). Keeps the institute's order, e.g. "MCA, BCA"."""
    chosen = split_departments(value)
    if not chosen:
        return None, 'Select at least one department.'
    unknown = [d for d in chosen if d not in DEPARTMENTS]
    if unknown:
        return None, f'Unknown department: {", ".join(unknown)}. Choose from {", ".join(DEPARTMENTS)}.'
    return ', '.join(d for d in DEPARTMENTS if d in chosen), None


def coordinator_map():
    """{department: [coordinator names]}, cached for the current request."""
    if has_request_context() and hasattr(g, '_coordinator_map'):
        return g._coordinator_map
    from models.user import User
    mapping = {d: [] for d in DEPARTMENTS}
    coordinators = User.query.filter(User.role == 'coordinator', User.is_active.isnot(False)).order_by(User.name).all()
    for coordinator in coordinators:
        for dept in split_departments(coordinator.department):
            mapping.setdefault(dept, []).append(coordinator.name)
    if has_request_context():
        g._coordinator_map = mapping
    return mapping


def coordinators_for(user):
    """[{'department': 'BCA', 'names': ['Mr. A']}] for a teacher; [] for other roles."""
    if user.role not in TEACHER_ROLES:
        return []
    mapping = coordinator_map()
    return [{'department': d, 'names': mapping.get(d, [])} for d in split_departments(user.department)]
