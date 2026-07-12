---
title: 'Optimize connected iOS UX'
type: 'feature'
created: '2026-07-12'
status: 'done'
baseline_commit: '4909fe3df20e095c50d4f0088664da1ad6709b2f'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Chronicle's narrow layout is responsive, but on iPhone it spends too much vertical space on the logo, horizontal navigation, and wrapped toolbar while primary destinations remain awkward to reach. Its width-only device classification also means iOS-specific improvements would currently alter Android phones and narrow desktop windows.

**Approach:** Detect iOS/iPadOS as a platform capability and expose that state at the application shell. On iOS phones, keep the main rooms in a top navigation rail; selecting a room moves it to the lead position, reveals that room's sub-items into the rail, and pushes the remaining rooms right. Condense the action chrome and use iOS-appropriate viewport and touch behavior while preserving every desktop rendering path.

## Boundaries & Constraints

**Always:** Scope new behavior to detected iOS/iPadOS devices; preserve all routes and existing navigation labels; maintain safe-area padding around notches and the home indicator; keep interactive targets at least 44px; preserve accessibility labels, focus behavior, and reduced-motion behavior; support iPadOS user agents that identify as Macintosh but expose touch points.

**Ask First:** Any removal of an existing feature or navigation destination; any redesign of individual page content beyond shell-level spacing and scrolling; any change to desktop, Android, server, persistence, or API behavior.

**Never:** Apply iOS styling through width-only media queries; alter desktop visual layout; introduce a native wrapper or dependency; hide Settings or Chronicle AI; use brittle screen-model checks; force installation as a PWA.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| iPhone Safari or installed web app | iOS platform and phone viewport | Main rooms remain at the top; the active room leads, its sub-items expand beside it, and remaining rooms shift right | Fall back to current phone layout if platform detection is unavailable |
| iPadOS Safari | Macintosh platform with touch points | Existing tablet structure remains, with iOS viewport, safe-area, and touch refinements | Do not classify ordinary macOS as iOS |
| Desktop or Android | Any non-iOS platform | Existing classes, layout, spacing, and behavior remain unchanged | No iOS class or override is applied |
| Keyboard visible | iOS input focused and visual viewport changes | Active content and modal controls remain usable without double-reserving the full screen | Dynamic viewport sizing and contained scrolling absorb the resize |

</frozen-after-approval>

## Code Map

- `src/lib/useResponsiveLayout.ts` -- central device classification and new iOS/iPadOS capability signal.
- `src/components/layout/AppShell.tsx` -- propagates platform state and marks the shell for strictly scoped styling.
- `src/components/layout/AppShell.module.css` -- dynamic viewport and iOS shell spacing.
- `src/components/layout/Sidebar.tsx` -- composes existing room and section definitions into the iOS expanding top rail.
- `src/components/layout/Sidebar.module.css` -- iOS top-rail presentation, reveal motion, and horizontal overflow.
- `src/components/layout/Topbar.tsx` and `Topbar.module.css` -- compact iOS phone action header without altering desktop.
- `src/components/ui/SectionTabs.tsx` -- suppresses the duplicate in-page section strip when its links are promoted into the iOS rail.
- `src/styles/base.css` -- iOS-only touch and overscroll behavior.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/useResponsiveLayout.ts` -- add SSR-safe iOS/iPadOS detection and return explicit `isIOS`/`isIOSPhone` state.
- [x] `src/components/layout/AppShell.tsx` -- add the platform marker and pass iOS state to shell navigation and toolbar.
- [x] `src/components/layout/AppShell.module.css` -- use dynamic viewport sizing without reserving bottom-navigation space on iOS phones.
- [x] `src/components/layout/Sidebar.tsx`, `src/components/layout/Sidebar.module.css` -- render mains in a top rail where the active room leads, its sub-items expand, and remaining mains shift right with 44px targets.
- [x] `src/components/layout/Topbar.tsx`, `src/components/layout/Topbar.module.css` -- condense branding/search/actions for iOS phones while retaining access to search, capture, AI, and theme.
- [x] `src/styles/base.css` -- constrain iOS overscroll and form sizing without changing non-iOS clients.

**Acceptance Criteria:**
- Given an iPhone-class iOS browser, when Chronicle loads or changes rooms, then the selected main room leads the top rail, its sub-items expand into the rail, and all other main rooms remain reachable to the right.
- Given an iOS input or modal is opened, when the on-screen keyboard changes the visual viewport, then the active control remains reachable and the shell does not create nested full-page scrolling.
- Given iPadOS, when Chronicle loads, then tablet layout remains recognizable while safe-area and touch behavior are applied.
- Given desktop Chrome/Safari or Android, when Chronicle loads at any width, then no iOS-only class or CSS override changes the existing interface.

## Spec Change Log

## Design Notes

Platform detection should be capability-based: standard iPhone/iPad/iPod user-agent matching plus the iPadOS `MacIntel` and `maxTouchPoints > 1` case. Styling must hang from an explicit iOS class/data attribute so media queries only select form factor inside that platform boundary. Reuse the canonical room arrays from `src/lib/sectionTabs.ts`; the active main room doubles as its landing action, so only secondary tabs need to expand beside it.

## Verification

**Commands:**
- `npm run build` -- expected: TypeScript, Vite, sync, and QA checks pass.
- `rg -n "isIOS|isIOSPhone|data-platform" src` -- expected: iOS state is explicit and localized to responsive shell code.

**Manual checks (if no CLI):**
- Inspect iPhone portrait and landscape with an iOS user agent and safe-area emulation; verify animated main/sub navigation, all five rooms, search, quick capture, AI, theme, scrolling, and keyboard access.
- Compare desktop before/after at 1440px and a narrow non-iOS viewport; verify no visual delta from iOS-only rules.

## Suggested Review Order

**Navigation Model**

- Active-room resolution drives the lead item, expanded children, and safe rail reset.
  [`Sidebar.tsx:82`](../../src/components/layout/Sidebar.tsx#L82)

- Canonical room arrays remain the single source for promoted iOS sub-navigation.
  [`Sidebar.tsx:102`](../../src/components/layout/Sidebar.tsx#L102)

- Duplicate page-level tabs disappear only when the iPhone rail owns those links.
  [`SectionTabs.tsx:20`](../../src/components/ui/SectionTabs.tsx#L20)

- Thread's custom view strip follows the same iPhone ownership rule.
  [`Thread.tsx:41`](../../src/pages/Thread.tsx#L41)

**iOS Boundary**

- Capability detection preserves iPhone mode through landscape while retaining iPad tablet layout.
  [`useResponsiveLayout.ts:15`](../../src/lib/useResponsiveLayout.ts#L15)

- Visual viewport synchronization keeps the shell aligned with the iOS keyboard.
  [`AppShell.tsx:122`](../../src/components/layout/AppShell.tsx#L122)

- Platform-only rail styling reveals sub-items and pushes remaining mains right.
  [`Sidebar.module.css:284`](../../src/components/layout/Sidebar.module.css#L284)

- Compact action targets remain available above the content in both orientations.
  [`Topbar.module.css:175`](../../src/components/layout/Topbar.module.css#L175)

**Regression Coverage**

- Portrait, landscape, scrolling, aliases, desktop, and iPadOS paths are exercised.
  [`ios-shell.spec.js:20`](../../tests/ios-shell.spec.js#L20)
