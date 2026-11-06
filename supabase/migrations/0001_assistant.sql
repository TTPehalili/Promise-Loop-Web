-- PromiseLoop Assistant (website chat) — brief §6.
-- All tables: RLS ON with NO anon/authenticated policies. The server uses the
-- service-role key only, which bypasses RLS. Staff read access comes later via an admin view.

create extension if not exists pgcrypto;  -- gen_random_uuid() on older Postgres
create extension if not exists citext;
create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- Visitors
-- ---------------------------------------------------------------------------
create table if not exists assistant_visitors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  first_name text,
  email citext,
  company text,
  trade text,                       -- hvac | plumbing | electrical | roofing | ...
  unpaid_jobs_estimate int,
  current_process text,             -- free text, short
  tools text[],                     -- dialer / crm mentioned by visitor
  visitor_type text not null default 'prospect' check (visitor_type in ('prospect','not_prospect')),
  memory_summary text check (memory_summary is null or char_length(memory_summary) <= 600),
  last_topic text,
  consent_memory boolean not null default true,
  forgotten_at timestamptz
);
create index if not exists assistant_visitors_email_idx on assistant_visitors (email) where email is not null;

-- ---------------------------------------------------------------------------
-- Sessions
-- ---------------------------------------------------------------------------
create table if not exists assistant_sessions (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid references assistant_visitors(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  stage text not null default 'GREET' check (stage in
    ('GREET','DISCOVER','ANSWER','PIVOT','BOOK','WRAP_UP','CLOSED','HANDOFF','NOT_A_PROSPECT')),
  page_path text,
  utm jsonb,
  summary text,
  outcome text check (outcome is null or outcome in
    ('booked','lead','handoff','redirected','abandoned','closed')),
  -- server-side state for the stage machine and tool gates
  state jsonb not null default '{}'::jsonb,
  use_memory boolean not null default true    -- false after "Start fresh"
);
create index if not exists assistant_sessions_visitor_idx on assistant_sessions (visitor_id, started_at desc);

-- ---------------------------------------------------------------------------
-- Messages (content redacted before insert, §6.3)
-- ---------------------------------------------------------------------------
create table if not exists assistant_messages (
  id bigserial primary key,
  ui_id text not null,                         -- AI SDK UI message id (feedback key)
  session_id uuid references assistant_sessions(id) on delete cascade,
  role text check (role in ('user','assistant','tool')),
  content text,                                -- redacted plain text
  parts jsonb,                                 -- redacted UI message parts (for resume)
  tool_name text,
  created_at timestamptz not null default now(),
  feedback smallint check (feedback is null or feedback in (1,-1))
);
create unique index if not exists assistant_messages_ui_id_idx on assistant_messages (session_id, ui_id);
create index if not exists assistant_messages_ui_id_lookup_idx on assistant_messages (ui_id);
create index if not exists assistant_messages_session_idx on assistant_messages (session_id, id);

-- ---------------------------------------------------------------------------
-- Leads + bookings
-- ---------------------------------------------------------------------------
create table if not exists assistant_leads (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid references assistant_visitors(id) on delete set null,
  session_id uuid references assistant_sessions(id) on delete set null,
  type text check (type in ('demo','email_me','handoff')),
  first_name text,
  email citext,
  company text,
  phone text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists assistant_bookings (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references assistant_leads(id) on delete cascade,
  visitor_id uuid references assistant_visitors(id) on delete set null,
  provider_booking_id text,
  starts_at timestamptz,
  visitor_tz text,
  label text,
  reschedule_url text,
  status text not null default 'booked' check (status in ('booked','rescheduled','cancelled','no_show','held')),
  created_at timestamptz not null default now()
);
create index if not exists assistant_bookings_visitor_idx on assistant_bookings (visitor_id, starts_at desc);

-- ---------------------------------------------------------------------------
-- Phase 2 retrieval
-- ---------------------------------------------------------------------------
create table if not exists kb_chunks (
  id bigserial primary key,
  doc_slug text not null,
  chunk_index int not null default 0,
  title text,
  topic text,
  content text not null,
  tokens int,
  embedding vector(1024),                      -- match the embedding model's dimensions
  fts tsvector generated always as (to_tsvector('english', coalesce(title,'') || ' ' || content)) stored,
  updated_at timestamptz not null default now(),
  unique (doc_slug, chunk_index)
);
create index if not exists kb_chunks_embedding_idx on kb_chunks using hnsw (embedding vector_cosine_ops);
create index if not exists kb_chunks_fts_idx on kb_chunks using gin (fts);

-- Hybrid search: vector similarity + full-text, fused with Reciprocal Rank Fusion.
create or replace function match_kb_chunks(
  query_embedding vector(1024),
  query_text text,
  k int default 6,
  rrf_k int default 60
)
returns table (id bigint, doc_slug text, title text, topic text, content text, score double precision)
language sql stable
as $$
  with vec as (
    select c.id, row_number() over (order by c.embedding <=> query_embedding) as rnk
    from kb_chunks c
    where c.embedding is not null
    order by c.embedding <=> query_embedding
    limit greatest(k, 1) * 4
  ),
  fts as (
    select c.id,
           row_number() over (order by ts_rank_cd(c.fts, websearch_to_tsquery('english', query_text)) desc) as rnk
    from kb_chunks c
    where c.fts @@ websearch_to_tsquery('english', query_text)
    order by ts_rank_cd(c.fts, websearch_to_tsquery('english', query_text)) desc
    limit greatest(k, 1) * 4
  ),
  fused as (
    select coalesce(vec.id, fts.id) as id,
           coalesce(1.0 / (rrf_k + vec.rnk), 0.0) + coalesce(1.0 / (rrf_k + fts.rnk), 0.0) as score
    from vec full outer join fts on vec.id = fts.id
  )
  select c.id, c.doc_slug, c.title, c.topic, c.content, f.score
  from fused f join kb_chunks c on c.id = f.id
  order by f.score desc
  limit k;
$$;

-- ---------------------------------------------------------------------------
-- RLS: on, no policies (service role only)
-- ---------------------------------------------------------------------------
alter table assistant_visitors enable row level security;
alter table assistant_sessions enable row level security;
alter table assistant_messages enable row level security;
alter table assistant_leads    enable row level security;
alter table assistant_bookings enable row level security;
alter table kb_chunks          enable row level security;

revoke all on assistant_visitors, assistant_sessions, assistant_messages,
              assistant_leads, assistant_bookings, kb_chunks from anon, authenticated;
revoke execute on function match_kb_chunks(vector, text, int, int) from public, anon, authenticated;

-- Retention (§6.1): delete messages after 12 months of session inactivity.
-- Schedule with pg_cron, e.g.:
--   select cron.schedule('assistant-retention', '0 4 * * *', $$
--     delete from assistant_messages m using assistant_sessions s
--     where m.session_id = s.id and coalesce(s.ended_at, s.started_at) < now() - interval '12 months'
--   $$);
