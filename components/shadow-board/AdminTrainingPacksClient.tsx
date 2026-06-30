'use client'

import { useEffect, useMemo, useState } from 'react'
import { PageHeader, Panel, SectionTitle, StatusPill } from './ui'

type TrainingCompany = {
  id: string
  name: string
  slug: string
  created_at: string
}

type TrainingEvaluation = {
  id: string
  created_at: string
  metadata?: {
    average_adherence?: number
    reviews_scored?: number
    weak_reviews?: number
    missing_requirements?: number
  } | null
}

type TrainingPack = {
  id: string
  companyName: string
  caseTitle: string
  geography: string
  sector: string
  companyArchetype: string
  sourceInstitutions: string[]
  sourceUrls: string[]
  boardProblem: string
  companySeed: {
    businessModel: string
    governanceStage: string
    strategicContext: string
    decisionPressure: string
    knownUnknowns: string[]
  }
  advisorStress: string[]
  boardQuestions: string[]
  trainingUse: string[]
  existing_company: TrainingCompany | null
  latest_evaluation: TrainingEvaluation | null
}

type TrainingPacksResponse = {
  organization_id: string | null
  packs: TrainingPack[]
}

type SeedResponse = {
  results: Array<{
    pack_id: string
    company_id: string
    board_pack_id: string
    board_session_id: string
    created: boolean
    skipped?: boolean
    reason?: string
    evaluation?: TrainingEvaluation
  }>
  error?: string
}

type ErrorResponse = {
  error?: string
}

function isTrainingPacksResponse(payload: TrainingPacksResponse | ErrorResponse | null): payload is TrainingPacksResponse {
  return !!payload && 'packs' in payload
}

function isSeedResponse(payload: SeedResponse | ErrorResponse | null): payload is SeedResponse {
  return !!payload && 'results' in payload
}

export function AdminTrainingPacksClient() {
  const [readout, setReadout] = useState<TrainingPacksResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState('')
  const [evaluating, setEvaluating] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const metrics = useMemo(() => {
    const packs = readout?.packs ?? []
    const seeded = packs.filter((pack) => pack.existing_company).length
    const evaluated = packs.filter((pack) => pack.latest_evaluation).length
    const sources = new Set(packs.flatMap((pack) => pack.sourceInstitutions)).size
    return [
      ['Packs', String(packs.length), 'casos publicos estruturados'],
      ['Empresas criadas', String(seeded), 'demo/training companies'],
      ['Avaliacoes', String(evaluated), 'ultimos runs salvos'],
      ['Fontes', String(sources), 'instituicoes e bases publicas'],
    ] as const
  }, [readout])

  async function loadPacks() {
    setLoading(true)
    setError('')
    const response = await fetch('/api/admin/training-packs', { cache: 'no-store' })
    const payload = await response.json().catch(() => null) as TrainingPacksResponse | ErrorResponse | null

    if (!response.ok || !isTrainingPacksResponse(payload)) {
      const message = payload && 'error' in payload ? payload.error : undefined
      setError(message ?? 'Nao foi possivel carregar training packs.')
      setLoading(false)
      return
    }

    setReadout(payload)
    setLoading(false)
  }

  async function seedPack(packId?: string, reset = false) {
    setSeeding(packId ?? 'all')
    setError('')
    setNotice('')
    const response = await fetch('/api/admin/training-packs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(packId ? { pack_id: packId, reset } : { seed_all: true }),
    })
    const payload = await response.json().catch(() => null) as SeedResponse | ErrorResponse | null

    if (!response.ok || !isSeedResponse(payload)) {
      setError(payload?.error ?? 'Nao foi possivel criar empresas de treinamento.')
      setSeeding('')
      return
    }

    setNotice(`${payload.results.length} pack(s) processados.`)
    setSeeding('')
    await loadPacks()
  }

  async function evaluatePack(packId?: string) {
    setEvaluating(packId ?? 'all')
    setError('')
    setNotice('')
    const response = await fetch('/api/admin/training-packs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(packId ? { action: 'evaluate', pack_id: packId } : { action: 'evaluate', evaluate_all: true }),
    })
    const payload = await response.json().catch(() => null) as SeedResponse | ErrorResponse | null

    if (!response.ok || !isSeedResponse(payload)) {
      setError(payload?.error ?? 'Nao foi possivel avaliar os packs.')
      setEvaluating('')
      return
    }

    const skipped = payload.results.filter((result) => result.skipped).length
    setNotice(`${payload.results.length - skipped} avaliacao(oes) salvas.${skipped ? ` ${skipped} pack(s) sem empresa criada.` : ''}`)
    setEvaluating('')
    await loadPacks()
  }

  useEffect(() => {
    void loadPacks()
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operacoes"
        title="Packs de treinamento"
        description="Crie empresas demo a partir de casos publicos para testar advisors, board packs e memoria de decisao."
        action={(
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" type="button" onClick={() => void evaluatePack()} disabled={!!evaluating || !!seeding}>
              {evaluating === 'all' ? 'Avaliando...' : 'Avaliar todos'}
            </button>
            <button className="btn-primary" type="button" onClick={() => void seedPack()} disabled={!!seeding || !!evaluating}>
              {seeding === 'all' ? 'Criando...' : 'Criar todos'}
            </button>
          </div>
        )}
      />

      {error && <Panel><p className="sb-error">{error}</p></Panel>}
      {notice && <Panel><p className="sb-code text-positive">{notice}</p></Panel>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, detail]) => (
          <Panel key={label}>
            <p className="sb-code">{label}</p>
            <p className="sb-big-number">{loading ? '-' : value}</p>
            <p className="sb-muted">{detail}</p>
          </Panel>
        ))}
      </section>

      <Panel>
        <SectionTitle label="Empresas de treinamento" />
        <div className="space-y-4">
          {(readout?.packs ?? []).map((pack) => (
            <article key={pack.id} className="sb-row-card">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-4xl">
                  <p className="sb-code">{pack.geography} - {pack.sector}</p>
                  <h3 className="sb-row-title">{pack.companyName}: {pack.caseTitle}</h3>
                  <p className="sb-muted mt-2">{pack.boardProblem}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {pack.advisorStress.map((advisor) => <StatusPill key={advisor}>{advisor}</StatusPill>)}
                  </div>
                  <p className="sb-muted mt-3">{pack.companySeed.decisionPressure}</p>
                  {pack.latest_evaluation && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-4">
                      <div>
                        <p className="sb-code">Aderencia</p>
                        <p className="sb-row-title">{pack.latest_evaluation.metadata?.average_adherence ?? 0}/100</p>
                      </div>
                      <div>
                        <p className="sb-code">Reviews</p>
                        <p className="sb-row-title">{pack.latest_evaluation.metadata?.reviews_scored ?? 0}</p>
                      </div>
                      <div>
                        <p className="sb-code">Atencao</p>
                        <p className="sb-row-title">{pack.latest_evaluation.metadata?.weak_reviews ?? 0}</p>
                      </div>
                      <div>
                        <p className="sb-code">Ultimo run</p>
                        <p className="sb-muted">{new Date(pack.latest_evaluation.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid min-w-[180px] gap-2">
                  <StatusPill tone={pack.existing_company ? 'positive' : 'neutral'}>
                    {pack.existing_company ? 'empresa criada' : 'nao criado'}
                  </StatusPill>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => void seedPack(pack.id, !!pack.existing_company)}
                    disabled={!!seeding}
                  >
                    {seeding === pack.id ? 'Criando...' : pack.existing_company ? 'Atualizar pack' : 'Criar empresa'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => void evaluatePack(pack.id)}
                    disabled={!!evaluating || !!seeding || !pack.existing_company}
                  >
                    {evaluating === pack.id ? 'Avaliando...' : 'Avaliar advisors'}
                  </button>
                </div>
              </div>
            </article>
          ))}
          {!loading && !(readout?.packs ?? []).length && <p className="sb-muted">Nenhum training pack configurado.</p>}
        </div>
      </Panel>
    </div>
  )
}
