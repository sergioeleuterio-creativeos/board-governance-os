import type { MetadataRoute } from 'next'
import { getPublicAppUrl } from '@/lib/shadow-board/site-url'

const appUrl = getPublicAppUrl()

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/'],
    },
    sitemap: `${appUrl}/sitemap.xml`,
  }
}
