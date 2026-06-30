import Link from 'next/link'
import { Panel, SectionTitle, StatusPill } from '@/components/shadow-board/ui'

const demoSteps = [
  {
    label: '01',
    title: 'Contexto vivo',
    body: 'LANCE! entra como uma empresa de midia esportiva com alcance forte, mas com o desafio de transformar audiencia anonima em relacionamento proprietario, CRM e receita de qualidade.',
  },
  {
    label: '02',
    title: 'Board Pack',
    body: 'O sistema organiza o problema em resumo executivo, perguntas de conselho, DRE/P&L, OCF, unit economics, riscos, prioridades e agenda.',
  },
  {
    label: '03',
    title: 'Shadow Board',
    body: 'Finance, Growth, Customer, Risk, Operator, Talent e Board Brain desafiam a recomendacao por lentes diferentes antes do founder comprometer uma decisao.',
  },
  {
    label: '04',
    title: 'Memoria e follow-up',
    body: 'A reuniao vira decisoes, condicoes, owners, datas de revisao e follow-ups para que a recomendacao nao desapareca depois da conversa.',
  },
]

export default function LanceDemoPage() {
  return (
    <div className="space-y-6">
      <section className="sb-demo-hero">
        <div>
          <p className="sb-code">Demo narrativo</p>
          <h1>LANCE! como primeiro caso de Board Governance OS</h1>
          <p>
            Uma demonstracao curta: de contexto solto para decisao estruturada, memoria e
            acompanhamento. O ponto nao e provar que a IA sabe opinar; e mostrar que advisory vira
            governanca operacional.
          </p>
        </div>
        <div className="sb-demo-actions">
          <StatusPill tone="positive">Demo protegido</StatusPill>
          <Link href="/board-pack/presentation" className="btn-primary">Abrir apresentacao</Link>
          <Link href="/company/intake" className="btn-secondary">Ver intake</Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {demoSteps.map((step) => (
          <Panel key={step.label}>
            <p className="sb-code">{step.label}</p>
            <h2 className="sb-row-title">{step.title}</h2>
            <p className="sb-muted mt-2">{step.body}</p>
          </Panel>
        ))}
      </section>

      <Panel tone="dossier">
        <SectionTitle label="Talk track" />
        <div className="grid gap-4 xl:grid-cols-3">
          <div>
            <p className="sb-code">Abertura</p>
            <p>
              "O problema de advisory para PMEs nao e falta de dicas. E falta de estrutura,
              memoria e follow-up. O Board OS transforma uma sessao como Dreamboard em um ciclo de
              governanca."
            </p>
          </div>
          <div>
            <p className="sb-code">Diferenca</p>
            <p>
              "A cada decisao, o sistema registra contexto, riscos, condicoes, owners e impacto em
              decisoes anteriores. A empresa para de recomecar do zero todo mes."
            </p>
          </div>
          <div>
            <p className="sb-code">Fechamento</p>
            <p>
              "Resenha pode distribuir isso como uma camada de retencao e upsell: networking gera
              relacao; Board OS transforma relacao em decisao acompanhada."
            </p>
          </div>
        </div>
      </Panel>
    </div>
  )
}
