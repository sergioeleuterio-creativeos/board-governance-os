import Image from 'next/image'
import Link from 'next/link'
import { PRODUCT } from '@/lib/shadow-board/product'

const pillars = [
  ['Contexto', 'Conte o que esta acontecendo por conversa, documentos, WhatsApp ou dados soltos.'],
  ['Diagnostico', 'O Board Brain ajuda a formular melhor o problema antes de forcar uma decisao.'],
  ['Sessoes', 'Escolha consultoria aberta para plano, ou board session quando ja existe uma decisao.'],
  ['Acoes', 'Saia com plano, workstreams, KPIs, decisoes candidatas, donos e prazos.'],
]

export default function HomePage() {
  return (
    <div className="sb-public-home">
      <header className="sb-public-nav">
        <Link href="/" className="sb-public-brand" aria-label={PRODUCT.name}>
          <Image src="/brand/mark.png" alt="" width={40} height={40} priority />
          <span>{PRODUCT.name}</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="sb-text-link">Privacidade</Link>
          <Link href="/terms" className="sb-text-link">Termos</Link>
          <Link href="/login" className="btn-gold">Entrar</Link>
        </div>
      </header>

      <main className="sb-public-hero">
        <section className="sb-public-copy">
          <p className="sb-code">Decision and advisory infrastructure</p>
          <h1>Conte o que esta acontecendo. Saia com plano, decisao ou acao.</h1>
          <p>
            Board OS ajuda empresas lideradas por founders a transformar contexto confuso em diagnostico,
            conselho consultivo, planos, decisoes formais e follow-up, sem fingir ser um conselheiro,
            CEO virtual ou substituto de governanca.
          </p>
          <div className="sb-public-actions">
            <Link href="/login" className="btn-gold">Acessar workspace</Link>
            <a href="mailto:mail@board-os.ai" className="btn-chamber">Falar com Board OS</a>
          </div>
        </section>

        <section className="sb-public-readout" aria-label="Modulos do produto">
          <div className="sb-public-panel">
            <p className="sb-code">Principio</p>
            <h2>Primeiro entender. Depois escolher. Sempre sair com trabalho claro.</h2>
          </div>
          <div className="sb-public-grid">
            {pillars.map(([title, description]) => (
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
