-- Interview Templates: employer-created structured interview templates
create table if not exists interview_templates (
  id                  uuid primary key default gen_random_uuid(),
  employer_id         uuid not null references auth.users(id) on delete cascade,
  title               text not null,
  role_title          text not null,
  job_id              uuid references jobs(id) on delete set null,
  company_name        text,
  industry            text,
  experience_level    text,
  interview_type      text not null default 'general',
  instructions        text,
  time_limit_minutes  integer,
  created_at          timestamptz not null default now()
);

-- Questions belonging to a template
create table if not exists interview_template_questions (
  id                   uuid primary key default gen_random_uuid(),
  template_id          uuid not null references interview_templates(id) on delete cascade,
  question_number      integer not null,
  question_text        text not null,
  question_type        text,
  scoring_criteria     text,
  time_limit_seconds   integer,
  created_at           timestamptz not null default now()
);

-- Invitations: employer invites a candidate to take a template interview
create table if not exists interview_invitations (
  id              uuid primary key default gen_random_uuid(),
  template_id     uuid not null references interview_templates(id) on delete cascade,
  candidate_id    uuid not null references auth.users(id) on delete cascade,
  status          text not null default 'pending',   -- pending | in_progress | completed
  message         text,
  deadline        timestamptz,
  started_at      timestamptz,
  completed_at    timestamptz,
  overall_score   integer,
  ai_summary      jsonb,
  created_at      timestamptz not null default now(),
  unique (template_id, candidate_id)
);

-- Per-question responses for invited interviews
create table if not exists invitation_responses (
  id              uuid primary key default gen_random_uuid(),
  invitation_id   uuid not null references interview_invitations(id) on delete cascade,
  question_id     uuid not null references interview_template_questions(id) on delete cascade,
  question_number integer not null,
  answer_text     text,
  score           integer,
  feedback        jsonb,
  created_at      timestamptz not null default now(),
  unique (invitation_id, question_id)
);

-- RLS policies
alter table interview_templates        enable row level security;
alter table interview_template_questions enable row level security;
alter table interview_invitations       enable row level security;
alter table invitation_responses        enable row level security;

-- Employers can manage their own templates
create policy "employer_manage_templates" on interview_templates
  for all using (employer_id = auth.uid());

-- Employers can manage questions of their templates
create policy "employer_manage_questions" on interview_template_questions
  for all using (
    template_id in (select id from interview_templates where employer_id = auth.uid())
  );

-- Employers can read invitations for their templates; candidates can read their own
create policy "employer_read_invitations" on interview_invitations
  for select using (
    template_id in (select id from interview_templates where employer_id = auth.uid())
  );
create policy "employer_insert_invitations" on interview_invitations
  for insert with check (
    template_id in (select id from interview_templates where employer_id = auth.uid())
  );
create policy "employer_update_invitations" on interview_invitations
  for update using (
    template_id in (select id from interview_templates where employer_id = auth.uid())
  );
create policy "candidate_own_invitations" on interview_invitations
  for all using (candidate_id = auth.uid());

-- Candidates can manage their own responses
create policy "candidate_own_responses" on invitation_responses
  for all using (
    invitation_id in (select id from interview_invitations where candidate_id = auth.uid())
  );
-- Employers can read responses for their template invitations
create policy "employer_read_responses" on invitation_responses
  for select using (
    invitation_id in (
      select ii.id from interview_invitations ii
      join interview_templates it on it.id = ii.template_id
      where it.employer_id = auth.uid()
    )
  );

-- Indexes for performance
create index if not exists idx_interview_templates_employer on interview_templates(employer_id);
create index if not exists idx_interview_template_questions_template on interview_template_questions(template_id, question_number);
create index if not exists idx_interview_invitations_template on interview_invitations(template_id);
create index if not exists idx_interview_invitations_candidate on interview_invitations(candidate_id);
create index if not exists idx_invitation_responses_invitation on invitation_responses(invitation_id, question_number);
