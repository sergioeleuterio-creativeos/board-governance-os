export const PRODUCT = {
  name: 'Board OS',
  shortName: 'BOS',
  moduleName: 'Decision Room',
  category: 'Decision Infrastructure',
  description: 'Decision infrastructure for founder-led companies before they have a real board',
  defaultLocale: 'pt-BR',
  supportedLocales: ['pt-BR', 'en', 'es'],
  localDevPort: 3001,
  localAppUrl: 'http://localhost:3001',
} as const

export type SupportedLocale = (typeof PRODUCT.supportedLocales)[number]
