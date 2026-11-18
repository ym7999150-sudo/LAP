# LabVerse 3D

An interactive 3D science laboratory for students and teachers: build real DC circuits, run validated chemistry reactions with realistic pouring, bubbling and flame effects, follow guided experiments, and earn server-validated XP. Arabic (RTL) and English.

> Branding lives in `src/lib/brand.ts` (or set `NEXT_PUBLIC_APP_NAME`).

---

## Feature status

Legend: ✅ implemented & covered by automated tests · 🟢 implemented, checked manually in the browser · 🟡 implemented, not yet verified in a browser · 🔶 partial / simplified · ⬜ future

### Core simulation
| Feature | Status |
|---|---|
| DC circuit solver (Modified Nodal Analysis, dense LU with pivoting) | ✅ |
| Ohm's law, KCL/KVL, series/parallel, dividers, power | ✅ |
| Batteries with internal resistance, switches, push buttons, fuses (blow + re-solve) | ✅ |
| Open-circuit, short-circuit, disconnected / partially connected, unsupported-component diagnostics | ✅ |
| Ammeter, voltmeter, ohmmeter (separate solve with sources zeroed), multimeter | ✅ |
| Diodes & LEDs (piecewise-linear, iterative) | ✅ 🔶 |
| Capacitor (open) / inductor (winding R) — DC steady state only | ✅ 🔶 |
| Thermistor (Beta model), LDR (power-law approximation), electromagnet field indicator, compass | ✅ 🔶 |
| AC, transient RC/RL/RLC, transistors, MOSFETs, op-amps, relays, oscilloscope | ⬜ (in catalog, labelled "not simulated yet") |
| Chemistry engine: deterministic replay of add / pour / heat / empty operations | ✅ |
| 26 atom-balanced reactions (neutralisation, precipitation, displacement, acid–metal, acid–carbonate, decomposition, catalysis, combination, combustion) | ✅ |
| Limiting reagent, ΔT for neutralisation, pH (strong acid/base; tabulated hints otherwise), indicators | ✅ 🔶 |
| Unknown combinations reported as unsupported (never invented) + documented non-reactions | ✅ |
| Periodic table: 118 elements, IUPAC atomic weights, configurations with documented exceptions | ✅ |

### 3D editor
| Feature | Status |
|---|---|
| R3F scene, lab bench, procedural environment lighting, shadows, quality levels | 🟢 |
| Drag objects on the table with grid snap (mouse & touch) | 🟢 |
| Wire tool: press terminal → drag cable → snap to terminal (hover or nearest-terminal fallback for touch) | 🟡 |
| Current-flow particles only on conducting wires; bulb glow ∝ power; motor speed; switch lever; meter displays | 🟡 |
| Undo/redo, duplicate, rotate, delete, scale, multi-select (shift-click), keyboard shortcuts | 🟡 |
| Chemistry: pour animation (vessel lifts and tilts, droplet stream, splash), ghost reagent bottle, spatula granules | 🟡 |
| Bubbles, precipitate flakes and settled layer, colour transitions, steam, smoke, flame, magnesium flash | 🟡 |
| Steel-wool pad: drag off a tuft into a crucible; burning throws sparks | 🟡 |
| Procedural Web-Audio sound effects (pour, fizz, sparks, burner roar, buzzer, motor, clicks) | 🟡 |
| GLB/GLTF loader with normalisation, caching and procedural fallback (`AssetModel`) | 🟡 (no third-party models shipped yet) |
| WebGL capability check + error boundary | 🟡 |

### Platform
| Feature | Status |
|---|---|
| Name-only guest sessions (random UUID, HMAC-hashed token, HTTP-only cookie) | ✅ 🟢 |
| Projects: create, autosave, rename, duplicate, delete, versions, export/import JSON, share links, revoke | ✅ |
| Ownership enforced server-side | ✅ |
| XP ledger with unique `(user_id, reward_key)` → idempotent even under concurrent requests | ✅ |
| Server re-simulates scenes / replays chemistry before granting rewards | ✅ |
| 50 levels, 15 achievements | ✅ |
| Leaderboards: global / physics / chemistry / circuit / experiment × all-time / week / month, ties, pagination, personal rank | ✅ |
| Guided experiments (17) + Punnett square simulator + geologic timeline | 🟡 |
| Egyptian Grade 9 Term 1 mapping | 🔶 **draft — not verified against the official 2026–2027 textbook** |
| Searchable, paginated catalog API (components, substances, reactions) | 🟡 |
| Content reports + admin review queue (admin via `ADMIN_USER_IDS`) | 🟡 |
| Postgres-backed rate limiting, same-origin (CSRF) checks, body-size limits | ✅ (rate limit) 🟡 (others) |
| Arabic / English with RTL | 🟢 |
| Teacher classrooms, multiplayer, biology/optics/mechanics labs, account linking | ⬜ |

---

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Motion · Zustand · Zod · React Three Fiber 9 / Drei 10 / Three.js · Drizzle ORM · Neon Postgres (serverless HTTP driver) · PGlite (local dev & tests only) · Vitest.

## Project structure

```
src/
  app/                    pages (App Router) and API route handlers (app/api/*)
  components/lab/         3D editor: Scene, SceneObject, Wires, PourFx, chemFx, models/, panels/
  components/learn/       Punnett square, geologic timeline
  lib/sim/circuit/        renderer-independent MNA solver (+ tests)
  lib/chem/               elements, formula parser, substances, reactions, engine (+ tests)
  lib/registry/           component registry (add new components here)
  lib/scene/              versioned scene-document schema, migration & import validation
  lib/curriculum/         experiments, completion criteria, server-only answer key
  lib/gamification/       levels & achievements config
  lib/db/                 Drizzle schema, client (Neon / PGlite), idempotent seed
  lib/server/             sessions, services, rewards, HTTP helpers (+ tests)
drizzle/                  SQL migrations
scripts/                  migrate.ts, seed.ts
```

## Local development

Requirements: Node.js 20+ (tested with Node 24).

```bash
npm install
cp .env.example .env        # fill in values (see below); or leave DATABASE_URL empty to use embedded PGlite
npm run db:migrate          # only when DATABASE_URL points at Neon
npm run db:seed             # idempotent; safe to re-run
npm run dev                 # http://localhost:3000
```

Without `DATABASE_URL`, development uses an embedded PGlite database in `./.data/pglite` that is migrated automatically. PGlite is refused in production.

### Checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Environment variables

| Name | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | server | Neon **pooled** connection string (`…-pooler…`) used at runtime |
| `DIRECT_URL` | scripts | Neon **direct** connection string used by `db:migrate` / `db:seed` |
| `SESSION_SECRET` | server | ≥ 32 chars, HMAC key for session tokens. `openssl rand -hex 32` |
| `ADMIN_USER_IDS` | server | Comma-separated internal user UUIDs with admin rights |
| `NEXT_PUBLIC_APP_NAME` | public | Optional brand name |

Never commit `.env`. Only `NEXT_PUBLIC_*` values reach the browser.

## Deploying to Vercel

1. Push the repository to GitHub and import it in Vercel (framework preset: Next.js).
2. In **Project → Settings → Environment Variables** add `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET` (and optionally `ADMIN_USER_IDS`) for Production and Preview. Use a separate Neon branch for Preview if you want isolated data.
3. Run migrations and seed against the production database (from your machine or CI):
   ```bash
   DIRECT_URL="postgresql://…" npm run db:migrate
   DIRECT_URL="postgresql://…" npm run db:seed
   ```
   Alternatively set the Vercel build command to `npm run db:migrate && next build` (requires `DIRECT_URL` at build time).
4. Deploy. Check `https://<your-app>/api/health` → `{"ok":true,"database":"neon"}`.

Notes:
- The app uses Neon's HTTP driver (`@neondatabase/serverless` + `drizzle-orm/neon-http`), which works in Vercel Node.js functions. XP grants are single SQL statements (CTEs), so no interactive transactions are needed.
- No route writes to the local filesystem in production.
- Rate limits are stored in Postgres (`rate_limits`) so they hold across serverless instances. Old rows can be pruned with `DELETE FROM rate_limits WHERE window_start < now() - interval '2 days'`.

## Accounts and recovery

A display name is **not** identity verification. The guest identity is an HTTP-only cookie; clearing cookies or switching browsers loses access and there is currently no recovery. The schema keeps `users.linked_account` so email/OAuth linking can be added later without losing projects or XP.

## Security notes

- Server-side validation (Zod) of every body; scene documents are pure data and re-validated on import and save (size, schema version, object counts, known component types, valid terminals).
- Session tokens are random 256-bit values; only their HMAC is stored.
- Mutating requests require a same-origin `Origin` header (plus SameSite=Lax cookies).
- Rewards: the client sends only the scene; the server recomputes the circuit / replays the chemistry and grants each reward key once.
- Quiz answers live in `src/lib/curriculum/answers.ts`, which is imported only by server code.

## Backups

Neon provides point-in-time restore on its paid plans and branching on all plans. Before risky migrations create a branch (`neonctl branches create`) or take a `pg_dump` with `DIRECT_URL`. Seed scripts only upsert reference tables and never delete user data.

## Limits and costs

The free tiers of Vercel and Neon are suitable for development and small classes. Neon free compute auto-suspends (cold starts of a few hundred ms). Leaderboards aggregate the `xp_transactions` table with indexes; for very large user counts, pre-aggregate into `leaderboard_snapshots` on a schedule. Nothing here is "unlimited".

## Troubleshooting

- **`database_not_configured` (503)** – `DATABASE_URL` missing in production.
- **`SESSION_SECRET must be set`** – add a 32+ character secret.
- **Blank 3D viewport** – the browser has no WebGL; the editor shows a message. Try another browser or enable hardware acceleration. Lower *Graphics quality* in Settings on weak devices.
- **`bad_origin` (403)** – requests must come from the same origin as the app (check proxies set `Host`/`X-Forwarded-Host`).

## Content & assets

See [ASSETS.md](ASSETS.md) for the asset manifest, licences and how to add GLB models, and `src/lib/chem/reactions.ts` for reaction provenance.
