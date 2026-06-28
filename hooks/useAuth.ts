'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createAuthClient } from '@/lib/auth-client'
import { supabase } from '@/lib/supabase'

type UserProfileSummary = {
  email: string | null
  full_name: string | null
  is_super_admin: boolean | null
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfileSummary | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  async function resolveProfile(userId: string | undefined) {
    if (!userId) {
      setProfile(null)
      setIsAdmin(false)
      return
    }

    const { data } = await supabase
      .from('user_profiles')
      .select('email, full_name, is_super_admin')
      .eq('id', userId)
      .maybeSingle()
    setProfile(data ?? null)
    setIsAdmin(data?.is_super_admin === true)
  }

  useEffect(() => {
    const authClient = createAuthClient()

    authClient.auth.getUser().then(({ data }) => {
      setUser(data.user)
      resolveProfile(data.user?.id).finally(() => setLoading(false))
    })

    const { data: { subscription } } = authClient.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      resolveProfile(session?.user?.id)
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => {
    const authClient = createAuthClient()
    await authClient.auth.signOut()
    window.location.href = '/login'
  }

  return { user, profile, isAdmin, loading, signOut }
}
