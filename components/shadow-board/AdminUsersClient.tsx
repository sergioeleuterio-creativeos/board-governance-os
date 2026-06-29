'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { PageHeader, Panel, SectionTitle, StatusPill } from './ui'

type StatusTone = 'positive' | 'critical' | 'caution' | 'neutral'

type OrganizationOption = {
  id: string
  name: string
  slug?: string | null
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
}

type ErrorResponse = {
  error?: string
}

const statusOptions = ['active', 'inactive', 'archived'] as const
const roleOptions = ['owner', 'admin', 'member', 'advisor_operator', 'partner_admin', 'super_admin'] as const

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
    .map((membership) => `${membership.organization_name ?? membership.company_name ?? 'Sem escopo'} / ${membership.role}`)
    .join(', ')
}

function isUsersResponse(payload: UsersResponse | ErrorResponse | null): payload is UsersResponse {
  return !!payload && 'users' in payload && 'organizations' in payload
}

export function AdminUsersClient() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([])
  const [loading, setLoading] = useState(true)
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [temporaryPassword, setTemporaryPassword] = useState<{ email: string; password: string } | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteOrganizationId, setInviteOrganizationId] = useState('')
  const [inviteRole, setInviteRole] = useState<(typeof roleOptions)[number]>('member')
  const [inviting, setInviting] = useState(false)

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
    setOrganizations(payload.organizations)
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

    const response = await fetch('/api/admin/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: inviteEmail,
        organization_id: inviteOrganizationId || undefined,
        role: inviteOrganizationId ? inviteRole : undefined,
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
    setInviting(false)
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
        <SectionTitle label="Convidar usuario" />
        <form className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr_0.7fr_auto]" onSubmit={(event) => void inviteUser(event)}>
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
            <span className="field-label">Organizacao</span>
            <select
              className="field-input"
              value={inviteOrganizationId}
              onChange={(event) => setInviteOrganizationId(event.target.value)}
            >
              <option value="">Plataforma / sem organizacao</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>{organization.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">Role</span>
            <select
              className="field-input"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as (typeof roleOptions)[number])}
              disabled={!inviteOrganizationId}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </label>
          <button className="btn-primary self-end" type="submit" disabled={inviting}>
            {inviting ? 'Enviando' : 'Convidar'}
          </button>
        </form>
      </Panel>

      <Panel>
        <SectionTitle label="Usuarios" />
        <div className="sb-table sb-admin-users-table">
          <div className="sb-table-head">
            <span>Usuario</span>
            <span>Escopo</span>
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
                {membershipSummary(user.organization_memberships, 'Sem organizacao')}
                <small>{membershipSummary(user.company_memberships, 'Sem empresa')}</small>
              </span>
              <span>
                <select
                  className="field-input sb-compact-select"
                  value={user.status}
                  onChange={(event) => void updateUser(user.id, { status: event.target.value })}
                  disabled={savingUserId === user.id}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <StatusPill tone={statusTone(user.status)}>{user.status}</StatusPill>
              </span>
              <span>
                {dateLabel(user.last_sign_in_at)}
                <small>Criado em {dateLabel(user.created_at)}</small>
              </span>
              <span className="sb-row-actions">
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
