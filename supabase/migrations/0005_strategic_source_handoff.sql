-- Sprint 5: immutable strategic source documents and explicit Creative OS handoffs.

begin;

create table if not exists public.strategic_source_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  governance_cycle_id uuid references public.governance_cycles(id) on delete set null,
  business_plan_id uuid references public.business_plans(id) on delete set null,
  board_pack_id uuid not null references public.board_packs(id) on delete restrict,
  board_session_id uuid not null references public.board_sessions(id) on delete restrict,
  meeting_minutes_id uuid references public.meeting_minutes(id) on delete set null,
  version integer not null default 1 check (version > 0),
  title text not null,
  status text not null default 'ready' check (status in ('ready', 'handed_off', 'superseded')),
  source_snapshot_id text,
  source_snapshot_hash text,
  board_pack_hash text not null,
  content jsonb not null,
  markdown text not null,
  source_references jsonb not null default '[]'::jsonb,
  immutable_hash text not null,
  created_by uuid references public.user_profiles(id) on delete set null,
  handed_off_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique (board_session_id, version),
  unique (immutable_hash)
);

create table if not exists public.creative_os_handoffs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  strategic_source_document_id uuid not null references public.strategic_source_documents(id) on delete restrict,
  requested_by uuid references public.user_profiles(id) on delete set null,
  request_id uuid not null default gen_random_uuid(),
  idempotency_key text not null unique,
  contract_version text not null default '1.0',
  operation text not null default 'import_handoff' check (operation = 'import_handoff'),
  input_hash text not null,
  status text not null default 'prepared' check (status in ('prepared', 'sending', 'accepted', 'degraded', 'failed')),
  creative_os_company_id text,
  creative_os_artifact_id text,
  creative_os_url text,
  attempt_count integer not null default 0,
  last_attempt_at timestamptz,
  accepted_at timestamptz,
  last_error text,
  response_payload jsonb not null default '{}'::jsonb,
  provenance jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb
);

create index if not exists strategic_source_documents_company_idx
  on public.strategic_source_documents(company_id, created_at desc);

create index if not exists creative_os_handoffs_document_idx
  on public.creative_os_handoffs(strategic_source_document_id, created_at desc);

drop trigger if exists set_strategic_source_documents_updated_at on public.strategic_source_documents;
create trigger set_strategic_source_documents_updated_at
  before update on public.strategic_source_documents
  for each row execute function public.set_updated_at();

drop trigger if exists set_creative_os_handoffs_updated_at on public.creative_os_handoffs;
create trigger set_creative_os_handoffs_updated_at
  before update on public.creative_os_handoffs
  for each row execute function public.set_updated_at();

drop trigger if exists set_strategic_source_documents_organization_id on public.strategic_source_documents;
create trigger set_strategic_source_documents_organization_id
  before insert or update on public.strategic_source_documents
  for each row execute function public.set_organization_id_from_company();

drop trigger if exists set_creative_os_handoffs_organization_id on public.creative_os_handoffs;
create trigger set_creative_os_handoffs_organization_id
  before insert or update on public.creative_os_handoffs
  for each row execute function public.set_organization_id_from_company();

create or replace function public.protect_strategic_source_document()
returns trigger
language plpgsql
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.company_id is distinct from old.company_id
    or new.governance_cycle_id is distinct from old.governance_cycle_id
    or new.business_plan_id is distinct from old.business_plan_id
    or new.board_pack_id is distinct from old.board_pack_id
    or new.board_session_id is distinct from old.board_session_id
    or new.meeting_minutes_id is distinct from old.meeting_minutes_id
    or new.version is distinct from old.version
    or new.title is distinct from old.title
    or new.source_snapshot_id is distinct from old.source_snapshot_id
    or new.source_snapshot_hash is distinct from old.source_snapshot_hash
    or new.board_pack_hash is distinct from old.board_pack_hash
    or new.content is distinct from old.content
    or new.markdown is distinct from old.markdown
    or new.source_references is distinct from old.source_references
    or new.immutable_hash is distinct from old.immutable_hash
    or new.created_by is distinct from old.created_by
    or new.metadata is distinct from old.metadata
  then
    raise exception 'Strategic Source Document content and provenance are immutable; create a new version';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_strategic_source_document on public.strategic_source_documents;
create trigger protect_strategic_source_document
  before update on public.strategic_source_documents
  for each row execute function public.protect_strategic_source_document();

alter table public.strategic_source_documents enable row level security;
alter table public.creative_os_handoffs enable row level security;

drop policy if exists "Company members can read strategic source documents" on public.strategic_source_documents;
create policy "Company members can read strategic source documents" on public.strategic_source_documents
  for select using (public.is_company_member(company_id));

drop policy if exists "Company admins can manage strategic source documents" on public.strategic_source_documents;
create policy "Company admins can manage strategic source documents" on public.strategic_source_documents
  for all using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

drop policy if exists "Company admins can manage Creative OS handoffs" on public.creative_os_handoffs;
create policy "Company admins can manage Creative OS handoffs" on public.creative_os_handoffs
  for all using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

notify pgrst, 'reload schema';

commit;
