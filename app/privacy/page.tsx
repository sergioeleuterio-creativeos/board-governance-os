import Image from 'next/image'
import Link from 'next/link'
import { PRODUCT } from '@/lib/shadow-board/product'

export default function PrivacyPage() {
  return (
    <div className="sb-public-home">
      <header className="sb-public-nav">
        <Link href="/" className="sb-public-brand" aria-label={PRODUCT.name}>
          <Image src="/brand/mark.png" alt="" width={40} height={40} priority />
          <span>{PRODUCT.name}</span>
        </Link>
        <Link href="/login" className="btn-gold">Entrar</Link>
      </header>

      <main className="sb-public-hero">
        <section className="sb-public-copy">
          <p className="sb-code">Privacidade</p>
          <h1>Dados de governanca precisam de cuidado de governanca.</h1>
          <p>
            Board Governance OS armazena contexto empresarial, documentos, decisoes, follow-ups e
            sinteses assistidas por IA para ajudar empresas lideradas por founders a manter memoria
            e disciplina de decisao.
          </p>
        </section>

        <section className="sb-public-readout" aria-label="Politica de privacidade">
          <div className="sb-public-panel">
            <p className="sb-code">Resumo</p>
            <h2>Acesso restrito, dados privados e uso operacional.</h2>
          </div>
          <div className="sb-public-grid">
            {[
              ['O que coletamos', 'Conta, empresa, documentos enviados, respostas de intake, decisoes, follow-ups, logs operacionais e notificacoes.'],
              ['Como usamos', 'Para gerar board packs, analises, memoria de decisoes, lembretes, auditoria operacional e suporte autorizado.'],
              ['Infraestrutura', 'O produto usa provedores como Supabase, Vercel, OpenAI e Resend conforme configuracao do ambiente.'],
              ['Controle', 'Usuarios autorizados podem solicitar correcao, exportacao ou remocao de dados pelo canal mail@board-os.ai.'],
            ].map(([title, description]) => (
              <article key={title}>
                <span />
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
