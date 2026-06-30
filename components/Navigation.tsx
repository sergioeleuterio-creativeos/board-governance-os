'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { PRODUCT } from '@/lib/shadow-board/product'
import { useAuth } from '@/hooks/useAuth'
import { useWorkspace } from '@/hooks/useWorkspace'
import { displayNameFromProfile } from '@/lib/display-name'

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
    key: 'operations',
    items: [
      { href: '/admin', code: 'AD', key: 'admin' },
      { href: '/admin/users', code: 'US', key: 'adminUsers' },
      { href: '/admin/sessions', code: 'SE', key: 'adminSessions' },
      { href: '/admin/referrals', code: 'RF', key: 'adminReferrals' },
      { href: '/admin/documents', code: 'DO', key: 'adminDocuments' },
      { href: '/admin/agents', code: 'AG', key: 'adminAgents' },
      { href: '/admin/training-packs', code: 'TP', key: 'adminTrainingPacks' },
      { href: '/admin/ai', code: 'AI', key: 'adminAI' },
      { href: '/admin/partners', code: 'PT', key: 'adminPartners' },
      { href: '/admin/audit', code: 'AU', key: 'adminAudit' },
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
  const [switchingCompany, setSwitchingCompany] = useState(false)
  if (pathname === '/' || pathname === '/login' || pathname === '/reset-password' || pathname === '/board-pack/presentation') return null

  const companyName = workspace?.company?.name ?? workspace?.organization?.name ?? 'Board Governance OS'
  const companyInitials = initialsFor(companyName)
  const selectableCompanies = workspace?.companies?.length
    ? workspace.companies
    : workspace?.company ? [workspace.company] : []
  const periodLabel = workspace?.latest_session
    ? `${workspace.latest_session.session_type} - ${workspace.latest_session.status}`
    : workspace?.company?.stage ?? workspace?.organization_memberships[0]?.role ?? 'Workspace'
  const displayName = loading
    ? 'Carregando...'
    : displayNameFromProfile({
      fullName: profile?.full_name,
      metadataName: userMetadataName(user),
      email: profile?.email ?? user?.email,
      fallback: 'Usuario',
    })
  const displayRole = user ? (isAdmin ? 'Admin' : tShell('founderRole')) : 'Visitante'

  async function handleCompanyChange(companyId: string) {
    if (!companyId || companyId === workspace?.company?.id) return
    setSwitchingCompany(true)
    const response = await fetch('/api/workspace/current-company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: companyId }),
    })
    if (response.ok) window.location.reload()
    setSwitchingCompany(false)
  }

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
        <div className="sb-company-switcher">
          <span>{companyInitials}</span>
          <select
            value={workspace?.company?.id ?? ''}
            onChange={(event) => void handleCompanyChange(event.target.value)}
            disabled={switchingCompany || selectableCompanies.length < 2}
            aria-label="Selecionar empresa"
          >
            {selectableCompanies.length
              ? selectableCompanies.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))
              : <option value="">{companyName}</option>}
          </select>
          <small>{periodLabel}</small>
        </div>
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
