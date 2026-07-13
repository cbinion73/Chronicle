import XCTest
@testable import Chronicle

final class CloudKitSyncModelTests: XCTestCase {
    func testTombstoneRevisionCarriesNoContent() {
        let revision = ChronicleCloudRevision(
            itemID: UUID(),
            parentRevisionIDs: [UUID()],
            authorDeviceID: UUID(),
            contentSchemaVersion: 1,
            isTombstone: true,
            contentHash: "deleted",
            payload: Data("must not survive".utf8)
        )

        XCTAssertTrue(revision.payload.isEmpty)
        XCTAssertTrue(revision.isTombstone)
    }

    func testRevisionParentsAreDeduplicatedDeterministically() {
        let parent = UUID()
        let revision = ChronicleCloudRevision(
            itemID: UUID(),
            parentRevisionIDs: [parent, parent],
            authorDeviceID: UUID(),
            contentSchemaVersion: 1,
            contentHash: "hash",
            payload: Data()
        )

        XCTAssertEqual(revision.parentRevisionIDs, [parent])
    }

    func testRevisionAssetManifestIsDeduplicatedDeterministically() {
        let asset = UUID()
        let revision = ChronicleCloudRevision(
            itemID: UUID(),
            parentRevisionIDs: [],
            authorDeviceID: UUID(),
            contentSchemaVersion: 1,
            contentHash: "hash",
            requiredAssetIDs: [asset, asset],
            payload: Data()
        )

        XCTAssertEqual(revision.requiredAssetIDs, [asset])
    }

    func testCloudScopeExcludesDeviceSecretsAndCaches() {
        XCTAssertTrue(ChronicleCloudSyncScope.syncedKinds.contains(.chronicleEntry))
        XCTAssertTrue(ChronicleCloudSyncScope.localOnlyCategories.contains("credentials"))
        XCTAssertTrue(ChronicleCloudSyncScope.localOnlyCategories.contains("model-cache"))
        XCTAssertTrue(ChronicleCloudSyncScope.localOnlyCategories.contains("device-file-paths"))
        XCTAssertEqual(ChronicleCloudSchema.maximumRevisionPayloadBytes, 524_288)
    }
}
