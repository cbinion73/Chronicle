import FoundationModels
import Observation
import SwiftUI

@MainActor
@Observable
final class AppleIntelligenceCompanion {
    @ObservationIgnored private let model = SystemLanguageModel.default
    @ObservationIgnored private lazy var session = LanguageModelSession(
        model: model,
        instructions: """
        You are Chronicle's thoughtful Bible-study companion. Be concise, calm, and honest.
        Distinguish Scripture supplied by the user from your interpretation. Never invent a citation,
        quotation, Greek or Hebrew claim, or external source. If the prompt needs source material that
        was not supplied, say what source is needed. You run entirely through Apple Foundation Models.
        """
    )

    var prompt = ""
    var response = ""
    var errorMessage: String?
    var isResponding = false

    init() {
        print("[Chronicle] \(availabilityTitle)")
    }

    var availabilityTitle: String {
        switch availability {
        case .available:
            "Apple Intelligence is ready"
        case .unavailable(.deviceNotEligible):
            "This device is not eligible for Apple Intelligence"
        case .unavailable(.appleIntelligenceNotEnabled):
            "Turn on Apple Intelligence in Settings"
        case .unavailable(.modelNotReady):
            "Apple Intelligence is still preparing"
        case .unavailable:
            "Apple Intelligence is unavailable"
        }
    }

    var canSubmit: Bool {
        availability == .available && !isResponding && !prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var isAvailable: Bool {
        availability == .available
    }

    private(set) var availability = SystemLanguageModel.default.availability

    func refreshAvailability() {
        availability = model.availability
    }

    func submit() async {
        let request = prompt.trimmingCharacters(in: .whitespacesAndNewlines)
        guard model.isAvailable, !request.isEmpty, !isResponding else { return }

        isResponding = true
        errorMessage = nil
        response = ""
        defer { isResponding = false }

        do {
            let result = try await session.respond(to: request)
            response = result.content
        } catch {
            if error is CancellationError { return }
            errorMessage = error.localizedDescription
        }
    }
}

struct AppleIntelligenceCompanionView: View {
    @State private var companion = AppleIntelligenceCompanion()
    @State private var generationTask: Task<Void, Never>?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Label(companion.availabilityTitle, systemImage: companion.isAvailable ? "apple.intelligence" : "info.circle")
                        .foregroundStyle(companion.isAvailable ? .green : .secondary)
                } header: {
                    Text("On-device model")
                } footer: {
                    Text("Chronicle does not send this conversation to an external LLM provider.")
                }

                Section("Ask Chronicle") {
                    TextEditor(text: $companion.prompt)
                        .frame(minHeight: 130)
                        .accessibilityLabel("Message for Chronicle")
                        .disabled(companion.isResponding)

                    Button {
                        generationTask = Task { await companion.submit() }
                    } label: {
                        HStack {
                            if companion.isResponding {
                                ProgressView()
                            }
                            Text(companion.isResponding ? "Reflecting on device…" : "Ask with Apple Intelligence")
                        }
                    }
                    .disabled(!companion.canSubmit)
                }

                if !companion.response.isEmpty {
                    Section("Chronicle") {
                        Text(companion.response)
                            .textSelection(.enabled)
                    }
                }

                if let errorMessage = companion.errorMessage {
                    Section("Unable to respond") {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("Apple Intelligence")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .task {
                while !Task.isCancelled {
                    companion.refreshAvailability()
                    try? await Task.sleep(for: .seconds(2))
                }
            }
            .onDisappear {
                generationTask?.cancel()
                generationTask = nil
            }
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
