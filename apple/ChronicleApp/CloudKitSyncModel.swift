import Foundation

enum ChronicleCloudSchema {
    static let version = 1
    static let maximumRevisionPayloadBytes = 512 * 1_024
    static let containerIdentifier = "iCloud.com.binion.chronicle"
    static let zoneName = "ChronicleData-v1"

    enum RecordType {
        static let item = "ChronicleItem"
        static let revision = "ChronicleRevision"
        static let asset = "ChronicleAsset"
        static let continuation = "ChronicleContinuation"
    }
}

enum ChronicleCloudItemKind: String, Codable, CaseIterable, Sendable {
    case chronicleEntry
    case prayer
    case formationRhythm
    case scriptureBookmark
    case memoryVerse
    case ownedBook
    case ownedBookStudy
    case aiThread
}

struct ChronicleCloudItem: Codable, Equatable, Identifiable, Sendable {
    let id: UUID
    let kind: ChronicleCloudItemKind
    let createdAt: Date
    var updatedAt: Date
    var headRevisionIDs: [UUID]
    var isDeleted: Bool
    var contentSchemaVersion: Int
}

struct ChronicleCloudRevision: Codable, Equatable, Identifiable, Sendable {
    let id: UUID
    let itemID: UUID
    let parentRevisionIDs: [UUID]
    let authorDeviceID: UUID
    let createdAt: Date
    let contentSchemaVersion: Int
    let isTombstone: Bool
    let contentHash: String
    let requiredAssetIDs: [UUID]
    let payload: Data

    init(
        id: UUID = UUID(),
        itemID: UUID,
        parentRevisionIDs: [UUID],
        authorDeviceID: UUID,
        createdAt: Date = .now,
        contentSchemaVersion: Int,
        isTombstone: Bool = false,
        contentHash: String,
        requiredAssetIDs: [UUID] = [],
        payload: Data
    ) {
        self.id = id
        self.itemID = itemID
        self.parentRevisionIDs = Array(Set(parentRevisionIDs)).sorted { $0.uuidString < $1.uuidString }
        self.authorDeviceID = authorDeviceID
        self.createdAt = createdAt
        self.contentSchemaVersion = contentSchemaVersion
        self.isTombstone = isTombstone
        self.contentHash = contentHash
        self.requiredAssetIDs = Array(Set(requiredAssetIDs)).sorted { $0.uuidString < $1.uuidString }
        self.payload = isTombstone ? Data() : payload
    }
}

struct ChronicleCloudAsset: Codable, Equatable, Identifiable, Sendable {
    enum Kind: String, Codable, Sendable {
        case importedPDF
        case ocrText
        case ocrManifest
        case userAttachment
    }

    let id: UUID
    let itemID: UUID
    let revisionID: UUID
    let kind: Kind
    let fileName: String
    let contentHash: String
    let byteCount: Int64
    let createdAt: Date
}

struct ChronicleContinuation: Codable, Equatable, Identifiable, Sendable {
    let id: UUID
    let sourceDeviceID: UUID
    let itemID: UUID?
    let revisionID: UUID?
    let route: String
    let createdAt: Date
    let expiresAt: Date

    var isExpired: Bool { expiresAt <= .now }
}

enum ChronicleCloudSyncScope {
    static let syncedKinds = Set(ChronicleCloudItemKind.allCases)

    static let localOnlyCategories: Set<String> = [
        "bundled-scripture",
        "licensed-corpus",
        "download-cache",
        "model-cache",
        "credentials",
        "voice-configuration",
        "window-and-navigation-state",
        "transient-audio",
        "device-file-paths",
    ]
}
