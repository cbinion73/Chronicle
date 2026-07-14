import CloudKit
import Foundation
import Observation

@MainActor
@Observable
final class ChronicleAppServices {
    private static let lastCloudAccountKey = "Chronicle.LastCloudKitAccountRecordName"
    enum State { case starting, ready, failed(String) }
    private(set) var state: State = .starting
    let syncStatus = ChronicleSyncStatus()
    private(set) var repository: ChronicleRepository?
    private(set) var coordinator: ChronicleSyncCoordinator?

    func start() async {
        guard repository == nil else { return }
        do {
            guard Self.hasChronicleCloudEntitlement else {
                let store = try ChronicleSQLiteStore(accountID: "local-only-no-cloud-entitlement")
                repository = ChronicleRepository(store: store)
                syncStatus.state = .paused("this build is using local-only storage")
                state = .ready
                return
            }
            let container = CKContainer(identifier: ChronicleCloudSchema.containerIdentifier)
            let accountID: String
            let cloudSyncEnabled: Bool
            do {
                let accountStatus = try await container.accountStatus()
                if accountStatus == .available {
                    accountID = try await container.userRecordID().recordName
                    UserDefaults.standard.set(accountID, forKey: Self.lastCloudAccountKey)
                    cloudSyncEnabled = true
                } else {
                    accountID = "local-without-icloud-account"
                    cloudSyncEnabled = false
                    syncStatus.state = .paused(accountDescription(accountStatus))
                }
                #if DEBUG
                print("[ChronicleSync] accountStatus=\(accountStatus.rawValue) userRecord=\(accountID)")
                #endif
            } catch {
                if let cached = UserDefaults.standard.string(forKey: Self.lastCloudAccountKey), !cached.isEmpty {
                    accountID = cached
                    cloudSyncEnabled = true
                    syncStatus.state = .paused("iCloud is offline; using the last local replica")
                } else {
                    accountID = "local-before-first-icloud-account"
                    cloudSyncEnabled = false
                    syncStatus.state = .paused("iCloud is offline; changes remain only on this device")
                }
            }
            let store = try ChronicleSQLiteStore(accountID: accountID)
            let repository = ChronicleRepository(store: store)
            #if DEBUG
            if ProcessInfo.processInfo.environment["CHRONICLE_SYNC_PROBE_RESET_ENGINE"] == "1" {
                try repository.clearSyncState()
                print("[ChronicleProbe] RESET_ENGINE_STATE")
            }
            #endif
            self.repository = repository
            let coordinator = cloudSyncEnabled
                ? ChronicleSyncCoordinator(repository: repository, status: syncStatus, accountRecordName: accountID, container: container)
                : nil
            self.coordinator = coordinator
            syncStatus.requiresAccountReload = false
            #if DEBUG
            try runDebugProbeMutation(repository: repository)
            #endif
            state = .ready
            if let coordinator { Task {
                await coordinator.start()
                #if DEBUG
                await reportDebugProbeExpectation(repository: repository)
                #endif
            } }
        } catch { state = .failed(error.localizedDescription); syncStatus.state = .failed(error.localizedDescription) }
    }

    func reloadCloudAccount() async {
        repository = nil
        coordinator = nil
        state = .starting
        syncStatus.requiresAccountReload = false
        await start()
    }

    private func accountDescription(_ value: CKAccountStatus) -> String {
        switch value {
        case .noAccount: "sign in to iCloud"
        case .restricted: "iCloud is restricted"
        case .couldNotDetermine: "iCloud status unavailable"
        case .temporarilyUnavailable: "iCloud temporarily unavailable"
        default: "iCloud unavailable"
        }
    }

    #if DEBUG
    private func runDebugProbeMutation(repository: ChronicleRepository) throws {
        let environment = ProcessInfo.processInfo.environment
        if let id = environment["CHRONICLE_SYNC_PROBE_CREATE_ID"], !id.isEmpty {
            let entry = ChronicleEntryRecord(
                id: id,
                date: ISO8601DateFormatter().string(from: .now),
                type: "note",
                title: "Chronicle device sync verification",
                body: "Created locally to verify private CloudKit transfer between Apple devices."
            )
            try repository.create(entry)
            print("[ChronicleProbe] CREATED id=\(id) pending=\((try? repository.outboxCount()) ?? -1)")
        }
        if let id = environment["CHRONICLE_SYNC_PROBE_DELETE_ID"], !id.isEmpty {
            try repository.delete(id: id)
            print("[ChronicleProbe] DELETED id=\(id) pending=\((try? repository.outboxCount()) ?? -1)")
        }
    }

    private func reportDebugProbeExpectation(repository: ChronicleRepository) async {
        guard let id = ProcessInfo.processInfo.environment["CHRONICLE_SYNC_PROBE_EXPECT_ID"], !id.isEmpty else { return }
        for attempt in 1...12 {
            let found = (try? repository.listEntries().contains { $0.id == id }) ?? false
            print("[ChronicleProbe] EXPECT id=\(id) found=\(found) attempt=\(attempt) pending=\((try? repository.outboxCount()) ?? -1)")
            if found { return }
            try? await Task.sleep(for: .seconds(5))
        }
    }
    #endif

    private static var hasChronicleCloudEntitlement: Bool {
        #if targetEnvironment(simulator)
        return false
        #else
        // Physical-device and Mac builds are signed with the entitlements generated
        // by project.yml. Simulator test hosts intentionally stay local-only.
        return true
        #endif
    }
}
