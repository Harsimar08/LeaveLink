export const DEPARTMENTS = ['MCA', 'PGDM', 'BBA', 'BCA', 'BA-ECO']

// Teachers are assigned the Coordinators of the departments they pick
export const TEACHER_ROLES = ['faculty']
// Roles that pick their departments from the list
export const DEPARTMENT_ROLES = [...TEACHER_ROLES, 'coordinator']

export const departmentLabelFor = (role) =>
  role === 'coordinator' ? 'Departments you coordinate' : 'Department'

// "BCA, MCA" -> ['BCA', 'MCA']
export const splitDepartments = (value) => {
  const parts = Array.isArray(value) ? value : String(value || '').split(',')
  return [...new Set(parts.map((part) => String(part).trim()).filter(Boolean))]
}

export const joinDepartments = (list) => DEPARTMENTS.filter((d) => list.includes(d)).join(', ')

export const sharesDepartment = (a, b) => {
  const left = splitDepartments(a)
  return splitDepartments(b).some((d) => left.includes(d))
}
