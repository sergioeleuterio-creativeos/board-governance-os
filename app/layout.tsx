import type { Metadata } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { PRODUCT } from '@/lib/shadow-board/product'

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.board-os.ai'

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  applicationName: PRODUCT.name,
  title: {
    default: PRODUCT.name,
    template: `%s | ${PRODUCT.name}`,
  },
  description: PRODUCT.description,
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/brand/mark.png', sizes: '512x512', type: 'image/png' },
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: [
      { url: '/brand/mark.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    url: '/',
    siteName: PRODUCT.name,
    title: PRODUCT.name,
    description: PRODUCT.description,
    locale: 'pt_BR',
    images: [
      {
        url: '/brand/site-thumbnail.png',
        width: 1200,
        height: 630,
        alt: `${PRODUCT.name} dashboard preview`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: PRODUCT.name,
    description: PRODUCT.description,
    images: ['/brand/site-thumbnail.png'],
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Navigation />
          <main className="sb-main">
            {children}
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
