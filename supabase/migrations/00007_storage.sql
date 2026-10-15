-- ============================================================================
-- Migration 00007: Storage buckets + storage object policies
-- ============================================================================
-- Three buckets:
--   avatars              — public-read profile photos
--   case-attachments     — private; only case participants can read
--   verification-docs    — private; only the expert + admins can read
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Create buckets (idempotent)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 3145728, array['image/jpeg','image/png','image/webp']),
  ('case-attachments', 'case-attachments', false, 5242880, array['image/jpeg','image/png','image/webp','image/gif']),
  ('verification-docs', 'verification-docs', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- AVATARS bucket policies
-- Public read; only the owner can write their own avatar at <uid>/...
-- ---------------------------------------------------------------------------
drop policy if exists "avatars_read_public" on storage.objects;
create policy "avatars_read_public"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- CASE-ATTACHMENTS bucket policies
-- Private. Only the case farmer and assigned expert can read the files.
-- Path convention: <case_id>/<filename>
-- We allow the uploader to insert; reads are gated by checking case ownership.
-- ---------------------------------------------------------------------------
drop policy if exists "case_attachments_read_participants" on storage.objects;
create policy "case_attachments_read_participants"
  on storage.objects for select
  using (
    bucket_id = 'case-attachments'
    and exists (
      select 1 from public.agricultural_cases c
      where c.id::text = (storage.foldername(name))[1]
        and (c.farmer_id = auth.uid() or c.expert_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "case_attachments_insert_farmer" on storage.objects;
create policy "case_attachments_insert_farmer"
  on storage.objects for insert
  with check (
    bucket_id = 'case-attachments'
    and exists (
      select 1 from public.agricultural_cases c
      where c.id::text = (storage.foldername(name))[1]
        and c.farmer_id = auth.uid()
    )
  );

drop policy if exists "case_attachments_delete_admin" on storage.objects;
create policy "case_attachments_delete_admin"
  on storage.objects for delete
  using (bucket_id = 'case-attachments' and public.is_admin());

-- ---------------------------------------------------------------------------
-- VERIFICATION-DOCS bucket policies
-- Private. The expert owner can read/upload their own docs; admins can read all (review).
-- Path convention: <expert_profile_id>/<filename>
-- ---------------------------------------------------------------------------
drop policy if exists "verification_docs_read_owner_or_admin" on storage.objects;
create policy "verification_docs_read_owner_or_admin"
  on storage.objects for select
  using (
    bucket_id = 'verification-docs'
    and (
      exists (
        select 1 from public.expert_profiles ep
        where ep.id::text = (storage.foldername(name))[1]
          and ep.user_id = auth.uid()
      )
      or public.is_admin()
    )
  );

drop policy if exists "verification_docs_insert_own" on storage.objects;
create policy "verification_docs_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'verification-docs'
    and exists (
      select 1 from public.expert_profiles ep
      where ep.id::text = (storage.foldername(name))[1]
        and ep.user_id = auth.uid()
    )
  );

drop policy if exists "verification_docs_delete_admin" on storage.objects;
create policy "verification_docs_delete_admin"
  on storage.objects for delete
  using (bucket_id = 'verification-docs' and public.is_admin());

commit;
