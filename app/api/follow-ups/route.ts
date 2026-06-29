import { NextResponse } from 'next/server'
import { getSessionUser, serviceClient } from '@/lib/auth-server'
import { getCurrentCompanyForUser } from '@/lib/shadow-board/current-company-server'

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const company = await getCurrentCompanyForUser(user)
    if (!company) {
      return NextResponse.json({ company: null, follow_ups: [] })
    }

    const service = serviceClient()
    const { data, error } = await service
      .from('follow_ups')
      .select('id, title, action, description, status, priority, due_date, completed_at, owner_label, owner, source_agent_key, decision_id, created_at, updated_at')
      .eq('company_id', company.id)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(150)

    if (error) throw new Error(error.message)

    const followUps = data ?? []
    const followUpIds = followUps.map((item) => item.id)
    const { data: reminders, error: remindersError } = followUpIds.length
      ? await service
        .from('reminders')
        .select('id, follow_up_id, remind_at, channel, status')
        .in('follow_up_id', followUpIds)
        .eq('status', 'scheduled')
        .order('remind_at', { ascending: true })
      : { data: [], error: null }

    if (remindersError) throw new Error(remindersError.message)

    const remindersByFollowUp = new Map<string, Array<{ remind_at: string; channel: string }>>()
    for (const reminder of reminders ?? []) {
      const list = remindersByFollowUp.get(reminder.follow_up_id) ?? []
      list.push({ remind_at: reminder.remind_at, channel: reminder.channel })
      remindersByFollowUp.set(reminder.follow_up_id, list)
    }

    return NextResponse.json({
      company,
      follow_ups: followUps.map((item) => {
        const scheduledReminders = remindersByFollowUp.get(item.id) ?? []
        return {
          ...item,
          next_reminder_at: scheduledReminders[0]?.remind_at ?? null,
          next_reminder_channel: scheduledReminders[0]?.channel ?? null,
          scheduled_reminders_count: scheduledReminders.length,
        }
      }),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load follow-ups' },
      { status: 500 }
    )
  }
}
