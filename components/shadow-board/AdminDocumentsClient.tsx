'use client'

import { useEffect, useMemo, useState } from 'react'
import { PageHeader, Panel, SectionTitle, StatusPill } from './ui'

type DocumentRecord = {
  id: string
  organization_name: string
  company_name: string
  uploaded_by_label: string
  original_filename: string
  file_ext: string | null
  file_size_bytes: number | null
  document_type: string | null
  status: string
  summary: string | null
  created_at: string
  updated_at: string
  extraction_count: number
  extractions: Array<{
    id: string
    extraction_type: string
    status: string
    confidence_score: number | null
    created_at: string
  }>
}

type DocumentsResponse = {
  documents: DocumentRecord[]
}

type ErrorResponse = {
  error?: string
}

function isDocumentsResponse(payload: DocumentsResponse | ErrorResponse | null): payload is DocumentsResponse {
  return !!payload && 'documents' in payload
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

function sizeLabel(value: number | null) {
  if (!value) return 'sem tamanho'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} MB`
  if (value >= 1_000) return `${Math.round(value / 1_000)} KB`
  return `${value} B`
}

function statusTone(status: string): 'positive' | 'critical' | 'caution' | 'neutral' {
  if (status === 'processed' || status === 'ready') return 'positive'
  if (status === 'failed') return 'critical'
  if (status === 'uploaded' || status === 'processing') return 'caution'
  return 'neutral'
}

export function AdminDocumentsClient() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [reprocessingId, setReprocessingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const metrics = useMemo(() => {
    const pending = documents.filter((document) => ['uploaded', 'processing'].includes(document.status)).length
    const failed = documents.filter((document) => document.status === 'failed').length
    const processed = documents.filter((document) => document.status === 'processed').length
    return { pending, failed, processed }
  }, [documents])

  async function loadDocuments() {
    setLoading(true)
    setError('')

    const response = await fetch('/api/admin/documents', { cache: 'no-store' })
    const payload = await response.json().catch(() => null) as DocumentsResponse | ErrorResponse | null

    if (!response.ok || !isDocumentsResponse(payload)) {
      const errorMessage = payload && 'error' in payload ? payload.error : undefined
      setError(errorMessage ?? 'Nao foi possivel carregar documentos.')
      setLoading(false)
      return
    }

    setDocuments(payload.documents)
    setLoading(false)
  }

  async function reprocess(documentId: string) {
    setReprocessingId(documentId)
    setError('')
    setNotice('')

    const response = await fetch('/api/company-brain/documents/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_id: documentId }),
    })
    const payload = await response.json().catch(() => null) as {
      error?: string
      result?: { charactersExtracted?: number }
    } | null

    if (!response.ok) {
      setError(payload?.error ?? 'Nao foi possivel reprocessar o documento.')
      setReprocessingId(null)
      return
    }

    setNotice(`Documento reprocessado com ${payload?.result?.charactersExtracted ?? 0} caracteres extraidos.`)
    setReprocessingId(null)
    await loadDocuments()
  }

  useEffect(() => {
    void loadDocuments()
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operacoes"
        title="Documentos e extracoes"
        description="Fila operacional de uploads, extracoes, falhas e fontes usadas pelo Company Brain."
        action={<button className="btn-secondary" type="button" onClick={() => void loadDocuments()}>Atualizar</button>}
      />

      {(error || notice) && (
        <Panel>
          {error && <p className="sb-error">{error}</p>}
          {notice && <p className="sb-muted">{notice}</p>}
        </Panel>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <Panel><p className="sb-code">Processados</p><p className="sb-big-number">{metrics.processed}</p><p className="sb-muted">memoria disponivel</p></Panel>
        <Panel><p className="sb-code">Pendentes</p><p className="sb-big-number">{metrics.pending}</p><p className="sb-muted">upload/processamento</p></Panel>
        <Panel><p className="sb-code">Falhas</p><p className="sb-big-number">{metrics.failed}</p><p className="sb-muted">precisam recovery</p></Panel>
      </section>

      <Panel>
        <SectionTitle label="Fila de documentos" />
        <div className="sb-table">
          <div className="sb-table-head">
            <span>Documento</span>
            <span>Empresa</span>
            <span>Status</span>
            <span>Extracoes</span>
          </div>
          {loading && (
            <div className="sb-table-row">
              <span>Carregando...</span><span>-</span><span>-</span><span>-</span>
            </div>
          )}
          {!loading && documents.length === 0 && (
            <div className="sb-table-row">
              <span>Nenhum documento encontrado.</span><span>-</span><span>-</span><span>-</span>
            </div>
          )}
          {documents.map((document) => (
            <div className="sb-table-row" key={document.id}>
              <span>
                <strong>{document.original_filename}</strong>
                <small>{document.file_ext ?? document.document_type ?? 'arquivo'} - {sizeLabel(document.file_size_bytes)} - {dateLabel(document.updated_at)}</small>
                {document.summary && <small>{document.summary.slice(0, 150)}{document.summary.length > 150 ? '...' : ''}</small>}
              </span>
              <span>
                {document.company_name}
                <small>{document.organization_name}</small>
                <small>{document.uploaded_by_label}</small>
              </span>
              <span><StatusPill tone={statusTone(document.status)}>{document.status}</StatusPill></span>
              <span>
                {document.extraction_count} registros
                <small>{document.extractions.map((item) => item.extraction_type).join(', ') || 'sem extracao'}</small>
                <button
                  type="button"
                  className="sb-inline-link mt-2 block"
                  onClick={() => void reprocess(document.id)}
                  disabled={reprocessingId === document.id}
                >
                  {reprocessingId === document.id ? 'Reprocessando' : 'Reprocessar'}
                </button>
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
