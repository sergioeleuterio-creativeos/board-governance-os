import type { MetadataRoute } from 'next'
import { PRODUCT } from '@/lib/shadow-board/product'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: PRODUCT.name,
    short_name: PRODUCT.shortName,
    description: PRODUCT.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f2ed',
    theme_color: '#171511',
    icons: [
      {
        src: '/brand/mark.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
