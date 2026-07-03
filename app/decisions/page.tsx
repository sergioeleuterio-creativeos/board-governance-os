import { DecisionMemoryScreen } from '@/components/decision-room/DecisionRoomScreens'
import { getDecisionRoomReadoutWithMemory } from '@/lib/decision-room/table-readout'

export default async function DecisionsPage() {
  const readout = await getDecisionRoomReadoutWithMemory()
  return <DecisionMemoryScreen readout={readout} />
}
