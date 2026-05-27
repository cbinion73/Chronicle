---
title: Chronicle P0 Backlog - Trustworthy Core
status: draft
updated: 2026-05-04
priority: P0
---

# P0 Backlog - Trustworthy Core

P0 is about trust.

If P0 is incomplete, the app may look impressive but still fail in the places that matter most.

---

## Epic P0.1 - Bible Study Core Must Be Trustworthy

### Outcome

The Bible tab becomes dependable enough for real study, not just exploration.

### Dependencies

- local Bible library
- study-library imports
- current Bible overlay architecture

### Stories

#### P0.1.1 - Fix verse-level theme assignment

Make theme assignment verse-local instead of chapter-smeared.

Acceptance criteria:

- a verse only shows a theme when that verse has local support
- chapter-wide tags no longer repeat across unrelated verses
- John 1 no longer shows the same theme stack across most verses

#### P0.1.2 - Stabilize Bible overlay modes

Make the Bible overlay system coherent and reliable across:

- Themes
- Echoes / Cross References
- Study Colors
- Greek / Word Study

Acceptance criteria:

- all four modes can be toggled independently
- each mode has distinct behavior and purpose
- mode interactions do not corrupt each other visually or logically

#### P0.1.3 - Add chapter coverage safeguards

Prevent partial theme maps from masquerading as complete work.

Acceptance criteria:

- coverage summary is visible
- incomplete chapter maps cannot be saved
- refreshed theme maps clearly indicate whether the chapter is fully covered

#### P0.1.4 - Persist approved Bible analyses

Treat accepted theme work as durable product data.

Acceptance criteria:

- refreshed chapter analyses can be explicitly saved
- saved analyses reload consistently
- logic changes can invalidate or version old cached analyses

#### P0.1.5 - Improve evidence visibility

Make the Bible tab show why Chronicle reached a conclusion.

Acceptance criteria:

- themes show evidence trail entries
- echoes show canonical targets clearly
- word-study support is visible where relevant

#### P0.1.6 - Add Meaning / Reflection scaffold

Create the first honest passage-meaning layer without pretending the system is finished.

Acceptance criteria:

- Bible tab supports a passage-level reflection block
- reflection addresses meaning, author intent, redemptive-history placement, and application
- unsupported chapters do not show fake completed reflection content

### Exit Criteria

- Bible themes feel discriminating, not smeared
- Bible overlays are understandable
- Bible chapter analyses can be trusted and reused

---

## Epic P0.2 - Discipleship Import Pipeline Must Work End-to-End

### Outcome

Imported books become reliable study experiences without manual repair on every step.

### Dependencies

- OCR pipeline
- import UI in Settings
- discipleship normalization layer

### Stories

#### P0.2.1 - Harden the import pipeline

Make import a real pipeline:

- file import
- OCR
- chunking
- daily cadence detection
- workbook field detection
- study generation

Acceptance criteria:

- import succeeds on supported PDFs without manual code edits
- failures surface actionable state instead of silent breakage

#### P0.2.2 - Fix overlapping page/day mapping

Support page slices and shared pages across adjacent days.

Acceptance criteria:

- a single PDF page can belong to two days
- upper/lower or region-specific mapping is supported
- Experiencing God Day 4/5-style overlaps are modeled correctly

#### P0.2.3 - Improve workbook overlays

Make workbook interactions precise and calm.

Acceptance criteria:

- visible hotspots do not block the page
- overlays map to real workbook response zones
- Study and Workbook views write to the same stored response fields

#### P0.2.4 - Add import progress and recovery

Acceptance criteria:

- import progress is visible in the UI
- OCR status is visible in the UI
- failed imports can be retried or repaired

#### P0.2.5 - Improve OCR cleanup quality

Acceptance criteria:

- page chrome is reduced
- extracted daily text matches source day boundaries more closely
- low-confidence output is flagged instead of quietly trusted

#### P0.2.6 - Generate dynamic daily study structure

Acceptance criteria:

- imported books can generate day-specific study layouts
- preserved-daily books keep their own cadence
- non-daily books can be reshaped into daily study safely

### Exit Criteria

- imported books are trustworthy to use day by day
- workbook pages and Study pages agree with each other
- import feels like a product workflow, not a lab experiment

---

## Epic P0.3 - Daily Formation Flow Must Be Cohesive

### Outcome

Today, Study, Discipleship, Prayer, and Chronicle AI operate like one formation system.

### Dependencies

- stable Bible and Discipleship content
- current shared local state

### Stories

#### P0.3.1 - Make Today reflect actual live study state

Acceptance criteria:

- Today shows the real current study/disciple content
- Today actions route to the correct live destination

#### P0.3.2 - Resolve Study and Discipleship to the real current day

Acceptance criteria:

- Study opens the correct current study content
- Discipleship opens the correct current discipleship content
- no stale static examples remain in the main flow

#### P0.3.3 - Share formation state across tabs

Acceptance criteria:

- notes, bookmarks, highlights, and answers persist across related tabs
- linked content references remain stable

#### P0.3.4 - Improve Chronicle AI page grounding

Acceptance criteria:

- Chronicle AI understands the current page, passage, day, and book
- prompts and actions are context-specific rather than generic

#### P0.3.5 - Add one-click spiritual handoffs

Acceptance criteria:

- Scripture can become prayer
- Scripture can become reflection
- study answers can become Chronicle entries

### Exit Criteria

- major tabs feel connected
- users do not have to manually reconstruct context

---

## Epic P0.4 - Reliability and Regression Protection

### Outcome

Chronicle gets safer to improve.

### Dependencies

- existing build/test pipeline

### Stories

#### P0.4.1 - Finish remaining React/lint hardening

Acceptance criteria:

- no meaningful lint errors remain
- remaining warnings are understood and tracked

#### P0.4.2 - Expand Playwright coverage for core flows

Acceptance criteria:

- Bible core flows are tested
- Discipleship progression is tested
- import and workbook interactions are tested where practical

#### P0.4.3 - Add regression coverage for saved analyses and mappings

Acceptance criteria:

- theme cache behavior is covered
- import day mapping behavior is covered
- overlapping workbook page logic is covered

#### P0.4.4 - Add data versioning and migration discipline

Acceptance criteria:

- saved analysis artifacts carry versions
- migration path is defined when data shape changes

### Exit Criteria

- the product is safer to iterate on
- major core flows can be changed without blind fear

---

## P0 Recommended Execution Order

1. P0.1.1 Fix verse-level theme assignment
2. P0.1.2 Stabilize Bible overlay modes
3. P0.2.2 Fix overlapping page/day mapping
4. P0.2.3 Improve workbook overlays
5. P0.2.4 Add import progress and recovery
6. P0.3.2 Resolve Study and Discipleship to the real current day
7. P0.3.4 Improve Chronicle AI page grounding
8. P0.4.2 Expand Playwright coverage

## P0 Definition of Done

- Bible tab is trustworthy for daily study
- imported books are usable without manual babysitting
- formation flow across tabs is coherent
- browser-level regression protection covers the main user journeys
