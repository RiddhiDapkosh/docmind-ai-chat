
-- Extensions
create extension if not exists vector;

-- =========================
-- profiles
-- =========================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Users read own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);

-- =========================
-- documents
-- =========================
create type public.document_status as enum ('processing', 'ready', 'failed');

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  file_type text not null,
  file_size bigint not null default 0,
  total_pages integer not null default 0,
  chunk_count integer not null default 0,
  storage_path text,
  status public.document_status not null default 'processing',
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index documents_user_id_idx on public.documents(user_id, created_at desc);
grant select, insert, update, delete on public.documents to authenticated;
grant all on public.documents to service_role;
alter table public.documents enable row level security;
create policy "Users manage own documents" on public.documents for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================
-- document_chunks (RAG vector store)
-- =========================
create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  page_number integer,
  embedding vector(768),
  created_at timestamptz not null default now()
);
create index document_chunks_document_id_idx on public.document_chunks(document_id);
create index document_chunks_user_id_idx on public.document_chunks(user_id);
create index document_chunks_embedding_idx on public.document_chunks using hnsw (embedding vector_cosine_ops);
grant select, insert, update, delete on public.document_chunks to authenticated;
grant all on public.document_chunks to service_role;
alter table public.document_chunks enable row level security;
create policy "Users manage own chunks" on public.document_chunks for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- RAG retrieval function: returns top-k similar chunks for a user
create or replace function public.match_document_chunks(
  query_embedding vector(768),
  match_user_id uuid,
  match_document_ids uuid[] default null,
  match_count int default 5
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  page_number int,
  chunk_index int,
  filename text,
  similarity float
)
language sql stable security invoker
set search_path = public
as $$
  select
    c.id,
    c.document_id,
    c.content,
    c.page_number,
    c.chunk_index,
    d.filename,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.document_chunks c
  join public.documents d on d.id = c.document_id
  where c.user_id = match_user_id
    and (match_document_ids is null or c.document_id = any(match_document_ids))
    and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- =========================
-- chats
-- =========================
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index chats_user_id_idx on public.chats(user_id, updated_at desc);
grant select, insert, update, delete on public.chats to authenticated;
grant all on public.chats to service_role;
alter table public.chats enable row level security;
create policy "Users manage own chats" on public.chats for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================
-- messages
-- =========================
create type public.message_role as enum ('user', 'assistant');

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.message_role not null,
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index messages_chat_id_idx on public.messages(chat_id, created_at asc);
grant select, insert, update, delete on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "Users manage own messages" on public.messages for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================
-- user_settings
-- =========================
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  model_name text not null default 'google/gemini-3-flash-preview',
  temperature numeric(3,2) not null default 0.2,
  top_k integer not null default 5,
  chunk_size integer not null default 800,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.user_settings to authenticated;
grant all on public.user_settings to service_role;
alter table public.user_settings enable row level security;
create policy "Users manage own settings" on public.user_settings for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================
-- updated_at trigger helper
-- =========================
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_set_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger documents_set_updated before update on public.documents for each row execute function public.set_updated_at();
create trigger chats_set_updated before update on public.chats for each row execute function public.set_updated_at();
create trigger settings_set_updated before update on public.user_settings for each row execute function public.set_updated_at();

-- =========================
-- new user trigger
-- =========================
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
