import { PageHeader, Panel, SectionTitle, StatusPill } from './ui'

const adminMetrics = [
  ['Organizations', '4', '1 partner-sourced'],
  ['Users', '18', '6 founders, 4 admins'],
  ['Open sessions', '3', '2 awaiting founder'],
  ['Pending invites', '5', 'expires in 6 days'],
] as const

const adminQueue = [
  ['ADM-012', 'Nuveo Logistica session needs closure review', 'Board Brain recommended commit with conditions', 'Session'],
  ['INV-008', 'Resenha partner admin invite pending', 'Eduardo Picarelli - partner_admin', 'Invite'],
  ['DOC-031', 'Q1 close.xlsx extraction failed', 'Retry after file parser worker is live', 'Document'],
  ['BIL-004', 'Quarterly package quota near limit', '1 session left in current usage package', 'Billing'],
] as const

const adminUsers = [
  ['Lucas Mares', 'lucas@nuveo.example', 'Nuveo Logistica', 'founder', 'active'],
  ['Marina Torres', 'marina@nuveo.example', 'Nuveo Logistica', 'admin', 'active'],
  ['Eduardo Picarelli', 'eduardo@resenha.example', 'Resenha', 'partner_admin', 'invited'],
  ['Sergio', 'sergio@example.com', 'Platform', 'super_admin', 'active'],
] as const

const adminSessions = [
  ['SES-026', 'Nuveo Logistica', 'Virtual review', 'Awaiting founder', 'commit_with_conditions', '72h window'],
  ['SES-025', 'Arco Foods', 'Diagnostic', 'In review', 'request_more_data', 'Open'],
  ['SES-024', 'Luma Health', 'Admin session', 'Closed', 'escalate_human_review', 'Closed 2d ago'],
] as const

function statusTone(status: string) {
  if (['active', 'Closed'].includes(status)) return 'positive'
  if (['Awaiting founder', 'invited', 'In review'].includes(status)) return 'caution'
  return 'neutral'
}

export function AdminOverviewScreen() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Admin control room"
        description="Users, organizations, sessions, billing state, document issues, and operator actions."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {adminMetrics.map(([label, value, detail]) => (
          <Panel key={label}>
            <p className="sb-code">{label}</p>
            <p className="sb-big-number">{value}</p>
            <p className="sb-muted">{detail}</p>
          </Panel>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel>
          <SectionTitle label="Operator queue" />
          <div className="space-y-3">
            {adminQueue.map(([id, title, detail, tag]) => (
              <article key={id} className="sb-row-card">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="sb-code">{id}</p>
                    <h3 className="sb-row-title">{title}</h3>
                    <p className="sb-muted mt-1">{detail}</p>
                  </div>
                  <StatusPill tone={tag === 'Document' ? 'critical' : 'neutral'}>{tag}</StatusPill>
                </div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionTitle label="Production readiness" />
          <div className="space-y-4">
            {[
              ['Supabase project', 'Pending live credentials'],
              ['Stripe products', 'Pending price decisions'],
              ['OpenAI provider', 'Env contract ready'],
              ['Email provider', 'Resend / Google approved'],
            ].map(([label, detail]) => (
              <div key={label} className="sb-advisor-row">
                <span className="sb-file-type">OPS</span>
                <div>
                  <p className="font-semibold">{label}</p>
                  <p className="sb-muted">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  )
}

export function AdminUsersScreen() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin - Users"
        title="User and membership table"
        description="Platform users, organization roles, company roles, invite state, and partner visibility."
      />

      <Panel>
        <SectionTitle label="Users" />
        <div className="sb-table sb-admin-table">
          <div className="sb-table-head">
            <span>User</span><span>Email</span><span>Scope</span><span>Role</span><span>Status</span>
          </div>
          {adminUsers.map(([name, email, scope, role, status]) => (
            <div className="sb-table-row" key={email}>
              <span>{name}</span>
              <span>{email}</span>
              <span>{scope}</span>
              <span>{role}</span>
              <span><StatusPill tone={statusTone(status)}>{status}</StatusPill></span>
            </div>
          ))}
        </div>
      </Panel>

      <section className="grid gap-4 md:grid-cols-3">
        <Panel><p className="sb-code">Role model</p><h2 className="sb-row-title">Organization first</h2><p className="sb-muted mt-2">Owner, admin, member, advisor_operator, partner_admin, super_admin.</p></Panel>
        <Panel><p className="sb-code">Company access</p><h2 className="sb-row-title">Scoped company roles</h2><p className="sb-muted mt-2">Founder, admin, member, viewer, advisor_operator.</p></Panel>
        <Panel><p className="sb-code">Invite flow</p><h2 className="sb-row-title">Magic-link ready</h2><p className="sb-muted mt-2">New users bootstrap profile and workspace after auth callback.</p></Panel>
      </section>
    </div>
  )
}

export function AdminSessionsScreen() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin - Sessions"
        title="Board session monitor"
        description="Every paid or admin session needs a status, usage counter, closure recommendation, and recovery path."
      />

      <Panel>
        <SectionTitle label="Sessions" />
        <div className="sb-table sb-admin-table">
          <div className="sb-table-head">
            <span>Session</span><span>Company</span><span>Type</span><span>Status</span><span>Closure</span><span>Window</span>
          </div>
          {adminSessions.map(([id, company, type, status, closure, window]) => (
            <div className="sb-table-row" key={id}>
              <span>{id}</span>
              <span>{company}</span>
              <span>{type}</span>
              <span><StatusPill tone={statusTone(status)}>{status}</StatusPill></span>
              <span>{closure}</span>
              <span>{window}</span>
            </div>
          ))}
        </div>
      </Panel>

      <section className="grid gap-4 lg:grid-cols-3">
        <Panel><p className="sb-code">Admin session</p><h2 className="sb-row-title">Operator can intervene</h2><p className="sb-muted mt-2">Admin sessions let Sergio or an operator inspect context and recover failed workflows.</p></Panel>
        <Panel><p className="sb-code">Usage control</p><h2 className="sb-row-title">Session as billable unit</h2><p className="sb-muted mt-2">Each review session tracks consumed usage units and deep-dive limits.</p></Panel>
        <Panel><p className="sb-code">Closure</p><h2 className="sb-row-title">No open-ended advice</h2><p className="sb-muted mt-2">Commit, commit with conditions, defer, reject, request data, or escalate.</p></Panel>
      </section>
    </div>
  )
}
