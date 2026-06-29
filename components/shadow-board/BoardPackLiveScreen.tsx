'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AdvisorMark, DossierSection, Panel, SectionTitle, StatusPill } from './ui'

type BoardPack = {
  id: string
  version: number
  status: string
  executive_summary: string | null
  strategic_questions: unknown
  risk_map: unknown
  priority_ranking: unknown
  meeting_agenda: unknown
  decision_candidates: unknown
  export_payload: unknown
  created_at: string
}

type AgentReview = {
  id: string
  advisor_key: string
  advisor_name: string
  status: string
  stance: string | null
  risk_score: number | null
  confidence_score: number | null
  perspective: string | null
  strategic_questions: unknown
  recommendations: unknown
  closure_recommendation: string | null
}

type BoardPackResponse = {
  company: { id: string; name: string } | null
  board_pack: BoardPack | null
  agent_reviews: AgentReview[]
}

type ErrorResponse = {
  error?: string
}

type ExportResponse = {
  artifact_id: string
  storage_path: string
  export_type: string
  signed_url?: string | null
}

const advisorColors: Record<string, string> = {
  board_brain: '#C4922F',
  finance: '#3E6B4F',
  operator: '#4A5A6A',
  growth: '#2F6E6A',
  risk: '#A23B2D',
  customer: '#7A4E63',
  talent: '#85702F',
}

const advisorCodes: Record<string, string> = {
  board_brain: 'BB',
  finance: 'FN',
  operator: 'OP',
  growth: 'GR',
  risk: 'RK',
  customer: 'CU',
  talent: 'TL',
}

function isBoardPackResponse(payload: BoardPackResponse | ErrorResponse | null): payload is BoardPackResponse {
  return !!payload && 'board_pack' in payload && 'agent_reviews' in payload
}

function isExportResponse(payload: ExportResponse | ErrorResponse | null): payload is ExportResponse {
  return !!payload && 'artifact_id' in payload
}

function asArray(value: unknown): Array<Record<string, unknown> | string> {
  return Array.isArray(value) ? value : []
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function itemText(item: Record<string, unknown> | string) {
  if (typeof item === 'string') return item
  return [item.title, item.priority, item.risk, item.mitigation, item.rationale, item.detail, item.decision]
    .filter(Boolean)
    .join(' - ')
}

export function BoardPackLiveScreen() {
  const [readout, setReadout] = useState<BoardPackResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [exportUrl, setExportUrl] = useState<string | null>(null)

  async function loadBoardPack() {
    setLoading(true)
    setError('')

    const response = await fetch('/api/board-pack/latest', { cache: 'no-store' })
    const payload = await response.json().catch(() => null) as BoardPackResponse | ErrorResponse | null

    if (!response.ok || !isBoardPackResponse(payload)) {
      const errorMessage = payload && 'error' in payload ? payload.error : undefined
      setError(errorMessage ?? 'Nao foi possivel carregar o board pack.')
      setLoading(false)
      return
    }

    setReadout(payload)
    setLoading(false)
  }

  async function exportBoardPack(exportType: 'html' | 'csv') {
    if (!readout?.board_pack?.id) return

    setExporting(exportType)
    setError('')
    setNotice('')
    setExportUrl(null)

    const response = await fetch('/api/board-pack/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ board_pack_id: readout.board_pack.id, export_type: exportType }),
    })
    const payload = await response.json().catch(() => null) as ExportResponse | ErrorResponse | null

    if (!response.ok || !isExportResponse(payload)) {
      const errorMessage = payload && 'error' in payload ? payload.error : undefined
      setError(errorMessage ?? 'Nao foi possivel exportar o board pack.')
      setExporting('')
      return
    }

    setNotice(`Export ${payload.export_type.toUpperCase()} criado.`)
    setExportUrl(payload.signed_url ?? null)
    setExporting('')
  }

  useEffect(() => {
    void loadBoardPack()
  }, [])

  const boardPack = readout?.board_pack ?? null
  const payload = asRecord(boardPack?.export_payload)
  const financialReport = asRecord(payload.financial_report)

  if (!loading && !boardPack) {
    return (
      <div className="space-y-6">
        <Panel>
          <SectionTitle label="Board Pack" />
          <p className="sb-serif-callout">Nenhum board pack gerado ainda.</p>
          <Link href="/governance-run" className="btn-primary mt-4">Rodar Board Brain</Link>
        </Panel>
      </div>
    )
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[240px_1fr_300px]">
      <Panel className="h-fit">
        <SectionTitle label="Contents" />
        {[
          'Executive summary',
          'Perguntas estrategicas',
          'Relatorios financeiros',
          'Mapa de riscos',
          'Relatorios dos advisors',
          'Agenda da reuniao',
          'Candidatos de decisao',
        ].map((item, index) => (
          <p key={item} className="sb-pack-nav">{index + 1}. {item}</p>
        ))}
      </Panel>

      <Panel tone="dossier" className="sb-dossier">
        <p className="sb-code">Board Pack {boardPack ? `- v${boardPack.version}` : ''}</p>
        <h1>{readout?.company?.name ?? 'Company'}</h1>
        <StatusPill>{boardPack?.status ?? 'loading'}</StatusPill>

        <DossierSection number="1" title="Executive summary">
          <p>{boardPack?.executive_summary ?? 'Carregando executive summary...'}</p>
        </DossierSection>

        <DossierSection number="2" title="Perguntas estrategicas">
          <div className="space-y-3">
            {asArray(boardPack?.strategic_questions).map((question, index) => (
              <p key={`${itemText(question)}-${index}`}><strong>Q{index + 1}</strong> {itemText(question)}</p>
            ))}
          </div>
        </DossierSection>

        <DossierSection number="3" title="Relatorios financeiros para revisao do board">
          <div className="space-y-5">
            {Object.entries(financialReport).map(([section, rows]) => (
              <div key={section}>
                <h3 className="sb-row-title">{section}</h3>
                <div className="sb-table sb-financial-table mt-3">
                  <div className="sb-table-head"><span>Linha</span><span>Valor</span><span>Nota do board</span><span>Contexto</span></div>
                  {asArray(rows).map((row, index) => {
                    const record = asRecord(row)
                    return (
                      <div className="sb-table-row" key={`${section}-${index}`}>
                        <span>{String(record.metric ?? record.line_item ?? `Item ${index + 1}`)}</span>
                        <span>{String(record.value ?? '-')}</span>
                        <span>{String(record.board_note ?? record.note ?? '-')}</span>
                        <span>{String(record.variance ?? record.context ?? '-')}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            {!Object.keys(financialReport).length && <p className="sb-muted">No structured financial report available yet.</p>}
          </div>
        </DossierSection>

        <DossierSection number="4" title="Risk map">
          <div className="space-y-3">
            {asArray(boardPack?.risk_map).map((risk, index) => <p key={`${itemText(risk)}-${index}`}>{itemText(risk)}</p>)}
          </div>
        </DossierSection>

        <DossierSection number="5" title="Decision candidates">
          <div className="space-y-3">
            {asArray(boardPack?.decision_candidates).map((decision, index) => <p key={`${itemText(decision)}-${index}`}>{itemText(decision)}</p>)}
          </div>
        </DossierSection>
      </Panel>

      <div className="space-y-5">
        <Panel>
          <SectionTitle label="Exports" />
          <div className="grid gap-2">
            <button className="btn-secondary" type="button" onClick={() => void exportBoardPack('html')} disabled={!boardPack || exporting === 'html'}>
              {exporting === 'html' ? 'Exportando HTML' : 'Exportar HTML'}
            </button>
            <button className="btn-secondary" type="button" onClick={() => void exportBoardPack('csv')} disabled={!boardPack || exporting === 'csv'}>
              {exporting === 'csv' ? 'Exportando CSV' : 'Exportar CSV'}
            </button>
          </div>
          {notice && <p className="sb-muted mt-3">{notice}</p>}
          {error && <p className="sb-error mt-3">{error}</p>}
          {exportUrl && <a className="sb-text-link mt-3 block" href={exportUrl} target="_blank" rel="noreferrer">Abrir export</a>}
        </Panel>

        <Panel>
          <SectionTitle label="Relatorios dos advisors" />
          <div className="space-y-3">
            {(readout?.agent_reviews ?? []).map((review) => (
              <article key={review.id} className="sb-advisor-row">
                <AdvisorMark
                  code={advisorCodes[review.advisor_key] ?? 'AD'}
                  color={advisorColors[review.advisor_key] ?? '#8A8478'}
                  size="sm"
                />
                <div>
                  <p className="font-semibold">{review.advisor_name}</p>
                  <p className="sb-muted">{review.stance ?? review.status} - {review.confidence_score ?? '-'} confidence</p>
                </div>
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
