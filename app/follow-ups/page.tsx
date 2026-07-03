import { DecisionFollowUpsScreen } from '@/components/decision-room/DecisionRoomScreens'
import { getDecisionRoomReadoutWithMemory } from '@/lib/decision-room/table-readout'

export default async function FollowUpsPage() {
  const readout = await getDecisionRoomReadoutWithMemory()
  return <DecisionFollowUpsScreen readout={readout} />
}
