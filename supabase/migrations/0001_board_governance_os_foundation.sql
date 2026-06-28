-- Board Governance OS foundation schema
-- Sprint 1: core domain model, membership model, governance cycle backbone, and RLS draft.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text,
  full_name text,
  avatar_url text,
  locale text not null default 'pt-BR' check (locale in ('pt-BR', 'en', 'es')),
  timezone text not null default 'America/Sao_Paulo',
  is_super_admin boolean not null default false,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived'))
);

create table if not exists public.partner_channels (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid,
  name text not null,
  slug text not null unique,
  type text not null default 'distribution_partner' check (type in ('distribution_partner', 'white_label', 'referral', 'internal')),
  contact_name text,
  contact_email text,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  white_label_settings jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  slug text not null unique,
  public_product_name text not null default 'Board Governance OS',
  default_locale text not null default 'pt-BR' check (default_locale in ('pt-BR', 'en', 'es')),
  owner_user_id uuid references public.user_profiles(id) on delete set null,
  partner_channel_id uuid references public.partner_channels(id) on delete set null,
  stripe_customer_id text,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  metadata jsonb not null default '{}'::jsonb
);

alter table public.partner_channels
  add constraint partner_channels_organization_id_fkey
  foreign key (organization_id) references public.organizations(id) on delete set null;

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member', 'advisor_operator', 'partner_admin', 'super_admin')),
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  invited_by uuid references public.user_profiles(id) on delete set null,
  invited_at timestamptz,
  accepted_at timestamptz,
  unique (organization_id, user_id)
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  partner_channel_id uuid references public.partner_channels(id) on delete set null,
  name text not null,
  slug text not null,
  industry text,
  business_model text,
  revenue_range text,
  employee_count integer,
  stage text,
  jurisdiction text,
  default_locale text not null default 'pt-BR' check (default_locale in ('pt-BR', 'en', 'es')),
  goals text,
  main_challenge text,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  unique (organization_id, slug)
);

create table if not exists public.company_memberships (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  role text not null check (role in ('founder', 'admin', 'member', 'viewer', 'advisor_operator')),
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  unique (company_id, user_id)
);

create table if not exists public.uploaded_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  uploaded_by uuid references public.user_profiles(id) on delete set null,
  storage_bucket text not null default 'company-documents',
  storage_path text not null,
  original_filename text not null,
  mime_type text,
  file_ext text,
  file_size_bytes bigint,
  document_type text,
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'processed', 'failed', 'archived')),
  summary text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.document_extractions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  document_id uuid not null references public.uploaded_documents(id) on delete cascade,
  extraction_type text not null check (extraction_type in ('text', 'table', 'financials', 'deck', 'summary', 'memory')),
  content text,
  structured_data jsonb not null default '{}'::jsonb,
  confidence_score integer check (confidence_score between 0 and 100),
  source_locations jsonb not null default '{}'::jsonb,
  status text not null default 'processed' check (status in ('uploaded', 'processing', 'processed', 'failed', 'archived'))
);

create table if not exists public.company_brain_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  source_document_id uuid references public.uploaded_documents(id) on delete set null,
  created_by uuid references public.user_profiles(id) on delete set null,
  category text not null check (category in ('fact', 'goal', 'financial', 'risk', 'team', 'decision', 'plan', 'question', 'customer', 'operations')),
  source_type text not null check (source_type in ('chat', 'voice', 'form', 'file', 'admin_note')),
  title text not null,
  content text not null,
  confidence_score integer check (confidence_score between 0 and 100),
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.governance_cycles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  cycle_type text not null default 'ad_hoc' check (cycle_type in ('diagnostic', 'monthly', 'fortnightly', 'quarterly', 'ad_hoc')),
  period_start date,
  period_end date,
  status text not null default 'draft' check (status in ('draft', 'intake', 'planning', 'board_pack', 'review', 'meeting', 'decision', 'follow_up', 'closed', 'archived')),
  data_quality_score integer check (data_quality_score between 0 and 100),
  current_stage text not null default 'draft' check (current_stage in ('draft', 'intake', 'planning', 'board_pack', 'review', 'meeting', 'decision', 'follow_up', 'closed', 'archived')),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.governance_inputs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  governance_cycle_id uuid not null references public.governance_cycles(id) on delete cascade,
  source_document_id uuid references public.uploaded_documents(id) on delete set null,
  created_by uuid references public.user_profiles(id) on delete set null,
  mode text not null check (mode in ('chat', 'voice', 'form', 'file', 'admin_note')),
  prompt text,
  content text not null,
  structured_data jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.business_plans (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  governance_cycle_id uuid not null references public.governance_cycles(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'ready_for_review', 'approved', 'superseded', 'archived')),
  diagnosis text,
  priorities jsonb not null default '[]'::jsonb,
  kpis jsonb not null default '[]'::jsonb,
  workstreams jsonb not null default '[]'::jsonb,
  timeline jsonb not null default '{}'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  assumptions jsonb not null default '[]'::jsonb,
  completeness_score integer check (completeness_score between 0 and 100),
  quality_score integer check (quality_score between 0 and 100),
  approved_by uuid references public.user_profiles(id) on delete set null,
  approved_at timestamptz
);

create table if not exists public.board_packs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  governance_cycle_id uuid not null references public.governance_cycles(id) on delete cascade,
  business_plan_id uuid references public.business_plans(id) on delete set null,
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft', 'ready', 'sent_to_review', 'archived')),
  executive_summary text,
  strategic_questions jsonb not null default '[]'::jsonb,
  risk_map jsonb not null default '[]'::jsonb,
  priority_ranking jsonb not null default '[]'::jsonb,
  meeting_agenda jsonb not null default '[]'::jsonb,
  decision_candidates jsonb not null default '[]'::jsonb,
  export_payload jsonb not null default '{}'::jsonb
);

create table if not exists public.board_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  governance_cycle_id uuid not null references public.governance_cycles(id) on delete cascade,
  board_pack_id uuid references public.board_packs(id) on delete set null,
  started_by uuid references public.user_profiles(id) on delete set null,
  session_type text not null default 'virtual_review' check (session_type in ('diagnostic', 'virtual_review', 'admin_session', 'live_facilitated')),
  status text not null default 'draft' check (status in ('draft', 'open', 'in_review', 'awaiting_founder', 'closed', 'expired', 'cancelled')),
  opened_at timestamptz,
  expires_at timestamptz,
  closed_at timestamptz,
  closure_recommendation text check (closure_recommendation in ('commit', 'commit_with_conditions', 'defer', 'reject', 'request_more_data', 'escalate_human_review')),
  closure_summary text,
  usage_units_consumed integer not null default 0,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.agent_reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  governance_cycle_id uuid not null references public.governance_cycles(id) on delete cascade,
  board_pack_id uuid not null references public.board_packs(id) on delete cascade,
  board_session_id uuid references public.board_sessions(id) on delete set null,
  advisor_key text not null check (advisor_key in ('board_brain', 'finance', 'operator', 'growth', 'risk', 'customer', 'talent')),
  advisor_name text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'complete', 'failed')),
  stance text check (stance in ('support', 'support_with_conditions', 'neutral', 'oppose', 'needs_more_data')),
  risk_score integer check (risk_score between 0 and 100),
  confidence_score integer check (confidence_score between 0 and 100),
  perspective text,
  strategic_questions jsonb not null default '[]'::jsonb,
  source_references jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  closure_recommendation text check (closure_recommendation in ('commit', 'commit_with_conditions', 'defer', 'reject', 'request_more_data', 'escalate_human_review')),
  raw_output jsonb not null default '{}'::jsonb
);

create table if not exists public.agent_conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  governance_cycle_id uuid not null references public.governance_cycles(id) on delete cascade,
  board_session_id uuid references public.board_sessions(id) on delete set null,
  from_advisor_key text not null check (from_advisor_key in ('board_brain', 'finance', 'operator', 'growth', 'risk', 'customer', 'talent')),
  to_advisor_key text not null check (to_advisor_key in ('board_brain', 'finance', 'operator', 'growth', 'risk', 'customer', 'talent')),
  relationship text not null check (relationship in ('agreement', 'opposition', 'neutrality')),
  transcript jsonb not null default '[]'::jsonb,
  summary text,
  conflicts jsonb not null default '[]'::jsonb,
  agreements jsonb not null default '[]'::jsonb
);

create table if not exists public.board_meetings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  governance_cycle_id uuid not null references public.governance_cycles(id) on delete cascade,
  board_session_id uuid references public.board_sessions(id) on delete set null,
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled', 'running', 'complete', 'cancelled')),
  agenda jsonb not null default '[]'::jsonb,
  attendees jsonb not null default '[]'::jsonb,
  orchestrator_summary text
);

create table if not exists public.meeting_minutes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  governance_cycle_id uuid not null references public.governance_cycles(id) on delete cascade,
  board_meeting_id uuid references public.board_meetings(id) on delete set null,
  board_session_id uuid references public.board_sessions(id) on delete set null,
  minutes text,
  decisions_presented jsonb not null default '[]'::jsonb,
  conflicts_identified jsonb not null default '[]'::jsonb,
  final_recommendation text,
  closure_recommendation text check (closure_recommendation in ('commit', 'commit_with_conditions', 'defer', 'reject', 'request_more_data', 'escalate_human_review'))
);

create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  governance_cycle_id uuid references public.governance_cycles(id) on delete set null,
  board_session_id uuid references public.board_sessions(id) on delete set null,
  meeting_minutes_id uuid references public.meeting_minutes(id) on delete set null,
  created_by uuid references public.user_profiles(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  title text not null default '',
  decision text,
  status text not null default 'candidate' check (status in ('candidate', 'approved', 'rejected', 'deferred', 'superseded', 'review_due', 'closed', 'open', 'reviewing', 'reversed')),
  closure_recommendation text check (closure_recommendation in ('commit', 'commit_with_conditions', 'defer', 'reject', 'request_more_data', 'escalate_human_review')),
  rationale text,
  risks text,
  expected_outcome text,
  tradeoffs jsonb not null default '[]'::jsonb,
  risk_level text check (risk_level in ('low', 'medium', 'high', 'critical')),
  confidence_score integer check (confidence_score between 0 and 100),
  conditions jsonb not null default '[]'::jsonb,
  owner_user_id uuid references public.user_profiles(id) on delete set null,
  owner_label text,
  owner text,
  review_date date,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.decision_dependencies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  decision_id uuid not null references public.decisions(id) on delete cascade,
  depends_on_decision_id uuid not null references public.decisions(id) on delete cascade,
  relationship text not null default 'depends_on',
  unique (decision_id, depends_on_decision_id)
);

create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  governance_cycle_id uuid references public.governance_cycles(id) on delete set null,
  decision_id uuid references public.decisions(id) on delete set null,
  source_agent_key text check (source_agent_key in ('board_brain', 'finance', 'operator', 'growth', 'risk', 'customer', 'talent')),
  user_id uuid references auth.users(id) on delete set null,
  owner_user_id uuid references public.user_profiles(id) on delete set null,
  owner_label text,
  owner text,
  title text not null default '',
  action text,
  description text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'done', 'blocked', 'cancelled')),
  due_date date,
  completed_at timestamptz
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  follow_up_id uuid references public.follow_ups(id) on delete cascade,
  decision_id uuid references public.decisions(id) on delete cascade,
  recipient_user_id uuid references public.user_profiles(id) on delete set null,
  channel text not null default 'email' check (channel in ('in_app', 'email', 'calendar')),
  remind_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'sent', 'failed', 'cancelled')),
  last_error text
);

create table if not exists public.referral_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  governance_cycle_id uuid references public.governance_cycles(id) on delete set null,
  follow_up_id uuid references public.follow_ups(id) on delete set null,
  partner_channel_id uuid references public.partner_channels(id) on delete set null,
  recommended_by_agent_key text check (recommended_by_agent_key in ('board_brain', 'finance', 'operator', 'growth', 'risk', 'customer', 'talent')),
  requested_by uuid references public.user_profiles(id) on delete set null,
  context_summary text not null,
  status text not null default 'requested' check (status in ('requested', 'triaging', 'introduced', 'closed', 'cancelled')),
  fulfilled_by uuid references public.user_profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.export_artifacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  governance_cycle_id uuid references public.governance_cycles(id) on delete set null,
  board_pack_id uuid references public.board_packs(id) on delete set null,
  meeting_minutes_id uuid references public.meeting_minutes(id) on delete set null,
  export_type text not null check (export_type in ('html', 'pdf', 'pptx', 'docx', 'xlsx', 'csv')),
  status text not null default 'queued' check (status in ('queued', 'processing', 'ready', 'failed', 'expired')),
  storage_bucket text,
  storage_path text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  plan_code text not null check (plan_code in ('free_diagnostic', 'monthly_cycle', 'fortnightly_cycle', 'quarterly_cycle', 'extra_session_pack', 'live_add_on')),
  status text not null default 'incomplete' check (status in ('trialing', 'active', 'past_due', 'cancelled', 'unpaid', 'incomplete')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.usage_packages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  stripe_price_id text,
  package_code text not null,
  sessions_included integer not null default 0,
  sessions_used integer not null default 0,
  deep_dives_included integer not null default 0,
  deep_dives_used integer not null default 0,
  status text not null default 'active' check (status in ('active', 'exhausted', 'expired', 'cancelled')),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  organization_id uuid references public.organizations(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  actor_user_id uuid references public.user_profiles(id) on delete set null,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb
);

-- Compatibility tables for the current MVP API route. These should be retired once
-- governance_cycles/business_plans/board_packs are wired end to end.
create table if not exists public.governance_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  period text not null,
  input_data jsonb not null default '{}'::jsonb,
  raw_output jsonb not null default '{}'::jsonb,
  model_provider text,
  model_name text,
  risk_score integer,
  confidence_score integer,
  executive_summary text,
  board_pack jsonb,
  strategic_questions jsonb,
  risk_map jsonb,
  priority_ranking jsonb,
  governance_score jsonb,
  meeting_agenda jsonb,
  follow_up_tracker jsonb,
  status text default 'complete' check (status in ('draft', 'complete', 'archived'))
);

create table if not exists public.persona_reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  governance_run_id uuid references public.governance_runs(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  persona text not null,
  focus_area text,
  stance text,
  risk_score integer,
  confidence_score integer,
  assessment text,
  questions jsonb,
  risks jsonb,
  recommendations jsonb
);

create or replace function public.current_user_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = auth.uid()
      and is_super_admin = true
      and status = 'active'
  );
$$;

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_super_admin()
    or exists (
      select 1
      from public.organization_memberships
      where organization_id = target_organization_id
        and user_id = auth.uid()
        and status = 'active'
    );
$$;

create or replace function public.is_org_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_super_admin()
    or exists (
      select 1
      from public.organization_memberships
      where organization_id = target_organization_id
        and user_id = auth.uid()
        and status = 'active'
        and role in ('owner', 'admin', 'super_admin')
    );
$$;

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_super_admin()
    or exists (
      select 1
      from public.company_memberships
      where company_id = target_company_id
        and user_id = auth.uid()
        and status = 'active'
    )
    or exists (
      select 1
      from public.companies c
      join public.organization_memberships om on om.organization_id = c.organization_id
      where c.id = target_company_id
        and om.user_id = auth.uid()
        and om.status = 'active'
        and om.role in ('owner', 'admin', 'advisor_operator', 'super_admin')
    );
$$;

create or replace function public.is_company_admin(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_super_admin()
    or exists (
      select 1
      from public.company_memberships
      where company_id = target_company_id
        and user_id = auth.uid()
        and status = 'active'
        and role in ('founder', 'admin', 'advisor_operator')
    )
    or exists (
      select 1
      from public.companies c
      join public.organization_memberships om on om.organization_id = c.organization_id
      where c.id = target_company_id
        and om.user_id = auth.uid()
        and om.status = 'active'
        and om.role in ('owner', 'admin', 'super_admin')
    );
$$;

create or replace function public.org_id_for_company(target_company_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.companies where id = target_company_id;
$$;

create or replace function public.set_organization_id_from_company()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.organization_id is null and new.company_id is not null then
    select organization_id
    into new.organization_id
    from public.companies
    where id = new.company_id;
  end if;

  return new;
end;
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'user_profiles',
    'partner_channels',
    'organizations',
    'organization_memberships',
    'companies',
    'company_memberships',
    'uploaded_documents',
    'document_extractions',
    'company_brain_entries',
    'governance_cycles',
    'governance_inputs',
    'business_plans',
    'board_packs',
    'board_sessions',
    'agent_reviews',
    'agent_conversations',
    'board_meetings',
    'meeting_minutes',
    'decisions',
    'decision_dependencies',
    'follow_ups',
    'reminders',
    'referral_requests',
    'export_artifacts',
    'subscriptions',
    'usage_packages',
    'governance_runs',
    'persona_reviews'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', target_table, target_table);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', target_table, target_table);
  end loop;
end $$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'uploaded_documents',
    'document_extractions',
    'company_brain_entries',
    'governance_cycles',
    'governance_inputs',
    'business_plans',
    'board_packs',
    'board_sessions',
    'agent_reviews',
    'agent_conversations',
    'board_meetings',
    'meeting_minutes',
    'decisions',
    'decision_dependencies',
    'follow_ups',
    'reminders',
    'referral_requests',
    'export_artifacts'
  ]
  loop
    execute format('drop trigger if exists set_%I_organization_id on public.%I', target_table, target_table);
    execute format('create trigger set_%I_organization_id before insert or update on public.%I for each row execute function public.set_organization_id_from_company()', target_table, target_table);
  end loop;
end $$;

alter table public.user_profiles enable row level security;
alter table public.partner_channels enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.companies enable row level security;
alter table public.company_memberships enable row level security;
alter table public.uploaded_documents enable row level security;
alter table public.document_extractions enable row level security;
alter table public.company_brain_entries enable row level security;
alter table public.governance_cycles enable row level security;
alter table public.governance_inputs enable row level security;
alter table public.business_plans enable row level security;
alter table public.board_packs enable row level security;
alter table public.board_sessions enable row level security;
alter table public.agent_reviews enable row level security;
alter table public.agent_conversations enable row level security;
alter table public.board_meetings enable row level security;
alter table public.meeting_minutes enable row level security;
alter table public.decisions enable row level security;
alter table public.decision_dependencies enable row level security;
alter table public.follow_ups enable row level security;
alter table public.reminders enable row level security;
alter table public.referral_requests enable row level security;
alter table public.export_artifacts enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_packages enable row level security;
alter table public.audit_events enable row level security;
alter table public.governance_runs enable row level security;
alter table public.persona_reviews enable row level security;

create policy "Users can read own profile" on public.user_profiles
  for select using (id = auth.uid() or public.current_user_is_super_admin());
create policy "Users can update own profile" on public.user_profiles
  for update using (id = auth.uid() or public.current_user_is_super_admin())
  with check (id = auth.uid() or public.current_user_is_super_admin());

create policy "Org members can read organizations" on public.organizations
  for select using (public.is_org_member(id));
create policy "Org admins can manage organizations" on public.organizations
  for all using (public.is_org_admin(id)) with check (public.is_org_admin(id));

create policy "Org members can read memberships" on public.organization_memberships
  for select using (public.is_org_member(organization_id));
create policy "Org admins can manage memberships" on public.organization_memberships
  for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "Org members can read partner channels" on public.partner_channels
  for select using (organization_id is null or public.is_org_member(organization_id));
create policy "Org admins can manage partner channels" on public.partner_channels
  for all using (organization_id is null or public.is_org_admin(organization_id))
  with check (organization_id is null or public.is_org_admin(organization_id));

create policy "Company members can read companies" on public.companies
  for select using (public.is_company_member(id) or public.is_org_member(organization_id));
create policy "Org admins can manage companies" on public.companies
  for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "Company members can read company memberships" on public.company_memberships
  for select using (public.is_company_member(company_id));
create policy "Company admins can manage company memberships" on public.company_memberships
  for all using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

create policy "Company members can read uploaded documents" on public.uploaded_documents
  for select using (public.is_company_member(company_id));
create policy "Company admins can manage uploaded documents" on public.uploaded_documents
  for all using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

create policy "Company members can read document extractions" on public.document_extractions
  for select using (public.is_company_member(company_id));
create policy "Company admins can manage document extractions" on public.document_extractions
  for all using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

create policy "Company members can read brain entries" on public.company_brain_entries
  for select using (public.is_company_member(company_id));
create policy "Company admins can manage brain entries" on public.company_brain_entries
  for all using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

create policy "Company members can read governance cycles" on public.governance_cycles
  for select using (public.is_company_member(company_id));
create policy "Company admins can manage governance cycles" on public.governance_cycles
  for all using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

create policy "Company members can read governance inputs" on public.governance_inputs
  for select using (public.is_company_member(company_id));
create policy "Company admins can manage governance inputs" on public.governance_inputs
  for all using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

create policy "Company members can read business plans" on public.business_plans
  for select using (public.is_company_member(company_id));
create policy "Company admins can manage business plans" on public.business_plans
  for all using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

create policy "Company members can read board packs" on public.board_packs
  for select using (public.is_company_member(company_id));
create policy "Company admins can manage board packs" on public.board_packs
  for all using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

create policy "Company members can read board sessions" on public.board_sessions
  for select using (public.is_company_member(company_id));
create policy "Company admins can manage board sessions" on public.board_sessions
  for all using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

create policy "Company members can read agent reviews" on public.agent_reviews
  for select using (public.is_company_member(company_id));
create policy "Company admins can manage agent reviews" on public.agent_reviews
  for all using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

create policy "Company members can read agent conversations" on public.agent_conversations
  for select using (public.is_company_member(company_id));
create policy "Company admins can manage agent conversations" on public.agent_conversations
  for all using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

create policy "Company members can read meetings" on public.board_meetings
  for select using (public.is_company_member(company_id));
create policy "Company admins can manage meetings" on public.board_meetings
  for all using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

create policy "Company members can read minutes" on public.meeting_minutes
  for select using (public.is_company_member(company_id));
create policy "Company admins can manage minutes" on public.meeting_minutes
  for all using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

create policy "Company members can read decisions" on public.decisions
  for select using (public.is_company_member(company_id));
create policy "Company admins can manage decisions" on public.decisions
  for all using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

create policy "Company members can read decision dependencies" on public.decision_dependencies
  for select using (public.is_company_member(company_id));
create policy "Company admins can manage decision dependencies" on public.decision_dependencies
  for all using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

create policy "Company members can read follow ups" on public.follow_ups
  for select using (public.is_company_member(company_id));
create policy "Company admins can manage follow ups" on public.follow_ups
  for all using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

create policy "Company members can read reminders" on public.reminders
  for select using (public.is_company_member(company_id));
create policy "Company admins can manage reminders" on public.reminders
  for all using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

create policy "Company members can read referrals" on public.referral_requests
  for select using (public.is_company_member(company_id));
create policy "Company admins can manage referrals" on public.referral_requests
  for all using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

create policy "Company members can read exports" on public.export_artifacts
  for select using (public.is_company_member(company_id));
create policy "Company admins can manage exports" on public.export_artifacts
  for all using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

create policy "Org admins can read subscriptions" on public.subscriptions
  for select using (public.is_org_admin(organization_id));
create policy "Org admins can manage subscriptions" on public.subscriptions
  for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "Org admins can read usage packages" on public.usage_packages
  for select using (public.is_org_admin(organization_id));
create policy "Org admins can manage usage packages" on public.usage_packages
  for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "Org members can read audit events" on public.audit_events
  for select using (organization_id is not null and public.is_org_member(organization_id));

create policy "Company members can read governance runs" on public.governance_runs
  for select using (public.is_company_member(company_id));
create policy "Company admins can manage governance runs" on public.governance_runs
  for all using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

create policy "Company members can read persona reviews" on public.persona_reviews
  for select using (public.is_company_member(company_id));
create policy "Company admins can manage persona reviews" on public.persona_reviews
  for all using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

create index if not exists organization_memberships_org_idx on public.organization_memberships(organization_id);
create index if not exists organization_memberships_user_idx on public.organization_memberships(user_id);
create index if not exists companies_org_idx on public.companies(organization_id);
create index if not exists companies_partner_channel_idx on public.companies(partner_channel_id);
create index if not exists company_memberships_company_idx on public.company_memberships(company_id);
create index if not exists company_memberships_user_idx on public.company_memberships(user_id);
create index if not exists uploaded_documents_company_idx on public.uploaded_documents(company_id);
create index if not exists document_extractions_document_idx on public.document_extractions(document_id);
create index if not exists company_brain_entries_company_idx on public.company_brain_entries(company_id);
create index if not exists company_brain_entries_category_idx on public.company_brain_entries(company_id, category);
create index if not exists governance_cycles_company_status_idx on public.governance_cycles(company_id, status);
create index if not exists governance_inputs_cycle_idx on public.governance_inputs(governance_cycle_id);
create index if not exists business_plans_cycle_idx on public.business_plans(governance_cycle_id);
create index if not exists board_packs_cycle_idx on public.board_packs(governance_cycle_id);
create index if not exists board_sessions_cycle_idx on public.board_sessions(governance_cycle_id);
create index if not exists agent_reviews_pack_idx on public.agent_reviews(board_pack_id);
create index if not exists agent_reviews_session_idx on public.agent_reviews(board_session_id);
create index if not exists agent_conversations_session_idx on public.agent_conversations(board_session_id);
create index if not exists board_meetings_cycle_idx on public.board_meetings(governance_cycle_id);
create index if not exists meeting_minutes_cycle_idx on public.meeting_minutes(governance_cycle_id);
create index if not exists decisions_company_status_idx on public.decisions(company_id, status);
create index if not exists decisions_review_date_idx on public.decisions(review_date);
create index if not exists follow_ups_company_status_idx on public.follow_ups(company_id, status);
create index if not exists follow_ups_due_date_idx on public.follow_ups(due_date);
create index if not exists reminders_remind_at_idx on public.reminders(remind_at, status);
create index if not exists export_artifacts_company_idx on public.export_artifacts(company_id, export_type, status);
create index if not exists subscriptions_org_idx on public.subscriptions(organization_id);
create index if not exists usage_packages_org_idx on public.usage_packages(organization_id);
create index if not exists governance_runs_company_idx on public.governance_runs(company_id);
create index if not exists persona_reviews_run_idx on public.persona_reviews(governance_run_id);

create or replace view public.company_dashboard_rollup as
select
  c.organization_id,
  c.id as company_id,
  c.name as company_name,
  count(distinct gc.id) as total_cycles,
  max(gc.updated_at) as latest_cycle_at,
  avg(gc.data_quality_score)::int as avg_data_quality_score,
  count(distinct d.id) filter (where d.status in ('candidate', 'approved', 'deferred', 'review_due')) as open_decisions,
  count(distinct f.id) filter (where f.status in ('open', 'in_progress', 'blocked')) as open_follow_ups,
  count(distinct f.id) filter (
    where f.status in ('open', 'in_progress', 'blocked')
      and f.due_date is not null
      and f.due_date < current_date
  ) as overdue_follow_ups,
  count(distinct bs.id) filter (where bs.status in ('open', 'in_review', 'awaiting_founder')) as open_board_sessions
from public.companies c
left join public.governance_cycles gc on gc.company_id = c.id
left join public.decisions d on d.company_id = c.id
left join public.follow_ups f on f.company_id = c.id
left join public.board_sessions bs on bs.company_id = c.id
group by c.organization_id, c.id, c.name;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'company-documents',
    'company-documents',
    false,
    52428800,
    array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'text/plain'
    ]
  ),
  (
    'board-exports',
    'board-exports',
    false,
    52428800,
    array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'text/html'
    ]
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
