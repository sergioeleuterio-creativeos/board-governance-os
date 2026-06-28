'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createAuthClient } from '@/lib/auth-client'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  async function resolveAdmin(userId: string | undefined) {
    if (!userId) { setIsAdmin(false); return }
    const { data } = await supabase
      .from('user_profiles')
      .select('is_super_admin')
      .eq('id', userId)
      .single()
    setIsAdmin(data?.is_super_admin === true)
  }

  useEffect(() => {
    const authClient = createAuthClient()

    authClient.auth.getUser().then(({ data }) => {
      setUser(data.user)
      resolveAdmin(data.user?.id).finally(() => setLoading(false))
    })

    const { data: { subscription } } = authClient.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      resolveAdmin(session?.user?.id)
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => {
    const authClient = createAuthClient()
    await authClient.auth.signOut()
    window.location.href = '/login'
  }

  return { user, isAdmin, loading, signOut }
}
