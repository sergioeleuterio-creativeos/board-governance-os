'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Panel, StatusPill } from '@/components/shadow-board/ui'

type Invitation = {
  company_name: string
  display_name: string
  role_label: string
  active_question: string
  meeting_timezone: string
  current_phase: string
  phase_deadline_at: string | null
  status: string
}

export function BoardInvitationScreen({ token }: { token: string }) {
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [needsLogin, setNeedsLogin] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/board/invitations/${encodeURIComponent(token)}`, { cache: 'no-store' })
      const payload = await response.json().catch(() => null) as { invitation?: Invitation; error?: string } | null
      if (!response.ok || !payload?.invitation) setError(payload?.error ?? 'Este convite não está disponível.')
      else setInvitation(payload.invitation)
      setLoading(false)
    }
    void load()
  }, [token])

  async function accept() {
    setAccepting(true)
    setError('')
    const response = await fetch(`/api/board/invitations/${encodeURIComponent(token)}`, { method: 'POST' })
    const payload = await response.json().catch(() => null) as { error?: string; redirect_to?: string } | null
    if (response.status === 401) {
      setNeedsLogin(true)
      setAccepting(false)
      return
    }
    if (!response.ok) {
      setError(payload?.error ?? 'Não foi possível aceitar este assento.')
      setAccepting(false)
      return
    }
    window.location.href = payload?.redirect_to ?? '/board'
  }

  if (loading) return <Panel><p className="sb-muted">Abrindo convite reservado...</p></Panel>

  return (
    <div className="sb-invitation-shell">
      <Panel className="sb-invitation-card">
        {invitation ? (
          <>
            <div className="flex items-center justify-between gap-4">
              <p className="sb-eyebrow">Board OS · convite reservado</p>
              <StatusPill tone={invitation.status === 'invited' ? 'caution' : 'neutral'}>{invitation.status}</StatusPill>
            </div>
            <h1>{invitation.display_name}, sua leitura foi solicitada.</h1>
            <p className="sb-invitation-intro">
              Você entra como <strong>{invitation.role_label}</strong> no board de <strong>{invitation.company_name}</strong>.
              Receberá exatamente o mesmo pack que os outros membros e advisors sintéticos.
            </p>
            <blockquote>{invitation.active_question}</blockquote>
            <p className="sb-muted">
              A conversa é assíncrona. Sua contribuição preserva autoria, fase, pack, e fontes.
            </p>
            {error && <p className="sb-error mt-4">{error}</p>}
            {needsLogin ? (
              <Link
                className="btn-primary mt-6"
                href={`/login?next=${encodeURIComponent(`/board/invitations/${token}`)}`}
              >
                Entrar com o email convidado
              </Link>
            ) : (
              <button
                type="button"
                className="btn-primary mt-6"
                onClick={() => void accept()}
                disabled={accepting || !['invited', 'accepted'].includes(invitation.status)}
              >
                {accepting ? 'Confirmando...' : 'Aceitar assento e ler o pack'}
              </button>
            )}
          </>
        ) : (
          <>
            <p className="sb-eyebrow">Board OS</p>
            <h1>Convite indisponível</h1>
            <p className="sb-error mt-4">{error}</p>
          </>
        )}
      </Panel>
    </div>
  )
}
