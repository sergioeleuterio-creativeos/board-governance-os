-- Sprint 4: immutable board-pack release, mixed participants, and scheduled asynchronous deliberation.

begin;

alter table public.board_packs
  add column if not exists locked_at timestamptz,
  add column if not exists released_at timestamptz,
  add column if not exists released_by uuid references public.user_profiles(id) on delete set null,
  add column if not exists content_hash text,
  add column if not exists source_snapshot_id text,
  add column if not exists source_snapshot_hash text;

alter table public.board_sessions
  add column if not exists meeting_timezone text not null default 'America/Sao_Paulo',
  add column if not exists current_phase text not null default 'pack_review',
  add column if not exists phase_started_at timestamptz,
  add column if not exists phase_deadline_at timestamptz,
  add column if not exists phase_schedule jsonb not null default '[]'::jsonb;

create table if not exists public.board_participants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  board_session_id uuid not null references public.board_sessions(id) on delete cascade,
  board_pack_id uuid not null references public.board_packs(id) on delete cascade,
  participant_type text not null check (participant_type in ('human', 'synthetic')),
  user_id uuid references public.user_profiles(id) on delete set null,
  email text,
  display_name text not null,
  role_label text not null default 'Board member',
  advisor_key text,
  status text not null default 'invited' check (status in ('invited', 'accepted', 'active', 'declined', 'revoked', 'expired')),
  access_token_hash text unique,
  invite_expires_at timestamptz,
  invited_by uuid references public.user_profiles(id) on delete set null,
  invited_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz,
  last_notified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  check (
    (participant_type = 'synthetic' and advisor_key is not null)
    or participant_type = 'human'
  )
);

create table if not exists public.board_contributions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  board_session_id uuid not null references public.board_sessions(id) on delete cascade,
  board_pack_id uuid not null references public.board_packs(id) on delete cascade,
  participant_id uuid not null references public.board_participants(id) on delete restrict,
  reply_to_id uuid references public.board_contributions(id) on delete set null,
  contribution_type text not null check (
    contribution_type in (
      'independent_analysis',
      'challenge',
      'response',
      'final_position',
      'founder_question',
      'chair_synthesis',
      'decision',
      'minutes_note'
    )
  ),
  phase text not null,
  body text not null check (char_length(trim(body)) between 1 and 12000),
  source_references jsonb not null default '[]'::jsonb,
  visibility text not null default 'sealed' check (visibility in ('sealed', 'released')),
  submitted_at timestamptz not null default now(),
  released_at timestamptz,
  author_snapshot jsonb not null default '{}'::jsonb,
  immutable_hash text not null,
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists board_participants_session_user_unique
  on public.board_participants(board_session_id, user_id)
  where user_id is not null;

create unique index if not exists board_participants_session_advisor_unique
  on public.board_participants(board_session_id, advisor_key)
  where advisor_key is not null;

create unique index if not exists board_participants_session_email_unique
  on public.board_participants(board_session_id, lower(email))
  where participant_type = 'human' and email is not null;

create index if not exists board_participants_session_idx
  on public.board_participants(board_session_id, status);

create index if not exists board_participants_user_idx
  on public.board_participants(user_id, status);

create index if not exists board_contributions_session_idx
  on public.board_contributions(board_session_id, submitted_at);

create index if not exists board_contributions_release_idx
  on public.board_contributions(board_session_id, visibility, phase);

create unique index if not exists async_board_session_pack_unique
  on public.board_sessions(board_pack_id)
  where board_pack_id is not null and metadata->>'async_board' = 'true';

drop trigger if exists set_board_participants_updated_at on public.board_participants;
create trigger set_board_participants_updated_at
  before update on public.board_participants
  for each row execute function public.set_updated_at();

drop trigger if exists set_board_contributions_updated_at on public.board_contributions;
create trigger set_board_contributions_updated_at
  before update on public.board_contributions
  for each row execute function public.set_updated_at();

drop trigger if exists set_board_participants_organization_id on public.board_participants;
create trigger set_board_participants_organization_id
  before insert or update on public.board_participants
  for each row execute function public.set_organization_id_from_company();

drop trigger if exists set_board_contributions_organization_id on public.board_contributions;
create trigger set_board_contributions_organization_id
  before insert or update on public.board_contributions
  for each row execute function public.set_organization_id_from_company();

create or replace function public.protect_board_contribution()
returns trigger
language plpgsql
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.company_id is distinct from old.company_id
    or new.board_session_id is distinct from old.board_session_id
    or new.board_pack_id is distinct from old.board_pack_id
    or new.participant_id is distinct from old.participant_id
    or new.reply_to_id is distinct from old.reply_to_id
    or new.contribution_type is distinct from old.contribution_type
    or new.phase is distinct from old.phase
    or new.body is distinct from old.body
    or new.source_references is distinct from old.source_references
    or new.submitted_at is distinct from old.submitted_at
    or new.author_snapshot is distinct from old.author_snapshot
    or new.immutable_hash is distinct from old.immutable_hash
    or new.metadata is distinct from old.metadata
  then
    raise exception 'Board contribution content and attribution are immutable';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_board_contribution on public.board_contributions;
create trigger protect_board_contribution
  before update on public.board_contributions
  for each row execute function public.protect_board_contribution();

create or replace function public.protect_released_board_pack()
returns trigger
language plpgsql
as $$
begin
  if old.locked_at is not null and (
    new.business_plan_id is distinct from old.business_plan_id
    or new.version is distinct from old.version
    or new.executive_summary is distinct from old.executive_summary
    or new.strategic_questions is distinct from old.strategic_questions
    or new.risk_map is distinct from old.risk_map
    or new.priority_ranking is distinct from old.priority_ranking
    or new.meeting_agenda is distinct from old.meeting_agenda
    or new.decision_candidates is distinct from old.decision_candidates
    or new.export_payload is distinct from old.export_payload
    or new.content_hash is distinct from old.content_hash
    or new.source_snapshot_id is distinct from old.source_snapshot_id
    or new.source_snapshot_hash is distinct from old.source_snapshot_hash
    or new.locked_at is distinct from old.locked_at
    or new.released_at is distinct from old.released_at
    or new.released_by is distinct from old.released_by
  ) then
    raise exception 'Released board packs are immutable; create a new version';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_released_board_pack on public.board_packs;
create trigger protect_released_board_pack
  before update on public.board_packs
  for each row execute function public.protect_released_board_pack();

alter table public.board_participants enable row level security;
alter table public.board_contributions enable row level security;

drop policy if exists "Board admins can manage participants" on public.board_participants;
create policy "Board admins can manage participants" on public.board_participants
  for all
  using (public.is_company_admin(company_id))
  with check (public.is_company_admin(company_id));

drop policy if exists "Participants can read their board access" on public.board_participants;
create policy "Participants can read their board access" on public.board_participants
  for select
  using (user_id = auth.uid());

drop policy if exists "Released contributions are visible to the board" on public.board_contributions;
create policy "Released contributions are visible to the board" on public.board_contributions
  for select
  using (
    public.current_user_is_super_admin()
    or (
      visibility = 'released'
      and (
        public.is_company_member(company_id)
        or exists (
          select 1
          from public.board_participants participant
          where participant.board_session_id = board_contributions.board_session_id
            and participant.user_id = auth.uid()
            and participant.status in ('accepted', 'active')
        )
      )
    )
    or exists (
      select 1
      from public.board_participants author
      where author.id = board_contributions.participant_id
        and author.user_id = auth.uid()
        and author.status in ('accepted', 'active')
    )
  );

drop policy if exists "Participants can submit their own contributions" on public.board_contributions;
create policy "Participants can submit their own contributions" on public.board_contributions
  for insert
  with check (
    exists (
      select 1
      from public.board_participants participant
      where participant.id = board_contributions.participant_id
        and participant.board_session_id = board_contributions.board_session_id
        and participant.board_pack_id = board_contributions.board_pack_id
        and participant.user_id = auth.uid()
        and participant.status in ('accepted', 'active')
    )
  );

drop policy if exists "Board admins can release contributions" on public.board_contributions;
create policy "Board admins can release contributions" on public.board_contributions
  for update
  using (public.is_company_admin(company_id))
  with check (public.is_company_admin(company_id));

drop policy if exists "Session participants can read released board packs" on public.board_packs;
create policy "Session participants can read released board packs" on public.board_packs
  for select
  using (
    released_at is not null
    and exists (
      select 1
      from public.board_participants participant
      where participant.board_pack_id = board_packs.id
        and participant.user_id = auth.uid()
        and participant.status in ('accepted', 'active')
    )
  );

notify pgrst, 'reload schema';

commit;
