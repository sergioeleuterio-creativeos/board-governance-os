import type { Metadata } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { PRODUCT } from '@/lib/shadow-board/product'

export const metadata: Metadata = {
  title: PRODUCT.name,
  description: PRODUCT.description,
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
