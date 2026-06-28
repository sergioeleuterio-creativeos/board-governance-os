import { createBrowserClient } from '@supabase/ssr'

// Use createBrowserClient so the session is read from cookies (set by @supabase/ssr),
// not localStorage. This ensures auth.uid() resolves correctly in RLS policies when
// the middleware uses cookie-based sessions.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
