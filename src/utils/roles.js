export const formatRole = (role) =>
  (role || '').split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')

// "Dr. Anita Rao" -> "Dr. Anita", "Anita Rao" -> "Anita"
export const shortName = (name) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'there'
  return /^(dr|mr|mrs|ms|prof)\.?$/i.test(parts[0]) && parts[1] ? `${parts[0]} ${parts[1]}` : parts[0]
}

export const isApprover = (role) => role === 'principal' || role === 'management'

export const dashboardPathFor = (role) =>
  role === 'management' ? '/management-dashboard' : role === 'principal' ? '/principal-dashboard' : '/dashboard'

// Whose leave each approver decides on
export const approvalRolesFor = (role) => {
  switch (role) {
    case 'management':
      return ['principal']
    case 'principal':
      return ['chief_coordinator', 'coordinator', 'faculty']
    default:
      return []
  }
}

export const pendingApprovalsFor = (user, leaves) => {
  const roles = approvalRolesFor(user?.role)
  return leaves.filter((l) => l.status === 'Pending' && l.user?.id !== user?.id && roles.includes(l.user?.role))
}
