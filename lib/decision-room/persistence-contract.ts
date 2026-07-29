export type PersistenceEnvelope = {
  persisted?: boolean
  boardSessionId?: string
  decisionId?: string
  businessPlanId?: string | null
  reason?: string
  error?: string
}

type PersistenceValidation =
  | { ok: true; boardSessionId: string; decisionId?: string }
  | { ok: false; message: string }

function durableId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function failureMessage(persistence: PersistenceEnvelope | null | undefined) {
  if (persistence?.reason === 'no_active_company') {
    return 'Crie ou selecione uma empresa antes de salvar esta sessão.'
  }
  return persistence?.error?.trim() || 'Não foi possível confirmar a gravação. Seu conteúdo continua nesta tela para você tentar novamente.'
}

export function validateSessionPersistence(
  persistence: PersistenceEnvelope | null | undefined,
): PersistenceValidation {
  if (persistence?.persisted === true && durableId(persistence.boardSessionId)) {
    return { ok: true, boardSessionId: persistence.boardSessionId }
  }
  return { ok: false, message: failureMessage(persistence) }
}

export function validateDecisionPersistence(
  persistence: PersistenceEnvelope | null | undefined,
): PersistenceValidation {
  if (
    persistence?.persisted === true
    && durableId(persistence.boardSessionId)
    && durableId(persistence.decisionId)
  ) {
    return {
      ok: true,
      boardSessionId: persistence.boardSessionId,
      decisionId: persistence.decisionId,
    }
  }
  return { ok: false, message: failureMessage(persistence) }
}
