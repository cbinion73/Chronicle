---
title: 'Add a synced Daily Scripture Path with NKJV readings'
type: 'feature'
created: '2026-07-14'
status: 'done'
baseline_commit: 'dcb909e8'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-chronicle-2026-07-08/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-chronicle-2026-07-13/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Daily Office Station 1 incorrectly borrows the Bible Study day, repeats weekly passages, falls back to a small non-NKJV cache, and can show a saved progress number instead of the actual day of the calendar year. Chronicle also lacks an explicit record of which chapters were actually read.

**Approach:** Add a persistent Daily Scripture Path setting that directly controls Station 1, make a complete Chronological Bible in One Year path the default, include a complete canonical Bible in One Year alternative, and force every primary Scripture display and handoff through Chronicle's bundled local NKJV provider. Resolve the Office reading from the actual local calendar day, and add explicit synced chapter checkoffs plus yearly and all-time reading views. Keep explicitly labeled comparison translations available as study aids, but never use them as the primary text.

## Boundaries & Constraints

**Always:** Use stable plan IDs and validated schedules; cover all 1,189 Protestant-canon chapters exactly once in each annual whole-Bible path; make January 1 Day 1 and resolve every Office reading from the actual local calendar day (July 14, 2026 is Day 195); repeat Day 59 on February 29 so the 365-day plan remains aligned after leap day; store the selected path locally first and synchronize this small preference through Apple's iCloud key-value store; record explicit chapter checkoffs as ordinary user-authored synced Chronicle records; use `offline_nkjv` for Daily Office previews and Bible handoffs; label displayed Scripture `NKJV`; preserve CloudKit records, existing user writing, app identity, header removal, and offline operation; rebuild and reinstall on Mac, iPhone, and iPad.

**Ask First:** Adding externally authored reading-plan content, changing the 66-book Protestant canon, rewriting historical user-entered quotations, making comparison translations unavailable, or releasing a commercial/App Store build containing the full NKJV corpus without documented redistribution rights.

**Never:** Couple Daily Office back to `studyModuleDayById`; use a saved progress anchor as the Office's calendar day; infer a completed chapter merely because its page opened; fetch Scripture from an external API; display ESV/fallback-cache text as NKJV; lose explicit reading records between devices; remain indefinitely on “Loading…” when local content is unavailable; claim that the repository's privately generated NKJV files establish commercial redistribution permission; connect to GitHub or push.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Fresh or existing install | Any saved progress value | Chronological plan uses today's local calendar day | Fall back to canonical Day 1 only if plan validation fails |
| Normal day change | Local date advances | Station 1 advances to the new day-of-year reading | Date math uses local calendar days, not UTC timestamps |
| Leap day | February 29 | Repeat Day 59, then March 1 is Day 60 | Never create an unavailable Day 366 |
| Path switch | User selects canonical or chronological | Selected plan uses the same current calendar day | Synchronize the selection without changing the day |
| Multiple readings | Plan day spans several chapters/books | Show plan references plus an NKJV preview; full-reading action opens the first reading in NKJV | Clearly identify any missing local chapter and keep other readings usable |
| iCloud unavailable | Preference changes offline | Apply and persist immediately on-device | Queue naturally in iCloud KVS and reconcile by latest explicit change |
| New calendar year | January 1 arrives | Begin the year's plan at Day 1 | Ignore the prior year's saved progress value |
| Chapter checkoff | User checks an assigned or checklist chapter | Create a synced reading-completion record for that chapter and year | Never mark a chapter read from passive navigation |
| Reading history | User opens The Word reading record | Show all 1,189 chapters for the current year and all-time chapter counts | Derive counts only from valid completion records |

</frozen-after-approval>

## Code Map

- `src/data/dailyScripturePlans.ts` -- deterministic plan definitions and complete chapter schedules.
- `src/lib/dailyScripture.ts` -- plan validation, local-date progression, migration, and reading resolution.
- `src/store/index.ts`, `src/lib/chronicleVersioning.ts`, `src/lib/chronicleSync.ts` -- persistent portable setting and legacy migration.
- `src/pages/Office.tsx` -- Station 1 preview, saved-source metadata, and NKJV Bible handoff.
- `src/pages/Settings.tsx`, `src/pages/Plans.tsx`, `src/components/layout/Sidebar.tsx` -- shared setting and truthful active-plan display.
- `src/lib/bibleProviders.ts`, `src/pages/Bible.tsx` -- NKJV primary-provider invariant while retaining labeled comparison tools.
- `src/lib/chronicleNativeBridge.ts`, `apple/ChronicleApp/Sync/ChronicleDataBridge.swift` -- local-first iCloud KVS preference bridge and change notification.
- `src/lib/readingHistory.ts`, `src/pages/ReadingLog.tsx` -- synced chapter completion records, yearly checklist, and all-time tally.
- `tests/daily-scripture-path.spec.js` -- path, migration, date, provider, failure, and UI regression coverage.

## Tasks & Acceptance

**Execution:**
- [x] `src/data/dailyScripturePlans.ts`, `src/lib/dailyScripture.ts` -- implement two validated 365-day plans, stable identifiers, local-date/cycle resolution, and legacy migration.
- [x] `src/store/index.ts`, `src/lib/chronicleVersioning.ts`, `src/lib/chronicleSync.ts` -- persist the active path and per-path anchors, default/migrate to chronological, and keep portable state compatible.
- [x] `src/pages/Office.tsx`, `src/lib/scriptureReference.ts`, `src/lib/bibleProviders.ts`, `src/pages/Bible.tsx` -- disconnect Station 1 from Bible Study and enforce NKJV for previews, primary reading, saved metadata, and handoff.
- [x] `src/pages/Settings.tsx`, `src/pages/Plans.tsx`, `src/components/layout/Sidebar.tsx` -- expose one shared Daily Scripture Path control and accurate day/reference information.
- [x] `src/lib/chronicleNativeBridge.ts`, `apple/ChronicleApp/Sync/ChronicleDataBridge.swift` -- synchronize the small preference through local-first iCloud KVS without changing CloudKit record storage.
- [x] `tests/daily-scripture-path.spec.js` -- test exact chapter coverage, nonduplication, migration, switching, dates/cycles, NKJV routing, missing content, and visible setting/Station behavior.
- [x] `src/lib/dailyScripture.ts`, `src/pages/Office.tsx` -- align the Office to the actual local calendar day and provide explicit daily chapter checkoffs.
- [x] `src/lib/readingHistory.ts`, `src/pages/ReadingLog.tsx`, shared navigation -- add the full yearly checklist and all-time most-read chapter view backed by synced Chronicle entries.
- [x] Apple products -- rebuild bundled web assets and signed native targets and reinstall without uninstalling data. Mac and iPad launch verification passed; the iPhone install passed, while automated relaunch remains device-lock gated.

**Acceptance Criteria:**
- Given a fresh or migrated Chronicle state, when Daily Office opens, then Station 1 uses the selected Daily Scripture Path rather than Bible Study progress.
- Given either annual path, when its schedule is validated, then every canonical chapter appears exactly once across 365 days.
- Given any primary Scripture surface or Station 1 handoff, when verses load, then the source is the local NKJV provider and the UI identifies it as NKJV.
- Given a path change on one Apple device, when iCloud preference sync reaches another signed-in device, then its Daily Office resolves the same path and plan day without requiring network access to read Scripture.
- Given the app is offline or a chapter file is missing, when Station 1 loads, then it shows deterministic local status/error content rather than stale verses or an endless loading state.
- Given July 14, 2026, when Daily Office opens, then the selected annual plan resolves Day 195 regardless of prior saved progress.
- Given a chapter is explicitly checked, when Chronicle sync completes, then every device includes it in that year's checklist and its all-time count.

## Spec Change Log

- 2026-07-14: Human corrected the Office to follow the actual calendar day rather than legacy Day 23, and requested a yearly chapter checklist plus all-time chapter tally. Updated the approved intent and implementation surface accordingly.

## Design Notes

Annual schedules are repository-owned reference lists, not copied devotional commentary. The chronological order may split books into historical segments, but its validator—not UI labels—guarantees exact 66-book/1,189-chapter coverage. Daily Office remains finite by showing the day's references and a bounded NKJV preview; “Read today's reading” opens the first assigned chapter in the NKJV reader.

iCloud KVS is deliberately used only for this small preference/anchor document. User-authored records remain in the existing CloudKit revision model, while the complete licensed Scripture corpus remains device-local and is never uploaded.

The repository's full NKJV corpus is sufficient for local development, but commercial redistribution is a release gate outside this implementation.

## Verification

**Commands:**
- `npm run build` -- expected: TypeScript/Vite production build succeeds.
- `npx playwright test tests/daily-scripture-path.spec.js --workers=1` -- expected: plan, migration, date, NKJV, failure, and UI tests pass.
- `node scripts/prepare-apple-webapp.mjs` -- expected: native WebApp bundle is refreshed with the validated plans and NKJV library.
- `diff -qr public/bibles/library/nkjv apple/ChronicleApp/WebApp/bibles/library/nkjv` -- expected: public and native NKJV corpora match.
- Xcode 27 signed `Chronicle` and `ChronicleMac` builds plus `devicectl` install/launch -- expected: all three Apple destinations run with unchanged bundle and CloudKit entitlements.

**Observed after review:** TypeScript and the production web build passed; all 9 focused Playwright tests passed; Apple WebApp preparation succeeded; public/native NKJV corpus comparison was clean; signed generic iOS and macOS scheme builds passed. The release app was installed on the paired iPad and iPhone without uninstalling user data, and the Mac app was replaced in `/Applications`. Mac health/host verification passed. The iPad launched and visibly showed July 14 as Day 195 with Isaiah 25–27 and explicit chapter checkboxes. The iPhone install passed, but its automated launch was rejected after the phone relocked.

## Suggested Review Order

1. [Calendar-day plan resolution](../../src/lib/dailyScripture.ts) and [complete annual schedules](../../src/data/dailyScripturePlans.ts).
2. [Daily Office Station 1](../../src/pages/Office.tsx), including Day 195 and explicit chapter checkoffs.
3. [Reading Record](../../src/pages/ReadingLog.tsx) and [synced reading-entry model](../../src/lib/readingHistory.ts).
4. [Local-first preference reconciliation](../../src/store/index.ts) and [Apple KVS bridge](../../apple/ChronicleApp/Sync/ChronicleDataBridge.swift).
5. [Focused regression suite](../../tests/daily-scripture-path.spec.js).
