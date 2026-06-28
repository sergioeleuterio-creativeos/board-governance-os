'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createAuthClient } from '@/lib/auth-client'
import { PRODUCT } from '@/lib/shadow-board/product'

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
  }
}

function getTurnstileSiteKey(): string {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''
}

function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'
  const t = useTranslations('auth')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const turnstileRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string>('')

  const siteKey = getTurnstileSiteKey()
  const normalizedEmail = email.trim().toLowerCase()
  const turnstileRequired = Boolean(siteKey)

  useEffect(() => {
    if (!siteKey || !turnstileRef.current) return

    const scriptId = 'cf-turnstile-script'
    const renderWidget = () => {
      if (!window.turnstile || !turnstileRef.current || widgetIdRef.current) return
      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: siteKey,
        theme: 'light',
        callback: (token: string) => setTurnstileToken(token),
        'expired-callback': () => setTurnstileToken(''),
        'error-callback': () => {
          setTurnstileToken('')
          setError(t('securityCheckFailed'))
        },
      })
    }

    const existing = document.getElementById(scriptId)
    if (existing) {
      renderWidget()
      return
    }

    const script = document.createElement('script')
    script.id = scriptId
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true
    script.onload = renderWidget
    document.head.appendChild(script)

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = ''
      }
    }
  }, [siteKey, t])

  async function verifyTurnstile(): Promise<boolean> {
    if (!turnstileRequired) return true
    if (!turnstileToken) {
      setError(t('securityCheckRequired'))
      return false
    }

    const response = await fetch('/api/auth/turnstile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: turnstileToken }),
    })

    if (response.ok) return true

    setError(t('securityCheckFailed'))
    if (window.turnstile && widgetIdRef.current) {
      window.turnstile.reset(widgetIdRef.current)
      setTurnstileToken('')
    }
    return false
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!normalizedEmail || !password) return
    setLoading(true)
    setError('')

    const passedSecurity = await verifyTurnstile()
    if (!passedSecurity) {
      setLoading(false)
      return
    }

    const supabase = createAuthClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.reset(widgetIdRef.current)
        setTurnstileToken('')
      }
      return
    }

    window.location.href = next
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="block">
        <span className="field-label">{t('email')}</span>
        <input
          type="email"
          className="field-input"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoFocus
          required
        />
      </label>

      <label className="block">
        <span className="field-label">{t('password')}</span>
        <input
          type="password"
          className="field-input"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
      </label>

      {siteKey && (
        <div className="sb-turnstile-wrap">
          <div ref={turnstileRef} />
        </div>
      )}

      {error && <p className="text-xs font-mono text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading || !normalizedEmail || !password || (turnstileRequired && !turnstileToken)}
        className="btn-gold w-full disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? t('signingIn') : t('signInButton')}
      </button>

      <p className="text-xs text-muted leading-relaxed">
        {t('passwordOnlyNote')}
      </p>
    </form>
  )
}

export default function LoginPage() {
  const t = useTranslations('auth')
  return (
    <div className="sb-login-shell">
      <section className="sb-login-brief">
        <p className="sb-code">Board Governance OS</p>
        <h1>{t('welcomeBack')}</h1>
        <p>{t('loginPrinciple')}</p>
        <div className="sb-login-proof">
          <span>Company Brain</span>
          <span>Board Pack</span>
          <span>Decision Memory</span>
        </div>
      </section>

      <section className="sb-login-panel">
        <div className="text-center space-y-2">
          <span className="text-gold font-serif text-2xl font-bold tracking-tight">
            {PRODUCT.name}
          </span>
          <p className="text-xs font-mono text-muted tracking-widest uppercase">
            {t('tagline')}
          </p>
        </div>

        <div className="border border-rule bg-panel p-8 space-y-6">
          <div>
            <h2 className="text-lg font-serif font-bold text-ink">{t('passwordAccess')}</h2>
            <p className="text-sm text-muted mt-1">{t('enterEmail')}</p>
          </div>

          <Suspense fallback={<div className="animate-pulse h-24 bg-rule rounded" />}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </div>
  )
}
