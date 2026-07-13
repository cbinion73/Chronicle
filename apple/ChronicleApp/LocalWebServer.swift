import Foundation
import Network
import Observation

@MainActor
@Observable
final class LocalWebServer {
    nonisolated static let serverPort = NWEndpoint.Port(rawValue: 43_175)!

    enum State: Equatable {
        case idle
        case starting
        case ready(URL)
        case failed(String)
    }

    private(set) var state: State = .idle
    private var listener: NWListener?
    private let queue = DispatchQueue(label: "com.binion.chronicle.local-web-server")

    func start() {
        guard listener == nil else { return }
        guard let webRoot = Bundle.main.resourceURL?.appending(path: "WebApp", directoryHint: .isDirectory),
              FileManager.default.fileExists(atPath: webRoot.appending(path: "index.html").path) else {
            state = .failed("The bundled Chronicle interface is missing.")
            return
        }

        state = .starting

        do {
            let parameters = NWParameters.tcp
            parameters.requiredLocalEndpoint = .hostPort(host: "127.0.0.1", port: .any)
            parameters.acceptLocalOnly = true
            parameters.allowLocalEndpointReuse = true

            let listener = try NWListener(using: parameters, on: Self.serverPort)
            self.listener = listener

            listener.newConnectionHandler = { connection in
                Self.handle(connection: connection, webRoot: webRoot)
            }
            listener.stateUpdateHandler = { [weak self, weak listener] newState in
                Task { @MainActor in
                    guard let self, let listener, listener === self.listener else { return }
                    switch newState {
                    case .ready:
                        guard let port = listener.port else {
                            self.state = .failed("Chronicle's local host did not receive a port.")
                            return
                        }
                        let url = URL(string: "http://127.0.0.1:\(port.rawValue)/")!
                        print("[Chronicle] Bundled interface ready at \(url.absoluteString)")
                        self.state = .ready(url)
                    case .failed(let error):
                        self.state = .failed("Chronicle's local host failed: \(error.localizedDescription)")
                    case .waiting(let error):
                        self.state = .failed("Chronicle's local host is waiting: \(error.localizedDescription)")
                    case .cancelled:
                        self.state = .failed("Chronicle's local host stopped unexpectedly.")
                    default:
                        break
                    }
                }
            }
            listener.start(queue: queue)
        } catch {
            state = .failed("Chronicle's local host could not start: \(error.localizedDescription)")
        }
    }

    func restart() {
        let previous = listener
        listener = nil
        previous?.cancel()
        state = .idle
        start()
    }

    func reportWebFailure(_ message: String) {
        state = .failed(message)
    }

    private nonisolated static func handle(connection: NWConnection, webRoot: URL) {
        connection.start(queue: DispatchQueue.global(qos: .userInitiated))
        receiveRequestHead(connection: connection, webRoot: webRoot, buffer: Data())
    }

    private nonisolated static func receiveRequestHead(connection: NWConnection, webRoot: URL, buffer: Data) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 16_384) { data, _, isComplete, error in
            guard error == nil else {
                connection.cancel()
                return
            }

            var accumulated = buffer
            if let data { accumulated.append(data) }

            guard accumulated.count <= 65_536 else {
                sendText(connection: connection, status: 400, contentType: "text/plain; charset=utf-8", body: "Request headers are too large")
                return
            }

            if accumulated.range(of: Data("\r\n\r\n".utf8)) == nil {
                if isComplete {
                    sendText(connection: connection, status: 400, contentType: "text/plain; charset=utf-8", body: "Incomplete request")
                } else {
                    receiveRequestHead(connection: connection, webRoot: webRoot, buffer: accumulated)
                }
                return
            }

            guard let request = String(data: accumulated, encoding: .utf8),
                  let parsed = parseRequestHead(request) else {
                sendText(connection: connection, status: 400, contentType: "text/plain; charset=utf-8", body: "Bad request")
                return
            }

            let method = parsed.method
            let path = parsed.path

            if path == "/api" || path.hasPrefix("/api/") {
                sendJSON(
                    connection: connection,
                    status: 501,
                    payload: ["error": "This server feature has not yet moved to the native iPad app."],
                    includeBody: method != "HEAD"
                )
                return
            }

            guard method == "GET" || method == "HEAD" else {
                sendJSON(connection: connection, status: 405, payload: ["error": "This local endpoint only serves bundled Chronicle content."])
                return
            }

            let relativePath = path == "/" ? "index.html" : String(path.drop(while: { $0 == "/" }))
            guard !relativePath.split(separator: "/").contains("..") else {
                sendText(connection: connection, status: 400, contentType: "text/plain; charset=utf-8", body: "Bad request", includeBody: method != "HEAD")
                return
            }

            var candidate = webRoot.appending(path: relativePath)
            if !FileManager.default.fileExists(atPath: candidate.path), candidate.pathExtension.isEmpty {
                candidate = webRoot.appending(path: "index.html")
            }

            guard candidate.standardizedFileURL.path.hasPrefix(webRoot.standardizedFileURL.path),
                  let fileData = try? Data(contentsOf: candidate) else {
                sendText(connection: connection, status: 404, contentType: "text/plain; charset=utf-8", body: "Not found", includeBody: method != "HEAD")
                return
            }

            let body = method == "HEAD" ? Data() : fileData
            send(
                connection: connection,
                status: 200,
                contentType: mimeType(for: candidate.pathExtension),
                body: body,
                declaredLength: fileData.count
            )
        }
    }

    nonisolated static func parseRequestHead(_ request: String) -> (method: String, path: String)? {
        let requestLine = request.split(separator: "\r\n", maxSplits: 1).first.map(String.init) ?? ""
        let pieces = requestLine.split(separator: " ")
        guard pieces.count >= 2 else { return nil }

        let rawTarget = String(pieces[1])
        guard rawTarget.hasPrefix("/"),
              hasValidPercentEncoding(rawTarget),
              let components = URLComponents(string: rawTarget),
              let path = components.percentEncodedPath.removingPercentEncoding,
              path.hasPrefix("/") else {
            return nil
        }

        return (String(pieces[0]), path)
    }

    private nonisolated static func hasValidPercentEncoding(_ value: String) -> Bool {
        let bytes = Array(value.utf8)
        var index = 0
        while index < bytes.count {
            guard bytes[index] == 0x25 else {
                index += 1
                continue
            }
            guard index + 2 < bytes.count,
                  isASCIIHexDigit(bytes[index + 1]),
                  isASCIIHexDigit(bytes[index + 2]) else {
                return false
            }
            index += 3
        }
        return true
    }

    private nonisolated static func isASCIIHexDigit(_ byte: UInt8) -> Bool {
        (0x30...0x39).contains(byte) || (0x41...0x46).contains(byte) || (0x61...0x66).contains(byte)
    }

    private nonisolated static func mimeType(for pathExtension: String) -> String {
        switch pathExtension.lowercased() {
        case "html": "text/html; charset=utf-8"
        case "js", "mjs": "text/javascript; charset=utf-8"
        case "css": "text/css; charset=utf-8"
        case "json": "application/json"
        case "svg": "image/svg+xml"
        case "png": "image/png"
        case "jpg", "jpeg": "image/jpeg"
        case "webp": "image/webp"
        case "gif": "image/gif"
        case "woff": "font/woff"
        case "woff2": "font/woff2"
        case "pdf": "application/pdf"
        case "txt": "text/plain; charset=utf-8"
        default: "application/octet-stream"
        }
    }

    private nonisolated static func sendJSON(
        connection: NWConnection,
        status: Int,
        payload: [String: String],
        includeBody: Bool = true
    ) {
        let encoded = (try? JSONSerialization.data(withJSONObject: payload)) ?? Data("{}".utf8)
        send(
            connection: connection,
            status: status,
            contentType: "application/json; charset=utf-8",
            body: includeBody ? encoded : Data(),
            declaredLength: encoded.count
        )
    }

    private nonisolated static func sendText(
        connection: NWConnection,
        status: Int,
        contentType: String,
        body: String,
        includeBody: Bool = true
    ) {
        let data = Data(body.utf8)
        send(connection: connection, status: status, contentType: contentType, body: includeBody ? data : Data(), declaredLength: data.count)
    }

    private nonisolated static func send(
        connection: NWConnection,
        status: Int,
        contentType: String,
        body: Data,
        declaredLength: Int
    ) {
        let reason = switch status {
        case 200: "OK"
        case 400: "Bad Request"
        case 404: "Not Found"
        case 405: "Method Not Allowed"
        case 501: "Not Implemented"
        default: "Error"
        }
        let header = """
        HTTP/1.1 \(status) \(reason)\r
        Content-Type: \(contentType)\r
        Content-Length: \(declaredLength)\r
        Cache-Control: no-cache\r
        Connection: close\r
        X-Content-Type-Options: nosniff\r
        \r

        """
        var response = Data(header.utf8)
        response.append(body)
        connection.send(content: response, completion: .contentProcessed { _ in connection.cancel() })
    }
}
