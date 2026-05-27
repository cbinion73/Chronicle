---
title: Chronicle P2 Backlog - Finished Portable Product
status: draft
updated: 2026-05-04
priority: P2
---

# P2 Backlog - Finished Portable Product

P2 is about completion.

This phase turns Chronicle from a strong desktop product into a polished, portable, launchable product.

---

## Epic P2.1 - Chronicle Owns Its Data Model

### Outcome

Chronicle stops depending on desktop-specific file assumptions as a product boundary.

### Stories

#### P2.1.1 - Normalize product data models

Acceptance criteria:

- consistent IDs exist for:
  - translations
  - imported books
  - OCR segments
  - day slices
  - overlays
  - notes
  - bookmarks
  - answers
  - AI context

#### P2.1.2 - Separate source assets from Chronicle-managed data

Acceptance criteria:

- PDFs and raw source artifacts are distinguishable from normalized Chronicle records
- app logic reads from Chronicle-owned records, not ad hoc file paths

#### P2.1.3 - Stabilize manifests and storage contracts

Acceptance criteria:

- library manifests and study manifests are consistent
- import and sync layers have stable contracts to build on

---

## Epic P2.2 - Private Sync Across Devices

### Outcome

Chronicle works as one local-first system across desktop, iPad, and iPhone.

### Stories

#### P2.2.1 - Design the sync model

Acceptance criteria:

- sync architecture is defined
- offline-first behavior is preserved

#### P2.2.2 - Add conflict-safe merges

Acceptance criteria:

- notes, answers, bookmarks, and highlights can merge safely across devices

#### P2.2.3 - Sync formation state

Acceptance criteria:

- study progress, discipleship responses, Chronicle entries, and prayer history can sync

#### P2.2.4 - Support per-device local caches

Acceptance criteria:

- each device can work offline
- large assets are cached intelligently

---

## Epic P2.3 - UX and Visual Polish

### Outcome

Chronicle feels like one product with premium clarity rather than a cluster of evolving surfaces.

### Stories

#### P2.3.1 - Finish responsive layouts

Acceptance criteria:

- tablet and phone layouts are real, not accidental
- no clipped or overlapping UI remains

#### P2.3.2 - Reduce panel competition and clutter

Acceptance criteria:

- side rails, readers, and companion panels do not fight for attention

#### P2.3.3 - Improve loading, saving, sync, and processing states

Acceptance criteria:

- the app always tells the truth about what it is doing
- users are not left guessing whether work is complete

#### P2.3.4 - Unify visual language across all tabs

Acceptance criteria:

- typography, color, spacing, and interaction language feel consistent

#### P2.3.5 - Final readability and interaction polish

Acceptance criteria:

- Bible reading, workbook interaction, and study reflection all feel calm and intentional

---

## Epic P2.4 - Settings Becomes the Operational Control Center

### Outcome

Settings becomes the place where power users can understand and manage the system.

### Stories

#### P2.4.1 - Manage Bible library
#### P2.4.2 - Manage imported books and OCR jobs
#### P2.4.3 - Manage sync state
#### P2.4.4 - Manage AI and provider configuration
#### P2.4.5 - Manage caches, analyses, and data health

Acceptance criteria:

- Settings exposes the real operational state of the app
- advanced users can inspect and control key systems without code changes

---

## Epic P2.5 - Launch Hardening

### Outcome

Chronicle feels ready to live with every day.

### Stories

#### P2.5.1 - Full BMAD pass on every tab
#### P2.5.2 - Final end-to-end workflow test sweep
#### P2.5.3 - Final bug scrub
#### P2.5.4 - Minimal onboarding and help
#### P2.5.5 - Final branding consistency pass

Acceptance criteria:

- app-wide workflows pass cleanly
- remaining rough edges are intentionally chosen rather than accidental

---

## P2 Recommended Execution Order

1. P2.1.1 Normalize product data models
2. P2.2.1 Design the sync model
3. P2.2.3 Sync formation state
4. P2.3.1 Finish responsive layouts
5. P2.4.1 through P2.4.5 Settings control work
6. P2.5 Launch hardening

## P2 Definition of Done

- Chronicle is portable across devices
- the data model is no longer brittle
- the product feels polished and launchable
