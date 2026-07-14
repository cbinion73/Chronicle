import CloudKit
import Foundation

struct CloudKitRecordCodec: Sendable {
    let zoneID = CKRecordZone.ID(zoneName: ChronicleCloudSchema.zoneName, ownerName: CKCurrentUserDefaultName)

    func encode(_ item: ChronicleCloudItem, updating existing: CKRecord? = nil) throws -> CKRecord {
        let recordID = id(type: ChronicleCloudSchema.RecordType.item, uuid: item.id)
        let record = try record(type: ChronicleCloudSchema.RecordType.item, id: recordID, updating: existing)
        record["kind"] = item.kind.rawValue as CKRecordValue
        let localHeads = item.headRevisionIDs.map { CKRecord.Reference(recordID: id(type: ChronicleCloudSchema.RecordType.revision, uuid: $0), action: .none) }
        let serverHeads = (existing?["headRevisions"] as? [CKRecord.Reference]) ?? []
        let mergedHeadMap = (serverHeads + localHeads).reduce(into: [CKRecord.ID: CKRecord.Reference]()) { $0[$1.recordID] = $1 }
        let mergedHeads = mergedHeadMap.values.sorted { $0.recordID.recordName < $1.recordID.recordName }
        record["headRevisions"] = mergedHeads as CKRecordValue
        let serverCreated = existing?["createdAt"] as? Date
        let serverUpdated = existing?["updatedAt"] as? Date
        let serverDeleted = (existing?["isDeleted"] as? NSNumber)?.boolValue ?? item.isDeleted
        record["createdAt"] = min(serverCreated ?? item.createdAt, item.createdAt) as CKRecordValue
        record["updatedAt"] = max(serverUpdated ?? item.updatedAt, item.updatedAt) as CKRecordValue
        record["isDeleted"] = NSNumber(value: serverDeleted && item.isDeleted) as CKRecordValue
        record["contentSchemaVersion"] = NSNumber(value: item.contentSchemaVersion) as CKRecordValue
        return record
    }

    func encode(_ revision: ChronicleCloudRevision, updating existing: CKRecord? = nil) throws -> CKRecord {
        guard revision.payload.count <= ChronicleCloudSchema.maximumRevisionPayloadBytes else { throw ChronicleRepositoryError.payloadTooLarge(revision.payload.count) }
        let recordID = id(type: ChronicleCloudSchema.RecordType.revision, uuid: revision.id)
        let record = try record(type: ChronicleCloudSchema.RecordType.revision, id: recordID, updating: existing)
        record["item"] = CKRecord.Reference(recordID: id(type: ChronicleCloudSchema.RecordType.item, uuid: revision.itemID), action: .none)
        if revision.parentRevisionIDs.isEmpty { record["parents"] = nil }
        else { record["parents"] = revision.parentRevisionIDs.map { CKRecord.Reference(recordID: id(type: ChronicleCloudSchema.RecordType.revision, uuid: $0), action: .none) } as CKRecordValue }
        record["createdAt"] = revision.createdAt as CKRecordValue
        record["contentSchemaVersion"] = NSNumber(value: revision.contentSchemaVersion) as CKRecordValue
        record["isTombstone"] = NSNumber(value: revision.isTombstone) as CKRecordValue
        if revision.requiredAssetIDs.isEmpty { record["requiredAssets"] = nil }
        else { record["requiredAssets"] = revision.requiredAssetIDs.map { CKRecord.Reference(recordID: id(type: ChronicleCloudSchema.RecordType.asset, uuid: $0), action: .none) } as CKRecordValue }
        record.encryptedValues["authorDeviceID"] = revision.authorDeviceID.uuidString.lowercased() as CKRecordValue
        record.encryptedValues["contentHash"] = revision.contentHash as CKRecordValue
        record.encryptedValues["payload"] = revision.payload as CKRecordValue
        return record
    }

    func decodeItem(_ record: CKRecord) throws -> ChronicleCloudItem {
        guard record.recordType == ChronicleCloudSchema.RecordType.item,
              let itemUUID = uuid(record.recordID, type: ChronicleCloudSchema.RecordType.item),
              let kindString = record["kind"] as? String, let kind = ChronicleCloudItemKind(rawValue: kindString),
              kind == .chronicleEntry,
              let createdAt = record["createdAt"] as? Date, let updatedAt = record["updatedAt"] as? Date,
              let headRefs = record["headRevisions"] as? [CKRecord.Reference],
              let deleted = record["isDeleted"] as? NSNumber,
              let schema = record["contentSchemaVersion"] as? NSNumber,
              (1...ChronicleCloudSchema.version).contains(schema.intValue) else {
            throw ChronicleRepositoryError.invalidRemoteRecord("invalid item fields")
        }
        let heads = try headRefs.map { reference in guard let value = uuid(reference.recordID, type: ChronicleCloudSchema.RecordType.revision) else { throw ChronicleRepositoryError.invalidRemoteRecord("invalid head reference") }; return value }
        return ChronicleCloudItem(id: itemUUID, kind: kind, createdAt: createdAt, updatedAt: updatedAt, headRevisionIDs: heads, isDeleted: deleted.boolValue, contentSchemaVersion: schema.intValue)
    }

    func decodeRevision(_ record: CKRecord) throws -> ChronicleCloudRevision {
        guard record.recordType == ChronicleCloudSchema.RecordType.revision,
              let revisionID = uuid(record.recordID, type: ChronicleCloudSchema.RecordType.revision),
              let itemRef = record["item"] as? CKRecord.Reference, let itemID = uuid(itemRef.recordID, type: ChronicleCloudSchema.RecordType.item),
              let createdAt = record["createdAt"] as? Date,
              let schema = record["contentSchemaVersion"] as? NSNumber, (1...ChronicleCloudSchema.version).contains(schema.intValue),
              let tombstoneValue = record["isTombstone"] as? NSNumber,
              let authorString = record.encryptedValues["authorDeviceID"] as? String, let author = UUID(uuidString: authorString),
              let hash = record.encryptedValues["contentHash"] as? String,
              let payload = record.encryptedValues["payload"] as? Data,
              payload.count <= ChronicleCloudSchema.maximumRevisionPayloadBytes else { throw ChronicleRepositoryError.invalidRemoteRecord("invalid revision fields") }
        let parents = try ((record["parents"] as? [CKRecord.Reference]) ?? []).map { reference in guard let value = uuid(reference.recordID, type: ChronicleCloudSchema.RecordType.revision) else { throw ChronicleRepositoryError.invalidRemoteRecord("invalid parent") }; return value }
        let assets = try ((record["requiredAssets"] as? [CKRecord.Reference]) ?? []).map { reference in guard let value = uuid(reference.recordID, type: ChronicleCloudSchema.RecordType.asset) else { throw ChronicleRepositoryError.invalidRemoteRecord("invalid asset") }; return value }
        let tombstone = tombstoneValue.boolValue
        guard tombstone ? (payload.isEmpty && hash == ChronicleRepository.hash(Data())) : ChronicleRepository.hash(payload) == hash else { throw ChronicleRepositoryError.invalidRemoteRecord("payload hash mismatch") }
        return ChronicleCloudRevision(id: revisionID, itemID: itemID, parentRevisionIDs: parents, authorDeviceID: author, createdAt: createdAt, contentSchemaVersion: schema.intValue, isTombstone: tombstone, contentHash: hash, requiredAssetIDs: assets, payload: payload)
    }

    func id(type: String, uuid: UUID) -> CKRecord.ID { CKRecord.ID(recordName: "\(type):\(uuid.uuidString.lowercased())", zoneID: zoneID) }
    private func record(type: String, id: CKRecord.ID, updating existing: CKRecord?) throws -> CKRecord {
        if let existing {
            guard existing.recordType == type, existing.recordID == id else {
                throw ChronicleRepositoryError.invalidRemoteRecord("mismatched server record")
            }
            return existing
        }
        return CKRecord(recordType: type, recordID: id)
    }
    private func uuid(_ id: CKRecord.ID, type: String) -> UUID? {
        let prefix = "\(type):"; guard id.zoneID == zoneID, id.recordName.hasPrefix(prefix) else { return nil }
        return UUID(uuidString: String(id.recordName.dropFirst(prefix.count)))
    }
}
