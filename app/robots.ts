import type { MetadataRoute } from 'next'
import { getPublicAppUrl } from '@/lib/shadow-board/site-url'

const appUrl = getPublicAppUrl()

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/api/',
        '/login',
        '/reset-password',
        '/dashboard',
        '/company',
        '/company-brain',
        '/governance-run',
        '/diagnosis',
        '/briefings',
        '/board-pack',
        '/shadow-board',
        '/rooms',
        '/outputs',
        '/decisions',
        '/follow-ups',
        '/design-system',
        '/mobile',
      ],
    },
    sitemap: `${appUrl}/sitemap.xml`,
  }
}
