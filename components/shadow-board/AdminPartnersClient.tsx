'use client'

import { useEffect, useMemo, useState } from 'react'
import { PageHeader, Panel, SectionTitle, StatusPill } from './ui'

type PartnerRecord = {
  id: string
  name: string
  slug: string
  type: string
  contact_name: string | null
  contact_email: string | null
  status: string
  organization_count: number
  company_count: number
  referral_count: number
  created_at: string
}

type PartnersResponse = {
  partners: PartnerRecord[]
}

type ErrorResponse = {
  error?: string
}

const partnerTypes = ['distribution_partner', 'white_label', 'referral', 'internal'] as const
const partnerStatuses = ['active', 'inactive', 'archived'] as const

function isPartnersResponse(payload: PartnersResponse | ErrorResponse | null): payload is PartnersResponse {
  return !!payload && 'partners' in payload
}

function statusTone(status: string): 'positive' | 'critical' | 'caution' | 'neutral' {
  if (status === 'active') return 'positive'
  if (status === 'archived') return 'critical'
  if (status === 'inactive') return 'caution'
  return 'neutral'
}

export function AdminPartnersClient() {
  const [partners, setPartners] = useState<PartnerRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<typeof partnerTypes[number]>('distribution_partner')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const metrics = useMemo(() => {
    const active = partners.filter((partner) => partner.status === 'active').length
    const whiteLabel = partners.filter((partner) => partner.type === 'white_label').length
    const referrals = partners.reduce((sum, partner) => sum + partner.referral_count, 0)
    return { active, whiteLabel, referrals }
  }, [partners])

  async function loadPartners() {
    setLoading(true)
    setError('')

    const response = await fetch('/api/admin/partners', { cache: 'no-store' })
    const payload = await response.json().catch(() => null) as PartnersResponse | ErrorResponse | null

    if (!response.ok || !isPartnersResponse(payload)) {
      const errorMessage = payload && 'error' in payload ? payload.error : undefined
      setError(errorMessage ?? 'Nao foi possivel carregar parceiros.')
      setLoading(false)
      return
    }

    setPartners(payload.partners)
    setLoading(false)
  }

  async function createPartner() {
    setError('')
    setNotice('')

    const response = await fetch('/api/admin/partners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        type,
        contact_name: contactName,
        contact_email: contactEmail,
      }),
    })
    const payload = await response.json().catch(() => null) as { error?: string } | null

    if (!response.ok) {
      setError(payload?.error ?? 'Nao foi possivel criar parceiro.')
      return
    }

    setNotice('Parceiro criado.')
    setName('')
    setContactName('')
    setContactEmail('')
    await loadPartners()
  }

  async function updatePartner(partnerId: string, updates: Record<string, string>) {
    setSavingId(partnerId)
    setError('')
    setNotice('')

    const response = await fetch(`/api/admin/partners/${partnerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const payload = await response.json().catch(() => null) as { error?: string } | null

    if (!response.ok) {
      setError(payload?.error ?? 'Nao foi possivel atualizar parceiro.')
      setSavingId(null)
      return
    }

    setNotice('Parceiro atualizado.')
    setSavingId(null)
    await loadPartners()
  }

  useEffect(() => {
    void loadPartners()
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operacoes"
        title="Partner channels"
        description="Distribuidores, white labels, referrals e origens comerciais sem prender o produto a um parceiro."
        action={<button className="btn-secondary" type="button" onClick={() => void loadPartners()}>Atualizar</button>}
      />

      {(error || notice) && (
        <Panel>
          {error && <p className="sb-error">{error}</p>}
          {notice && <p className="sb-muted">{notice}</p>}
        </Panel>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <Panel><p className="sb-code">Ativos</p><p className="sb-big-number">{metrics.active}</p><p className="sb-muted">canais disponiveis</p></Panel>
        <Panel><p className="sb-code">White label</p><p className="sb-big-number">{metrics.whiteLabel}</p><p className="sb-muted">campos prontos</p></Panel>
        <Panel><p className="sb-code">Referrals</p><p className="sb-big-number">{metrics.referrals}</p><p className="sb-muted">solicitacoes conectadas</p></Panel>
      </section>

      <Panel>
        <SectionTitle label="Criar canal" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label>
            <span className="field-label">Nome</span>
            <input className="field-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Resenha" />
          </label>
          <label>
            <span className="field-label">Tipo</span>
            <select className="field-input" value={type} onChange={(event) => setType(event.target.value as typeof partnerTypes[number])}>
              {partnerTypes.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            <span className="field-label">Contato</span>
            <input className="field-input" value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="Nome" />
          </label>
          <label>
            <span className="field-label">Email</span>
            <input className="field-input" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="email@empresa.com" />
          </label>
          <button className="btn-primary self-end" type="button" onClick={() => void createPartner()} disabled={!name.trim()}>
            Criar
          </button>
        </div>
      </Panel>

      <Panel>
        <SectionTitle label="Canais registrados" />
        <div className="sb-table">
          <div className="sb-table-head">
            <span>Canal</span>
            <span>Contato</span>
            <span>Uso</span>
            <span>Status</span>
          </div>
          {loading && <div className="sb-table-row"><span>Carregando...</span><span>-</span><span>-</span><span>-</span></div>}
          {!loading && !partners.length && <div className="sb-table-row"><span>Nenhum canal criado.</span><span>-</span><span>-</span><span>-</span></div>}
          {partners.map((partner) => (
            <div className="sb-table-row" key={partner.id}>
              <span>
                <strong>{partner.name}</strong>
                <small>{partner.slug} - {partner.type}</small>
              </span>
              <span>
                {partner.contact_name ?? 'Sem contato'}
                <small>{partner.contact_email ?? 'sem email'}</small>
              </span>
              <span>
                {partner.organization_count} orgs / {partner.company_count} empresas
                <small>{partner.referral_count} referrals</small>
              </span>
              <span>
                <select
                  className="field-input sb-compact-select"
                  value={partner.status}
                  onChange={(event) => void updatePartner(partner.id, { status: event.target.value })}
                  disabled={savingId === partner.id}
                >
                  {partnerStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
                <StatusPill tone={statusTone(partner.status)}>{partner.status}</StatusPill>
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
