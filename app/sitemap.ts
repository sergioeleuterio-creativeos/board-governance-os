import type { MetadataRoute } from 'next'

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.board-os.ai'

const publicRoutes = [
  '',
  '/dashboard',
  '/company',
  '/governance-run',
  '/board-pack',
  '/shadow-board',
  '/decisions',
  '/follow-ups',
  '/login',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return publicRoutes.map(route => ({
    url: `${appUrl}${route}`,
    lastModified: now,
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : 0.7,
  }))
}
