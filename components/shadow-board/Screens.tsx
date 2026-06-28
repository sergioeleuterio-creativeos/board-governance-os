import {
  advisors,
  boardPackQuestions,
  companyContext,
  decisionLedger,
  decisionQueue,
  followUps,
  boardFinancialMetrics,
  financialReportSections,
  ingestedFiles,
  memoryStats,
  memoryTimeline,
  metrics,
  reviewNotes,
  riskMap,
  structuredAdvisorReports,
  unresolvedQuestions,
  workstreams,
} from '@/lib/shadow-board/demo-data'
import type { ReactNode } from 'react'
import {
  AdvisorMark,
  DossierSection,
  Meter,
  MetricCard,
  PageHeader,
  Panel,
  RowCard,
  SectionTitle,
  StatusPill,
} from './ui'
import Link from 'next/link'
import { DashboardHeader } from './DashboardHeader'

export function DashboardScreen() {
  return (
    <div className="space-y-6">
      <DashboardHeader />

      <Panel className="sb-principle">
        <p className="sb-eyebrow">Principle</p>
        <p>{companyContext.principle}</p>
      </Panel>

      <section className="grid gap-4 lg:grid-cols-4 sm:grid-cols-2">
        {metrics.map(metric => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
        <Panel>
          <SectionTitle label="Decisions awaiting you" action={<span className="sb-text-link">View all</span>} />
          <div className="space-y-3">
            {decisionQueue.map(item => (
              <RowCard key={item.id} code={item.id} title={item.title} detail={item.detail} tag={item.tag} tone={item.tone} />
            ))}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <SectionTitle label="Governance cadence" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="sb-code">LAST 90 DAYS</p>
                <p className="sb-big-number">21</p>
                <p className="sb-muted">Decisions closed</p>
              </div>
              <div>
                <p className="sb-code">INPUTS LOGGED</p>
                <p className="sb-big-number">284</p>
                <p className="sb-muted">Memory updates</p>
              </div>
            </div>
          </Panel>

          <Panel>
            <SectionTitle label="Shadow Board status" />
            <div className="grid gap-2">
              {advisors.map(adv => (
                <div key={adv.code} className="sb-advisor-row">
                  <AdvisorMark code={adv.code} color={adv.color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{adv.name}</p>
                    <p className="sb-muted truncate">{adv.scope}</p>
                  </div>
                  <span className="sb-code" style={{ color: adv.statusColor }}>{adv.status}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionTitle label="Resenha referral" />
            <p className="sb-muted">
              Your governance maturity score qualifies this company for a Dreamboard advisory session.
            </p>
            <button className="btn-secondary mt-4">Review referral request</button>
          </Panel>
        </div>
      </section>
    </div>
  )
}

export function CompanyBrainScreen() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="02 - Company Brain"
        title="Institutional memory"
        description={`Everything the board knows about ${companyContext.company} - 1,284 facts - updated 14m ago`}
        action={<Link href="/company/intake" className="btn-primary">Start intake</Link>}
      />

      <section className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {memoryStats.map(([label, value]) => (
          <Panel key={label} className="py-4">
            <p className="sb-code">{label}</p>
            <p className="sb-big-number">{value}</p>
          </Panel>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.3fr_0.8fr]">
        <Panel>
          <SectionTitle label="Memory timeline" />
          <div className="mb-4 flex flex-wrap gap-2">
            {['All', 'Risks', 'Finance'].map(label => <StatusPill key={label}>{label}</StatusPill>)}
          </div>
          <div className="space-y-3">
            {memoryTimeline.map(item => (
              <article key={item.title} className="sb-memory-item">
                <p className="sb-code">{item.code}</p>
                <div>
                  <h3 className="sb-row-title">{item.title}</h3>
                  <p className="sb-muted mt-1">{item.detail}</p>
                  <p className="sb-code mt-3">{item.source} - {item.status} - {item.age}</p>
                </div>
              </article>
            ))}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <SectionTitle label="Unresolved questions" />
            <p className="sb-big-number">7</p>
            <div className="mt-3 space-y-3">
              {unresolvedQuestions.map(question => <p key={question} className="sb-muted">{question}</p>)}
            </div>
          </Panel>
          <Panel>
            <SectionTitle label="Recently ingested" />
            <div className="space-y-3">
              {ingestedFiles.map(([type, name, detail]) => (
                <div key={name} className="sb-file-row">
                  <span className="sb-file-type">{type}</span>
                  <div>
                    <p className="font-semibold">{name}</p>
                    <p className="sb-muted">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </section>
    </div>
  )
}

export function GovernanceRunScreen() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="03 - Governance Run"
        title="Run #14 - Q2 strategic plan"
        description="Generated from 1,284 memory facts + 3 new inputs - 6 min ago"
        action={<button className="btn-primary">Send to Board Pack</button>}
      />

      <Panel>
        <div className="grid gap-5 lg:grid-cols-[0.75fr_1.4fr]">
          <div>
            <SectionTitle label="Diagnosis" />
            <p className="sb-serif-callout">
              Growth is real but concentrated and cash-fragile. The business is one large-customer loss away from a runway crisis.
            </p>
            <ul className="sb-clean-list mt-5">
              <li>Revenue concentration at 34% in one account</li>
              <li>Cash runway under 7 months at current burn</li>
              <li>Strong unit economics in core SMB segment</li>
            </ul>
          </div>
          <div>
            <SectionTitle label="Workstreams, KPIs & owners" />
            <div className="sb-table">
              <div className="sb-table-head">
                <span>Workstream</span><span>KPI</span><span>Owner</span><span>Timeline</span>
              </div>
              {workstreams.map(row => (
                <div className="sb-table-row" key={row[0]}>
                  {row.map(cell => <span key={cell}>{cell}</span>)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <section className="grid gap-4 md:grid-cols-3">
        {['Diversify revenue base', 'Extend cash runway to 12 months', 'Professionalize ops cadence'].map((priority, index) => (
          <Panel key={priority}>
            <p className="sb-code">Ranked priority {index + 1}</p>
            <h2 className="sb-row-title mt-3">{priority}</h2>
          </Panel>
        ))}
      </section>
    </div>
  )
}

export function BoardPackScreen() {
  const contents = [
    'Executive summary',
    'Strategic questions',
    'Financial reports',
    'Risk map',
    'Advisor reports',
    'Meeting agenda',
    'Decision candidates',
  ]

  return (
    <div className="grid gap-6 xl:grid-cols-[240px_1fr_300px]">
      <Panel className="h-fit">
        <SectionTitle label="Contents" />
        {contents.map((item, index) => (
          <p key={item} className="sb-pack-nav">{index + 1}. {item}</p>
        ))}
      </Panel>

      <Panel tone="dossier" className="sb-dossier">
        <p className="sb-code">Board Pack - BP-026</p>
        <h1>Nuveo Logistica - Q2 FY26</h1>
        <DossierSection number="1" title="Executive summary">
          <p>
            Nuveo enters Q2 growing but cash-fragile, with 34% revenue concentration in a single account and under seven months of runway.
            The board&apos;s central task this quarter is to convert growth into resilience: diversify revenue, extend runway, and install an
            operating cadence that survives the founder&apos;s attention drifting elsewhere.
          </p>
        </DossierSection>
        <DossierSection number="2" title="Strategic questions">
          <div className="space-y-3">
            {boardPackQuestions.map((question, index) => <p key={question}><strong>Q{index + 1}</strong> {question}</p>)}
          </div>
        </DossierSection>
        <DossierSection number="3" title="Financial reports for board review">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {boardFinancialMetrics.map(([label, value, detail]) => (
              <Panel key={label}>
                <p className="sb-code">{label}</p>
                <p className="sb-big-number">{value}</p>
                <p className="sb-muted">{detail}</p>
              </Panel>
            ))}
          </div>
          <div className="mt-5 grid gap-5">
            {financialReportSections.map(section => (
              <div key={section.title}>
                <h3 className="sb-row-title">{section.title}</h3>
                <div className="sb-table sb-table-dossier sb-financial-table mt-3">
                  <div className="sb-table-head">
                    <span>Line item</span><span>Value</span><span>Variance</span><span>Board note</span>
                  </div>
                  {section.rows.map(row => (
                    <div className="sb-table-row" key={row[0]}>
                      {row.map(cell => <span key={cell}>{cell}</span>)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DossierSection>
        <DossierSection number="4" title="Risk map">
          <div className="sb-table sb-table-dossier sb-risk-table">
            {riskMap.map(row => (
              <div className="sb-table-row" key={row[0]}>
                <span>{row[0]}</span><span>{row[1]}</span><span>{row[2]}</span>
              </div>
            ))}
          </div>
        </DossierSection>
        <DossierSection number="5" title="Structured advisor reports">
          <div className="grid gap-4">
            {structuredAdvisorReports.map(report => {
              const adv = advisors.find(item => item.code === report.code)
              return (
                <article key={report.code} className="sb-advisor-report">
                  <div className="flex flex-wrap items-start gap-3">
                    <AdvisorMark code={report.code} color={adv?.color ?? '#8A8478'} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="sb-row-title">{report.title}</h3>
                        <StatusPill tone={report.stance.includes('Request') ? 'caution' : 'positive'}>{report.stance}</StatusPill>
                      </div>
                      <p className="sb-muted mt-2">{report.finding}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="sb-code">C-level questions</p>
                      {report.questions.map(question => <p key={question} className="mt-2">{question}</p>)}
                    </div>
                    <div>
                      <p className="sb-code">Recommendations</p>
                      {report.recommendations.map(recommendation => <p key={recommendation} className="mt-2">{recommendation}</p>)}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </DossierSection>
      </Panel>

      <div className="space-y-5">
        <Panel>
          <SectionTitle label="Export" />
          <div className="grid gap-2">
            <button className="btn-secondary">PDF Board pack</button>
            <button className="btn-secondary">PPT Slide deck</button>
            <button className="btn-secondary">Web shareable link</button>
          </div>
        </Panel>
        <Panel>
          <SectionTitle label="Annotations" />
          <p className="sb-muted">
            Risk Advisor recommends a hard cap of 25% on single-customer exposure in the resolution.
          </p>
          <button className="btn-primary mt-4">Send to review</button>
        </Panel>
      </div>
    </div>
  )
}

export function ShadowBoardReviewScreen() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="05 - Shadow Board Review"
        title="Board Pack BP-026 in session"
        description="Six advisors reviewing independently - Board Brain synthesizing"
      />
      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel tone="chamber">
          <SectionTitle label="Live deliberation" />
          <div className="grid gap-3">
            {reviewNotes.map(([code, name, stance, note]) => {
              const adv = advisors.find(item => item.code === code)
              return (
                <article key={code} className="sb-review-card">
                  <AdvisorMark code={code} color={adv?.color ?? '#8A8478'} />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3>{name}</h3>
                      <StatusPill tone={stance === 'Dissents' ? 'critical' : stance === 'Queued' ? 'neutral' : 'positive'}>{stance}</StatusPill>
                    </div>
                    <p>{note}</p>
                  </div>
                </article>
              )
            })}
          </div>
        </Panel>

        <Panel tone="chamber" className="sb-synthesis">
          <AdvisorMark code="BB" color="#C4922F" size="lg" />
          <p className="sb-eyebrow mt-5">Board Brain - synthesized recommendation</p>
          <h2>5 of 6 aligned - 1 dissent recorded</h2>
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <span className="sb-code">Confidence</span>
              <strong className="sb-big-number text-brass">78</strong>
            </div>
            <Meter value={78} tone="positive" />
          </div>
          <p className="sb-serif-callout mt-6">
            Pause the Sao Paulo hub for one quarter. Redirect capital and attention to capping customer concentration at 25% and extending
            runway to twelve months. Revisit the hub once a VP of Operations is in place and runway is secured.
          </p>
          <div className="mt-6 grid gap-2">
            <button className="btn-gold">Approve & record decision</button>
            <button className="btn-chamber">Challenge</button>
            <button className="btn-chamber">Deep-dive</button>
            <button className="btn-chamber-muted">Reject</button>
          </div>
        </Panel>
      </section>
    </div>
  )
}

export function DecisionMemoryScreen() {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-5">
        <PageHeader
          eyebrow="06 - Decision Memory"
          title="The decision ledger"
          description="118 closed decisions - permanent records with rationale, tradeoffs, owners, and review dates"
        />
        <Panel>
          <div className="mb-4 flex flex-wrap gap-2">
            {['All 118', 'Approved', 'Rejected', 'Due for review'].map(label => <StatusPill key={label}>{label}</StatusPill>)}
          </div>
          <div className="space-y-3">
            {decisionLedger.map(([id, title, detail, tag]) => (
              <RowCard key={id} code={id} title={title} detail={detail} tag={tag} tone={tag === 'REJECTED' ? 'critical' : tag === 'APPROVED' ? 'positive' : 'caution'} />
            ))}
          </div>
        </Panel>
      </div>

      <Panel tone="dossier" className="sb-dossier">
        <p className="sb-code">DEC-116 - Decision record</p>
        <h1>Cap exposure at 25%</h1>
        <StatusPill tone="positive">Approved</StatusPill>
        <DossierSection number="Rationale" title="Why this decision was made">
          <p>Concentration above 25% creates an unacceptable single-point failure given current runway.</p>
        </DossierSection>
        <div className="grid gap-4 sm:grid-cols-2">
          <Panel>
            <p className="sb-code">Owner</p>
            <p className="font-semibold">Finance Advisor</p>
          </Panel>
          <Panel>
            <p className="sb-code">Review date</p>
            <p className="font-semibold">Dec 2026</p>
          </Panel>
        </div>
        <DossierSection number="Tradeoff" title="Accepted tradeoff">
          <p>Slower top-line growth in exchange for resilience.</p>
        </DossierSection>
      </Panel>
    </div>
  )
}

export function FollowUpsScreen() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="07 - Follow-ups"
        title="Cadence & follow-through"
        description="Every decision carries owners and dates - this is where they get honored."
      />
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Overdue" value="4" detail="critical actions" tone="critical" />
        <MetricCard label="Due this week" value="7" detail="owner check-ins" tone="caution" />
        <MetricCard label="On track" value="21" detail="active loops" tone="positive" />
      </section>
      <Panel>
        <SectionTitle label="Follow-up tracker" />
        <div className="sb-table sb-followup-table">
          <div className="sb-table-head">
            <span>Follow-up</span><span>Owner</span><span>Due</span><span>Source</span>
          </div>
          {followUps.map(item => (
            <div className="sb-table-row" key={item.action}>
              <span>{item.action}</span>
              <span>{item.owner}</span>
              <span><StatusPill tone={item.tone}>{item.due}</StatusPill></span>
              <span>{item.source}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

export function DesignSystemScreen() {
  const tokens = [
    ['surface/base', '#F4F2ED'],
    ['surface/panel', '#FFFFFF'],
    ['ink/900', '#1A1814'],
    ['ink/600', '#57534A'],
    ['border/line', '#E4E0D6'],
    ['accent/brass', '#C4922F'],
    ['status/positive', '#3E6B4F'],
    ['status/critical', '#A23B2D'],
    ['chamber/bg', '#16140F'],
  ]
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Design System - v1.0"
        title="Shadow Board - hybrid system"
        description="Decision Cockpit for daily use, Governance Dossier for board artifacts, and Shadow Room for live advisor deliberation."
      />
      <section className="grid gap-4 md:grid-cols-3">
        {tokens.map(([name, color]) => (
          <Panel key={name}>
            <div className="h-16 rounded-md border border-rule" style={{ backgroundColor: color }} />
            <p className="sb-code mt-3">{name}</p>
            <p className="font-semibold">{color}</p>
          </Panel>
        ))}
      </section>
      <Panel>
        <SectionTitle label="Typography" />
        <div className="grid gap-4 md:grid-cols-3">
          <div><h2 className="font-serif text-4xl">Spectral</h2><p className="sb-muted">Headlines, board-pack prose, recommendations, big numerals.</p></div>
          <div><h2 className="font-sans text-4xl font-semibold">Archivo</h2><p className="sb-muted">Interface text, labels, tables, buttons.</p></div>
          <div><h2 className="font-mono text-3xl">Plex Mono</h2><p className="sb-muted">IDs, KPI labels, metadata, eyebrows.</p></div>
        </div>
      </Panel>
      <Panel>
        <SectionTitle label="Governance agent identities" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {advisors.map(adv => (
            <div key={adv.code} className="sb-agent-token">
              <AdvisorMark code={adv.code} color={adv.color} />
              <p>{adv.shortName}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

export function MobileBehaviorScreen() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Mobile behavior"
        title="Mobile is for decisions, not authoring"
        description="Founders open Shadow Board on a phone to act: approve a decision, clear a follow-up, or glance at risk."
      />
      <section className="grid gap-6 lg:grid-cols-3">
        <PhoneFrame title="3 need you" eyebrow="NUVEO - FY26 Q2">
          <RowCard code="DEC-118" title="Pause Sao Paulo hub" detail="Tap to review" tag="HIGH" tone="critical" />
          <RowCard code="DEC-117" title="Usage-based pricing" detail="Tap to approve" tag="REVENUE" tone="caution" />
        </PhoneFrame>
        <PhoneFrame title="Synthesis" eyebrow="SHADOW BOARD" dark>
          <Panel tone="chamber">
            <div className="flex items-center gap-3">
              <AdvisorMark code="BB" color="#C4922F" size="sm" />
              <p className="font-semibold">5 of 6 aligned</p>
            </div>
            <p className="sb-serif-callout mt-4">Pause the hub. Cap concentration at 25% and extend runway first.</p>
          </Panel>
          <button className="btn-gold mt-auto">Approve</button>
        </PhoneFrame>
        <PhoneFrame title="Executive summary" eyebrow="BP-026 - 1/6">
          <Panel tone="dossier">
            <p className="sb-serif-callout">Nuveo enters Q2 growing but cash-fragile. The board&apos;s task: convert growth into resilience.</p>
          </Panel>
        </PhoneFrame>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <Panel><h2 className="sb-row-title">Breakpoints</h2><p className="sb-muted">Rail becomes bottom tabs below 900px. Tables become labeled card rows.</p></Panel>
        <Panel><h2 className="sb-row-title">Touch targets</h2><p className="sb-muted">Minimum 44px. Primary action stays thumb-reachable.</p></Panel>
        <Panel><h2 className="sb-row-title">Desktop-only</h2><p className="sb-muted">Governance Run authoring and pack assembly stay desktop-first.</p></Panel>
      </section>
    </div>
  )
}

function PhoneFrame({
  eyebrow,
  title,
  children,
  dark = false,
}: {
  eyebrow: string
  title: string
  children: ReactNode
  dark?: boolean
}) {
  return (
    <div className="mx-auto w-full max-w-[280px] rounded-[34px] bg-ink p-2">
      <div className={`flex min-h-[440px] flex-col gap-3 overflow-hidden rounded-[26px] p-4 ${dark ? 'bg-chamber text-paper' : 'bg-paper text-ink'}`}>
        <div>
          <p className="sb-code text-brass">{eyebrow}</p>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        {children}
      </div>
    </div>
  )
}
