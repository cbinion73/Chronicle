---
title: 'Use the selected Chronicle artwork as the Apple app icon'
type: 'feature'
created: '2026-07-14'
status: 'done'
baseline_commit: 'a97c7e6d'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-chronicle-2026-07-08/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The installed Chronicle apps currently have no configured native AppIcon asset, so iPhone, iPad, and Mac do not consistently display the blue-and-white cross/book artwork Chris selected.

**Approach:** Preserve the selected artwork exactly, derive Apple-required raster sizes from it, configure one generated asset catalog for both native targets, then rebuild and reinstall Chronicle on the Mac and both connected mobile devices.

## Boundaries & Constraints

**Always:** Use the exact attached blue gradient, white cross, and open-book artwork without redesigning it; keep the source square and opaque; generate all required iOS, iPadOS, and macOS icon sizes from one canonical 1024-pixel PNG; configure the catalog through `apple/project.yml` so XcodeGen remains reproducible; build with Xcode 27 beta; preserve the existing bundle identifier, signing, CloudKit, local storage, and sync behavior; install and launch the result on the connected iPhone, iPad, and this Mac.

**Ask First:** Cropping, recoloring, removing the white corner area, replacing the web/PWA icons, or changing any other visual identity asset.

**Never:** Substitute generated artwork, add text, stretch the image non-uniformly, introduce transparency, hand-edit the generated Xcode project, change signing identifiers, connect to GitHub, or push any commit/branch.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Native build | Selected 1254×1254 opaque JPEG | Asset compiler accepts complete icon sets for iOS/iPadOS and macOS | Build fails rather than silently falling back to a generic icon |
| Device install | Existing Chronicle installation | Updated app retains its data and displays the selected icon | Preserve bundle ID and containers; do not uninstall user data |
| Project regeneration | `xcodegen generate` | AppIcon configuration remains present | Treat generated-project-only changes as invalid |

</frozen-after-approval>

## Code Map

- `apple/project.yml` -- shared XcodeGen target settings and asset-catalog configuration.
- `apple/ChronicleApp/Assets.xcassets/AppIcon.appiconset/` -- canonical artwork, derived Apple sizes, and slot manifest.
- `apple/ChronicleApp/Info-iOS.plist`, `apple/ChronicleApp/Info-macOS.plist` -- existing platform metadata; should not need manual icon keys when the asset compiler is configured.

## Tasks & Acceptance

**Execution:**
- [x] `apple/ChronicleApp/Assets.xcassets/AppIcon.appiconset/` -- add the exact selected artwork and deterministic iOS/iPadOS/macOS renditions with a valid `Contents.json`.
- [x] `apple/project.yml` -- select `AppIcon` for both application targets and regenerate `apple/Chronicle.xcodeproj`.
- [x] signed products -- inspect compiled icon metadata, install the update on the iPhone/iPad/Mac, launch all three, and verify their processes remain healthy.

**Acceptance Criteria:**
- Given a regenerated Xcode project, when both app schemes build, then asset compilation succeeds without missing-icon warnings.
- Given the existing installed apps, when the signed updates are installed, then Chronicle keeps the same bundle identity and data containers while using the selected artwork as its icon.
- Given all three destinations, when Chronicle launches, then the Mac, iPhone, and iPad builds remain operational with unchanged CloudKit entitlements.

## Spec Change Log

## Verification

**Commands:**
- `xcodegen generate --spec apple/project.yml --project apple` -- expected: reproducible project contains `ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon`.
- `xcodebuild build` for `Chronicle` and `ChronicleMac` with Xcode 27 beta -- expected: signed builds succeed with no AppIcon warnings.
- `codesign -d --entitlements :-` on both products -- expected: bundle and CloudKit entitlements remain unchanged.
- `xcrun devicectl device install app` and `device process launch` -- expected: both physical devices accept and run the updated app.

**Observed:**
- Xcode 27 signed iOS and macOS builds succeeded without AppIcon warnings.
- All 28 PNG renditions are opaque, dimensionally valid, and reproducible from the checksum-pinned canonical artwork.
- The installed iPhone, iPad, and Mac processes launched successfully with bundle identifier `com.binion.chronicle`.
- The signed products retain the existing CloudKit container and application entitlements.

## Suggested Review Order

**Reproducible artwork**

- Pins the approved source and canonical transformation before generating every required size.
  [`generate_app_icons.sh:9`](../../apple/scripts/generate_app_icons.sh#L9)

- Maps deterministic renditions to every iPhone, iPad, marketing, and Mac slot.
  [`Contents.json:3`](../../apple/ChronicleApp/Assets.xcassets/AppIcon.appiconset/Contents.json#L3)

**Build integration**

- Selects the shared AppIcon catalog through the reproducible XcodeGen configuration.
  [`project.yml:30`](../../apple/project.yml#L30)
