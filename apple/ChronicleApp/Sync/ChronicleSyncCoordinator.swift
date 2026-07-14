import CloudKit
import Foundation
import Observation

@MainActor
@Observable
final class ChronicleSyncStatus {
    enum State: Equatable { case starting, ready, syncing, paused(String), failed(String) }
    var state: State = .starting
    var pendingCount = 0
    var requiresAccountReload = false

    var title: String {
        switch state {
        case .starting: "Checking iCloud…"
        case .ready: pendingCount == 0 ? "Synced with iCloud" : "\(pendingCount) change\(pendingCount == 1 ? "" : "s") waiting to sync"
        case .syncing: "Syncing with iCloud…"
        case .paused(let reason): "Sync paused: \(reason)"
        case .failed(let reason): "Sync needs attention: \(reason)"
        }
    }
}

final class ChronicleSyncCoordinator: CKSyncEngineDelegate, @unchecked Sendable {
    static let entriesChanged = Notification.Name("ChronicleEntriesChanged")
    let status: ChronicleSyncStatus
    private let repository: ChronicleRepository
    private let codec = CloudKitRecordCodec()
    private let container: CKContainer
    private let accountRecordName: String
    private let accountLock = NSLock()
    private var pausedForAccountChange = false
    private let sendLock = NSLock()
    private var sentGenerations: [String: Int64] = [:]
    private lazy var engine: CKSyncEngine = makeEngine()

    init(repository: ChronicleRepository, status: ChronicleSyncStatus, accountRecordName: String, container: CKContainer = CKContainer(identifier: ChronicleCloudSchema.containerIdentifier)) {
        self.repository = repository; self.status = status; self.accountRecordName = accountRecordName; self.container = container
    }

    func start() async {
        do {
            let account = try await container.accountStatus()
            guard account == .available else { await setState(.paused(accountDescription(account))); return }
            let zone = CKRecordZone(zoneID: codec.zoneID)
            engine.state.add(pendingDatabaseChanges: [.saveZone(zone)])
            try refreshPendingChanges()
            await setState(.syncing)
            try await engine.fetchChanges()
            try await engine.sendChanges()
            await refreshStatus(.ready)
        } catch {
            print("[ChronicleSync] start failed: \(error)")
            await setState(.failed(error.localizedDescription))
        }
    }

    func localChangesCommitted() {
        guard !isPausedForAccountChange else {
            Task { await setState(.paused("iCloud account changed; reopen Chronicle to use the isolated account replica")) }
            return
        }
        do { try refreshPendingChanges(); Task { try? await engine.sendChanges() }; Task { await refreshStatus(.ready) } }
        catch { Task { await setState(.failed(error.localizedDescription)) } }
    }

    private func makeEngine() -> CKSyncEngine {
        let serialization = try? repository.syncState().flatMap { try JSONDecoder().decode(CKSyncEngine.State.Serialization.self, from: $0) }
        var configuration = CKSyncEngine.Configuration(database: container.privateCloudDatabase, stateSerialization: serialization, delegate: self)
        configuration.automaticallySync = true
        configuration.subscriptionID = "ChronicleData-v1-subscription"
        return CKSyncEngine(configuration)
    }

    private func refreshPendingChanges() throws {
        let existing = Set(engine.state.pendingRecordZoneChanges)
        let additions = try repository.pendingRecordNames().compactMap { name, _, _ -> CKSyncEngine.PendingRecordZoneChange? in
            let type = name.hasPrefix("ChronicleRevision:") ? ChronicleCloudSchema.RecordType.revision : ChronicleCloudSchema.RecordType.item
            guard let uuid = UUID(uuidString: String(name.dropFirst(type.count + 1))) else { return nil }
            let change = CKSyncEngine.PendingRecordZoneChange.saveRecord(codec.id(type: type, uuid: uuid))
            return existing.contains(change) ? nil : change
        }
        engine.state.add(pendingRecordZoneChanges: additions)
    }

    func nextRecordZoneChangeBatch(_ context: CKSyncEngine.SendChangesContext, syncEngine: CKSyncEngine) async -> CKSyncEngine.RecordZoneChangeBatch? {
        guard !isPausedForAccountChange else { return nil }
        let recordIDs = syncEngine.state.pendingRecordZoneChanges.compactMap { change -> CKRecord.ID? in
            guard case .saveRecord(let id) = change else { return nil }
            return id
        }
        let serverRecords: [CKRecord.ID: Result<CKRecord, any Error>]
        do { serverRecords = try await container.privateCloudDatabase.records(for: recordIDs) }
        catch { serverRecords = [:] }
        let records = recordIDs.compactMap { id -> CKRecord? in
            let existing: CKRecord?
            if let result = serverRecords[id], case .success(let record) = result { existing = record } else { existing = nil }
            guard let generation = try? repository.outboxGeneration(recordName: id.recordName) else { return nil }
            let record = try? repository.recordForOutbox(name: id.recordName, codec: codec, existingRecord: existing)
            if record != nil { sendLock.withLock { sentGenerations[id.recordName] = generation } }
            return record
        }
        guard !records.isEmpty else { return nil }
        return CKSyncEngine.RecordZoneChangeBatch(recordsToSave: records, atomicByZone: true)
    }

    func handleEvent(_ event: CKSyncEngine.Event, syncEngine: CKSyncEngine) async {
        do {
            switch event {
            case .stateUpdate(let update):
                try repository.persistSyncState(try JSONEncoder().encode(update.stateSerialization))
            case .accountChange(let change):
                print("[Chronicle] CloudKit account transition: \(change.changeType)")
                if !isInitialSignIn(change.changeType) {
                    setPausedForAccountChange()
                    Task { await syncEngine.cancelOperations() }
                    await MainActor.run { status.requiresAccountReload = true }
                    await setState(.paused("iCloud account changed; reopen Chronicle to use the isolated account replica"))
                }
            case .fetchedRecordZoneChanges(let changes):
                guard !isPausedForAccountChange else { return }
                print("[ChronicleSync] fetched modifications=\(changes.modifications.count) deletions=\(changes.deletions.count)")
                try apply(changes.modifications.map(\.record))
                try refreshPendingChanges()
                for deletion in changes.deletions {
                    try repository.quarantine(recordName: deletion.recordID.recordName, reason: "Cloud history record was deleted outside Chronicle")
                }
                if !changes.deletions.isEmpty { await setState(.failed("Cloud history changed outside Chronicle; no local records were deleted")) }
            case .sentRecordZoneChanges(let sent):
                print("[ChronicleSync] sent saved=\(sent.savedRecords.count) failed=\(sent.failedRecordSaves.count)")
                let savedNames = sent.savedRecords.map(\.recordID.recordName)
                let generations = sendLock.withLock { () -> [String: Int64] in
                    var result: [String: Int64] = [:]
                    for name in savedNames { if let generation = sentGenerations.removeValue(forKey: name) { result[name] = generation } }
                    return result
                }
                try repository.markSent(generations)
                let completed = sent.savedRecords.map { CKSyncEngine.PendingRecordZoneChange.saveRecord($0.recordID) }
                syncEngine.state.remove(pendingRecordZoneChanges: completed)
                try refreshPendingChanges()
                if let failure = sent.failedRecordSaves.first { await setState(.failed(failure.error.localizedDescription)) }
            case .willFetchChanges, .willSendChanges: await setState(.syncing)
            case .didFetchChanges:
                let quarantined = try repository.quarantineUnresolvedRemoteStaging()
                if quarantined > 0 { await setState(.failed("\(quarantined) incomplete cloud record\(quarantined == 1 ? " was" : "s were") quarantined")) }
                else { await refreshStatus(.ready) }
            case .didSendChanges:
                try refreshPendingChanges()
                await refreshStatus(.ready)
            default: break
            }
        } catch {
            print("[ChronicleSync] event failed: \(error)")
            await setState(.failed(error.localizedDescription))
        }
    }

    private func apply(_ records: [CKRecord]) throws {
        var revisions: [ChronicleCloudRevision] = []
        var items: [ChronicleCloudItem] = []
        for record in records {
            do {
                switch record.recordType {
                case ChronicleCloudSchema.RecordType.revision: revisions.append(try codec.decodeRevision(record))
                case ChronicleCloudSchema.RecordType.item: items.append(try codec.decodeItem(record))
                default: try repository.quarantine(recordName: record.recordID.recordName, reason: "unsupported CloudKit record type")
                }
            } catch {
                try repository.quarantine(recordName: record.recordID.recordName, reason: error.localizedDescription)
            }
        }
        if try repository.stageAndApplyRemote(items: items, revisions: revisions) {
            Task { @MainActor in NotificationCenter.default.post(name: Self.entriesChanged, object: nil) }
        }
    }

    private func refreshStatus(_ state: ChronicleSyncStatus.State) async {
        let count = (try? repository.outboxCount()) ?? 0
        let effectiveState: ChronicleSyncStatus.State = isPausedForAccountChange
            ? .paused("iCloud account changed; reopen Chronicle to use the isolated account replica")
            : state
        await MainActor.run { status.pendingCount = count; status.state = effectiveState }
    }
    private func setState(_ state: ChronicleSyncStatus.State) async { await refreshStatus(state) }
    private var isPausedForAccountChange: Bool { accountLock.withLock { pausedForAccountChange } }
    private func setPausedForAccountChange() { accountLock.withLock { pausedForAccountChange = true } }
    private func isInitialSignIn(_ change: CKSyncEngine.Event.AccountChange.ChangeType) -> Bool {
        guard case .signIn(let currentUser) = change else { return false }
        return currentUser.recordName == accountRecordName
    }
    private func accountDescription(_ value: CKAccountStatus) -> String { switch value { case .noAccount: "sign in to iCloud"; case .restricted: "iCloud is restricted"; case .couldNotDetermine: "iCloud status unavailable"; case .temporarilyUnavailable: "iCloud temporarily unavailable"; default: "iCloud unavailable" } }
}
