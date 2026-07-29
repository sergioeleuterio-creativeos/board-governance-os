import { RoomsScreen } from '@/components/decision-room/DecisionRoomScreens'
import { getSessionUser } from '@/lib/auth-server'
import { getDecisionRoomReadout } from '@/lib/decision-room/contracts'
import { getCurrentCompanyForUser } from '@/lib/shadow-board/current-company-server'
import { redirect } from 'next/navigation'

export default async function RoomsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login?next=/rooms')
  const company = await getCurrentCompanyForUser(user)
  if (!company) redirect('/company/intake')

  const readout = await getDecisionRoomReadout({ company })
  return <RoomsScreen readout={readout} />
}
