'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createAuthClient } from '@/lib/auth-client'
import { PRODUCT } from '@/lib/shadow-board/product'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createAuthClient()

    async function prepareRecoverySession() {
      const query = new URLSearchParams(window.location.search)
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const code = query.get('code')
      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          setError(exchangeError.message)
        }
      } else if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (sessionError) {
          setError(sessionError.message)
        }
      }

      if (code || accessToken || refreshToken || window.location.hash) {
        window.history.replaceState(null, '', '/reset-password')
      }

      const { data } = await supabase.auth.getUser()
      setHasSession(Boolean(data.user))
      setCheckingSession(false)
    }

    prepareRecoverySession().catch(() => {
      setError('Nao foi possivel validar o link de recuperacao.')
      setHasSession(false)
      setCheckingSession(false)
    })
  }, [])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (password.length < 8) {
      setError('Use uma senha com pelo menos 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas nao conferem.')
      return
    }

    setLoading(true)
    const supabase = createAuthClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setMessage('Senha atualizada. Voce ja pode entrar com a nova senha.')
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="sb-login-shell">
      <section className="sb-login-brief">
        <p className="sb-code">Board Governance OS</p>
        <h1>Definir nova senha</h1>
        <p>
          O link de recuperacao cria uma sessao temporaria apenas para atualizar sua senha.
          Depois disso, acesse o workspace normalmente.
        </p>
        <div className="sb-login-proof">
          <span>Acesso restrito</span>
          <span>Senha obrigatoria</span>
          <span>Turnstile pronto</span>
        </div>
      </section>

      <section className="sb-login-panel">
        <div className="text-center space-y-3">
          <Image
            src="/brand/mark.png"
            alt=""
            width={54}
            height={54}
            className="mx-auto sb-login-mark"
            priority
          />
          <span className="block text-gold font-serif text-2xl font-bold tracking-tight">
            {PRODUCT.name}
          </span>
          <p className="text-xs font-mono text-muted tracking-widest uppercase">
            Recuperacao de acesso
          </p>
        </div>

        <div className="border border-rule bg-panel p-8 space-y-6">
          {checkingSession ? (
            <p className="text-sm text-muted">Validando link de recuperacao...</p>
          ) : hasSession ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block">
                <span className="field-label">Nova senha</span>
                <input
                  type="password"
                  className="field-input"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  autoFocus
                  required
                />
              </label>

              <label className="block">
                <span className="field-label">Confirmar senha</span>
                <input
                  type="password"
                  className="field-input"
                  value={confirmPassword}
                  onChange={event => setConfirmPassword(event.target.value)}
                  required
                />
              </label>

              {error && <p className="text-xs font-mono text-red-600">{error}</p>}
              {message && <p className="text-xs font-mono text-positive">{message}</p>}

              <button
                type="submit"
                disabled={loading || !password || !confirmPassword}
                className="btn-gold w-full disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'Atualizando...' : 'Atualizar senha'}
              </button>

              {message && <Link href="/login" className="btn-secondary w-full">Ir para login</Link>}
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted">
                Este link expirou ou ja foi usado. Solicite um novo link de recuperacao.
              </p>
              <Link href="/login" className="btn-gold w-full">Voltar ao login</Link>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
