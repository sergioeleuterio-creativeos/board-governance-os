import Image from 'next/image'
import Link from 'next/link'
import { PRODUCT } from '@/lib/shadow-board/product'

const pillars = [
  ['Company Brain', 'Contexto, historico, arquivos, riscos, decisoes e desafios em uma memoria viva.'],
  ['Diagnosis', 'Strategy Core separa o problema declarado do problema real antes da sala abrir.'],
  ['Decision Rooms', 'Oito agentes instruidos pressionam a decisao com evidencia, dissenso e sintese ao vivo.'],
  ['Decision Memory', 'Cada decisao preserva racional, opcoes rejeitadas, confianca, dono e follow-up.'],
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
          <p className="sb-code">Decision infrastructure</p>
          <h1>A sala de decisao que conhece o negocio antes de dar conselho.</h1>
          <p>
            Board OS ajuda empresas lideradas por founders a transformar ambiguidade em diagnostico,
            pressao executiva, entregaveis, memoria e follow-up, sem fingir ser um conselheiro,
            CEO virtual ou substituto de conselho.
          </p>
          <div className="sb-public-actions">
            <Link href="/login" className="btn-gold">Acessar workspace</Link>
            <a href="mailto:mail@board-os.ai" className="btn-chamber">Falar com Board OS</a>
          </div>
        </section>

        <section className="sb-public-readout" aria-label="Modulos do produto">
          <div className="sb-public-panel">
            <p className="sb-code">Principio</p>
            <h2>Mais contexto. Melhor desacordo. Decisoes que viram trabalho.</h2>
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
