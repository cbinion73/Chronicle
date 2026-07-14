import XCTest
@testable import Chronicle

@MainActor
final class ChronicleDataBridgeTests: XCTestCase {
    private let owned = URL(string: "http://127.0.0.1:43175")!

    func testBridgeAcceptsOnlyTheOwnedLoopbackOrigin() {
        XCTAssertTrue(ChronicleDataBridge.ownsOrigin(scheme: "http", host: "127.0.0.1", port: 43_175, expected: owned))
        XCTAssertFalse(ChronicleDataBridge.ownsOrigin(scheme: "https", host: "127.0.0.1", port: 43_175, expected: owned))
        XCTAssertFalse(ChronicleDataBridge.ownsOrigin(scheme: "http", host: "example.com", port: 43_175, expected: owned))
        XCTAssertFalse(ChronicleDataBridge.ownsOrigin(scheme: "http", host: "127.0.0.1", port: 80, expected: owned))
    }

    func testBridgeRequestLimitStaysBelowRevisionEnvelope() {
        XCTAssertEqual(ChronicleDataBridge.maximumRequestBytes, 600_000)
        XCTAssertGreaterThan(ChronicleDataBridge.maximumRequestBytes, ChronicleCloudSchema.maximumRevisionPayloadBytes)
    }
}
