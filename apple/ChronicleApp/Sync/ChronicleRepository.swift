import CryptoKit
import CloudKit
import Foundation

final class ChronicleRepository: @unchecked Sendable {
    static let legacyNamespace = UUID(uuidString: "ec103b25-87e4-5d18-a8aa-9478545ad204")!

    private let store: ChronicleSQLiteStore
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder
    let deviceID: UUID

    init(store: ChronicleSQLiteStore, deviceID: UUID? = nil) {
        self.store = store
        let key = "Chronicle.DeviceIdentifier"
        if let deviceID { self.deviceID = deviceID }
        else if let value = UserDefaults.standard.string(forKey: key), let existing = UUID(uuidString: value) { self.deviceID = existing }
        else {
            let created = UUID(); UserDefaults.standard.set(created.uuidString.lowercased(), forKey: key); self.deviceID = created
        }
        encoder = JSONEncoder(); encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]; encoder.dateEncodingStrategy = .millisecondsSince1970
        decoder = JSONDecoder(); decoder.dateDecodingStrategy = .millisecondsSince1970
    }

    func listEntries() throws -> [ChronicleEntryRecord] {
        let rows = try store.rows("""
        SELECT head_ids FROM items WHERE kind=? AND is_deleted=0 ORDER BY updated_at DESC, item_id ASC
        """, bindings: [.text(ChronicleCloudItemKind.chronicleEntry.rawValue)])
        return try rows.compactMap { row in
            guard let headData = row["head_ids"]?.blob else { return nil }
            let heads = try decoder.decode([UUID].self, from: headData).sorted { $0.uuidString < $1.uuidString }
            for head in heads {
                if let value = try revision(head), !value.isTombstone {
                    return try decoder.decode(ChronicleEntryRecord.self, from: value.payload)
                }
            }
            return nil
        }
    }

    @discardableResult
    func create(_ entry: ChronicleEntryRecord, source: String? = nil) throws -> ChronicleEntryRecord {
        try validateEntryID(entry.id)
        if let source, try !store.rows("SELECT 1 FROM migration_ledger WHERE source=? AND source_id=?", bindings: [.text(source), .text(entry.id)]).isEmpty {
            return entry
        }
        let itemID = Self.stableItemID(legacyID: entry.id)
        let existing = try item(itemID)
        let payload = try canonicalPayload(entry)
        if let existing {
            if let source {
                let revisionID = existing.headRevisionIDs.first ?? Self.stableRevisionID(itemID: itemID, payload: payload)
                try store.execute(
                    "INSERT OR IGNORE INTO migration_ledger(source,source_id,payload_hash,item_id,revision_id,migrated_at) VALUES(?,?,?,?,?,?)",
                    bindings: [.text(source), .text(entry.id), .text(Self.hash(payload)), .text(itemID.lowercase), .text(revisionID.lowercase), .double(Date().timeIntervalSince1970)]
                )
                return entry
            }
            return try update(id: entry.id, replacement: entry)
        }
        let revisionID = source == nil ? UUID() : Self.stableRevisionID(itemID: itemID, payload: payload)
        let now = Date()
        let item = ChronicleCloudItem(id: itemID, kind: .chronicleEntry, createdAt: now, updatedAt: now, headRevisionIDs: [revisionID], isDeleted: false, contentSchemaVersion: 1)
        let revision = ChronicleCloudRevision(id: revisionID, itemID: itemID, parentRevisionIDs: [], authorDeviceID: deviceID, createdAt: now, contentSchemaVersion: 1, contentHash: Self.hash(payload), payload: payload)
        try store.transaction {
            try insert(item)
            try insert(revision)
            try enqueue(revision)
            try enqueue(item)
            if let source {
                try store.execute("INSERT OR IGNORE INTO migration_ledger(source,source_id,payload_hash,item_id,revision_id,migrated_at) VALUES(?,?,?,?,?,?)", bindings: [.text(source), .text(entry.id), .text(revision.contentHash), .text(itemID.lowercase), .text(revisionID.lowercase), .double(now.timeIntervalSince1970)])
            }
        }
        return entry
    }

    func update(id: String, patch: [String: JSONValue]) throws -> ChronicleEntryRecord {
        try validateEntryID(id)
        if let patchedID = patch["id"], patchedID != .string(id) { throw ChronicleRepositoryError.invalidEntryID }
        guard let existing = try findEntry(id: id) else { throw ChronicleRepositoryError.missingEntry(id) }
        let original = try encoder.encode(existing)
        let patchData = try encoder.encode(JSONValue.object(patch))
        guard var object = try JSONSerialization.jsonObject(with: original) as? [String: Any], let incoming = try JSONSerialization.jsonObject(with: patchData) as? [String: Any] else { throw ChronicleRepositoryError.invalidEntryID }
        incoming.forEach { object[$0.key] = $0.value }
        return try update(id: id, replacement: decoder.decode(ChronicleEntryRecord.self, from: JSONSerialization.data(withJSONObject: object, options: [.sortedKeys])))
    }

    func update(id: String, replacement: ChronicleEntryRecord) throws -> ChronicleEntryRecord {
        try validateEntryID(id)
        guard replacement.id == id else { throw ChronicleRepositoryError.invalidEntryID }
        let itemID = Self.stableItemID(legacyID: id)
        guard var current = try item(itemID) else { throw ChronicleRepositoryError.missingEntry(id) }
        let payload = try canonicalPayload(replacement)
        let revision = ChronicleCloudRevision(itemID: itemID, parentRevisionIDs: current.headRevisionIDs, authorDeviceID: deviceID, contentSchemaVersion: 1, contentHash: Self.hash(payload), payload: payload)
        current.updatedAt = revision.createdAt; current.headRevisionIDs = [revision.id]; current.isDeleted = false
        try store.transaction { try insert(revision); try update(current); try enqueue(revision); try enqueue(current) }
        return replacement
    }

    func delete(id: String) throws {
        try validateEntryID(id)
        let itemID = Self.stableItemID(legacyID: id)
        guard var current = try item(itemID) else { throw ChronicleRepositoryError.missingEntry(id) }
        let revision = ChronicleCloudRevision(itemID: itemID, parentRevisionIDs: current.headRevisionIDs, authorDeviceID: deviceID, contentSchemaVersion: 1, isTombstone: true, contentHash: Self.hash(Data()), payload: Data())
        current.updatedAt = revision.createdAt; current.headRevisionIDs = [revision.id]; current.isDeleted = true
        try store.transaction { try insert(revision); try update(current); try enqueue(revision); try enqueue(current) }
    }

    func pendingRecordNames(limit: Int = 200) throws -> [(String, String, Int64)] {
        try store.rows("SELECT record_name,record_type,generation FROM outbox ORDER BY dependency_rank,sequence LIMIT ?", bindings: [.integer(Int64(limit))]).compactMap {
            guard let name = $0["record_name"]?.string, let type = $0["record_type"]?.string, let generation = $0["generation"]?.int else { return nil }; return (name, type, generation)
        }
    }

    func outboxGeneration(recordName: String) throws -> Int64? {
        try store.rows("SELECT generation FROM outbox WHERE record_name=?", bindings: [.text(recordName)]).first?["generation"]?.int
    }

    func recordForOutbox(name: String, codec: CloudKitRecordCodec, existingRecord: CKRecord? = nil) throws -> CKRecord? {
        if name.hasPrefix("ChronicleRevision:") {
            guard let id = UUID(uuidString: String(name.dropFirst("ChronicleRevision:".count))), let revision = try revision(id) else { return nil }
            return try codec.encode(revision, updating: existingRecord)
        }
        guard let id = UUID(uuidString: String(name.dropFirst("ChronicleItem:".count))), let item = try item(id) else { return nil }
        return try codec.encode(item, updating: existingRecord)
    }

    func markSent(_ generations: [String: Int64]) throws {
        try store.transaction {
            for (name, generation) in generations {
                try store.execute("DELETE FROM outbox WHERE record_name=? AND generation=?", bindings: [.text(name), .integer(generation)])
            }
        }
    }

    func persistSyncState(_ data: Data) throws { try store.execute("INSERT OR REPLACE INTO sync_state(key,value,updated_at) VALUES('cksyncengine',?,?)", bindings: [.data(data), .double(Date().timeIntervalSince1970)]) }
    func syncState() throws -> Data? { try store.rows("SELECT value FROM sync_state WHERE key='cksyncengine'").first?["value"]?.blob }
    func clearSyncState() throws { try store.execute("DELETE FROM sync_state WHERE key='cksyncengine'") }
    func outboxCount() throws -> Int { Int(try store.rows("SELECT COUNT(*) count FROM outbox").first?["count"]?.int ?? 0) }
    func historyCount(forLegacyID id: String) throws -> Int { Int(try store.rows("SELECT COUNT(*) count FROM revisions WHERE item_id=?", bindings: [.text(Self.stableItemID(legacyID: id).lowercase)]).first?["count"]?.int ?? 0) }
    func stagedRemoteCount() throws -> Int { Int(try store.rows("SELECT COUNT(*) count FROM remote_staging").first?["count"]?.int ?? 0) }
    func quarantine(recordName: String, reason: String) throws {
        try store.execute(
            "INSERT OR REPLACE INTO quarantine(record_name,reason,received_at) VALUES(?,?,?)",
            bindings: [.text(recordName), .text(String(reason.prefix(1_024))), .double(Date().timeIntervalSince1970)]
        )
    }

    func quarantineUnresolvedRemoteStaging() throws -> Int {
        let rows = try store.rows("SELECT record_name FROM remote_staging")
        guard !rows.isEmpty else { return 0 }
        try store.transaction {
            for row in rows {
                guard let name = row["record_name"]?.string else { continue }
                try quarantine(recordName: name, reason: "Cloud record dependencies were missing at the end of the fetch cycle")
            }
            try store.execute("DELETE FROM remote_staging")
        }
        return rows.count
    }

    /// CloudKit can deliver an item's mutable head record separately from its
    /// immutable revisions. Persist both sides until the full head set exists so
    /// advancing the CloudKit token can never discard a split delivery.
    @discardableResult
    func stageAndApplyRemote(items: [ChronicleCloudItem], revisions: [ChronicleCloudRevision]) throws -> Bool {
        for item in items {
            guard item.kind == .chronicleEntry, item.contentSchemaVersion <= ChronicleCloudSchema.version else {
                throw ChronicleRepositoryError.invalidRemoteRecord("unsupported item kind or schema")
            }
        }
        for revision in revisions { try validateRemote(revision) }
        try store.transaction {
            for item in items {
                try store.execute(
                    "INSERT OR REPLACE INTO remote_staging VALUES(?,?,?,?)",
                    bindings: [.text("ChronicleItem:\(item.id.lowercase)"), .text(ChronicleCloudSchema.RecordType.item), .data(try encoder.encode(item)), .double(Date().timeIntervalSince1970)]
                )
            }
            for revision in revisions {
                try store.execute(
                    "INSERT OR REPLACE INTO remote_staging VALUES(?,?,?,?)",
                    bindings: [.text("ChronicleRevision:\(revision.id.lowercase)"), .text(ChronicleCloudSchema.RecordType.revision), .data(try encoder.encode(revision)), .double(Date().timeIntervalSince1970)]
                )
            }
        }

        let stagedItems = try store.rows("SELECT record_name,payload FROM remote_staging WHERE record_type=?", bindings: [.text(ChronicleCloudSchema.RecordType.item)])
        let stagedRevisions = try store.rows("SELECT record_name,payload FROM remote_staging WHERE record_type=?", bindings: [.text(ChronicleCloudSchema.RecordType.revision)])
            .compactMap { row -> ChronicleCloudRevision? in
                guard let payload = row["payload"]?.blob else { return nil }
                return try? decoder.decode(ChronicleCloudRevision.self, from: payload)
            }
        let stagedByID = Dictionary(uniqueKeysWithValues: stagedRevisions.map { ($0.id, $0) })
        var changed = false
        for row in stagedItems {
            guard let data = row["payload"]?.blob, let recordName = row["record_name"]?.string else { continue }
            let remote = try decoder.decode(ChronicleCloudItem.self, from: data)
            guard let candidates = try reachableStagedRevisions(for: remote, stagedByID: stagedByID) else { continue }
            try applyRemote(item: remote, revisions: candidates)
            try store.transaction {
                try store.execute("DELETE FROM remote_staging WHERE record_name=?", bindings: [.text(recordName)])
                for revision in candidates {
                    try store.execute("DELETE FROM remote_staging WHERE record_name=?", bindings: [.text("ChronicleRevision:\(revision.id.lowercase)")])
                }
            }
            changed = true
        }
        return changed
    }

    func applyRemote(item remote: ChronicleCloudItem, revisions: [ChronicleCloudRevision]) throws {
        guard remote.kind == .chronicleEntry, remote.contentSchemaVersion <= ChronicleCloudSchema.version else { throw ChronicleRepositoryError.invalidRemoteRecord("unsupported item kind or schema") }
        for revision in revisions { try validateRemote(revision); guard revision.itemID == remote.id else { throw ChronicleRepositoryError.invalidRemoteRecord("revision item mismatch") } }
        try store.transaction {
            if try item(remote.id) == nil { try insert(remote) }
            for revision in revisions { try insert(revision, ignoreExisting: true) }
            var hasAllHeads = true
            for id in remote.headRevisionIDs where try revision(id) == nil { hasAllHeads = false }
            guard hasAllHeads else { throw ChronicleRepositoryError.invalidRemoteRecord("dangling head") }
            if var local = try item(remote.id) {
                let remoteHeads = Set(remote.headRevisionIDs)
                local.headRevisionIDs = try pruneAncestorHeads(local.headRevisionIDs + remote.headRevisionIDs)
                local.updatedAt = max(local.updatedAt, remote.updatedAt)
                local.isDeleted = try !local.headRevisionIDs.isEmpty && local.headRevisionIDs.allSatisfy { try revision($0)?.isTombstone == true }
                try update(local)
                if Set(local.headRevisionIDs) != remoteHeads { try enqueue(local) }
            }
        }
    }

    private func validateRemote(_ revision: ChronicleCloudRevision) throws {
        guard (1...ChronicleCloudSchema.version).contains(revision.contentSchemaVersion),
              revision.payload.count <= ChronicleCloudSchema.maximumRevisionPayloadBytes,
              revision.isTombstone || Self.hash(revision.payload) == revision.contentHash else {
            throw ChronicleRepositoryError.invalidRemoteRecord("revision integrity failed")
        }
        if revision.isTombstone {
            guard revision.payload.isEmpty, revision.contentHash == Self.hash(Data()) else {
                throw ChronicleRepositoryError.invalidRemoteRecord("invalid tombstone")
            }
        } else {
            guard let entry = try? decoder.decode(ChronicleEntryRecord.self, from: revision.payload),
                  (try? validatedEntryID(entry.id)) != nil,
                  Self.stableItemID(legacyID: entry.id) == revision.itemID else {
                throw ChronicleRepositoryError.invalidRemoteRecord("invalid entry payload identity")
            }
            try validateSourceContext(entry.sourceContext)
        }
    }

    private func reachableStagedRevisions(for item: ChronicleCloudItem, stagedByID: [UUID: ChronicleCloudRevision]) throws -> [ChronicleCloudRevision]? {
        var reachable: [UUID: ChronicleCloudRevision] = [:]
        var visiting = Set<UUID>()
        func visit(_ id: UUID) throws -> Bool {
            if try revision(id) != nil { return true }
            if reachable[id] != nil { return true }
            guard !visiting.contains(id), let value = stagedByID[id], value.itemID == item.id else { return false }
            visiting.insert(id)
            for parent in value.parentRevisionIDs where try !visit(parent) { return false }
            visiting.remove(id)
            reachable[id] = value
            return true
        }
        for head in item.headRevisionIDs where try !visit(head) { return nil }
        return reachable.values.sorted { $0.id.uuidString < $1.id.uuidString }
    }

    private func pruneAncestorHeads(_ heads: [UUID]) throws -> [UUID] {
        let unique = Array(Set(heads))
        var result: [UUID] = []
        for candidate in unique {
            var isAncestorHead = false
            for other in unique where other != candidate {
                if try isAncestor(candidate, of: other, visited: []) { isAncestorHead = true; break }
            }
            if !isAncestorHead { result.append(candidate) }
        }
        return result.sorted { $0.uuidString < $1.uuidString }
    }

    private func isAncestor(_ candidate: UUID, of descendant: UUID, visited: Set<UUID>) throws -> Bool {
        guard !visited.contains(descendant), let value = try revision(descendant) else { return false }
        if value.parentRevisionIDs.contains(candidate) { return true }
        var nextVisited = visited; nextVisited.insert(descendant)
        for parent in value.parentRevisionIDs where try isAncestor(candidate, of: parent, visited: nextVisited) { return true }
        return false
    }

    private func findEntry(id: String) throws -> ChronicleEntryRecord? {
        let itemID = Self.stableItemID(legacyID: id)
        guard let current = try item(itemID), !current.isDeleted else { return nil }
        for head in current.headRevisionIDs { if let revision = try revision(head), !revision.isTombstone { return try decoder.decode(ChronicleEntryRecord.self, from: revision.payload) } }
        return nil
    }

    private func canonicalPayload(_ entry: ChronicleEntryRecord) throws -> Data {
        try validateEntryID(entry.id)
        try validateSourceContext(entry.sourceContext)
        let data = try encoder.encode(entry)
        guard data.count <= ChronicleCloudSchema.maximumRevisionPayloadBytes else { throw ChronicleRepositoryError.payloadTooLarge(data.count) }
        return data
    }

    private func item(_ id: UUID) throws -> ChronicleCloudItem? {
        guard let row = try store.rows("SELECT * FROM items WHERE item_id=?", bindings: [.text(id.lowercase)]).first,
              let kindValue = row["kind"]?.string, let kind = ChronicleCloudItemKind(rawValue: kindValue), let headsData = row["head_ids"]?.blob else { return nil }
        return ChronicleCloudItem(id: id, kind: kind, createdAt: Date(timeIntervalSince1970: row["created_at"]?.number ?? 0), updatedAt: Date(timeIntervalSince1970: row["updated_at"]?.number ?? 0), headRevisionIDs: try decoder.decode([UUID].self, from: headsData), isDeleted: row["is_deleted"]?.int == 1, contentSchemaVersion: Int(row["schema_version"]?.int ?? 1))
    }

    private func revision(_ id: UUID) throws -> ChronicleCloudRevision? {
        guard let row = try store.rows("SELECT * FROM revisions WHERE revision_id=?", bindings: [.text(id.lowercase)]).first,
              let item = UUID(uuidString: row["item_id"]?.string ?? ""), let author = UUID(uuidString: row["author_device_id"]?.string ?? ""), let parents = row["parent_ids"]?.blob, let assets = row["required_asset_ids"]?.blob, let payload = row["payload"]?.blob else { return nil }
        return ChronicleCloudRevision(id: id, itemID: item, parentRevisionIDs: try decoder.decode([UUID].self, from: parents), authorDeviceID: author, createdAt: Date(timeIntervalSince1970: row["created_at"]?.number ?? 0), contentSchemaVersion: Int(row["schema_version"]?.int ?? 1), isTombstone: row["is_tombstone"]?.int == 1, contentHash: row["content_hash"]?.string ?? "", requiredAssetIDs: try decoder.decode([UUID].self, from: assets), payload: payload)
    }

    private func insert(_ item: ChronicleCloudItem) throws { try store.execute("INSERT INTO items VALUES(?,?,?,?,?,?,?)", bindings: [.text(item.id.lowercase), .text(item.kind.rawValue), .double(item.createdAt.timeIntervalSince1970), .double(item.updatedAt.timeIntervalSince1970), .data(try encoder.encode(item.headRevisionIDs)), .integer(item.isDeleted ? 1 : 0), .integer(Int64(item.contentSchemaVersion))]) }
    private func update(_ item: ChronicleCloudItem) throws { try store.execute("UPDATE items SET updated_at=?,head_ids=?,is_deleted=?,schema_version=? WHERE item_id=?", bindings: [.double(item.updatedAt.timeIntervalSince1970), .data(try encoder.encode(item.headRevisionIDs)), .integer(item.isDeleted ? 1 : 0), .integer(Int64(item.contentSchemaVersion)), .text(item.id.lowercase)]) }
    private func insert(_ revision: ChronicleCloudRevision, ignoreExisting: Bool = false) throws { try store.execute("INSERT \(ignoreExisting ? "OR IGNORE " : "")INTO revisions VALUES(?,?,?,?,?,?,?,?,?,?)", bindings: [.text(revision.id.lowercase), .text(revision.itemID.lowercase), .data(try encoder.encode(revision.parentRevisionIDs)), .text(revision.authorDeviceID.lowercase), .double(revision.createdAt.timeIntervalSince1970), .integer(Int64(revision.contentSchemaVersion)), .integer(revision.isTombstone ? 1 : 0), .text(revision.contentHash), .data(try encoder.encode(revision.requiredAssetIDs)), .data(revision.payload)]) }
    private func enqueue(_ revision: ChronicleCloudRevision) throws { try enqueue(name: "ChronicleRevision:\(revision.id.lowercase)", type: ChronicleCloudSchema.RecordType.revision, itemID: revision.itemID, rank: 0) }
    private func enqueue(_ item: ChronicleCloudItem) throws { try enqueue(name: "ChronicleItem:\(item.id.lowercase)", type: ChronicleCloudSchema.RecordType.item, itemID: item.id, rank: 1) }
    private func enqueue(name: String, type: String, itemID: UUID, rank: Int) throws {
        try store.execute(
            """
            INSERT INTO outbox(record_name,record_type,item_id,dependency_rank,generation,created_at) VALUES(?,?,?,?,1,?)
            ON CONFLICT(record_name) DO UPDATE SET generation=outbox.generation+1, created_at=excluded.created_at
            """,
            bindings: [.text(name), .text(type), .text(itemID.lowercase), .integer(Int64(rank)), .double(Date().timeIntervalSince1970)]
        )
    }

    private func validateEntryID(_ id: String) throws { _ = try validatedEntryID(id) }
    private func validatedEntryID(_ id: String) throws -> String {
        guard !id.isEmpty, id.count <= 256 else { throw ChronicleRepositoryError.invalidEntryID }
        return id
    }

    private func validateSourceContext(_ value: JSONValue?) throws {
        guard let value else { return }
        let forbiddenFragments = ["credential", "password", "secret", "token", "api_key", "apikey", "cache"]
        func validate(_ value: JSONValue) throws {
            switch value {
            case .array(let values): try values.forEach(validate)
            case .object(let object):
                for (key, child) in object {
                    let normalized = key.lowercased().replacingOccurrences(of: "-", with: "_")
                    let deviceOnlyKey = normalized == "path" || normalized.hasSuffix("_path") || normalized == "voice_config" || normalized == "audio_data" || normalized == "audio_path" || normalized == "transient_audio"
                    guard !deviceOnlyKey, !forbiddenFragments.contains(where: normalized.contains) else { throw ChronicleRepositoryError.forbiddenSourceContext }
                    try validate(child)
                }
            case .string(let string):
                let normalized = string.lowercased()
                if normalized.hasPrefix("/users/") || normalized.hasPrefix("/private/var/") || normalized.hasPrefix("file://") {
                    throw ChronicleRepositoryError.forbiddenSourceContext
                }
            default: break
            }
        }
        try validate(value)
    }

    static func stableItemID(legacyID: String) -> UUID { deterministicUUID(namespace: legacyNamespace, value: "chronicleEntry:\(legacyID)") }
    static func stableRevisionID(itemID: UUID, payload: Data) -> UUID { deterministicUUID(namespace: itemID, value: hash(payload)) }
    static func deterministicUUID(namespace: UUID, value: String) -> UUID {
        var bytes = withUnsafeBytes(of: namespace.uuid) { Array($0) }; bytes.append(contentsOf: value.utf8)
        var digest = Array(SHA256.hash(data: Data(bytes)).prefix(16)); digest[6] = (digest[6] & 0x0f) | 0x50; digest[8] = (digest[8] & 0x3f) | 0x80
        return UUID(uuid: (digest[0],digest[1],digest[2],digest[3],digest[4],digest[5],digest[6],digest[7],digest[8],digest[9],digest[10],digest[11],digest[12],digest[13],digest[14],digest[15]))
    }
    static func hash(_ data: Data) -> String { SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined() }
}

private extension UUID { var lowercase: String { uuidString.lowercased() } }
