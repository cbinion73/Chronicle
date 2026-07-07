# Chronicle Rebuild — Refactor Plan & Architecture Decisions

Chronicle is being rebuilt from raw material into a structured formation
engine built around **the Thread** — the lifelong record of a person's walk
with God. Full vision: the "A Decade of Formation" document. This file is
the engineering plan.

## What is preserved (the only three things)

1. **The mission** — Know / Understand / Live / Teach / Pass On Scripture.
2. **The user's data** — no destructive migrations, ever. Additive only.
3. **Baptist Beads** — its spiritual intent is untouchable. It becomes the
   founding member of the Prayer Paths system, not a one-off feature.

## Architecture assessment of the v1 codebase

| Verdict | What | Decision |
|---|---|---|
| Good — reuse | Bible provider stack, scripture reference parsing, formation analytics libs, prayer follow-up model, store CRUD + DB sync, standalone server, PWA layer | Kept as-is |
| Average — improve | Baptist Beads component (hardcoded to one sequence) | Generalized into `PrayerPathPlayer` + data-driven paths |
| Poor — replace | `Today.tsx` (a dashboard of nine competing panels), three-way overlap of Chronicle/Legacy/Insights as sibling pages, 11-item flat navigation | Deleted / consolidated (see below) |

## The new information architecture: five rooms on one spine

| Room | Route | Absorbs | Purpose |
|---|---|---|---|
| **Today** | `/` | Today (deleted) | The Daily Office: Call → Word → Silence → Prayer → Response. Finite. Ends. |
| **The Word** | `/bible` `/study` `/discipleship` `/plans` `/themes` | unchanged pages, one room | Reading and study at every depth |
| **Prayer** | `/prayer` | Prayer + Prayer Paths | Intercession, guided paths, the record of answered prayer |
| **The Thread** | `/thread` (+`/thread/story`, `/thread/patterns`) | Chronicle, Legacy, Insights | One room, three views: Record / Story / Patterns |
| Settings | `/settings` | — | recedes |

Old routes (`/chronicle`, `/legacy`, `/insights`) permanently redirect into
the Thread room. Nothing a user bookmarked breaks.

## The Thread (data model)

Phase-1 implementation is a **unified read model**, not a table migration:
`src/lib/thread.ts` derives a single `ThreadEvent[]` timeline from
`chronicle_entries` + `prayer_items` (added/prayed/answered events). All new
features (Office responses, completed Prayer Paths) write through the
existing entry store into this spine. Physical table unification is
Milestone 2, once the read model has proven the shape — this is deliberate:
migrate schemas after the domain model stabilizes, not before.

## Prayer Paths

`src/data/prayerPaths.ts` defines the schema (steps: section, instruction,
scripture, prayer, imagery). Baptist Beads is path #1, generated from the
existing `baptistRosary.ts` data verbatim — same 68 beads, same stones, same
words. The Daily Examen and the Lord's Prayer path ship alongside as proof
that paths are data, not code. `PrayerPathPlayer` replaces `BaptistRosary`
(same full-screen phone behavior, same imagery, same keyboard nav).
Completing any path writes to the Thread.

## Obsidian Bridge

Chronicle owns its data; Obsidian is the knowledge garden. The bridge is
server-side, gated on `OBSIDIAN_VAULT_PATH` (unset in cloud → feature hides):

- **Export**: thread entries → `<vault>/Chronicle/*.md` with frontmatter
  (id, date, type, passage). **Prayers are excluded by default.**
- **Import**: markdown dropped in `<vault>/Chronicle Inbox/` becomes thread
  notes; imported files move to `Chronicle Inbox/Imported/`.
- No client-supplied paths — the vault root comes only from server env
  (consistent with the Phase-0 security posture).

## Deleted in this phase

- `src/pages/Today.tsx` + `Today.module.css` (~900 lines) — replaced by the Office
- `src/components/BaptistRosary.tsx` — generalized into `PrayerPathPlayer`
- Chronicle/Legacy/Insights as top-level destinations (pages remain as
  views inside the Thread room; their full merge is Milestone 2)

## Build order (Phase 1 branch: redesign/foundations)

1. Restore point ✅  2. Prayer Paths  3. Daily Office  4. Thread room
5. Room navigation  6. Obsidian Bridge  7. Tests + verification

---

## Milestone 2 (branch: redesign/milestone-2) — the Thread becomes physical

Two additive Prisma models, migration `20260707140115_add_thread_events_and_memory_verses`:

- **`ThreadEvent`** — the durable, queryable projection over
  `chronicle_entries` + `prayer_items` that `src/lib/thread.ts` was deriving
  client-side only. Now mirror-written **server-side** on every entry/prayer
  create/update/delete (`server/chronicleApi.ts` → `mirrorEntryToThread` /
  `mirrorPrayerToThread`), so it's correct regardless of which client made
  the change — not dependent on the browser tab that's currently open.
  `scripts/backfill-thread-events.mjs` populates it once for data that
  predates the mirror-writes (run once per environment after migrating).
  The client-side derivation in `thread.ts` remains untouched — it's still
  what the UI reads instantly, offline-first. The table exists for
  durability, cross-device consistency, and future services (the Question
  Lab, analytics) to query without loading every entry.
- **`MemoryVerse`** — the Scripture Memory Engine's data model: SM-2-family
  spaced-repetition state (ease factor, interval, repetitions, due date) per
  memorized verse.

## Scripture Memory Engine (v1)

Flagged in the Phase 1 report as the highest formation-value-per-
engineering-hour item in the whole vision — shipped, no AI required.

- `src/lib/memoryEngine.ts` — pure SM-2 scheduling (`reviewVerse`), due-list
  filtering, and a first-letter recall prompt ("For God so loved the world"
  → "F G s l t w") so a reviewer self-tests before revealing.
- `src/pages/Memory.tsx` (`/memory`, new nav entry under The Word) — plant a
  verse, review what's due, grade honestly (Struggled / Good / Easy), browse
  the planted "Garden."
- **Folded into the Daily Office**, not a separate habit to remember: when
  verses are due, a quiet one-line nudge appears in the Word station with a
  "Review now →" link — exactly the pattern the vision called for ("the 90
  seconds that saves a fading verse").
- Full CRUD API (`/api/data/memory-verses`), store actions
  (`addMemoryVerse`/`reviewMemoryVerse`/`deleteMemoryVerse`), merge-on-fetch
  in `initializeFromDatabase`, and local persistence — the same pattern as
  every other collection in the store.

## Scoped out of Milestone 2 (documented, not silently skipped)

`memoryVerses` was **not** wired into `resetPersonalState` /
`importPortableState` / `mergePortableState` / the portable-snapshot export —
those touch `mergePortableSyncState` and the snapshot schema, which need
their own careful audit rather than a drive-by change. A user who resets or
imports a portable snapshot today keeps their memory verses untouched rather
than having them reset/merged correctly. Tracked as follow-up debt.
