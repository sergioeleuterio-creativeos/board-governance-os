import Image from 'next/image'
import Link from 'next/link'
import { PRODUCT } from '@/lib/shadow-board/product'

const pillars = [
  ['Company Brain', 'Contexto, historico, arquivos, riscos, decisoes e desafios em uma memoria viva.'],
  ['Governance Run', 'Diagnostico, prioridades, KPIs, workstreams, riscos e agenda de decisao.'],
  ['Shadow Board Review', 'Seis lentes independentes desafiam o plano antes do founder se comprometer.'],
  ['Decision Memory', 'Cada decisao preserva racional, trade-offs, confianca, dono e follow-up.'],
]

export default function HomePage() {
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
          <p className="sb-code">Governance operating system</p>
          <h1>Board-level thinking before you can afford a board.</h1>
          <p>
            Board Governance OS ajuda empresas founder-led a transformar problemas confusos em
            decisoes, memoria e follow-up, sem fingir ser um conselheiro, CEO virtual ou substituto
            de conselho.
          </p>
          <div className="sb-public-actions">
            <Link href="/login" className="btn-gold">Acessar workspace</Link>
            <a href="mailto:mail@board-os.ai" className="btn-chamber">Falar com Board OS</a>
          </div>
        </section>

        <section className="sb-public-readout" aria-label="Product modules">
          <div className="sb-public-panel">
            <p className="sb-code">Principio</p>
            <h2>Advice becomes decisions, owners, memory, and follow-through.</h2>
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
