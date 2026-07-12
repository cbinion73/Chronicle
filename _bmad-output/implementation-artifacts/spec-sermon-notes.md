---
title: 'Add Sermon Notes to The Word'
type: 'feature'
created: '2026-07-12'
status: 'done'
baseline_commit: 'b4ae3057'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Chronicle has deep Scripture study and a long-term Thread, but no focused place to capture what was heard during a sermon and carry it into reflection, prayer, and later retrieval.

**Approach:** Add Sermon Notes as a sub-section of The Word. Provide a calm, mobile-ready capture workspace and a searchable archive backed by existing Chronicle entries, including sermon context, passage linkage, key ideas, personal response, and prayer.

## Boundaries & Constraints

**Always:** Place Sermon Notes under The Word in canonical section navigation and the expanding iOS rail; persist through existing `ChronicleEntry` APIs so local-first sync, snapshots, and Thread history continue to work; support create, edit, delete, search, and Bible passage handoff; require a sermon title and notes before save; retain 44px iOS controls and established manuscript visual language; make destructive deletion explicit.

**Ask First:** Any database/schema migration; audio recording or transcription; AI-generated sermon interpretation; public sharing or church-service integrations; changes to existing Chronicle entry semantics.

**Never:** Create a second storage system; present sermon notes as biblical authority; alter desktop shell behavior; require network access to write or reopen notes; silently discard an unsaved draft; add a separate main room.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Create note | Title, notes, optional preacher/church/date/passage/big idea/response/prayer | One `study` Chronicle entry tagged `sermon-notes`; form clears and saved note appears first | Disable save until title and notes are non-empty |
| Edit note | Existing sermon entry | Original entry updates in place without duplicate creation | Cancel restores persisted values |
| Delete note | Explicit delete action | Confirmation precedes removal from archive and shared Chronicle store | Cancellation leaves entry untouched |
| Open passage | Valid Scripture reference | Bible opens at parsed book/chapter | Invalid or missing passage leaves button unavailable and preserves note |
| Search archive | Text matching context or body | Matching sermon cards remain visible | Empty query restores date-descending archive |

</frozen-after-approval>

## Code Map

- `src/pages/SermonNotes.tsx` -- new capture, archive, editing, deletion, and Bible handoff surface.
- `src/pages/SermonNotes.module.css` -- manuscript-styled responsive layout and iOS touch treatment.
- `src/App.tsx` -- lazy route registration at `/sermon-notes`.
- `src/lib/sectionTabs.ts` -- canonical Word sub-navigation entry consumed by desktop and iOS.
- `src/components/layout/Sidebar.tsx` -- already derives expanded iOS sub-items from `WORD_TABS`; no bespoke sermon navigation.
- `src/store/index.ts` -- existing Chronicle entry CRUD used without modification.
- `src/lib/scriptureReference.ts` -- existing passage parser for Bible handoff validation.
- `src/types/index.ts` -- type-only registration of the new source-page identifier.

## Tasks & Acceptance

**Execution:**
- [x] `src/pages/SermonNotes.tsx` -- build the complete entry editor and searchable saved-note archive using existing Chronicle CRUD.
- [x] `src/pages/SermonNotes.module.css` -- implement an intentional manuscript workspace across phone, tablet, and desktop content widths.
- [x] `src/App.tsx`, `src/lib/sectionTabs.ts` -- register the route and expose Sermon Notes under The Word and the iOS expanding rail.
- [x] `tests/sermon-notes.spec.js` -- cover navigation, validation, persistence, edit, search, passage handoff, deletion, and iPhone rail presence.

**Acceptance Criteria:**
- Given Chronicle on desktop or iOS, when The Word navigation is shown, then Sermon Notes appears as a Word sub-item and opens `/sermon-notes`.
- Given required fields are complete, when a sermon is saved, then it appears in the archive and shared Chronicle store with `type: study` and `sourceContext.page: sermon-notes`.
- Given a saved note is edited or deleted, when the action is confirmed, then the same shared entry updates or is removed without affecting unrelated entries.
- Given a parseable passage, when Open in Bible is selected, then Chronicle navigates to that book and chapter.
- Given desktop is rendered, when this feature is added, then the existing shell layout and main-room navigation remain unchanged.

## Spec Change Log

## Design Notes

Use a two-zone workspace at wide widths: a focused writing sheet and a quieter archive rail. Collapse to one column on phone. Encode structured sermon fields into a readable body while retaining title, date, passage, and `sourceContext.page` as queryable entry metadata. Derive the editor back from that format so no schema extension is required.

## Verification

**Commands:**
- `npm run build` -- expected: TypeScript, Vite, sync, and workbook QA pass.
- `npx playwright test tests/sermon-notes.spec.js tests/ios-shell.spec.js --workers=1` -- expected: feature and navigation regressions pass.

**Manual checks:**
- Inspect desktop and iPhone layouts, long text wrapping, empty state, edit state, confirmation state, and the expanding Word rail.

## Suggested Review Order

**Capture And Recovery**

- The editor state model protects new drafts, resumed edits, and local calendar dates.
  [`SermonNotes.tsx:27`](../../src/pages/SermonNotes.tsx#L27)

- Structured markers preserve arbitrary sermon text while retaining readable shared entries.
  [`SermonNotes.tsx:46`](../../src/pages/SermonNotes.tsx#L46)

- Validated local recovery restores both the draft and the entry being edited.
  [`SermonNotes.tsx:101`](../../src/pages/SermonNotes.tsx#L101)

- Set-aside decisions prevent a saved sermon from silently replacing unfinished work.
  [`SermonNotes.tsx:236`](../../src/pages/SermonNotes.tsx#L236)

**Writing Experience**

- The manuscript workspace makes freeform Notes the dominant surface.
  [`SermonNotes.module.css:31`](../../src/pages/SermonNotes.module.css#L31)

- Ruled writing, reflection, prayer, and archive actions retain clear hierarchy.
  [`SermonNotes.module.css:189`](../../src/pages/SermonNotes.module.css#L189)

**Integration**

- Lazy routing keeps the new page isolated from initial application loading.
  [`App.tsx:10`](../../src/App.tsx#L10)

- Canonical Word navigation automatically powers desktop and expanding iOS rails.
  [`sectionTabs.ts:13`](../../src/lib/sectionTabs.ts#L13)

**Regression Coverage**

- Full CRUD, persistence, draft recovery, collision safety, Bible handoff, and iPhone navigation are exercised.
  [`sermon-notes.spec.js:25`](../../tests/sermon-notes.spec.js#L25)
