-- ============================================================================
-- Migration 00009: Contact messages (from the public Contact Us form)
-- ============================================================================
begin;

create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) >= 2),
  email       text not null,
  subject     text not null check (char_length(subject) >= 3),
  message     text not null check (char_length(message) >= 10),
  status      text not null default 'NEW' check (status in ('NEW','READ','RESOLVED')),
  created_at  timestamptz not null default now()
);

create index if not exists contact_messages_status_idx     on public.contact_messages(status);
create index if not exists contact_messages_created_at_idx on public.contact_messages(created_at desc);

-- Anyone (including unauthenticated visitors) can submit a contact message.
-- Only admins can read them (response moderation queue).
alter table public.contact_messages enable row level security;

create policy "contact_messages_insert_anyone"
  on public.contact_messages for insert
  to anon, authenticated
  with check (true);

create policy "contact_messages_read_admin"
  on public.contact_messages for select
  using (public.is_admin());

create policy "contact_messages_update_admin"
  on public.contact_messages for update
  using (public.is_admin());

create policy "contact_messages_delete_admin"
  on public.contact_messages for delete
  using (public.is_admin());

commit;
