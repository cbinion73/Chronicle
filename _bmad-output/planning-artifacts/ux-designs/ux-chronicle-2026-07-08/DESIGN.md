---
status: final
updated: 2026-07-08
colors:
  chapel:
    ground: "#14110e"
    ground-deep: "#0f0d14"
    ground-raised: "#1a1712"
    text: "#e9e2d4"
    text-dim: "#a89d88"
    text-faint: "#6f6656"
    accent-gold: "#e8b44f"
    accent-gold-bright: "#f5d489"
    hairline: "#3a3428"
    hairline-soft: "#2a251d"
  manuscript:
    ground: "#f7f3e9"
    ground-deep: "#f2ecdd"
    ground-raised: "#fbf8f0"
    ink: "#2b2721"
    ink-faded: "#57503f"
    ink-ghost: "#8a8168"
    rubric: "#8b2c2c"
    rubric-light: "#a94444"
    hairline: "#c9c0a8"
    hairline-soft: "#d8d0ba"
    stone-waiting: "#e8dfc8"
  stonecourt:
    parchment: "#efece4"
    parchment-shade: "#e7e3d7"
    parchment-raised: "#f5f2ea"
    sidebar-ground: "#6b6a62"
    sidebar-deep: "#5c5b54"
    sidebar-text: "#8a887c"
    hairline: "#d6d2c4"
    ink: "#33322c"
    text-quiet: "#62605a"
    text-whisper: "#8f8c80"
    stone-slate: "#5d6069"
    stone-slate-deep: "#4c4f57"
    stone-sand: "#c2a878"
    stone-sand-deep: "#b0955f"
    stone-moss: "#7a8471"
    stone-moss-deep: "#67725f"
    stone-clay: "#9c5a3c"
    stone-clay-deep: "#86492f"
    stone-glow: "#e8b44f"
    stone-highlight: "#f3ede0"
  oldbible:
    shelf: "#0f0b08"
    cover-outer: "#2e1e14"
    cover: "#4a1f1f"
    cover-light: "#5a2a2a"
    cover-shadow: "#2b1010"
    spine-dark: "#1c150f"
    page: "#e9d8ab"
    page-shade: "#d9c48f"
    page-foxed: "#cbb98a"
    gilt: "#c9a227"
    gilt-bright: "#e8c766"
    gilt-deep: "#8a5a1f"
    ink: "#3a2b17"
    ink-faded: "#6b4a10"
  ledger:
    note: "existing tokens.css palette (--bg, --card-bg, --text, --accent-primary,
      etc.) — this register does not introduce new colors, it formalizes
      what's already shipped. See src/styles/tokens.css."
typography:
  serif-stack: "Georgia, 'Times New Roman', Times, serif"
  sans-stack: "'Gill Sans', 'Segoe UI', 'Trebuchet MS', Verdana, sans-serif"
rounded:
  hairline: "1px"
  card: "6px"
  stone: "43% 57% 52% 48% / 47% 44% 56% 53%"
spacing:
  hero-margin: "40px 32px"
  browser-max-width: "1180px"
components:
  - thread-line
  - stone
  - stillness-beat
  - grace-banner
  - gilt-edge
---

# Chronicle — Visual Identity

## Brand & Style

Chronicle is "the family Bible, reborn" — a spiritual-formation record meant
to be inherited, not scrolled. This redesign rejects a single unifying skin
in favor of **four named registers**, one per room, because the rooms serve
genuinely different postures (praying is not reading is not walking the
thread is not opening the finished book). What unifies them is never a
shared palette — it's four shared *structural commitments*, present in
every register without exception:

1. **The thread is the spine, not a tab.** Every room is a position on one
   continuous line. Moving between rooms is movement along the thread, not
   a context switch to an unrelated page.
2. **No dashboard chrome on devotional surfaces.** No stat rows, no percent
   complete, no streak counters, no colored pill badges. Numbers appear
   only as narrative ("carried 4 years, 2 months") or as the Book's own
   page count.
3. **Ceremony over CRUD.** Marking a prayer answered, setting a growth
   stone, sealing a prayer — these are staged moments with a beat of
   stillness, never a modal with a Save button.
4. **One posture per screen.** Reading, praying, writing, remembering never
   compete on the same screen. No AI companion panel is visible in any
   register defined here — AI is confined to a single quiet threshold on
   study surfaces (Bible study, Discipleship), never in the Office, Prayer,
   Thread, or Book.
5. **The registers do not bleed into each other.** A person moving from
   the Chapel-dark Office into the parchment-bright Manuscript Bible reader
   is meant to feel the register change — like walking from a side chapel
   into the nave. This is deliberate, not an inconsistency to fix.

## Colors

### Chapel — Daily Office, Rule of Life, Prayer Room, Question Lab,
### Lament, Sealed Prayers, Scripture Memory
Darkness-first. Light is meaning: only answered prayers and feast days
glow. Everything else is quiet typography on a near-black ground. Final
room list per direct user instruction: Study and Discipleship, despite
being devotional in character, were assigned to Manuscript instead (all
of "The Word" is uniform Manuscript) — Chapel is the Office/Prayer
family plus Scripture Memory specifically.

| Token | Hex | Use |
|---|---|---|
| `chapel.ground` | `#14110e` | primary background |
| `chapel.ground-deep` | `#0f0d14` | page-edge vignette, deepest recess |
| `chapel.ground-raised` | `#1a1712` | rare subtle lift (never a card) |
| `chapel.text` | `#e9e2d4` | primary reading text (candlelit vellum) |
| `chapel.text-dim` | `#a89d88` | secondary / metadata |
| `chapel.text-faint` | `#6f6656` | tertiary / whisper-level labels |
| `chapel.accent-gold` | `#e8b44f` | **the one accent** — answered prayers, feast days, the active station |
| `chapel.accent-gold-bright` | `#f5d489` | inner flame of any glow effect |
| `chapel.hairline` | `#3a3428` | the only structural lines permitted |
| `chapel.hairline-soft` | `#2a251d` | quieter rule variant |

**Rule:** gold never decorates. If a gold glow appears on something that
isn't an answered prayer, a feast day, or the current liturgical station,
that's a bug, not a style choice.

### Manuscript — The whole Word group: Read, Daily Study, Discipleship,
### Reading Plans, Themes, Explore
Illuminated-manuscript register: paper and ink, with liturgical red used
the way medieval scribes used rubrication — never as decoration, always to
mark something structural (a station numeral, a feast mark, a cross-
reference). Per direct user instruction this register now covers all six
rooms of "The Word" uniformly, not just Bible reading — including
Discipleship's Workbook Audit sub-panel (a data-pipeline diagnostic
tool), which was flagged as a candidate for staying Ledger-styled but
no exception was requested, so it's Manuscript along with the rest of
the page.

| Token | Hex | Use |
|---|---|---|
| `manuscript.ground` | `#f7f3e9` | paper ground |
| `manuscript.ground-deep` | `#f2ecdd` | recessed / frame areas |
| `manuscript.ground-raised` | `#fbf8f0` | raised card ground (rare) |
| `manuscript.ink` | `#2b2721` | primary text |
| `manuscript.ink-faded` | `#57503f` | secondary text |
| `manuscript.ink-ghost` | `#8a8168` | tertiary / hairline-as-text |
| `manuscript.rubric` | `#8b2c2c` | rubrication accent — numerals, feast marks, marginalia |
| `manuscript.rubric-light` | `#a94444` | hover/active tint of rubric |
| `manuscript.hairline` | `#c9c0a8` | rules, borders |
| `manuscript.hairline-soft` | `#d8d0ba` | quieter rule variant |
| `manuscript.stone-waiting` | `#e8dfc8` | unanswered/waiting-state fill, where the Bible view touches Thread stones |

### Stone Court — The Thread (all altitudes except Story), Heritage Room
Tactile register: sacred moments are real CSS objects with weight, not
cards. A quiet sidebar survives here (the only register that keeps one),
because the Thread is where a person orients across the whole line, and
that needs a wayfinding rail. Per direct user instruction, every Thread
altitude is Stone Court except Story (Old Family Bible) — this pulls
Answered Light and Patterns in from what had been Chapel/Ledger
respectively, and Heritage Room joins as a Thread sidebar sibling rather
than a Prayer-group room.

| Token | Hex | Use |
|---|---|---|
| `stonecourt.parchment` | `#efece4` | main content ground |
| `stonecourt.parchment-shade` | `#e7e3d7` | recessed / seam areas |
| `stonecourt.parchment-raised` | `#f5f2ea` | raised card ground |
| `stonecourt.sidebar-ground` | `#6b6a62` | sidebar background |
| `stonecourt.sidebar-deep` | `#5c5b54` | sidebar shade |
| `stonecourt.sidebar-text` | `#8a887c` | sidebar text / hairlines on stone |
| `stonecourt.hairline` | `#d6d2c4` | parchment rules |
| `stonecourt.ink` | `#33322c` | primary text on parchment |
| `stonecourt.text-quiet` | `#62605a` | secondary text |
| `stonecourt.text-whisper` | `#8f8c80` | tertiary text |
| `stonecourt.stone-slate` | `#5d6069` | standing stones (growth markers) |
| `stonecourt.stone-slate-deep` | `#4c4f57` | slate shadow side |
| `stonecourt.stone-sand` | `#c2a878` | pebbles (prayer requests, unanswered) |
| `stonecourt.stone-sand-deep` | `#b0955f` | sand shadow side |
| `stonecourt.stone-moss` | `#7a8471` | living/growing stones (open questions) |
| `stonecourt.stone-moss-deep` | `#67725f` | moss shadow side |
| `stonecourt.stone-clay` | `#9c5a3c` | marked/feast stones (heritage, remembrance) |
| `stonecourt.stone-clay-deep` | `#86492f` | clay shadow side |
| `stonecourt.stone-glow` | `#e8b44f` | inner light of the answered-prayer stone (the one place Chapel gold crosses into Stone Court, deliberately — an answered prayer glows the same way everywhere) |
| `stonecourt.stone-highlight` | `#f3ede0` | top-light rim on every stone, the thing that sells "object" over "card" |

### Old Family Bible — The Book / Story
A real heirloom on a shelf, not a scriptorium: oxblood leather, brass gilt
page-edges, foxed and aged paper. Deliberately warmer and more domestic
than Manuscript — "grandmother's parlor Bible," not "monastery study."

| Token | Hex | Use |
|---|---|---|
| `oldbible.shelf` | `#0f0b08` | outermost ground, the "shelf" the book sits on |
| `oldbible.cover-outer` | `#2e1e14` | outer cover edge |
| `oldbible.cover` | `#4a1f1f` | leather cover face |
| `oldbible.cover-light` | `#5a2a2a` | leather highlight |
| `oldbible.cover-shadow` | `#2b1010` | leather shadow / cover recess |
| `oldbible.spine-dark` | `#1c150f` | spine shadow between cover and page block |
| `oldbible.page` | `#e9d8ab` | aged paper ground |
| `oldbible.page-shade` | `#d9c48f` | page shading toward the gutter |
| `oldbible.page-foxed` | `#cbb98a` | foxing/vignette darkening at page edges |
| `oldbible.gilt` | `#c9a227` | gilt page-edge stripe, drop-rules |
| `oldbible.gilt-bright` | `#e8c766` | gilt highlight |
| `oldbible.gilt-deep` | `#8a5a1f` | gilt shadow / engraved-rule depth |
| `oldbible.ink` | `#3a2b17` | primary reading text |
| `oldbible.ink-faded` | `#6b4a10` | secondary text, running header |

### The Ledger — utilitarian / study / management surfaces
Not devotional, and deliberately not trying to be. The original UX
critique that opened this whole redesign said it plainly: let the
"manage my data" surfaces stay denser and utilitarian while devotional
surfaces go quiet. This register is that instruction, formalized rather
than reskinned into one of the four devotional registers above.

Uses the **existing shipped `tokens.css` palette as-is** (`--bg`,
`--card-bg`, `--text`, `--accent-primary` and its siblings, light/dark
theme support already in place) — this redesign does not introduce new
Ledger colors. What it *does* formalize, per the original critique's item
3 ("one real design system"): a locked 4-step type scale actually applied
everywhere (not just the Office/ceremonies as today), and the existing
`Card`/`Badge` components used consistently rather than the current mix
of inline styles and one-off card patterns.

**Rooms in this register**: Settings — the only room-level Ledger
assignment remaining after the user's final direct instructions moved
Plans/Themes/Explore into Manuscript ("The Word") and Patterns/Answered
Light into Stone Court. The Ledger's other appearance in the app is not
room-level: Discipleship's Workbook Audit sub-panel (a genuine data-
pipeline diagnostic tool) was flagged as a candidate for staying
Ledger-styled inside an otherwise-Manuscript page, but no exception was
requested, so it renders in Manuscript along with the rest of that page
— see EXPERIENCE.md's room map for the full history of this decision.

## Typography

Every register shares one serif stack for reading text — `Georgia, 'Times
New Roman', Times, serif` — because switching typefaces between rooms
would read as inconsistency, not intentional register change. Stone
Court is the one register with a secondary humanist sans
(`'Gill Sans', 'Segoe UI', 'Trebuchet MS', Verdana, sans-serif`) for UI
chrome (sidebar labels, the wayfinding rail) — everywhere else, UI chrome
stays serif or is absent.

No numeric type scale is locked yet — the mockups used per-register
judgment (drop caps in Manuscript and Old Family Bible, large light-weight
single-column type in Chapel, medium density in Stone Court). **Open
item**: a formal 4-step scale per register should be extracted once real
screens are built, not invented here.

## Layout & Spacing

- Hero content max-width: `1180px` (matches existing `--sidebar-width`
  economy already in the shipped app — no change to overall app shell
  width).
- Chapel: single centered column, generous line-height, content revealed
  progressively (later stations fade toward a soft mask at the fold rather
  than all rendering at full opacity at once).
- Manuscript: wide margins, the thread rendered literally in the left
  margin as a 2px ink line with stones as small circles on it — this
  register's navigation *is* the thread, not a separate nav bar.
- Stone Court: the one register that keeps a persistent sidebar rail,
  because it's the orientation view across the whole line.
- Old Family Bible: facing-page or single-page-with-edge-shadow layout —
  an object with physical presence (spine shadow + gilt edge), not a flat
  text column.

## Elevation & Depth

- Chapel and Manuscript: near-zero elevation. No box-shadow cards. Depth
  comes from ground-color steps (`ground` → `ground-deep` →
  `ground-raised`) and hairlines only.
- Stone Court: real elevation on stones — layered inset shadows and subtle
  radial gradients so each stone reads as weighty and river-worn, plus a
  `stone-highlight` top-light rim.
- Old Family Bible: the heaviest elevation in the system — the book itself
  casts a real shadow onto its shelf (`0 30px 70px rgba(0,0,0,0.55)` in
  the mockup), and the page block has its own gutter shadow suggesting
  page thickness.

## Shapes

- `rounded.hairline`: 1px — every register's rule lines.
- `rounded.card`: 6px — the only rounded-rectangle radius permitted, used
  sparingly (rationale blocks, rare raised surfaces).
- `rounded.stone`: an irregular blob radius (e.g.
  `43% 57% 52% 48% / 47% 44% 56% 53%`, varied per stone instance so no two
  stones look identical) — Stone Court only. Never used for anything that
  isn't a literal stone object.
- Old Family Bible: soft-cornered "browser chrome" outer frame
  (`10px 10px 4px 4px`) suggesting a physical object sitting slightly
  irregular on a shelf, sharp corners inside the page block itself.

## Components

- **`thread-line`** — a continuous line (ink in Manuscript, implicit
  position in Chapel, a drawn ground-line in Stone Court) that stones sit
  on. This is the one component present, in some visual form, in every
  register.
- **`stone`** — the rendering of a sacred moment (growth marker, answered
  prayer, sealed prayer, resolved question, heritage stone). Visual form
  changes per register (a small ink circle in Manuscript, a glowing word
  in Chapel, a real CSS stone object in Stone Court) but the *meaning*
  (this is a permanent, set-apart moment) is constant.
- **`stillness-beat`** — the paused moment inside a ceremony (answered-
  prayer, growth-marker, seasonal-examen, sealed-prayer, question-
  resolution). No new visual spec beyond what's shipped; carries forward
  unchanged.
- **`grace-banner`** — the re-entry-after-absence moment. Copy is locked
  app-wide regardless of register: "Welcome back. Here is what you were
  carrying when you were last here," plus specific waiting items. No
  absence counter, no day count, ever, in any register.
- **`gilt-edge`** — Old Family Bible only. A thin gold-gradient stripe
  along the page block suggesting gilt-edged pages. Also used as the
  drop-rule above chapter headings in that register.

## Do's and Don'ts

**Do:**
- Let each register commit fully to its own ground color, even where that
  means Chapel is dark and Manuscript is bright right next to it in the
  nav.
- Use narrative for every number ("carried 4 years, 2 months," "page 214
  of your book").
- Let gold glow cross registers *only* for the answered-prayer/feast-day
  meaning — it's the one accent allowed to appear in more than one
  register, because it's tied to a fixed meaning, not decoration.

**Don't:**
- Don't add a stat row, percent-complete, or streak counter to any
  register.
- Don't round a stone into a rectangle, or square off a card into a stone
  — the shape is the tell for what kind of object something is.
- Don't let the AI companion panel appear inside Chapel, Manuscript (Bible
  reading), Stone Court, or Old Family Bible register screens.
- Don't invent a fifth register. Every room maps to exactly one of these
  four; if a future room doesn't fit, that's a spine conversation, not a
  new palette.
