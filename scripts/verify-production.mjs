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

function requireText(text, needle, label) {
  if (!text.includes(needle)) {
    throw new Error(`${label} is missing ${needle}`)
  }
}

const checks = [
  async () => {
    const { response } = await assertOk('/dashboard', 'text/html')
    const html = await response.text()
    requireText(html, `<link rel="canonical" href="${baseUrl}`, 'dashboard metadata')
    requireText(html, `${baseUrl}/brand/site-thumbnail.png`, 'dashboard metadata')
    return 'dashboard metadata'
  },
  async () => {
    await assertOk('/login', 'text/html')
    return 'login page'
  },
  async () => {
    await assertOk('/brand/mark.png', 'image/png')
    await assertOk('/brand/site-thumbnail.png', 'image/png')
    return 'brand images'
  },
  async () => {
    const { response } = await assertOk('/manifest.webmanifest', 'application/manifest+json')
    const manifest = await response.json()
    if (manifest.name !== 'Board Governance OS') {
      throw new Error(`manifest name is ${manifest.name}`)
    }
    requireText(JSON.stringify(manifest), '/brand/mark.png', 'manifest')
    return 'web manifest'
  },
  async () => {
    const { response } = await assertOk('/robots.txt', 'text/plain')
    const robots = await response.text()
    requireText(robots, `Sitemap: ${baseUrl}/sitemap.xml`, 'robots.txt')
    return 'robots.txt'
  },
  async () => {
    const { response } = await assertOk('/sitemap.xml', 'application/xml')
    const sitemap = await response.text()
    requireText(sitemap, `${baseUrl}/dashboard`, 'sitemap.xml')
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
