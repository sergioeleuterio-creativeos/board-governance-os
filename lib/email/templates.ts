type ProductEmailInput = {
  eyebrow?: string
  title: string
  intro: string
  detail?: string
  highlight?: string
  ctaLabel: string
  ctaHref: string
}

type ReminderEmailInput = {
  title: string
  detail: string
  due: string
  appUrl: string
}

type BoardPackReadyEmailInput = {
  companyName: string
  cycleLabel: string
  appUrl: string
}

type SessionClosedEmailInput = {
  companyName: string
  decisionCount: number
  followUpCount: number
  appUrl: string
}

type ReferralRequestEmailInput = {
  companyName: string
  requestedBy: string
  recommendationContext: string
  appUrl: string
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function renderProductEmail({
  eyebrow = 'Board Governance OS',
  title,
  intro,
  detail,
  highlight,
  ctaLabel,
  ctaHref,
}: ProductEmailInput) {
  const safeTitle = escapeHtml(title)
  const safeIntro = escapeHtml(intro)
  const safeDetail = detail ? escapeHtml(detail) : ''
  const safeHighlight = highlight ? escapeHtml(highlight) : ''
  const safeCtaLabel = escapeHtml(ctaLabel)
  const safeCtaHref = escapeHtml(ctaHref)

  const text = [
    title,
    '',
    intro,
    detail,
    highlight,
    '',
    `${ctaLabel}: ${ctaHref}`,
  ].filter(Boolean).join('\n')

  const html = `
    <div style="margin:0;padding:32px;background:#eee9df;color:#1f1d1a;font-family:Arial,sans-serif;line-height:1.5">
      <div style="max-width:620px;margin:0 auto;background:#fbfaf7;border:1px solid #ddd4c5;padding:28px">
        <p style="margin:0 0 14px;color:#a67c2d;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase">${escapeHtml(eyebrow)}</p>
        <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:28px;line-height:1.1;color:#1f1d1a">${safeTitle}</h1>
        <p style="margin:0 0 14px;font-size:15px;color:#5f5a52">${safeIntro}</p>
        ${safeDetail ? `<p style="margin:0 0 14px;font-size:15px;color:#5f5a52">${safeDetail}</p>` : ''}
        ${safeHighlight ? `<p style="margin:20px 0;padding:14px 16px;background:#f3eadb;border-left:4px solid #d0a84e;color:#302c27"><strong>${safeHighlight}</strong></p>` : ''}
        <p style="margin:24px 0 0">
          <a href="${safeCtaHref}" style="display:inline-block;background:#d0a84e;color:#1f1d1a;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:6px">${safeCtaLabel}</a>
        </p>
      </div>
    </div>
  `

  return { text, html }
}

export function renderReminderEmail({ title, detail, due, appUrl }: ReminderEmailInput) {
  const subject = `Board Governance OS: ${title}`
  const { text, html } = renderProductEmail({
    title,
    intro: detail,
    highlight: due,
    ctaLabel: 'Abrir follow-ups',
    ctaHref: `${appUrl}/follow-ups`,
  })

  return { subject, text, html }
}

export function renderBoardPackReadyEmail({ companyName, cycleLabel, appUrl }: BoardPackReadyEmailInput) {
  const subject = `Board pack pronto: ${companyName}`
  const { text, html } = renderProductEmail({
    title: `Board pack pronto para ${companyName}`,
    intro: `O board pack de ${cycleLabel} foi preparado para revisao executiva.`,
    detail: 'Revise sumario executivo, perguntas estrategicas, mapa de riscos, prioridades e leituras dos agentes antes da sessao.',
    ctaLabel: 'Abrir board pack',
    ctaHref: `${appUrl}/board-pack`,
  })

  return { subject, text, html }
}

export function renderSessionClosedEmail({ companyName, decisionCount, followUpCount, appUrl }: SessionClosedEmailInput) {
  const subject = `Sessao encerrada: ${companyName}`
  const { text, html } = renderProductEmail({
    title: `Sessao registrada para ${companyName}`,
    intro: `A sessao foi encerrada com ${decisionCount} decisoes e ${followUpCount} follow-ups registrados na memoria de governanca.`,
    detail: 'As proximas revisoes devem considerar esse historico antes de sugerir novas decisoes.',
    ctaLabel: 'Abrir memoria de decisoes',
    ctaHref: `${appUrl}/decisions`,
  })

  return { subject, text, html }
}

export function renderReferralRequestEmail({ companyName, requestedBy, recommendationContext, appUrl }: ReferralRequestEmailInput) {
  const subject = `Nova solicitacao de conexao: ${companyName}`
  const { text, html } = renderProductEmail({
    title: `Solicitacao de conexao para ${companyName}`,
    intro: `${requestedBy} pediu apoio para encontrar um parceiro, fornecedor ou advisor recomendado pelo board.`,
    detail: recommendationContext,
    ctaLabel: 'Abrir triagem de referrals',
    ctaHref: `${appUrl}/admin/referrals`,
  })

  return { subject, text, html }
}
