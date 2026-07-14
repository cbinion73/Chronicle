import Foundation
import WebKit

final class ChronicleDataBridge: NSObject, WKScriptMessageHandlerWithReply, @unchecked Sendable {
    static let handlerName = "chronicleData"
    static let maximumRequestBytes = 600_000
    weak var webView: WKWebView?
    private let repository: ChronicleRepository
    private let coordinator: ChronicleSyncCoordinator?
    private let origin: URL
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init(repository: ChronicleRepository, coordinator: ChronicleSyncCoordinator?, origin: URL) {
        self.repository = repository; self.coordinator = coordinator; self.origin = origin
        super.init()
        _ = NotificationCenter.default.addObserver(forName: ChronicleSyncCoordinator.entriesChanged, object: nil, queue: .main) { [weak self] _ in
            Task { @MainActor in
                _ = try? await self?.webView?.evaluateJavaScript("window.dispatchEvent(new CustomEvent('chronicle:native-entries-changed'))")
            }
        }
    }
    @MainActor
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage, replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void) {
        guard message.frameInfo.isMainFrame,
              Self.ownsOrigin(
                scheme: message.frameInfo.securityOrigin.protocol,
                host: message.frameInfo.securityOrigin.host,
                port: message.frameInfo.securityOrigin.port,
                expected: origin
              ),
              JSONSerialization.isValidJSONObject(message.body),
              let data = try? JSONSerialization.data(withJSONObject: message.body), data.count <= Self.maximumRequestBytes,
              let request = try? decoder.decode(Request.self, from: data) else { replyHandler(nil, "Chronicle rejected an invalid native request."); return }
        do {
            let value = try handle(request)
            replyHandler(value, nil)
        } catch { replyHandler(nil, error.localizedDescription) }
    }

    private func handle(_ request: Request) throws -> Any {
        switch request.operation {
        case "entries.list": return try object(["entries": repository.listEntries()])
        case "entries.create":
            guard let entry = request.entry else { throw BridgeError.invalidShape }
            let saved = try repository.create(entry); coordinator?.localChangesCommitted(); return try object(["entry": saved])
        case "entries.update":
            guard let id = request.id, id.count <= 256, let patch = request.patch else { throw BridgeError.invalidShape }
            let saved = try repository.update(id: id, patch: patch); coordinator?.localChangesCommitted(); return try object(["entry": saved])
        case "entries.delete":
            guard let id = request.id, id.count <= 256 else { throw BridgeError.invalidShape }
            try repository.delete(id: id); coordinator?.localChangesCommitted(); return ["ok": true]
        case "entries.migrate":
            guard let entries = request.entries, let mode = request.experienceMode else { throw BridgeError.invalidShape }
            let count = try LegacyEntryMigration(repository: repository).importEntries(entries, experienceMode: mode)
            if count > 0 { coordinator?.localChangesCommitted() }
            return ["imported": count]
        case "sync.status":
            return ["pending": (try? repository.outboxCount()) ?? 0]
        default: throw BridgeError.unsupportedOperation
        }
    }

    private func object<T: Encodable>(_ value: T) throws -> Any { try JSONSerialization.jsonObject(with: encoder.encode(value)) }

    static func ownsOrigin(scheme: String, host: String, port: Int, expected: URL) -> Bool {
        scheme == expected.scheme && host == expected.host && port == expected.port
    }

    private struct Request: Decodable {
        let operation: String
        let id: String?
        let entry: ChronicleEntryRecord?
        let patch: [String: JSONValue]?
        let entries: [ChronicleEntryRecord]?
        let experienceMode: String?
    }
    private enum BridgeError: LocalizedError {
        case invalidShape, unsupportedOperation
        var errorDescription: String? { switch self { case .invalidShape: "Chronicle rejected an invalid entry request."; case .unsupportedOperation: "Chronicle rejected an unsupported native operation." } }
    }
}
