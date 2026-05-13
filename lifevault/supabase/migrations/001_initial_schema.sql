-- LifeVault Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ===================================
-- TABLES
-- ===================================

-- User profile (extends auth.users)
create table if not exists public.users_profile (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  full_name   text not null,
  email       text,
  mobile      text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(user_id)
);

-- Profiles (family, pets, vehicles, property)
create table if not exists public.profiles (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  profile_type  text not null check (profile_type in ('self','spouse','child','parent','pet','vehicle','property','other')),
  name          text not null,
  relationship  text,
  metadata      jsonb not null default '{}',
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Documents
create table if not exists public.documents (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  profile_id          uuid references public.profiles(id) on delete set null,
  document_name       text not null,
  category            text not null check (category in ('identity','education','family','property','vehicle','medical','pet','finance','legal','insurance','other')),
  sub_category        text,
  issuer              text,
  document_number     text,
  issue_date          date,
  expiry_date         date,
  verification_status text not null default 'self_uploaded' check (verification_status in ('verified','self_uploaded','ocr_extracted','expired','needs_correction','mismatch_detected')),
  source              text not null default 'upload' check (source in ('upload','scan','camera','import')),
  storage_path        text not null,
  file_type           text not null,
  file_size           bigint not null default 0,
  ocr_text            text,
  tags                text[] not null default '{}',
  metadata            jsonb not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Document shares / secure links
create table if not exists public.document_shares (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  document_id         uuid not null references public.documents(id) on delete cascade,
  recipient_name      text,
  recipient_contact   text,
  channel             text not null check (channel in ('email','whatsapp','sms','link','download')),
  purpose             text,
  is_password_protected boolean not null default false,
  password_hash       text,
  expiry_at           timestamptz,
  access_count        integer not null default 0,
  max_access_count    integer,
  is_watermarked      boolean not null default false,
  allow_download      boolean not null default true,
  signed_url          text,
  status              text not null default 'active' check (status in ('active','expired','revoked')),
  created_at          timestamptz not null default now()
);

-- Correction workflows
create table if not exists public.correction_workflows (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  document_id         uuid not null references public.documents(id) on delete cascade,
  correction_type     text not null,
  authority           text,
  required_documents  jsonb not null default '[]',
  process_steps       jsonb not null default '[]',
  expected_timeline   text,
  fee                 text,
  status              text not null default 'not_started' check (status in ('not_started','in_progress','submitted','waiting','completed','rejected')),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Reminders
create table if not exists public.reminders (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  document_id     uuid not null references public.documents(id) on delete cascade,
  reminder_type   text not null check (reminder_type in ('expiry','renewal','follow_up','submission_deadline','appointment','correction_pending')),
  reminder_date   timestamptz not null,
  frequency       text default 'once',
  notes           text,
  status          text not null default 'active' check (status in ('active','dismissed','completed')),
  created_at      timestamptz not null default now()
);

-- Activity logs
create table if not exists public.activity_logs (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  document_id   uuid references public.documents(id) on delete cascade,
  action        text not null check (action in ('uploaded','viewed','edited','shared','downloaded','ocr_processed','verification_changed','correction_started','reminder_created','share_revoked','deleted')),
  details       jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

-- ===================================
-- INDEXES
-- ===================================

create index if not exists idx_documents_user_id on public.documents(user_id);
create index if not exists idx_documents_category on public.documents(category);
create index if not exists idx_documents_profile_id on public.documents(profile_id);
create index if not exists idx_documents_expiry_date on public.documents(expiry_date);
create index if not exists idx_documents_ocr_text on public.documents using gin(to_tsvector('english', coalesce(ocr_text, '')));
create index if not exists idx_profiles_user_id on public.profiles(user_id);
create index if not exists idx_reminders_user_id on public.reminders(user_id);
create index if not exists idx_activity_logs_document_id on public.activity_logs(document_id);
create index if not exists idx_document_shares_document_id on public.document_shares(document_id);

-- ===================================
-- ROW LEVEL SECURITY
-- ===================================

-- Enable RLS on all tables
alter table public.users_profile enable row level security;
alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.document_shares enable row level security;
alter table public.correction_workflows enable row level security;
alter table public.reminders enable row level security;
alter table public.activity_logs enable row level security;

-- users_profile RLS
create policy "Users can view own profile" on public.users_profile
  for select using (auth.uid() = user_id);
create policy "Users can insert own profile" on public.users_profile
  for insert with check (auth.uid() = user_id);
create policy "Users can update own profile" on public.users_profile
  for update using (auth.uid() = user_id);
create policy "Users can delete own profile" on public.users_profile
  for delete using (auth.uid() = user_id);

-- profiles RLS
create policy "Users can view own profiles" on public.profiles
  for select using (auth.uid() = user_id);
create policy "Users can insert own profiles" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "Users can update own profiles" on public.profiles
  for update using (auth.uid() = user_id);
create policy "Users can delete own profiles" on public.profiles
  for delete using (auth.uid() = user_id);

-- documents RLS
create policy "Users can view own documents" on public.documents
  for select using (auth.uid() = user_id);
create policy "Users can insert own documents" on public.documents
  for insert with check (auth.uid() = user_id);
create policy "Users can update own documents" on public.documents
  for update using (auth.uid() = user_id);
create policy "Users can delete own documents" on public.documents
  for delete using (auth.uid() = user_id);

-- document_shares RLS
create policy "Users can view own shares" on public.document_shares
  for select using (auth.uid() = user_id);
create policy "Users can insert own shares" on public.document_shares
  for insert with check (auth.uid() = user_id);
create policy "Users can update own shares" on public.document_shares
  for update using (auth.uid() = user_id);
create policy "Users can delete own shares" on public.document_shares
  for delete using (auth.uid() = user_id);

-- correction_workflows RLS
create policy "Users can view own corrections" on public.correction_workflows
  for select using (auth.uid() = user_id);
create policy "Users can insert own corrections" on public.correction_workflows
  for insert with check (auth.uid() = user_id);
create policy "Users can update own corrections" on public.correction_workflows
  for update using (auth.uid() = user_id);
create policy "Users can delete own corrections" on public.correction_workflows
  for delete using (auth.uid() = user_id);

-- reminders RLS
create policy "Users can view own reminders" on public.reminders
  for select using (auth.uid() = user_id);
create policy "Users can insert own reminders" on public.reminders
  for insert with check (auth.uid() = user_id);
create policy "Users can update own reminders" on public.reminders
  for update using (auth.uid() = user_id);
create policy "Users can delete own reminders" on public.reminders
  for delete using (auth.uid() = user_id);

-- activity_logs RLS
create policy "Users can view own activity" on public.activity_logs
  for select using (auth.uid() = user_id);
create policy "Users can insert own activity" on public.activity_logs
  for insert with check (auth.uid() = user_id);

-- ===================================
-- STORAGE BUCKET
-- ===================================

-- Create private documents bucket (run in Supabase dashboard or via API)
-- insert into storage.buckets (id, name, public) values ('documents', 'documents', false);

-- Storage RLS policies
-- Users can only access their own files (files are stored under user_id/ prefix)
create policy "Users can upload own documents" on storage.objects
  for insert with check (
    bucket_id = 'documents' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can read own documents" on storage.objects
  for select using (
    bucket_id = 'documents' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update own documents" on storage.objects
  for update using (
    bucket_id = 'documents' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own documents" on storage.objects
  for delete using (
    bucket_id = 'documents' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ===================================
-- FUNCTIONS
-- ===================================

-- Auto-update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger set_updated_at_users_profile
  before update on public.users_profile
  for each row execute function public.handle_updated_at();

create or replace trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create or replace trigger set_updated_at_documents
  before update on public.documents
  for each row execute function public.handle_updated_at();

create or replace trigger set_updated_at_correction_workflows
  before update on public.correction_workflows
  for each row execute function public.handle_updated_at();
