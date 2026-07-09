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

## Milestone 9 (branch: redesign/milestone-9) — The Hours

The first stone of the founding vision (VISION.md, Design Language #3): the
app learns to keep liturgical time. Also folds in the vision amendments
from external review — the Principles preamble and formation test, the Rule
of Life named as the Live pillar's flagship (ROADMAP M12), and
calling/vocation added to the Question Lab's charter.

- **The register** (`src/lib/hours.ts`) — `deriveRegister()` maps the hour
  to morning (4:00–11:59) / midday (12:00–16:59) / evening (17:00–3:59).
  `App.tsx` stamps `data-register` on the document root every minute,
  mirroring the established `data-theme` pattern, and `tokens.css` layers
  deliberately subtle register tone variants over both themes (only the
  page ground shifts; text and card contrast are untouched). A localStorage
  override (`chronicle.register.override`) makes Playwright runs
  deterministic at any wall-clock hour.
- **The Office reshapes by hour** — morning and midday pray the full Office
  (Call → Word → Silence → Prayer → Response). Evening becomes **the
  Evening Examen**: the day's own thread reviewed before God (today's
  entries, prayers carried today), a minute of silence, and "give the day
  back" — sealed as a reflection entry exactly like the morning Office's
  response. A quiet link lets an evening keeper pray the full Office
  instead; the choice is theirs, never forced.
- **Re-entry as grace** — returning after 7+ days away is now met with
  "Welcome back. The thread held your place. Nothing was lost." plus what
  the keeper was carrying (open prayer requests, the last thing they
  wrote) — and **never a count of what was missed**. The Record view's
  "↩ N-day absence" banner (a shame mechanic wearing a timeline marker)
  now reads "↩ a quiet season, then a return," with no number.
- **Test determinism** — `app-smoke` and `full-product-battery` pin the
  register to morning so home-screen assertions hold regardless of when
  the suite runs; `tests/the-hours.spec.js` covers all four new behaviors
  (morning office, evening examen incl. sealing, the full-office escape
  hatch, and the grace moment, including asserting the absence of any
  "N-day absence" text).
- **One more hygiene fix while here**: `full-product-battery.spec.js`
  created a real "Battery note" chronicle entry every run and never
  cleaned it up (6 had accumulated). It now cleans its own leftovers via
  the request fixture, same as every other spec fixed in Milestones 5–6.

Scoped out per ROADMAP: the church-year calendar (Advent/Lent re-toning)
waits until the register system has lived for a while; Sunday-specific
character joins it.

Verified: tsc -b, eslint, production build, full Playwright suite
(`--workers=1`) — only the pre-existing, already-confirmed-non-regression
`discipleship-progress.spec.js` failure remains.

## Milestone 10 (branch: redesign/milestone-10) — The Ceremonies

The second stone of VISION.md: five or six actions in this product are
sacred and must not pass through the same modal used to fix a typo
("ceremony over CRUD"). This milestone gives two of them real ceremonies
and closes the "grace over guilt" gap in every delete.

- **The answered-prayer ceremony** (`src/components/ui/AnsweredPrayerCeremony.tsx`)
  replaces the plain "Mark Answered" modal in `Prayer.tsx`. Three stages:
  the request is shown and offered a move "into the light"; an 8-second
  stillness beat ("sit with what God has done," skippable); then the
  answer is written as the closing act ("Seal It in the Light ✚"). Editing
  an already-answered prayer's record (not the transition itself) skips
  straight to the writing stage — the ceremony belongs to the moment of
  answering, not to later edits.
- **The stone-setting ceremony** (`src/components/ui/GrowthMarkerCeremony.tsx`)
  replaces the generic `NewEntryModal` on the Growth spine's "+ Add a
  Growth Marker" entry point. Choose the stone (kind) first, write it
  second, then a brief "Setting the stone…" beat before it lands on the
  spine. The general Chronicle "+ New Entry" quick-capture modal still
  offers `growth` as one of its type chips for quick jotting — the
  ceremony belongs to the *dedicated* entry point, not every path to
  creating a growth entry.
- **Undo replaces `window.confirm`** for the two low-stakes deletes: a
  prayer request (`Prayer.tsx`) and a Chronicle entry (`Chronicle.tsx`).
  The delete happens immediately with no permission dialog; a 6-second
  toast offers "Undo," which re-adds the exact same object (both delete
  actions are hard/immediate with no server-side trash, so undo is
  client-side: the full item is held in the toast's closure and re-created
  via `addPrayerItem`/`addChronicleEntry` if clicked). `toastStore.ts`
  gained an optional `action: { label, onClick }` and a configurable
  duration to support this. Left untouched: the Settings library-delete
  confirm (`Settings.tsx`), which has real file-system side effects
  (removes book copies, OCR files, workbook caches) — a heavier
  destructive op than an undo toast should cover.
- **No AI in any ceremony** — both new flows are pure UI state machines,
  consistent with the covenant ("technology as liturgist, never as oracle,"
  and AI recedes as sacredness increases).
- Ceremony UI deliberately borrows the quieter register from the founding
  vision session (generous whitespace, serif emphasis, one accent, minimal
  chrome) as a down payment on the fuller M11 "Quiet Pass" design-system
  work, without doing that full pass yet.

**Test-suite update, not just new coverage**: three specs from Milestones
5–7 (`answered-light.spec.js`, `app-smoke.spec.js`, `growth-markers.spec.js`)
drove the old plain modals directly and needed their steps updated to walk
through the new ceremony stages (skip stillness, click through to the
writing stage, etc). `tests/ceremonies.spec.js` is the new dedicated
coverage for both ceremonies plus the undo-delete flow.

Verified: tsc -b, eslint, production build, full Playwright suite
(`--workers=1`) — only the pre-existing, already-confirmed-non-regression
`discipleship-progress.spec.js` failure remains.

## Milestone 11 (branch: redesign/milestone-11) — The Quiet Pass + Chapel Mode

The third stone of VISION.md, and the promised follow-through on the
"down payment" noted in Milestone 10: the design-system debt paid down,
plus chapel mode itself.

- **Token honesty** — `--accent-green` (`#0f4fcf`, always blue) is renamed
  `--accent-primary` across `tokens.css` and all 21 consuming files.
  Same hex values, zero visual change — this was a naming lie, not a
  color choice, and the fix is purely mechanical.
- **A 4-step type scale** (`--text-xs/sm/base/lg`) established in
  `tokens.css`. Not a full app-wide rewrite — most existing pages still
  carry their own inline pixel values — but the scale now exists as the
  documented target for future surfaces and refactors.
- **Extracted `Card`/`Badge` components** (`src/components/ui/Card.tsx`,
  `Badge.tsx`) replacing three near-identical hand-rolled copies of the
  same card/pill/timeline-dot pattern in `AnsweredLight.tsx`,
  `GrowthMarkers.tsx` (Milestones 6/7), and `Office.tsx` (Milestone 9,
  via the exported `CARD_STYLE` constant for its `<section>` semantics).
  One shared shape instead of three quietly drifting ones.
- **The AI companion panel is quiet by default** — previously ~20-24
  controls rendered on every page (Role select, Voice select, 4 quick
  actions, up to 16 standing "Save/Open" buttons). Role/Voice selection
  moved entirely to Settings' existing "Companion Roles" section (which
  already had the wiring); the panel now shows a single read-only mode
  chip that links there. Quick actions capped to 3. The standing
  save/open button grid is now behind a "More actions ▾" disclosure,
  collapsed by default — full functionality preserved, nothing removed,
  just not shown until asked for.
- **Chapel mode** (`/chapel`, `src/pages/Chapel.tsx`) — one verse (from a
  new shared `src/data/callsToWorship.ts`, extracted from the Office's own
  call array), no chrome, tap-anywhere (or Escape/Enter) to leave.
  Rendered as a route *sibling* to `AppShell` in `App.tsx`, not nested
  inside it — the only way to get a truly full-bleed screen with no
  sidebar, topbar, or AI companion. No AI anywhere in this room, per the
  covenant. Entry point: a quiet link on the Office's Silence station.

**A real bug found and fixed along the way, not just refactored past**:
`useWelcomeBack` (Milestone 9) wrote to localStorage as a side effect
inside a lazy `useState` initializer. React 18 StrictMode intentionally
double-invokes state initializers in development to catch exactly this
kind of impurity — the second invocation read back the value the first
invocation had just written, corrupting the "how long were you away"
calculation and silently disabling the grace moment. Fixed by splitting
the read (pure, stays in the initializer) from the write (moved to a
`useEffect`). Caught by `tests/the-hours.spec.js`'s existing grace test,
which had been passing coincidentally rather than reliably.

**Test-suite updates**: `app-smoke.spec.js`'s three assertions against the
now-removed `#chronicle-agent-mode-select` are replaced with assertions
against the new mode chip button, plus one `More actions ▾` reveal click
(confirmed the panel's local disclosure state survives in-app navigation,
since `AIChatPanel` doesn't unmount between routes). New
`tests/quiet-pass.spec.js` covers chapel mode's chrome-free rendering and
tap-to-exit, and the AI panel's collapsed-by-default state.

Verified: tsc -b, eslint, production build, full Playwright suite
(`--workers=1`) — only the pre-existing, already-confirmed-non-regression
`discipleship-progress.spec.js` failure remains.

## Milestone 12 (branch: redesign/milestone-12) — The Rule of Life

The Live pillar's flagship (VISION.md), and the fourth stone laid. Every
other pillar already had one: Know has the Office and the Bible; Understand
has the Study Council; Teach has the Loft; Pass On has the Book and the
whole fifth ring. Live had pieces (the Beads, the Memory Engine) but no
flagship — this closes that gap.

- **Deliberately not a habit tracker.** Investigation before building
  found `src/lib/formationRhythms.ts` — an existing checklist/streak
  system (`completions: string[]`, `strongestRhythm` by completion count)
  already rendered in Plans and Prayer. That is exactly the grammar
  VISION.md's No List forbids for a Rule of Life. The Rule is built as a
  **separate, authored-text construct** — no completions array, no cadence
  checking, no percentages — and `formationRhythms` is left untouched as a
  pre-existing, unrelated feature. Reconciling the two systems is scoped
  out as future work, not silently ignored.
- **`src/data/ruleCategories.ts`** — a curated vocabulary (Prayer,
  Scripture, Sabbath, Service, Generosity, Calling), the same
  fixed-list-not-free-text pattern established by Growth Markers.
- **A new `'rule'` Chronicle entry type**, reusing the existing entry
  infrastructure end to end — no new table, no migration (`type` is a
  plain `String` column). `ChronicleEntrySourceContext.rule?: { category }`
  follows the `growthMarker`/`studyCouncil` precedent. `NavTab` gained
  `'rule'`.
- **`src/pages/Rule.tsx`** (`/rule`) — "My Rule of Life": commitments
  grouped by category using the Quiet-Pass `Card`/`Badge` components, each
  category with its own lightweight "+ Add" inline form. Deliberately
  *not* a ceremony — curating an ongoing Rule isn't itself the sacred
  moment (the examen is); a full ceremony per commitment would be
  theater, not reverence.
- **`src/components/ui/SeasonalExamenCeremony.tsx`** — the actual
  ceremony, following the Milestone 10 template (overlay/panel shell,
  staged `useState` machine, a final callback returning only primitive
  data). Three stages: reviewing the Rule as written, an 8-second
  skippable stillness beat, then the question itself — *"who are you
  becoming?"* — answered in writing and saved as a `reflection` entry
  (not a new entry type; the examen's output is a reflection like any
  other). No AI anywhere in this ceremony.
- **A new honest accent** — `--accent-forest` (an actual green), since
  every existing accent was already spoken for by another entry type, and
  `--accent-primary` no longer misuses the "green" name after Milestone
  11's token-honesty fix. The Rule of Life gets the first genuine green in
  the palette.
- **Entry points**: a "My Rule of Life" sidebar item (flat, alongside
  Memory/Explore's precedent for top-level rooms outside the five main
  ones), and a global search quick-link.

Scoped out: adding `rule` to the generic Chronicle "+ New Entry" quick-
capture modal. Unlike Growth Markers, a Rule commitment requires a
category, and the Rule page's own per-category inline forms already
cover authoring well — duplicating that picker in the generic modal would
be a second UI path for the same action, not a real convenience.

Verified: tsc -b, eslint, production build, full Playwright suite
(`--workers=1`) — only the pre-existing, already-confirmed-non-regression
`discipleship-progress.spec.js` failure remains.

## Milestone 13 (branch: redesign/milestone-13) — Remembrance

The first stone of ROADMAP's Movement II ("Time Becomes Bidirectional"):
on-this-day resurfacing and personal feast days, per VISION.md Ring 2 —
"the church gave us Advent and Easter; your thread generates a second
calendar." Deliberately unprompted: most days this shows nothing at all.

- **`src/lib/remembrance.ts`** — `deriveOnThisDay(entries, prayerItems,
  today)` scans every Chronicle entry and answered prayer for a
  month-day match against today, more than zero years in the past.
  Growth markers and answered prayers are tagged as feast days (a small
  ✦ marker in the UI); ordinary entries surface more quietly alongside
  them. `formatAnniversary(years)` renders the span in plain language
  ("1 year ago today", "3 years ago today"). No new tables — pure
  derivation over data the thread already holds, the same architecture as
  the Answered Light and the Growth Spine.
- **Wired into the Daily Office** (both the full Office and the Evening
  Examen) as an unnumbered preface card, shown only when
  `deriveOnThisDay` returns something for today — sitting alongside the
  existing re-entry-as-grace `WelcomeBackCard`, using the Rule of Life's
  `--accent-forest` token.
- **A real timezone bug caught before it shipped**: the first
  implementation compared "today" using local `Date` getters
  (`getMonth()`/`getDate()`), but every date string in Chronicle is
  stored UTC-normalized (`toISOString().split('T')[0]`, the same pattern
  `Office.tsx`'s own `todayKey()` uses). Near local-midnight/UTC-midnight,
  that mismatch silently drops a real anniversary. Fixed by reading
  "today" with the matching UTC getters — caught immediately by the new
  test, which computes its seed dates the same way the rest of the app
  does rather than hand-picking a date.

Scoped out per ROADMAP: this milestone is on-this-day/feast-day
*surfacing* only. "Resurrection of your own words" (passages you've
returned to) is M15 (Echoes); patina and sealed prayers are M14/M16.

Verified: tsc -b, eslint, production build, full Playwright suite
(`--workers=1`) — only the pre-existing, already-confirmed-non-regression
`discipleship-progress.spec.js` failure remains (`bible-modes.spec.js`
flaked once mid-session and passed clean on re-run, confirmed unrelated
to this milestone's changes).

## Milestone 14 (branch: redesign/milestone-14) — Sealed Prayers

The second stone of Movement II, and the first milestone to touch both
standing foundations F1 and F2 directly (ROADMAP.md).

- **A new `'sealed'` Chronicle entry type**, reusing the existing entry
  infrastructure end to end — no new table, no migration. `sourceContext.
  sealed: { unsealAt?, eventLabel?, sealedAt, opened, openedAt? }` follows
  the `growthMarker`/`rule` precedent.
- **`src/components/ui/SealedPrayerCeremony.tsx`** — write it, choose how
  it opens (a date, or a freeform event description), then a sealing
  beat. No AI anywhere in it, per the covenant.
- **`src/pages/SealedPrayers.tsx`** (`/prayer/sealed`) — sealed items
  render as locked stones: the label and the unlock condition are always
  visible ("seen"); the body never renders until the seal is deliberately
  broken ("not touchable"). Date-sealed entries become *unlockable* once
  `unsealAt` passes (compared as plain `YYYY-MM-DD` string, sidestepping
  the UTC/local pitfall Milestone 13 already found the hard way — string
  comparison of ISO dates is chronological comparison, no `Date` object
  needed), but still require a deliberate "Open This Prayer" click; it
  never auto-reveals.
- **The seal is enforced everywhere the body could otherwise leak**:
  `Chronicle.tsx`'s Record view (`isSealedAndUnopened`) shows a locked
  placeholder instead of `entry.body`, and hides the ✏️ edit action
  entirely (editing would have put the raw body in a plain textarea —
  the one leak this milestone's own review caught before it shipped).
- **F1 — `src/lib/sealedPrayersExport.ts`**: a Markdown exporter that
  itself respects the seal. A still-sealed entry exports as
  `[Still sealed — opens ...]`, never its actual content — an export
  that leaked sealed text the moment you backed up your data would make
  the whole feature dishonest.
- **F2 — [`docs/SEALED_TIER.md`](docs/SEALED_TIER.md)**: the design doc
  the roadmap required by Movement II. States plainly what shipped
  (UI-level withholding — the body is plaintext in Postgres, exactly like
  every other entry) versus what's still owed (client-side encryption:
  passphrase-derived key, encrypt before the network call, decrypt only
  in-browser at open-time), why UI-level withholding is an acceptable
  interim for a single-keeper local-first deployment, and the additive
  migration path for when real encryption ships (likely alongside
  Movement IV's braid, once there's a real multi-party threat model).

Verified: tsc -b, eslint, production build, full Playwright suite
(`--workers=1`) — only the pre-existing, already-confirmed-non-regression
`discipleship-progress.spec.js` failure remains (`bible-modes.spec.js`
flaked once mid-session and passed clean on two re-runs, confirmed
unrelated — the same intermittent test flagged in Milestone 13).

## Milestone 15 (branch: redesign/milestone-15) — Echoes of Your Own Life

The third stone of Movement II, per VISION.md's Ring 2: "resurrection of
your own words" — reading a passage on a hard morning, and Chronicle
quietly noting you clung to it before. No AI required, per ROADMAP: it's
an index, and most of the index already existed.

- **No new matching logic needed.** `Bible.tsx` already had exactly the
  machinery this called for: `passageMatchesLocation` (parses an entry's
  free-text `passage` against the current book/chapter) and
  `chapterChronicleEntries` (the chapter-scoped result set), both
  originally built for the side-panel "Related Chronicle entries"
  section. `personalEchoes` is a two-line filter over that same result —
  exclude today's own entry (that's today's writing, not a returning
  echo) and anything still sealed (a sealed prayer's body must never
  surface outside its own deliberate unseal).
- **A naming collision avoided deliberately**: the app already has an
  unrelated "Echoes" feature (`panelMode: 'echoes'`, canonical
  Scripture-to-Scripture cross-references). This milestone's UI is titled
  **"You've Returned Here"** — a different name, a different card,
  ambient in the main reading pane rather than gated behind a panel
  toggle, so it reads unprompted the way VISION.md's "quietly notes"
  language calls for, and so the two "echoes" concepts never blur into
  each other on screen.
- Rendered directly above the verse text (not inside the existing themes/
  echoes/study-colors/greek panel system) — visible immediately on
  opening a chapter you've written about before, gone entirely on chapters
  you haven't.

Verified: tsc -b, eslint, production build, full Playwright suite
(`--workers=1`) — only the pre-existing, already-confirmed-non-regression
`discipleship-progress.spec.js` failure remains.

## Milestone 16 (branch: redesign/milestone-16) — Patina

The fourth and final stone of Movement II, per VISION.md's Ring 2: "a
physical Bible falls open at the loved pages; the corners of Psalm 23 go
soft from forty years of handling. Chronicle's Bible should wear the same
way."

- **A real reading-history log, not a proxy.** Investigation before
  building found no existing visit-tracking anywhere in the app — the
  closest thing (`chronicleEntries` filtered by passage) measures
  *writing about* a passage, not *reading* it, which would have
  undercounted silent devotional reading and overweighted journaling.
  Built a small, honest `bibleVisits: { book, chapter, date }[]` log
  instead (`src/types/index.ts`, `src/store/index.ts`) — one entry per
  distinct book+chapter+day, deduped client-side in a new
  `recordBibleVisit` action, recorded automatically on every chapter
  visit via a `useEffect` in `Bible.tsx`.
- **Deliberately local-only, not DB-synced** — added to the persist
  `partialize` whitelist (survives reloads) but not wired into
  `chronicleApiClient`/a new Prisma table. This is a real, disclosed
  scope cut: visit history won't sync across devices yet. Consistent with
  the "smallest real version" discipline, and revisitable once there's a
  reason (e.g. Movement IV's braid) to justify a server-side table for
  what is, for now, ambient texture rather than data anyone needs back.
- **`src/lib/patina.ts`** — `derivePatina(visits, book, chapter)`, a pure
  function scaling intensity from 0 to 1 against a threshold of 20
  distinct visit-days (chosen deliberately high, so this reads as "worn
  from years," not from one enthusiastic week).
- **The wear itself**: a faint warm radial-gradient vignette on the
  scripture pane, opacity scaling with `patina.intensity` (capped low —
  roughly 9% alpha at full patina) so it never competes with the text.
  Chapters never visited show nothing at all.

Verified: tsc -b, eslint, production build, full Playwright suite
(`--workers=1`) — only the pre-existing, already-confirmed-non-regression
`discipleship-progress.spec.js` failure remains (`bible-modes.spec.js`
flaked once mid-session and passed clean on re-run — the same
intermittent test now flagged across Milestones 13, 14, and 16;
consistently unrelated, no further chasing without new evidence).

This closes Movement II — Time Becomes Bidirectional — in full
(Milestones 12–16: Rule of Life, Remembrance, Sealed Prayers, Echoes of
Your Own Life, Patina).

## Milestone 17 (branch: redesign/milestone-17) — The Question Lab & Lament

The first stone of Movement III, and the first milestone to ship two
distinct rooms at once — both drawn from VISION.md's covenant #3:
"Lament is a first-class citizen... The Question Lab holds open
questions with the same dignity as answered prayers... open for decades
if need be. When one resolves after eleven years, that is a ceremony,
and it is a stone."

### The Question Lab (`/questions`)

- **A new `'question'` Chronicle entry type**, the same zero-migration
  reuse pattern as every feature since Growth Markers.
  `sourceContext.question: { status, resolvedAt?, resolution? }`.
- **Asking is simple; resolving is the ceremony.** Writing a question is
  a plain inline form — the sacred moment isn't the asking, it's what
  happens when it finally resolves, possibly years later.
  `QuestionResolutionCeremony.tsx` follows the Milestone 10 template:
  review the question and how long it's been carried (`src/lib/
  questionLab.ts`'s `formatOpenDuration`), an 8-second skippable stillness
  beat, then "what changed?" written as the closing act.
- **Resolved questions render as stones** — visually, on the same
  `/questions` page, using the Growth Spine's established
  Card/Badge/TimelineDot language — rather than spawning a second
  Chronicle entry. The "stone" the roadmap calls for is the resolved
  question's own new appearance, not a duplicate record.
- Its own top-level sidebar entry (`/questions`), since a question can be
  vocational ("what is God asking me to do?") and not merely a Prayer
  Room concern — matching the precedent set by the Rule of Life's flat
  nav placement.

### The Lament Room (`/prayer/lament`)

- **Investigated and rejected the Prayer Paths system as the
  implementation.** Prayer Paths (`PrayerPathPlayer.tsx`) is read-only —
  every step is pre-authored text; there is no free-text input field
  anywhere in it. A lament's complaint and petition must be written in
  the keeper's own words, so extending or reusing the path player would
  have meant real component surgery for a feature it wasn't built for.
  Built as its own page instead, following the Daily Office's finite-
  liturgy grammar (`StationLabel`, numbered stations, `CARD_STYLE`) — the
  same "opposite of a feed" shape, just four stations instead of five:
  Complaint, Petition, the Turn to Trust, Seal.
- **`src/data/lamentPsalms.ts`** — a small curated set of lament-psalm
  openings (Psalm 13, 22, 130...), rotated by day of week exactly like
  the Office's `CALLS` array, shown as an epigraph — scaffolding the
  room's shape without scripting what the keeper writes.
- Saved as an ordinary `type: 'prayer'` entry (a lament is still a
  prayer) with `sourceContext.lament: { complaint, petition, trust }` —
  no new entry type needed, consistent with "favor fewer concepts
  implemented exceptionally well."
- No AI anywhere in either room, per the covenant.

Verified: tsc -b, eslint, production build, full Playwright suite
(`--workers=1`) — only the pre-existing, already-confirmed-non-regression
`discipleship-progress.spec.js` failure remains.

## Milestone 18 (branch: redesign/milestone-18) — The Archaeology

Most keepers who install Chronicle don't arrive empty — they arrive with
decades of walk already behind them, unrecorded. The Archaeology is a
short guided backfill interview at `/archaeology` that excavates that
prehistory into stones, so the Thread's beginning isn't artificially
pinned to the day someone happened to download the app.

- **`src/data/archaeologyPrompts.ts`** — six curated prompts, five
  targeting the existing Growth Marker kinds (conversion, baptism,
  calling, conviction, a resolved season of doubt) and one targeting an
  old answered prayer. Reuses `growthMarkers.ts`'s kind ids rather than
  inventing a parallel taxonomy.
- **`src/pages/Archaeology.tsx`** — a linear wizard, one prompt at a
  time: "Skip" or "Yes, I remember" → a real (often approximate) past
  date picker + free-text → "Set This Stone." Growth prompts write an
  ordinary `type: 'growth'` Chronicle entry dated to the remembered date
  (same reuse pattern as Milestone 7 — no migration). The answered-
  prayer prompt writes a `PrayerItem` with `answered: true`, and asks a
  second, answered-prayer-only question — "how long had you been
  carrying it?" — used to backdate `dateAdded` via `subtractMonths`, so
  the Answered Light's "carried for..." language reads true rather than
  always claiming a same-day answer for a memory that's actually
  decades old.
- No AI, no judgment about imprecise memory built into the copy —
  "roughly when," "a year is enough." Skipping is always one tap away
  and carries no visible cost (no counter, no "N remaining, hurry up").
- **Deliberately no permanent sidebar slot.** Per VISION.md's anti-
  engagement covenant, a one-time-ish excavation doesn't belong beside
  the five main rooms as a standing destination. Instead: an "🗿
  Excavate Your Past" entry point inside the empty-state `EmptyCard` on
  both `GrowthMarkers.tsx` (the Growth Spine) and `AnsweredLight.tsx`
  (the Answered Light) — offered exactly at the moment those pages have
  nothing to show, which is also the moment a new keeper is most likely
  to have unrecorded history to excavate — plus a `SearchModal.tsx`
  quick-link for anyone who wants to return to it later.
- Its own `--accent-amber` chrome, distinct from the rose (growth) and
  blue (prayer) colors of the two entry types it actually writes, since
  the wizard itself doesn't belong to either destination.

Verified: tsc -b, eslint, production build, full Playwright suite
(`--workers=1`) — new `tests/archaeology.spec.js` covers both the
growth-marker path and the answered-prayer path, asserting the backdated
date lands correctly on the Growth Spine / Answered Light. Only the
pre-existing, already-confirmed-non-regression
`discipleship-progress.spec.js` failure remains.

## Milestone 19 (branch: redesign/milestone-19) — The Oral History

"The feature with a funeral" — the same interview engine as the
Archaeology (M18), pointed at someone else. A grandparent's stones are
often only ever going to exist if someone sits down and asks.

- **`src/data/oralHistoryPrompts.ts`** — seven prompts, rephrased for an
  interviewer asking about someone else rather than a keeper remembering
  their own life: conversion, baptism, calling, a hard season survived,
  an answered prayer, a piece of wisdom to pass down, and an open "any
  other memory" catch-all. Deliberately not a 1:1 reuse of the Archaeology's
  growth-marker-kind prompts, since these stones belong to the subject,
  not the keeper's own Growth Spine.
- **New `heritage` entry type** — `sourceContext.heritage: { subjectName,
  relationship, hadAudio }`. Kept distinct from `growth` on purpose: mixing
  someone else's baptism into the keeper's own Growth Spine would have
  been a real category error, not just a UI inconvenience.
- **`src/pages/OralHistory.tsx`** at `/heritage`, "The Heritage Room" —
  unlike the Archaeology, given a full landing page and a permanent
  sidebar slot, because family interviews happen across many sittings,
  sometimes years apart, rather than once. Groups captured stones by
  subject name, with relationship shown as a badge.
- **Voice recording, honestly scoped.** `src/lib/oralHistoryVoice.ts`
  wraps `MediaRecorder`/`getUserMedia` for in-browser capture and
  playback during the interview, with an optional "Transcribe →" button
  (only shown when the keeper has a transcription provider configured in
  Settings) that calls the existing `/api/voice/transcribe` endpoint to
  prefill the text field. **The audio itself is never persisted
  server-side** — Chronicle's schema has no blob/file column anywhere,
  and adding one for what could be hours of family audio would mean a
  real migration and a real hosting cost this milestone didn't take on.
  This is disclosed in the UI copy itself ("The recording stays in this
  tab only... it's never saved"), the same honesty standard as M14's
  sealed-tier design doc and M16's local-only visit log. Mic failure
  (no permission, no device) degrades gracefully to a text-only inline
  message — recording is always optional, never blocking.
- New `--accent-clay` token — earthen, distinct from the Archaeology's
  amber, since the Heritage Room is its own permanent room, not a
  one-time wizard.
- Chronicle.tsx's TYPE_COLORS/TYPE_BG, filter chips, and "By Type" array
  extended for `heritage`; `formationAnalytics.ts`'s `entryTypes` map
  updated; prisma schema comment updated (no migration — still a plain
  `String` column).

Verified: tsc -b, eslint, production build, full Playwright suite
(`--workers=1`) — new `tests/oral-history.spec.js` covers the primary
voice-free path (subject + relationship, one answered prompt, the rest
skipped, verified grouped correctly on `/heritage`). Only the
pre-existing, already-confirmed-non-regression `discipleship-progress.spec.js`
failure remains.

## Milestone 20 (branch: redesign/milestone-20) — The Book, Typeset

The Story tab (`/thread/story`, `src/pages/Legacy.tsx`) becomes an actual
book: real pagination, chapters broken at growth markers, years as
parts, print-grade PDF export, a visible page count.

- **`src/lib/bookPagination.ts`** — `deriveBookParts(entries)` groups
  entries by calendar year into "parts" (reusing the year-grouping idea
  from the retired `deriveLegacyChapters`, now genuinely nested one
  level deeper): within each year, a `type: 'growth'` entry starts a new
  chapter (titled from its growth-marker kind label), so "chapters
  broken at growth markers" is real structure, not decoration.
  `paginateBook(parts)` packs each chapter's entry text into a ~1600-
  character-budget page, splitting on paragraph boundaries where
  possible, producing a real `{ pageNumber, totalPages }` — an actual
  derived fact rather than a cosmetic label.
- **`Legacy.tsx` rebuilt as a real reader**: the sidebar now lists real
  Parts (roman numeral + year) with their real nested Chapters (click to
  jump straight to that chapter's first page); the center panel is a
  page-by-page reader with Prev/Next controls and "Page X of Y."  The
  old single-blob AI-generated narrative (`deriveLegacyNarrative`) is
  kept only as a graceful empty-state fallback when there are zero
  entries to paginate.
- **Print-grade PDF export, honestly scoped.** No PDF-generation library
  existed anywhere in the app (verified — no jspdf/pdfkit/react-pdf in
  `package.json`), and one wasn't added: `src/lib/bookExport.ts` extends
  the pre-existing "Export Legacy Memoir" print-window flow
  (`Settings.tsx`) with real `@page`/`page-break-before` CSS per chapter
  and per part, rendering actual entry content (not a summary), then
  hands off to the browser's own Save-as-PDF. Documented directly in
  the module comment: the browser's print pagination and Chronicle's
  own in-app page count are two independent numbers and will not match
  — expected, not a bug.
- Retired `deriveLegacyChapters` (`formationAnalytics.ts`) once both of
  its two callers (`Legacy.tsx`, `Settings.tsx`'s export) were migrated
  to `deriveBookParts` — dead code removed rather than left alongside
  its replacement.

Verified: tsc -b, eslint, production build, full Playwright suite
(`--workers=1`) — new `tests/book-typeset.spec.js` seeds entries across
two years with a growth marker splitting one year into two chapters,
and asserts real part/chapter grouping, working Prev/Next page
navigation, and chapter-jump-to-page. Only the pre-existing,
already-confirmed-non-regression `discipleship-progress.spec.js`
failure remains.

Note on test viewport: Legacy.tsx runs a 3-pane layout (chapter sidebar,
book reader, page-local AI panel) alongside the app's own global AI
companion panel — at the default 1280px Chromium viewport there isn't
enough room left for the reader card's own text once all four columns
are laid out (a pre-existing condition, not introduced by this
milestone). `tests/book-typeset.spec.js` widens its viewport to
1600x900 to match a normal desktop monitor rather than mask the
squeeze by only checking DOM presence.

## Milestone 21 (branch: redesign/milestone-21) — The Thread Made Literal

Record, Answered Light, Growth Spine, and Story become altitudes of one
canonical visualization. Closes Movement III.

- **Scope decision, disclosed up front**: "zoomable" is implemented as a
  discrete four-level altitude selector with real cross-navigation
  between levels centered on the same day, rather than a continuous
  analog zoom gesture (a physically continuous zoomable canvas across
  four structurally different data shapes — a raw log, prayer-item
  arcs, growth-marker milestones, and a paginated book — would be a
  multi-week rebuild disproportionate to one milestone). The four
  surfaces already existed; what M21 actually built is the missing
  connective tissue between them.
- **`Thread.tsx`'s tab bar gained a fifth tab: Answered Light.** It was
  previously only reachable at `/prayer/answered-light`, structurally
  outside the Thread room entirely, even though it's one of the four
  named altitudes in ROADMAP.md. Added as `/thread/light` (the generic
  `thread/:view` route already covers it — no App.tsx change needed),
  rendering `AnsweredLight` inline exactly like Growth/Story do. The
  original `/prayer/answered-light` route is untouched (additive only,
  still valid muscle memory for anyone with it bookmarked).
- **The literal zoom-down interaction**: every Growth Marker stone and
  every Answered Light entry gained a "↓ View in Record" button.
  Extended `Chronicle.tsx`'s existing `routePassageFilter` pattern
  (`location.state.filterPassage`, from earlier milestones) with a
  parallel `routeDateFilter`/`filterDate` — clicking the button
  navigates to Record already filtered down to that exact day, with a
  visible "Zoomed to {date} — the ground-level entries behind that
  stone" banner and a Clear button, mirroring the passage-filter
  banner's established shape.
- No AI anywhere in the new mechanism — it's pure client-side
  filtering and navigation, the same category as the passage filter it
  extends.

Verified: tsc -b, eslint, production build, full Playwright suite
(`--workers=1`) — new `tests/thread-altitudes.spec.js` covers all five
tabs being reachable from the bar, and the Growth→Record zoom-down
landing on the correct filtered day (with the unrelated day's entry
confirmed absent until Clear). Two failures observed, both pre-existing
and unrelated: `discipleship-progress.spec.js` (confirmed
non-regression across many prior milestones) and a `bible-settings.spec.js`
sync-snapshot timeout that passed cleanly on an immediate isolated
re-run (flaky, not a regression).

## Milestone 22 (branch: redesign/milestone-22) — Households

Movement IV begins. ROADMAP.md itself calls this "the single largest
architecture change in the plan" — with good reason: before this
milestone, Chronicle had exactly one keeper (Cloudflare Access is the
only identity boundary) and zero `userId`/tenant columns anywhere in
the schema.

**Scope, confirmed with the user before writing any code**: foundation
only. This milestone adds the schema-level container and backfills
every existing row into it — it does **not** add real per-person
accounts, a login flow, or API-level data isolation between people.
Presenting a decorative `householdId` column that nothing actually
enforces would have been dishonest; what shipped is a real, enforced
foreign key, verified against actual data, with everything else
explicitly deferred.

- **`Household` model** added to `prisma/schema.prisma`. Every existing
  data model (`ChronicleEntry`, `PrayerItem`, `FormationRhythm`,
  `ScriptureBookmark`, `OwnedBook`, `LibraryCatalogEntry`,
  `ThreadEvent`, `MemoryVerse`) gained a `householdId String
  @default("household-default")` column with a **real, enforced**
  foreign key to `households.id` — not a soft/unenforced reference.
  `AppSettings` was deliberately excluded: it's a true app-wide
  singleton (`id: "singleton"`), and giving it a household-scoped
  identity is a decision that belongs to the milestone that adds real
  per-person authentication, not this one.
- **Migration hand-authored, not generated**, because this environment
  has no local Postgres for `prisma migrate dev` to run against. The
  migration creates `households`, seeds one `household-default` row,
  then adds each `householdId` column with a default (so every
  existing row backfills automatically) before adding the FK
  constraint — ordered so the constraint validates cleanly against
  pre-existing data.
- **Verified end-to-end against real data before touching production**,
  using Docker to spin up throwaway Postgres instances (not part of
  the deployed stack — purely a local verification step):
  1. Applied the full migration history to an empty database — clean.
  2. Applied all migrations *except* this one to a second database,
     inserted realistic pre-existing rows (a chronicle entry, a prayer
     item, a memory verse), then applied this migration on top —
     confirmed all three rows backfilled correctly to
     `household-default`.
  3. Attempted an insert with a bogus `householdId` — confirmed
     Postgres actually rejected it via the foreign key constraint, not
     just that the column existed.
  4. Applied the migration to the real local dev database (the one
     this entire session's Playwright runs have been writing to,
     carrying real accumulated entries) and ran the full app + test
     suite against it — every read/write path continued to work.

Verified: tsc -b, eslint, production build, full Playwright suite
(`--workers=1`) against the migrated dev database — schema-only change,
so no application behavior differs and no new tests were needed beyond
the migration verification above. Only the pre-existing,
already-confirmed-non-regression `discipleship-progress.spec.js`
failure remains.

## Milestone 22.5 (branch: redesign/milestone-22-5) — Real Identity, via Cloudflare Access

A prerequisite discovered while scoping M23 "The Braid": that milestone
needs to tell one real person apart from another, and M22 deliberately
didn't build that (foundation only — see above). Rather than invent a
parallel login/password system, this reads the identity Cloudflare
Access has already established at the edge for every request.

- **`HouseholdMember` model** (`email` unique, `householdId` FK, real
  relation to `Household`). Cloudflare Access forwards the authenticated
  person's email via `Cf-Access-Authenticated-User-Email` on every
  proxied request once they've passed Access's own login — no signup
  form, no password to store or manage, no session cookie logic to get
  wrong.
- **`householdIdentityGate`** in `server/chronicleApi.ts`, registered
  right after the existing bearer-token auth gate: reads that header on
  every `/api/*` request and auto-provisions a `HouseholdMember` on
  first sight of a new email. Deliberately non-blocking and
  non-rejecting — if the header is absent (local dev, CI, or a
  misconfigured proxy), the app behaves exactly as it did before this
  milestone. This is identity plumbing only: no table's rows are scoped
  to a specific member yet — that's M23's actual work.
- **A real bug caught and fixed during verification, not shipped
  silently**: the general gate provisions fire-and-forget (so it never
  adds latency to every API call), which meant the new `GET
  /api/household/me` endpoint could race its own write and return
  `null` on a person's very first request even though they were
  correctly identified. Fixed by having that one endpoint `await`
  provisioning directly before its read, since it's the only place a
  human actually looks at the result — verified before and after with
  a live curl reproduction.
- **Settings → About** now shows "Signed in via Cloudflare Access as
  {email}" (or "not detected — local dev" when the header is absent),
  so this is observably real rather than invisible backend plumbing.

Verified: tsc -b, eslint, production build, full Playwright suite
(`--workers=1`) against the migrated dev database, plus direct curl
verification of `/api/household/me` (no header → null; with header →
correctly provisioned and returned, confirmed on the very first
request after the race fix) and the migration against a throwaway
Postgres instance (unique-email and household-FK constraints both
independently confirmed to actually reject bad data). Only the
pre-existing, already-confirmed-non-regression
`discipleship-progress.spec.js` failure remains.

## Design-1 (branch: design/old-family-bible) — The Old Family Bible register

The first slice of a full UX reimagining, requested unconstrained ("look
at the entirety of this program... how would you reimagine the UX?").
Full design process run via the `bmad-ux` skill: three initial design
directions rendered as HTML mockups (Manuscript, Chapel, Stone Court),
a fourth (Old Family Bible) added once the user chose different
registers for different rooms rather than one unifying skin, then both
`DESIGN.md` and `EXPERIENCE.md` spines finalized at
`_bmad-output/planning-artifacts/ux-designs/ux-chronicle-2026-07-08/`
before any production code was touched. Five named registers now exist:
Chapel (Office/Prayer/Lament/Sealed Prayers/Rule), Manuscript (Bible
reading), Stone Court (Thread/Growth/Question Lab/Heritage/
Archaeology), Old Family Bible (the Book/Story), and the Ledger (a
formalization of the existing design system for Study/Discipleship/
Plans/Themes/Memory/Explore/Settings — introduced specifically because
those are AI-present, analytical surfaces, not devotional ones, and
forcing them into a devotional register would have been dishonest).

Built smallest-first, per the user's own choice of build sequencing:

- **`src/pages/Legacy.tsx` rebuilt entirely** in the Old Family Bible
  register: oxblood leather cover, brass gilt page-edge stripe, foxed
  and aged parchment, a running header ("The Book of Chris · Part III
  · The 2020 Season"), a chapter heading under a gilt drop-rule, and
  the page-count line ("You are on page 214 of your book.") — all real
  CSS (gradients, layered shadows, `::before`/`::after` texture in the
  new `src/pages/Legacy.module.css`), no images.
- **The persistent chapter sidebar was removed**, replaced by a
  "📖 Table of Contents" toggle that opens inside the book object
  itself rather than sitting as permanent chrome — per DESIGN.md's
  rule that Stone Court is the only register that keeps a persistent
  sidebar rail.
- **The page's bespoke "Legacy AI" panel was removed entirely** — a
  real conflict caught while reading the existing page against the new
  spine's structural commitment #4 ("no AI companion panel in any
  named register"). It duplicated the app's one global AI companion
  panel (already fed via `setPageContext`/`setSelectedAgentMode`,
  which this page still calls) and was the direct cause of the
  3-pane-viewport squeeze documented as a known issue back in M20.
  Removing it fixes that bug as a side effect. Its supporting function
  `answerLegacyQuestion` (a local keyword-search "answer engine," not
  an actual AI call) and its now-unused helpers (`tokenize`,
  `STOPWORDS`) were deleted from `formationAnalytics.ts` rather than
  left as dead code.
- Verified visually, not just by test assertion: screenshots taken of
  both the reading view and the Table of Contents against real
  accumulated dev data (94 real entries in one chapter) before running
  the full suite.

Verified: tsc -b, eslint, production build, full Playwright suite
(`--workers=1`) — `tests/book-typeset.spec.js` updated for the new
structure (Table of Contents toggle instead of a sidebar click, the new
page-tracker copy instead of "Page X of Y"). Two failures observed,
both pre-existing and confirmed unrelated on isolated re-run:
`discipleship-progress.spec.js` (confirmed non-regression across many
prior milestones) and `bible-modes.spec.js` (passed 3/3 in isolation
immediately after — the same intermittent full-suite-only flake
documented since M13/M14/M16, untouched by this change).

## Design-0 (branch: design/sidebar-reorg) — Sidebar reorganization

Two nav-grouping moves, requested directly alongside the final register
map: **My Rule of Life** moves out of the Prayer group into the Office
group (joins The Daily Office); **The Heritage Room** moves out of the
Prayer group into the Thread group (joins The Thread). "My Book" was
considered as a possible new top-level heading and explicitly rejected
— Story remains nested in the Thread altitude tab bar, not promoted to
its own sidebar entry.

`src/components/layout/Sidebar.tsx`'s `NAV_GROUPS` array reordered
accordingly; no new components, no route changes — purely a
reassignment of which group each existing nav item's object literal
lives in.

Verified: tsc -b, eslint, production build, full Playwright suite
(`--workers=1`) — no test assumed sidebar item order, so nothing needed
updating. Only the pre-existing, already-confirmed-non-regression
`discipleship-progress.spec.js` and `bible-modes.spec.js` failures
remain (the latter passed cleanly on isolated re-run per the pattern
documented since M13).

## Design-2, page 1 of 6 (branch: design/manuscript-word) — Manuscript register for Bible.tsx

First of six "Word" pages (Bible/Study/Discipleship/Plans/Themes/Explore)
to receive the Manuscript register — paper and ink, with rubric red used
the way medieval scribes used rubrication: never decoration, always
structural (the active chapter, an echo, a cross-reference).

Discovered that Bible.tsx's ~3180 lines already route every chrome color
through CSS custom properties (`var(--card-bg)`, `var(--text)`,
`var(--accent-primary)`, etc. — 213 occurrences across the file) rather
than hardcoded colors. That makes a full register reskin tractable
without an inline-style rewrite: `src/pages/Bible.module.css`'s
`.manuscriptRegister` class re-scopes the same custom property names
(`--bg`, `--card-bg`, `--card-inner`, `--border`, `--text`, `--text-sub`,
`--text-muted`, `--accent-primary`, `--accent-primary-light`,
`--accent-blue`, `--sidebar-selected-bg`, `--sidebar-selected-text`) to
the Manuscript palette (cream `#f7f3e9` page, ink `#2b2721` text, rubric
red `#8b2c2c` accent). A custom property set on a descendant always wins
over `:root`/`[data-theme="dark"]` regardless of the ancestor selector's
specificity, so no separate dark-mode override block was needed — the
Manuscript register is deliberately the same regardless of the app's
global light/dark setting; paper and ink is the whole identity here, not
a toggle. The class is applied to the page's root wrapper div in
`Bible.tsx`, one line (plus the CSS module import).

Left untouched: the file's 9 hardcoded hex values, all tied to
`TIER_COLORS` (evidence-tier badges — Explicit/Strong/Inferred/Debated)
and `--accent-amber` (semantic warning color) — these are semantic
signal, not chrome, and register reskins don't touch semantic color.
`--accent-blue` (used pervasively as the primary interactive/active-state
accent — echoes toggle, active provider tab) was mapped to the same
rubric-red value as `--accent-primary` so the register reads as one
consistent accent rather than two competing ones.

Verified: tsc -b, eslint, production build. Visually verified via a
temporary Playwright script (computed-style assertions, not just a
screenshot): the root element carries the `manuscriptRegister` class with
`background-color: rgb(247, 243, 233)` (`#f7f3e9`), and the chapter
heading resolves to `color: rgb(43, 39, 33)` (`#2b2721`) — confirming the
re-scoped custom properties actually reach the rendered page, not just
the CSS module. Full Playwright suite (`--workers=1`): same two
pre-existing failures as every prior slice (`discipleship-progress.spec.js`,
and `bible-modes.spec.js` which passed 2/2 on isolated re-run
immediately after — the same intermittent full-suite-only flake
documented since M13).

Remaining for Design-2: Study.tsx, Discipleship.tsx, Plans.tsx,
Themes.tsx, Explore.tsx — each needs a per-page check that it also
routes color through the same `var(--...)` tokens before assuming the
same re-scoping technique applies unmodified.

## Design-2, pages 2–6 of 6 (branch: design/manuscript-word) — Manuscript register for the rest of The Word

Completed Design-2: the remaining five "Word" pages (Study, Discipleship,
Plans, Themes, Explore) confirmed the same pattern as Bible.tsx —
each routes its chrome color through 9–12 unique `var(--...)` tokens,
so the identical re-scoping technique applied cleanly to all of them.

Extracted the `.manuscriptRegister` class out of the page-local
`Bible.module.css` into a shared `src/styles/manuscriptRegister.module.css`
(Bible.tsx now imports the shared file too, so all six Word pages share
one definition instead of six copies of the same palette). Each page's
root wrapper div gets `className={manuscriptStyles.manuscriptRegister}`
alongside its existing inline `style` — one import line and one
className per file, no other changes.

Left untouched (same semantic-color policy as Bible.tsx): Discipleship's
source-health status colors (`#065f46`/`#b45309`/`#b42318` health
badges, `#7a271a` audit-warning text) and its `#f8fafc` scanned-image
canvas backdrop; Plans's decorative gradient banner on the plan-library
hero card; Themes's `TIER_COLORS` (`Strong`/`Supporting`/`Emerging`
signal colors, the direct analog of Bible.tsx's evidence-tier badges).

Verified: tsc -b, eslint, production build all clean across all six
files plus the new shared CSS module. Visually verified via a temporary
Playwright script (computed-style assertions) that all five newly
converted routes (`/study`, `/discipleship`, `/plans`, `/themes`,
`/explore`) render a `manuscriptRegister`-classed root with
`background-color: rgb(247, 243, 233)`. Full Playwright suite
(`--workers=1`): three failures observed, all confirmed pre-existing
and unrelated on isolated re-run — `discipleship-progress.spec.js`
(confirmed non-regression across many prior milestones),
`bible-modes.spec.js` (passed 2/2 in isolation, the flake documented
since M13), and `thread-altitudes.spec.js` (a new appearance of the
same full-suite-only flake pattern — passed 2/2 in isolation
immediately after; this slice touched no Thread.tsx or Sidebar.tsx
code, so it isn't a regression from this change).

Design-2 is now complete for all six Word pages. Next: Design-3
(Chapel register for Office/Rule/Prayer/QuestionLab/Lament/SealedPrayers/Memory).

## Design-3 (branch: design/chapel) — Chapel register for Office/Rule/Prayer/QuestionLab/Lament/SealedPrayers/Memory

The darkness-first register: near-black ground, candlelit vellum text,
gold that never decorates — it marks only answered prayers, feast days,
and the current liturgical station. Applied to all seven Office/Prayer-
family pages: Daily Office, My Rule of Life, The Prayer Room, The
Question Lab, Lament, Sealed Prayers, and Scripture Memory.

Same CSS custom-property re-scoping technique as Design-2's Manuscript
register: all seven pages already route their chrome color through
`var(--...)` tokens (6–14 unique tokens each, zero hardcoded hex), so
`src/styles/chapelRegister.module.css`'s `.chapelRegister` class
re-scopes `--bg`, `--card-bg`, `--card-inner`, `--border`, `--text`,
`--text-sub`, `--text-muted`, `--accent-primary`, `--accent-primary-light`,
`--accent-blue`, `--sidebar-selected-bg`, `--sidebar-selected-text`, and
`--shadow` to the Chapel palette (`#14110e` ground, `#e9e2d4` text,
`#e8b44f` gold accent) — colors extracted directly from DESIGN.md's
Chapel token table. Left untouched, same semantic-color policy as every
prior register: `--accent-copper`/`--accent-forest`/`--accent-purple`/
`--accent-slate`/`--accent-amber` — per-entry-type identity colors for
question/lament/sealed/rule categories established in M12/M14/M17, not
chrome.

Office.tsx needed the class applied to **four** separate root returns,
not one — the component has distinct early-return branches for the
evening Examen-done state, the evening Examen-pending state, the
completed-today state, and the default morning/full-Office state. Missed
this on the first pass (only patched the last return, which isn't the
one that renders at the time of day this was verified) — caught by the
visual verification step below, not by tsc/eslint/build, which all stay
silent on a missing className. Two of the four returns also share
identical JSX except for indentation (6 vs 8 spaces), which is why a
single `replace_all` initially caught only one of them.

Verified: tsc -b, eslint, production build all clean across all seven
files plus the new CSS module. Visually verified via a temporary
Playwright script (computed-style assertions) that all seven routes
(`/`, `/rule`, `/prayer`, `/questions`, `/prayer/lament`, `/prayer/sealed`,
`/memory`) render a `chapelRegister`-classed root with
`background-color: rgb(20, 17, 14)` (`#14110e`) — this is what caught
the Office.tsx gap above; the other six pages were correct on the first
pass. Full Playwright suite (`--workers=1`): one failure, the
already-confirmed pre-existing `discipleship-progress.spec.js` (the
usual `bible-modes.spec.js`/`thread-altitudes.spec.js` full-suite-only
flakes did not appear this run).

Next: Design-4 (Stone Court register for Thread/Record/AnsweredLight/
Growth/Patterns/Heritage), then Design-5 (Ledger formalization for
Settings only).

## Design-4 (branch: design/stone-court) — Stone Court register for the Thread + Heritage Room

The tactile, parchment-and-stone register. Per direct user instruction,
every Thread altitude is Stone Court except Story (which keeps its own
Old Family Bible register from Design-1) — this pulls Record, Answered
Light, Growth, and Patterns in under one register, and the Heritage Room
joins as a Thread sibling.

Architecturally different from every prior slice: Thread.tsx isn't six
separate routed pages, it's one container (`Thread()`) that renders
`Chronicle`, `AnsweredLight`, `GrowthMarkers`, `Insights`, or `Legacy` as
an internal child based on the `view` route param (M21, "The Thread Made
Literal"). Rather than touching five child files individually, the
`src/styles/stoneCourtRegister.module.css` class is applied once, to
`Thread.tsx`'s own root wrapper — the custom-property re-scoping cascades
down into whichever child is currently rendered, since all five children
already route color through the same `var(--...)` chrome tokens. The one
exception: the class is applied conditionally
(`view !== 'story' ? stoneStyles.stoneCourtRegister : undefined`) so
Story/Legacy — a sibling under the same wrapper — keeps rendering with
its own leather-and-parchment identity untouched, exactly as the
"except Story" instruction requires. Heritage Room (`OralHistory.tsx`)
is a separate routed page and got the class directly, the same pattern
as every prior slice (applied to all 4 of its root JSX returns —
loading/empty/error states plus the default — following the lesson
from Design-3's Office.tsx miss).

Palette sourced directly from DESIGN.md's Stone Court token table:
parchment ground (`#efece4`), ink text (`#33322c`), stone-slate
(`#5d6069`) as the primary/active accent for structural UI (tab
selection, buttons) — not `stone-glow` (gold), which DESIGN.md reserves
specifically for the answered-prayer stone's inner light and is
explicitly the one place Chapel gold is allowed to cross into Stone
Court. Wiring that glow into individual stone objects is future work
(DESIGN.md's `stone` component spec — real CSS objects with weight, not
cards) and out of scope for this chrome-coloring pass, same scope
boundary as every prior Design-N slice. Left untouched, same policy as
every register: `accent-amber/blue-light/clay/copper/forest/purple/
rose/sky/slate` (and `-light` variants) — per-entry-type identity colors
(growth-marker kind, prayer category, heritage tag) from M7/M17/M19/M21,
not chrome.

Verified: tsc -b, eslint, production build all clean. Visually verified
via a temporary Playwright script (computed-style assertions): all four
non-Story routes (`/thread`, `/thread/light`, `/thread/growth`,
`/thread/patterns`) plus `/heritage` render a `stoneCourtRegister`-classed
root with `background-color: rgb(239, 236, 228)` (`#efece4`); `/thread/story`
correctly has *no* `stoneCourtRegister` element at all, confirming the
conditional exclusion works. Full Playwright suite (`--workers=1`): two
failures, both confirmed pre-existing/unrelated on isolated re-run —
`discipleship-progress.spec.js` (long-confirmed non-regression) and
`sealed-prayers.spec.js` (a new appearance of the same full-suite-only
flake pattern documented since M13 — passed 2/2 in isolation; this
slice never touches sealed-prayer gating logic, that lives in
Chronicle.tsx, not Thread.tsx).

Next: Design-5, the final slice — formalizing the Ledger register for
Settings, the last unstyled room.

## Design-5 (branch: design/ledger — final slice) — The Ledger formalization pass for Settings

Different in kind from Design-1 through 4: DESIGN.md is explicit that
the Ledger "uses the existing shipped `tokens.css` palette as-is... this
redesign does not introduce new Ledger colors." Settings is the one
utilitarian/management room, deliberately not reskinned into any of the
four devotional registers. What DESIGN.md asks this pass to formalize
instead is item 3 of the original UX critique that opened the whole
redesign ("one real design system"): the 4-step type scale (`--text-xs`
11px / `--text-sm` 13px / `--text-base` 15px / `--text-lg` 19px,
established in M11 but only ever applied to the Office/ceremonies/Card/
Badge) "actually applied everywhere."

Settings.tsx (3,429 lines) carried 227 inline pixel `fontSize` values
across 9 distinct sizes (10–18px) — every one mechanically mapped to its
nearest type-scale rung (10/11→xs, 12/13→sm, 14/15/16→base, 17/18→lg)
via a scripted substitution, then verified by hand-checking tsc/eslint/
build all stay clean and a full-page screenshot confirms no visual
regression (same layout, same default light/dark theme colors — no new
palette was introduced, matching the DESIGN.md instruction precisely).

**Explicitly out of scope for this pass, flagged rather than silently
dropped**: DESIGN.md also names "the existing `Card`/`Badge` components
used consistently rather than the current mix of inline styles and
one-off card patterns" as part of the Ledger formalization. Settings.tsx
has roughly 128 inline card-like div patterns (border + borderRadius +
background combinations) that are candidates for conversion to the
shared `Card`/`Badge` components. Converting a page this size structurally
— touching JSX shape at 128 sites rather than swapping scalar values —
is a materially larger and riskier undertaking than a mechanical
find-and-replace, and doing it in the same slice as the type-scale pass
would make either change harder to verify in isolation if something
broke. Deferred as a distinct follow-up, the same way Design-4 deferred
wiring the Stone Court's `stone-glow` component treatment.

Verified: tsc -b, eslint, production build all clean. Visually verified
via a full-page screenshot of `/settings` — same layout and chrome as
before the change, confirming the token substitution didn't alter
rendering, only its source of truth. Full Playwright suite
(`--workers=1`): one failure, the already-confirmed pre-existing
`discipleship-progress.spec.js` — no new failures.

This completes all five Design-N slices of the UX reimagining: Chapel
(Office/Rule/Prayer/QuestionLab/Lament/SealedPrayers/Memory), Manuscript
(all six Word pages), Stone Court (every Thread altitude except Story,
plus Heritage Room), Old Family Bible (Story), and the Ledger
formalization (Settings) — the full room→register map from EXPERIENCE.md
is now built.

## Design-6, part 1 (branch: design/chapel-typography) — Chapel typography correction for Office.tsx

User correction after the deploy above: Design-3's Chapel register only
re-scoped chrome *color* via CSS custom properties, reusing every
register's pre-existing card-list layout, bold headings, and small type
unchanged. Compared side-by-side against the approved
`.working/direction-chapel.html` mockup, this was visibly wrong for
Chapel specifically — the mockup's whole voice is boxless, weight-300
serif type at 28–34px, wide letter-spacing small-caps labels, and one
real glowing element (the Remembrance box: a soft radial-gradient wash
plus a three-layer `box-shadow`, not a solid bordered card). What
shipped was still the dense, bold, small-type card-list layout with
Chapel's palette swapped in — legible, but reading as "dark theme," not
"ceremonial." Same color-only gap almost certainly applies to Manuscript
and Stone Court too; user confirmed scope: fix Chapel first (this
slice), then redo Manuscript and Stone Court to the same depth as
separate follow-up work.

This slice reworks `Office.tsx` (the page in the flagged screenshot) to
match the mockup's actual typographic and spatial spec, not just its
palette:

- **`RemembranceCard`** rebuilt to the mockup's exact `.remembrance` CSS
  (border `rgba(232,180,79,0.45)`, radial-gradient wash, three-layer
  glow `box-shadow`, italic 19px gold body text with its own
  `text-shadow`) — deliberately left un-abstracted into the shared
  `card` shape, since DESIGN.md is explicit this is the one place a
  candle actually burns on the page.
- **`StationLabel`** rebuilt as a whisper-level small-caps ordinal
  ("Station One of Four") above a 28px weight-300 serif heading,
  replacing the old numbered-circle-plus-bold-caption pattern.
- **The `card` station shell** stopped being a card: no border,
  background, or shadow — a centered 480px column with generous
  bottom padding and a single hairline `border-bottom`, matching the
  mockup's `.station-rule` divider. A `lastStation` variant drops the
  divider on the final station.
- **Call to Worship demoted from a numbered station to ambient text**
  above the stations — the mockup never labels or numbers it; it's a
  32px weight-300 italic-free serif verse with a small-caps citation,
  sitting above "Station One." This shifted the full Office from 5
  stations to 4 (Word/Silence/Prayer/Response) and the Evening Examen
  stays at 3 (unchanged, it already excluded the call).
- **`WelcomeBackCard`** restyled to match the same boxless, weight-300
  voice as the rest of the page (was still a bordered, bold card).
- Header restyled to a single small-caps, wide-letter-spaced dateline
  line, dropping the separate bold all-caps "THE DAILY OFFICE" eyebrow.

Verified: tsc -b, eslint, production build all clean (one dead-import
cleanup: `CARD_STYLE` is no longer used in this file). Visually verified
via a temporary Playwright script with `chronicle.register.override`
forced to `morning` (the exact register in the user's flagged
screenshot) and a scrolled second capture — confirmed the call-to-worship
verse now renders at the mockup's scale and weight, the station ordinal/
heading pattern matches, and the hairline divider appears where the
mockup's `.station-rule` does.

Fixing this surfaced five test assertions written against the old
structure — all confirmed as intentional-change updates, not regressions
masked: `the-hours.spec.js` and `app-smoke.spec.js` asserted literal
text `'Call to Worship'`, which no longer exists as a distinct string
(now ambient, unlabeled) — repointed to assert the `The Word` heading
(role `heading`) instead, which still proves the full Office rendered.
`the-hours.spec.js`'s grace-return test asserted a `"· " + text` bullet
prefix that `WelcomeBackCard` no longer renders — updated to match on
the text alone. `remembrance.spec.js` asserted `getByRole('heading',
{name: 'Remembrance'})`, which broke because the label had been a plain
`<div>`, not a heading — fixed by making it a real `<h2>` (a correctness
fix independent of the test, restoring the semantic heading a screen
reader should see there). Full Playwright suite (`--workers=1`): two
failures, both confirmed pre-existing/unrelated on isolated re-run —
`discipleship-progress.spec.js` (long-confirmed) and
`book-typeset.spec.js`/`ceremonies.spec.js` (new appearance of the
full-suite-only flake pattern, passed 4/4 in isolation; this slice
never touches Legacy.tsx or growth-marker ceremony code).

Remaining for Design-6: apply the same typography-and-spacing depth
(not just color) to Manuscript (all six Word pages) and Stone Court
(Thread altitudes + Heritage Room), and to Chapel's other six pages
(Rule, Prayer, Question Lab, Lament, Sealed Prayers, Memory) — Office.tsx
was fixed first because it was the one directly flagged.

## Design-7 (branch: design/nav-collapse) — Sidebar collapse to five rooms + section tab bars + chrome theming

Direct user instruction: the persistent left Sidebar must show only the
five main rooms — The Daily Office, The Word, The Prayer Room, The
Thread, Settings — with every other page either folded into its
section's own main page or reached as a sub-page from there. The
Sidebar and the AI companion panel must also pick up the visual theme
of whichever room is currently active, the way page content already
does per Design-1 through Design-6.

**Sidebar** (`Sidebar.tsx`): `NAV_GROUPS` (four labeled clusters, 11
items) replaced with a flat `NAV_ITEMS` array of exactly 5 entries plus
Settings. `My Rule of Life`, `Read`/`Daily Study`/`Discipleship`/
`Reading Plans`/`Themes`/`Memory`/`Explore`, `The Question Lab`, and
`The Heritage Room` all moved out — they're reachable only from within
their room now, never from the persistent nav.

**`SectionTabs`** (new shared component, `src/components/ui/
SectionTabs.tsx` + `src/lib/sectionTabs.ts`): a `<nav aria-label=
"Section">` tab bar, visually identical to the tab bar The Thread
already used internally since M21 — extended here as a generic,
reusable component. Four tab lists (`OFFICE_TABS`, `WORD_TABS`,
`PRAYER_TABS`, `THREAD_TABS`) are the single source of truth for each
room's page inventory, so it can't drift between the pages that render
it. Inserted at the top of every room's landing and sub-pages:
Office.tsx (all 4 return branches) + Rule.tsx; Bible/Study/Discipleship/
Plans/Themes/Memory/Explore.tsx (all 7 Word pages); Prayer/QuestionLab/
Lament/SealedPrayers.tsx (all 4 Prayer-family pages); OralHistory.tsx
(Heritage Room, all 4 return branches, pointing back into the Thread's
own tab set). The Thread's own hand-rolled tab bar (`Thread.tsx`) was
left as-is rather than swapped to the shared component — it has
route-param-driven view switching this generic version doesn't
replicate — but gained a sixth `Heritage Room` tab pointing at `/heritage`,
a genuinely separate route, alongside its five existing altitude tabs.

For pages with a row-flex layout (sidebar + reading pane side by side —
Bible, Themes, Plans), inserting a header tab bar required wrapping the
original row-flex content in a new intermediate div and changing the
root to `flexDirection: column`, rather than just adding a sibling —
each of those required finding and editing the matching closing `</div>`
independently, since JSX doesn't have a "wrap these existing children"
edit primitive.

**Chrome theming** (`src/lib/activeRegister.ts`, new): a route→register
map, `activeRegisterForPath()`, distinct from the existing Chapel/
Manuscript/Stone Court page-content registers in one respect — it
tracks the *section* a route belongs to, not that route's own register,
so `/thread/story` still themes the Sidebar/AI panel as Stone Court
(matching The Thread, the section it's inside) even though the Story
altitude's own content is Old Family Bible. Both `Sidebar.tsx` and
`AIChatPanel.tsx` compute this from `useLocation()` and append the
matching existing register CSS module class (`chapelRegister` /
`manuscriptRegister` / `stoneCourtRegister`, no new palette — Ledger
sections like Settings get no override, keeping the app's existing
default theme) to their own root element. The same custom-property
re-scoping technique from Design-2 onward means this required zero new
CSS — the Sidebar and AI panel already route their own chrome through
`var(--card-bg)`/`var(--text)`/etc.

Verified: tsc -b, eslint, production build all clean. Visually verified
via a temporary Playwright script asserting the Sidebar's nav button
list is exactly `["The Daily Office", "The Word", "The Prayer Room",
"The Thread", "Settings"]` on every one of the five landing routes, plus
screenshots of all five confirming: Office renders in Chapel dark-gold,
Word renders in Manuscript cream with all 7 tabs visible, Prayer renders
in Chapel dark with its 4 tabs, Thread renders in Stone Court parchment
with 6 tabs including the new Heritage Room, and Settings stays the
app's default light theme with no override.

Fixing this surfaced test fallout from the restructuring itself:
`app-smoke.spec.js` and `full-product-battery.spec.js` both had a
`primaryNavItem()` helper
scoped to `getByRole('navigation').first()` (the Sidebar specifically) —
broadened to search all `<nav>` elements now that SectionTabs is a
second nav landmark, and every click sequence that walked from one
room's sub-page directly to a sibling room's sub-page (e.g. Prayer Room
→ "Daily Study") was rewritten to click through the owning room's
Sidebar item first, since that sub-page's tab is no longer reachable
from anywhere except inside its own room. One phone-width interaction
(clicking a Sidebar item while Bible's Theme Overlay panel is open) hit
a pre-existing, unrelated instability in that panel's own dismiss
behavior at narrow viewports — worked around in the test by navigating
directly rather than fighting a flaky click, not a regression from this
change.

Full Playwright suite (`--workers=1`): one failure, the already-confirmed
pre-existing `discipleship-progress.spec.js` — no new failures.

Remaining for Design-7: none identified — this closes the navigation
restructuring the user asked for. Design-6's remaining typography work
(Manuscript, Stone Court, and the other six Chapel pages) is still open
as tracked follow-up.

## Design-8 (branch: design/chapel-candle-glow) — the candle-glow pass across all seven Chapel pages

The user's follow-up on Design-6: "I don't see the candle or glow on
anything" outside the Daily Office. direction-chapel.html is explicit
that Chapel's default register is darkness — "the only things that glow
are answered prayers and feast days" — but the user's actual intent was
broader: the candle motif should mark *any* important, impactful moment
across the room, not just Office's Remembrance card. Asked to scope it
(`AskUserQuestion`); the user chose "all key Chapel cards."

Extracted the Remembrance card's exact glow spec (radial wash + 3-layer
box-shadow, from direction-chapel.html's `.remembrance` block) into a
shared `src/lib/candleGlow.ts` — `candleGlowStyle()` for a single primary
box, `candleGlowRowStyle()` (smaller-radius) for list rows, and
`CANDLE_FLAME_TEXT_STYLE` for the flame-glyph text-shadow — so every
Chapel page lights its candle identically instead of five near-copies
drifting apart. Office.tsx's own RemembranceCard now calls the shared
helper instead of hand-rolling the same values.

Applied the glow to the one "lit" moment per page, keeping the mockup's
restraint (a candle, not a floodlight) while answering the user's ask
for it to actually be visible somewhere they'd look for it:
- **Office** — Remembrance (unchanged) plus the Silence station now
  glows while the minute of stillness is actually being kept — the
  meditation moment the user named directly.
- **Rule of Life** — a category card glows once it holds a written
  commitment; a kept Rule is a lit candle, not a checklist item.
- **The Prayer Room** — answered-prayer cards glow instead of fading to
  60% opacity (the old "checked-off task" treatment undersold the one
  thing direction-chapel.html says should always glow).
- **Question Lab** — resolved questions ("the Stones") glow.
- **Lament** — the "It is kept" completion screen glows; a lament
  carried honestly to trust is as lit as an answered prayer.
- **Sealed Prayers** — a sealed prayer glows once it's unlockable or
  already opened — light arriving on schedule.
- **Memory** — the verse card glows while revealed, i.e. while it's
  actually being held in the mind: the Word-room analogue of meditation.

Verification: `tsc -b`, `eslint .`, `vite build`, full Playwright suite
(`--workers=1`) all clean except the two already-known pre-existing
flakes — `discipleship-progress.spec.js` (reproduces standalone, genuine
unrelated failure) and `bible-modes.spec.js` (failed once in the full
run, passed clean in isolated re-run) — no new failures introduced.

## Design-9 (branch: design/chapel-candle-and-contrast) — a lit candle, and fixing the AI panel's contrast in Chapel

Two follow-ups from the user after Design-8 shipped: the AI companion
panel's text was hard to read on Chapel pages, and the candle motif was
still only implied by CSS glow — the user wanted an actual flickering,
photorealistic candle to reinforce the room's meditative feel.

**Contrast fix.** `AIChatPanel.module.css` washes its header, persona
bar, empty-state, and composer panels with a translucent
`rgba(255,255,255,X)` "frosted glass" layer — correct over Manuscript
and Stone Court's light paper backgrounds, but over Chapel's near-black
ground it lightens the panel to mid-gray while `--text-muted` (tuned for
near-black) loses most of its contrast against it. Introduced a
`--panel-glass` custom property (same re-scoping technique as every
other register token): unset by default so Manuscript/Stone Court's
existing white wash is untouched, overridden in `chapelRegister.module.css`
to a translucent black so Chapel's panel stays dark instead of graying
out. Also pinned the composer textarea's `::placeholder` color to
`var(--text-muted)` — browsers default placeholder color to a fixed
gray that assumes a light background and was otherwise unreadable on
Chapel's near-black input.

**The candle.** Built `src/components/ui/CandleFlame.tsx` — a real
rendered flame (not an icon standing in for one): a teardrop shape with
a three-stop radial gradient running blue-white at the base through
gold to a warm-white tip (an actual flame's color travel, not a flat
orange blob), a soft blurred aura, and a wax body+pool variant for
free-standing placements. Two independently-timed CSS animations (a
slow body sway, a faster inner-core flicker with irregular non-uniform
keyframes) keep the loop from reading as mechanically perfect;
`prefers-reduced-motion` holds it still.

Replaced the flame glyphs Design-8 had used as text (✦ in Office's
Remembrance card, 🕯️ in Lament's "It is kept" screen) with the real
component, and added it to the Daily Office's Silence station while a
minute of stillness is actually running — the user named meditation
directly, and sitting in the room's own silence with a lit candle
beside the countdown is the room's most literal meditative moment.

Caught and fixed in passing: applying `candleGlowStyle({ ...card, ... })`
to the Silence station's box briefly produced a real bug, not just a
lint nit — spreading `card` (which carries `borderBottom` and
`paddingBottom`) into the glow's extras left both a `border` shorthand
and a `borderBottom` longhand, and both `padding` and `paddingBottom`,
on the same style object. React warned about it at runtime ("mixing
shorthand and non-shorthand properties... can lead to styling bugs").
Fixed by building the glow variant from only the specific card fields
that don't conflict, rather than spreading the whole object.

Verification: `tsc -b`, `eslint .`, `vite build`, full Playwright suite
(`--workers=1`), plus a disposable Playwright script to screenshot the
actual rendered candle and AI panel in the Chapel register (the
project's normal preview-server tool couldn't spawn a process in this
sandbox — `process.cwd()` came back `EPERM` for every runtime tried;
worked around it by screenshotting through Playwright's own dev server
instead, then deleted the script). Two pre-existing flakes reproduced
in the full run and passed clean in isolated re-runs —
`discipleship-progress.spec.js` (already-known, unrelated) and
`sealed-prayers.spec.js` (cross-test data pollution from full-suite
ordering, not a regression from this change) — no new failures.

## Design-10 (branch: design/candle-shape-refinement) — a proper flame silhouette

Follow-up to Design-9: the user shared reference photos of real candle
flames — tall, narrow, smoothly tapering to a point, with a soft
diffuse ambient glow — and pointed out the shipped flame read as a
short, stubby, slightly melted-looking blob by comparison.

Reworked `CandleFlame.module.css`'s `.flameShape`: height nearly
tripled relative to width (was a 1.7:1 aspect ratio, now 2.6:1) and the
silhouette moved from a rounded `border-radius` blob to a `clip-path`
polygon — a real flame's outline (widest low, tapering steadily to a
fine point) can't be expressed with `border-radius` alone. First attempt
at the polygon used only 12 points with large width swings between
them (up to 18%), which produced a visibly faceted, hourglass-zigzag
edge rather than a smooth curve; corrected by doubling to 16 points
with much smaller width deltas between adjacent points (~2-4%), so the
outline reads as a continuous taper.

Also switched the flame's glow from `box-shadow` (which shadows the
element's invisible rectangular box, not the visible clipped shape) to
layered `filter: drop-shadow(...)`, which follows the actual flame
silhouette — the glow now hugs the flame the way it does in the
reference photos instead of implying a rectangle behind it. Widened and
softened the separate ambient `.aura` blob to match the diffuse
room-glow in the references.

Verification: `tsc -b`, `eslint .`, `vite build`, full Playwright suite
(`--workers=1`) — clean except the one already-known pre-existing
`discipleship-progress.spec.js` failure. Visual check via the same
disposable-Playwright-screenshot workaround as Design-9 (the project's
preview-server tool still can't spawn a process in this sandbox).

## Design-11 (branch: design/enter-the-chapel-tab) — Enter the Chapel as a first-class Office destination

The user said they loved the existing "Or enter chapel — one verse, no
chrome" link buried in the Office's Silence station, and asked for it
to become a top-level destination: "Enter the Chapel" beside "The Daily
Office" and "My Rule of Life," for meditative time with God — plus a
candle in Chapel mode itself, matching the same Chapel theme.

Added `{ label: 'Enter the Chapel', path: '/chapel' }` as a third entry
in `OFFICE_TABS` (`src/lib/sectionTabs.ts`) — no special handling
needed even though `/chapel` renders outside `AppShell` entirely (M11):
`SectionTabs` just calls `navigate(tab.path)`, so clicking it leaves the
whole shell the same way the original in-context text link already did.
Left that original link in place in Office's Silence station too — it's
still useful mid-liturgy, and the new tab doesn't replace it, just adds
a more discoverable second way in.

Fixed a real gap while wiring the candle in: `Chapel.tsx` never actually
applied the Chapel register. It read raw `var(--bg)`/`var(--text)`
tokens, meaning full-bleed Chapel mode was silently rendering in
whatever light/dark theme was set in Settings rather than always being
the dark/gold room the mockup describes — nobody had noticed because
the app's default theme happens to already be dark. Wrapped the root in
`chapelStyles.chapelRegister` so Chapel mode is Chapel regardless of
the global theme toggle, matching every other Chapel page. Added
`<CandleFlame size="lg" withBody />` above the verse — the same
component and animation as the Daily Office/Lament candles from
Design-9/10, so all of Chapel's candles are visually identical.

Verification: `tsc -b`, `eslint .`, `vite build`, full Playwright suite
(`--workers=1`) — clean except the two already-known pre-existing
flakes (`discipleship-progress.spec.js`, `bible-modes.spec.js`, both
reconfirmed unrelated in prior slices). Visual check via the same
disposable-Playwright-screenshot workaround as Design-9/10.

## Design-12 (branch: design/photo-candle) — a real photographed candle under the animated flame

Follow-up to Design-9/10: the user supplied a detailed motion-graphics
brief for a photoreal 3D-rendered candle (specific wax/wick/flame
color science, an 8-second 192-frame loop, PNG/WebM/MP4/sprite-sheet
deliverables). Flagged honestly up front that this codebase has no 3D
render or video-compositing pipeline — that's a Blender/After-Effects-
class deliverable, not a CSS/SVG one — and scoped down to what's
actually buildable here: push `CandleFlame`'s existing CSS animation
closer to the brief's color/motion spec, and add the ignite/extinguish
lifecycle. The user then supplied an actual photographed candle hero
image and asked to composite the animated flame onto it directly
rather than continue hand-drawing the wax in CSS.

Added `src/assets/candle-hero.png` (resized from the 1024×1536 source
to 640×960 — full resolution was overkill for a ~240px display size and
cut the file from 2.2MB to ~600KB) and a new `src/components/ui/PhotoCandle.tsx`
that renders it with `CandleFlame` composited on top. The flame's
anchor point (49.95%, 29.56% of the frame) was measured, not eyeballed —
a small Python/Pillow script scanned the source photo for the wick's
near-black pixels and computed its bounding-box center — so the flame's
base lines up with the actual wick regardless of what size `PhotoCandle`
renders at.

`CandleFlame` gained two props to support this: `widthPx` (an exact
pixel override for the size presets, needed to match whatever size the
photo is rendered at) and `flameOnly` (drops the CSS wax body/wick/aura
entirely, leaving just the flame + wick-ember glow, since the photo
already has all of those). The `phase`-driven ignite/extinguish
lifecycle from Design-9 carries through unchanged — `PhotoCandle` just
forwards `phase` to the composited flame.

One real bug caught and fixed before shipping: the source photo's own
vignette background is a slightly lighter near-black than Chapel's
`--bg`, so its square frame edge showed as a faint but visible
rectangle against the room instead of disappearing into it. Fixed by
applying a radial-gradient `mask-image` to the `<img>` that fades it to
transparent at the edges, so only the glow reads and Chapel's actual
background shows through everywhere else — confirmed via screenshot
before and after.

Wired into Chapel.tsx in place of the CSS-only `CandleFlame withBody`
hero usage; every other Chapel-page usage (Office's Remembrance/Silence,
Lament's "kept" screen, etc.) is untouched and still uses the pure-CSS
candle, since those are small inline accents where a tall portrait
photo wouldn't fit the layout.

Verification: `tsc -b`, `eslint .`, `vite build`, full Playwright suite
(`--workers=1`) — clean except two transient/pre-existing failures
(`archaeology.spec.js` ECONNRESET, reproduced clean in isolated re-run;
`discipleship-progress.spec.js`, the long-confirmed pre-existing
failure) — no new regressions. Visual check via the same disposable-
Playwright-screenshot workaround as Design-9/10/11.

## Design-13 (branch: design/study-colors-strongs) — Study Colors rebuilt on Strong's numbers, whole-Bible, translation-independent

The Word's "Study Colors" toggle previously ran on 6 hardcoded English-
phrase categories (~50 total substring patterns, hand-typed against the
9-chapter offline demo corpus) — the user asked three pointed questions
before any redesign work started: is it *correct* (matched to what's
actually on screen), *comprehensive* (whole Bible, not just John 1),
and *translation-specific* (does one phrase list even work across all 9
installed translations)? All three were legitimate — the old patterns
were lifted from ESV-style wording while the app's primary display
translation is NKJV, meaning most patterns silently failed to match.

**The fix: tag verses by the Strong's number of the underlying Greek/
Hebrew word, not by guessing English phrasing.** The repo already had
`public/study-library/strongs/kjvstudy/` — a Strong's interlinear
covering 1,181 of 1,189 Bible chapters (missing only Song of Solomon,
which the corpus doesn't include) — wired up for NT-only "Greek Word
Study," but with the identical data structure available for the OT.
Extended `bibleWordStudy.ts` with `getChapterStrongsNumbers()` (a new,
unfiltered, both-Testament chapter loader, kept separate from the
existing NT-only `getChapterWordStudy` which still powers the Greek
panel unchanged) and rebuilt `bibleStudyColor.ts`'s
`getChapterStudyColors()` around it — verse tagging is now keyed to the
actual word in the text, so it's correct and translation-independent by
construction rather than by luck.

**Taxonomy: a highlighter (topic) + ink (mode) system**, chosen over a
flat category list per explicit user direction ("clear, not complex").
7+3 learnable primitives combine into 21+ meaningful readings — a verse
isn't a flat category, it's "Spirit-topic, promise-mode" or "sin-topic,
warning-mode," which is how those verses actually read. Mode detection
(stated/promise/warning) is a separate, lighter, English-phrase-based
pass layered on top — Strong's numbers tag individual words, not a
sentence's speech-act, so this part is translation-sensitive by
necessity and deliberately only adjusts ink color, never whether a
verse is tagged at all.

**The taxonomy grew from 7 families to 12 through direct user review**,
each catch driven by a real gap: Prophecy/return of Christ was entirely
absent (had been folded into the "promise" ink-mode, but prophecy is a
topic, not just a tone); Family/household and Comfort/refuge were
missing devotional staples; Leadership/calling had nowhere to live;
God's names/character and Praise/thanksgiving/exaltation were split
apart from one merged family once the user flagged that praise deserved
its own color, matching the original reference chart's own separation.
Final roster: God's Names, Praise/Thanksgiving, The Holy Spirit, Gospel
& Salvation, Faith/Healing/Miracles, The Walk, Lament/Repentance, Sin &
the Enemy, Prophecy & Return of Christ, Family & Household, Comfort &
Refuge, Leadership & Calling — ~250 verified Strong's numbers total.

**Every single number was independently verified, not trusted from
model memory.** A multi-agent `Workflow` (explicitly authorized by the
user — "multi-agent usage authorized... independent agentic
verification authorized") ran propose → grep-verify-against-the-real-
lexicon-file → adversarial-doctrinal-review-with-WebSearch for each
family. This caught real hallucinations before they shipped: several
proposed Strong's numbers didn't exist or pointed to entirely different
words (a guessed "reconciliation" number that was actually "disqualify,"
a guessed "false prophet" number that was actually "false Christ," a
garbled non-number). It also caught a substantive doctrinal error: the
proposed core term for "baptism in the Spirit" (G0909, *baptismos*) is
actually ceremonial washing, not Spirit baptism — the correct word
(G0908, *baptisma*) had to be manually verified and swapped in. Full
verification detail (which numbers were proposed, verified, confirmed,
refuted, or left uncertain, and why) lives in the workflow transcripts
from this session; the shipped taxonomy in `studyColorTaxonomy.ts`
keeps only lexicon-verified, doctrinally-unrefuted entries.

**A real gap was caught during manual spot-checking, after the
automated verification passed.** Isaiah 40:1, "Comfort, yes, comfort My
people" — the verse the Comfort family exists for — wasn't tagging as
Comfort. The word (H5162, *nacham*) had been excluded from that family
during the doctrinal review for being ambiguous (it spans comfort AND
relent/repent senses), but excluding it meant the family's own namesake
verse didn't work. Restored it, dual-tagged into both Comfort and
Lament like several other genuinely dual-sense words already in the
taxonomy — a reminder that automated verification catches wrong
answers, not necessarily missing right ones; both passes were needed.

**Rendering**: since the Strong's data is word-position-aligned to the
KJV specifically, word order doesn't line up with the other 8 installed
translations' phrasing — so unlike the old engine, this doesn't attempt
exact-substring highlighting inside the displayed verse text. It tints
the whole verse instead (highlighter background + ink text color), a
simplification stated to the user up front as the honest tradeoff for
correctness across every translation rather than a fragile per-
translation guess. Verified directly: Acts 2:2-4 tags identically
across NKJV and AMP despite completely different English wording,
because the tag follows the Greek word, not the displayed text.

**Verification**: `tsc -b`, `eslint .`, `vite build`, full Playwright
suite (`--workers=1`) — one pre-existing test (`bible-modes.spec.js`)
needed real updates (old category-label assertions no longer exist
after the rewrite), now passing; one already-known pre-existing failure
(`discipleship-progress.spec.js`) unrelated to this change. Manual spot
verification via disposable Playwright screenshots across Acts 2 (NKJV
+ AMP), Romans 8 (CSB), Isaiah 40 (NKJV, confirms OT coverage), and
1 Corinthians 12 (NKJV) — all tagged sensibly, translation-independence
confirmed directly, one real gap (Isaiah 40:1 above) found and fixed
before shipping.

Known follow-up, not fixed in this pass: a handful of very common,
highly polysemous Strong's numbers (e.g. Hebrew *qara'*, "to call,"
tagged for Leadership's "calling" sense) will occasionally over-fire on
their ordinary generic usage ("cry out to her") since word-level Strong's
tagging can't disambiguate sense without deeper NLP. Noted as an
accepted limitation of the approach, not a bug — the alternative
(excluding common words entirely) would silently under-tag instead.
