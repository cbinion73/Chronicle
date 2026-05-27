import type {
  ChronicleEntry,
  PrayerItem,
  FormationRhythm,
  ScriptureBookmark,
  OwnedBook,
} from '../types'

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
  getEntries: () => _fetch<{ entries: ChronicleEntry[] }>('GET', '/chronicle-entries'),
  createEntry: (entry: ChronicleEntry) => _fetch<{ entry: ChronicleEntry }>('POST', '/chronicle-entries', { entry }),
  updateEntry: (id: string, patch: Partial<ChronicleEntry>) => _fetch<{ entry: ChronicleEntry }>('PUT', `/chronicle-entries/${id}`, { patch }),
  deleteEntry: (id: string) => _fetch<{ ok: boolean }>('DELETE', `/chronicle-entries/${id}`),

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

  // Settings
  getSettings: () => _fetch<{ settings: Record<string, unknown> }>('GET', '/settings'),
  updateSettings: (patch: Record<string, unknown>) => _fetch<{ settings: Record<string, unknown> }>('PUT', '/settings', { patch }),
}
