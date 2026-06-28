-- Legacy Board OS MVP schema.
-- Do not use this for the production Board Governance OS Supabase project.
-- Use supabase/migrations/0001_board_governance_os_foundation.sql instead.

create table if not exists companies (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  industry text,
  business_model text,
  revenue_range text,
  employee_count integer,
  stage text,
  jurisdiction text,
  goals text,
  main_challenge text
);

create table if not exists governance_runs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  company_id uuid references companies(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
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

create table if not exists persona_reviews (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  governance_run_id uuid references governance_runs(id) on delete cascade not null,
  company_id uuid references companies(id) on delete cascade not null,
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

create table if not exists decisions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  company_id uuid references companies(id) on delete cascade not null,
  governance_run_id uuid references governance_runs(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade not null,
  decision text not null,
  rationale text,
  risks text,
  expected_outcome text,
  owner text,
  review_date date,
  status text default 'open' check (status in ('open', 'reviewing', 'closed', 'reversed'))
);

create table if not exists follow_ups (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  company_id uuid references companies(id) on delete cascade not null,
  governance_run_id uuid references governance_runs(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade not null,
  action text not null,
  owner text,
  due_date date,
  status text default 'open' check (status in ('open', 'in_progress', 'done', 'blocked'))
);

alter table companies enable row level security;
alter table governance_runs enable row level security;
alter table persona_reviews enable row level security;
alter table decisions enable row level security;
alter table follow_ups enable row level security;

create policy "Users manage own companies" on companies
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users manage own governance runs" on governance_runs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users read own persona reviews" on persona_reviews
  for select using (
    exists (
      select 1 from governance_runs gr
      where gr.id = governance_run_id and gr.user_id = auth.uid()
    )
  );

create policy "Users manage own decisions" on decisions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users manage own follow ups" on follow_ups
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists companies_user_id_idx on companies(user_id);
create index if not exists governance_runs_company_id_idx on governance_runs(company_id);
create index if not exists governance_runs_user_id_idx on governance_runs(user_id);
create index if not exists persona_reviews_run_id_idx on persona_reviews(governance_run_id);
create index if not exists decisions_company_id_idx on decisions(company_id);
create index if not exists follow_ups_company_id_idx on follow_ups(company_id);

create or replace view company_dashboard_rollup as
select
  c.id as company_id,
  c.user_id,
  c.name as company_name,
  count(distinct gr.id) as total_runs,
  max(gr.created_at) as latest_run_at,
  avg(gr.risk_score)::int as avg_risk_score,
  avg(gr.confidence_score)::int as avg_confidence_score,
  count(distinct f.id) filter (where f.status in ('open', 'in_progress')) as open_follow_ups,
  count(distinct f.id) filter (where f.status in ('open', 'in_progress') and f.due_date < current_date) as overdue_follow_ups,
  count(distinct d.id) filter (where d.status in ('open', 'reviewing')) as open_decisions
from companies c
left join governance_runs gr on gr.company_id = c.id
left join decisions d on d.company_id = c.id
left join follow_ups f on f.company_id = c.id
group by c.id, c.user_id, c.name;
