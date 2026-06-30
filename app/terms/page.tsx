import Image from 'next/image'
import Link from 'next/link'
import { PRODUCT } from '@/lib/shadow-board/product'

export default function TermsPage() {
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
          <p className="sb-code">Termos de uso</p>
          <h1>Um sistema de apoio a decisao, nao um conselho formal.</h1>
          <p>
            Board Governance OS organiza contexto, desafia planos e registra decisoes. O produto
            nao substitui conselheiros, administradores, auditoria, advogado, contador ou decisao
            fiduciaria de uma empresa.
          </p>
        </section>

        <section className="sb-public-readout" aria-label="Termos de uso">
          <div className="sb-public-panel">
            <p className="sb-code">Uso permitido</p>
            <h2>Estrutura, memoria e acompanhamento para decisoes melhores.</h2>
          </div>
          <div className="sb-public-grid">
            {[
              ['Responsabilidade', 'O usuario continua responsavel por validar dados, aprovar decisoes e buscar aconselhamento profissional quando necessario.'],
              ['IA assistiva', 'Analises podem ser geradas ou sintetizadas por IA. Elas devem ser revisadas antes de uso executivo ou externo.'],
              ['Conteudo enviado', 'O usuario deve ter direito de enviar os documentos e informacoes usados no produto.'],
              ['Uso restrito', 'Acesso, convites e exportacoes devem ser usados apenas por pessoas autorizadas pela organizacao.'],
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
