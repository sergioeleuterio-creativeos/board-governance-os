'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { PageHeader, Panel, SectionTitle, StatusPill } from './ui'

type MemoryEntry = {
  id: string
  category: string
  source_type: string
  title: string
  content: string
  confidence_score: number | null
  created_at: string
  source_document_id: string | null
}

type UploadedDocument = {
  id: string
  original_filename: string
  file_ext: string | null
  document_type: string | null
  status: string
  summary: string | null
  created_at: string
}

type CompanyBrainReadout = {
  company: { id: string; name: string } | null
  stats: Record<string, number>
  memory_entries: MemoryEntry[]
  unresolved_questions: Array<{
    id: string
    title: string
    content: string
    confidence_score: number | null
    created_at: string
  }>
  recent_documents: UploadedDocument[]
}

type ErrorResponse = {
  error?: string
}

const statCards = [
  ['Facts', 'fact'],
  ['Goals', 'goal'],
  ['Financials', 'financial'],
  ['Risks', 'risk'],
  ['Files', 'files'],
  ['Decisions', 'decision'],
] as const

function isCompanyBrainReadout(payload: CompanyBrainReadout | ErrorResponse | null): payload is CompanyBrainReadout {
  return !!payload && 'memory_entries' in payload && 'recent_documents' in payload
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

function codeFor(category: string) {
  return category.slice(0, 3).toUpperCase()
}

export function CompanyBrainLiveScreen() {
  const [readout, setReadout] = useState<CompanyBrainReadout | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const stats = useMemo(() => {
    const values = readout?.stats ?? {}
    return statCards.map(([label, key]) => {
      const value = key === 'files' ? readout?.recent_documents.length ?? 0 : values[key] ?? 0
      return [label, String(value)] as const
    })
  }, [readout])

  async function loadReadout() {
    setLoading(true)
    setError('')

    const response = await fetch('/api/company-brain/readout', { cache: 'no-store' })
    const payload = await response.json().catch(() => null) as CompanyBrainReadout | ErrorResponse | null

    if (!response.ok || !isCompanyBrainReadout(payload)) {
      const errorMessage = payload && 'error' in payload ? payload.error : undefined
      setError(errorMessage ?? 'Nao foi possivel carregar a Company Brain.')
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
        eyebrow="02 - Company Brain"
        title="Memoria institucional"
        description={readout?.company
          ? `Tudo que o board sabe sobre ${readout.company.name} - ${readout.memory_entries.length} memorias ativas`
          : 'Crie a primeira empresa no intake para iniciar a memoria institucional.'}
        action={<Link href="/company/intake" className="btn-primary">Iniciar intake</Link>}
      />

      {error && (
        <Panel>
          <p className="sb-error">{error}</p>
        </Panel>
      )}

      <section className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map(([label, value]) => (
          <Panel key={label} className="py-4">
            <p className="sb-code">{label}</p>
            <p className="sb-big-number">{loading ? '-' : value}</p>
          </Panel>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.3fr_0.8fr]">
        <Panel>
          <SectionTitle label="Linha do tempo da memoria" />
          <div className="mb-4 flex flex-wrap gap-2">
            {['All', 'Risks', 'Finance', 'Questions'].map(label => <StatusPill key={label}>{label}</StatusPill>)}
          </div>
          <div className="space-y-3">
            {loading && <p className="sb-muted">Carregando memoria...</p>}
            {!loading && readout?.memory_entries.map(entry => (
              <article key={entry.id} className="sb-memory-item">
                <p className="sb-code">{codeFor(entry.category)}</p>
                <div>
                  <h3 className="sb-row-title">{entry.title}</h3>
                  <p className="sb-muted mt-1">{entry.content}</p>
                  <p className="sb-code mt-3">
                    {entry.source_type} - {entry.confidence_score ?? '-'} confidence - {dateLabel(entry.created_at)}
                  </p>
                </div>
              </article>
            ))}
            {!loading && !readout?.memory_entries.length && (
              <p className="sb-muted">Nenhuma memoria ativa ainda. Use o intake para alimentar a Company Brain.</p>
            )}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <SectionTitle label="Perguntas abertas" />
            <p className="sb-big-number">{readout?.unresolved_questions.length ?? 0}</p>
            <div className="mt-3 space-y-3">
              {(readout?.unresolved_questions ?? []).map(question => (
                <p key={question.id} className="sb-muted">{question.title}: {question.content}</p>
              ))}
              {!loading && !readout?.unresolved_questions.length && (
                <p className="sb-muted">Nenhuma pergunta aberta registrada.</p>
              )}
            </div>
          </Panel>
          <Panel>
            <SectionTitle label="Arquivos recentes" />
            <div className="space-y-3">
              {(readout?.recent_documents ?? []).map(document => (
                <div key={document.id} className="sb-file-row">
                  <span className="sb-file-type">{document.file_ext?.slice(0, 3).toUpperCase() || 'DOC'}</span>
                  <div>
                    <p className="font-semibold">{document.original_filename}</p>
                    <p className="sb-muted">{document.status} - {document.summary ?? document.document_type ?? 'sem resumo'}</p>
                  </div>
                </div>
              ))}
              {!loading && !readout?.recent_documents.length && (
                <p className="sb-muted">Nenhum arquivo ingerido ainda.</p>
              )}
            </div>
          </Panel>
        </div>
      </section>
    </div>
  )
}
