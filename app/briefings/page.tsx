import { BriefingsScreen } from '@/components/decision-room/DecisionRoomScreens'
import { getDecisionRoomReadout } from '@/lib/decision-room/contracts'

export default async function BriefingsPage() {
  const readout = await getDecisionRoomReadout()
  return <BriefingsScreen readout={readout} />
}
