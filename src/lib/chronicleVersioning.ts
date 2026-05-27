import type { ChronicleSyncProfile, OwnedBook } from '../types';
import { createDefaultSyncProfile } from './chronicleSync';
import { normalizeOwnedBook } from './chronicleDataModel';
import { DEFAULT_CHRONICLE_VOICE_CONFIG, normalizeVoiceConfig } from './voiceConfig';

export const CHRONICLE_APP_STATE_VERSION = 9;
export const CHRONICLE_SNAPSHOT_SCHEMA_VERSION = 3;
export const CHRONICLE_LIBRARY_RECORD_SCHEMA_VERSION = 1;

type PortableBibleView = {
  book?: string;
  chapter?: number;
  provider?: string;
  overlayOn?: boolean;
  echoesOn?: boolean;
  studyColorsOn?: boolean;
  greekOn?: boolean;
  showThemePanel?: boolean;
  panelMode?: 'themes' | 'echoes' | 'study-colors' | 'greek';
  activeThemeIds?: string[];
};

type PortableAppState = Record<string, unknown> & {
  theme?: string;
  translation?: string;
  bibleView?: PortableBibleView;
  activeStudyModuleId?: string;
  studyModuleDayById?: Record<string, number>;
  activeOwnedBookId?: string;
  chronicleEntries?: unknown[];
  prayerItems?: unknown[];
  formationRhythms?: unknown[];
  scriptureBookmarks?: unknown[];
  ownedBooks?: unknown[];
  syncProfile?: unknown;
  voiceConfig?: unknown;
};

const DEFAULT_BIBLE_VIEW = {
  book: 'Psalms',
  chapter: 23,
  provider: 'offline_nkjv',
  overlayOn: false,
  echoesOn: false,
  studyColorsOn: false,
  greekOn: false,
  showThemePanel: false,
  panelMode: 'themes' as const,
  activeThemeIds: [] as string[],
};

export function migratePortableAppState(
  payload: Record<string, unknown> | undefined | null,
  version: number = CHRONICLE_APP_STATE_VERSION,
): PortableAppState {
  const state = payload && typeof payload === 'object'
    ? { ...(payload as PortableAppState) }
    : {};

  const nextBibleView = state.bibleView && typeof state.bibleView === 'object'
    ? state.bibleView
    : {};

  const nextState: PortableAppState = {
    ...state,
    theme: state.theme === 'dark' ? 'dark' : 'light',
    translation: typeof state.translation === 'string' ? state.translation : 'NKJV',
    bibleView: {
      ...DEFAULT_BIBLE_VIEW,
      ...nextBibleView,
      activeThemeIds: Array.isArray(nextBibleView.activeThemeIds) ? nextBibleView.activeThemeIds : [],
    },
    activeStudyModuleId: typeof state.activeStudyModuleId === 'string' ? state.activeStudyModuleId : 'bible-study',
    studyModuleDayById:
      state.studyModuleDayById && typeof state.studyModuleDayById === 'object'
        ? state.studyModuleDayById
        : { 'bible-study': 1, discipleship: 1 },
    activeOwnedBookId: typeof state.activeOwnedBookId === 'string' ? state.activeOwnedBookId : 'masterlife-book-1',
    chronicleEntries: Array.isArray(state.chronicleEntries) ? state.chronicleEntries : [],
    prayerItems: Array.isArray(state.prayerItems) ? state.prayerItems : [],
    formationRhythms: Array.isArray(state.formationRhythms) ? state.formationRhythms : [],
    scriptureBookmarks: Array.isArray(state.scriptureBookmarks) ? state.scriptureBookmarks : [],
    ownedBooks: Array.isArray(state.ownedBooks) ? state.ownedBooks.map((book) => normalizeOwnedBook(book as OwnedBook)) : [],
    syncProfile:
      state.syncProfile && typeof state.syncProfile === 'object'
        ? {
            ...createDefaultSyncProfile(),
            ...(state.syncProfile as ChronicleSyncProfile),
            cachePolicy: {
              ...createDefaultSyncProfile().cachePolicy,
              ...((state.syncProfile as ChronicleSyncProfile).cachePolicy || {}),
            },
          }
        : createDefaultSyncProfile(),
    voiceConfig: normalizeVoiceConfig(state.voiceConfig || DEFAULT_CHRONICLE_VOICE_CONFIG),
  };

  if (version < 2 && nextState.translation === 'ESV') {
    nextState.translation = 'NKJV';
  }

  return nextState;
}
