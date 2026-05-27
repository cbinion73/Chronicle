import type {
  ChronicleEntry,
  ChronicleSyncProfile,
  FormationRhythm,
  OwnedBook,
  OwnedBookBookmark,
  OwnedBookStudyDayEntry,
  PrayerItem,
  ScriptureBookmark,
} from '../types';
import { normalizeOwnedBook } from './chronicleDataModel';

export const CHRONICLE_SYNC_MODEL_VERSION = 1;

export type PortableSyncState = {
  theme?: string;
  translation?: string;
  bibleView?: object;
  activeStudyModuleId?: string;
  studyModuleDayById?: Record<string, number>;
  activeOwnedBookId?: string;
  chronicleEntries?: ChronicleEntry[];
  prayerItems?: PrayerItem[];
  formationRhythms?: FormationRhythm[];
  scriptureBookmarks?: ScriptureBookmark[];
  ownedBooks?: OwnedBook[];
  syncProfile?: ChronicleSyncProfile;
};

function latestIso(left?: string, right?: string) {
  if (!left) return right;
  if (!right) return left;
  return new Date(left).getTime() >= new Date(right).getTime() ? left : right;
}

function mergeChronicleEntries(local: ChronicleEntry[] = [], incoming: ChronicleEntry[] = []) {
  const merged = new Map<string, ChronicleEntry>();
  for (const entry of [...local, ...incoming]) {
    const existing = merged.get(entry.id);
    if (!existing) {
      merged.set(entry.id, entry);
      continue;
    }
    merged.set(entry.id, new Date(existing.date).getTime() >= new Date(entry.date).getTime()
      ? { ...entry, ...existing }
      : { ...existing, ...entry });
  }
  return Array.from(merged.values()).sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
}

function mergePrayerItems(local: PrayerItem[] = [], incoming: PrayerItem[] = []) {
  const merged = new Map<string, PrayerItem>();
  for (const item of [...local, ...incoming]) {
    const existing = merged.get(item.id);
    if (!existing) {
      merged.set(item.id, item);
      continue;
    }
    merged.set(item.id, {
      ...existing,
      ...item,
      answered: existing.answered || item.answered,
      dateAnswered: latestIso(existing.dateAnswered, item.dateAnswered),
      lastPrayedAt: latestIso(existing.lastPrayedAt, item.lastPrayedAt),
      nextFollowUpAt: latestIso(existing.nextFollowUpAt, item.nextFollowUpAt),
      timesPrayed: Math.max(existing.timesPrayed || 0, item.timesPrayed || 0),
      answerSummary: item.answerSummary || existing.answerSummary,
      answerPassage: item.answerPassage || existing.answerPassage,
    });
  }
  return Array.from(merged.values()).sort((left, right) => new Date(right.dateAdded).getTime() - new Date(left.dateAdded).getTime());
}

function mergeRhythms(local: FormationRhythm[] = [], incoming: FormationRhythm[] = []) {
  const merged = new Map<string, FormationRhythm>();
  for (const rhythm of [...local, ...incoming]) {
    const existing = merged.get(rhythm.id);
    if (!existing) {
      merged.set(rhythm.id, rhythm);
      continue;
    }
    merged.set(rhythm.id, {
      ...existing,
      ...rhythm,
      completions: Array.from(new Set([...(existing.completions || []), ...(rhythm.completions || [])])).sort().reverse().slice(0, 120),
    });
  }
  return Array.from(merged.values());
}

function bookmarkKey(bookmark: ScriptureBookmark | OwnedBookBookmark) {
  return `${bookmark.id}|${bookmark.label}|${'passage' in bookmark ? bookmark.passage : bookmark.day}`;
}

function mergeScriptureBookmarks(local: ScriptureBookmark[] = [], incoming: ScriptureBookmark[] = []) {
  const seen = new Map<string, ScriptureBookmark>();
  for (const bookmark of [...local, ...incoming]) {
    seen.set(bookmarkKey(bookmark), bookmark);
  }
  return Array.from(seen.values()).sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function mergeOwnedBookmarks(local: OwnedBookBookmark[] = [], incoming: OwnedBookBookmark[] = []) {
  const seen = new Map<string, OwnedBookBookmark>();
  for (const bookmark of [...local, ...incoming]) {
    seen.set(bookmarkKey(bookmark), bookmark);
  }
  return Array.from(seen.values()).sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function mergeDayEntry(local?: OwnedBookStudyDayEntry, incoming?: OwnedBookStudyDayEntry) {
  if (!local) return incoming;
  if (!incoming) return local;
  const localUpdated = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
  const incomingUpdated = incoming.updatedAt ? new Date(incoming.updatedAt).getTime() : 0;
  const newer = incomingUpdated >= localUpdated ? incoming : local;
  const older = newer === incoming ? local : incoming;
  return {
    ...older,
    ...newer,
    answerIdsByField: {
      ...(older.answerIdsByField || {}),
      ...(newer.answerIdsByField || {}),
    },
    updatedAt: latestIso(local.updatedAt, incoming.updatedAt),
  };
}

function mergeOwnedBooks(local: OwnedBook[] = [], incoming: OwnedBook[] = []) {
  const merged = new Map<string, OwnedBook>();
  for (const rawBook of [...local, ...incoming]) {
    const book = normalizeOwnedBook(rawBook);
    const existing = merged.get(book.id);
    if (!existing) {
      merged.set(book.id, book);
      continue;
    }
    const mergedEntriesByDay: Record<string, OwnedBookStudyDayEntry> = {};
    const dayKeys = new Set([
      ...Object.keys(existing.studyState?.entriesByDay || {}),
      ...Object.keys(book.studyState?.entriesByDay || {}),
    ]);
    for (const key of dayKeys) {
      const mergedEntry =
        mergeDayEntry(existing.studyState?.entriesByDay?.[key], book.studyState?.entriesByDay?.[key])
        || existing.studyState?.entriesByDay?.[key]
        || book.studyState?.entriesByDay?.[key];
      if (mergedEntry) mergedEntriesByDay[key] = mergedEntry;
    }

    merged.set(book.id, normalizeOwnedBook({
      ...existing,
      ...book,
      summary: book.summary || existing.summary,
      importedAt: latestIso(existing.importedAt, book.importedAt) || existing.importedAt,
      generatedPlan: book.generatedPlan?.days?.length ? book.generatedPlan : existing.generatedPlan,
      assets: {
        source: book.assets?.source || existing.assets?.source,
        managed: Array.from(new Map([...(existing.assets?.managed || []), ...(book.assets?.managed || [])].map((asset) => [asset.id, asset])).values()),
      },
      studyState: {
        currentDay: Math.max(existing.studyState?.currentDay || 1, book.studyState?.currentDay || 1),
        bookmarks: mergeOwnedBookmarks(existing.studyState?.bookmarks || [], book.studyState?.bookmarks || []),
        entriesByDay: mergedEntriesByDay,
      },
    }));
  }
  return Array.from(merged.values());
}

export function createDefaultSyncProfile(): ChronicleSyncProfile {
  return {
    deviceId: `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    deviceLabel: 'Chronicle Desktop',
    platform: 'desktop',
    modelVersion: CHRONICLE_SYNC_MODEL_VERSION,
    cachePolicy: {
      bibleLibrary: 'eager',
      themeAnalysis: 'eager',
      importedBooks: 'selected-books',
    },
  };
}

export function mergePortableSyncState(local: PortableSyncState, incoming: PortableSyncState): PortableSyncState {
  return {
    ...local,
    ...incoming,
    theme: local.theme || incoming.theme,
    translation: local.translation || incoming.translation,
    bibleView: { ...(incoming.bibleView || {}), ...(local.bibleView || {}) },
    activeStudyModuleId: local.activeStudyModuleId || incoming.activeStudyModuleId,
    studyModuleDayById: {
      ...(incoming.studyModuleDayById || {}),
      ...(local.studyModuleDayById || {}),
    },
    activeOwnedBookId: local.activeOwnedBookId || incoming.activeOwnedBookId,
    chronicleEntries: mergeChronicleEntries(local.chronicleEntries, incoming.chronicleEntries),
    prayerItems: mergePrayerItems(local.prayerItems, incoming.prayerItems),
    formationRhythms: mergeRhythms(local.formationRhythms, incoming.formationRhythms),
    scriptureBookmarks: mergeScriptureBookmarks(local.scriptureBookmarks, incoming.scriptureBookmarks),
    ownedBooks: mergeOwnedBooks(local.ownedBooks, incoming.ownedBooks),
    syncProfile: {
      ...(incoming.syncProfile || createDefaultSyncProfile()),
      ...(local.syncProfile || {}),
      modelVersion: CHRONICLE_SYNC_MODEL_VERSION,
      lastMergedAt: new Date().toISOString(),
      lastSnapshotAt: latestIso(local.syncProfile?.lastSnapshotAt, incoming.syncProfile?.lastSnapshotAt),
      cachePolicy: {
        ...(incoming.syncProfile?.cachePolicy || createDefaultSyncProfile().cachePolicy),
        ...(local.syncProfile?.cachePolicy || {}),
      },
    },
  };
}
