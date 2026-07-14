import Foundation

struct ChronicleEntryRecord: Codable, Equatable, Identifiable, Sendable {
    let id: String
    var date: String
    var type: String
    var title: String
    var body: String
    var passage: String?
    var themes: [String]?
    var autoCapture: Bool?
    var sourceContext: JSONValue?
}

enum JSONValue: Codable, Equatable, Sendable {
    case null, bool(Bool), number(Double), string(String), array([JSONValue]), object([String: JSONValue])

    init(from decoder: Decoder) throws {
        let value = try decoder.singleValueContainer()
        if value.decodeNil() { self = .null }
        else if let decoded = try? value.decode(Bool.self) { self = .bool(decoded) }
        else if let decoded = try? value.decode(Double.self) { self = .number(decoded) }
        else if let decoded = try? value.decode(String.self) { self = .string(decoded) }
        else if let decoded = try? value.decode([JSONValue].self) { self = .array(decoded) }
        else { self = .object(try value.decode([String: JSONValue].self)) }
    }

    func encode(to encoder: Encoder) throws {
        var value = encoder.singleValueContainer()
        switch self {
        case .null: try value.encodeNil()
        case .bool(let item): try value.encode(item)
        case .number(let item): try value.encode(item)
        case .string(let item): try value.encode(item)
        case .array(let item): try value.encode(item)
        case .object(let item): try value.encode(item)
        }
    }
}

struct ChronicleStoredRevision: Sendable, Equatable {
    let revision: ChronicleCloudRevision
    let item: ChronicleCloudItem
}

enum ChronicleRepositoryError: LocalizedError {
    case invalidEntryID
    case missingEntry(String)
    case payloadTooLarge(Int)
    case forbiddenSourceContext
    case database(String)
    case invalidRemoteRecord(String)

    var errorDescription: String? {
        switch self {
        case .invalidEntryID: "Chronicle rejected an invalid entry identifier."
        case .missingEntry(let id): "Chronicle entry \(id) does not exist."
        case .payloadTooLarge(let size): "This entry is \(size) bytes; the sync limit is 524288 bytes."
        case .forbiddenSourceContext: "This entry contains device-only or sensitive source metadata that Chronicle will not sync."
        case .database(let message): "Chronicle local storage failed: \(message)"
        case .invalidRemoteRecord(let message): "Chronicle rejected a cloud record: \(message)"
        }
    }
}
