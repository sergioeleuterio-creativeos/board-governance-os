import type { BrainEntryCategory, IntakeMode } from './domain'

export type IntakeSectionKey = 'company' | 'strategy' | 'finance' | 'team' | 'chat' | 'files' | 'review'

export interface CompanyIntakeProfile {
  name: string
  industry: string
  businessModel: string
  revenueRange: string
  employeeCount: string
  stage: string
  jurisdiction: string
}

export interface StrategyIntake {
  goals: string
  mainChallenge: string
  currentPlan: string
  strategicQuestions: string
}

export interface FinancialIntake {
  revenue: string
  margin: string
  cashRunway: string
  topCustomerConcentration: string
  financialRisks: string
}

export interface TeamIntake {
  leadership: string
  keyRoles: string
  operatingCadence: string
  talentRisks: string
}

export interface IntakeNote {
  id: string
  mode: Extract<IntakeMode, 'chat' | 'voice'>
  content: string
  createdAt: string
}

export interface IntakeFileDraft {
  id: string
  name: string
  type: string
  size: number
  status: 'queued' | 'ready_for_upload' | 'uploaded' | 'failed'
}

export interface CompanyBrainIntakeDraft {
  id: string
  locale: 'pt-BR' | 'en' | 'es'
  company: CompanyIntakeProfile
  strategy: StrategyIntake
  finance: FinancialIntake
  team: TeamIntake
  notes: IntakeNote[]
  voiceTranscript: string
  whatsAppTranscript: string
  files: IntakeFileDraft[]
  createdAt: string
  updatedAt: string
}

export interface IntakeQualityScore {
  total: number
  completeSections: number
  totalSections: number
  missing: string[]
  sectionScores: Record<IntakeSectionKey, number>
  readyForGovernanceRun: boolean
}

export interface IntakeMemoryCandidate {
  category: BrainEntryCategory
  title: string
  content: string
  sourceType: IntakeMode
}

export interface IntakeBuildResult {
  draft: CompanyBrainIntakeDraft
  quality: IntakeQualityScore
  memoryCandidates: IntakeMemoryCandidate[]
}

function nowIso() {
  return new Date().toISOString()
}

export function createEmptyIntakeDraft(locale: CompanyBrainIntakeDraft['locale'] = 'pt-BR'): CompanyBrainIntakeDraft {
  const now = nowIso()
  return {
    id: `intake-${Date.now()}`,
    locale,
    company: {
      name: '',
      industry: '',
      businessModel: '',
      revenueRange: '',
      employeeCount: '',
      stage: '',
      jurisdiction: 'Brasil',
    },
    strategy: {
      goals: '',
      mainChallenge: '',
      currentPlan: '',
      strategicQuestions: '',
    },
    finance: {
      revenue: '',
      margin: '',
      cashRunway: '',
      topCustomerConcentration: '',
      financialRisks: '',
    },
    team: {
      leadership: '',
      keyRoles: '',
      operatingCadence: '',
      talentRisks: '',
    },
    notes: [],
    voiceTranscript: '',
    whatsAppTranscript: '',
    files: [],
    createdAt: now,
    updatedAt: now,
  }
}

function filled(value: string): boolean {
  return value.trim().length >= 4
}

function sectionScore(values: string[], required = values.length): number {
  const filledCount = values.filter(filled).length
  return Math.round((filledCount / Math.max(required, 1)) * 100)
}

export function scoreCompanyBrainIntake(draft: CompanyBrainIntakeDraft): IntakeQualityScore {
  const sectionScores: Record<IntakeSectionKey, number> = {
    company: sectionScore([
      draft.company.name,
      draft.company.industry,
      draft.company.businessModel,
      draft.company.revenueRange,
      draft.company.employeeCount,
      draft.company.stage,
      draft.company.jurisdiction,
    ], 7),
    strategy: sectionScore([
      draft.strategy.goals,
      draft.strategy.mainChallenge,
      draft.strategy.currentPlan,
      draft.strategy.strategicQuestions,
    ], 4),
    finance: sectionScore([
      draft.finance.revenue,
      draft.finance.margin,
      draft.finance.cashRunway,
      draft.finance.topCustomerConcentration,
      draft.finance.financialRisks,
    ], 5),
    team: sectionScore([
      draft.team.leadership,
      draft.team.keyRoles,
      draft.team.operatingCadence,
      draft.team.talentRisks,
    ], 4),
    chat: Math.min(100, draft.notes.length * 35 + (filled(draft.whatsAppTranscript ?? '') ? 35 : 0)),
    files: draft.files.length > 0 ? 100 : 35,
    review: 100,
  }

  const weightedTotal = Math.round(
    sectionScores.company * 0.16 +
    sectionScores.strategy * 0.22 +
    sectionScores.finance * 0.22 +
    sectionScores.team * 0.16 +
    sectionScores.chat * 0.12 +
    sectionScores.files * 0.06 +
    sectionScores.review * 0.06
  )

  const missing: string[] = []
  if (sectionScores.company < 85) missing.push('company')
  if (sectionScores.strategy < 85) missing.push('strategy')
  if (sectionScores.finance < 85) missing.push('finance')
  if (sectionScores.team < 75) missing.push('team')
  if (sectionScores.chat < 35) missing.push('chat')

  const completeSections = Object.values(sectionScores).filter(score => score >= 75).length
  return {
    total: weightedTotal,
    completeSections,
    totalSections: Object.keys(sectionScores).length,
    missing,
    sectionScores,
    readyForGovernanceRun: weightedTotal >= 72 && missing.length <= 1,
  }
}

export function buildMemoryCandidates(draft: CompanyBrainIntakeDraft): IntakeMemoryCandidate[] {
  const candidates: IntakeMemoryCandidate[] = [
    {
      category: 'goal',
      title: 'Founder goals',
      content: draft.strategy.goals,
      sourceType: 'form',
    },
    {
      category: 'risk',
      title: 'Main challenge',
      content: draft.strategy.mainChallenge,
      sourceType: 'form',
    },
    {
      category: 'financial',
      title: 'Financial snapshot',
      content: [
        draft.finance.revenue,
        draft.finance.margin,
        draft.finance.cashRunway,
        draft.finance.topCustomerConcentration,
        draft.finance.financialRisks,
      ].filter(Boolean).join('\n'),
      sourceType: 'form',
    },
    {
      category: 'team',
      title: 'Team and operating cadence',
      content: [
        draft.team.leadership,
        draft.team.keyRoles,
        draft.team.operatingCadence,
        draft.team.talentRisks,
      ].filter(Boolean).join('\n'),
      sourceType: 'form',
    },
    ...draft.notes.map((note): IntakeMemoryCandidate => ({
      category: 'fact',
      title: note.mode === 'voice' ? 'Voice intake note' : 'Chat intake note',
      content: note.content,
      sourceType: note.mode,
    })),
  ]

  if (filled(draft.voiceTranscript)) {
    candidates.push({
      category: 'fact',
      title: 'Voice transcript',
      content: draft.voiceTranscript,
      sourceType: 'voice',
    })
  }

  if (filled(draft.whatsAppTranscript ?? '')) {
    candidates.push({
      category: 'fact',
      title: 'WhatsApp conversation transcript',
      content: draft.whatsAppTranscript,
      sourceType: 'chat',
    })
  }

  return candidates.filter(candidate => filled(candidate.content))
}

export function buildIntakeResult(draft: CompanyBrainIntakeDraft): IntakeBuildResult {
  return {
    draft: {
      ...draft,
      updatedAt: nowIso(),
    },
    quality: scoreCompanyBrainIntake(draft),
    memoryCandidates: buildMemoryCandidates(draft),
  }
}
