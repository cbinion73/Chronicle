---
title: 'Mark a Bible chapter read and continue naturally'
type: 'feature'
created: '2026-07-14'
status: 'done'
baseline_commit: 'f8ba373f'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-chronicle-2026-07-13/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Chronicle currently asks the reader to leave the natural reading flow and find a checkbox to record a finished chapter. The standard chapter arrows navigate but intentionally do not mean “I read this.”

**Approach:** Add a prominent completion action at the end of the Bible chapter: “Mark Read & Continue.” It records the visible chapter through the existing local-first reading record and only after that succeeds advances to the next canonical chapter. Keep the ordinary navigation arrows unchanged and non-recording.

## Boundaries & Constraints

**Always:** Put the action after the final verse where finishing occurs; use the current local date/year; create the same validated `readingCompletion` Chronicle entry used by Daily Office and Reading Record; wait for the local save before advancing; cross book boundaries in 66-book canonical order; display pending, success, already-read, and failure states accessibly; keep the action usable on iPhone, iPad, and Mac; preserve CloudKit/offline queue behavior and the NKJV reader invariant; commit only files belonging to this feature; push the resulting Chronicle commits as explicitly requested.

**Ask First:** Changing what counts as a completed reading, adding automatic scroll-based completion, adding reminders or streak rewards, or rewriting the all-time repeat-reading rules.

**Never:** Mark a chapter merely because it opened or was scrolled; make the existing arrows record completion; advance when the local record save fails; create a second completion when the chapter is already checked for the current year; touch or include the unrelated Monday Bridge, entitlement, plist, repository, or native-test work currently present in the worktree; connect to a different remote or repository.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| First completion | Unread chapter, next chapter exists | Save completion, confirm, then open next canonical chapter | Stay on current chapter and show warning if save fails |
| Already read | Chapter already completed this year | Show read state; Continue advances without another record | Do not alter the all-time count |
| Book boundary | Last chapter of a book | Continue opens chapter 1 of the next canonical book | Preserve selected NKJV provider and reader settings |
| Bible boundary | Revelation 22 | Save as read and show completion state without navigation | No invalid next target |
| Rapid taps | Save is pending | Disable the action until it settles | Create at most one completion |

</frozen-after-approval>

## Code Map

- `src/pages/Bible.tsx` -- chapter reader, ordinary navigation arrows, completion action, save feedback, and canonical continuation.
- `src/lib/readingHistory.ts` -- canonical chapter validation, completion entry creation, yearly completion lookup, and next-chapter resolution.
- `tests/daily-scripture-path.spec.js` -- reading-record unit coverage and visible reader interaction regression.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/readingHistory.ts` -- expose a canonical next-chapter resolver that handles chapter, book, testament, and Bible boundaries.
- [x] `src/pages/Bible.tsx` -- derive the current-year read state and add the end-of-chapter “Mark Read & Continue” workflow without changing ordinary navigation.
- [x] `tests/daily-scripture-path.spec.js` -- cover canonical continuation, deduplication, success navigation, failure retention, and the distinction from arrow navigation.
- [x] Apple products -- rebuild the web bundle and signed Apple targets, then reinstall without uninstalling user data where connected. Mac and iPad launch checks passed; iPhone installation passed and launch remains device-lock gated.

**Acceptance Criteria:**
- Given an unread chapter, when the reader selects “Mark Read & Continue,” then Chronicle commits one dated completion locally and opens the next canonical chapter.
- Given an already-read chapter, when the reader returns, then the action visibly says it is read and continuing does not increment the tally.
- Given use of the ordinary previous/next arrows, when navigation occurs, then no reading completion is created.
- Given an offline device, when the local repository is available, then completion succeeds immediately and remains eligible for later CloudKit sync.

## Spec Change Log

- 2026-07-14: Corrected the terminal-boundary example from Malachi 4 to Revelation 22 so approved “next canonical chapter” behavior continues from the Old Testament into Matthew.
- 2026-07-14: Adversarial review added a pending-save location guard, accessible completion feedback, precise midnight refresh, exact-one-write rapid-tap coverage, and a navigation-race regression test.

## Design Notes

This is a completion affordance, not reading surveillance. Placement after the final verse makes the action discoverable at the moment of completion, while requiring a deliberate tap keeps the reading record trustworthy. At a book boundary, the completion action follows canonical order even though the compact header arrows remain scoped to the current book.

## Verification

**Commands:**
- `npx tsc -b --pretty false` -- expected: reader and record types compile.
- `npx playwright test tests/daily-scripture-path.spec.js --workers=1` -- expected: continuation and reading-record behaviors pass.
- `npm run build` -- expected: production bundle succeeds.
- Signed Xcode iOS and macOS builds -- expected: unchanged Chronicle identity and entitlements compile successfully.

**Observed:** TypeScript, production build, and all 13 focused tests passed. Clean signed iOS and macOS builds passed from a temporary checkout containing only this feature because unrelated in-progress Monday Bridge entitlements in the main worktree are not yet provisioned. The updated app was installed on iPad and iPhone without uninstalling user data; iPad and Mac launched successfully, while iPhone launch was rejected after the phone relocked. Feature-only commit and push are reserved for workflow completion after review.

## Suggested Review Order

**Completion flow**

- Save locally, guard navigation races, then continue only from the completed location.
  [`Bible.tsx:1613`](../../src/pages/Bible.tsx#L1613)

- Present a deliberate, accessible completion action after the final verse.
  [`Bible.tsx:2139`](../../src/pages/Bible.tsx#L2139)

**Canonical progression**

- Resolve chapter, book, testament, and end-of-Bible boundaries in one helper.
  [`readingHistory.ts:28`](../../src/lib/readingHistory.ts#L28)

- Refresh calendar state exactly at midnight while retaining timezone-change protection.
  [`useLocalDateKey.ts:4`](../../src/lib/useLocalDateKey.ts#L4)

**Regression protection**

- Prove exact-one-write completion remains distinct from ordinary navigation.
  [`daily-scripture-path.spec.js:127`](../../tests/daily-scripture-path.spec.js#L127)

- Prove pending saves cannot override newer reader navigation.
  [`daily-scripture-path.spec.js:173`](../../tests/daily-scripture-path.spec.js#L173)
