import SwiftUI
import WebKit

#if os(iOS)
import UIKit
typealias ChroniclePlatformViewRepresentable = UIViewRepresentable
#else
import AppKit
typealias ChroniclePlatformViewRepresentable = NSViewRepresentable
#endif

struct ChronicleWebView: ChroniclePlatformViewRepresentable {
    let url: URL
    let repository: ChronicleRepository
    let coordinator: ChronicleSyncCoordinator?
    let onFailure: @MainActor (String) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(origin: url, repository: repository, syncCoordinator: coordinator, onFailure: onFailure) }

    private func makeWebView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.userContentController.addScriptMessageHandler(context.coordinator.bridge, contentWorld: .page, name: ChronicleDataBridge.handlerName)
        let webView = WKWebView(frame: .zero, configuration: configuration)
        context.coordinator.bridge.webView = webView
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        #if os(iOS)
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        #endif
        #if DEBUG
        webView.isInspectable = true
        #endif
        webView.load(URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData))
        return webView
    }

    #if os(iOS)
    func makeUIView(context: Context) -> WKWebView { makeWebView(context: context) }
    func updateUIView(_ webView: WKWebView, context: Context) { reloadIfNeeded(webView) }
    #else
    func makeNSView(context: Context) -> WKWebView { makeWebView(context: context) }
    func updateNSView(_ webView: WKWebView, context: Context) { reloadIfNeeded(webView) }
    #endif

    private func reloadIfNeeded(_ webView: WKWebView) { guard webView.url == nil else { return }; webView.load(URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData)) }

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate {
        let bridge: ChronicleDataBridge
        private let origin: URL
        private let onFailure: @MainActor (String) -> Void
        init(origin: URL, repository: ChronicleRepository, syncCoordinator: ChronicleSyncCoordinator?, onFailure: @escaping @MainActor (String) -> Void) {
            self.origin = origin; self.onFailure = onFailure; bridge = ChronicleDataBridge(repository: repository, coordinator: syncCoordinator, origin: origin)
        }
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping @MainActor (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
            let owned = url.scheme == origin.scheme && url.host == origin.host && url.port == origin.port
            if owned { decisionHandler(.allow) }
            else if navigationAction.navigationType == .linkActivated { openExternal(url); decisionHandler(.cancel) }
            else { decisionHandler(.cancel) }
        }
        private func openExternal(_ url: URL) {
            #if os(iOS)
            UIApplication.shared.open(url)
            #else
            NSWorkspace.shared.open(url)
            #endif
        }
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: any Error) { report(error) }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: any Error) { report(error) }
        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { onFailure("Chronicle's web view stopped unexpectedly. Try opening it again.") }
        private func report(_ error: any Error) { guard (error as NSError).code != NSURLErrorCancelled else { return }; onFailure("Chronicle could not load its bundled interface: \(error.localizedDescription)") }
    }
}
