# LedgerLite

**An AI receipt and expense tracker for small shop owners in India.**
Snap a photo of a bill and the AI reads the vendor, date, total and GST. You check it and save. LedgerLite then shows where the money went, warns you before you go over budget, and answers plain questions like *"How much GST did I pay this financial year?"*

Built with Next.js 16 (App Router), TypeScript (strict), Tailwind CSS v4, PostgreSQL (Neon), Prisma 7, Auth.js v5, the Vercel AI SDK with Google Gemini, and Vercel Blob.

---

## Features

| | |
|---|---|
| **Accounts** | Email + password (scrypt-hashed) and optional "Continue with Google". Every user sees only their own data. |
| **Expenses** | Add, edit, delete, filter by month, category, payment mode or text. Amounts are GST-inclusive, paid by cash, UPI or card. CSV export for your accountant. |
| **Receipt scanning** | Phone camera upload, shrunk in the browser. Gemini extracts vendor, date, total, CGST+SGST/IGST, GSTIN, line items and a suggested category. You always review before saving. |
| **Budgets** | A monthly limit per category, with "on track / close to limit / over budget" status and a pace marker for how far through the month you are. |
| **Dashboard** | Month total vs the same days last month, GST paid, 6-month trend, spend by category, top vendors, cash/UPI/card split. |
| **Ask** | Natural-language questions answered from your own records through safe, read-only AI tools. |
| **Works without keys** | No Gemini key? Receipts still upload and you type the details. No Blob token locally? Files go to `.local/uploads`. |

## Architecture

```
Browser ──► proxy.ts (optimistic auth redirect)
   │
   ├─ Server Components (pages) ──► src/server/* ──► Prisma ──► Postgres (Neon)
   │        every function takes userId and filters by it
   │
   ├─ Server Actions (forms) ── requireUserId() + Zod validation on every call
   │
   ├─ Route handlers: /api/auth/*, /api/expenses/export, /api/receipts/[id]/image
   │
   └─ AI (Vercel AI SDK → Gemini)
        ├─ extract-receipt.ts : image → Zod-typed JSON (Output.object)
        └─ ask.ts             : question → tool loop → answer
                                  tools are read-only and closed over userId
```

**Folder guide**

```
prisma/               schema, migrations, seed (6 months of demo data)
src/app/(auth)/       login + signup pages and their server actions
src/app/(app)/        signed-in pages: dashboard, expenses, receipts, budgets, ask, categories
src/app/api/          Auth.js handlers, CSV export, private receipt images
src/components/       UI primitives (ui/), charts, feature components
src/lib/              pure helpers, safe on client and server: dates, money, csv, validation
src/server/           server-only data access, AI, storage, session
src/auth.ts           Auth.js configuration
src/proxy.ts          Next 16 "proxy" (formerly middleware)
tests/unit/           fast tests for pure logic and the AI extractor (mocked model)
tests/integration/    tests against real Postgres: user isolation, SQL injection, AI tool loop
```

## Run it locally

You need Node 22+ and a Postgres database: either a free [Neon](https://neon.tech) project, or Postgres on your Mac.

```bash
npm install                      # also generates the Prisma client
cp .env.example .env             # then fill in DATABASE_URL and AUTH_SECRET
npx prisma migrate deploy        # create the tables
npm run db:seed                  # optional: demo shop with 6 months of data
npm run dev                      # http://localhost:3000
```

The demo login is in [`prisma/seed.ts`](prisma/seed.ts) (`DEMO_EMAIL` / `DEMO_PASSWORD`). It's for local development only.

<details>
<summary>Using Postgres on your Mac instead of Neon (Homebrew)</summary>

```bash
mkdir -p .local && initdb -D .local/pgdata -U postgres --auth=trust
pg_ctl -D .local/pgdata -o "-p 54329" -l .local/pg.log start
createdb -h localhost -p 54329 -U postgres ledgerlite
# .env:  DATABASE_URL="postgresql://postgres@localhost:54329/ledgerlite"
```
`.local/` is git-ignored. Stop it with `pg_ctl -D .local/pgdata stop`.
If startup fails with "postmaster became multithreaded", prefix the command with `LC_ALL=en_US.UTF-8`.
</details>

### Environment variables

| Variable | Required | What it's for |
|---|---|---|
| `DATABASE_URL` | yes | Pooled Postgres URL (Neon `-pooler` host) used by the app |
| `DIRECT_URL` | Neon only | Direct URL for `prisma migrate` (the pooler can't run migrations) |
| `AUTH_SECRET` | yes | Signs session cookies: `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | no | Shows "Continue with Google" when both are set |
| `GOOGLE_GENERATIVE_AI_API_KEY` | no | Free key from Google AI Studio. Turns on receipt reading and Ask |
| `AI_MODEL` | no | Gemini model id (default `gemini-flash-latest`) |
| `BLOB_READ_WRITE_TOKEN` | on Vercel | Private Vercel Blob store for receipt images |

All of these are checked with Zod when the server starts ([`src/lib/env.ts`](src/lib/env.ts)), so a typo fails loudly at boot instead of mid-request.

## Deploy to Vercel

1. Push to GitHub, then **Import** the repo on vercel.com.
2. **Storage → Create → Blob** and connect it to the project. This adds `BLOB_READ_WRITE_TOKEN`.
3. Add `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` and (optionally) the Gemini and Google keys under **Settings → Environment Variables**.
4. Apply migrations once against Neon: `npx prisma migrate deploy` (with `DIRECT_URL` in your local `.env`).
5. Deploy. For Google sign-in, add `https://<your-app>.vercel.app/api/auth/callback/google` as an authorised redirect URI.

## Scripts

| Script | What it does |
|---|---|
| `dev` / `build` / `start` | Next.js |
| `lint` / `typecheck` | ESLint / route-type generation + `tsc --noEmit` |
| `test` / `test:watch` | Vitest. Integration tests run when `DATABASE_URL` points at a real database |
| `db:migrate` | Create + apply a migration in development |
| `db:deploy` | Apply existing migrations (CI / production) |
| `db:seed` | Demo user, budgets and sample expenses (`SEED_RESET=1` to regenerate) |
| `db:studio` | Browse the database in Prisma Studio |

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs lint, typecheck, all tests against a Postgres service container, and a production build on every push and pull request.

---

## How it's kept secure

- **Per-user data isolation, in three layers.** Every query in `src/server/` includes `userId` in its `WHERE` clause, so another user's id just looks "not found". Composite foreign keys `(categoryId, userId)` mean Postgres itself refuses to link your expense to someone else's category. The AI tools take `userId` from the session through a closure, never from the model.
- **Server Actions are treated as public endpoints.** Each one re-checks the session (`requireUserId()`) and re-validates input with Zod, whatever the browser form already checked. IDs passed with `.bind()` come from the browser and can be tampered with, so they are always combined with `userId`.
- **The proxy is only an optimisation.** `proxy.ts` redirects signed-out visitors early, but pages and actions never rely on it.
- **Passwords:** scrypt with a random salt, constant-time comparison, and a dummy hash for unknown emails so login timing doesn't reveal which accounts exist.
- **Uploads:** file type is detected from the bytes ("magic numbers"), not the name. Random storage names. A 4 MB cap. Private Blob storage served only through an ownership-checked route with `no-store` caching (shop phones are often shared).
- **AI:** the model never writes SQL. It fills typed tool parameters, results are capped, and the one raw query uses Prisma's parameterised tagged template (tested with an injection string). Text printed on receipts is treated as data, and every extraction is reviewed by a person before it's saved.
- **Other:** open-redirect protection on `callbackUrl`, CSV formula-injection escaping, security headers, and env validation.

## Design decisions and trade-offs

| Decision | Why | Trade-off |
|---|---|---|
| `Decimal(12,2)` for money, strings end to end | Floats can't represent 0.1 exactly; ledgers must add up | Need `toNumber()` at the display edge |
| `@db.Date` for expense dates; "today" computed in IST | A bill from 11:30 pm shouldn't land on the next day in UTC | Must format dates in UTC everywhere |
| JWT sessions | Auth.js Credentials provider requires them; no DB hit per request | Can't revoke a single session instantly (30-day expiry) |
| Google accounts link to an existing email | Google verifies email ownership | Don't enable this for providers that don't verify |
| Server Actions + `useActionState`, URL-based filters | Sign-in, expense and filter forms work even before JavaScript loads; filters are bookmarkable | Server round-trip per filter change |
| AI extraction runs inline in the upload action | Simple; one photo takes 5–15 s | Bulk uploads would want a background queue |
| Browser shrinks images to 1600 px JPEG | Faster on mobile data, under Vercel's 4.5 MB limit, fewer AI tokens, strips GPS EXIF data | A little sharpness lost on huge bills |
| Gemini via the Vercel AI SDK | Free tier; swapping provider is a one-file change ([`src/server/ai/model.ts`](src/server/ai/model.ts)) | Free-tier rate limits |
| Hand-rolled CSS charts | No chart library weight; accessible by default | Fewer chart types |
| One standing budget per category | Matches how shop owners think ("₹3,000 for electricity") | No budget history per month |

## Testing

```bash
npm test
```

- **Unit:** dates (IST boundary, impossible dates), money parsing, CSV escaping, password hashing, open-redirect guard, file-type sniffing, Zod schemas, and AI-output sanitising.
- **AI with a mocked model:** the extractor's success, "not a receipt", and off-schema paths. No API key or network needed.
- **Integration (real Postgres):** user A can never see user B's data through the AI tools, a SQL-injection string is harmless, and the full "model calls a tool, then answers" loop works.

## Known limitations and next steps

- No login rate limiting yet. Next step: Upstash Redis or Vercel Firewall rate rules on `/login`.
- No email verification or password reset (would need an email provider such as Resend).
- Budgets don't keep history; recurring expenses (rent, salaries) aren't automated.
- Receipt extraction is synchronous; a background job (Vercel Workflow / queue) would handle bulk uploads.
- Hindi / regional-language UI.
