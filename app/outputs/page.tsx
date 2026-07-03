import { OutputsScreen } from '@/components/decision-room/DecisionRoomScreens'
import { getDecisionRoomReadout } from '@/lib/decision-room/contracts'

export default async function OutputsPage() {
  const readout = await getDecisionRoomReadout()
  return <OutputsScreen readout={readout} />
}
