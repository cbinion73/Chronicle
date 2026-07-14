---
title: 'Remove the native Chronicle header'
type: 'bugfix'
created: '2026-07-14'
status: 'done'
baseline_commit: '9f6a381d'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-chronicle-2026-07-08/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The native strip above Chronicle's web interface duplicates the product identity and consumes valuable screen space. It contains the book symbol, Chronicle title, iCloud status, and Apple Intelligence button shown in the supplied screenshot, and Chris wants the entire strip gone.

**Approach:** Remove the complete native header from the root layout on iPhone, iPad, and Mac so Chronicle's embedded interface begins at the top of the usable application content. Keep startup, local storage, CloudKit synchronization, account recovery, and the web interface unchanged.

## Boundaries & Constraints

**Always:** Remove the whole header and its occupied height across all supported Apple platforms; preserve safe-area handling supplied by the native container and embedded web view; keep the existing application identity, AppIcon, signing, local data, CloudKit entitlements, and synchronization behavior; rebuild, reinstall, and launch on the connected iPhone and iPad and this Mac.

**Ask First:** Adding the Apple Intelligence action or sync status anywhere else, changing the web navigation, or altering safe-area behavior beyond what is required to eliminate the header gap.

**Never:** Leave an empty spacer, divider, material background, or invisible hit target where the header was; remove CloudKit services merely because their status is no longer displayed; modify the selected app icon; connect to GitHub or push a commit.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Normal launch | Services and local server become ready | Embedded Chronicle interface occupies the former header area | Existing recovery views remain available if startup fails |
| Sync state changes | CloudKit becomes syncing, offline, or ready | Sync continues without rendering the removed native status strip | Existing account-change recovery view remains available when action is required |
| Platform variation | iPhone, iPad, or Mac window | No native header or residual gap appears | Build and launch verification covers all three destinations |

</frozen-after-approval>

## Code Map

- `apple/ChronicleApp/ChronicleRootView.swift` -- root SwiftUI layout, native header composition, companion presentation, and service recovery states.
- `apple/ChronicleApp/ChronicleWebView.swift` -- embedded interface sizing and native safe-area boundary.
- `apple/project.yml` -- reproducible shared target configuration used for signed device builds.

## Tasks & Acceptance

**Execution:**
- [x] `apple/ChronicleApp/ChronicleRootView.swift` -- remove the header from the root layout and delete now-unreachable header/companion-only state and views without disturbing service startup or recovery behavior.
- [x] signed products -- rebuild with Xcode 27 beta, inspect the installed result, and launch the same bundle update on iPhone, iPad, and Mac without uninstalling application data.

**Acceptance Criteria:**
- Given Chronicle launches normally, when the root content appears, then the embedded interface begins without the pictured book/title/sync/AI strip or leftover vertical gap.
- Given CloudKit changes state, when synchronization runs, then persistence and synchronization remain operational even though no native sync label is displayed.
- Given startup, storage, or account recovery requires intervention, when the relevant failure occurs, then the existing recovery content still replaces the main interface.

## Spec Change Log

## Verification

**Commands:**
- `xcodegen generate --spec apple/project.yml --project apple` -- expected: reproducible project generation succeeds.
- `xcodebuild build` for `Chronicle` and `ChronicleMac` with Xcode 27 beta -- expected: signed builds succeed without Swift warnings caused by removed header state.
- `xcrun devicectl device install app` and `device process launch` -- expected: both physical devices accept and run the update while retaining the bundle identity.
- Process inspection for iPhone, iPad, and Mac -- expected: all three Chronicle processes remain active after launch.

**Observed:**
- Signed Xcode 27 iOS and macOS builds succeeded and retained `com.binion.chronicle`, `iCloud.com.binion.chronicle`, and CloudKit entitlements.
- The updates installed without uninstalling the existing applications or their data containers.
- Chronicle launched successfully on the connected iPhone, connected iPad, and this Mac; the Mac local interface returned HTTP 200.
- Direct screenshots on iPhone, iPad, and Mac confirm the native book/title/sync/AI strip, divider, and occupied height are absent.

## Suggested Review Order

**Root composition**

- Makes service content the full-height root, leaving no native header container or gap.
  [`ChronicleRootView.swift:7`](../../apple/ChronicleApp/ChronicleRootView.swift#L7)

**Preserved recovery**

- Keeps local-server readiness and failure routing unchanged beneath the simplified root.
  [`ChronicleRootView.swift:23`](../../apple/ChronicleApp/ChronicleRootView.swift#L23)
