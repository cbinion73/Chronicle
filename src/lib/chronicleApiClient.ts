import type {
  ChronicleEntry,
  PrayerItem,
  FormationRhythm,
  ScriptureBookmark,
  OwnedBook,
  MemoryVerse,
} from '../types'
import { chronicleNativeBridge } from './chronicleNativeBridge'

const BASE = '/api/data'

async function _fetch<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`Chronicle API ${method} ${path} failed: ${res.status}`)
  return res.json()
}

export const chronicleApi = {
  // Chronicle entries
  getEntries: () => chronicleNativeBridge.isAvailable() ? chronicleNativeBridge.listEntries() : _fetch<{ entries: ChronicleEntry[] }>('GET', '/chronicle-entries'),
  createEntry: (entry: ChronicleEntry) => chronicleNativeBridge.isAvailable() ? chronicleNativeBridge.createEntry(entry) : _fetch<{ entry: ChronicleEntry }>('POST', '/chronicle-entries', { entry }),
  updateEntry: (id: string, patch: Partial<ChronicleEntry>) => chronicleNativeBridge.isAvailable() ? chronicleNativeBridge.updateEntry(id, patch) : _fetch<{ entry: ChronicleEntry }>('PUT', `/chronicle-entries/${id}`, { patch }),
  deleteEntry: (id: string) => chronicleNativeBridge.isAvailable() ? chronicleNativeBridge.deleteEntry(id) : _fetch<{ ok: boolean }>('DELETE', `/chronicle-entries/${id}`),

  // Prayer items
  getPrayerItems: () => _fetch<{ items: PrayerItem[] }>('GET', '/prayer-items'),
  createPrayerItem: (item: PrayerItem) => _fetch<{ item: PrayerItem }>('POST', '/prayer-items', { item }),
  updatePrayerItem: (id: string, patch: Partial<PrayerItem>) => _fetch<{ item: PrayerItem }>('PUT', `/prayer-items/${id}`, { patch }),
  deletePrayerItem: (id: string) => _fetch<{ ok: boolean }>('DELETE', `/prayer-items/${id}`),

  // Formation rhythms
  getFormationRhythms: () => _fetch<{ rhythms: FormationRhythm[] }>('GET', '/formation-rhythms'),
  createFormationRhythm: (rhythm: FormationRhythm) => _fetch<{ rhythm: FormationRhythm }>('POST', '/formation-rhythms', { rhythm }),
  updateFormationRhythm: (id: string, patch: Partial<FormationRhythm>) => _fetch<{ rhythm: FormationRhythm }>('PUT', `/formation-rhythms/${id}`, { patch }),
  deleteFormationRhythm: (id: string) => _fetch<{ ok: boolean }>('DELETE', `/formation-rhythms/${id}`),

  // Scripture bookmarks
  getScriptureBookmarks: () => _fetch<{ bookmarks: ScriptureBookmark[] }>('GET', '/scripture-bookmarks'),
  createScriptureBookmark: (bookmark: ScriptureBookmark) => _fetch<{ bookmark: ScriptureBookmark }>('POST', '/scripture-bookmarks', { bookmark }),
  deleteScriptureBookmark: (id: string) => _fetch<{ ok: boolean }>('DELETE', `/scripture-bookmarks/${id}`),

  // Owned books
  getOwnedBooks: () => _fetch<{ books: OwnedBook[] }>('GET', '/owned-books'),
  createOwnedBook: (book: OwnedBook) => _fetch<{ book: OwnedBook }>('POST', '/owned-books', { book }),
  updateOwnedBook: (id: string, patch: Partial<OwnedBook>) => _fetch<{ book: OwnedBook }>('PUT', `/owned-books/${id}`, { patch }),
  deleteOwnedBook: (id: string) => _fetch<{ ok: boolean }>('DELETE', `/owned-books/${id}`),

  // Memory verses (Scripture Memory Engine)
  getMemoryVerses: () => _fetch<{ verses: MemoryVerse[] }>('GET', '/memory-verses'),
  createMemoryVerse: (verse: MemoryVerse) => _fetch<{ verse: MemoryVerse }>('POST', '/memory-verses', { verse }),
  updateMemoryVerse: (id: string, patch: Partial<MemoryVerse>) => _fetch<{ verse: MemoryVerse }>('PUT', `/memory-verses/${id}`, { patch }),
  deleteMemoryVerse: (id: string) => _fetch<{ ok: boolean }>('DELETE', `/memory-verses/${id}`),

  // Settings
  getSettings: () => _fetch<{ settings: Record<string, unknown> }>('GET', '/settings'),
  updateSettings: (patch: Record<string, unknown>) => _fetch<{ settings: Record<string, unknown> }>('PUT', '/settings', { patch }),
}
