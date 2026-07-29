import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import {
  buildPhaseSchedule,
  contributionStartsSealed,
  contributionTypeForPhase,
  isValidTimezone,
  phaseAt,
  phasesReleasedBetween,
} from '../lib/board/meeting-schedule.ts'

const migrationUrl = new URL('../supabase/migrations/0004_mixed_async_board.sql', import.meta.url)
const boardScreenUrl = new URL('../components/board/AsyncBoardScreen.tsx', import.meta.url)
const navigationUrl = new URL('../components/Navigation.tsx', import.meta.url)
const invitationRouteUrl = new URL('../app/api/board/invitations/[token]/route.ts', import.meta.url)
const participantRouteUrl = new URL('../app/api/board/participants/route.ts', import.meta.url)
const cronRouteUrl = new URL('../app/api/cron/board-meetings/route.ts', import.meta.url)

test('a normal meeting has ordered, non-overlapping phases and a terminal close', () => {
  const schedule = buildPhaseSchedule('2026-07-29T15:00:00.000Z')
  assert.deepEqual(schedule.map(item => item.phase), [
    'pack_review',
    'independent_analysis',
    'peer_challenge',
    'final_positions',
    'chair_synthesis',
    'founder_decision',
    'closed',
  ])
  for (let index = 0; index < schedule.length - 1; index += 1) {
    assert.equal(schedule[index].endsAt, schedule[index + 1].startsAt)
  }
  assert.equal(schedule.at(-1).endsAt, null)
})

test('phase advancement is deterministic and cron replay releases only crossed phases', () => {
  const schedule = buildPhaseSchedule('2026-07-29T15:00:00.000Z', 'compressed')
  const now = new Date(schedule[3].startsAt)
  assert.equal(phaseAt(schedule, now).phase, 'final_positions')
  assert.equal(phaseAt(schedule, now).phase, 'final_positions')
  assert.deepEqual(
    phasesReleasedBetween(schedule, 'independent_analysis', 'final_positions'),
    ['independent_analysis', 'peer_challenge'],
  )
  assert.deepEqual(phasesReleasedBetween(schedule, 'final_positions', 'final_positions'), [])
})

test('timezones are validated while deadlines remain absolute across daylight boundaries', () => {
  assert.equal(isValidTimezone('America/Sao_Paulo'), true)
  assert.equal(isValidTimezone('America/New_York'), true)
  assert.equal(isValidTimezone('Mars/Olympus_Mons'), false)
  const schedule = buildPhaseSchedule('2026-11-01T05:30:00.000Z')
  assert.equal(new Date(schedule[0].startsAt).toISOString(), '2026-11-01T05:30:00.000Z')
  assert.ok(new Date(schedule[1].startsAt) > new Date(schedule[0].startsAt))
})

test('independent and final positions are sealed; open phases accept only their contribution types', () => {
  assert.equal(contributionStartsSealed('independent_analysis'), true)
  assert.equal(contributionStartsSealed('final_positions'), true)
  assert.equal(contributionStartsSealed('peer_challenge'), false)
  assert.deepEqual(contributionTypeForPhase('peer_challenge'), ['challenge', 'response'])
  assert.deepEqual(contributionTypeForPhase('founder_decision'), ['decision'])
})

test('the Sprint 4 migration scopes access and makes contribution content immutable', async () => {
  const sql = await readFile(migrationUrl, 'utf8')
  assert.match(sql, /create table if not exists public\.board_participants/i)
  assert.match(sql, /create table if not exists public\.board_contributions/i)
  assert.match(sql, /Session participants can read released board packs/)
  assert.match(sql, /visibility = 'released'/)
  assert.match(sql, /author\.user_id = auth\.uid\(\)/)
  assert.match(sql, /Board contribution content and attribution are immutable/)
  assert.match(sql, /Released board packs are immutable; create a new version/)
  assert.match(sql, /access_token_hash text unique/)
  assert.doesNotMatch(sql, /company_memberships.*board_participants/is)
})

test('the Board UI keeps human and synthetic personas visible in one transcript and one composer', async () => {
  const [screen, navigation] = await Promise.all([
    readFile(boardScreenUrl, 'utf8'),
    readFile(navigationUrl, 'utf8'),
  ])
  assert.match(screen, /Pessoas e advisors neste board/)
  assert.match(screen, /Humano/)
  assert.match(screen, /Advisor sintético/)
  assert.match(screen, /className="sb-mixed-transcript"/)
  assert.equal((screen.match(/className="sb-board-composer"/g) ?? []).length, 1)
  assert.match(screen, /Só você vê até a fase fechar/)
  assert.match(navigation, /\{ href: '\/board', code: '02', label: 'Board' \}/)
})

test('invitation links store only a hash, expire, and require the invited email', async () => {
  const [invite, participant] = await Promise.all([
    readFile(invitationRouteUrl, 'utf8'),
    readFile(participantRouteUrl, 'utf8'),
  ])
  assert.match(participant, /randomBytes\(32\)/)
  assert.match(participant, /access_token_hash: tokenHash\(rawToken\)/)
  assert.match(participant, /invite_expires_at: expiresAt/)
  assert.match(participant, /board_pack_id: session\.board_pack_id/)
  assert.doesNotMatch(participant, /access_token:\s*rawToken/)
  assert.match(invite, /user\.email\.toLowerCase\(\) !== participant\.email\?\.toLowerCase\(\)/)
  assert.match(invite, /status: 'expired'/)
})

test('the phase cron is authenticated and uses a compare-and-set update for idempotency', async () => {
  const cron = await readFile(cronRouteUrl, 'utf8')
  assert.match(cron, /Bearer \$\{secret\}/)
  assert.match(cron, /\.eq\('current_phase', session\.current_phase\)/)
  assert.match(cron, /generatedAlready/)
  assert.match(cron, /visibility: 'released'/)
  assert.match(cron, /metadata->>generated_by/)
})
