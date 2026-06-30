const closureLabels: Record<string, string> = {
  commit: 'Aprovar',
  commit_with_conditions: 'Aprovar com condicoes',
  defer: 'Adiar',
  reject: 'Rejeitar',
  request_more_data: 'Pedir mais dados',
  escalate_human_review: 'Escalar revisao humana',
}

const statusLabels: Record<string, string> = {
  active: 'Ativo',
  ad_hoc: 'Avulsa',
  admin_session: 'Sessao admin',
  agreement: 'Acordo',
  approved: 'Aprovada',
  archived: 'Arquivada',
  awaiting_founder: 'Aguardando founder',
  board_pack: 'Board Pack',
  candidate: 'Candidata',
  closed: 'Encerrada',
  complete: 'Concluido',
  deferred: 'Adiada',
  draft: 'Rascunho',
  cancelled: 'Cancelada',
  diagnostic: 'Diagnostico',
  expired: 'Expirada',
  failed: 'Falhou',
  in_review: 'Em revisao',
  neutrality: 'Neutralidade',
  open: 'Aberta',
  opposition: 'Oposicao',
  planning: 'Em planejamento',
  ready: 'Pronto',
  ready_for_review: 'Pronto para revisao',
  rejected: 'Rejeitada',
  review_due: 'Revisao pendente',
  reviewing: 'Em revisao',
  reversed: 'Revertida',
  running: 'Rodando',
  sent_to_review: 'Enviado para review',
  superseded: 'Substituida',
  virtual_review: 'Review virtual',
}

const stanceLabels: Record<string, string> = {
  approve: 'Aprova',
  approve_with_conditions: 'Aprova com condicoes',
  caution: 'Pede cautela',
  needs_more_data: 'Pede mais dados',
  neutral: 'Neutro',
  oppose: 'Faz oposicao',
  reject: 'Rejeita',
  support: 'Apoia',
  support_with_conditions: 'Apoia com condicoes',
}

export function formatClosure(value: string | null | undefined, fallback = 'Sem fechamento') {
  if (!value) return fallback
  return closureLabels[value] ?? value.replace(/_/g, ' ')
}

export function formatStatus(value: string | null | undefined, fallback = 'Sem status') {
  if (!value) return fallback
  return statusLabels[value] ?? value.replace(/_/g, ' ')
}

export function formatStance(value: string | null | undefined, fallback = 'Sem postura') {
  if (!value) return fallback
  return stanceLabels[value] ?? formatStatus(value, fallback)
}
