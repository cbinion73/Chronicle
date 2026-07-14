import SwiftUI

struct ChronicleRootView: View {
    @State private var server = LocalWebServer()
    @State private var services = ChronicleAppServices()

    var body: some View {
        Group {
            switch services.state {
            case .starting:
                launchState
            case .failed(let message): serviceRecoveryState(message: message)
            case .ready:
                if services.syncStatus.requiresAccountReload { accountRecoveryState }
                else { serverContent }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(platformBackground)
        .task { server.start(); await services.start() }
    }

    @ViewBuilder
    private var serverContent: some View {
        switch server.state {
        case .idle, .starting: launchState
        case .ready(let url):
            if let repository = services.repository {
                ChronicleWebView(url: url, repository: repository, coordinator: services.coordinator) { message in server.reportWebFailure(message) }
            } else { launchState }
        case .failed(let message): recoveryState(message: message)
        }
    }

    private var platformBackground: Color {
        #if os(iOS)
        Color(uiColor: .systemBackground)
        #else
        Color(nsColor: .windowBackgroundColor)
        #endif
    }

    private var launchState: some View {
        VStack(spacing: 18) {
            ProgressView()
                .controlSize(.large)
            Text("Opening your Chronicle…")
                .font(.headline)
            Text("Preparing the library stored on this device.")
                .foregroundStyle(.secondary)
        }
        .padding()
    }

    private func recoveryState(message: String) -> some View {
        ContentUnavailableView {
            Label("Chronicle could not open", systemImage: "exclamationmark.triangle")
        } description: {
            Text(message)
        } actions: {
            Button("Try Again") { server.restart() }
                .buttonStyle(.borderedProminent)
        }
    }

    private func serviceRecoveryState(message: String) -> some View {
        ContentUnavailableView {
            Label("Chronicle storage could not open", systemImage: "externaldrive.badge.exclamationmark")
        } description: { Text(message) } actions: {
            Button("Try Again") { Task { await services.reloadCloudAccount() } }
                .buttonStyle(.borderedProminent)
        }
    }

    private var accountRecoveryState: some View {
        ContentUnavailableView {
            Label("iCloud account changed", systemImage: "person.crop.circle.badge.arrow.trianglehead.counterclockwise")
        } description: {
            Text("Chronicle hid the previous account's library. Open the isolated replica for the current iCloud account to continue.")
        } actions: {
            Button("Open Current iCloud Account") { Task { await services.reloadCloudAccount() } }
                .buttonStyle(.borderedProminent)
        }
    }
}
