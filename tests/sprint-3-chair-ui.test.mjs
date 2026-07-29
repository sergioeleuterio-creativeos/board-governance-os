import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const navigationUrl = new URL('../components/Navigation.tsx', import.meta.url)
const roomsUrl = new URL('../components/decision-room/DecisionRoomScreens.tsx', import.meta.url)
const stylesUrl = new URL('../app/globals.css', import.meta.url)

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

test('the meeting keeps personas visible and uses one founder composer', async () => {
  const rooms = await readFile(roomsUrl, 'utf8')

  assert.match(rooms, /className="sb-meeting-roster"/)
  assert.match(rooms, /Board visível nesta conversa/)
  assert.equal((rooms.match(/className="sb-chair-composer"/g) ?? []).length, 1)
  assert.match(rooms, /Fale com o Advisor/)
  assert.match(rooms, /chairPrimaryLabel/)
  assert.doesNotMatch(rooms, /className="sb-agent-picker"/)
  assert.doesNotMatch(rooms, /function SessionGrid/)
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
