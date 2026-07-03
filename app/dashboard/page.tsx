import { DecisionDashboardScreen } from '@/components/decision-room/DecisionRoomScreens'
import { getDecisionRoomReadout } from '@/lib/decision-room/contracts'

export default async function DashboardPage() {
  const readout = await getDecisionRoomReadout()
  return <DecisionDashboardScreen readout={readout} />
}
