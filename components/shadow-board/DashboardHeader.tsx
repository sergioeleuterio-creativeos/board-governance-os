'use client'

import { useAuth } from '@/hooks/useAuth'
import { useWorkspace } from '@/hooks/useWorkspace'
import { PageHeader } from './ui'

function profileName(user: ReturnType<typeof useAuth>['user'], profile: ReturnType<typeof useAuth>['profile']): string | null {
  const metadata = user?.user_metadata ?? {}
  const metadataName = metadata.full_name ?? metadata.name

  if (profile?.full_name?.trim()) return profile.full_name.trim()
  if (typeof metadataName === 'string' && metadataName.trim()) return metadataName.trim()
  if (profile?.email) return profile.email.split('@')[0]
  if (user?.email) return user.email.split('@')[0]
  return null
}

export function DashboardHeader() {
  const { user, profile } = useAuth()
  const { workspace } = useWorkspace()
  const name = profileName(user, profile)
  const firstName = name?.split(/\s+/)[0]
  const nextMeeting = workspace?.latest_session?.opened_at
    ?? workspace?.latest_session?.created_at
    ?? null
  const meetingLabel = nextMeeting
    ? new Intl.DateTimeFormat('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(nextMeeting))
    : 'Nenhuma board session agendada'
  const companyLabel = workspace?.company?.name ?? workspace?.organization?.name ?? 'workspace'

  return (
    <PageHeader
      eyebrow="Painel do founder"
      title={firstName ? `Bom dia, ${firstName}` : 'Bom dia'}
      description={`${companyLabel} - ${meetingLabel}`}
    />
  )
}
