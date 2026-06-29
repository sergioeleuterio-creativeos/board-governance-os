export const PRODUCT = {
  name: 'Board Governance OS',
  shortName: 'BGOS',
  moduleName: 'Shadow Board Review',
  category: 'Governance OS',
  description: 'Sistema operacional de governanca para empresas lideradas por founders',
  defaultLocale: 'pt-BR',
  supportedLocales: ['pt-BR', 'en', 'es'],
  localDevPort: 3001,
  localAppUrl: 'http://localhost:3001',
} as const

export type SupportedLocale = (typeof PRODUCT.supportedLocales)[number]
