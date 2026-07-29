-- Sprint 2: canonical plan versions and immutable source references.
-- This migration is additive and keeps existing business-plan reads valid.

begin;

alter table public.business_plans
  add column if not exists title text,
  add column if not exists plan_type text not null default 'business',
  add column if not exists period text,
  add column if not exists business_front text,
  add column if not exists version integer not null default 1,
  add column if not exists parent_plan_id uuid references public.business_plans(id) on delete set null,
  add column if not exists source_type text,
  add column if not exists source_document_ids jsonb not null default '[]'::jsonb,
  add column if not exists source_input_ids jsonb not null default '[]'::jsonb,
  add column if not exists raw_source jsonb not null default '{}'::jsonb,
  add column if not exists normalized_content jsonb not null default '{}'::jsonb,
  add column if not exists consolidation_lineage jsonb not null default '[]'::jsonb,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.business_plans
set
  title = coalesce(
    nullif(title, ''),
    nullif(metadata->>'title', ''),
    case
      when metadata->>'active_question' is not null
        then left(metadata->>'active_question', 140)
      else 'Plano ' || version::text
    end
  ),
  plan_type = coalesce(nullif(plan_type, ''), nullif(metadata->>'plan_type', ''), 'business'),
  period = coalesce(period, nullif(metadata->>'period', '')),
  business_front = coalesce(business_front, nullif(metadata->>'business_front', '')),
  normalized_content = case
    when normalized_content = '{}'::jsonb then jsonb_build_object(
      'diagnosis', diagnosis,
      'priorities', priorities,
      'kpis', kpis,
      'workstreams', workstreams,
      'risks', risks,
      'assumptions', assumptions
    )
    else normalized_content
  end
where title is null or title = '' or normalized_content = '{}'::jsonb;

alter table public.business_plans
  alter column title set not null;

-- Legacy rows all receive version 1 when the column is introduced. Assign stable
-- versions within any duplicated scope before enforcing uniqueness. Re-running
-- the migration leaves already-unique scopes unchanged.
with plan_counts as (
  select
    business_plans.*,
    count(*) over (
      partition by
        company_id,
        coalesce(plan_type, 'business'),
        coalesce(business_front, ''),
        coalesce(period, ''),
        version
    ) as version_count
  from public.business_plans
  where status <> 'archived'
),
ranked_plans as (
  select
    id,
    row_number() over (
      partition by
        company_id,
        coalesce(plan_type, 'business'),
        coalesce(business_front, ''),
        coalesce(period, '')
      order by created_at asc, id asc
    ) as computed_version,
    bool_or(version_count > 1) over (
      partition by
        company_id,
        coalesce(plan_type, 'business'),
        coalesce(business_front, ''),
        coalesce(period, '')
    ) as scope_has_duplicate
  from plan_counts
)
update public.business_plans as plans
set version = ranked_plans.computed_version
from ranked_plans
where plans.id = ranked_plans.id
  and ranked_plans.scope_has_duplicate;

create unique index if not exists business_plans_version_scope_idx
  on public.business_plans (
    company_id,
    coalesce(plan_type, 'business'),
    coalesce(business_front, ''),
    coalesce(period, ''),
    version
  )
  where status <> 'archived';

create index if not exists business_plans_parent_idx
  on public.business_plans(parent_plan_id);

alter table public.board_sessions
  add column if not exists source_snapshot_id text,
  add column if not exists source_snapshot_hash text,
  add column if not exists active_question text,
  add column if not exists question_confirmed_at timestamptz;

create index if not exists board_sessions_source_snapshot_idx
  on public.board_sessions(company_id, source_snapshot_id);

notify pgrst, 'reload schema';

commit;
