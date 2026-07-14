import SwiftUI

struct ChronicleRootView: View {
    @State private var server = LocalWebServer()
    @State private var services = ChronicleAppServices()
    @State private var showingCompanion: Bool
    #if os(iOS)
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    #endif

    init() {
        #if DEBUG
        _showingCompanion = State(
            initialValue: ProcessInfo.processInfo.environment["CHRONICLE_OPEN_COMPANION"] == "1"
        )
        #else
        _showingCompanion = State(initialValue: false)
        #endif
    }

    var body: some View {
        VStack(spacing: 0) {
            nativeHeader

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
        }
        .background(platformBackground)
        .task { server.start(); await services.start() }
        .sheet(isPresented: $showingCompanion) {
            AppleIntelligenceCompanionView()
                #if os(iOS)
                .presentationDetents([.medium, .large])
                #endif
        }
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

    private var nativeHeader: some View {
        HStack(spacing: compactHeader ? 10 : 14) {
            Image(systemName: "book.closed.fill")
                .font(compactHeader ? .body : .title3)
                .foregroundStyle(.tint)
                .frame(width: compactHeader ? 24 : nil)

            VStack(alignment: .leading, spacing: 1) {
                Text("Chronicle")
                    .font(.headline)
                    .lineLimit(1)
                Text(services.syncStatus.title)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .truncationMode(.tail)
                    .accessibilityLabel("iCloud status")
                    .accessibilityValue(services.syncStatus.title)
            }
            .layoutPriority(1)

            Spacer()

            companionButton
        }
        .padding(.horizontal, compactHeader ? 12 : 18)
        .padding(.vertical, compactHeader ? 6 : 10)
        .frame(minHeight: compactHeader ? 52 : nil)
        .background(.regularMaterial)
        .overlay(alignment: .bottom) { Divider() }
    }

    @ViewBuilder
    private var companionButton: some View {
        if compactHeader {
            Button {
                showingCompanion = true
            } label: {
                Label("AI", systemImage: "apple.intelligence")
                    .font(.caption.weight(.semibold))
                    .lineLimit(1)
                    .fixedSize()
                    .frame(minWidth: 44, minHeight: 44)
            }
            .buttonStyle(.bordered)
            .buttonBorderShape(.capsule)
            .layoutPriority(2)
            .accessibilityLabel("Apple Intelligence")
            .accessibilityHint("Opens Chronicle's on-device Apple Intelligence companion")
        } else {
            Button {
                showingCompanion = true
            } label: {
                Label("Apple Intelligence", systemImage: "apple.intelligence")
                    .lineLimit(1)
                    .fixedSize()
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .layoutPriority(2)
            .accessibilityHint("Opens Chronicle's on-device Apple Intelligence companion")
        }
    }

    private var compactHeader: Bool {
        #if os(iOS)
        horizontalSizeClass == .compact
        #else
        false
        #endif
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
