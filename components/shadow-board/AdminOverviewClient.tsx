'use client'

import { useEffect, useMemo, useState } from 'react'
import { PageHeader, Panel, SectionTitle, StatusPill } from './ui'

type CountRow = {
  table: string
  count: number
  error?: string
}

type RecentSession = {
  id: string
  status: string
  session_type: string
  closure_recommendation: string | null
  created_at: string
  company_id: string
  company_name?: string
}

type RecentUser = {
  id: string
  email: string | null
  full_name: string | null
  is_super_admin: boolean
  status: string
  created_at: string
}

type AdminReadout = {
  counts: CountRow[]
  recent_sessions: RecentSession[]
  recent_users: RecentUser[]
}

type ErrorResponse = {
  error?: string
}

const countLabels: Record<string, string> = {
  organizations: 'Organizacoes',
  companies: 'Empresas',
  user_profiles: 'Usuarios',
  organization_memberships: 'Memberships',
  board_sessions: 'Board sessions',
  uploaded_documents: 'Documentos',
  decisions: 'Decisoes',
  follow_ups: 'Follow-ups',
}

function isAdminReadout(payload: AdminReadout | ErrorResponse | null): payload is AdminReadout {
  return !!payload && 'counts' in payload && 'recent_sessions' in payload && 'recent_users' in payload
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(new Date(value))
}

function sessionTone(status: string) {
  if (status === 'closed') return 'positive'
  if (['expired', 'cancelled'].includes(status)) return 'critical'
  if (['open', 'in_review', 'awaiting_founder'].includes(status)) return 'caution'
  return 'neutral'
}

export function AdminOverviewClient() {
  const [readout, setReadout] = useState<AdminReadout | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const metrics = useMemo(() => {
    const countsByTable = new Map((readout?.counts ?? []).map((count) => [count.table, count.count]))

    return [
      ['Organizacoes', String(countsByTable.get('organizations') ?? 0), `${countsByTable.get('companies') ?? 0} empresas`],
      ['Usuarios', String(countsByTable.get('user_profiles') ?? 0), `${countsByTable.get('organization_memberships') ?? 0} memberships`],
      ['Sessoes', String(countsByTable.get('board_sessions') ?? 0), 'board sessions registradas'],
      ['Memoria', String((countsByTable.get('decisions') ?? 0) + (countsByTable.get('follow_ups') ?? 0)), 'decisoes + follow-ups'],
    ] as const
  }, [readout])

  async function loadReadout() {
    setLoading(true)
    setError('')

    const response = await fetch('/api/admin/readout', { cache: 'no-store' })
    const payload = await response.json().catch(() => null) as AdminReadout | ErrorResponse | null

    if (!response.ok || !isAdminReadout(payload)) {
      const errorMessage = payload && 'error' in payload ? payload.error : undefined
      setError(errorMessage ?? 'Nao foi possivel carregar o admin readout.')
      setLoading(false)
      return
    }

    setReadout(payload)
    setLoading(false)
  }

  useEffect(() => {
    void loadReadout()
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operacoes"
        title="Admin control room"
        description="Leitura operacional ao vivo de usuarios, organizacoes, sessoes, documentos, decisoes e follow-ups."
        action={<button className="btn-secondary" type="button" onClick={() => void loadReadout()}>Atualizar</button>}
      />

      {error && (
        <Panel>
          <p className="sb-error">{error}</p>
        </Panel>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, detail]) => (
          <Panel key={label}>
            <p className="sb-code">{label}</p>
            <p className="sb-big-number">{loading ? '-' : value}</p>
            <p className="sb-muted">{detail}</p>
          </Panel>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel>
          <SectionTitle label="Fila operacional" />
          <div className="space-y-3">
            {(readout?.recent_sessions ?? []).slice(0, 6).map((session) => (
              <article key={session.id} className="sb-row-card">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="sb-code">{session.id.slice(0, 8)}</p>
                    <h3 className="sb-row-title">{session.company_name ?? session.company_id}</h3>
                    <p className="sb-muted mt-1">
                      {session.session_type} - {session.closure_recommendation ?? 'sem closure'} - {dateLabel(session.created_at)}
                    </p>
                  </div>
                  <StatusPill tone={sessionTone(session.status)}>{session.status}</StatusPill>
                </div>
              </article>
            ))}
            {!loading && !(readout?.recent_sessions ?? []).length && (
              <p className="sb-muted">Nenhuma board session registrada ainda.</p>
            )}
          </div>
        </Panel>

        <Panel>
          <SectionTitle label="Production readiness" />
          <div className="space-y-4">
            {[
              ['Supabase project', 'Ativo, separado de Creative OS'],
              ['Auth + Turnstile', 'Login protegido e visitantes bloqueados das telas internas'],
              ['Dominio', 'www.board-os.ai em producao'],
              ['Email provider', 'Resend configurado para recuperacao e notificacoes'],
            ].map(([label, detail]) => (
              <div key={label} className="sb-advisor-row">
                <span className="sb-file-type">OK</span>
                <div>
                  <p className="font-semibold">{label}</p>
                  <p className="sb-muted">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <Panel>
        <SectionTitle label="Tabelas monitoradas" />
        <div className="sb-table">
          <div className="sb-table-head">
            <span>Tabela</span>
            <span>Registros</span>
            <span>Status</span>
            <span>Observacao</span>
          </div>
          {(readout?.counts ?? []).map((count) => (
            <div className="sb-table-row" key={count.table}>
              <span>{countLabels[count.table] ?? count.table}</span>
              <span>{count.count}</span>
              <span><StatusPill tone={count.error ? 'critical' : 'positive'}>{count.error ? 'erro' : 'ok'}</StatusPill></span>
              <span>{count.error ?? 'Disponivel'}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
