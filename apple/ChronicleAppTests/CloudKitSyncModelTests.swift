import CloudKit
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
        XCTAssertEqual(ChronicleCloudSyncScope.syncedKinds, [.chronicleEntry])
        XCTAssertTrue(ChronicleCloudSyncScope.localOnlyCategories.contains("credentials"))
        XCTAssertTrue(ChronicleCloudSyncScope.localOnlyCategories.contains("model-cache"))
        XCTAssertTrue(ChronicleCloudSyncScope.localOnlyCategories.contains("device-file-paths"))
        XCTAssertEqual(ChronicleCloudSchema.maximumRevisionPayloadBytes, 524_288)
    }

    func testCodecEncryptsContentAndOmitsEmptyReferenceLists() throws {
        let payload = Data("private entry".utf8)
        let revision = ChronicleCloudRevision(
            itemID: UUID(),
            parentRevisionIDs: [],
            authorDeviceID: UUID(),
            contentSchemaVersion: 1,
            contentHash: ChronicleRepository.hash(payload),
            payload: payload
        )

        let record = try CloudKitRecordCodec().encode(revision)

        XCTAssertNil(record["payload"])
        XCTAssertEqual(record.encryptedValues["payload"] as? Data, payload)
        XCTAssertNil(record["parents"])
        XCTAssertNil(record["requiredAssets"])
    }

    func testCodecPreservesConcurrentServerHeadsWhenSavingItem() throws {
        let codec = CloudKitRecordCodec()
        let itemID = UUID()
        let serverHead = UUID()
        let localHead = UUID()
        let existing = CKRecord(
            recordType: ChronicleCloudSchema.RecordType.item,
            recordID: codec.id(type: ChronicleCloudSchema.RecordType.item, uuid: itemID)
        )
        existing["headRevisions"] = [
            CKRecord.Reference(
                recordID: codec.id(type: ChronicleCloudSchema.RecordType.revision, uuid: serverHead),
                action: .none
            )
        ] as CKRecordValue
        existing["isDeleted"] = NSNumber(value: false)
        let item = ChronicleCloudItem(
            id: itemID,
            kind: .chronicleEntry,
            createdAt: .now,
            updatedAt: .now,
            headRevisionIDs: [localHead],
            isDeleted: true,
            contentSchemaVersion: 1
        )

        let encoded = try codec.encode(item, updating: existing)
        let names = try XCTUnwrap(encoded["headRevisions"] as? [CKRecord.Reference]).map(\.recordID.recordName)

        XCTAssertEqual(Set(names), Set([
            codec.id(type: ChronicleCloudSchema.RecordType.revision, uuid: serverHead).recordName,
            codec.id(type: ChronicleCloudSchema.RecordType.revision, uuid: localHead).recordName
        ]))
        XCTAssertEqual((encoded["isDeleted"] as? NSNumber)?.boolValue, false)
    }
}
