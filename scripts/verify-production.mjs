const DEFAULT_BASE_URL = 'https://www.board-os.ai'

function normalizeBaseUrl(input) {
  const raw = input || DEFAULT_BASE_URL
  const url = new URL(raw)
  if (url.hostname === 'board-os.ai') {
    url.hostname = 'www.board-os.ai'
  }
  return url.toString().replace(/\/$/, '')
}

const baseUrl = normalizeBaseUrl(process.argv[2] || process.env.NEXT_PUBLIC_APP_URL)
const canonicalUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL || DEFAULT_BASE_URL)

async function fetchUrl(path) {
  const url = new URL(path, baseUrl)
  const response = await fetch(url)
  return { url: url.toString(), response }
}

async function assertOk(path, expectedContentType) {
  const { url, response } = await fetchUrl(path)
  const contentType = response.headers.get('content-type') || ''
  const ok = response.ok && (!expectedContentType || contentType.includes(expectedContentType))

  if (!ok) {
    throw new Error(`${url} returned ${response.status} ${response.statusText} (${contentType || 'no content-type'})`)
  }

  return { url, response, contentType }
}

async function assertRedirect(path, expectedLocationPrefix) {
  const url = new URL(path, baseUrl)
  const response = await fetch(url, { redirect: 'manual' })
  const location = response.headers.get('location') || ''
  const absolutePrefix = new URL(expectedLocationPrefix, baseUrl).toString()
  const locationMatches = location.startsWith(expectedLocationPrefix) || location.startsWith(absolutePrefix)

  if (![301, 302, 303, 307, 308].includes(response.status) || !locationMatches) {
    throw new Error(`${url} should redirect to ${expectedLocationPrefix}, got ${response.status} ${location || 'no location'}`)
  }

  return { url: url.toString(), response, location }
}

function requireText(text, needle, label) {
  if (!text.includes(needle)) {
    throw new Error(`${label} is missing ${needle}`)
  }
}

const checks = [
  async () => {
    const { response } = await assertOk('/', 'text/html')
    const html = await response.text()
    requireText(html, `<link rel="canonical" href="${canonicalUrl}`, 'home metadata')
    requireText(html, 'Conte o que esta acontecendo. Saia com plano, decisao ou acao.', 'home page')
    return 'public home'
  },
  async () => {
    await assertOk('/login', 'text/html')
    return 'login page'
  },
  async () => {
    await assertOk('/reset-password', 'text/html')
    return 'reset password page'
  },
  async () => {
    await assertOk('/privacy', 'text/html')
    await assertOk('/terms', 'text/html')
    return 'legal pages'
  },
  async () => {
    await assertRedirect('/dashboard', '/login?next=%2Fdashboard')
    await assertRedirect('/company/intake', '/login?next=%2Fcompany%2Fintake')
    return 'protected app redirects'
  },
  async () => {
    await assertRedirect('/company', '/company-brain')
    await assertRedirect('/governance-run', '/diagnosis')
    await assertRedirect('/board-pack', '/outputs')
    await assertRedirect('/shadow-board', '/rooms')
    return 'legacy route bridges'
  },
  async () => {
    const apiPaths = [
      '/api/decision-room/readout',
      '/api/decision-room/turn',
      '/api/decision-room/intervention',
      '/api/decision-room/decision',
      '/api/decision-room/outputs',
      '/api/decision-room/session',
    ]

    for (const path of apiPaths) {
      const { url, response } = await fetchUrl(path)
      if (response.status !== 401) {
        throw new Error(`${url} should require auth, got ${response.status}`)
      }
    }

    return 'protected decision-room APIs'
  },
  async () => {
    await assertOk('/brand/mark.png', 'image/png')
    await assertOk('/brand/site-thumbnail.png', 'image/png')
    return 'brand images'
  },
  async () => {
    const { response } = await assertOk('/manifest.webmanifest', 'application/manifest+json')
    const manifest = await response.json()
    if (manifest.name !== 'Board OS') {
      throw new Error(`manifest name is ${manifest.name}`)
    }
    requireText(JSON.stringify(manifest), '/brand/mark.png', 'manifest')
    return 'web manifest'
  },
  async () => {
    const { response } = await assertOk('/robots.txt', 'text/plain')
    const robots = await response.text()
    requireText(robots, `Sitemap: ${canonicalUrl}/sitemap.xml`, 'robots.txt')
    requireText(robots, 'Disallow: /dashboard', 'robots.txt')
    return 'robots.txt'
  },
  async () => {
    const { response } = await assertOk('/sitemap.xml', 'application/xml')
    const sitemap = await response.text()
    requireText(sitemap, `<loc>${canonicalUrl}</loc>`, 'sitemap.xml')
    requireText(sitemap, `<loc>${canonicalUrl}/privacy</loc>`, 'sitemap.xml')
    requireText(sitemap, `<loc>${canonicalUrl}/terms</loc>`, 'sitemap.xml')
    if (sitemap.includes('/dashboard')) {
      throw new Error('sitemap.xml should not include protected app routes')
    }
    return 'sitemap.xml'
  },
]

console.log(`Verifying ${baseUrl}`)

for (const check of checks) {
  try {
    const label = await check()
    console.log(`OK ${label}`)
  } catch (error) {
    console.error(`FAIL ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}
