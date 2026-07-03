import { RoomsScreen } from '@/components/decision-room/DecisionRoomScreens'
import { getDecisionRoomReadout } from '@/lib/decision-room/contracts'

export default async function RoomDetailPage() {
  const readout = await getDecisionRoomReadout()
  return <RoomsScreen readout={readout} />
}
