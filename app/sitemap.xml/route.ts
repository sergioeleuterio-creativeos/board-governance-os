import { getPublicAppUrl } from '@/lib/shadow-board/site-url'

export const dynamic = 'force-dynamic'

const publicRoutes = [
  { path: '', changeFrequency: 'weekly', priority: '1' },
  { path: '/privacy', changeFrequency: 'monthly', priority: '0.7' },
  { path: '/terms', changeFrequency: 'monthly', priority: '0.7' },
]

function xmlEscape(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function GET() {
  const appUrl = getPublicAppUrl()
  const lastModified = new Date().toISOString()
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${publicRoutes.map(route => `<url>
  <loc>${xmlEscape(`${appUrl}${route.path}`)}</loc>
  <lastmod>${lastModified}</lastmod>
  <changefreq>${route.changeFrequency}</changefreq>
  <priority>${route.priority}</priority>
</url>`).join('\n')}
</urlset>
`

  return new Response(body, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
