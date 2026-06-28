'use client'

import { useAuth } from '@/hooks/useAuth'
import { companyContext } from '@/lib/shadow-board/demo-data'
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
  const name = profileName(user, profile)
  const firstName = name?.split(/\s+/)[0]

  return (
    <PageHeader
      eyebrow="Founder Dashboard"
      title={firstName ? `Good morning, ${firstName}` : 'Good morning'}
      description={`Next board meeting ${companyContext.nextMeeting}`}
    />
  )
}
