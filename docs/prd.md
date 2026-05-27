---
title: Product Requirements Document - Chronicle
status: draft
updated: 2026-04-27
source_decisions:
  product_vision: Formation-First Study Companion
  product_promise: Faithful Attention
  primary_user: Formation-Minded Bible Student
  mvp_definition: Formation + Theme MVP
  product_pillars: Seven Pillars
  ai_role: Full Companion With Strict Modes
  theme_scope: 12-Theme MVP
  chronicle_scope: Append-Only Spiritual Memory System
  technical_posture: Desktop-First Local App
  study_bench_scope: Full Theological Workbench
  knowledge_graph_scope: Full Theological Graph
  content_posture: Mixed With Strict Provenance
  corpus: Whole Bible
  mvp_pass_condition: Whole-Bible Formation + Study Pass
  roadmap_shape: Data Pipeline First
---

# Product Requirements Document - Chronicle

## 1. Product Vision

Chronicle is a formation-first Bible study companion that helps Chris grow closer to God through Scripture while giving him deep study tools when curiosity, teaching, or theological reflection calls for them.

## 2. Product Promise

Chronicle helps make faithful attention more fruitful: Scripture becomes visible, study becomes grounded, prayer becomes remembered, and the user's walk with God becomes a living record.

## 3. Product Philosophy

Chronicle should never replace study, prayer, obedience, or spiritual attention. It should reward them.

The app exists to help the user see more clearly what is already in Scripture, respond honestly to God, and preserve a durable record of formation over time. It should feel reverent, warm, theologically serious, source-grounded, and quiet enough for actual attention.

## 4. Primary User

The primary user is Chris, a formation-minded Bible student.

Chris is a serious Bible student whose study is ultimately devotional and formative. He wants deep tools, but only insofar as they help him attend to Scripture, respond to God, and live faithfully.

## 5. Product Pillars

Chronicle has seven pillars:

1. Daily Formation
2. Scripture Reader
3. Theme Overlay Engine
4. Theological Knowledge Graph
5. Study Bench
6. Chronicle / Legacy
7. Grounded AI Companion

## 6. MVP Definition

The MVP proves that daily formation and deep study belong together: Today leads into Scripture, theme overlays reveal meaning, responses are captured in Chronicle, and study can become prayer, note, or output.

MVP includes:

- whole-Bible reader access
- Today dashboard
- 12 MVP themes
- available theme overlays
- theme explanations with reason, confidence, source, and status
- Chronicle capture
- prayer prompt
- basic Study Bench
- basic export
- source and license provenance scaffolding

Whole-Bible access is MVP. Whole-Bible deep tagging is phased.

## 7. MVP Pass Condition

MVP passes when Chris can open any Bible passage, toggle available themes, capture notes or prayers to Chronicle, use the Study Bench where data exists, and export a grounded study or devotional note.

At least one gold-path theme study, such as John 15 + Love + 1 John, must feel complete and trustworthy end-to-end.

## 8. Theme Overlay Scope

The MVP theme set is:

1. Love
2. Covenant
3. Messiah
4. Kingdom
5. Prophecy
6. Atonement
7. Spirit
8. Faith
9. Prayer
10. Wisdom
11. New Creation
12. Resurrection

Every visible theme tag must include:

- target
- reason
- confidence level
- source attribution
- review status

Confidence levels:

- Direct
- Strong
- Inferred
- Debated
- User-Added
- AI-Suggested

AI-suggested tags must remain unapproved until reviewed by the user.

## 9. Chronicle / Legacy Scope

Chronicle is a durable, append-only local record with semantic event types, author IDs, source links, graph links, export, personal view, and future Legacy AI query mode.

MVP implements the schema and basic UI. Advanced Legacy storytelling comes later.

Chronicle should preserve meaningful spiritual memory:

- prayers
- reflections
- insights
- study notes
- theme trails
- AI exchanges
- returns after absence
- exported outputs

Edits should create revisions rather than mutating the original record.

## 10. Technical Posture

Chronicle is a desktop-first local app: Tauri shell over React or Next.js, TypeScript, and SQLite. It is local-first, offline-capable, and treats content provenance, source labeling, and append-only Chronicle durability as foundational from the start.

The existing Vite/Zustand implementation is a UX prototype. It should migrate toward the production posture or remain explicitly disposable.

## 11. Study Bench Scope

The Study Bench includes:

- Observation
- Themes
- Cross-References
- Original Languages
- Concordance
- Commentary
- Prophecy
- Theology
- Application
- Logos
- Notes
- AI

The app should avoid showing empty or fake modules as if they are complete. Unimplemented modules should be staged, hidden, or marked clearly as unavailable until supported by real data.

## 12. Knowledge Graph Scope

Chronicle models passages, verses, phrases, tokens, lemmas, Strong's entries, themes, doctrines, prophecies, people, places, events, commentaries, Logos links, and user notes with typed edges, confidence levels, source attribution, and explanatory reasons.

Implementation should begin with graph-compatible SQLite tables.

## 13. Content and Licensing Posture

Chronicle supports open datasets, licensed Bible/API content, public-domain commentary, user-created notes, and external Logos links.

Every content item must include:

- source
- license category
- attribution
- storage rights
- modification rights
- commercial-use status
- provenance metadata

Logos content remains external unless the user creates a note or supplies a short excerpt for personal use.

## 14. AI Role

Chronicle's AI Companion supports distinct modes:

- devotional reflection
- explain passage
- trace theme
- word study
- compare views
- lesson or devotional builder
- challenge my interpretation

Every mode must follow source-basis, confidence, and theological humility rules.

MVP may implement only one or two AI modes, but the architecture and UI language must not pretend all modes are equally mature.

AI must not:

- invent citations
- invent Greek or Hebrew facts
- claim misleading "literal meanings"
- quote Logos-owned content without user-provided excerpt
- present user-created notes as external authority
- make debated claims sound settled
- approve its own theme tags

## 15. Roadmap Shape

Chronicle should prioritize the data pipeline first: acquire or import Bible text, original-language data, theme tags, cross-references, commentaries, and licensing/provenance metadata before expanding visible app features.

Recommended sequence:

1. Data architecture and pipeline spec
2. PRD rewrite
3. Data-foundation implementation
4. Whole-Bible reader backed by source registry
5. John 15 + Love gold path
6. 12-theme expansion
7. Study Bench module expansion
8. Grounded AI retrieval
9. Legacy and export polish

