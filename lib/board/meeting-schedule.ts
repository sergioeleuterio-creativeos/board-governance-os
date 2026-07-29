export const BOARD_PHASES = [
  'pack_review',
  'independent_analysis',
  'peer_challenge',
  'final_positions',
  'chair_synthesis',
  'founder_decision',
  'closed',
] as const

export type BoardPhase = typeof BOARD_PHASES[number]

export type PhaseScheduleEntry = {
  phase: BoardPhase
  startsAt: string
  endsAt: string | null
}

const NORMAL_PHASE_HOURS: Record<Exclude<BoardPhase, 'closed'>, number> = {
  pack_review: 24,
  independent_analysis: 24,
  peer_challenge: 24,
  final_positions: 24,
  chair_synthesis: 12,
  founder_decision: 48,
}

const COMPRESSED_PHASE_MINUTES: Record<Exclude<BoardPhase, 'closed'>, number> = {
  pack_review: 2,
  independent_analysis: 2,
  peer_challenge: 2,
  final_positions: 2,
  chair_synthesis: 2,
  founder_decision: 2,
}

export function isValidTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format()
    return true
  } catch {
    return false
  }
}

export function buildPhaseSchedule(
  startsAt: string,
  cadence: 'normal' | 'compressed' = 'normal',
): PhaseScheduleEntry[] {
  const start = new Date(startsAt)
  if (Number.isNaN(start.getTime())) throw new Error('Invalid meeting start time')

  const schedule: PhaseScheduleEntry[] = []
  let cursor = start.getTime()

  for (const phase of BOARD_PHASES.slice(0, -1) as Array<Exclude<BoardPhase, 'closed'>>) {
    const duration = cadence === 'compressed'
      ? COMPRESSED_PHASE_MINUTES[phase] * 60 * 1000
      : NORMAL_PHASE_HOURS[phase] * 60 * 60 * 1000
    const end = cursor + duration
    schedule.push({
      phase,
      startsAt: new Date(cursor).toISOString(),
      endsAt: new Date(end).toISOString(),
    })
    cursor = end
  }

  schedule.push({
    phase: 'closed',
    startsAt: new Date(cursor).toISOString(),
    endsAt: null,
  })

  return schedule
}

export function phaseAt(schedule: PhaseScheduleEntry[], at = new Date()): PhaseScheduleEntry {
  if (!schedule.length) throw new Error('Meeting schedule is empty')
  const time = at.getTime()
  const matching = schedule.find(entry => {
    const start = new Date(entry.startsAt).getTime()
    const end = entry.endsAt ? new Date(entry.endsAt).getTime() : Number.POSITIVE_INFINITY
    return time >= start && time < end
  })

  if (matching) return matching
  if (time < new Date(schedule[0].startsAt).getTime()) return schedule[0]
  return schedule.at(-1)!
}

export function phasesReleasedBetween(
  schedule: PhaseScheduleEntry[],
  previousPhase: BoardPhase,
  nextPhase: BoardPhase,
) {
  const previousIndex = BOARD_PHASES.indexOf(previousPhase)
  const nextIndex = BOARD_PHASES.indexOf(nextPhase)
  if (previousIndex < 0 || nextIndex <= previousIndex) return []

  return schedule
    .slice(previousIndex, nextIndex)
    .map(entry => entry.phase)
    .filter(phase => phase !== 'pack_review')
}

export function contributionTypeForPhase(phase: BoardPhase) {
  const types: Record<BoardPhase, string[]> = {
    pack_review: ['founder_question'],
    independent_analysis: ['independent_analysis'],
    peer_challenge: ['challenge', 'response'],
    final_positions: ['final_position'],
    chair_synthesis: ['chair_synthesis'],
    founder_decision: ['decision'],
    closed: ['minutes_note'],
  }
  return types[phase]
}

export function contributionStartsSealed(phase: BoardPhase) {
  return phase === 'independent_analysis' || phase === 'final_positions'
}
