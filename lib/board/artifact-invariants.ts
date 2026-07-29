const STOP_WORDS = new Set([
  'a', 'as', 'o', 'os', 'de', 'da', 'das', 'do', 'dos', 'e', 'em', 'para', 'por',
  'que', 'qual', 'quais', 'como', 'com', 'sem', 'um', 'uma', 'the', 'and', 'or',
  'should', 'what', 'which', 'como', 'agora', 'empresa', 'board',
])

function significantTerms(value: string) {
  return Array.from(new Set(
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[^a-z0-9]+/)
      .filter(term => term.length >= 4 && !STOP_WORDS.has(term)),
  ))
}

export function validateDecisionContinuity(input: {
  activeQuestion?: string
  decisionStatement?: string
  rationale?: string
  sourceSnapshotId?: string
  sourceSnapshotHash?: string
}) {
  const issues: string[] = []
  const activeQuestion = input.activeQuestion?.trim() ?? ''
  const output = `${input.decisionStatement ?? ''} ${input.rationale ?? ''}`.toLowerCase()
  const questionTerms = significantTerms(activeQuestion)
  const retainedTerms = questionTerms.filter(term => output.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').includes(term))
  const requiredTerms = Math.min(2, questionTerms.length)

  if (activeQuestion.length < 10) issues.push('active_question_missing')
  if (!input.sourceSnapshotId?.trim()) issues.push('source_snapshot_id_missing')
  if (!input.sourceSnapshotHash?.trim()) issues.push('source_snapshot_hash_missing')
  if ((input.decisionStatement?.trim().length ?? 0) < 12) issues.push('decision_statement_missing')
  if (requiredTerms > 0 && retainedTerms.length < requiredTerms) {
    issues.push('named_decision_not_preserved')
  }

  return {
    valid: issues.length === 0,
    issues,
    retainedTerms,
  }
}
