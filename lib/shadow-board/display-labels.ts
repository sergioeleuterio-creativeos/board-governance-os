const closureLabels: Record<string, string> = {
  commit: 'Aprovar',
  commit_with_conditions: 'Aprovar com condições',
  defer: 'Adiar',
  reject: 'Rejeitar',
  request_more_data: 'Pedir mais dados',
  escalate_human_review: 'Escalar revisão humana',
}

const statusLabels: Record<string, string> = {
  active: 'Ativo',
  ad_hoc: 'Avulsa',
  admin_session: 'Sessão admin',
  agreement: 'Acordo',
  approved: 'Aprovada',
  archived: 'Arquivada',
  awaiting_founder: 'Aguardando founder',
  board_pack: 'Board Pack',
  candidate: 'Candidata',
  closed: 'Encerrada',
  complete: 'Concluído',
  deferred: 'Adiada',
  draft: 'Rascunho',
  cancelled: 'Cancelada',
  diagnostic: 'Diagnóstico',
  expired: 'Expirada',
  failed: 'Falhou',
  in_review: 'Em revisão',
  neutrality: 'Neutralidade',
  open: 'Aberta',
  opposition: 'Oposição',
  planning: 'Em planejamento',
  ready: 'Pronto',
  ready_for_review: 'Pronto para revisão',
  rejected: 'Rejeitada',
  review_due: 'Revisão pendente',
  reviewing: 'Em revisão',
  reversed: 'Revertida',
  running: 'Rodando',
  sent_to_review: 'Enviado para review',
  superseded: 'Substituída',
  virtual_review: 'Review virtual',
}

const stanceLabels: Record<string, string> = {
  approve: 'Aprova',
  approve_with_conditions: 'Aprova com condições',
  caution: 'Pede cautela',
  needs_more_data: 'Pede mais dados',
  neutral: 'Neutro',
  oppose: 'Faz oposição',
  reject: 'Rejeita',
  support: 'Apoia',
  support_with_conditions: 'Apoia com condições',
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
