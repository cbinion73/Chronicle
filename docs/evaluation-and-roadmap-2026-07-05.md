# Chronicle — Comprehensive Evaluation & Implementation Roadmap

_Date: 2026-07-05. Produced from a four-track deep review (frontend, backend/data, build/deploy/tests, AI/Bible/voice) of the repo at commit `d047f883`._

---

## 1. Executive summary

Chronicle's product layer is genuinely strong: the persona/agent-mode AI prompt system is better-designed than most hobby AI apps, the Bible data architecture (lazy-loaded static JSON, manifests, promise caches, no secrets in the browser bundle) is sound, cross-page formation context threading is thoughtful, and the codebase is remarkably TODO-free.

The structural problem is one decision that everything else inherits: **the entire backend lives inside a 5,637-line `vite.config.ts` as dev-server middleware.** That single fact causes:

- Production (chronicle.teambinion.org) runs the **Vite dev server**, unminified, with HMR, on the public internet.
- **Zero authentication** on every endpoint — journal/prayer data, sync export, AI proxy, DB CRUD are world-readable/writable.
- The Mac desktop app must ship `node_modules`, `src/`, and `vite.config.ts` to work → **1.4 GB bundle**.
- The desktop app silently broke when Postgres replaced JSON snapshots (nothing provides Postgres on a user's machine).
- `tsc -b` currently **fails (5 errors)** inside the config's CRUD handlers, so `npm run build` is red — and CI auto-deploys to prod as root with no checks, so nothing noticed.

**Three findings need action before anything else** (they are live on the public host today):

1. **Remote command execution** — `/api/voice/transcribe` and TTS accept the executable path from the client request body and `spawn` it (`vite.config.ts:3505`, `:3587`).
2. **Arbitrary file read** — `/api/study-imports/pdf?sourcePath=...` serves any file the process can read (`vite.config.ts:4093`), and `.env.local` (OpenAI key, DB URL, API.Bible key) is baked into the Docker image because there is no `.dockerignore`.
3. **Open OpenAI proxy / LiveKit mint / HA token exfiltration** — anyone can spend on your OpenAI key (`:3353`), mint publish-capable LiveKit JWTs (`:3842`), or redirect the Home Assistant API call to their own host and capture your HA bearer token (`:3474`).

**→ Immediate actions: take the public deployment down (or firewall it), rotate every key in `.env.local`, then execute Phase 0 below.**

Good news verified along the way: no secrets ever committed to git history; no secrets reach the browser bundle; the Prisma schema itself is clean; heavy Bible data is fetched lazily, not bundled.

---

## 2. Scorecard

| Area | Grade | One-line verdict |
|---|---|---|
| Product/feature design | A− | Seven-pillar vision is coherent and mostly built; persona system excellent |
| Frontend architecture | C | Route-splitting good; 3 giant pages, 3 competing sources of truth, stub UI presented as working |
| Data layer / sync | D+ | Schema fine; sync merge loses edits, deletions resurrect, three uncoordinated write paths |
| Security | F | Unauthenticated public server with RCE + file-read + open AI proxy |
| Build/deploy/CI | D | Build is red, dev server in prod, deploy-on-push as root with zero gates |
| Desktop packaging | D | 1.4 GB, ships node_modules + own source, hard Postgres dependency |
| Tests | C− | 23 scenario-shaped Playwright tests, but not installable from clean clone, mutate the real DB |
| Docs | C | PRD strong; `data-architecture.md` describes a Tauri+SQLite system that no longer exists |

---

## 3. Phased implementation plan

### Phase 0 — Stop the bleeding (hours, do immediately)

| # | Action | Where |
|---|---|---|
| 0.1 | Take chronicle.teambinion.org offline or firewall it to your IP | VPS |
| 0.2 | **Rotate** OpenAI, API.Bible, LiveKit, Home Assistant keys; assume current values compromised (they are inside every Docker image built) | `.env.local` + providers |
| 0.3 | Add `.dockerignore`: `.env*`, `node_modules`, `data/`, `dist*`, `.git`, `test-results`, `_bmad*` | new file |
| 0.4 | Add a bearer-token auth middleware wrapping **all** `/api/` routes (checked against `CHRONICLE_API_TOKEN` env); frontend sends it from a login gate or build-time config | `vite.config.ts` (interim), client fetch helpers |
| 0.5 | Kill client-supplied executables/URLs: ignore `config.whisperCli.command` / `config.piper.command` / `config.homeAssistant.baseUrl` from request bodies — env-only; whitelist HA domains/services (`tts`, `media_player`) | `vite.config.ts:3474-3610` |
| 0.6 | Constrain `sourcePath`/`pdfPath` query/body params with the existing `isWithinChronicleManagedData()` (vite.config.ts:698) on all `/api/study-imports/*` handlers | `vite.config.ts:4093-4255` |
| 0.7 | Fix the 5× TS2783 build errors: strip `id` from spread bodies in the CRUD upserts (`const { id: _drop, ...fields } = data`) | `vite.config.ts:5301,5351,5401,5451,5490` |
| 0.8 | Fix the Prayer-page phantom autosave: `prayerText` initializes to a hardcoded sample prayer and auto-writes it to the DB 2.5 s after every mount | `src/pages/Prayer.tsx:36-65` |

### Phase 1 — Real server + trustworthy deploy (1–2 weeks)

The keystone refactor. Everything in Phases 1a–1c falls out of it.

**1a. Extract the API from `vite.config.ts` into `server/`** (Hono or Express):
- Move all middlewares (AI chat, voice, study-imports, chronicle-sync, `/api/data` CRUD, LiveKit) into route modules.
- One auth gate + per-IP rate limit + consistent error envelope at the top.
- Zod validation per model; whitelist patchable fields; map Prisma errors → 400/404/409, sanitized 503 when DB is down; add `/api/health`.
- POST = `create` (201, 409 on conflict), PUT = update; UUIDs instead of `entry-${Date.now()}`.
- Serve built `dist/` statically. Vite config shrinks to ~50 lines with a dev proxy to the server.

**1b. Fix Docker + CI:**
- Multi-stage Dockerfile: build → `node server/index.mjs`. Secrets only via runtime env.
- CI workflow gating deploy: `npm ci` → `tsc -b` → `eslint` → `vite build` → Playwright vs. docker-compose Postgres. Deploy job runs only when green; non-root SSH user; build image in CI, pull on the box.
- Move `@prisma/client` to `dependencies`; demote `vite`/`livekit-server-sdk` once the server owns them.

**1c. Make tests installable and isolated:**
- `npm i -D @playwright/test`; add `playwright.config.js` with `webServer` + `baseURL`; delete `tests/testUrls.js`.
- Point tests at a throwaway Postgres (docker-compose service), seed via API, truncate between specs.
- Untrack `test-results/`, `_bmad*`; add unit tests for `chronicleVersioning`/`chronicleSync` (the riskiest pure logic).

### Phase 2 — Data integrity: one source of truth (1–2 weeks)

The current model has three write paths and a merge that loses data.

1. **Postgres is the source of truth for collections.** `initializeFromDatabase` merges by `(id, updatedAt)` instead of clobbering; stop persisting `chronicleEntries`/`ownedBooks`/`prayerItems` in the zustand `partialize` (persist UI prefs only) — also fixes the looming 5 MB localStorage quota corruption.
2. **Delete `_upsertAppStateToDb`** (the bulk snapshot-export write path); per-entity CRUD is the only writer.
3. **Tombstones:** add `deletedAt` to synced models; deletes set it; merges honor it. Fixes "deleted entries resurrect."
4. **Merge clock:** stamp `updatedAt` on every mutation and use it (not the day-granularity `date`) as the conflict winner; fix `mergePrayerItems` (`timesPrayed` max → sum of deltas; `answered` honors latest edit).
5. **Offline outbox:** queue failed writes (localStorage), replay on reconnect, surface sync status in the topbar — makes "local-first" true instead of "fire-and-forget with console.warn."
6. Fix `upsertOwnedBook` create/update branch (existing-check runs after the `set()`, so create is dead code — `src/store/index.ts:455-474`); diff before upserting library records so mounting Discipleship doesn't fire N no-op PUTs.
7. Wire `resetPersonalState` / snapshot import/merge to the API (bulk endpoints) so they survive reboot.
8. Schema: migrate `String` dates → `DateTime`; add `@@index` on `date`/`createdAt`; promote `studyState.entriesByDay` out of the JSON blob into a `study_day_entries` table keyed `(bookId, day)`.
9. Prune sync snapshots to last N; fix snapshot-id quoting at write time; delete dead `data/schema.sql`; rewrite `docs/data-architecture.md` to match reality.

### Phase 3 — Frontend health (2–3 weeks, incremental)

1. **Decompose `Settings.tsx` (3,254 lines)** into per-category components mounted on demand; persist the ~30 currently-fake toggles via the already-built-but-unused `/api/data/settings`; wire or remove the no-op controls (Export .md/PDF buttons, profile selects with `onChange={() => {}}`) — the header says "Changes saved automatically" and today that is false.
2. **Stabilize `Bible.tsx` (3,097 lines):** one navigation reducer for `book/chapter/provider`, one-way (debounced) sync to the store instead of the fragile two-way mirror; cache comparison chapters keyed on chapter (today every verse click refetches up to 3 full chapters); memoized `<VerseRow>` so Psalm 119 doesn't re-render 176 rows per click.
3. **Entry/prayer edit & delete UI** — the API client and backend routes exist; the user currently cannot modify or remove anything they write. Table stakes for a journal.
4. **Bundle:** lazy-load `AIChatPanel` (removes react-markdown from the entry chunk); dynamic-import the 1,802-line generated MasterLife data; extract the study-library types/helpers duplicated between Settings and Discipleship (~300 lines); collapse the six `saveAs*` clones in AIChatPanel.
5. **Honesty pass on Today:** compute the "welcome back" banner from real entry dates (today it always shows); remove hardcoded "Obedience: 3 moments / 38%" and stat padding; update-not-create on prayer autosave (today each pause creates a new near-duplicate entry).
6. **Accessibility:** convert clickable `<div>`s to buttons (book picker, mode cards, search results); dialog semantics + focus trap on modals; stop hijacking right-click app-wide (`AppShell.tsx:146` — use a floating selection button instead); enable `strict: true` in tsconfig and lint `scripts/`/`electron/`/`tests/`.

### Phase 4 — Desktop + offline story (1–2 weeks)

1. **Desktop DB:** packaged builds use SQLite (Prisma supports it via env-switched datasource) or pglite — removes the hard Postgres dependency that currently breaks packaged desktop launch.
2. **Slim packaging:** with the server extracted (Phase 1), ship only `dist/` + an esbuild-bundled server + electron files. Expect 1.4 GB → ~400 MB (remaining bulk is Bible/study data); drop the duplicate copy into Application Support; delete stale root `main.mjs` and the hardcoded-path launch-agent script.
3. **True offline (web/tablet):** service worker caching app shell + manifests + visited chapters (IndexedDB); today "local-first" means "same-origin fetches to a local server" and there is no SW at all.
4. Move the 271 MB study library out of Vite's `public/` copy path (separate static mount or download-on-demand via the existing `install:study-resources` flow) — cuts `dist/` by ~80% and every build's copy time. Also: rights check on OCR'd commercial workbooks (MasterLife, Experiencing God) before any public/shared deployment.

### Phase 5 — Feature enhancements (the differentiators)

1. **Streaming AI + cancel:** SSE from the OpenAI Responses API through the server, incremental render in AIChatPanel, `AbortController`. Biggest perceived-quality win per line of code. Use the structured `input` message array (today history is flattened to one string — loses role fidelity, invites injection); delimit untrusted journal context; set `max_output_tokens`; log usage.
2. **RAG over your own Chronicle** — the flagship feature the PRD's "Grounded AI Companion" pillar implies. pgvector is one Prisma migration away; embed journal entries/prayers on write; inject top-k retrieved formation history into `reflection_guide`/`prayer_guide` modes. Turns "chat with page context" into "companion that remembers your walk." Similarly feed the already-built cross-reference/Strong's/commentary JSON into `bible_study_agent` as retrieved evidence instead of relying on model memory.
3. **Finish or shelve LiveKit voice:** the web app can mint a token but nothing joins a room (`livekit-client` isn't even a dependency); the Python agent is a 37-line scaffold. Either complete the loop (room join UI, agent deploy docs, requirements pinning) or label the Settings button experimental.
4. **Export pillar:** the PRD lists export as MVP; today the Chronicle/Settings export buttons are no-ops. Markdown/JSON export of entries is a trivial blob download; PDF via server-side render later.
5. **Long-thread memory:** AI history is truncated to the last 10 messages with no summarization; add rolling thread summaries. Cap/LRU the persisted `conversations` map (currently grows without bound in localStorage).
6. **Insights honesty:** replace remaining fabricated stats with `formationAnalytics`-derived values; the analytics module is already good — surface it.

---

## 4. Suggested sequencing

```
Week 0   Phase 0 (hours — security triage, build fix)
Weeks 1–2  Phase 1 (server extraction, CI, tests)   ← keystone
Weeks 3–4  Phase 2 (data integrity)                 ← protects user data
Weeks 5–7  Phase 3 (frontend health), start Phase 5.1/5.4 (streaming, export — small)
Weeks 8–9  Phase 4 (desktop/offline)
Weeks 10+  Phase 5.2/5.3 (RAG, voice)
```

Phases 3 and 4 are parallelizable; Phase 5.1 (streaming) can ride along any time after Phase 1.

---

## 5. Detailed findings index

The four full review reports (frontend, backend/data, build/deploy/tests, AI/Bible/voice) contain ~60 file:line-level findings backing every item above. Highest-severity index:

| Sev | Finding | Location |
|---|---|---|
| CRIT | Client-supplied executable spawned (RCE) | vite.config.ts:3505, :3587 |
| CRIT | Arbitrary file read via sourcePath | vite.config.ts:4093-4179 |
| CRIT | `.env.local` baked into Docker image (no .dockerignore) | Dockerfile:16 |
| CRIT | Zero auth on all endpoints, public host | vite.config.ts:5560 |
| CRIT | Vite dev server is the production server | Dockerfile:24, package.json:12 |
| CRIT | Build red (5× TS2783), auto-deploy anyway | vite.config.ts:5301+ / deploy.yml |
| HIGH | HA token exfiltration via client baseUrl | vite.config.ts:3474 |
| HIGH | Open LiveKit token mint / OpenAI proxy | vite.config.ts:3842 / :3353 |
| HIGH | Deletions resurrect (no tombstones; bulk upsert path) | vite.config.ts:4888, chronicleSync.ts |
| HIGH | Merge uses journal `date` as conflict clock; wholesale overwrite | chronicleSync.ts:36-49 |
| HIGH | `initializeFromDatabase` clobbers local state incl. `[]` | src/store/index.ts:671-691 |
| HIGH | `upsertOwnedBook` create path dead (existing-check after set) | src/store/index.ts:455-474 |
| HIGH | Phantom sample prayer auto-saved on Prayer mount | src/pages/Prayer.tsx:36-65 |
| HIGH | Playwright not installable; tests mutate real DB | package.json, tests/ |
| HIGH | Desktop ships node_modules/src (1.4 GB); needs Postgres it doesn't have | package.json build block |
| HIGH | ~30 Settings toggles fake under "saved automatically" banner | src/pages/Settings.tsx:417-446 |
