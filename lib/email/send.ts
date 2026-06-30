import 'server-only'

export type ProductEmail = {
  to: string | string[]
  subject: string
  text: string
  html: string
}

function recipients(value: string | string[]) {
  return Array.isArray(value)
    ? value.map((item) => item.trim()).filter(Boolean)
    : [value.trim()].filter(Boolean)
}

export function configuredAdminEmailRecipients() {
  return [
    process.env.BOARD_GOVERNANCE_ADMIN_EMAILS,
    process.env.ADMIN_EMAILS,
  ]
    .filter(Boolean)
    .join(',')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean)
}

export async function sendProductEmail({ to, subject, text, html }: ProductEmail) {
  const apiKey = process.env.RESEND_API_KEY
  const targetRecipients = recipients(to)

  if (!apiKey || !targetRecipients.length) {
    return {
      skipped: true,
      reason: !apiKey ? 'missing_resend_api_key' : 'missing_recipient',
    }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'Board Governance OS <mail@board-os.ai>',
      to: targetRecipients,
      subject,
      text,
      html,
    }),
  })

  if (!response.ok) throw new Error(await response.text())
  return response.json()
}
