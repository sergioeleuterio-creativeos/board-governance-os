import type { MetadataRoute } from 'next'
import { getPublicAppUrl } from '@/lib/shadow-board/site-url'

const appUrl = getPublicAppUrl()

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
