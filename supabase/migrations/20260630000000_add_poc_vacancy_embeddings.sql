-- Enable pgvector extension
-- Requires pgvector to be available in the Supabase project.
create extension if not exists vector;

-- Add 384-dimensional embedding column for OpenAI text-embedding-3-small
alter table public.poc_vacancies
add column if not exists embedding vector(384);

-- Track when the embedding was last refreshed
alter table public.poc_vacancies
add column if not exists embedding_updated_at timestamptz;

-- Vector index for cosine similarity search.
-- hnsw is generally preferred on Supabase when supported; ivfflat is the fallback.
-- Only one index is created. Safe to re-run.

do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'poc_vacancies'
      and indexname like 'poc_vacancies_embedding_%'
  ) then
    create index poc_vacancies_embedding_hnsw_idx
      on public.poc_vacancies
      using hnsw (embedding vector_cosine_ops)
      where embedding is not null;
  end if;
end
$$;

-- RPC: semantic nearest-neighbour search for vacancies
-- Returns a stable shape that the frontend can merge with keyword results.
create or replace function public.match_vacancies(
  query_embedding vector(384),
  match_limit int default 20
)
returns table (
  id text,
  job_title text,
  occupation_name text,
  job_description text,
  education_level text,
  field_of_study text,
  state text,
  city text,
  salary text,
  salary_min numeric,
  salary_max numeric,
  skills text,
  similarity float
)
language sql
stable
as $$
  select
    v.id,
    v.job_title,
    v.occupation_name,
    v.job_description,
    v.education_level,
    v.field_of_study,
    v.state,
    v.city,
    v.salary,
    v.salary_min,
    v.salary_max,
    v.skills,
    1 - (v.embedding <=> query_embedding) as similarity
  from public.poc_vacancies v
  where v.embedding is not null
  order by v.embedding <=> query_embedding
  limit match_limit;
$$;

-- Permissions: allow the Supabase clients to call the RPC
grant execute on function public.match_vacancies(vector, int) to authenticated;
grant execute on function public.match_vacancies(vector, int) to anon;
grant execute on function public.match_vacancies(vector, int) to service_role;
