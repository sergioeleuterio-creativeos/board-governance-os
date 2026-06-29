export function cleanDisplayName(value: string | null | undefined): string | null {
  const cleaned = value?.trim()
  return cleaned ? cleaned : null
}

export function nameFromEmail(email: string | null | undefined): string | null {
  const localPart = email?.split('@')[0]?.trim()
  if (!localPart) return null

  const parts = localPart
    .split(/[._-]+/)
    .map(part => part.trim())
    .filter(Boolean)

  if (!parts.length) return null

  return parts
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

export function displayNameFromProfile({
  fullName,
  metadataName,
  email,
  fallback = 'Usuario',
}: {
  fullName?: string | null
  metadataName?: string | null
  email?: string | null
  fallback?: string
}) {
  return cleanDisplayName(fullName)
    ?? cleanDisplayName(metadataName)
    ?? nameFromEmail(email)
    ?? fallback
}
