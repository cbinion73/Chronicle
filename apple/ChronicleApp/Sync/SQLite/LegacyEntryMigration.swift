import Foundation

struct LegacyEntryMigration: Sendable {
    let repository: ChronicleRepository

    func importEntries(_ entries: [ChronicleEntryRecord], experienceMode: String) throws -> Int {
        guard experienceMode == "fresh" else { return 0 }
        var imported = 0
        for entry in entries {
            let before = try repository.historyCount(forLegacyID: entry.id)
            _ = try repository.create(entry, source: "localStorage-v9")
            if before == 0 { imported += 1 }
        }
        return imported
    }
}
