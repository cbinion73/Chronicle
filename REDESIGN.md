# Chronicle Rebuild — Refactor Plan & Architecture Decisions

Chronicle is being rebuilt from raw material into a structured formation
engine built around **the Thread** — the lifelong record of a person's walk
with God. This file is the engineering log of each shipped milestone.
The founding vision lives in [VISION.md](VISION.md); the forward execution
plan lives in [ROADMAP.md](ROADMAP.md).

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

---

## Milestone 3 (branch: redesign/milestone-3) — the Biblical Knowledge Graph seed

`src/data/knowledgeGraph.ts` — a **curated, not generated** graph: 60 people
and 28 places spanning the whole canon (primeval history through the
apostolic church), each with a summary, real Scripture references, and typed
relationships (`father-of`, `spouse-of`, `ruled`, `prophet-to`, `mentored`,
`betrayed`, etc). Every edge is validated to resolve to a real node (checked
programmatically before shipping — no dangling relationship targets). This
is the entity layer the vision calls for above the existing verse-level
cross-reference data (`src/lib/bibleCrossReferences.ts`, which already covers
that layer well via the KJV study cross-reference dataset).

Deliberately hand-curated rather than pulling in an external dataset
(Theographic/OpenBible) sight-unseen this session — licensing, format, and
scale (the full vision is ~3,000 people / ~1,300 places) all deserve their
own pass. This seed establishes the correct architecture (typed entities,
typed relationships, Scripture-anchored, bidirectional lookups) so that
import is additive later rather than a rewrite.

**Two projections, one new `/explore` room** (`src/pages/Explore.tsx`,
People/Places tabs mirroring the Thread room's tab pattern):
- **Character Network** — browse people, follow relationships in both
  directions (who they relate to, and who relates to them), jump to their
  places.
- **Atlas** — browse places, see who was there, and passage chips that
  jump straight into the Reader. Coordinates are captured on each place now
  (`lat`/`lon`) so a real interactive map is additive later, not a
  re-curation.

Both are read-only over static, bundled data — no new API routes or DB
tables needed for this seed (unlike Milestones 1-2, nothing here writes to
the Thread; browsing the graph doesn't imply "doing" anything). New
Playwright coverage (`tests/explore.spec.js`) exercises the full loop:
search → select a person → follow a relationship → jump to a place →
open a passage in the Bible reader.

---

## Milestone 4 (branch: redesign/milestone-4) — the Study Council

The first feature that makes the **Source Ledger** (every AI claim typed by
source and confidence) real in the product, not just a documented principle.

**Server** (`server/chronicleApi.ts` → `studyCouncilDevApi`,
`POST /api/ai/study-council`): five independent voices reasoning over one
passage — the Exegete (what the text says in its own argument), the
Historian (what it meant to its first hearers), the Canonist (how the whole
Bible reads it), the Churchman (how the church has read it for 20
centuries), and the Berean (Acts 17:11's devoted skeptic). All five are
instructed to tag every paragraph with exactly one source type —
`[SCRIPTURE]` / `[TEXT]` / `[LANGUAGE]` / `[HISTORY]` / `[INTERPRETATION]`
(with a required confidence word: settled/broadly held/disputed/minority/
speculative) / `[APPLICATION]` (always tentative, never a command).

**Sequenced, not parallel, on purpose**: the four seats run concurrently
first; the Berean runs *second*, given their actual answers, and is
instructed to test each one — quote the specific claim, flag overreach or a
missed counter-reading, or say plainly that a claim holds up. This is the
mechanism that keeps the Council from quietly becoming one voice in five
costumes.

**Client** (`src/lib/studyCouncil.ts`): `parseLedgerParagraphs` splits each
seat's raw text on blank lines and extracts the tag + confidence from each
paragraph — a paragraph with no recognized tag still renders (never
silently dropped) labeled `UNTYPED`, which is itself useful signal that a
seat didn't follow the discipline. `src/components/StudyCouncil.tsx` renders
the five seats as cards with colored source badges and confidence pills,
full-screen on phone / centered on desktop (matching PrayerPathPlayer's
established pattern). Entry point: a "⚖ Study Council" button in the Bible
reader's toolbar, seeded with the current chapter's text.

**Testing an AI feature without a live key**: `tests/study-council.spec.js`
mocks the `/api/ai/study-council` network boundary with `page.route` (a new
pattern for this test suite) and verifies the part that's actually ours —
every mocked paragraph renders with its correct tag and confidence badge,
and no paragraph ever renders as `UNTYPED` given a well-formed response.

**Scoped out of Milestone 4**: the Council is invoked manually per passage;
it doesn't yet write anything to the Thread (no "save this council session"
capability), and there's no per-book memory of past Council convenings.
Both are natural Milestone 5+ extensions once the Study Desk (a proper
multi-tab workspace) exists to hold them.

---

## Milestone 5 (branch: redesign/milestone-5) — Study Council sessions join the Thread

Closes both gaps flagged at the end of Milestone 4, deliberately by
**reusing existing infrastructure rather than inventing a parallel
`StudySession` table** — a Council convening is a `chronicle_entries` row of
`type: 'study'`, exactly like every other study entry, so it automatically
gets the Milestone-2 mirror-write into `thread_events`, shows up in the
Thread's Record/Story/Patterns views, and needs zero new migrations.

- **`ChronicleEntrySourceContext.studyCouncil`** (`src/types/index.ts`) — a
  new optional field carrying the *full* typed-and-tagged seat responses
  (not just a plain-text summary), so a saved session can be reopened and
  re-rendered exactly as it appeared, badges and all.
- **"Save to the Thread"** — a footer button on the Council's results view.
  `body` holds a readable plain-text transcript (so it's searchable and
  shows up sensibly in the Record/Story views); `sourceContext.studyCouncil`
  holds the structured data the UI actually re-renders from.
- **"Past Convenings on {passage}"** — the Council's idle screen now lists
  every previously-saved session for the current passage (matched on
  `entry.passage`), each labeled by its question (or "General reading of the
  passage") and date. Clicking one reconstructs the seats and reopens
  instantly — no network call, no re-spending the API cost of five
  responses to look at something already answered.

This is the "resumed after a month" capability from the original vision,
delivered without waiting for the full Study Desk workspace — a session
saved today is already durable, already on the Thread, already reopenable.

**Test-suite hygiene fix, not just new coverage**: both this milestone's
test and the Memory Engine's test from Milestone 2 had a latent bug — they
create real rows in the shared local Postgres DB (chronicle_entries /
memory_verses) and never cleaned them up, so re-running either test
repeatedly during development accumulated duplicate rows and produced
exactly the kind of "strict mode violation: resolved to N elements" and
stale-count failures documented earlier this project. Both specs now clean
their own leftover rows via the `request` fixture before planting fresh
data, matching the cleanup pattern `app-smoke.spec.js` already used for
prayer items.

Verified: tsc -b, eslint, production build, full Playwright suite (`--workers=1`
to remove an unrelated shared-DB race between parallel workers — a pre-existing
test-infra limitation, not something this milestone introduced or needs to fix).

## Milestone 6 (branch: redesign/milestone-6) — the Answered Light

Per the original vision document, this is meant to be one of the most
spiritually significant screens in the product: "the screen for the dry
season" — years of "asked" connected to "answered," in the user's own words,
kept because Scripture itself commands the practice (Deuteronomy 8:2, Psalm
77:11). Deliberately **no AI involved** — this is pure derivation over data
Chronicle already has.

- **`src/lib/answeredLight.ts`** — `deriveAnsweredLight()` filters
  `PrayerItem[]` down to answered requests and computes `daysCarried` (asked
  → answered) per item; `formatCarried()` renders that span in plain
  language ("carried for 3 months"); `groupByYear()` buckets entries for a
  year-sectioned timeline. No new tables, no new migrations — every field
  already existed on `PrayerItem` (`dateAdded`, `dateAnswered`,
  `answerSummary`, `answerPassage`, `timesPrayed`).
- **`src/pages/AnsweredLight.tsx`** (`/prayer/answered-light`) — a timeline
  page: summary stats (answered count, longest carried, prayer touches),
  then a year-grouped list of cards, each showing the asked→answered arc,
  the request text, how long it was carried, the recorded answer, and a
  clickable passage chip that opens the Bible at that reference (reusing
  the same `getBibleNavigationTarget` + `setBibleView` pattern used
  elsewhere in the app).
- **Entry points**: a "Open the Answered Light →" link on the Prayer Room's
  Answered Prayers section header, and a global search quick-link.

**Test-suite hygiene fix, again**: while verifying this milestone against
the full suite, `tests/app-smoke.spec.js` failed with a duplicate-React-key
console error. Investigation showed the spec — unlike every other spec
touched in Milestone 5 — never actually cleaned up its own
`Playwright prayer request for app smoke test` row (a mirror-write into the
real Postgres `prayer_items` table, not localStorage). It had simply never
been run enough times locally to collide with itself before now. Fixed by
giving it the same `request`-fixture cleanup pattern established in
Milestone 5, deleting any prior row with that exact text before the test
creates its own.

Verified: tsc -b, eslint, production build, full Playwright suite
(`--workers=1`) — only the pre-existing, already-confirmed-non-regression
`discipleship-progress.spec.js` failure remains (reproduces identically
against the `v1-pre-redesign` tag).

## Milestone 7 (branch: redesign/milestone-7) — the Growth Spine

Closes the last piece of Phase 2's original vision: a lightweight way to
mark spiritual milestones — baptism, a calling clarified, a season of
doubt resolved — onto the Thread, giving long-arc formation a visible
skeleton the way the Answered Light gave the prayer life one.

- **A new Chronicle entry type, `'growth'`**, reusing the exact same
  infrastructure every other entry type gets — no new table, no migration
  (`ChronicleEntry.type` is a plain `String` column; only the TS union and
  a schema comment needed updating). `ChronicleEntrySourceContext` gained
  an optional `growthMarker: { kind }` field, matching the precedent set by
  Milestone 5's `studyCouncil` field.
- **`src/data/growthMarkers.ts`** — a small curated vocabulary of marker
  kinds (Baptism, Calling Clarified, Conviction, Breakthrough, Commitment
  Made, Season of Doubt Resolved, Other), each with an icon. Deliberately a
  fixed list rather than free text, so the spine reads as a recognizable
  shape at a glance instead of a wall of one-off labels.
- **`NewEntryModal`** gained a sixth type chip ("Growth Marker") and, when
  selected, an inline kind picker that writes `sourceContext.growthMarker.kind`
  alongside the normal title/body/passage fields.
- **A new `--accent-rose` design token** — every other entry type already
  owned one of the app's five existing accent colors, so Growth needed its
  own to stay visually distinct in the Record view's type badges/filters.
- **`src/pages/GrowthMarkers.tsx`**, mounted as a fourth Thread tab
  ("Growth", `/thread/growth`) alongside Record/Story/Patterns — a
  chronological vertical spine of only `type: 'growth'` entries, each
  showing its kind icon/label, date, title, body, and an optional passage
  chip. An "+ Add a Growth Marker" button opens `NewEntryModal` pre-set to
  the growth type.
- **Entry points**: the new Thread tab itself, plus a global search
  quick-link ("The Growth Spine").

Considered and scoped out: teaching Legacy's AI-generated narrative
(`deriveLegacyNarrative`) to treat growth markers as chapter breaks. That's
a real future direction, but it means changing an existing derive function
that many other entries already flow through — riskier than the smallest
real version this milestone needed. The dedicated Growth tab is the
architecturally correct seed: durable, reusable, and additive, without
touching Legacy's existing behavior.

Verified: tsc -b, eslint, production build, full Playwright suite
(`--workers=1`) — only the pre-existing, already-confirmed-non-regression
`discipleship-progress.spec.js` failure remains.

## Milestone 8 (branch: redesign/milestone-8) — the Teaching Loft

Closes the last untouched pillar of the mission: Know, Understand, Live,
**Teach**, Pass On. A saved Study Council convening (Milestone 4/5) already
carries the raw material a teacher needs — every seat's paragraphs tagged
and confidence-scored under the Source Ledger discipline — so turning one
into a shareable outline for a small group or family devotional is pure
derivation, deliberately **no new AI call**.

- **`src/lib/teachingLoft.ts`** — `deriveTeachingOutline(entry)` reads
  `entry.sourceContext.studyCouncil.seats` (the exact shape Milestone 5
  already established) and produces: a **Big Idea** (the first `settled`
  `SCRIPTURE`-tagged paragraph, falling back to any `SCRIPTURE` paragraph,
  falling back to the first paragraph overall), **Key Insights**
  (`SCRIPTURE`/`INTERPRETATION` paragraphs with seat attribution),
  **Where Scholars Disagree** (any paragraph tagged `disputed` or
  `minority` confidence — a distinctive use of the Ledger's own discipline
  that a generic devotional generator couldn't produce), **Discussion &
  Application** (every `APPLICATION`-tagged paragraph, presented directly
  since seats already write these as actionable, group-ready prompts), and
  a **Closing Prayer** line naming the passage. `buildTeachingOutlineMarkdown`
  + `exportTeachingOutline` follow the same `downloadTextFile` pattern
  `chronicleExport.ts` established, for taking the outline out of the app.
- **`src/pages/TeachingOutline.tsx`** (`/thread/teach/:entryId`) — a
  read-only, printable-feeling outline view built from the above sections,
  with an "Export as Markdown" button.
- **Entry point**: a "Create Teaching Outline →" button on the Record
  view's entry cards (`src/pages/Chronicle.tsx`), shown only when
  `entry.type === 'study' && entry.sourceContext?.studyCouncil` — i.e. only
  on entries that actually have teaching material to derive from
  (`hasTeachingMaterial` guards this in both the button and the page).

Considered and scoped out: generating teaching outlines from *any*
Chronicle entry (not just Study Council convenings). Regular entries don't
carry tagged/confidence-scored paragraphs, so an outline built from one
would just be the entry's own text relabeled — not a real derivation. The
smallest real version ties Teaching Loft to the one entry type that
actually has the structured material a teaching outline needs; extending
it to other entry types is a natural future direction once there's a
reason to.

Verified: tsc -b, eslint, production build, full Playwright suite
(`--workers=1`) — only the pre-existing, already-confirmed-non-regression
`discipleship-progress.spec.js` failure remains.
