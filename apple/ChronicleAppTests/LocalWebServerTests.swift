import XCTest
@testable import Chronicle

final class LocalWebServerTests: XCTestCase {
    func testUsesStableLoopbackPortForBrowserPersistence() {
        XCTAssertEqual(LocalWebServer.serverPort.rawValue, 43_175)
    }

    func testParsesOriginFormRequestTarget() {
        let request = "GET /bibles/library/nkjv/GEN.1.json?reader=1 HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n"

        let parsed = LocalWebServer.parseRequestHead(request)

        XCTAssertEqual(parsed?.method, "GET")
        XCTAssertEqual(parsed?.path, "/bibles/library/nkjv/GEN.1.json")
    }

    func testDecodesSafePercentEncodedPath() {
        let request = "GET /study-library/My%20Book/index.json HTTP/1.1\r\n\r\n"

        XCTAssertEqual(LocalWebServer.parseRequestHead(request)?.path, "/study-library/My Book/index.json")
    }

    func testRejectsMalformedPercentEncoding() {
        let request = "GET /study-library/%ZZ/index.json HTTP/1.1\r\n\r\n"

        XCTAssertNil(LocalWebServer.parseRequestHead(request))
    }

    func testRejectsAbsoluteRemoteTarget() {
        let request = "GET https://example.com/ HTTP/1.1\r\n\r\n"

        XCTAssertNil(LocalWebServer.parseRequestHead(request))
    }
}
