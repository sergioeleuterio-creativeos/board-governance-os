import { DiagnosisScreen } from '@/components/decision-room/DecisionRoomScreens'
import { getDecisionRoomReadout } from '@/lib/decision-room/contracts'

export default async function DiagnosisPage() {
  const readout = await getDecisionRoomReadout()
  return <DiagnosisScreen readout={readout} />
}
