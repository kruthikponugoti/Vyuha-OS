# Vyuha OS

**Run your entire business by talking to AI.** An AI operating system for SMEs that replaces
separate CRM, ERP, Inventory, HR, Finance, Projects and Analytics tools with one AI-driven
platform. Type or speak a command — the Copilot executes it against your real data.

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **shadcn-style** component kit, customised to the design tokens (deep indigo + one accent blue)
- **Supabase** — Postgres + Auth + Realtime + Storage
- **Gemini 2.0 Flash** with function calling
- **Recharts** for charts, **jsPDF** for invoice/report PDFs

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
```

With **no keys set**, Vyuha OS runs in **demo mode**: an in-memory store seeded with the same data
as `supabase/seed.sql`, exposed through the exact same query API the Supabase client uses, plus a
deterministic NL router that drives the same Copilot tools. Everything works — auth (role picker),
all 11 modules, CRUD, the Copilot, charts, PDFs.

### Going live

1. Create a Supabase project. In the SQL editor run `supabase/schema.sql`, then `supabase/seed.sql`.
   Realtime is enabled on `products`, `orders`, `invoices`, `notifications`; RLS is scoped by
   business and gated by role on every table.
2. Get a Gemini API key (Google AI Studio).
3. Fill `.env.local`:
   ```
   GEMINI_API_KEY=...
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
4. Restart. The same code now uses Postgres, Supabase Realtime, and Gemini function calling.

Regenerate `supabase/seed.sql` from the single source of truth with `npm run gen:seed-sql`.

## What's inside

| Area | What it does |
| --- | --- |
| **Landing** | Public marketing site — hero with animated Copilot preview, features, industries, pricing, FAQ |
| **Auth** | Email/password + Google OAuth, email verification, password reset, org-based onboarding, 8 roles |
| **Dashboard** | Live KPIs, business-health score, AI insights, charts, activity — all from real queries |
| **AI Copilot** | Gemini function calling over 14 tools; confirms destructive actions; animated step traces |
| **CRM** | Customers (+ detail/activity), leads, deal pipeline kanban |
| **Inventory** | Products (barcode), suppliers, warehouses, stock movements, purchase orders, demand forecast |
| **Finance** | Invoices/quotations (+ PDF), expenses, payments, P&L, cash flow, finance dashboard |
| **HR** | Employees, attendance grid, leave approvals, payroll runs |
| **Projects** | Project cards, task kanban, calendar, comments |
| **Analytics** | Sales/revenue/customer/product dashboards, forecasting, AI recommendations |
| **Documents** | Generate business reports and invoices as PDF; document library |
| **Knowledge Base** | Upload docs, keyword/semantic search, Copilot answers questions from them (RAG) |
| **Settings** | Business, team + roles, notifications, security, billing (UI), audit log |

## Architecture notes

- **One data layer** (`lib/db`) exposes an identical query API whether backed by Supabase or the
  local demo store, so every module is written once and runs in both modes.
- **One services layer** (`lib/services.ts`) holds the real business operations (create order,
  record payment, update stock…). The Copilot tools and the module UIs both call it, so an action
  taken by voice and one taken by clicking go through the same validated, audited path.
- **RBAC** is enforced in the UI (`canWrite`), in every server action, and at the database via RLS
  — the three mirror one exact write matrix.

## Things to try in the Copilot

- "How's the business doing this month?"
- "How much stock of Oak Bookshelf is left?"
- "Record an order from Ananya Reddy — 2 Cane Lounge Chair" (watch the step animation)
- "Who hasn't paid yet?" · "Draft a payment reminder for Sterling Hotels"
- "What is our return policy?" (answered from the Knowledge Base)
