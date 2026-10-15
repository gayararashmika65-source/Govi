# GoviSahana — Bridging Rural Farmers with Verified Agricultural Experts

A full-stack, database-backed smart agriculture platform for Sri Lanka that connects **farmers** with verified **agricultural experts**, **enterprises**, **workers**, and **crop buyers** — to close the knowledge gap, improve access to advice, create income opportunities, and modernize farming.

> **Note on stack:** The original brief proposed React + Vite + Supabase. This implementation is built on the available environment stack — **Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Prisma (SQLite) + custom secure session auth** — which delivers the same capabilities (real relational DB, secure auth, role-based authorization, file uploads, realtime-ish messaging) in a more capable full-stack framework. See *Stack mapping* below.

---

## ✨ Features

### Public website (single-page app shell with view switching)
- **Home** — hero, quick actions, services, how-it-works, featured verified experts, join-as roles, knowledge hub preview, CTA
- **Find Agricultural Experts** — search + filter verified experts by district & crop
- **Agricultural Knowledge Hub** — searchable articles with categories
- **Agricultural Marketplace** — product listings (fertilizer, seeds, equipment, irrigation)
- **Crop Listings** — farmer harvest listings with filters
- **Agricultural Jobs & Services** — job listings + service/machinery listings
- **Crop Buyer Requirements** — buyer demand listings
- **About / Contact / Privacy / Terms** pages

### Six role-based dashboards (all database-backed)
| Role | Key capabilities |
|------|------------------|
| **Farmer** | Report crop problems (with photos), find experts, request consultations, message, view case history, list crops for sale |
| **Agricultural Expert** | Case queue, accept cases, submit structured recommendations, message farmers, manage consultations, submit verification documents |
| **Agricultural Enterprise** | CRUD product listings, receive farmer enquiries, manage business profile |
| **Agricultural Worker** | Browse jobs, apply with cover note, list services (machinery/labour), manage applications |
| **Crop Buyer** | Post crop requirements, browse farmer listings, send enquiries |
| **Administrator** | Verify experts/enterprises, manage & suspend users, moderate reports, view platform stats & audit logs |

### Core consultation workflow
`Open → Under Review → Assigned → In Progress → Resolved → Closed` (with cancel/decline states). Farmers create cases with photos → matched experts notified → expert accepts → secure messaging → expert submits diagnosis & advice → case resolved with full history retained.

### Security
- Passwords hashed with **scrypt** (salted)
- Sessions are **HMAC-signed tokens** in **httpOnly, SameSite=Lax** cookies (7-day expiry)
- **Server-side authorization** on every API route (`requireUser`, `requireRole`, `requireAdmin`) — permissions are never trust the frontend
- File uploads validated by type (JPG/PNG/WebP/GIF/PDF) and size (max 5MB)
- Admin actions recorded in **audit logs**
- Private consultations/messages only accessible to the farmer & expert involved

---

## 🚀 Getting started

### Prerequisites
- Node.js 18+ and [Bun](https://bun.sh)
- An `.env` file (see `.env.example`)

### Installation
```bash
bun install
```

### Configure environment
```bash
cp .env.example .env
# then edit .env and set:
#   DATABASE_URL  (SQLite path)
#   AUTH_SECRET    (run: openssl rand -hex 32)
#   SESSION_COOKIE (e.g. gs_session)
```

### Set up the database
```bash
bun run db:push     # create/sync the SQLite schema
bun run db:seed     # load demo accounts + sample data
```

### Run the dev server
```bash
bun run dev
```
Open the **Preview Panel** (the app is served on port 3000, but in this sandbox use the right-hand preview, or "Open in New Tab").

### Demo accounts (password: `password123`)
| Role | Email |
|------|-------|
| Farmer | `farmer@demo.lk` |
| Agricultural Expert | `expert@demo.lk` |
| Enterprise | `enterprise@demo.lk` |
| Worker | `worker@demo.lk` |
| Buyer | `buyer@demo.lk` |
| Administrator | `admin@demo.lk` |

---

## 🗄️ Database

- **ORM:** Prisma · **DB:** SQLite (file-based, zero-config)
- **Schema:** `prisma/schema.prisma` (25+ models: users, 5 role profiles, expert verifications, agricultural cases + attachments, consultations, messages, recommendations, availability slots, products, services, crops, buyer requirements, jobs, applications, enquiries, knowledge articles, notifications, reports, audit logs)
- **Seed:** `prisma/seed.ts` → `bun run db:seed`

### Re-seed / reset
```bash
bun run db:seed          # add demo data (note: articles/cases use create, re-running duplicates them)
bun run db:push          # re-sync schema (accepts data loss on structural changes)
```

---

## 🧱 Project structure

```
prisma/
  schema.prisma          # full database schema
  seed.ts                # demo data
src/
  app/
    page.tsx             # SPA app shell + view router (the only user-visible route)
    layout.tsx          # root layout, fonts, toasters
    globals.css         # green agricultural theme
    api/                # all backend routes (auth, cases, consultations, marketplace, admin, ...)
  lib/
    auth.ts             # scrypt hashing, HMAC session tokens, getSession/requireRole
    db.ts               # Prisma client
    store.ts            # Zustand store + api() fetch helper (client)
    types.ts            # shared domain types, districts, crops, constants
    server-helpers.ts   # notify(), audit(), error helpers
  components/
    govisahana/
      navbar.tsx, footer.tsx
      badges.tsx, common.tsx
      shared/            # image-upload, messaging-panel
      views/             # public views (home, experts, marketplace, ...)
      dashboards/        # shell + 6 role dashboards + case-detail + messaging
    ui/                  # shadcn/ui component library
```

---

## 🔌 API overview

All routes use `credentials: 'include'` and enforce server-side authorization.

| Area | Endpoints |
|------|-----------|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| Profile | `GET|PUT /api/profile`, `POST /api/experts/verify` |
| Experts | `GET /api/experts`, `GET /api/experts/[id]` |
| Cases | `GET|POST /api/cases`, `GET|PATCH /api/cases/[id]`, `POST /api/cases/[id]/assign` |
| Consultations | `GET|POST /api/consultations`, `GET|PATCH /api/consultations/[id]`, `GET|POST /api/consultations/[id]/messages` |
| Recommendations | `POST /api/recommendations` |
| Marketplace | `/api/products`, `/api/crops`, `/api/services`, `/api/jobs`, `/api/buyer-requirements` (+ `[id]`) |
| Applications | `GET|POST /api/jobs/[id]/applications`, `PATCH /api/jobs/[id]/applications/[appId]` |
| Enquiries | `GET|POST /api/enquiries` |
| Knowledge | `GET /api/knowledge`, `GET /api/knowledge/[id]` |
| Notifications | `GET /api/notifications`, `PATCH /api/notifications/read` |
| Upload | `POST /api/upload` |
| Admin | `/api/admin/stats`, `/api/admin/verify`, `/api/admin/users`, `/api/admin/reports`, `/api/admin/audit` |
| Aggregated | `GET /api/my` (dashboard data) |

---

## 🧪 Testing

### Manual testing (all six roles)
1. Log in with each demo account above and explore the dashboard.
2. **Farmer:** *Report a Problem* → create a case with photos → find an expert → request a consultation → message.
3. **Expert:** *Case Queue* → open a case → add a recommendation → message the farmer.
4. **Enterprise:** add a product → view enquiries.
5. **Worker:** browse jobs → apply → list a service.
6. **Buyer:** post a crop requirement → browse crops → enquire.
7. **Admin:** verify experts/enterprises, manage users, view stats & audit logs.

### Automated checks
```bash
bun run lint     # ESLint (Next.js + TypeScript rules)
bun run db:push  # validate schema
```
End-to-end browser verification was performed with Agent Browser across home, login, farmer/expert/admin dashboards, case detail, and messaging.

---

## 🔒 Security notes
- The service-role-equivalent (admin) privileges are **not** self-serviceable — only the seeded `admin@demo.lk` has the ADMIN role. In production, admins are provisioned via a trusted server-side process.
- No secrets are exposed to the client. All authorization is enforced in API routes.
- File uploads are restricted by MIME type and size; files are stored on disk under `public/uploads` and paths are saved in the DB.

---

## 📦 Deployment

The app is configured for standalone Next.js output (`next.config.ts` → `output: "standalone"`).

```bash
bun run build
bun run start
```
Deploy to Vercel, Netlify, or any Node host. Point `DATABASE_URL` at a persistent SQLite volume (or migrate the Prisma schema to Postgres/MySQL by changing the `datasource` provider). Set `AUTH_SECRET` to a strong random value in production.

---

## 🗺️ Stack mapping (brief → this implementation)

| Brief asked for | Implemented with | Why |
|-----------------|------------------|-----|
| React + Vite | **Next.js 16 (App Router)** | Available, more capable full-stack framework |
| Supabase Auth | **Custom scrypt + HMAC httpOnly sessions** | Real secure auth with role-based server authorization |
| Supabase Postgres | **Prisma + SQLite** | Same normalized relational schema, zero-config local DB |
| Supabase RLS | **Server-side authorization in every API route** | Equivalent role/ownership checks enforced on the server |
| Supabase Storage | **Local file storage** (`/public/uploads`) | Validated uploads, DB stores paths |
| Supabase Realtime | **Polling-based messaging/notifications** | Reliable in-app realtime (WebSocket mini-service can be added) |

---

## 🧭 Feature status

**Fully implemented:** auth (all 6 roles), profiles & onboarding, role-based dashboards, agricultural case workflow with image upload, expert discovery & verification, consultations, secure messaging, recommendations, notifications, knowledge hub, product/crop/service/job/buyer-requirement marketplaces with CRUD & enquiries, job applications, admin verification/moderation/stats/audit.

**Demo/placeholder:** Contact form (no backend delivery — toasts confirmation). Social links are decorative. Market-price/weather/AI features below are **not** wired to live data.

**Requires external configuration (future):** Sinhala AI assistant, AI crop disease detection (image model), smart cultivation planner, market-price intelligence, email/SMS/push delivery, real payment processing (no payments are processed — listings are informational).

---

## 📄 License
Built for educational/demonstration purposes for Sri Lankan agriculture.
