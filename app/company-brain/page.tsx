import { CompanyBrainDecisionScreen } from '@/components/decision-room/DecisionRoomScreens'
import { getDecisionRoomReadout } from '@/lib/decision-room/contracts'

export default async function CompanyBrainPage() {
  const readout = await getDecisionRoomReadout()
  return <CompanyBrainDecisionScreen readout={readout} />
}
