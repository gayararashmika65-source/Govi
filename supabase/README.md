# GoviSahana (GoviConnect) — Supabase Backend

A complete, production-grade Supabase schema with **Row Level Security (RLS)** on every table, role-based access control, file storage policies, and admin verification workflows.

> **Note on the running app:** the local Next.js app in this repo currently runs on **Prisma + SQLite** with custom session auth (zero external dependencies for local dev). These Supabase migrations are the **production-ready schema** you apply to a real Supabase project when you want to migrate the backend to managed Postgres + Supabase Auth + Supabase Storage. The schema mirrors the Prisma schema one-to-one so the data model is identical.

---

## 📁 What's in here

```
supabase/
├── README.md                          ← this file
├── migrations/
│   ├── 00001_profiles_and_roles.sql    ← enums, profiles, user_roles, is_admin()/is_role() helpers
│   ├── 00002_role_profiles.sql         ← farmer/expert/enterprise/worker/buyer profiles + expert_verifications
│   ├── 00003_cases_and_consultations.sql ← agricultural_cases, attachments, consultations, messages, recommendations, availability
│   ├── 00004_marketplace.sql           ← products, services, crops, buyer_requirements, jobs, applications, enquiries
│   ├── 00005_content_and_admin.sql    ← knowledge_articles, notifications, reports, audit_logs
│   ├── 00006_rls_policies.sql          ← RLS enabled + policies on EVERY table (the security core)
│   ├── 00007_storage.sql              ← 3 storage buckets + storage object policies
│   └── 00008_triggers.sql             ← handle_new_user trigger + assign_role/verify_expert/verify_enterprise/suspend_user SECURITY DEFINER functions
└── tests/
    ├── 0001_signup_and_role_escalation.sql
    ├── 0002_case_and_messaging_isolation.sql
    └── 0003_marketplace_and_admin.sql
```

---

## 🚀 Setup instructions

### Option A — Supabase Cloud (recommended)

1. **Create a project** at [supabase.com](https://supabase.com) (free tier is fine).
2. Open **SQL Editor** → **New query**.
3. Apply the migrations **in order**, one file at a time, executing each:
   ```
   00001_profiles_and_roles.sql
   00002_role_profiles.sql
   00003_cases_and_consultations.sql
   00004_marketplace.sql
   00005_content_and_admin.sql
   00006_rls_policies.sql
   00007_storage.sql
   00008_triggers.sql
   ```
   Each migration is wrapped in `begin; … commit;` and is **idempotent** (uses `if not exists` / `on conflict do nothing`), so re-running is safe.
4. Copy your **Project URL**, **anon key**, and **service_role key** from *Project Settings → API*.
5. Add them to your app's environment (`.env`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...     # public, safe for client
   SUPABASE_SERVICE_ROLE_KEY=eyJ...         # SERVER-ONLY, never expose
   ```
6. **Provision the first admin manually** (signup-as-admin is blocked):
   - Sign up normally with a regular account (e.g. role=FARMER).
   - In the SQL editor, run **as the service role**:
     ```sql
     update public.profiles set role = 'ADMIN' where email = 'you@example.com';
     insert into public.user_roles (user_id, role, note)
       select id, 'ADMIN', 'Initial admin provisioned manually' from public.profiles where email = 'you@example.com';
     ```
   - From now on, that admin can promote other users via the `assign_role()` function (called from your authenticated admin API route).

### Option B — Local Supabase CLI

```bash
# Install once
npm install -g supabase

# In the project root
supabase init
# copy the .sql files into supabase/migrations/ (already done — these files ARE that)
supabase start                       # spins up local Postgres + Auth + Storage via Docker
supabase db push                     # applies all migrations

# Run the policy tests
supabase db reset                    # clean state
psql "$LOCAL_DB_URL" -f supabase/tests/0001_signup_and_role_escalation.sql
psql "$LOCAL_DB_URL" -f supabase/tests/0002_case_and_messaging_isolation.sql
psql "$LOCAL_DB_URL" -f supabase/tests/0003_marketplace_and_admin.sql
```

---

## 🔐 Security model — what's enforced

### Privilege escalation is impossible

1. **At signup** — `create_profile_for_new_user()` trigger reads the requested role from `raw_user_meta_data` and **rejects `ADMIN`** with an exception. Users can only self-register as FARMER, EXPERT, ENTERPRISE, WORKER, or BUYER.
2. **Via direct UPDATE** — the `profiles_update_own` policy compares `(role, status)` to the **existing row's** values, so even if a client sends `role='ADMIN'` in an UPDATE payload, the DB rejects it:
   ```sql
   with check (id = auth.uid()
     and (role, status) = (select role, status from public.profiles where id = auth.uid()))
   ```
3. **Via admin function only** — role changes go through `assign_role()`, which checks `is_admin()` server-side. The function is `SECURITY DEFINER` and only granted to `authenticated`.
4. **Experts cannot self-verify** — the `expert_profiles_update_own` policy pins `verified` to the existing value. Only `verify_expert()` (admin-only) can flip it.
5. **Enterprises cannot self-verify** — same pattern via `enterprise_profiles_update_own`.

### Row-level isolation

| Table | Who can read |
|-------|--------------|
| `profiles` | self + admins |
| `farmer_profiles` | self + experts (for cases) + buyers + admins |
| `expert_profiles` | verified experts (public) + self + admins (unverified hidden) |
| `enterprise_profiles` | verified (public) + self + admins |
| `agricultural_cases` | case farmer + assigned expert + admins (+ experts see OPEN queue) |
| `case_attachments` | case participants only |
| `consultations` | farmer + expert + admins |
| `messages` | **only the two consultation participants** + admins |
| `expert_recommendations` | case participants |
| `product_listings` / `crop_listings` / `service_listings` | all authenticated users see `available=true`; owners see their hidden ones |
| `job_listings` / `buyer_requirements` | all authenticated see `status='OPEN'`; owners see all their own |
| `job_applications` | the worker + the job owner + admins |
| `enquiries` | sender + recipient only |
| `notifications` | owner only (inserts blocked for clients; only `notify_user()` SECURITY DEFINER can write) |
| `audit_logs` | **admin-only read** (writes blocked for clients; only `write_audit_log()` can insert) |
| `reports` | reporter (own) + admins |
| `knowledge_articles` | all authenticated users read; admin-only write |

### Storage bucket policies

| Bucket | Public read | Write | Read |
|--------|-------------|-------|------|
| `avatars` | ✅ | owner (path = `<uid>/...`) | anyone |
| `case-attachments` | ❌ | case farmer (path = `<case_id>/...`) | case farmer + assigned expert + admin |
| `verification-docs` | ❌ | expert owner (path = `<expert_profile_id>/...`) | expert owner + admins |

File type + size are enforced at the bucket level (`allowed_mime_types`, `file_size_limit`).

### Defense-in-depth via SECURITY DEFINER functions

These bypass RLS in a controlled way for system actions, then REVOKE public execute:
- `notify_user()` — inserts a notification for a user (used by triggers when one user acts on another)
- `write_audit_log()` — records an audit entry
- `assign_role()` — admin promotes/demotes a user (also writes user_roles history + audit log + notification)
- `verify_expert()` / `verify_enterprise()` — admin approves/rejects a verification document
- `suspend_user()` — admin suspends/reactivates a user

All check `is_admin()` internally; the role check reads from `public.profiles`, never from the request.

---

## 🧪 Testing the policies

The `tests/` directory contains three SQL scripts. Each block documents its **expected outcome** in a comment.

### How to run them

In the Supabase SQL editor (or `psql`), execute each test file. The scripts use:

```sql
set request.jwt.claim.sub = '<user-uuid>';   -- impersonate this user for RLS
-- ... a query ...
reset request.jwt.claim.sub;                 -- reset
```

> ⚠️ **Test users are created in the first test file** (TEST 0 setup block). They are inserted directly into `auth.users` with `crypt()`-hashed passwords — this requires the **service_role** key, not the anon key. Run the setup block once before the assertion blocks.

### Test coverage

| File | What it verifies |
|------|------------------|
| `0001_signup_and_role_escalation.sql` | Signup creates a profile + role-specific profile; **ADMIN signup is blocked**; users **cannot** self-promote via UPDATE; users **cannot** edit other users' profiles; `assign_role()` rejects non-admins |
| `0002_case_and_messaging_isolation.sql` | Owner reads own case; **other farmers cannot** see it; experts **can** see OPEN cases; **non-participants cannot** read/send messages on a consultation; both participants can |
| `0003_marketplace_and_admin.sql` | Non-owner **cannot** delete/update a listing; worker can apply to a job **once** (unique constraint); **non-workers cannot apply**; worker **cannot self-accept** their application; job owner can; expert **cannot self-verify**; admin **can** verify via `verify_expert()`; unverified experts are hidden from other experts |

### Expected results summary

| Test | Expected |
|------|----------|
| 1.1 profile auto-created on signup | `role=FARMER`, `status=ACTIVE`, `has_farmer_profile=true` |
| 1.2 ADMIN signup | **ERROR**: "Self-registration as ADMIN is not permitted." |
| 1.3 self-promote to ADMIN via UPDATE | `role=FARMER` (unchanged) |
| 1.4 edit another user's profile | name unchanged |
| 1.5 `assign_role()` as non-admin | **ERROR**: "Only administrators may assign roles." |
| 2.1 owner reads own case | n=1 |
| 2.2 other farmer reads the case | n=0 |
| 2.3 expert sees OPEN cases | n≥1 |
| 2.5 non-participant reads messages | n=0 |
| 2.6 non-participant sends a message | **ERROR**: new row violates row-level security policy |
| 2.7a farmer reads own messages | n=1 |
| 2.7b expert reads consultation messages | n=1 |
| 3.1 non-owner deletes listing | n=1 (still exists) |
| 3.2 non-owner updates listing | price unchanged |
| 3.3a worker applies to job | n=1 |
| 3.3b second application by same worker | **ERROR**: duplicate key (unique constraint) |
| 3.3c non-worker (farmer) applies | 0 rows inserted (RLS reject) |
| 3.4a worker self-accepts application | `status=PENDING` (unchanged) |
| 3.4b job owner accepts | `status=ACCEPTED` |
| 3.5 expert self-verifies | `verified=false` (unchanged) |
| 3.6 admin verifies via `verify_expert()` | `verified=true`, `status=APPROVED` |
| 3.7 verified expert sees unverified expert's profile | n=0 (hidden) |

---

## 🔄 Migrating the running app from Prisma/SQLite to Supabase

When you're ready to point the live app at Supabase instead of SQLite:

1. Apply these migrations to your Supabase project (see Setup above).
2. Install the Supabase client:
   ```bash
   bun add @supabase/supabase-js
   ```
3. Create `src/lib/supabase.ts`:
   ```ts
   import { createClient } from '@supabase/supabase-js'
   export const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
   )
   // Server-only client with service role (for admin actions)
   export const supabaseAdmin = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY!,
     { auth: { autoRefreshToken: false, persistSession: false } }
   )
   ```
4. Replace the auth flow in `src/lib/auth.ts`:
   - `hashPassword`/`verifyPassword` → `supabase.auth.signInWithPassword()`
   - `setSessionCookie`/`clearSessionCookie` → use Supabase's session management
   - Pass `role` in `signUp({ email, password, options: { data: { role, name, phone } } })` — the `handle_new_user` trigger picks it up.
5. Replace the Prisma queries in each `/api/*` route with `supabase.from('table').select()/insert()/update()/delete()`. RLS now handles authorization — many of your manual `requireRole()` checks become redundant (but keep them as defense-in-depth).
6. Replace `/api/upload` with `supabase.storage.from('avatars'|'case-attachments'|'verification-docs').upload()`.
7. Delete `prisma/`, `src/lib/db.ts`, `src/lib/auth.ts` (or keep as a thin wrapper), and the `db:*` scripts.

The schema is identical, so the data shapes your components already expect don't change.

---

## 🛠️ Maintenance notes

- **Re-run safety:** every migration is idempotent. Re-running won't break anything.
- **Reset & re-apply** locally: `supabase db reset` then `supabase db push`.
- **Adding a new table/migration:** name it `00009_<name>.sql`, enable RLS, add policies, wrap in `begin; … commit;`.
- **Adding a new role:** add it to the `user_role` enum (migration), then add role checks in policies that should care.
- **Auditing sensitive actions:** always call `select public.write_audit_log(null, 'ACTION', target, detail)` from your API routes after destructive/privileged operations.
