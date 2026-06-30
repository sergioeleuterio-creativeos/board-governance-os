'use client'

import { useEffect, useState } from 'react'

export type CurrentWorkspace = {
  profile: {
    id: string
    email: string | null
    full_name: string | null
    is_super_admin: boolean
    status: string
    locale: string
    timezone: string
  } | null
  organization: {
    id: string
    name: string
    slug: string
    default_locale: string
    status: string
    owner_user_id: string | null
  } | null
  organization_memberships: Array<{
    organization_id: string
    role: string
  }>
  company: {
    id: string
    organization_id: string
    name: string
    slug: string
    status: string
    industry: string | null
    stage: string | null
    revenue_range: string | null
    default_locale: string
    created_at: string
  } | null
  companies: Array<{
    id: string
    organization_id: string
    name: string
    slug: string
    status: string
    industry: string | null
    stage: string | null
    revenue_range: string | null
    default_locale: string
    created_at: string
  }>
  company_role: string | null
  latest_session: {
    id: string
    status: string
    session_type: string
    opened_at: string | null
    expires_at: string | null
    closed_at: string | null
    created_at: string
  } | null
}

type WorkspaceState = {
  workspace: CurrentWorkspace | null
  loading: boolean
  error: string
  reload: () => Promise<void>
}

function isWorkspacePayload(payload: CurrentWorkspace | { error?: string } | null): payload is CurrentWorkspace {
  return !!payload && 'profile' in payload && 'organization' in payload
}

export function useWorkspace(): WorkspaceState {
  const [workspace, setWorkspace] = useState<CurrentWorkspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadWorkspace() {
    setLoading(true)
    setError('')

    const response = await fetch('/api/workspace/current', { cache: 'no-store' })
    const payload = await response.json().catch(() => null) as CurrentWorkspace | { error?: string } | null

    if (!response.ok || !isWorkspacePayload(payload)) {
      const errorMessage = payload && 'error' in payload ? payload.error : undefined
      setError(errorMessage ?? 'Nao foi possivel carregar o workspace.')
      setLoading(false)
      return
    }

    setWorkspace(payload)
    setLoading(false)
  }

  useEffect(() => {
    void loadWorkspace()
  }, [])

  return { workspace, loading, error, reload: loadWorkspace }
}
