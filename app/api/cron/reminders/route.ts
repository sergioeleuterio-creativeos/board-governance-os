import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/auth-server'
import { renderReminderEmail } from '@/lib/email/templates'

type ReminderRow = {
  id: string
  organization_id: string
  company_id: string
  follow_up_id: string | null
  decision_id: string | null
  recipient_user_id: string | null
  channel: string
  remind_at: string
  follow_ups?: RelationRow<{
    title: string | null
    action: string | null
    description: string | null
    due_date: string | null
  }>
  decisions?: RelationRow<{
    title: string | null
  }>
}

type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
}

type RelationRow<T> = T | T[] | null

function firstRelation<T>(value: RelationRow<T> | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = request.headers.get('authorization') ?? ''
  return header === `Bearer ${secret}`
}

function textForReminder(reminder: ReminderRow) {
  const followUp = firstRelation(reminder.follow_ups)
  const decision = firstRelation(reminder.decisions)
  const title = followUp?.action || followUp?.title || decision?.title || 'Follow-up de governanca'
  const detail = followUp?.description || 'Ha um follow-up de governanca aguardando revisao.'
  const due = followUp?.due_date ? `Prazo: ${followUp.due_date}` : `Lembrete: ${new Date(reminder.remind_at).toLocaleString('pt-BR')}`

  return { title, detail, due }
}

async function sendResendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string
  subject: string
  text: string
  html: string
}) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'Board Governance OS <mail@board-os.ai>',
      to: [to],
      subject,
      text,
      html,
    }),
  })

  if (!response.ok) throw new Error(await response.text())
  return response.json()
}

async function handleReminders(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY is not configured' }, { status: 503 })
  }

  const service = serviceClient()
  const now = new Date().toISOString()
  const { data, error } = await service
    .from('reminders')
    .select(`
      id,
      organization_id,
      company_id,
      follow_up_id,
      decision_id,
      recipient_user_id,
      channel,
      remind_at,
      follow_ups(title, action, description, due_date),
      decisions(title)
    `)
    .eq('status', 'scheduled')
    .lte('remind_at', now)
    .order('remind_at', { ascending: true })
    .limit(25)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const reminders = (data ?? []) as unknown as ReminderRow[]
  const recipientIds = [...new Set(reminders.map((reminder) => reminder.recipient_user_id).filter(Boolean))] as string[]
  const { data: profiles, error: profilesError } = recipientIds.length
    ? await service
      .from('user_profiles')
      .select('id, email, full_name')
      .in('id', recipientIds)
    : { data: [], error: null }

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 })
  }

  const profilesById = new Map(((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]))
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.board-os.ai'
  const results: Array<{ id: string; status: string; error?: string }> = []

  for (const reminder of reminders) {
    const profile = reminder.recipient_user_id ? profilesById.get(reminder.recipient_user_id) : null

    try {
      if (!profile?.email) throw new Error('recipient_email_missing')
      if (reminder.channel !== 'email') throw new Error(`unsupported_channel:${reminder.channel}`)

      const content = textForReminder(reminder)
      const { subject, text, html } = renderReminderEmail({
        title: content.title,
        detail: content.detail,
        due: content.due,
        appUrl,
      })

      await sendResendEmail({ to: profile.email, subject, text, html })

      await service
        .from('reminders')
        .update({ status: 'sent', last_error: null })
        .eq('id', reminder.id)

      await service.from('audit_events').insert({
        organization_id: reminder.organization_id,
        company_id: reminder.company_id,
        actor_user_id: null,
        event_type: 'reminder.sent',
        entity_type: 'reminder',
        entity_id: reminder.id,
        metadata: {
          channel: reminder.channel,
          recipient_user_id: reminder.recipient_user_id,
          follow_up_id: reminder.follow_up_id,
          decision_id: reminder.decision_id,
        },
      })

      results.push({ id: reminder.id, status: 'sent' })
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : 'send_failed'
      await service
        .from('reminders')
        .update({ status: 'failed', last_error: message })
        .eq('id', reminder.id)

      results.push({ id: reminder.id, status: 'failed', error: message })
    }
  }

  return NextResponse.json({
    processed: reminders.length,
    sent: results.filter((result) => result.status === 'sent').length,
    failed: results.filter((result) => result.status === 'failed').length,
    results,
  })
}

export async function GET(request: NextRequest) {
  return handleReminders(request)
}

export async function POST(request: NextRequest) {
  return handleReminders(request)
}
