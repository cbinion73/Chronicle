---
title: 'Install Chronicle on Mac, iPhone, and iPad with offline CloudKit entry sync'
type: 'feature'
created: '2026-07-13'
status: 'done'
baseline_commit: '3520b20c7e4390f88a5229a38632186b61b86ab2'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-chronicle-2026-07-13/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-chronicle-2026-07-13/CLOUDKIT-DATA-MODEL.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Chronicle is installed only on the iPad, remains iPad-targeted, and stores entries in browser-local state. Chris wants Chronicle installed on this M4 Mac mini, the connected iPhone 16 Pro on iOS 26.5, and the connected M2 iPad Pro on iPadOS 27, with offline entry changes synchronized privately through iCloud and older revisions recoverable.

**Approach:** Create a shared SwiftUI Apple app with a universal iOS target (iPhone and iPad) plus a native macOS target, both packaging the existing responsive Chronicle interface and Apple Foundation Models companion. Cut Chronicle entries over as the first complete synchronized record kind: device-local SQLite commits precede UI updates, while a durable outbox and CKSyncEngine replicate encrypted immutable revisions through the registered private CloudKit container.

## Boundaries & Constraints

**Always:** Build with Xcode 27 beta; target iOS/iPadOS 26.0+ so the connected iOS 26.5 iPhone is eligible; target macOS 26.0+; share the same bundle ID, CloudKit container, repository, codec, and app behavior across targets; preserve iPhone/iPad adaptive navigation; generate entitlements through XcodeGen; use `iCloud.com.binion.chronicle`, the private database, and `ChronicleData-v1`; partition SQLite by CloudKit account; preserve offline outbox state across termination; retain immutable revisions and tombstones; encrypt entry payloads; migrate fresh-mode legacy entries idempotently; exclude sample entries; expose truthful sync/model states; sign, install, launch, and inspect all three real destinations.

**Ask First:** Promoting the development CloudKit schema to production; permanently purging cloud history; enabling additional record kinds or imported assets; changing the registered identifiers; uploading pre-account local data to a newly selected iCloud account.

**Never:** Use public/shared CloudKit, external servers, or external LLMs; upload sample data, local paths, credentials, corpora, caches, voice settings, or transient audio; fall back to wildcard provisioning; delete old revisions automatically; claim Prayer, Books, AI history, or other record kinds synchronize in this slice; claim cross-device entry sync succeeded without observed CloudKit transfer between two installed clients.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Platform launch | Mac 26.5, iPhone 26.5, or iPad 27 | Bundled Chronicle opens locally with platform-correct web view, safe areas, links, and Apple model status | Native recovery state appears for missing bundle/host/web process |
| First sync launch | Fresh-mode v9 localStorage entries and available iCloud | Baseline revisions commit once, hydrate from SQLite, and queue for CloudKit | Sample mode migrates nothing; repeat launch produces no duplicates |
| Offline mutation | Entry create, edit, or delete without connectivity | Revision, head/tombstone, and outbox commit atomically before UI update | Transaction failure leaves UI unchanged; network failure leaves readable pending work |
| Remote change | CKSyncEngine receives valid entry revisions | Validated batch commits locally and web entries refresh | Future/corrupt/dangling records quarantine without advancing heads |
| Concurrent edits | Two clients edit one ancestor offline | Both branch tips remain recoverable until resolved | Never select a branch by last-writer-wins |
| Account change | iCloud user changes or becomes unavailable | Sync pauses and opens an isolated account replica | Never display or upload another account's entry text |
| Invalid bridge call | Wrong origin, operation, shape, or oversized payload | Request is rejected without mutation | Structured local error; app stays usable |

</frozen-after-approval>

## Code Map

- `apple/project.yml`, `apple/ChronicleApp/*.entitlements`, platform plists -- reproducible universal iOS/macOS targets, capabilities, signing, and deployment floors.
- `apple/ChronicleApp/` -- shared lifecycle/root/server/model plus UIKit/AppKit web-view adaptations.
- `apple/ChronicleApp/Sync/` -- SQLite repository, migration ledger, CloudKit codec, CKSyncEngine coordinator, status, and bridge.
- `src/lib/chronicleApiClient.ts`, `src/store/index.ts` -- native entry routing, durable mutation ordering, authoritative hydration, and desktop-web fallback.
- `apple/ChronicleAppTests/`, `tests/` -- platform, repository, migration, codec, coordinator, bridge, and web contracts.

## Tasks & Acceptance

**Execution:**
- [x] `apple/project.yml`, platform plists/entitlements -- define shared iPhone/iPad and macOS apps, registered CloudKit/APNs capabilities, iOS 26/macOS 26 floors, and explicit signing.
- [x] shared `apple/ChronicleApp/*.swift` -- make lifecycle, root view, embedded browser, external links, Foundation Models sheet, and local host compile and behave on UIKit and AppKit.
- [x] `apple/ChronicleApp/Sync/SQLite/ChronicleSQLiteStore.swift`, `ChronicleRepository.swift`, `LegacyEntryMigration.swift` -- implement account-scoped SQLite and atomic item/revision/outbox/migration transactions.
- [x] `apple/ChronicleApp/Sync/CloudKitRecordCodec.swift`, `ChronicleSyncCoordinator.swift` -- encode encrypted records, restore/reconcile CKSyncEngine state, send atomic zone batches, validate fetches, retain branches, and publish truthful status.
- [x] `ChronicleDataBridge.swift`, `ChronicleWebView.swift`, `src/lib/chronicleNativeBridge.ts`, `chronicleApiClient.ts`, `src/store/index.ts` -- bridge bounded entry CRUD/list, update UI only after durable commit, and refresh after remote changes.
- [x] tests -- cover all three builds, migration idempotency/sample exclusion, restart durability, history/tombstones, account isolation, codec limits, outbox recovery, conflict preservation, and bridge rejection.
- [x] build/install verification -- automatically refresh explicit provisioning, inspect entitlements, install and launch on the physical iPhone/iPad, install the Mac app locally, and exercise entry transfer between at least two clients.

**Acceptance Criteria:**
- Given the three real destinations, when the generated schemes build and launch, then Chronicle runs locally on the Mac, iPhone, and iPad with no Mac-host dependency or external LLM.
- Given an offline entry mutation and force-quit, when that client relaunches, then the entry state and pending outbox survive.
- Given connectivity returns and a second installed client uses the same iCloud account, when CKSyncEngine completes, then the entry appears on the second client and all revisions remain retrievable.
- Given the web build runs outside the Apple shell, when entry APIs execute, then existing REST behavior remains intact.

## Spec Change Log

- 2026-07-13: Implementation completed and verified on the signed Mac, physical iPhone, and physical iPad builds; Mac-created private CloudKit entry fetched on both mobile clients with matching iCloud user identity and empty outboxes.
- 2026-07-13: Adversarial review hardened outbox generations, branch preservation, remote validation/quarantine, account isolation, bridge batching, and durable UI acknowledgement.

## Design Notes

The iPhone and iPad share one universal iOS target; the Mac uses a native macOS target sharing the repository and CloudKit contract. Chronicle entries prove the complete sync invariant before other record adapters are enabled.

## Verification

**Commands:**
- `npm run build` plus targeted Playwright -- expected: responsive web behavior and native bridge contract pass.
- XcodeGen and Xcode 27 simulator/macOS tests -- expected: both platform targets compile and all repository/codec/bridge/coordinator tests pass.
- Signed builds with `-allowProvisioningUpdates` -- expected: profiles include CloudKit container and APNs entitlements, never wildcard.
- `devicectl` install/launch on iPhone and iPad plus local Mac launch -- expected: all three apps open and report local host, Apple model, iCloud account, and sync state truthfully.
- Two-client entry transfer and offline-relaunch exercise -- expected: entry converges without losing history or resurrecting a tombstone.

**Observed:**
- `npm run build` and `npm run lint` passed; the web bundle remains available outside the native bridge through its existing REST client.
- Xcode 27 beta against the iOS 26.5 simulator passed 25 tests with zero failures; signed iOS and macOS builds completed.
- Effective signed entitlements contain `LGNJ56Y22G.com.binion.chronicle` and `iCloud.com.binion.chronicle`; the explicit mobile profile includes both connected UDIDs.
- Mac, iPad, and iPhone launched their bundled loopback interface. All reported CloudKit user `_a26d7cf3407b0126b7e1864da1005bd1`.
- Mac upload completed with `saved=2 failed=0`; iPad and iPhone fetched the entry, reported `found=true`, and finished with `pending=0`.

## Suggested Review Order

**Lifecycle and account isolation**

- Start with account-partitioned service construction and truthful offline fallback.
  [`ChronicleAppServices.swift:7`](../../apple/ChronicleApp/Sync/ChronicleAppServices.swift#L7)

- Surface startup, account-change, and sync failures without exposing stale account data.
  [`ChronicleRootView.swift:3`](../../apple/ChronicleApp/ChronicleRootView.swift#L3)

**Durable local-first entries**

- Commit immutable revisions and outbox work atomically before acknowledging UI mutations.
  [`ChronicleRepository.swift:42`](../../apple/ChronicleApp/Sync/ChronicleRepository.swift#L42)

- Apply only reachable validated cloud history while retaining concurrent branch heads.
  [`ChronicleRepository.swift:166`](../../apple/ChronicleApp/Sync/ChronicleRepository.swift#L166)

- Accept only bounded, owned-loopback native bridge requests.
  [`ChronicleDataBridge.swift:4`](../../apple/ChronicleApp/Sync/ChronicleDataBridge.swift#L4)

**CloudKit convergence**

- Merge server and local heads before saving encrypted private records.
  [`CloudKitRecordCodec.swift:4`](../../apple/ChronicleApp/Sync/CloudKitRecordCodec.swift#L4)

- Snapshot outbox generations so older acknowledgements cannot erase newer edits.
  [`ChronicleSyncCoordinator.swift:86`](../../apple/ChronicleApp/Sync/ChronicleSyncCoordinator.swift#L86)

**Web-to-native cutover**

- Batch migration under the native envelope and route CRUD through Swift.
  [`chronicleNativeBridge.ts:35`](../../src/lib/chronicleNativeBridge.ts#L35)

- Hydrate native entries authoritatively and await durable mutations before UI updates.
  [`index.ts:798`](../../src/store/index.ts#L798)

**Configuration and evidence**

- Generate universal iOS and native macOS signing capabilities reproducibly.
  [`project.yml:34`](../../apple/project.yml#L34)

- Verify tombstone ancestry, restart staging, identity, account, and outbox invariants.
  [`ChronicleRepositoryTests.swift:153`](../../apple/ChronicleAppTests/ChronicleRepositoryTests.swift#L153)

- Verify CloudKit uploads preserve concurrent server heads.
  [`CloudKitSyncModelTests.swift:77`](../../apple/ChronicleAppTests/CloudKitSyncModelTests.swift#L77)
