import SwiftUI

struct ChronicleRootView: View {
    @State private var server = LocalWebServer()
    @State private var showingCompanion: Bool

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
                switch server.state {
                case .idle, .starting:
                    launchState
                case .ready(let url):
                    ChronicleWebView(url: url) { message in
                        server.reportWebFailure(message)
                    }
                case .failed(let message):
                    recoveryState(message: message)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(Color(uiColor: .systemBackground))
        .task { server.start() }
        .sheet(isPresented: $showingCompanion) {
            AppleIntelligenceCompanionView()
                .presentationDetents([.medium, .large])
        }
    }

    private var nativeHeader: some View {
        HStack(spacing: 14) {
            Image(systemName: "book.closed.fill")
                .font(.title3)
                .foregroundStyle(.tint)

            VStack(alignment: .leading, spacing: 1) {
                Text("Chronicle")
                    .font(.headline)
                Text("Local library · Apple Intelligence")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Button {
                showingCompanion = true
            } label: {
                Label("Apple Intelligence", systemImage: "apple.intelligence")
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .accessibilityHint("Opens Chronicle's on-device Apple Intelligence companion")
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 10)
        .background(.regularMaterial)
        .overlay(alignment: .bottom) { Divider() }
    }

    private var launchState: some View {
        VStack(spacing: 18) {
            ProgressView()
                .controlSize(.large)
            Text("Opening your Chronicle…")
                .font(.headline)
            Text("Preparing the library stored inside this iPad application.")
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
}
