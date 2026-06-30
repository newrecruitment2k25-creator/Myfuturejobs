-- Enable pgvector extension (idempotent)
create extension if not exists vector;

-- Add 384-dimensional embedding column for OpenAI text-embedding-3-small
alter table public.poc_candidates
add column if not exists embedding vector(384);

-- Track when the candidate embedding was last refreshed
alter table public.poc_candidates
add column if not exists embedding_updated_at timestamptz;

-- Vector index for cosine similarity search on candidate embeddings
-- Only one index is created and it is safe to re-run.
create index if not exists poc_candidates_embedding_hnsw_idx
  on public.poc_candidates
  using hnsw (embedding vector_cosine_ops)
  where embedding is not null;

-- RPC: semantic nearest-neighbour search for candidates
-- Returns a stable shape that the employer matching UI can consume.
create or replace function public.match_candidates(
  query_embedding vector(384),
  match_limit int default 20
)
returns table (
  id text,
  education_level text,
  nec_1d text,
  nec_2d text,
  preferred_occupation text,
  previous_occupation text,
  previous_years_experience text,
  preferred_salary text,
  preferred_state text,
  skills text,
  institution text,
  similarity float
)
language sql
stable
as $$
  select
    c.id,
    c.education_level,
    c.nec_1d,
    c.nec_2d,
    c.preferred_occupation,
    c.previous_occupation,
    c.previous_years_experience,
    c.preferred_salary,
    c.preferred_state,
    c.skills,
    c.institution,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.poc_candidates c
  where c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_limit;
$$;

-- Permissions: allow Supabase clients to call the RPC
grant execute on function public.match_candidates(vector, int) to authenticated;
grant execute on function public.match_candidates(vector, int) to anon;
grant execute on function public.match_candidates(vector, int) to service_role;
