'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { companyContext } from '@/lib/shadow-board/demo-data'
import { PRODUCT } from '@/lib/shadow-board/product'

const navGroups = [
  {
    key: 'workspace',
    items: [
      { href: '/dashboard', code: '01', key: 'dashboard' },
      { href: '/company', code: '02', key: 'company' },
      { href: '/company/intake', code: 'IN', key: 'intake' },
    ],
  },
  {
    key: 'governance',
    items: [
      { href: '/governance-run', code: '03', key: 'governanceRun' },
      { href: '/board-pack', code: '04', key: 'boardPack' },
      { href: '/shadow-board', code: '05', key: 'shadowBoard' },
    ],
  },
  {
    key: 'decisions',
    items: [
      { href: '/decisions', code: '06', key: 'decisions' },
      { href: '/follow-ups', code: '07', key: 'followUps' },
    ],
  },
  {
    key: 'reference',
    items: [
      { href: '/design-system', code: 'DS', key: 'designSystem' },
      { href: '/mobile', code: 'MB', key: 'mobile' },
    ],
  },
  {
    key: 'operations',
    items: [
      { href: '/admin', code: 'AD', key: 'admin' },
      { href: '/admin/users', code: 'US', key: 'adminUsers' },
      { href: '/admin/sessions', code: 'SE', key: 'adminSessions' },
    ],
  },
]

const mobileItems = [
  { href: '/dashboard', key: 'home' },
  { href: '/company', key: 'brain' },
  { href: '/shadow-board', key: 'review' },
  { href: '/decisions', key: 'you' },
]

export default function Navigation() {
  const pathname = usePathname()
  const tNav = useTranslations('nav')
  const tShell = useTranslations('shell')
  if (pathname === '/login') return null

  return (
    <>
      <aside className="sb-rail">
        <Link href="/dashboard" className="sb-brand">
          <span className="sb-diamond" />
          <span>
            <strong>{PRODUCT.name}</strong>
            <em>{PRODUCT.moduleName}</em>
          </span>
        </Link>

        <nav className="sb-rail-nav" aria-label={`${PRODUCT.name} navigation`}>
          {navGroups.map(group => (
            <div key={group.key} className="sb-nav-group">
              <p>{tNav(`groups.${group.key}`)}</p>
              {group.items.map(item => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <Link key={item.href} href={item.href} className={`sb-nav-link ${active ? 'is-active' : ''}`}>
                    <span>{item.code}</span>
                    {tNav(`items.${item.key}`)}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="sb-user-card">
          <div className="sb-avatar">LM</div>
          <div>
            <p>{companyContext.founder}</p>
            <span>{tShell('founderRole')}</span>
          </div>
        </div>
      </aside>

      <header className="sb-topbar">
        <button className="sb-company-switcher">
          <span>NV</span>
          {companyContext.company}
          <small>{companyContext.period}</small>
        </button>
        <div className="sb-search">
          <span>{tShell('search')}</span>
          <kbd>Cmd K</kbd>
        </div>
        <div className="sb-brain-status">
          <span />
          {tShell('brainActive')}
        </div>
      </header>

      <nav className="sb-mobile-tabs" aria-label="Mobile navigation">
        {mobileItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return <Link key={item.href} href={item.href} className={active ? 'is-active' : ''}>{tNav(`mobile.${item.key}`)}</Link>
        })}
      </nav>
    </>
  )
}
