create table if not exists public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid null references public.jobs(id) on delete cascade,
  poc_vacancy_id uuid null references public.poc_vacancies(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint saved_jobs_one_target check (numnulls(job_id, poc_vacancy_id) = 1),
  constraint saved_jobs_user_target_unique unique (user_id, job_id, poc_vacancy_id)
);

create index if not exists saved_jobs_user_id_idx on public.saved_jobs(user_id);
create index if not exists saved_jobs_job_id_idx on public.saved_jobs(job_id) where job_id is not null;
create index if not exists saved_jobs_poc_vacancy_id_idx on public.saved_jobs(poc_vacancy_id) where poc_vacancy_id is not null;

alter table public.saved_jobs enable row level security;

create policy "Users can view own saved jobs"
  on public.saved_jobs for select
  using (auth.uid() = user_id);

create policy "Users can insert own saved jobs"
  on public.saved_jobs for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own saved jobs"
  on public.saved_jobs for delete
  using (auth.uid() = user_id);
