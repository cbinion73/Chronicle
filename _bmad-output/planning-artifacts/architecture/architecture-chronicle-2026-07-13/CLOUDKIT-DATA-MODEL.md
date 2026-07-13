# Chronicle CloudKit Data Model Handoff

This is the implementation contract for keeping Chronicle records synchronized across a user's Mac, iPhone, and iPad while preserving offline operation and retrievable history.

This document defines the model; it does not claim sync is enabled in the current iPad build. Chronicle currently has an iPad target and mutable Zustand persistence. The iCloud entitlement, native SQLite repository, sync coordinator, and future Mac/iPhone targets must be implemented before cross-device sync is advertised.

## Operational boundary

- Container: `iCloud.com.binion.chronicle`
- Database: private only
- Custom zone: `ChronicleData-v1`
- Sync driver: one native `CKSyncEngine` coordinator per app process
- Local rule: every write commits locally and enters a durable outbox before the UI reports success
- Cloud rule: CloudKit retains the current item head and all immutable revisions

The private database contains user-owned Chronicle information. Devices fetch it into their local database and perform reading, search, merging, and Apple Intelligence work locally. No external LLM or non-Apple data service participates.

## Record graph

| Record type | Purpose | Mutability |
| --- | --- | --- |
| `ChronicleItem` | Stable identity and complete set of current revision tips | Mutable head only |
| `ChronicleRevision` | Complete historical state for one item change | Immutable |
| `ChronicleAsset` | User-owned file attached to a specific revision | Immutable |
| `ChronicleContinuation` | Short-lived pointer for resuming an item on another device | Immutable, then expires |

### ChronicleItem

Record name: `ChronicleItem:<itemUUID>`

| Field | CloudKit type | Index | Protection | Rule |
| --- | --- | --- | --- | --- |
| `kind` | String | queryable | plain metadata | One declared sync kind |
| `headRevisions` | Reference List | none | references | Every maximal branch tip, sorted by record name |
| `createdAt` | Date | sortable | plain metadata | Never changes |
| `updatedAt` | Date | sortable | plain metadata | Matches selected revision |
| `isDeleted` | Int64 | queryable | plain metadata | `1` only when head is a tombstone |
| `contentSchemaVersion` | Int64 | queryable | plain metadata | Decoder gate |

`ChronicleItem` contains no user text. Updating `headRevisions` must use the fetched server record's change tag; never use unconditional last-writer-wins save policy. A client unions conflicting tip sets, removes tips that are ancestors of other tips, and preserves every remaining branch.

### ChronicleRevision

Record name: `ChronicleRevision:<revisionUUID>`

| Field | CloudKit type | Index | Protection | Rule |
| --- | --- | --- | --- | --- |
| `item` | Reference | queryable | reference | Stable owning item |
| `parents` | Reference List | none | references | Empty for creation, one for normal edit, two or more for merge |
| `createdAt` | Date | sortable | plain metadata | Device creation instant |
| `contentSchemaVersion` | Int64 | queryable | plain metadata | Payload decoder version |
| `isTombstone` | Int64 | queryable | plain metadata | Tombstone payload must be empty |
| `authorDeviceID` | String | none | encrypted value | Pseudonymous local device UUID |
| `contentHash` | String | none | encrypted value | SHA-256 of canonical payload |
| `requiredAssets` | Reference List | none | references | Complete asset manifest required to materialize this revision |
| `payload` | Bytes | none | encrypted value | Complete canonical JSON state |

Revisions are never updated after a successful save. Old revisions remain fetchable even when no device retains them locally. `payload` has a hard 512 KiB application limit; larger state is split into smaller logical items or required assets before local commit.

### ChronicleAsset

Record name: `ChronicleAsset:<assetUUID>`

| Field | CloudKit type | Index | Protection | Rule |
| --- | --- | --- | --- | --- |
| `item` | Reference | queryable | reference | Owning logical item |
| `revision` | Reference | queryable | reference | Revision that introduced the asset |
| `kind` | String | queryable | plain metadata | Imported PDF, OCR text, OCR manifest, or user attachment |
| `createdAt` | Date | sortable | plain metadata | Immutable |
| `fileName` | String | none | encrypted value | Display name only |
| `contentHash` | String | none | encrypted value | SHA-256 of bytes |
| `byteCount` | Int64 | none | encrypted value | Integrity and quota display |
| `blob` | Asset | none | CloudKit-encrypted asset | User-owned bytes |

Do not upload bundled Bible files, licensed source libraries, generated caches, model weights, credentials, transient recordings, or Mac file paths. Imported copyrighted files require a separate rights decision before asset sync is enabled.

### ChronicleContinuation

Record name: `ChronicleContinuation:<continuationUUID>`

| Field | CloudKit type | Index | Protection | Rule |
| --- | --- | --- | --- | --- |
| `item` | Reference | queryable | reference | Optional when resuming a built-in route |
| `revision` | Reference | queryable | reference | Pins the exact state the source saw |
| `createdAt` | Date | sortable | plain metadata | Source instant |
| `expiresAt` | Date | queryable | plain metadata | Seven days by default |
| `sourceDeviceID` | String | none | encrypted value | Pseudonymous source device |
| `route` | String | none | encrypted value | Local route to open after resolution |

The target first fetches the referenced revision and every `requiredAssets` entry, verifies hashes, commits the complete set locally, asks the user to continue, and only then changes navigation.

## Synchronized kinds

| Kind | Payload source | Merge posture |
| --- | --- | --- |
| `chronicleEntry` | `ChronicleEntry` | Scalar conflict creates visible branch; tags union |
| `prayer` | `PrayerItem` | Prayer touches accumulate; conflicting text remains branched |
| `formationRhythm` | `FormationRhythm` | Completion dates union; definition edits branch |
| `scriptureBookmark` | `ScriptureBookmark` | Identity dedupe, otherwise immutable |
| `memoryVerse` | `MemoryVerse` | Review events fold deterministically; text edits branch |
| `ownedBook` | User-owned metadata and approved assets | Metadata branches; assets address by hash |
| `ownedBookStudy` | Day answers and progress | Independent fields merge; same-field edits branch |
| `aiThread` | Conversations the user elects to retain | Messages append by stable message ID |

Device-only categories are UI/window state, active tabs, cache policy, downloaded corpus, Bible visit patina until promoted, voice-provider configuration, credentials, temporary audio, and Apple model caches.

## Write and synchronization protocol

1. Begin one local database transaction.
2. Create a complete immutable revision, update the local item head, and enqueue both CloudKit record IDs.
3. Commit locally; the UI may now report success even while offline.
4. CKSyncEngine requests pending changes with `atomicByZone: true` for each dependency batch. Confirm every revision and required asset save before enqueueing its item head; enqueue continuations only after the referenced head is confirmed.
5. If the item head returns `serverRecordChanged`, fetch both heads and compare revision ancestry.
6. Union all tips and discard only tips proven to be ancestors of another. Fast-forward for one remaining tip. Otherwise keep every sorted branch and create a lossless merge revision or a visible user-resolution task.
7. Apply remote batches into a local inbox transaction after schema, reference, and content-hash validation.
8. Retain CKSyncEngine state and pending outbox changes in the local database so termination never loses work.

## Deletion, restoration, and history

- Delete creates a new revision with `isTombstone = 1` and an empty payload.
- A concurrent tombstone hides the item without discarding a live branch; restore must descend from all current tips.
- Restore creates a new revision descended from the tombstone, copying a chosen historical payload.
- Devices may evict old revision payloads locally, but must retain enough ancestry metadata to detect branches.
- Selecting History fetches missing revisions from CloudKit on demand.
- No automatic process permanently deletes cloud revisions.
- A future purge feature must be explicit, account-wide, durable against offline resurrection, and separately reviewed.

## Failure behavior

| State | Device behavior |
| --- | --- |
| Offline or transient network error | Continue locally; keep outbox pending |
| iCloud account unavailable | Continue locally; show sync paused without blocking writes |
| Cloud quota exceeded | Continue locally; identify blocked assets and preserve retry state |
| Incompatible future schema | Quarantine record locally; leave cloud copy untouched |
| Corrupt payload or hash mismatch | Quarantine and report; never advance item head |
| Conflicting offline edits | Preserve both revisions; merge only when lossless |
| iCloud account changes | Stop sync and switch to that account's isolated SQLite replica |
| App reinstall | Restore items, current heads, and requested history from private CloudKit |

## Implementation sequence

1. Add the iCloud container and CloudKit entitlement to all Apple targets.
2. Create the four record types and indexes in the development environment.
3. Implement a per-iCloud-account SQLite repository with item, revision, asset, outbox, inbox, migration-ledger, and CKSyncEngine-state tables.
4. Add RFC 8785 codecs, checked-in JSON Schemas, and shared Swift/TypeScript golden fixtures for each enabled Zustand type.
5. Migrate existing local records once with deterministic item UUIDs, a durable migration ledger, and adapters that strip local paths, credentials, caches, and undeclared fields.
6. Implement CKSyncEngine send/fetch, account-state UI, retry, and quarantine.
7. Add history, restore, conflict-resolution, and continuation UI.
8. Exercise two-device offline edits before promoting the CloudKit schema to production.
