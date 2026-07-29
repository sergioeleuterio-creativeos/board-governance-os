import { BoardInvitationScreen } from '@/components/board/BoardInvitationScreen'

export default async function BoardInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <BoardInvitationScreen token={token} />
}
