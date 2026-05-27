---
title: Chronicle Data Architecture and Pipeline
status: draft
updated: 2026-04-27
decision_order: B-before-A-before-D
---

# Chronicle Data Architecture and Pipeline

## 1. Architectural Posture

Chronicle is a desktop-first, local-first Bible study and spiritual formation application. The intended production surface is a Tauri shell over React or Next.js, TypeScript, and SQLite. The current Vite app is a UX prototype and should migrate toward this architecture as the data foundation matures.

The hard problem is not rendering a Bible reader. The hard problem is reliable content provenance, whole-Bible navigation, confidence-tiered theme tagging, original-language and cross-reference data, append-only Chronicle memory, and source-grounded AI behavior.

## 2. Core Decisions

| Area | Decision |
|---|---|
| Product posture | Formation-first study companion |
| Corpus | Whole Bible access from MVP |
| Deep tagging | Phased by passage and theme |
| Theme set | 12 MVP themes |
| Storage | Local SQLite |
| Desktop shell | Tauri |
| Graph model | Full theological graph, implemented first as relational graph tables |
| Chronicle model | Append-only spiritual memory system |
| Study surface | Full theological workbench |
| AI role | Full companion with strict source and mode rules |
| Content posture | Mixed content with strict provenance |

## 3. Data Pipeline Priorities

1. Establish source registry and license metadata before importing content.
2. Import whole-Bible canonical structure and text.
3. Attach provenance to every imported content row.
4. Add the 12 theme definitions.
5. Import or curate selected theme tags with reason, confidence, source, and status.
6. Import cross-references.
7. Add original-language tokens and lemma records where license permits.
8. Add public-domain commentary records.
9. Connect all records through graph-compatible edges.
10. Expose read APIs to the UI only after provenance rules are enforceable.

## 4. Source Registry

Every source must be registered before content from that source can appear in the app.

Required source fields:

- `id`
- `name`
- `source_type`
- `license_category`
- `attribution`
- `storage_rights`
- `modification_rights`
- `commercial_use`
- `url`
- `notes`

License categories:

- `public_domain`
- `permissive_open`
- `attribution_required`
- `share_alike`
- `api_display_only`
- `copyrighted_external`
- `user_created`
- `unknown`

The UI must never imply that unregistered content is trustworthy or reusable.

Initial API providers:

- API.Bible: primary official API candidate for whole-Bible access where the account is authorized for a translation.
- BibleGateway API: official API candidate when an access token and translation authorization are available.
- ESV API: official Crossway API candidate for ESV display with storage and quotation limits.
- BibleHub and Bible.com: external link-outs unless official API credentials and usage terms are identified.

## 5. Whole-Bible Corpus Strategy

Whole-Bible access is MVP. Whole-Bible deep tagging is phased.

MVP reader requirements:

- Open any book and chapter.
- Preserve canonical order.
- Display source attribution for the active translation.
- Attach notes to book, chapter, verse, phrase, or theme.
- Search at least by book/chapter/verse and plain text.

Deep-data rollout:

- Gold path: John 15 + Love + 1 John.
- First broad set: the 12 MVP themes across selected high-value passages.
- Then expand book-by-book and theme-by-theme.

## 6. MVP Theme Set

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

Every visible theme tag requires:

- Target passage or phrase
- Theme
- Confidence level
- Reason
- Source attribution
- Review status

Confidence levels:

- `direct`
- `strong`
- `inferred`
- `debated`
- `user_added`
- `ai_suggested`

Review statuses:

- `approved`
- `pending`
- `rejected`
- `hidden`

## 7. Graph Model

Chronicle models a full theological graph:

- passages
- verses
- phrases
- tokens
- lemmas
- Strong's entries
- themes
- doctrines
- prophecies
- people
- places
- events
- commentaries
- Logos links
- user notes
- AI responses
- Chronicle events

SQLite should implement this through relational tables and typed edges first. A dedicated graph database is not required until query complexity proves relational tables insufficient.

Edge records require:

- `source_node_id`
- `target_node_id`
- `relationship_type`
- `confidence`
- `reason`
- `source_id`
- `created_by`
- `status`

## 8. Chronicle Memory

Chronicle entries are append-only. Edits should create revisions rather than mutating history.

MVP Chronicle event types:

- `prayer`
- `reflection`
- `insight`
- `study_note`
- `theme_trail`
- `ai_exchange`
- `return_after_absence`
- `export`

Every entry requires:

- `author_id`
- semantic event type
- created timestamp
- body
- optional target node links
- optional source links
- provenance metadata

## 9. Study Bench Data Contracts

The full Study Bench includes:

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

Each module must declare one of these states:

- `available`
- `partial`
- `not_imported`
- `not_licensed`
- `coming_later`

The UI should not present placeholder claims as real study data.

## 10. AI Source Contract

AI modes:

- devotional reflection
- explain passage
- trace theme
- word study
- compare views
- lesson or devotional builder
- challenge my interpretation

Every AI answer must identify source basis:

- Scripture text
- theme tags
- original-language data
- cross-references
- public-domain commentary
- user notes
- AI inference

AI may not:

- invent citations
- invent Greek or Hebrew facts
- quote Logos-owned content unless the user supplied a short excerpt
- present user notes as external authority
- turn debated claims into certainty
- create approved theme tags without user review

## 11. Import Stages

| Stage | Output | Gate |
|---|---|---|
| 0 | Source registry | License fields complete |
| 1 | Canon and translations | Attribution renders in UI |
| 2 | Themes | 12 MVP themes seeded |
| 3 | Theme tags | Reasons and confidence present |
| 4 | Cross-references | Source and relationship type present |
| 5 | Original-language data | Lemma/surface/gloss distinctions preserved |
| 6 | Commentaries | Public-domain/license status verified |
| 7 | AI retrieval index | Only approved source classes indexed |

## 12. Initial Engineering Artifacts

The first data-foundation implementation should include:

- `data/schema.sql`
- `data/seed/sources.json`
- `data/seed/themes.json`
- a validation script that checks source and theme seed shape
- future import scripts that fail closed when provenance is missing
