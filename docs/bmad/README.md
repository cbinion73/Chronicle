---
title: Chronicle BMAD Delivery Backlog
status: draft
updated: 2026-05-04
owner: Codex + Chris
---

# Chronicle BMAD Delivery Backlog

This folder turns the current product direction into a build-ready BMAD backlog.

BMAD here means:

- build the next highest-value slice
- measure it in the browser and against real workflows
- analyze what is still weak or misleading
- decide the next slice based on user trust, formation value, and product coherence

This is not just a roadmap. It is the working execution set for Chronicle.

## Product Target

Chronicle is a local-first spiritual formation and Bible study product that combines:

- daily formation
- Scripture reading
- theological study
- discipleship workbooks
- prayer
- Chronicle AI companionship
- durable personal spiritual memory

## Current Product Posture

Chronicle is beyond prototype shape, but not yet a fully trustworthy daily-use product.

The next product moves should optimize for:

1. trust
2. accuracy
3. coherence
4. daily usability
5. long-term portability

## Delivery Ordering

### P0: Trustworthy Core

P0 makes the app dependable enough for real daily use on desktop.

See: [P0 Backlog](./p0-trustworthy-core.md)

### P1: Deep Product Intelligence

P1 makes the app wise, grounded, and spiritually helpful rather than merely functional.

See: [P1 Backlog](./p1-deep-product-intelligence.md)

### P2: Finished, Portable Product

P2 makes Chronicle feel complete, polished, and ready for multi-device life.

See: [P2 Backlog](./p2-finished-portable-product.md)

## Execution Tracker

The live build-state tracker is here:

- [Execution Tracker CSV](./execution-tracker.csv)
- [Launch Readiness Pass](./launch-readiness-pass.md)

It records the current codebase posture for every BMAD story with:

- epic
- story
- status
- percent complete
- evidence files
- remaining gap

## How To Use This Backlog

Work top-down unless a dependency forces a different order.

For each story:

1. implement the slice
2. verify it in the live app
3. add or update browser-level tests where the workflow is critical
4. tighten copy, layout, and trust signals before moving on

## Release Gates

### P0 Gate

- Bible study is trustworthy enough to use daily
- Discipleship import and workbook flows work end to end
- Today, Study, Discipleship, Prayer, and Chronicle AI feel connected
- Critical regressions are covered

### P1 Gate

- Bible interpretation feels insightful, not shallow
- Prayer and formation flows are meaningfully integrated
- Chronicle AI acts like a grounded assistant, not a generic chat surface

### P2 Gate

- local-first data model is stable
- sync architecture exists
- tablet and phone layouts are real
- the app feels launchable

## Relationships To Existing Docs

- Product framing: [../prd.md](../prd.md)
- Data posture: [../data-architecture.md](../data-architecture.md)
- Recent import work: [../overnight-discipleship-import-summary.md](../overnight-discipleship-import-summary.md)
