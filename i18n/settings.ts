export const appLocales = ['pt-BR', 'en', 'es'] as const
export type AppLocale = (typeof appLocales)[number]

export const defaultAppLocale: AppLocale = 'pt-BR'

export const localeLabels: Record<AppLocale, string> = {
  'pt-BR': 'Portuguese (Brazil)',
  en: 'English',
  es: 'Spanish',
}

export function normalizeAppLocale(locale: string | null | undefined): AppLocale {
  if (locale === 'pt') return 'pt-BR'
  return appLocales.includes(locale as AppLocale) ? locale as AppLocale : defaultAppLocale
}
