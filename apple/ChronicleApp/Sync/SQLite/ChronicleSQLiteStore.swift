import CryptoKit
import Foundation
import SQLite3

final class ChronicleSQLiteStore: @unchecked Sendable {
    private var database: OpaquePointer?
    private let lock = NSRecursiveLock()
    let accountID: String
    let databaseURL: URL

    init(accountID: String, rootURL: URL? = nil) throws {
        self.accountID = accountID
        let base = try rootURL ?? FileManager.default.url(
            for: .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true
        ).appending(path: "Chronicle/CloudReplicas", directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
        let partition = SHA256.hash(data: Data(accountID.utf8)).map { String(format: "%02x", $0) }.joined()
        databaseURL = base.appending(path: "\(partition).sqlite3")
        guard sqlite3_open_v2(databaseURL.path, &database, SQLITE_OPEN_CREATE | SQLITE_OPEN_READWRITE | SQLITE_OPEN_FULLMUTEX, nil) == SQLITE_OK else {
            throw ChronicleRepositoryError.database("could not open the account replica")
        }
        try execute("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA synchronous=FULL;")
        try migrateSchema()
    }

    deinit { sqlite3_close(database) }

    func transaction<T>(_ body: () throws -> T) throws -> T {
        lock.lock(); defer { lock.unlock() }
        try execute("BEGIN IMMEDIATE")
        do {
            let result = try body()
            try execute("COMMIT")
            return result
        } catch {
            try? execute("ROLLBACK")
            throw error
        }
    }

    func execute(_ sql: String, bindings: [SQLiteValue] = []) throws {
        lock.lock(); defer { lock.unlock() }
        if bindings.isEmpty {
            var errorMessage: UnsafeMutablePointer<CChar>?
            let result = sqlite3_exec(database, sql, nil, nil, &errorMessage)
            guard result == SQLITE_OK else {
                let message = errorMessage.map { String(cString: $0) } ?? "SQLite execution failed"
                sqlite3_free(errorMessage)
                throw ChronicleRepositoryError.database(message)
            }
            return
        }
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(database, sql, -1, &statement, nil) == SQLITE_OK else { throw lastError() }
        defer { sqlite3_finalize(statement) }
        try bind(bindings, to: statement)
        guard sqlite3_step(statement) == SQLITE_DONE else { throw lastError() }
    }

    func rows(_ sql: String, bindings: [SQLiteValue] = []) throws -> [[String: SQLiteValue]] {
        lock.lock(); defer { lock.unlock() }
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(database, sql, -1, &statement, nil) == SQLITE_OK else { throw lastError() }
        defer { sqlite3_finalize(statement) }
        try bind(bindings, to: statement)
        var result: [[String: SQLiteValue]] = []
        var stepResult = sqlite3_step(statement)
        while stepResult == SQLITE_ROW {
            var row: [String: SQLiteValue] = [:]
            for index in 0..<sqlite3_column_count(statement) {
                let name = String(cString: sqlite3_column_name(statement, index))
                switch sqlite3_column_type(statement, index) {
                case SQLITE_INTEGER: row[name] = .integer(sqlite3_column_int64(statement, index))
                case SQLITE_FLOAT: row[name] = .double(sqlite3_column_double(statement, index))
                case SQLITE_BLOB:
                    let count = Int(sqlite3_column_bytes(statement, index))
                    if count == 0 {
                        row[name] = .data(Data())
                    } else if let bytes = sqlite3_column_blob(statement, index) {
                        row[name] = .data(Data(bytes: bytes, count: count))
                    } else {
                        throw ChronicleRepositoryError.database("SQLite returned a null pointer for a non-empty blob")
                    }
                case SQLITE_NULL: row[name] = .null
                default: row[name] = .text(String(cString: sqlite3_column_text(statement, index)))
                }
            }
            result.append(row)
            stepResult = sqlite3_step(statement)
        }
        guard stepResult == SQLITE_DONE else { throw lastError() }
        return result
    }

    private func migrateSchema() throws {
        try execute("""
        CREATE TABLE IF NOT EXISTS items(item_id TEXT PRIMARY KEY, kind TEXT NOT NULL, created_at REAL NOT NULL, updated_at REAL NOT NULL, head_ids BLOB NOT NULL, is_deleted INTEGER NOT NULL, schema_version INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS revisions(revision_id TEXT PRIMARY KEY, item_id TEXT NOT NULL, parent_ids BLOB NOT NULL, author_device_id TEXT NOT NULL, created_at REAL NOT NULL, schema_version INTEGER NOT NULL, is_tombstone INTEGER NOT NULL, content_hash TEXT NOT NULL, required_asset_ids BLOB NOT NULL, payload BLOB NOT NULL, FOREIGN KEY(item_id) REFERENCES items(item_id));
        CREATE INDEX IF NOT EXISTS revisions_item ON revisions(item_id, created_at);
        CREATE TABLE IF NOT EXISTS outbox(sequence INTEGER PRIMARY KEY AUTOINCREMENT, record_name TEXT NOT NULL UNIQUE, record_type TEXT NOT NULL, item_id TEXT NOT NULL, dependency_rank INTEGER NOT NULL, generation INTEGER NOT NULL DEFAULT 1, attempt_count INTEGER NOT NULL DEFAULT 0, last_error TEXT, created_at REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS inbox(record_name TEXT PRIMARY KEY, change_tag TEXT, received_at REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS quarantine(record_name TEXT PRIMARY KEY, reason TEXT NOT NULL, received_at REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS migration_ledger(source TEXT NOT NULL, source_id TEXT NOT NULL, payload_hash TEXT NOT NULL, item_id TEXT NOT NULL, revision_id TEXT NOT NULL, migrated_at REAL NOT NULL, PRIMARY KEY(source, source_id));
        CREATE TABLE IF NOT EXISTS sync_state(key TEXT PRIMARY KEY, value BLOB NOT NULL, updated_at REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS remote_staging(record_name TEXT PRIMARY KEY, record_type TEXT NOT NULL, payload BLOB NOT NULL, received_at REAL NOT NULL);
        """)
        let outboxColumns = try rows("PRAGMA table_info(outbox)").compactMap { $0["name"]?.string }
        if !outboxColumns.contains("generation") {
            try execute("ALTER TABLE outbox ADD COLUMN generation INTEGER NOT NULL DEFAULT 1")
        }
    }

    private func bind(_ values: [SQLiteValue], to statement: OpaquePointer?) throws {
        let transient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)
        for (offset, value) in values.enumerated() {
            let index = Int32(offset + 1)
            let result: Int32
            switch value {
            case .null: result = sqlite3_bind_null(statement, index)
            case .integer(let item): result = sqlite3_bind_int64(statement, index, item)
            case .double(let item): result = sqlite3_bind_double(statement, index, item)
            case .text(let item): result = sqlite3_bind_text(statement, index, item, -1, transient)
            case .data(let item): result = item.withUnsafeBytes { sqlite3_bind_blob(statement, index, $0.baseAddress, Int32(item.count), transient) }
            }
            guard result == SQLITE_OK else { throw lastError() }
        }
    }

    private func lastError() -> ChronicleRepositoryError {
        .database(database.map { String(cString: sqlite3_errmsg($0)) } ?? "unknown SQLite error")
    }
}

enum SQLiteValue: Equatable {
    case null, integer(Int64), double(Double), text(String), data(Data)
    var string: String? { if case .text(let value) = self { value } else { nil } }
    var int: Int64? { if case .integer(let value) = self { value } else { nil } }
    var blob: Data? { if case .data(let value) = self { value } else { nil } }
    var number: Double? { switch self { case .double(let value): value; case .integer(let value): Double(value); default: nil } }
}
