import SwiftUI

@main
struct ChronicleApp: App {
    var body: some Scene {
        WindowGroup {
            ChronicleRootView()
        }
        #if os(macOS)
        .defaultSize(width: 1280, height: 820)
        #endif
    }
}
