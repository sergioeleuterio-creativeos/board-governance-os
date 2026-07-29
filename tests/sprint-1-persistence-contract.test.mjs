import assert from 'node:assert/strict'
import test from 'node:test'
import {
  validateDecisionPersistence,
  validateSessionPersistence,
} from '../lib/decision-room/persistence-contract.ts'

test('accepts a durable session only when the session ID exists', () => {
  assert.deepEqual(
    validateSessionPersistence({ persisted: true, boardSessionId: 'session-123' }),
    { ok: true, boardSessionId: 'session-123' },
  )
  assert.equal(validateSessionPersistence({ persisted: true }).ok, false)
  assert.equal(validateSessionPersistence({ persisted: false, boardSessionId: 'session-123' }).ok, false)
})

test('accepts a durable decision only when both durable IDs exist', () => {
  assert.deepEqual(
    validateDecisionPersistence({
      persisted: true,
      boardSessionId: 'session-123',
      decisionId: 'decision-456',
    }),
    {
      ok: true,
      boardSessionId: 'session-123',
      decisionId: 'decision-456',
    },
  )
  assert.equal(validateDecisionPersistence({ persisted: true, boardSessionId: 'session-123' }).ok, false)
  assert.equal(validateDecisionPersistence({ persisted: true, decisionId: 'decision-456' }).ok, false)
})

test('turns the no-company response into an actionable recovery message', () => {
  const session = validateSessionPersistence({ persisted: false, reason: 'no_active_company' })
  assert.equal(session.ok, false)
  if (!session.ok) assert.match(session.message, /Crie ou selecione uma empresa/)
})

test('preserves a server persistence error and rejects malformed envelopes', () => {
  const decision = validateDecisionPersistence({ persisted: false, error: 'database unavailable' })
  assert.equal(decision.ok, false)
  if (!decision.ok) assert.equal(decision.message, 'database unavailable')

  assert.equal(validateSessionPersistence(undefined).ok, false)
  assert.equal(validateDecisionPersistence(null).ok, false)
})
