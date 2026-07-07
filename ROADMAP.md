# Chronicle — The Execution Plan

This is the buildable sequence for everything in [VISION.md](VISION.md).
The vision is enormous; the steps stay small. Every milestone below follows
the discipline that shipped Milestones 1–8 (see [REDESIGN.md](REDESIGN.md)):

- One milestone = one branch (`redesign/milestone-N`), the **smallest real
  version** that establishes the correct architecture.
- Zero destructive migrations, ever. Additive only.
- Verified with `tsc -b`, eslint, production build, full Playwright suite.
- Merged `--no-ff` to main, deployed, confirmed healthy in production.
- Each milestone ends with a report and a recommendation for the next.

## Standing Foundations (start now, never stop)

These are not milestones; they are rules that apply to every milestone from
M9 forward, because they cannot be retrofitted:

- **F1 — Format longevity.** Every new feature's data must export to plain,
  open formats (markdown/JSON). Each milestone that adds a data shape adds
  its exporter. This accretes into the Ring-5 protocol; the Obsidian Bridge
  was the first brick.
- **F2 — The seal.** Every architecture decision favors local-first and
  user-owned data. No analytics on entry content, ever. The sealed-entry
  tier gets a design doc during Movement II and ships no later than
  Movement III.
- **F3 — The no list.** Nothing on VISION.md's No List is ever built, even
  as an experiment.

---

## Movement I — The Register *(the app learns reverence)*

**M9 — The Hours.** The app learns to keep time. Hour-aware register
(morning / midday / evening) expressed through the existing token system;
the Daily Office reshapes by hour — morning opens with the Call to Worship,
evening becomes examen and pulls the day's own entries; **re-entry as
grace** replaces the absence banner ("Welcome back. Here is what you were
carrying…"). This is the heartbeat every later ceremony syncs to, felt on
every open.
*Scope guard: hour + day-of-week only; the church-year calendar joins in a
later milestone once the register system exists.*

**M10 — The Ceremonies.** The five sacred actions stop going through CRUD
modals. First: the answered-prayer ceremony (the request moves into the
light, a beat of stillness, the answer written as the closing act). Second:
growth-marker stone-setting. All destructive confirms (`window.confirm`)
become undo toasts. No AI anywhere inside a ceremony (Covenant #2).

**M11 — The Quiet Pass + Chapel Mode.** The design-system debt paid down in
service of the register: a 4-step type scale, honest tokens (`--accent-green`
is blue — rename it), extracted Card/Badge/SectionHeader/Spine components,
the AI companion collapsed by default to a single quiet input with 2–3
context-aware actions. And **chapel mode**: one verse, no chrome, nothing
to tap.

## Movement II — Time Becomes Bidirectional

**M12 — Remembrance.** On-this-day resurfacing and **personal feast days**
derived from data the thread already holds (baptism anniversaries, answered
prayer dates, growth markers). Highest tears-per-line-of-code in the plan.

**M13 — Sealed Prayers.** Write and seal until a date or event. Sealed
stones visible on the path ahead — seen, not touchable. Includes the F1
exporter and the F2 sealed-tier design doc.

**M14 — Echoes of Your Own Life.** Past entries resurface against the
passage being read now ("You clung to this passage in March 2027"). Builds
on the existing passage-reference machinery; no AI required — it's an index.

**M15 — Patina.** The Bible wears where you live: visited passages
accumulate subtle texture over time. Pure derivation from reading history.

## Movement III — The Whole Life

**M16 — The Question Lab & Lament.** The open-questions ledger (questions
stay open for decades with dignity; resolution is a ceremony and a stone)
and the lament room, scaffolded by the Psalms of lament. Resurrects the
Question Lab from the original Phase 2 plan, now with its real meaning.

**M17 — The Archaeology.** The guided backfill interview that excavates a
user's prehistory into stones (conversion, baptism, the prayer answered in
1998). This is most users' true first-run experience.

**M18 — Oral History.** The same interview engine pointed at someone else —
a grandparent's stones, captured with voice recording. Deliberately
adjacent to M17 because they share machinery. *This is the feature with a
funeral; if sequencing pressure ever mounts, this one moves up, never down.*

**M19 — The Book, Typeset.** The Story tab becomes an actual book: real
pagination, chapters broken at growth markers, years as parts, print-grade
PDF export, visible page count ("You are on page 214 of your book").

**M20 — The Thread Made Literal.** The zoomable line. Record, Answered
Light, Growth Spine, and Story become altitudes of one canonical
visualization. Sequenced last in the movement because it unifies everything
the earlier milestones created.

## Movement IV — The Braid *(the architectural shift: persons)*

**M21 — Households.** Real multi-user foundation. The single largest
architecture change in the plan (the app is currently one keeper behind
Cloudflare Access), which is why the entire single-user register is
perfected first.

**M22 — The Braid.** Parallel threads; shared stones set on multiple
threads at once; family worship as the visible crossing point.

**M23 — Letters Ahead.** Pre-birth and childhood letter threads — sealed
prayers plus the braid make this nearly free. Delivered at a set age.

**M24 — The Relay.** The Office handing off across time zones; the braid
shows the family's prayer passing around the planet.

## Movement V — The Church and the Saints

**M25 — The Mentor's Thread.** Selective thread-sharing for discipleship:
your stones from the age your apprentice is now.

**M26 — The Communal Ebenezer.** Opt-in pipeline from private answered
prayers to a congregation's shared Answered Light.

**M27 — The Communion of Saints.** The historical library, starting with
three to five public-domain threads (Augustine's Confessions, selected
Psalms as David's thread, Brainerd's journal, Brother Lawrence, Spurgeon)
rendered in Chronicle's own visual language.

## Movement VI — The Forty-Year Promise

**M28 — The Format.** The open Chronicle thread specification, published,
with reference importer/exporter. Formalizes what F1 has been accreting
since M9.

**M29 — The Winnowing.** The Record/Book editorial distinction and the
late-life ceremony of deciding what becomes testament.

**M30 — Memorial Mode & the Widow's Thread.** The thread completes with
dignity; the survivor prays through the departed's recorded prayers; the
inheritance handoff.

### Satellites (unscheduled, hardware/business-dependent)
The annual printed volume · the home altar (e-ink) · the Office read aloud
· recorded voice on stones · haptic Beads on the wrist · heirloom-economics
business model decision. Each becomes a milestone when its dependency
arrives; none blocks the movements above.

---

## Sequencing Rationale

- **The Hours comes first** because liturgical time is the heartbeat every
  ceremony, feast day, and register change syncs to — and it is felt on
  every single open.
- **Ceremonies before the Book** because the Book gains value as stones
  accumulate; ceremony quality determines stone quality.
- **The braid waits** until the single-keeper experience is right. Multi-user
  is the biggest architectural risk in the plan and it must not be taken
  while the register is still being tuned.
- **The format spec ships late but the format discipline starts now** (F1),
  so M28 is a formalization, not a retrofit.
- **Every milestone stays small.** The vision is finished in about forty
  years; each step is finished in a session.

## Where We Are

- ✅ M1–M8 shipped (see REDESIGN.md): the rooms, the physical Thread,
  the knowledge graph, the Study Council, council→Thread, the Answered
  Light, the Growth Spine, the Teaching Loft.
- ➡️ **Next: M9 — The Hours.**

### M9 detailed scope (ready to build)
1. A `register` concept derived from local time (morning / midday /
   evening) exposed app-wide (hook + data attribute on the document root,
   mirroring the existing `data-theme` pattern).
2. Register-aware tokens: morning and evening tone variants layered onto
   the existing light/dark themes in `tokens.css` — subtle, not a reskin.
3. The Daily Office reshapes by hour: morning = full Office (Call → Word →
   Silence → Prayer → Response); evening = examen variant that pulls the
   day's own entries and answered prayers for review.
4. Re-entry as grace: replace the `↩ N-day absence` banner with the
   welcome-back moment built from what the user was carrying (open prayer
   items, last entries) — no counts of what was missed.
5. Tests: register derivation unit-style checks via Playwright with a
   mocked clock; Office variant rendering; the re-entry moment; the usual
   full-suite/tsc/eslint/build verification and deploy.
