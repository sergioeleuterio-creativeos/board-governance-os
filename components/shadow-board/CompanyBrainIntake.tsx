'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  buildIntakeResult,
  createEmptyIntakeDraft,
  scoreCompanyBrainIntake,
  type CompanyBrainIntakeDraft,
  type IntakeSectionKey,
} from '@/lib/shadow-board/intake'
import { Meter, PageHeader, Panel, SectionTitle, StatusPill } from './ui'

const tabs: IntakeSectionKey[] = ['company', 'strategy', 'finance', 'team', 'chat', 'files', 'review']
const acceptedFileTypes = [
  '.pdf',
  '.pptx',
  '.xlsx',
  '.docx',
  '.csv',
  '.txt',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
  'text/plain',
].join(',')

interface IntakeSaveResponse {
  error?: string
  persistence?: {
    companyId: string
    governanceCycleId: string
    inputsCreated: number
    memoryEntriesCreated: number
  }
}

interface IntakeFileUploadResponse {
  uploaded?: Array<{ clientFileId: string | null }>
  errors?: Array<{ clientFileId: string | null; error: string }>
}

type IntakeChatTurn = {
  id: string
  role: 'founder' | 'board_brain'
  content: string
  createdAt: string
}

interface IntakeChatResponse {
  assistant?: {
    id: string
    role: 'board_brain'
    content: string
    created_at: string
  }
  error?: string
}

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function CompanyBrainIntakeScreen() {
  const t = useTranslations('intake')
  const [draft, setDraft] = useState<CompanyBrainIntakeDraft>(() => createEmptyIntakeDraft())
  const [activeTab, setActiveTab] = useState<IntakeSectionKey>('company')
  const [chatNote, setChatNote] = useState('')
  const [assistantTurns, setAssistantTurns] = useState<IntakeChatTurn[]>([])
  const [chatSending, setChatSending] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveMessage, setSaveMessage] = useState('')
  const [fileObjects, setFileObjects] = useState<Record<string, File>>({})

  const quality = useMemo(() => scoreCompanyBrainIntake(draft), [draft])
  const result = useMemo(() => buildIntakeResult(draft), [draft])
  const chatTimeline = useMemo(() => ([
    ...draft.notes.map((note): IntakeChatTurn => ({
      id: note.id,
      role: 'founder',
      content: note.content,
      createdAt: note.createdAt,
    })),
    ...assistantTurns,
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt))), [assistantTurns, draft.notes])

  function updateGroup<GroupKey extends 'company' | 'strategy' | 'finance' | 'team'>(
    groupKey: GroupKey,
    field: keyof CompanyBrainIntakeDraft[GroupKey],
    value: string
  ) {
    setDraft(current => ({
      ...current,
      [groupKey]: {
        ...current[groupKey],
        [field]: value,
      },
      updatedAt: new Date().toISOString(),
    }))
  }

  function addChatNote(mode: 'chat' | 'voice' = 'chat') {
    const content = mode === 'voice' ? draft.voiceTranscript.trim() : chatNote.trim()
    if (!content) return

    setDraft(current => ({
      ...current,
      notes: [
        ...current.notes,
        {
          id: id('note'),
          mode,
          content,
          createdAt: new Date().toISOString(),
        },
      ],
      voiceTranscript: mode === 'voice' ? '' : current.voiceTranscript,
      updatedAt: new Date().toISOString(),
    }))
    if (mode === 'chat') setChatNote('')
  }

  async function sendChatMessage() {
    const content = chatNote.trim()
    if (!content) return

    const note = {
      id: id('note'),
      mode: 'chat' as const,
      content,
      createdAt: new Date().toISOString(),
    }
    const nextDraft = {
      ...draft,
      notes: [...draft.notes, note],
      updatedAt: new Date().toISOString(),
    }

    setDraft(nextDraft)
    setChatNote('')
    setChatSending(true)
    setSaveState('idle')
    setSaveMessage('')

    const response = await fetch('/api/company-brain/intake/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft: nextDraft, message: content }),
    })
    const payload = await response.json().catch(() => null) as IntakeChatResponse | null

    if (!response.ok || !payload?.assistant) {
      setSaveState('error')
      setSaveMessage(payload?.error ?? t('saveFailed'))
      setChatSending(false)
      return
    }

    setAssistantTurns(current => ([
      ...current,
      {
        id: payload.assistant!.id,
        role: 'board_brain',
        content: payload.assistant!.content,
        createdAt: payload.assistant!.created_at,
      },
    ]))
    setChatSending(false)
  }

  function queueFiles(files: FileList | null) {
    if (!files?.length) return
    const queued = Array.from(files).map(file => {
      const fileId = id('file')
      return {
        file,
        draft: {
          id: fileId,
          name: file.name,
          type: file.type || 'unknown',
          size: file.size,
          status: 'queued' as const,
        },
      }
    })

    setDraft(current => ({
      ...current,
      files: [
        ...current.files,
        ...queued.map(item => item.draft),
      ],
      updatedAt: new Date().toISOString(),
    }))
    setFileObjects(current => ({
      ...current,
      ...Object.fromEntries(queued.map(item => [item.draft.id, item.file])),
    }))
  }

  function updateFileStatuses(uploadResponse: IntakeFileUploadResponse) {
    const uploaded = new Set((uploadResponse.uploaded ?? []).map(file => file.clientFileId).filter(Boolean))
    const failed = new Set((uploadResponse.errors ?? []).map(file => file.clientFileId).filter(Boolean))

    setDraft(current => ({
      ...current,
      files: current.files.map(file => {
        if (uploaded.has(file.id)) return { ...file, status: 'uploaded' as const }
        if (failed.has(file.id)) return { ...file, status: 'failed' as const }
        return file
      }),
      updatedAt: new Date().toISOString(),
    }))
  }

  async function uploadQueuedFiles(persistence: NonNullable<IntakeSaveResponse['persistence']>) {
    const filesToUpload = draft.files
      .map(file => ({ metadata: file, blob: fileObjects[file.id] }))
      .filter(item => item.blob && item.metadata.status !== 'uploaded')

    if (filesToUpload.length === 0) return { uploaded: 0, errors: 0 }

    const formData = new FormData()
    formData.append('company_id', persistence.companyId)
    formData.append('governance_cycle_id', persistence.governanceCycleId)
    formData.append('intake_draft_id', draft.id)
    formData.append('client_file_ids', JSON.stringify(filesToUpload.map(item => item.metadata.id)))
    filesToUpload.forEach(item => {
      formData.append('files', item.blob, item.metadata.name)
    })

    const response = await fetch('/api/company-brain/intake/files', {
      method: 'POST',
      body: formData,
    })
    const payload = await response.json().catch(() => null) as IntakeFileUploadResponse | null
    if (!response.ok) throw new Error(payload?.errors?.[0]?.error || 'file_upload_failed')

    if (payload) updateFileStatuses(payload)
    return {
      uploaded: payload?.uploaded?.length ?? 0,
      errors: payload?.errors?.length ?? 0,
    }
  }

  async function saveDraft() {
    setSaveState('saving')
    setSaveMessage('')
    try {
      const response = await fetch('/api/company-brain/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft }),
      })
      const payload = await response.json().catch(() => null) as IntakeSaveResponse | null
      if (!response.ok) {
        throw new Error(payload?.error || 'save_failed')
      }
      const persistence = payload?.persistence
      if (persistence) {
        const fileSummary = await uploadQueuedFiles(persistence)
        if (fileSummary.uploaded > 0 || fileSummary.errors > 0) {
          setSaveMessage(fileSummary.errors > 0
            ? t('savedLiveWithFileErrors', {
                inputs: persistence.inputsCreated ?? 0,
                entries: persistence.memoryEntriesCreated ?? 0,
                files: fileSummary.uploaded,
                errors: fileSummary.errors,
              })
            : t('savedLiveWithFiles', {
                inputs: persistence.inputsCreated ?? 0,
                entries: persistence.memoryEntriesCreated ?? 0,
                files: fileSummary.uploaded,
              }))
        } else {
          setSaveMessage(t('savedLiveDetail', {
            inputs: persistence.inputsCreated ?? 0,
            entries: persistence.memoryEntriesCreated ?? 0,
          }))
        }
      } else {
        setSaveMessage(t('savedLive'))
      }
      setSaveState('saved')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'save_failed'
      setSaveMessage(message === 'Unauthorised' ? t('signInRequired') : t('saveFailed'))
      setSaveState('error')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description')}
        action={<StatusPill tone="positive">{t('liveMode')}</StatusPill>}
      />

      <section className="grid gap-5 xl:grid-cols-[260px_1fr_320px]">
        <Panel className="h-fit">
          <SectionTitle label={t('completeness')} />
          <p className="sb-big-number">{quality.total}</p>
          <Meter value={quality.total} tone={quality.readyForGovernanceRun ? 'positive' : 'caution'} />
          <p className="sb-muted mt-3">
            {t('sectionsComplete', { complete: quality.completeSections, total: quality.totalSections })}
          </p>
          <div className="sb-intake-tabs mt-5">
            {tabs.map(tab => (
              <button
                key={tab}
                type="button"
                className={activeTab === tab ? 'is-active' : ''}
                onClick={() => setActiveTab(tab)}
              >
                <span>{Math.round(quality.sectionScores[tab])}</span>
                {t(`tabs.${tab}`)}
              </button>
            ))}
          </div>
        </Panel>

        <Panel>
          {activeTab === 'company' && (
            <FieldGroup title={t('company.title')} description={t('company.description')}>
              <TextField label={t('company.name')} value={draft.company.name} onChange={value => updateGroup('company', 'name', value)} />
              <TextField label={t('company.industry')} value={draft.company.industry} onChange={value => updateGroup('company', 'industry', value)} />
              <TextField label={t('company.businessModel')} value={draft.company.businessModel} onChange={value => updateGroup('company', 'businessModel', value)} />
              <TextField label={t('company.revenueRange')} value={draft.company.revenueRange} onChange={value => updateGroup('company', 'revenueRange', value)} />
              <TextField label={t('company.employeeCount')} value={draft.company.employeeCount} onChange={value => updateGroup('company', 'employeeCount', value)} />
              <TextField label={t('company.stage')} value={draft.company.stage} onChange={value => updateGroup('company', 'stage', value)} />
              <TextField label={t('company.jurisdiction')} value={draft.company.jurisdiction} onChange={value => updateGroup('company', 'jurisdiction', value)} />
            </FieldGroup>
          )}

          {activeTab === 'strategy' && (
            <FieldGroup title={t('strategy.title')} description={t('strategy.description')}>
              <TextArea label={t('strategy.goals')} value={draft.strategy.goals} onChange={value => updateGroup('strategy', 'goals', value)} />
              <TextArea label={t('strategy.mainChallenge')} value={draft.strategy.mainChallenge} onChange={value => updateGroup('strategy', 'mainChallenge', value)} />
              <TextArea label={t('strategy.currentPlan')} value={draft.strategy.currentPlan} onChange={value => updateGroup('strategy', 'currentPlan', value)} />
              <TextArea label={t('strategy.strategicQuestions')} value={draft.strategy.strategicQuestions} onChange={value => updateGroup('strategy', 'strategicQuestions', value)} />
            </FieldGroup>
          )}

          {activeTab === 'finance' && (
            <FieldGroup title={t('finance.title')} description={t('finance.description')}>
              <TextArea label={t('finance.revenue')} value={draft.finance.revenue} onChange={value => updateGroup('finance', 'revenue', value)} />
              <TextField label={t('finance.margin')} value={draft.finance.margin} onChange={value => updateGroup('finance', 'margin', value)} />
              <TextField label={t('finance.cashRunway')} value={draft.finance.cashRunway} onChange={value => updateGroup('finance', 'cashRunway', value)} />
              <TextField label={t('finance.topCustomerConcentration')} value={draft.finance.topCustomerConcentration} onChange={value => updateGroup('finance', 'topCustomerConcentration', value)} />
              <TextArea label={t('finance.financialRisks')} value={draft.finance.financialRisks} onChange={value => updateGroup('finance', 'financialRisks', value)} />
            </FieldGroup>
          )}

          {activeTab === 'team' && (
            <FieldGroup title={t('team.title')} description={t('team.description')}>
              <TextArea label={t('team.leadership')} value={draft.team.leadership} onChange={value => updateGroup('team', 'leadership', value)} />
              <TextArea label={t('team.keyRoles')} value={draft.team.keyRoles} onChange={value => updateGroup('team', 'keyRoles', value)} />
              <TextArea label={t('team.operatingCadence')} value={draft.team.operatingCadence} onChange={value => updateGroup('team', 'operatingCadence', value)} />
              <TextArea label={t('team.talentRisks')} value={draft.team.talentRisks} onChange={value => updateGroup('team', 'talentRisks', value)} />
            </FieldGroup>
          )}

          {activeTab === 'chat' && (
            <FieldGroup title={t('chat.title')} description={t('chat.description')}>
              <div className="sb-intake-chat">
                {chatTimeline.map(turn => (
                  <article key={turn.id}>
                    <p className="sb-code">{turn.role === 'board_brain' ? 'BOARD BRAIN' : 'FOUNDER'}</p>
                    <p className="whitespace-pre-line">{turn.content}</p>
                  </article>
                ))}
              </div>
              <TextArea label={t('chat.prompt')} value={chatNote} placeholder={t('chat.placeholder')} onChange={setChatNote} />
              <button type="button" className="btn-secondary" onClick={() => void sendChatMessage()} disabled={chatSending}>
                {chatSending ? t('chat.thinking') : t('chat.send')}
              </button>
              <TextArea label={t('voice.title')} value={draft.voiceTranscript} placeholder={t('voice.placeholder')} onChange={value => setDraft(current => ({ ...current, voiceTranscript: value }))} />
              <p className="sb-muted">{t('voice.description')}</p>
              <button type="button" className="btn-secondary" onClick={() => addChatNote('voice')}>{t('chat.add')}</button>
            </FieldGroup>
          )}

          {activeTab === 'files' && (
            <FieldGroup title={t('files.title')} description={t('files.description')}>
              <label className="sb-file-drop">
                <input type="file" multiple accept={acceptedFileTypes} onChange={event => queueFiles(event.target.files)} />
                <span>{t('files.upload')}</span>
              </label>
              <div className="space-y-3">
                {draft.files.length === 0 && <p className="sb-muted">{t('files.noFiles')}</p>}
                {draft.files.map(file => (
                  <div key={file.id} className="sb-file-row">
                    <span className="sb-file-type">{file.name.split('.').pop()?.toUpperCase() || 'FILE'}</span>
                    <div>
                      <p className="font-semibold">{file.name}</p>
                      <p className="sb-muted">{t(`files.status.${file.status}`)} - {Math.ceil(file.size / 1024)} KB</p>
                    </div>
                  </div>
                ))}
              </div>
            </FieldGroup>
          )}

          {activeTab === 'review' && (
            <FieldGroup title={t('review.title')} description={t('review.description')}>
              <div className="sb-intake-review">
                <StatusPill tone={quality.readyForGovernanceRun ? 'positive' : 'caution'}>
                  {quality.readyForGovernanceRun ? t('review.ready') : t('review.notReady')}
                </StatusPill>
                <pre>{JSON.stringify(result, null, 2)}</pre>
              </div>
            </FieldGroup>
          )}
        </Panel>

        <Panel className="h-fit">
          <SectionTitle label={t('score')} />
          <p className="sb-big-number">{quality.total}</p>
          <Meter value={quality.total} tone={quality.readyForGovernanceRun ? 'positive' : 'caution'} />
          <div className="mt-5 space-y-3">
            <p className="sb-code">{t('review.missing')}</p>
            {quality.missing.length === 0
              ? <p className="sb-muted">{t('review.ready')}</p>
              : quality.missing.map(item => <StatusPill key={item} tone="caution">{t(`tabs.${item}`)}</StatusPill>)}
          </div>
          <div className="mt-6 grid gap-2">
            <button type="button" className="btn-secondary" onClick={saveDraft}>
              {saveState === 'saving' ? '...' : t('saveDraft')}
            </button>
            <button type="button" className="btn-primary" onClick={() => setActiveTab('review')}>
              {t('sendToBrain')}
            </button>
            {saveState === 'saved' && <p className="sb-code text-positive">{saveMessage || t('savedLive')}</p>}
            {saveState === 'error' && <p className="sb-code text-critical">{saveMessage || t('saveFailed')}</p>}
          </div>
        </Panel>
      </section>
    </div>
  )
}

function FieldGroup({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="sb-row-title">{title}</h2>
        <p className="sb-muted mt-1">{description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input className="field-input" value={value} onChange={event => onChange(event.target.value)} />
    </label>
  )
}

function TextArea({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string
  value: string
  placeholder?: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block md:col-span-2">
      <span className="field-label">{label}</span>
      <textarea
        className="field-input min-h-[112px] resize-y"
        value={value}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
      />
    </label>
  )
}
