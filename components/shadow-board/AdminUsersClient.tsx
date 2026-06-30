'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { PageHeader, Panel, SectionTitle, StatusPill } from './ui'

type StatusTone = 'positive' | 'critical' | 'caution' | 'neutral'

type OrganizationOption = {
  id: string
  name: string
  slug?: string | null
}

type CompanyOption = {
  id: string
  name: string
  slug?: string | null
  organization_id?: string | null
}

type UserMembership = {
  organization_id?: string | null
  organization_name?: string | null
  company_id?: string | null
  company_name?: string | null
  role: string
  status: string
}

type AdminUser = {
  id: string
  email: string | null
  full_name: string | null
  is_super_admin: boolean
  status: string
  created_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
  organization_memberships: UserMembership[]
  company_memberships: UserMembership[]
}

type UsersResponse = {
  users: AdminUser[]
  organizations: OrganizationOption[]
  companies: CompanyOption[]
}

type ErrorResponse = {
  error?: string
}

const statusOptions = ['active', 'inactive', 'archived'] as const
const companyRoleOptions = ['founder', 'admin', 'member', 'viewer', 'advisor_operator'] as const
type CompanyRoleOption = (typeof companyRoleOptions)[number]

const companyRoleLabels: Record<CompanyRoleOption, string> = {
  founder: 'Fundador(a)',
  admin: 'Admin',
  member: 'Membro',
  viewer: 'Visitante',
  advisor_operator: 'Operador advisory',
}

const statusLabels: Record<(typeof statusOptions)[number], string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  archived: 'Arquivado',
}

function statusTone(status: string): StatusTone {
  if (status === 'active') return 'positive'
  if (status === 'inactive') return 'caution'
  if (status === 'archived') return 'critical'
  return 'neutral'
}

function dateLabel(value: string | null) {
  if (!value) return 'Nunca'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(new Date(value))
}

function membershipSummary(memberships: UserMembership[], emptyLabel: string) {
  if (!memberships.length) return emptyLabel
  return memberships
    .slice(0, 2)
    .map((membership) => {
      const role = companyRoleOptions.includes(membership.role as CompanyRoleOption)
        ? companyRoleLabels[membership.role as CompanyRoleOption]
        : membership.role
      return `${membership.company_name ?? 'Empresa sem nome'} / ${role}`
    })
    .join(', ')
}

function membershipOverflowLabel(memberships: UserMembership[]) {
  if (memberships.length <= 2) return null
  return `+${memberships.length - 2} empresas`
}

function membershipIds(memberships: UserMembership[]) {
  return memberships
    .map((membership) => membership.company_id)
    .filter((companyId): companyId is string => Boolean(companyId))
}

function toggleSelection(current: string[], id: string) {
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
}

function isUsersResponse(payload: UsersResponse | ErrorResponse | null): payload is UsersResponse {
  return !!payload && 'users' in payload && 'organizations' in payload
}

function CompanyAccessChecklist({
  companies,
  selectedIds,
  onToggle,
}: {
  companies: CompanyOption[]
  selectedIds: string[]
  onToggle: (companyId: string) => void
}) {
  if (!companies.length) {
    return <p className="sb-muted">Nenhuma empresa disponivel para liberar acesso.</p>
  }

  return (
    <div className="grid max-h-64 gap-2 overflow-y-auto rounded-md border border-[#E4DED2] bg-white/60 p-3 md:grid-cols-2 xl:grid-cols-3">
      {companies.map((company) => (
        <label
          className="flex cursor-pointer items-start gap-3 rounded-md border border-[#E4DED2] bg-[#FBFAF7] p-3 text-sm"
          key={company.id}
        >
          <input
            checked={selectedIds.includes(company.id)}
            className="mt-1"
            onChange={() => onToggle(company.id)}
            type="checkbox"
          />
          <span>
            <strong className="block">{company.name}</strong>
            {company.slug && <small className="sb-muted">{company.slug}</small>}
          </span>
        </label>
      ))}
    </div>
  )
}

export function AdminUsersClient() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [loading, setLoading] = useState(true)
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [temporaryPassword, setTemporaryPassword] = useState<{ email: string; password: string } | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteCompanyIds, setInviteCompanyIds] = useState<string[]>([])
  const [inviteCompanyRole, setInviteCompanyRole] = useState<CompanyRoleOption>('viewer')
  const [inviting, setInviting] = useState(false)
  const [createEmail, setCreateEmail] = useState('')
  const [createFullName, setCreateFullName] = useState('')
  const [createCompanyIds, setCreateCompanyIds] = useState<string[]>([])
  const [createCompanyRole, setCreateCompanyRole] = useState<CompanyRoleOption>('viewer')
  const [creating, setCreating] = useState(false)
  const [accessUser, setAccessUser] = useState<AdminUser | null>(null)
  const [accessCompanyIds, setAccessCompanyIds] = useState<string[]>([])
  const [accessCompanyRole, setAccessCompanyRole] = useState<CompanyRoleOption>('viewer')
  const [savingAccess, setSavingAccess] = useState(false)

  const metrics = useMemo(() => {
    const activeUsers = users.filter((user) => user.status === 'active').length
    const superAdmins = users.filter((user) => user.is_super_admin).length
    const invitedOrUnconfirmed = users.filter((user) => !user.email_confirmed_at).length

    return [
      ['Usuarios', String(users.length), `${activeUsers} ativos`],
      ['Super admins', String(superAdmins), 'Acesso plataforma'],
      ['Nao confirmados', String(invitedOrUnconfirmed), 'email pendente'],
    ] as const
  }, [users])

  async function loadUsers() {
    setLoading(true)
    setError('')

    const response = await fetch('/api/admin/users', { cache: 'no-store' })
    const payload = await response.json().catch(() => null) as UsersResponse | ErrorResponse | null

    if (!response.ok || !isUsersResponse(payload)) {
      const errorMessage = payload && 'error' in payload ? payload.error : undefined
      setError(errorMessage ?? 'Nao foi possivel carregar usuarios.')
      setLoading(false)
      return
    }

    setUsers(payload.users)
    setCompanies(payload.companies)
    setLoading(false)
  }

  async function updateUser(userId: string, updates: { status?: string; is_super_admin?: boolean; full_name?: string }) {
    setSavingUserId(userId)
    setError('')
    setNotice('')

    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const payload = await response.json().catch(() => null) as { error?: string } | null

    if (!response.ok) {
      setError(payload?.error ?? 'Nao foi possivel atualizar o usuario.')
      setSavingUserId(null)
      return
    }

    setNotice('Usuario atualizado.')
    setSavingUserId(null)
    await loadUsers()
  }

  async function resetPassword(user: AdminUser) {
    const confirmed = window.confirm(`Gerar uma senha temporaria para ${user.email ?? 'este usuario'}?`)
    if (!confirmed) return

    setSavingUserId(user.id)
    setError('')
    setNotice('')
    setTemporaryPassword(null)

    const response = await fetch(`/api/admin/users/${user.id}/password`, { method: 'POST' })
    const payload = await response.json().catch(() => null) as {
      error?: string
      email?: string
      temporary_password?: string
    } | null

    if (!response.ok || !payload?.temporary_password) {
      setError(payload?.error ?? 'Nao foi possivel gerar a senha temporaria.')
      setSavingUserId(null)
      return
    }

    setTemporaryPassword({
      email: payload.email ?? user.email ?? 'usuario',
      password: payload.temporary_password,
    })
    setNotice('Senha temporaria gerada. Ela aparece somente nesta tela.')
    setSavingUserId(null)
  }

  async function inviteUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setInviting(true)
    setError('')
    setNotice('')

    if (!inviteCompanyIds.length) {
      setError('Selecione ao menos uma empresa para liberar acesso.')
      setInviting(false)
      return
    }

    const response = await fetch('/api/admin/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: inviteEmail,
        company_ids: inviteCompanyIds,
        company_role: inviteCompanyRole,
      }),
    })
    const payload = await response.json().catch(() => null) as { error?: string } | null

    if (!response.ok) {
      setError(payload?.error ?? 'Nao foi possivel enviar o convite.')
      setInviting(false)
      return
    }

    setNotice('Convite enviado e perfil registrado.')
    setInviteEmail('')
    setInviteCompanyIds([])
    setInviteCompanyRole('viewer')
    setInviting(false)
    await loadUsers()
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreating(true)
    setError('')
    setNotice('')
    setTemporaryPassword(null)

    if (!createCompanyIds.length) {
      setError('Selecione ao menos uma empresa para liberar acesso.')
      setCreating(false)
      return
    }

    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: createEmail,
        full_name: createFullName,
        company_ids: createCompanyIds,
        company_role: createCompanyRole,
      }),
    })
    const payload = await response.json().catch(() => null) as {
      error?: string
      email?: string
      temporary_password?: string
    } | null

    if (!response.ok || !payload?.temporary_password) {
      setError(payload?.error ?? 'Nao foi possivel criar a conta.')
      setCreating(false)
      return
    }

    setTemporaryPassword({
      email: payload.email ?? createEmail,
      password: payload.temporary_password,
    })
    setNotice('Conta criada com senha temporaria. Ela aparece somente nesta tela.')
    setCreateEmail('')
    setCreateFullName('')
    setCreateCompanyIds([])
    setCreateCompanyRole('viewer')
    setCreating(false)
    await loadUsers()
  }

  function openAccessEditor(user: AdminUser) {
    const companyIds = membershipIds(user.company_memberships)
    setAccessUser(user)
    setAccessCompanyIds(companyIds)
    setAccessCompanyRole(
      companyRoleOptions.includes(user.company_memberships[0]?.role as CompanyRoleOption)
        ? user.company_memberships[0].role as CompanyRoleOption
        : 'viewer'
    )
    setError('')
    setNotice('')
  }

  async function saveAccess() {
    if (!accessUser) return

    if (!accessCompanyIds.length) {
      setError('Selecione ao menos uma empresa para manter o acesso deste usuario.')
      return
    }

    setSavingAccess(true)
    setSavingUserId(accessUser.id)
    setError('')
    setNotice('')

    const response = await fetch(`/api/admin/users/${accessUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_ids: accessCompanyIds,
        company_role: accessCompanyRole,
      }),
    })
    const payload = await response.json().catch(() => null) as { error?: string } | null

    if (!response.ok) {
      setError(payload?.error ?? 'Nao foi possivel atualizar os acessos.')
      setSavingAccess(false)
      setSavingUserId(null)
      return
    }

    setNotice('Acessos atualizados.')
    setSavingAccess(false)
    setSavingUserId(null)
    setAccessUser(null)
    await loadUsers()
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin - Usuarios"
        title="Usuarios e acessos"
        description="Operacao ao vivo para convites, perfis, status, super admins e recuperacao assistida de senha."
        action={<button className="btn-secondary" type="button" onClick={() => void loadUsers()}>Atualizar</button>}
      />

      {(error || notice) && (
        <Panel>
          {error && <p className="sb-error">{error}</p>}
          {notice && <p className="sb-muted">{notice}</p>}
        </Panel>
      )}

      {temporaryPassword && (
        <Panel>
          <SectionTitle label="Senha temporaria" />
          <p className="sb-muted">
            Envie para {temporaryPassword.email} por um canal seguro. Depois do login, a pessoa deve trocar a senha em
            /reset-password usando esta senha como senha atual.
          </p>
          <pre className="sb-secret-box">{temporaryPassword.password}</pre>
        </Panel>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        {metrics.map(([label, value, detail]) => (
          <Panel key={label}>
            <p className="sb-code">{label}</p>
            <p className="sb-big-number">{loading ? '-' : value}</p>
            <p className="sb-muted">{detail}</p>
          </Panel>
        ))}
      </section>

      <Panel>
        <SectionTitle label="Criar conta com senha" />
        <form className="space-y-4" onSubmit={(event) => void createUser(event)}>
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_0.7fr_auto]">
            <label>
              <span className="field-label">Nome</span>
              <input
                className="field-input"
                value={createFullName}
                onChange={(event) => setCreateFullName(event.target.value)}
                placeholder="Nome Sobrenome"
              />
            </label>
            <label>
              <span className="field-label">Email</span>
              <input
                className="field-input"
                type="email"
                value={createEmail}
                onChange={(event) => setCreateEmail(event.target.value)}
                placeholder="nome@empresa.com"
                required
              />
            </label>
            <label>
              <span className="field-label">Perfil nas empresas</span>
              <select
                className="field-input"
                value={createCompanyRole}
                onChange={(event) => setCreateCompanyRole(event.target.value as CompanyRoleOption)}
              >
                {companyRoleOptions.map((role) => (
                  <option key={role} value={role}>{companyRoleLabels[role]}</option>
                ))}
              </select>
            </label>
            <button className="btn-primary self-end" type="submit" disabled={creating}>
              {creating ? 'Criando' : 'Criar conta'}
            </button>
          </div>
          <div>
            <span className="field-label">Empresas liberadas</span>
            <CompanyAccessChecklist
              companies={companies}
              selectedIds={createCompanyIds}
              onToggle={(companyId) => setCreateCompanyIds((current) => toggleSelection(current, companyId))}
            />
          </div>
        </form>
      </Panel>

      <Panel>
        <SectionTitle label="Convidar usuario" />
        <form className="space-y-4" onSubmit={(event) => void inviteUser(event)}>
          <div className="grid gap-4 lg:grid-cols-[1fr_0.7fr_auto]">
            <label>
              <span className="field-label">Email</span>
              <input
                className="field-input"
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="nome@empresa.com"
                required
              />
            </label>
            <label>
              <span className="field-label">Perfil nas empresas</span>
              <select
                className="field-input"
                value={inviteCompanyRole}
                onChange={(event) => setInviteCompanyRole(event.target.value as CompanyRoleOption)}
              >
                {companyRoleOptions.map((role) => (
                  <option key={role} value={role}>{companyRoleLabels[role]}</option>
                ))}
              </select>
            </label>
            <button className="btn-primary self-end" type="submit" disabled={inviting}>
              {inviting ? 'Enviando' : 'Convidar'}
            </button>
          </div>
          <div>
            <span className="field-label">Empresas liberadas</span>
            <CompanyAccessChecklist
              companies={companies}
              selectedIds={inviteCompanyIds}
              onToggle={(companyId) => setInviteCompanyIds((current) => toggleSelection(current, companyId))}
            />
          </div>
        </form>
      </Panel>

      {accessUser && (
        <Panel>
          <SectionTitle label={`Acessos de ${accessUser.full_name || accessUser.email || 'usuario'}`} />
          <div className="space-y-4">
            <label className="block max-w-xs">
              <span className="field-label">Perfil nas empresas</span>
              <select
                className="field-input"
                value={accessCompanyRole}
                onChange={(event) => setAccessCompanyRole(event.target.value as CompanyRoleOption)}
              >
                {companyRoleOptions.map((role) => (
                  <option key={role} value={role}>{companyRoleLabels[role]}</option>
                ))}
              </select>
            </label>
            <div>
              <span className="field-label">Empresas liberadas</span>
              <CompanyAccessChecklist
                companies={companies}
                selectedIds={accessCompanyIds}
                onToggle={(companyId) => setAccessCompanyIds((current) => toggleSelection(current, companyId))}
              />
            </div>
            <div className="sb-row-actions">
              <button className="btn-primary" type="button" onClick={() => void saveAccess()} disabled={savingAccess}>
                {savingAccess ? 'Salvando' : 'Salvar acessos'}
              </button>
              <button className="btn-secondary" type="button" onClick={() => setAccessUser(null)} disabled={savingAccess}>
                Cancelar
              </button>
            </div>
          </div>
        </Panel>
      )}

      <Panel>
        <SectionTitle label="Usuarios" />
        <div className="sb-table sb-admin-users-table">
          <div className="sb-table-head">
            <span>Usuario</span>
            <span>Empresas liberadas</span>
            <span>Status</span>
            <span>Ultimo acesso</span>
            <span>Acoes</span>
          </div>
          {loading && (
            <div className="sb-table-row">
              <span>Carregando usuarios...</span>
              <span>-</span>
              <span>-</span>
              <span>-</span>
              <span>-</span>
            </div>
          )}
          {!loading && users.length === 0 && (
            <div className="sb-table-row">
              <span>Nenhum usuario encontrado.</span>
              <span>-</span>
              <span>-</span>
              <span>-</span>
              <span>-</span>
            </div>
          )}
          {users.map((user) => (
            <div className="sb-table-row" key={user.id}>
              <span>
                <strong>{user.full_name || user.email || 'Usuario sem email'}</strong>
                <small>{user.email ?? 'Email ausente'}</small>
                {user.is_super_admin && <StatusPill tone="neutral">super_admin</StatusPill>}
              </span>
              <span>
                {membershipSummary(user.company_memberships, 'Sem empresa liberada')}
                {membershipOverflowLabel(user.company_memberships) && (
                  <small>{membershipOverflowLabel(user.company_memberships)}</small>
                )}
              </span>
              <span>
                <select
                  className="field-input sb-compact-select"
                  value={user.status}
                  onChange={(event) => void updateUser(user.id, { status: event.target.value })}
                  disabled={savingUserId === user.id}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{statusLabels[status]}</option>
                  ))}
                </select>
                <StatusPill tone={statusTone(user.status)}>{statusLabels[user.status as (typeof statusOptions)[number]] ?? user.status}</StatusPill>
              </span>
              <span>
                {dateLabel(user.last_sign_in_at)}
                <small>Criado em {dateLabel(user.created_at)}</small>
              </span>
              <span className="sb-row-actions">
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => openAccessEditor(user)}
                  disabled={savingUserId === user.id}
                >
                  Acessos
                </button>
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => void updateUser(user.id, { is_super_admin: !user.is_super_admin })}
                  disabled={savingUserId === user.id}
                >
                  {user.is_super_admin ? 'Remover admin' : 'Tornar admin'}
                </button>
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => void resetPassword(user)}
                  disabled={savingUserId === user.id}
                >
                  Senha temp.
                </button>
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
