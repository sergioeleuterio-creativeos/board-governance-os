import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const navigationUrl = new URL('../components/Navigation.tsx', import.meta.url)
const roomsUrl = new URL('../components/decision-room/DecisionRoomScreens.tsx', import.meta.url)
const stylesUrl = new URL('../app/globals.css', import.meta.url)
const dashboardUrl = new URL('../app/dashboard/page.tsx', import.meta.url)
const intakeUrl = new URL('../components/shadow-board/CompanyBrainIntake.tsx', import.meta.url)

test('founder navigation is reduced to Advisor, Board, and Commitments', async () => {
  const navigation = await readFile(navigationUrl, 'utf8')
  const founderBlock = navigation.match(/const founderNavGroups = \[[\s\S]*?\n\]/)?.[0] ?? ''

  assert.match(founderBlock, /label: 'Advisor'/)
  assert.match(founderBlock, /label: 'Board'/)
  assert.match(founderBlock, /label: 'Compromissos'/)
  assert.equal((founderBlock.match(/href:/g) ?? []).length, 3)
})

test('the Chair remains accessible outside the Advisor route', async () => {
  const navigation = await readFile(navigationUrl, 'utf8')
  assert.match(navigation, /className="sb-chair-dock"/)
  assert.match(navigation, /Abrir o Board OS Advisor/)
})

test('the founder enters through the Advisor even when the account also has admin access', async () => {
  const [navigation, dashboard] = await Promise.all([
    readFile(navigationUrl, 'utf8'),
    readFile(dashboardUrl, 'utf8'),
  ])
  assert.match(dashboard, /redirect\('\/rooms'\)/)
  assert.match(navigation, /isAdmin && isAdminArea \? navGroups : founderNavGroups/)
  assert.match(navigation, /Board OS Advisor disponível/)
  assert.match(navigation, /Administração/)
})

test('intake starts as one conversation and keeps optional detail out of the way', async () => {
  const intake = await readFile(intakeUrl, 'utf8')
  assert.match(intake, /sb-intake-simple-nav/)
  assert.match(intake, /BOARD OS ADVISOR/)
  assert.match(intake, /transcrição de voz ou mensagens do WhatsApp/)
  assert.doesNotMatch(intake, /t\('voice\.title'\)/)
  assert.doesNotMatch(intake, /t\('whatsapp\.title'\)/)
  assert.doesNotMatch(intake, /SectionTitle label=\{t\('score'\)\}/)
  assert.doesNotMatch(intake, /Meter value=\{quality\.total\}/)
})

test('the meeting keeps personas visible and uses one founder composer', async () => {
  const rooms = await readFile(roomsUrl, 'utf8')

  assert.match(rooms, /className="sb-meeting-roster"/)
  assert.match(rooms, /Board visível nesta conversa/)
  assert.equal((rooms.match(/className="sb-chair-composer"/g) ?? []).length, 1)
  assert.match(rooms, /Fale com o Advisor/)
  assert.match(rooms, /Board OS Advisor/)
  assert.match(rooms, /chairPrimaryLabel/)
  assert.doesNotMatch(rooms, /className="sb-agent-picker"/)
  assert.doesNotMatch(rooms, /function SessionGrid/)
  assert.doesNotMatch(rooms, /Levar uma decisão ao Board/)
})

test('the simplified meeting still persists the frozen Sprint 2 source', async () => {
  const rooms = await readFile(roomsUrl, 'utf8')
  assert.match(rooms, /sourceSnapshotId: sourceSnapshot\?\.id/)
  assert.match(rooms, /sourceSnapshotHash: sourceSnapshot\?\.hash/)
  assert.match(rooms, /validateSessionPersistence/)
  assert.match(rooms, /validateDecisionPersistence/)
})

test('the meeting layout prioritizes the transcript over evidence controls', async () => {
  const styles = await readFile(stylesUrl, 'utf8')
  assert.match(styles, /\.sb-room-grid > \.sb-room-panel:first-child\s*\{\s*display: none;/)
  assert.match(styles, /\.sb-room-grid\s*\{[\s\S]*grid-template-columns: minmax\(0, 1fr\) minmax\(270px, 0\.4fr\);/)
})
