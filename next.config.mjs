import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['mammoth', 'pdf-parse'],
  webpack: (config) => {
    // Required for pdfjs-dist v5 in Next.js
    config.resolve.alias.canvas = false
    return config
  },
  // Redirect common alternative slugs to the canonical legal pages
  async redirects() {
    return [
      { source: '/legal/terms',           destination: '/legal/tos', permanent: true },
      { source: '/legal/acceptable-use',  destination: '/legal/aup', permanent: true },
    ]
  },
}

export default withNextIntl(nextConfig)
