const CANONICAL_PUBLIC_URL = 'https://www.board-os.ai'

export function getPublicAppUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim() || CANONICAL_PUBLIC_URL

  try {
    const url = new URL(configured)
    if (url.hostname === 'board-os.ai') {
      url.hostname = 'www.board-os.ai'
    }
    return url.toString().replace(/\/$/, '')
  } catch {
    return CANONICAL_PUBLIC_URL
  }
}
