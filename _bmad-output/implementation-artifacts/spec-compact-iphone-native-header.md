---
title: 'Compact the iPhone native header'
type: 'bugfix'
created: '2026-07-14'
status: 'done'
route: 'one-shot'
---

# Compact the iPhone native header

## Intent

**Problem:** The full Apple Intelligence label wrapped into a huge three-line button on iPhone, dominating Chronicle's header and pushing its content down.

**Approach:** Use a compact 52-point phone header with a single-line AI capsule, preserve the full iPad and Mac control, and keep status/action accessibility explicit.

## Suggested Review Order

**Responsive header structure**

- Select the compact composition only for horizontally compact iOS layouts.
  [`ChronicleRootView.swift:59`](../../apple/ChronicleApp/ChronicleRootView.swift#L59)

- Keep the sync state readable, deterministic, and fully exposed to VoiceOver.
  [`ChronicleRootView.swift:66`](../../apple/ChronicleApp/ChronicleRootView.swift#L66)

**Companion action**

- Replace the wrapping label with a clear 44-point AI capsule on iPhone.
  [`ChronicleRootView.swift:91`](../../apple/ChronicleApp/ChronicleRootView.swift#L91)

- Preserve the fully labeled control on regular-width iPad and macOS layouts.
  [`ChronicleRootView.swift:108`](../../apple/ChronicleApp/ChronicleRootView.swift#L108)
