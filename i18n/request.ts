import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { appLocales, defaultAppLocale, normalizeAppLocale } from './settings'

export const locales = appLocales
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = defaultAppLocale

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale)
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const raw = cookieStore.get('locale')?.value ?? ''
  const locale = normalizeAppLocale(raw)

  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
  }
})
