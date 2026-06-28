import type { ReactNode } from 'react'

type Tone = 'positive' | 'critical' | 'caution' | 'neutral'

const toneClass: Record<Tone, string> = {
  positive: 'sb-pill-positive',
  critical: 'sb-pill-critical',
  caution: 'sb-pill-caution',
  neutral: 'sb-pill-neutral',
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <header className="sb-page-header">
      <div>
        <p className="sb-eyebrow">{eyebrow}</p>
        <h1 className="sb-page-title">{title}</h1>
        {description && <p className="sb-page-description">{description}</p>}
      </div>
      {action && <div className="sb-header-action">{action}</div>}
    </header>
  )
}

export function Panel({
  children,
  className = '',
  tone = 'default',
}: {
  children: ReactNode
  className?: string
  tone?: 'default' | 'dossier' | 'chamber'
}) {
  const toneClass = {
    default: 'sb-panel-default',
    dossier: 'sb-panel-dossier',
    chamber: 'sb-panel-chamber',
  }[tone]

  return <section className={`sb-panel ${toneClass} ${className}`}>{children}</section>
}

export function SectionTitle({
  label,
  action,
}: {
  label: string
  action?: ReactNode
}) {
  return (
    <div className="sb-section-title">
      <span>{label}</span>
      {action}
    </div>
  )
}

export function MetricCard({
  label,
  value,
  detail,
  delta,
  tone = 'neutral',
}: {
  label: string
  value: string
  detail: string
  delta?: string
  tone?: Tone
}) {
  return (
    <Panel className="sb-metric">
      <div className="flex items-start justify-between gap-3">
        <p className="sb-eyebrow">{label}</p>
        {delta && <span className={`sb-delta sb-delta-${tone}`}>{delta}</span>}
      </div>
      <div className="mt-5 flex items-baseline gap-2">
        <strong className={`sb-metric-value sb-tone-${tone}`}>{value}</strong>
        <span className="sb-muted">{detail}</span>
      </div>
      <Meter value={Number(value)} tone={tone} />
    </Panel>
  )
}

export function Meter({ value, tone = 'neutral' }: { value: number; tone?: Tone }) {
  return (
    <div className="sb-meter" aria-label={`${value} of 100`}>
      <span className={`sb-meter-fill sb-meter-${tone}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  )
}

export function StatusPill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: Tone
}) {
  return <span className={`sb-pill ${toneClass[tone]}`}>{children}</span>
}

export function AdvisorMark({
  code,
  color,
  size = 'md',
}: {
  code: string
  color: string
  size?: 'sm' | 'md' | 'lg'
}) {
  return (
    <span className={`sb-advisor-mark sb-advisor-${size}`} style={{ backgroundColor: color }}>
      {code}
    </span>
  )
}

export function RowCard({
  code,
  title,
  detail,
  tag,
  tone = 'neutral',
}: {
  code: string
  title: string
  detail: string
  tag?: string
  tone?: Tone
}) {
  return (
    <article className="sb-row-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="sb-code">{code}</p>
          <h3 className="sb-row-title">{title}</h3>
          <p className="sb-muted mt-1">{detail}</p>
        </div>
        {tag && <StatusPill tone={tone}>{tag}</StatusPill>}
      </div>
    </article>
  )
}

export function DossierSection({
  number,
  title,
  children,
}: {
  number: string
  title: string
  children: ReactNode
}) {
  return (
    <section className="sb-dossier-section">
      <p className="sb-code">{number}</p>
      <h2>{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}
