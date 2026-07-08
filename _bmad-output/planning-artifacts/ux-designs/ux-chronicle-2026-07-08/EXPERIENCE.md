---
status: final
updated: 2026-07-08
---

# Chronicle — Experience Spine

Cross-references `DESIGN.md` tokens by name using `{path.to.token}` syntax
throughout. Both spines win on conflict with any mock, wireframe, or
import.

## Foundation

**Form factor:** responsive web app (existing Chronicle shell), desktop-
first with an established phone-width fallback already shipped
(`useResponsiveLayout`, `isCompact`/`isPhone`). This redesign changes
**visual register per room**, not the app's overall responsive strategy —
existing phone breakpoints and safe-area handling carry forward unchanged
unless a specific room's redesign requires new phone behavior (flagged
per-room below).

**UI system:** no external component library; Chronicle hand-rolls its
own (`Card`, `Badge`, `TimelineDot` in `src/components/ui/`). This redesign
does not introduce shadcn/MUI/etc. — it extends the existing hand-rolled
system with register-specific variants.

**Room → register map** (the core decision this document encodes):

| Room | Register | Existing page(s) |
|---|---|---|
| Daily Office | `{colors.chapel}` | `src/pages/Office.tsx` |
| Prayer Room, Lament, Answered Light (as a Thread altitude), Sealed Prayers, Rule of Life | `{colors.chapel}` | `src/pages/Prayer.tsx`, `src/pages/Lament.tsx`, `src/pages/AnsweredLight.tsx`, `src/pages/SealedPrayers.tsx`, `src/pages/Rule.tsx` |
| Bible reading | `{colors.manuscript}` | `src/pages/Bible.tsx` |
| The Thread (Record / Growth / Patterns tabs + the thread-line itself), Question Lab, Heritage/Oral History, Archaeology | `{colors.stonecourt}` | `src/pages/Thread.tsx`, `src/pages/Chronicle.tsx`, `src/pages/GrowthMarkers.tsx`, `src/pages/QuestionLab.tsx`, `src/pages/OralHistory.tsx`, `src/pages/Archaeology.tsx` |
| The Book / Story | `{colors.oldbible}` | `src/pages/Legacy.tsx` |
| Study, Discipleship, Plans, Themes, Memory, Explore, Settings | `{colors.ledger}` (existing `tokens.css`, formalized — see DESIGN.md § The Ledger) | `src/pages/Study.tsx`, `src/pages/Discipleship.tsx`, `src/pages/Plans.tsx`, `src/pages/Themes.tsx`, `src/pages/Memory.tsx`, `src/pages/Explore.tsx`, `src/pages/Settings.tsx` |

**Rationale for the Ledger split**: Question Lab, Heritage, and
Archaeology went to Stone Court rather than Ledger because their actual
output is stones (resolved questions, family stones, backfilled growth
markers) — they belong with the room that displays stones, not with the
utilitarian rooms. Sealed Prayers and Rule of Life went to Chapel because
they're structurally part of the Prayer Room family (ceremony-driven,
already routed under `/prayer/*` for Sealed Prayers) and are ongoing
devotional practices, not data management. Study and Discipleship went to
Ledger specifically *because* they're the surfaces where the AI companion
is allowed to appear (per DESIGN.md's structural commitment #4) — an
AI-present, analytical posture is definitionally not one of the four
quiet devotional registers.

Every room in the app now has an explicit register assignment. **No room
is left on an unstated default** — if a future room doesn't fit one of
these five, that's a spine conversation (update this table), not a
silent fallback.

## Information Architecture

The top-level room structure is unchanged (sidebar nav still lists Office,
Bible, Study, Discipleship, Prayer, Rule, Questions, Heritage, Thread,
Themes, Plans, Memory, Explore, Settings) — this redesign is a **visual
and interaction register change within rooms already reachable**, not a
new navigation model layered on top. The one IA-level change:

- **Within the Thread room**, the existing altitude tab bar (Record /
  Answered Light / Growth / Story / Patterns, per `src/pages/Thread.tsx`)
  is retained as the mechanism for switching altitude, but Answered Light
  and Story, when viewed *inside* the Thread shell, keep their own
  registers (Chapel and Old Family Bible respectively) rather than
  inheriting Stone Court — **the altitude tab bar changes register on
  navigation**, the same way switching rooms does. Record and Growth
  render in Stone Court.

## Voice and Tone

Brand voice lives in `DESIGN.md § Brand & Style`; behavioral application
here:

- Never a number alone. "3 entries today," never "3." "Carried 4 years, 2
  months," never a raw day count. "Page 214 of your book," never "52%
  complete."
- The grace-banner copy is locked, verbatim, across every register:
  *"Welcome back. Here is what you were carrying when you were last
  here."* followed by specific waiting items (e.g. "Two of those prayers
  have since been waiting for you to see them answered.") — never an
  absence duration, streak, or day count.
- Feast-day/remembrance copy stays first-person-address, present tense:
  *"Seven years ago today — the answer to the prayer you carried through
  the hardest season of your life."*

## Component Patterns

- **`thread-line` {components.thread-line}** — behaviorally, a persistent
  visual indicator of position-on-the-line, rendered differently per
  register (see DESIGN.md) but always present in Bible, Thread, and Book
  registers. In Manuscript (Bible), it doubles as primary navigation —
  clicking a stone on the margin thread jumps to that stone's context.
  In Chapel (Office/Prayer), the thread-line is implicit (no literal line
  drawn) — the register communicates position through liturgical staging
  (station number, hour) rather than a visible line, consistent with
  Chapel's "one thing at a time, revealed progressively" pattern.
- **`stone` {components.stone}** — clicking any stone opens that stone's
  full context (existing behavior: growth-marker stones link to their
  Chronicle entry and optional passage; answered-prayer stones link to
  their full arc). No new click behavior introduced by the register
  change — only the visual rendering changes.
- **`stillness-beat` {components.stillness-beat}** — unchanged from
  shipped ceremony components (`AnsweredPrayerCeremony`,
  `GrowthMarkerCeremony`, `SeasonalExamenCeremony`, `SealedPrayerCeremony`,
  `QuestionResolutionCeremony`). This redesign re-skins their container to
  the relevant register (Chapel for prayer/growth ceremonies happening in
  Office/Prayer context) but does not change their staged-state machine.
- **`grace-banner` {components.grace-banner}** — behaviorally unchanged
  from the M9 `useWelcomeBack` implementation; re-skinned to Chapel
  register when it appears in the Office.
- **`gilt-edge` {components.gilt-edge}** — Old Family Bible only, purely
  decorative (chapter-heading drop-rule, page-block edge treatment); no
  interactive behavior.

## State Patterns

- **Empty states**: every register needs its own empty-state voice
  (existing `EmptyCard` component is Stone-Court-appropriate as-is; Chapel
  and Old Family Bible need a register-appropriate empty state — this is
  an **open item**, not yet designed. Do not ship a Stone-Court-styled
  `EmptyCard` inside a Chapel or Old Family Bible screen.)
- **Loading states**: no register-specific spec yet — inherit existing
  `RouteLoading` behavior app-wide. **Open item.**
- **Waiting/sealed states**: sealed prayers "visible but not touchable" —
  in Stone Court this is a stone rendered in `{colors.stonecourt.stone-waiting}`
  fill (existing token name reused per DESIGN.md's Manuscript section;
  Stone Court needs its own waiting-state stone treatment — **open item**,
  the Manuscript `stone-waiting` token does not automatically apply to
  Stone Court stones).
- **Progressive reveal (Chapel-specific)**: stations beyond the current
  one render at reduced opacity, fading toward a soft mask near the fold,
  per the Chapel mockup. This is a **new interaction pattern** — the
  currently-shipped Office renders all stations at full opacity always;
  implementing this requires either scroll-position-driven opacity or a
  simpler "reveal next station on demand" click model. **Needs a decision
  before implementation**: scroll-driven (matches the mockup exactly, more
  complex) vs. click-to-reveal (simpler, changes the mockup's passive
  scroll-reveal feel into an active click). Flagged for the user, not
  assumed.

## Interaction Primitives

- Click/tap on any stone → navigate to that stone's detail (existing
  behavior).
- Click on the Manuscript margin thread-line at any point → jump reading
  position to that point's context (**new** — no equivalent exists today;
  the current Bible reader has no thread-line at all).
- Ceremony stillness beats: unchanged, existing skip-affordance pattern
  (all shipped ceremonies already allow skipping the stillness timer).
- No new keyboard/touch gesture vocabulary introduced — this is a visual
  and structural register redesign, not an interaction-model redesign,
  except where explicitly flagged above (Chapel progressive reveal,
  Manuscript margin-thread click).

## Accessibility Floor

- **Chapel's dark-default register is a real contrast obligation**: `chapel.text`
  (`#e9e2d4`) on `chapel.ground` (`#14110e`) — this pairing needs a formal
  contrast check against WCAG AA before shipping (visually looks compliant
  in the mockup at 15px+ serif weight, but has not been measured).
  `chapel.text-faint` (`#6f6656`) on `chapel.ground` is the pairing most at
  risk — **verify before shipping**, do not assume mockup-eyeballing is
  sufficient.
- **Old Family Bible's foxed-vignette edges must never reduce text
  contrast** — the vignette effect is decorative page-edge darkening; body
  text must stay within the un-vignetted safe area, never partially
  obscured by it.
- **Stone Court's irregular stone shapes** must retain a clear click/tap
  target — an irregular CSS blob shape should not shrink the actual
  hit-area below the existing 44px touch-target minimum already
  established as a fix target in this codebase (see completed task
  "Audit all pages for phone-width layout issues").
- Existing `prefers-reduced-motion` handling (if any) and focus-visible
  states must be re-verified per register once real screens are built —
  not audited as part of this design pass.

## Key Flows

**Chris opens the Office at 6am after a hard week.** He's been away four
days. He opens Chronicle expecting either silence or a guilt-trip banner
— what he gets is the Chapel register: near-black ground, warm serif text,
and the grace-banner in `chapel.accent-gold`: *"Welcome back. Here is what
you were carrying when you were last here. Two of those prayers have
since been waiting for you to see them answered."* No day count. He taps
through to see them — the answered-prayer stone glows gold. The climax
beat: he didn't get shamed for the gap, he got *met* at it, and the one
warm thing on the dark screen is exactly the thing that matters — an
answer that was waiting for him.

**Chris opens his Bible to Psalm 34 on a Tuesday afternoon.** The register
shifts to Manuscript — cream paper, ink text, a thin ink line running down
the left margin with small stones on it marking days he's returned to this
book before. A rubric-red note in the margin: *"You clung to this passage
in March 2027."* He clicks the stone on the thread at that point and reads
what he wrote then, in his own words, from his own hard season two years
ago. The climax beat: the thread-as-margin-nav makes this feel like
opening a book with his own marginalia already in it, not a search result.

**Chris walks the Thread to find when he first felt called to ministry.**
He opens the Thread room — Stone Court register, quiet sidebar, parchment
ground. He scrolls down the drawn ground-line and sees a slate standing
stone: 🧭 *Calling Clarified — March 2019*. He taps it; the stone has
real weight, a top-light rim, a shadow — it does not look like every other
card in the app. The climax beat: this stone visually announces "this
mattered" before he's even read the text on it.

**Chris opens the Book on his fortieth birthday.** The register shifts to
Old Family Bible — an oxblood leather cover, gilt page-edges, aged paper.
The running header reads *"The Book of Chris · Part III · The 2020
Season."* At the bottom: *"You are on page 214 of your book."* The climax
beat: this doesn't feel like a generated summary in a card. It feels like
an object he could hand to his daughter.

---

## Open Items (must resolve before build)

1. Empty-state and loading-state visual specs per register (Chapel, Old
   Family Bible) — not designed yet.
2. ~~Chapel's progressive-reveal mechanism~~ **Resolved: click-to-reveal.**
   Each station is revealed on explicit user action, not scroll position.
   Simpler, fully accessible, no scroll-jank risk.
3. Formal WCAG AA contrast verification for Chapel's darkest text pairing
   (`chapel.text-faint` on `chapel.ground`).
4. Stone Court's own "waiting/sealed" stone visual treatment (distinct
   from Manuscript's `stone-waiting` token, which is Manuscript-specific).
5. A formal 4-step type scale per register (DESIGN.md flags this as open
   too) — needed before implementation, not invented here.
6. ~~Rooms not assigned a register~~ **Resolved:** every room now has an
   explicit register (see Foundation table above), including a 5th
   register, the Ledger, for utilitarian/study surfaces.
