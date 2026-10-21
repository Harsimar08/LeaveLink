// Only same-site paths are allowed, so a crafted link can't send users to another website
export const safeRedirectPath = (value) => {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/login')) return null
  return value
}
