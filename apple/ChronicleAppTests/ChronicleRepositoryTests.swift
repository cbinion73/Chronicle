import Foundation
import XCTest
@testable import Chronicle

final class ChronicleRepositoryTests: XCTestCase {
    private func repository(account: String = UUID().uuidString) throws -> ChronicleRepository {
        let root = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)
        return ChronicleRepository(store: try ChronicleSQLiteStore(accountID: account, rootURL: root), deviceID: UUID(uuidString: "11111111-1111-4111-8111-111111111111"))
    }

    private func entry(id: String = "legacy-1", title: String = "First") -> ChronicleEntryRecord {
        ChronicleEntryRecord(id: id, date: "2026-07-13", type: "note", title: title, body: "Stored locally", themes: ["Grace"])
    }

    private func markAllSent(_ repository: ChronicleRepository) throws {
        let pending = try repository.pendingRecordNames()
        try repository.markSent(Dictionary(uniqueKeysWithValues: pending.map { ($0.0, $0.2) }))
    }

    func testMutationCommitsEntryRevisionAndDurableOutbox() throws {
        let repository = try repository()
        try repository.create(entry())
        XCTAssertEqual(try repository.listEntries().map(\.title), ["First"])
        XCTAssertEqual(try repository.historyCount(forLegacyID: "legacy-1"), 1)
        XCTAssertEqual(try repository.outboxCount(), 2)
    }

    func testEditAndTombstoneRetainHistory() throws {
        let repository = try repository()
        try repository.create(entry())
        _ = try repository.update(id: "legacy-1", patch: ["title": .string("Second")])
        try repository.delete(id: "legacy-1")
        XCTAssertTrue(try repository.listEntries().isEmpty)
        XCTAssertEqual(try repository.historyCount(forLegacyID: "legacy-1"), 3)
    }

    func testMigrationIsIdempotentAndExcludesSampleMode() throws {
        let repository = try repository()
        let migration = LegacyEntryMigration(repository: repository)
        XCTAssertEqual(try migration.importEntries([entry()], experienceMode: "sample"), 0)
        XCTAssertEqual(try migration.importEntries([entry()], experienceMode: "fresh"), 1)
        XCTAssertEqual(try migration.importEntries([entry()], experienceMode: "fresh"), 0)
        XCTAssertEqual(try repository.historyCount(forLegacyID: "legacy-1"), 1)
    }

    func testMigrationDoesNotReviseAnEntryAlreadyHydratedFromCloud() throws {
        let repository = try repository()
        try repository.create(entry())
        try markAllSent(repository)

        XCTAssertEqual(try LegacyEntryMigration(repository: repository).importEntries([entry()], experienceMode: "fresh"), 0)
        XCTAssertEqual(try repository.historyCount(forLegacyID: "legacy-1"), 1)
        XCTAssertEqual(try repository.outboxCount(), 0)
    }

    func testAccountPartitionUsesDifferentDatabaseFiles() throws {
        let root = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)
        let a = try ChronicleSQLiteStore(accountID: "account-a", rootURL: root)
        let b = try ChronicleSQLiteStore(accountID: "account-b", rootURL: root)
        XCTAssertNotEqual(a.databaseURL, b.databaseURL)
    }

    func testPayloadLimitRejectsBeforeCommit() throws {
        let repository = try repository()
        XCTAssertThrowsError(try repository.create(ChronicleEntryRecord(id: "large", date: "2026-07-13", type: "note", title: "Large", body: String(repeating: "x", count: 525_000))))
        XCTAssertEqual(try repository.outboxCount(), 0)
    }

    func testSplitRemoteDeliverySurvivesRestartUntilHeadsAreComplete() throws {
        let root = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)
        let itemID = ChronicleRepository.stableItemID(legacyID: "remote-split")
        let payload = try JSONEncoder().encode(entry(id: "remote-split", title: "From iCloud"))
        let revision = ChronicleCloudRevision(
            itemID: itemID,
            parentRevisionIDs: [],
            authorDeviceID: UUID(),
            contentSchemaVersion: 1,
            contentHash: ChronicleRepository.hash(payload),
            payload: payload
        )
        let item = ChronicleCloudItem(
            id: itemID,
            kind: .chronicleEntry,
            createdAt: .now,
            updatedAt: .now,
            headRevisionIDs: [revision.id],
            isDeleted: false,
            contentSchemaVersion: 1
        )

        do {
            let firstLaunch = ChronicleRepository(store: try ChronicleSQLiteStore(accountID: "account", rootURL: root), deviceID: UUID())
            XCTAssertFalse(try firstLaunch.stageAndApplyRemote(items: [item], revisions: []))
            XCTAssertEqual(try firstLaunch.stagedRemoteCount(), 1)
            XCTAssertTrue(try firstLaunch.listEntries().isEmpty)
        }

        let secondLaunch = ChronicleRepository(store: try ChronicleSQLiteStore(accountID: "account", rootURL: root), deviceID: UUID())
        XCTAssertTrue(try secondLaunch.stageAndApplyRemote(items: [], revisions: [revision]))
        XCTAssertEqual(try secondLaunch.stagedRemoteCount(), 0)
        XCTAssertEqual(try secondLaunch.listEntries().map(\.title), ["From iCloud"])
    }

    func testConcurrentRemoteBranchIsRetainedAndRepublished() throws {
        let repository = try repository()
        try repository.create(entry(title: "Base"))
        let baseName = try XCTUnwrap(repository.pendingRecordNames().map(\.0).first { $0.hasPrefix("ChronicleRevision:") })
        let baseRevisionID = try XCTUnwrap(UUID(uuidString: String(baseName.dropFirst("ChronicleRevision:".count))))
        try markAllSent(repository)

        _ = try repository.update(id: "legacy-1", patch: ["title": .string("Local branch")])
        try markAllSent(repository)

        let remoteEntry = entry(title: "Remote branch")
        let payload = try JSONEncoder().encode(remoteEntry)
        let itemID = ChronicleRepository.stableItemID(legacyID: remoteEntry.id)
        let remoteRevision = ChronicleCloudRevision(
            itemID: itemID,
            parentRevisionIDs: [baseRevisionID],
            authorDeviceID: UUID(),
            contentSchemaVersion: 1,
            contentHash: ChronicleRepository.hash(payload),
            payload: payload
        )
        let remoteItem = ChronicleCloudItem(
            id: itemID,
            kind: .chronicleEntry,
            createdAt: .now,
            updatedAt: .now,
            headRevisionIDs: [remoteRevision.id],
            isDeleted: false,
            contentSchemaVersion: 1
        )

        XCTAssertTrue(try repository.stageAndApplyRemote(items: [remoteItem], revisions: [remoteRevision]))
        XCTAssertEqual(try repository.historyCount(forLegacyID: "legacy-1"), 3)
        XCTAssertEqual(try repository.outboxCount(), 1, "the merged ChronicleItem head set must be re-published")
        XCTAssertEqual(try repository.listEntries().count, 1)
    }

    func testAcknowledgingOlderItemGenerationDoesNotDropNewerEdit() throws {
        let repository = try repository()
        try repository.create(entry())
        let item = try XCTUnwrap(repository.pendingRecordNames().first { $0.0.hasPrefix("ChronicleItem:") })
        _ = try repository.update(id: "legacy-1", patch: ["title": .string("Newer")])

        try repository.markSent([item.0: item.2])

        let newerItem = try XCTUnwrap(repository.pendingRecordNames().first { $0.0 == item.0 })
        XCTAssertGreaterThan(newerItem.2, item.2)
    }

    func testSequentialRemoteHeadPrunesAncestorAndAppliesTombstone() throws {
        let repository = try repository()
        try repository.create(entry(title: "Base"))
        let baseName = try XCTUnwrap(repository.pendingRecordNames().map(\.0).first { $0.hasPrefix("ChronicleRevision:") })
        let baseRevisionID = try XCTUnwrap(UUID(uuidString: String(baseName.dropFirst("ChronicleRevision:".count))))
        try markAllSent(repository)
        let itemID = ChronicleRepository.stableItemID(legacyID: "legacy-1")
        let tombstone = ChronicleCloudRevision(
            itemID: itemID,
            parentRevisionIDs: [baseRevisionID],
            authorDeviceID: UUID(),
            contentSchemaVersion: 1,
            isTombstone: true,
            contentHash: ChronicleRepository.hash(Data()),
            payload: Data()
        )
        let remoteItem = ChronicleCloudItem(id: itemID, kind: .chronicleEntry, createdAt: .now, updatedAt: .now, headRevisionIDs: [tombstone.id], isDeleted: true, contentSchemaVersion: 1)

        XCTAssertTrue(try repository.stageAndApplyRemote(items: [remoteItem], revisions: [tombstone]))
        XCTAssertTrue(try repository.listEntries().isEmpty)
        XCTAssertEqual(try repository.outboxCount(), 0)
    }

    func testEntryIdentityCannotChangeDuringUpdate() throws {
        let repository = try repository()
        try repository.create(entry())
        XCTAssertThrowsError(try repository.update(id: "legacy-1", patch: ["id": .string("different")]))
        XCTAssertThrowsError(try repository.update(id: "legacy-1", replacement: entry(id: "different")))
    }

    func testDeviceOnlySourceContextIsRejected() throws {
        let repository = try repository()
        let unsafe = ChronicleEntryRecord(id: "unsafe", date: "2026-07-13", type: "note", title: "Unsafe", body: "Body", sourceContext: .object(["filePath": .string("/Users/chris/private.txt")]))
        XCTAssertThrowsError(try repository.create(unsafe))
        XCTAssertEqual(try repository.outboxCount(), 0)
    }
}
