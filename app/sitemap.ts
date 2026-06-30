import type { MetadataRoute } from 'next'
import { getPublicAppUrl } from '@/lib/shadow-board/site-url'

const appUrl = getPublicAppUrl()

const publicRoutes = ['', '/privacy', '/terms']

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return publicRoutes.map(route => ({
    url: `${appUrl}${route}`,
    lastModified: now,
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : 0.7,
  }))
}
