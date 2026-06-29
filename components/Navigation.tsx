'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { PRODUCT } from '@/lib/shadow-board/product'
import { useAuth } from '@/hooks/useAuth'
import { useWorkspace } from '@/hooks/useWorkspace'

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
      { href: '/admin/referrals', code: 'RF', key: 'adminReferrals' },
    ],
  },
]

const mobileItems = [
  { href: '/dashboard', key: 'home' },
  { href: '/company', key: 'brain' },
  { href: '/shadow-board', key: 'review' },
  { href: '/decisions', key: 'you' },
]

function userMetadataName(user: ReturnType<typeof useAuth>['user']): string | null {
  const metadata = user?.user_metadata ?? {}
  const name = metadata.full_name ?? metadata.name
  return typeof name === 'string' && name.trim() ? name.trim() : null
}

function initialsFor(value: string): string {
  const parts = value
    .replace(/@.*/, '')
    .split(/\s+|[._-]+/)
    .map(part => part.trim())
    .filter(Boolean)

  return (parts[0]?.[0] ?? 'B').concat(parts[1]?.[0] ?? 'G').toUpperCase()
}

export default function Navigation() {
  const pathname = usePathname()
  const tNav = useTranslations('nav')
  const tShell = useTranslations('shell')
  const { user, profile, isAdmin, loading } = useAuth()
  const { workspace } = useWorkspace()
  if (pathname === '/' || pathname === '/login' || pathname === '/reset-password') return null

  const companyName = workspace?.company?.name ?? workspace?.organization?.name ?? 'Board Governance OS'
  const companyInitials = initialsFor(companyName)
  const periodLabel = workspace?.latest_session
    ? `${workspace.latest_session.session_type} - ${workspace.latest_session.status}`
    : workspace?.company?.stage ?? workspace?.organization_memberships[0]?.role ?? 'Workspace'
  const displayName = profile?.full_name
    || userMetadataName(user)
    || profile?.email
    || user?.email
    || (loading ? 'Carregando...' : 'Visitante')
  const displayRole = user ? (isAdmin ? 'Admin' : tShell('founderRole')) : 'Preview'

  return (
    <>
      <aside className="sb-rail">
        <Link href="/dashboard" className="sb-brand">
          <Image
            src="/brand/mark.png"
            alt=""
            width={34}
            height={34}
            className="sb-brand-mark"
            priority
          />
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
          <div className="sb-avatar">{initialsFor(displayName)}</div>
          <div>
            <p>{displayName}</p>
            <span>{displayRole}</span>
          </div>
        </div>
      </aside>

      <header className="sb-topbar">
        <button className="sb-company-switcher">
          <span>{companyInitials}</span>
          {companyName}
          <small>{periodLabel}</small>
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
