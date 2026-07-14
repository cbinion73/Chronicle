import type { ChronicleEntry } from '../types'
import type { DailyScriptureState } from './dailyScripture'

type NativeHandler = { postMessage: (message: unknown) => Promise<unknown> }

function handler(): NativeHandler | undefined {
  return (window as unknown as { webkit?: { messageHandlers?: { chronicleData?: NativeHandler } } }).webkit?.messageHandlers?.chronicleData
}

async function request<T>(operation: string, payload: Record<string, unknown> = {}): Promise<T> {
  const bridge = handler()
  if (!bridge) throw new Error('Chronicle native storage is unavailable')
  return bridge.postMessage({ operation, ...payload }) as Promise<T>
}

function migrationBatches(entries: ChronicleEntry[]): ChronicleEntry[][] {
  const encoder = new TextEncoder()
  const maximumPayloadBytes = 540_000
  const batches: ChronicleEntry[][] = []
  let current: ChronicleEntry[] = []
  let currentBytes = 0
  for (const entry of entries) {
    const bytes = encoder.encode(JSON.stringify(entry)).byteLength + 1
    if (current.length > 0 && currentBytes + bytes > maximumPayloadBytes) {
      batches.push(current)
      current = []
      currentBytes = 0
    }
    current.push(entry)
    currentBytes += bytes
  }
  if (current.length > 0) batches.push(current)
  return batches
}

export const chronicleNativeBridge = {
  isAvailable: () => Boolean(handler()),
  listEntries: () => request<{ entries: ChronicleEntry[] }>('entries.list'),
  createEntry: (entry: ChronicleEntry) => request<{ entry: ChronicleEntry }>('entries.create', { entry }),
  updateEntry: (id: string, patch: Partial<ChronicleEntry>) => request<{ entry: ChronicleEntry }>('entries.update', { id, patch }),
  deleteEntry: (id: string) => request<{ ok: boolean }>('entries.delete', { id }),
  getDailyScripturePreference: () => request<{ preference: DailyScriptureState | null }>('preferences.daily-scripture.get'),
  setDailyScripturePreference: (preference: DailyScriptureState) => request<{ preference: DailyScriptureState }>('preferences.daily-scripture.set', { preference }),
  migrateEntries: async (entries: ChronicleEntry[], experienceMode: 'sample' | 'fresh') => {
    let imported = 0
    for (const batch of migrationBatches(entries)) {
      imported += (await request<{ imported: number }>('entries.migrate', { entries: batch, experienceMode })).imported
    }
    return { imported }
  },
}
