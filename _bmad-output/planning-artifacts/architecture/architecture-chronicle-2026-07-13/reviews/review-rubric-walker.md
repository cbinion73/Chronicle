# Good-Spine Rubric Review — Chronicle CloudKit Sync and Handoff

## Gate verdict

**NEEDS REVISION before developer handoff.** The spine has a coherent local-first paradigm, strong privacy boundaries, and a useful immutable-revision shape, but it does not yet close all of the feature-level divergence points. In particular, two implementations can choose incompatible conflict-resolution, storage, migration, and operational behavior while still claiming compliance. Those gaps directly affect the promised outcomes: items staying synchronized and old data remaining retrievable in CloudKit.

## Review basis

- Primary artifact: `ARCHITECTURE-SPINE.md`
- Supporting evidence only: `CLOUDKIT-DATA-MODEL.md`
- Brownfield checks: `docs/data-architecture.md`, `src/lib/chronicleSync.ts`, and `apple/ChronicleApp/CloudKitSyncModel.swift`
- Rubric: the Good-spine checklist in `.agents/skills/bmad-architecture/references/reviewer-gate.md`
- Current-stack evidence: the locally installed Xcode reports `Xcode 27.0 (27A5218g)`, matching the pinned stack, and the project is configured for Swift 6.0 / iOS 27.0.

## Critical findings

None. The model does not create an immediate security or data-destruction path by design; it consistently favors local durability, private CloudKit storage, tombstones, validation, and preservation of divergent revisions.

## High findings

### H1 — Concurrent writers are preserved, but convergence is not specified

**Evidence:** AD-4 says divergent heads create a branch-aware merge revision and leave unresolved scalar conflicts visible (`ARCHITECTURE-SPINE.md:61-65`). The companion protocol instead allows either a merge revision **or** a visible user-resolution task (`CLOUDKIT-DATA-MODEL.md:104-113`). Field-level merge behavior is Deferred (`ARCHITECTURE-SPINE.md:159`).

**Why this fails the rubric:** Preserving both revisions prevents immediate data loss, but it does not ensure that items "stay synced." Two devices can independently create different merge revisions, select different heads, or differ on whether a conflict advances the head or becomes a task. The Rule does not define an enforceable convergence protocol: deterministic merge identity, who may synthesize a merge, how duplicate merges collapse, what head is selected while unresolved, or how a resolved branch supersedes competing heads. The companion's either/or behavior contradicts the spine's single required behavior.

**Disposition:** **Discuss, then fix.** Make one policy binding. At minimum define deterministic ancestry comparison and head selection; idempotent conflict/merge identity derived from the sorted parent set; whether unresolved conflicts have a canonical conflict-head representation or leave the server head unchanged; and how user resolution creates the sole successor. Keep record-kind field rules deferred only behind this common convergence envelope.

### H2 — The local database is deferred despite an existing SQLite decision and existing native target

**Evidence:** Deferred allows SwiftData, SQLite, or another engine "until the native Mac and iPhone targets exist" (`ARCHITECTURE-SPINE.md:156-159`). The cited brownfield data architecture already declares local SQLite as a core decision (`docs/data-architecture.md:10-27`), and `apple/Chronicle.xcodeproj` plus `apple/ChronicleApp/` show that a native Apple target exists now.

**Why this fails the rubric:** This neither ratifies the cited brownfield source nor records an explicit superseding decision. It also leaves a real divergence point under Deferred: independent platform units can choose storage engines with incompatible transaction, outbox, migration, and query semantics. The revisit condition is already false.

**Disposition:** **Autofix.** Adopt SQLite as the device database for this slice, or explicitly state that this spine supersedes the older SQLite decision and name a concrete, still-true revisit condition. If Mac and iPhone may use different implementations, fix one shared repository/schema/migration contract that makes that difference non-observable.

### H3 — "Immutable archive" and retrievable history are promises, not enforceable CloudKit invariants

**Evidence:** The paradigm says mutable heads never erase the revision graph (`ARCHITECTURE-SPINE.md:25-27`); AD-3 and AD-5 require immutable revisions and retrievable history (`ARCHITECTURE-SPINE.md:55-71`); the companion says revisions are never updated and remain fetchable (`CLOUDKIT-DATA-MODEL.md:40-55`). Yet the architecture defines no handling for a remote revision update/deletion, zone deletion/reset, iCloud account change, or a device running an older/buggy codec. CloudKit record types do not themselves enforce application-level immutability.

**Why this fails the rubric:** A conforming writer can be coded to avoid update/delete, but receivers lack the invariant needed to reject or quarantine mutation of a known revision. Calling the private database an "archive" also overstates what the app controls: user/account/zone deletion and provider retention are outside the app's guarantee. The user's central historical-retrieval requirement therefore lacks an enforceable boundary.

**Disposition:** **Fix.** Bind revision IDs to immutable canonical content and require any later record with the same ID but different item, parents, schema version, tombstone flag, hash, or payload to be quarantined and never selected. Forbid client-generated CloudKit deletes for items/revisions/assets except through the future purge protocol, specify remote-deletion/zone-reset behavior, and phrase the archive guarantee precisely: retained by Chronicle while the user's private database/container remains available, not an independent backup guarantee.

### H4 — The operational/environmental envelope is deferred where implementations need one contract

**Evidence:** The spine names development/production separation (`ARCHITECTURE-SPINE.md:103-114`) but defers container creation, entitlements, schema deployment, and production promotion as mere implementation work (`ARCHITECTURE-SPINE.md:160-161`). AD-8 mentions retry, tokens, and account state but does not bind scheduling or recovery behavior (`ARCHITECTURE-SPINE.md:85-89`). The companion implementation sequence lists these tasks without fixing their cross-target contract (`CLOUDKIT-DATA-MODEL.md:136-145`).

**Why this fails the rubric:** The reviewer gate explicitly requires the operational/environmental dimension at this altitude to be decided, safely deferred, or opened without leaving divergent choices. Entitlement/container identity across targets, development-vs-production schema ownership, push/background triggers, token invalidation, account switch, zone recreation, and rollout compatibility all affect whether sync works. Different Apple targets cannot independently choose these behaviors.

**Disposition:** **Fix or defer with binding constraints.** Keep provisioning mechanics out of the spine, but fix: all shipping targets use the same container and zone; one owner promotes schema; clients remain backward-readable across a stated rollout window; token-expiry/zone-reset triggers a full refetch without discarding outbox work; account changes isolate local replicas; and foreground/background/push triggers all feed the one coordinator. Add an explicit observability/readiness gate before production promotion.

### H5 — Brownfield migration and sync-scope cutover can produce different identities and data sets

**Evidence:** AD-6 excludes device UI state (`ARCHITECTURE-SPINE.md:73-77`), but the cited current `PortableSyncState` includes theme, translation, Bible view, active modules, active book, and sync profile alongside user records (`src/lib/chronicleSync.ts:15-28`). The companion says to migrate existing records once while preserving IDs "inside payload metadata" (`CLOUDKIT-DATA-MODEL.md:136-143`), whereas the spine says the stable UUID is the domain identity and record name (`ARCHITECTURE-SPINE.md:55-59, 103-110`).

**Why this fails the rubric:** The new local-only boundary is reasonable, but the spine does not state that it supersedes the old portable snapshot scope or define cutover behavior. "Migrate once" is not idempotent enough for multiple devices: devices may assign different item UUIDs to the same legacy ID, re-import snapshots, or omit different state. Preserving the old ID only inside the encrypted payload cannot support record-name deduplication.

**Disposition:** **Fix.** Declare the legacy portable snapshot sync retired for Apple CloudKit, identify the authoritative source during cutover, derive or persist a single stable item UUID from each legacy record ID before upload, make migration idempotent per source record/schema version, and state which legacy UI/profile fields are intentionally not imported. Define how a second migrated device recognizes records already uploaded by the first.

## Medium findings

### M1 — Canonical payload and hash validation are underspecified

**Evidence:** The spine requires canonical JSON and SHA-256 (`ARCHITECTURE-SPINE.md:103-110`) and AD-9 requires hash verification (`ARCHITECTURE-SPINE.md:91-95`) but does not define canonicalization.

**Impact:** Swift and TypeScript codecs can serialize object keys, dates, number forms, Unicode, and omitted/null fields differently, producing false corruption or duplicate revisions.

**Disposition:** **Autofix.** Name one canonicalization profile and publish golden cross-language fixtures. Bind `contentHash` to the exact stored plaintext payload bytes; separately validate decoded schema invariants.

### M2 — Asset consistency and lifecycle are not covered by the revision rule

**Evidence:** The graph attaches assets to revisions (`ARCHITECTURE-SPINE.md:127-136`), but AD-1 atomically commits only item, revision, and outbox (`ARCHITECTURE-SPINE.md:43-47`). The companion says to save revision before head but does not require all referenced assets to exist before head selection (`CLOUDKIT-DATA-MODEL.md:104-113`).

**Impact:** A head can become current while one or more immutable assets are missing, quota-blocked, or corrupt. Different clients can disagree whether the revision is complete.

**Disposition:** **Fix.** Define an asset manifest in the revision payload, content-address/integrity rules, and the readiness condition for advancing a head. Allow metadata sync to continue under quota pressure without presenting an incomplete revision as fully materialized.

### M3 — Handoff discovery and lifecycle remain open

**Evidence:** AD-10 requires an item and revision reference (`ARCHITECTURE-SPINE.md:97-101`), while the companion makes both optional for built-in routes and gives continuations a seven-day default (`CLOUDKIT-DATA-MODEL.md:74-87`). No target addressing, discovery query, deduplication, acceptance ownership, or expired-record cleanup rule is fixed.

**Impact:** Devices can implement incompatible meanings for route-only continuation, show the same request repeatedly, or race to accept it. Optional references also weaken AD-10's stated stale-content prevention.

**Disposition:** **Discuss.** Separate replicated-record continuation from route-only local navigation, or amend AD-10 to cover both explicitly. Bind target/broadcast semantics, a stable idempotency key, acceptance behavior, and expiry cleanup.

### M4 — Schema-version compatibility has no supported window or writer gate

**Evidence:** AD-9 quarantines unsupported future records (`ARCHITECTURE-SPINE.md:91-95`), and the model carries `contentSchemaVersion`, but the spine does not say when a new writer may emit a version or how old clients behave when the item head points to one they cannot decode.

**Impact:** A newly upgraded device can advance an item head to a revision that older devices permanently quarantine, violating "items should stay synced" even though each client follows AD-9.

**Disposition:** **Fix.** Define backward-read/write expectations, capability gating for new schema versions, and whether older clients preserve the unknown head while continuing to display the last locally decodable revision.

## Low findings

### L1 — AD-1's atomic write wording is ambiguous for existing items

"The new item, revision, and outbox entry" (`ARCHITECTURE-SPINE.md:47`) can be read as creating a new item every mutation, while AD-3 says items have stable identity. Say "item create-or-head update, revision, and outbox entries" to make the transaction boundary enforceable.

### L2 — Sync-scope ownership is declared but not made exhaustive in the spine

AD-6 binds every persisted type, while the exhaustive kind list exists only in the companion and Swift seed. Make the companion/schema enum the named single source of truth and require unknown kinds to default to local-only; otherwise a new persisted type can silently bypass classification.

## Checklist summary

| Good-spine criterion | Result | Notes |
| --- | --- | --- |
| Fixes real divergence points for the level below | **Fail** | Conflict convergence, migration identity, asset readiness, and operations remain divergent. |
| Every AD Rule is enforceable and prevents its stated divergence | **Partial** | AD-1/2/6/8/9 are directionally strong; AD-3/4/5/10 need stronger protocol boundaries. |
| Nothing under Deferred can let units diverge | **Fail** | Database choice and operational setup are material cross-unit decisions. |
| Named technology is verified-current | **Pass with note** | Pinned Xcode/Swift/SDK values match the local toolchain/project. No evidence was found that the technology names themselves are stale. |
| Ratifies rather than contradicts brownfield codebase | **Fail** | SQLite is already decided; current portable sync includes state now declared device-only; migration/cutover is not reconciled. |
| Covers driving spec capabilities | **Not assessed** | No SPEC was identified as a source for this review. User-stated offline writes, continued sync, and history are covered in intent but not fully guaranteed. |
| Preserves inherited parent spine | **Not applicable** | No inherited parent spine is declared. |
| Every owned dimension is decided, deferred, or open | **Partial** | Data/privacy boundaries are strong; operational recovery, rollout compatibility, and asset completion are incomplete. |

## What is already strong

- The named local-first replicated-record-log paradigm is appropriate and immediately constrains implementation.
- AD-1 cleanly keeps interaction independent of network availability.
- Private-database and custom-zone ownership are explicit.
- Immutable revisions plus tombstone revisions are the right shape for history and offline deletion.
- The repository/single-sync-coordinator boundary prevents UI and web adapters from becoming competing CloudKit writers.
- The local-only boundary protects credentials, licensed corpora, caches, voice configuration, and transient audio.
- The pinned Xcode/Swift/SDK stack matches the current local Apple project.

## Recommended gate resolution order

1. Resolve H1 with one deterministic convergence protocol.
2. Resolve H2 and H5 together by adopting the device store and defining idempotent brownfield cutover.
3. Tighten H3 so the historical-retrieval promise matches what Chronicle can enforce.
4. Add the minimum operational envelope in H4 and schema rollout rule in M4.
5. Close payload canonicalization, asset readiness, and continuation lifecycle.

After those changes, rerun the rubric walker. The remaining low findings can be corrected mechanically during redistillation.
