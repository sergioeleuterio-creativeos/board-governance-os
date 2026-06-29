'use client'

import { useEffect, useMemo, useState } from 'react'
import { PageHeader, Panel, SectionTitle, StatusPill } from './ui'

type Referral = {
  id: string
  organization_name: string
  company_name: string
  follow_up_title: string | null
  recommended_by_agent_key: string | null
  requested_by_name: string | null
  context_summary: string
  status: string
  created_at: string
  metadata: Record<string, unknown>
}

type ReferralsResponse = {
  referrals: Referral[]
}

type ErrorResponse = {
  error?: string
}

const referralStatuses = ['requested', 'triaging', 'introduced', 'closed', 'cancelled'] as const

function isReferralsResponse(payload: ReferralsResponse | ErrorResponse | null): payload is ReferralsResponse {
  return !!payload && 'referrals' in payload
}

function statusTone(status: string): 'positive' | 'critical' | 'caution' | 'neutral' {
  if (status === 'introduced' || status === 'closed') return 'positive'
  if (status === 'cancelled') return 'critical'
  if (status === 'requested' || status === 'triaging') return 'caution'
  return 'neutral'
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function AdminReferralsClient() {
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const metrics = useMemo(() => {
    const requested = referrals.filter((referral) => referral.status === 'requested').length
    const triaging = referrals.filter((referral) => referral.status === 'triaging').length
    const introduced = referrals.filter((referral) => referral.status === 'introduced').length
    return [
      ['Pedidos', String(requested), 'aguardando triagem'],
      ['Triagem', String(triaging), 'em andamento'],
      ['Introduzidos', String(introduced), 'conexoes feitas'],
    ] as const
  }, [referrals])

  async function loadReferrals() {
    setLoading(true)
    setError('')

    const response = await fetch('/api/admin/referrals', { cache: 'no-store' })
    const payload = await response.json().catch(() => null) as ReferralsResponse | ErrorResponse | null

    if (!response.ok || !isReferralsResponse(payload)) {
      const errorMessage = payload && 'error' in payload ? payload.error : undefined
      setError(errorMessage ?? 'Nao foi possivel carregar pedidos de conexao.')
      setLoading(false)
      return
    }

    setReferrals(payload.referrals)
    setLoading(false)
  }

  async function updateReferral(referralId: string, status: string) {
    setSavingId(referralId)
    setError('')
    setNotice('')

    const response = await fetch(`/api/admin/referrals/${referralId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const payload = await response.json().catch(() => null) as { error?: string } | null

    if (!response.ok) {
      setError(payload?.error ?? 'Nao foi possivel atualizar o pedido.')
      setSavingId(null)
      return
    }

    setNotice('Pedido atualizado.')
    setSavingId(null)
    await loadReferrals()
  }

  useEffect(() => {
    void loadReferrals()
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin - Conexoes"
        title="Fila de pedidos de conexao"
        description="Pedidos gerados a partir de follow-ups para fornecedores, parceiros, Creative OS ou especialistas do mercado."
        action={<button className="btn-secondary" type="button" onClick={() => void loadReferrals()}>Atualizar</button>}
      />

      {(error || notice) && (
        <Panel>
          {error && <p className="sb-error">{error}</p>}
          {notice && <p className="sb-muted">{notice}</p>}
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
        <SectionTitle label="Pedidos" />
        <div className="sb-table sb-admin-referrals-table">
          <div className="sb-table-head">
            <span>Contexto</span>
            <span>Empresa</span>
            <span>Status</span>
            <span>Origem</span>
          </div>
          {loading && (
            <div className="sb-table-row">
              <span>Carregando pedidos...</span>
              <span>-</span>
              <span>-</span>
              <span>-</span>
            </div>
          )}
          {!loading && referrals.length === 0 && (
            <div className="sb-table-row">
              <span>Nenhum pedido registrado ainda.</span>
              <span>-</span>
              <span>-</span>
              <span>-</span>
            </div>
          )}
          {referrals.map((referral) => (
            <div className="sb-table-row" key={referral.id}>
              <span>
                {referral.context_summary}
                <small>{referral.follow_up_title ?? 'Sem follow-up vinculado'}</small>
              </span>
              <span>
                {referral.company_name}
                <small>{referral.organization_name}</small>
              </span>
              <span>
                <select
                  className="field-input sb-compact-select"
                  value={referral.status}
                  onChange={(event) => void updateReferral(referral.id, event.target.value)}
                  disabled={savingId === referral.id}
                >
                  {referralStatuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <StatusPill tone={statusTone(referral.status)}>{referral.status}</StatusPill>
              </span>
              <span>
                {referral.recommended_by_agent_key ?? 'board'}
                <small>{referral.requested_by_name ?? 'Solicitante desconhecido'} - {dateLabel(referral.created_at)}</small>
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
