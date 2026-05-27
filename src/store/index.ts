import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Theme,
  NavTab,
  ChronicleEntry,
  PrayerItem,
  OwnedBook,
  OwnedBookStudyState,
  ScriptureBookmark,
  FormationRhythm,
  ChronicleSyncProfile,
  ChronicleVoiceConfig,
  ChronicleWhisperCliConfig,
  ChronicleLocalAIConfig,
  ChroniclePiperConfig,
  ChronicleHomeAssistantVoiceConfig,
  ChronicleLiveKitVoiceConfig,
} from '../types';
import { CHRONICLE_APP_STATE_VERSION, migratePortableAppState } from '../lib/chronicleVersioning';
import { chronicleApi } from '../lib/chronicleApiClient';
import { getRhythmCompletionKey } from '../lib/formationRhythms';
import { normalizeOwnedBook } from '../lib/chronicleDataModel';
import { createDefaultSyncProfile, mergePortableSyncState } from '../lib/chronicleSync';
import { DEFAULT_CHRONICLE_VOICE_CONFIG, normalizeVoiceConfig } from '../lib/voiceConfig';

interface BibleViewState {
  book: string;
  chapter: number;
  provider: string;
  overlayOn: boolean;
  echoesOn: boolean;
  studyColorsOn: boolean;
  greekOn: boolean;
  showThemePanel: boolean;
  panelMode: 'themes' | 'echoes' | 'study-colors' | 'greek';
  activeThemeIds: string[];
}

interface ChronicleVoiceConfigPatch extends Partial<Omit<ChronicleVoiceConfig, 'whisperCli' | 'localAi' | 'piper' | 'homeAssistant' | 'liveKit'>> {
  whisperCli?: Partial<ChronicleWhisperCliConfig>;
  localAi?: Partial<ChronicleLocalAIConfig>;
  piper?: Partial<ChroniclePiperConfig>;
  homeAssistant?: Partial<ChronicleHomeAssistantVoiceConfig>;
  liveKit?: Partial<ChronicleLiveKitVoiceConfig>;
}

interface AppState {
  experienceMode: 'sample' | 'fresh';
  theme: Theme;
  activeTab: NavTab;
  translation: string;
  bibleView: BibleViewState;
  streakDays: number;
  currentPlanName: string;
  currentPlanDay: number;
  currentPlanTotal: number;
  activeStudyModuleId: string;
  studyModuleDayById: Record<string, number>;
  activeOwnedBookId: string;
  chronicleEntries: ChronicleEntry[];
  prayerItems: PrayerItem[];
  formationRhythms: FormationRhythm[];
  scriptureBookmarks: ScriptureBookmark[];
  ownedBooks: OwnedBook[];
  syncProfile: ChronicleSyncProfile;
  voiceConfig: ChronicleVoiceConfig;

  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setActiveTab: (tab: NavTab) => void;
  setTranslation: (t: string) => void;
  setBibleView: (nextView: Partial<BibleViewState>) => void;
  setActiveStudyModule: (moduleId: string) => void;
  setStudyModuleDay: (moduleId: string, day: number) => void;
  advanceStudyModuleDay: (moduleId: string) => void;
  setActiveOwnedBook: (bookId: string) => void;
  upsertOwnedBook: (book: OwnedBook) => void;
  removeOwnedBook: (bookId: string) => void;
  setOwnedBookStudyState: (bookId: string, studyState: OwnedBookStudyState) => void;
  addChronicleEntry: (entry: ChronicleEntry) => void;
  addPrayerItem: (item: PrayerItem) => void;
  completeFormationRhythm: (id: string, completedAt?: string) => void;
  addScriptureBookmark: (bookmark: ScriptureBookmark) => void;
  removeScriptureBookmark: (id: string) => void;
  togglePrayerAnswered: (id: string) => void;
  markPrayerAnswered: (id: string, details?: { summary?: string; passage?: string; dateAnswered?: string }) => void;
  recordPrayerTouch: (id: string, details?: { lastPrayedAt?: string; nextFollowUpAt?: string }) => void;
  updateSyncProfile: (patch: Partial<ChronicleSyncProfile>) => void;
  updateVoiceConfig: (patch: ChronicleVoiceConfigPatch) => void;
  resetPersonalState: () => void;
  importPortableState: (payload: Partial<Pick<AppState,
    | 'experienceMode'
    | 'theme'
    | 'streakDays'
    | 'currentPlanName'
    | 'currentPlanDay'
    | 'currentPlanTotal'
    | 'translation'
    | 'bibleView'
    | 'activeStudyModuleId'
    | 'studyModuleDayById'
    | 'activeOwnedBookId'
    | 'chronicleEntries'
    | 'prayerItems'
    | 'formationRhythms'
    | 'scriptureBookmarks'
    | 'ownedBooks'
    | 'syncProfile'
    | 'voiceConfig'
  >>) => void;
  mergePortableState: (payload: Partial<Pick<AppState,
    | 'experienceMode'
    | 'theme'
    | 'streakDays'
    | 'currentPlanName'
    | 'currentPlanDay'
    | 'currentPlanTotal'
    | 'translation'
    | 'bibleView'
    | 'activeStudyModuleId'
    | 'studyModuleDayById'
    | 'activeOwnedBookId'
    | 'chronicleEntries'
    | 'prayerItems'
    | 'formationRhythms'
    | 'scriptureBookmarks'
    | 'ownedBooks'
    | 'syncProfile'
    | 'voiceConfig'
  >>) => void;
  initializeFromDatabase: () => Promise<void>;
}

const SAMPLE_ENTRIES: ChronicleEntry[] = [
  {
    id: '1',
    date: '2026-04-27',
    type: 'insight',
    title: 'Psalm 23 — the shepherd leads, not drives',
    body: 'Noticed again today: He leads me beside still waters. Not pushes. Not drives. There\'s something about the posture of God in this psalm that I keep returning to. He is gentle with his sheep.',
    passage: 'Psalm 23:2',
    themes: ['Guidance', 'Rest'],
  },
  {
    id: '2',
    date: '2026-04-27',
    type: 'prayer',
    title: 'Morning prayer — giving over the week',
    body: 'Lord, I give you what I can\'t control. The meeting, the decision, the fear underneath both. I trust you with today.',
    autoCapture: true,
  },
  {
    id: '3',
    date: '2026-04-26',
    type: 'study',
    title: 'Grace in John 1 — exegesis notes',
    body: 'The Word became flesh and dwelt among us. The Greek skēnoō — tabernacled. God pitching his tent in our mess.',
    passage: 'John 1:14',
    themes: ['Grace', 'Incarnation'],
  },
  {
    id: '4',
    date: '2026-04-25',
    type: 'reflection',
    title: 'Three days away — returning',
    body: 'Was away from the app for three days. Not away from God — just away from intentionality. Coming back feels like coming home.',
    autoCapture: true,
  },
  {
    id: '5',
    date: '2026-04-21',
    type: 'note',
    title: 'Romans 8:1 — no condemnation',
    body: 'There is therefore now no condemnation. I keep underlining "now." Not eventually. Not after I clean myself up. Now.',
    passage: 'Romans 8:1',
    themes: ['Grace', 'Justification'],
  },
];

const SAMPLE_PRAYERS: PrayerItem[] = [
  { id: 'p1', text: 'Sarah\'s surgery next week — peace and healing', category: 'people', answered: false, dateAdded: '2026-04-20', lastPrayedAt: '2026-05-03', timesPrayed: 4, nextFollowUpAt: '2026-05-06' },
  { id: 'p2', text: 'Wisdom for the team decision at work', category: 'needs', answered: false, dateAdded: '2026-04-25', lastPrayedAt: '2026-05-02', timesPrayed: 3, nextFollowUpAt: '2026-05-05' },
  { id: 'p3', text: 'Mom\'s health — continued strength', category: 'people', answered: false, dateAdded: '2026-04-15', lastPrayedAt: '2026-04-28', timesPrayed: 6, nextFollowUpAt: '2026-05-01' },
  { id: 'p4', text: 'Gratitude for the conversation with Jake', category: 'praise', answered: false, dateAdded: '2026-04-27', lastPrayedAt: '2026-04-30', timesPrayed: 2, nextFollowUpAt: '2026-05-04' },
  { id: 'p5', text: 'Peace in Ukraine', category: 'world', answered: false, dateAdded: '2026-04-01', lastPrayedAt: '2026-04-26', timesPrayed: 8, nextFollowUpAt: '2026-04-30' },
  { id: 'p6', text: 'The financial pressure last month', category: 'needs', answered: true, dateAdded: '2026-03-10', dateAnswered: '2026-04-12', answerSummary: 'The immediate pressure eased after the unexpected contract renewal came through.', answerPassage: 'Philippians 4:19', lastPrayedAt: '2026-04-11', timesPrayed: 7 },
];

const SAMPLE_FORMATION_RHYTHMS: FormationRhythm[] = [
  {
    id: 'daily-scripture-abiding',
    title: 'Daily Scripture Abiding',
    cadence: 'daily',
    focus: 'Receive Scripture slowly before you try to master it.',
    prompt: 'Read the day’s passage slowly, notice one line that stays with you, and answer with one prayer sentence.',
    relatedPassage: 'John 15:4',
    completions: [],
  },
  {
    id: 'daily-acts-prayer',
    title: 'ACTS Prayer',
    cadence: 'daily',
    focus: 'Give prayer a fuller shape than urgency alone.',
    prompt: 'Move through adoration, confession, thanksgiving, and supplication before you move on.',
    relatedPassage: 'Philippians 4:6',
    completions: [],
  },
  {
    id: 'weekly-answered-prayer-review',
    title: 'Answered Prayer Review',
    cadence: 'weekly',
    focus: 'Remember God’s faithfulness on purpose.',
    prompt: 'Review one answered prayer, write what happened, and thank God for the way He met you.',
    relatedPassage: 'Psalm 103:2',
    completions: [],
  },
  {
    id: 'weekly-rule-of-life-checkin',
    title: 'Weekly Rule of Life Check-In',
    cadence: 'weekly',
    focus: 'Notice whether your actual week matched your desired formation posture.',
    prompt: 'Look back over your week and name where attention drifted, where grace met you, and what needs to change.',
    relatedPassage: 'Lamentations 3:40',
    completions: [],
  },
];

const DEFAULT_BIBLE_VIEW: BibleViewState = {
  book: 'Psalms',
  chapter: 23,
  provider: 'offline_nkjv',
  overlayOn: false,
  echoesOn: false,
  studyColorsOn: false,
  greekOn: false,
  showThemePanel: false,
  panelMode: 'themes',
  activeThemeIds: [],
};

const DEFAULT_PLAN_NAME = 'Daily Walk';
const DEFAULT_PLAN_TOTAL = 365;

function createFreshFormationRhythms() {
  return SAMPLE_FORMATION_RHYTHMS.map((rhythm) => ({
    ...rhythm,
    completions: [],
  }));
}

function resetOwnedBookProgress(book: OwnedBook) {
  return normalizeOwnedBook({
    ...book,
    studyState: {
      currentDay: 1,
      bookmarks: [],
      entriesByDay: {},
    },
  });
}

const SAMPLE_OWNED_BOOKS: OwnedBook[] = [
  normalizeOwnedBook({
    id: 'masterlife-book-1',
    title: 'MasterLife 1: The Disciple’s Cross',
    author: 'Avery T. Willis Jr.',
    sourcePath: '/Users/chris/Downloads/Masterlife All Sessions Complete.pdf',
    textPath: '/Users/chris/Desktop/CODE/chronicle/data/ocr/masterlife-sample.txt',
    classification: 'daily-study',
    workflow: 'preserve-daily',
    status: 'ready',
    summary: 'Imported as an existing daily discipleship study and preserved in its original cadence.',
    importedAt: '2026-04-28',
    generatedPlan: {
      title: 'MasterLife Daily Journey',
      totalDays: 120,
      cadence: 'Daily · five source days per week',
      summary: 'Four-book discipleship track covering abiding, character, victory, and mission.',
      phases: [
        { label: "Book 1 · The Disciple's Cross", emphasis: 'Six foundational disciplines.' },
        { label: "Book 2 · The Disciple's Personality", emphasis: 'Spirit-formed character and renewed thinking.' },
        { label: "Book 3 · The Disciple's Victory", emphasis: 'Spiritual warfare, truth, and steadfastness.' },
        { label: "Book 4 · The Disciple's Mission", emphasis: 'Witness, reconciliation, gifts, and mission.' },
      ],
    },
    studyState: {
      currentDay: 1,
      bookmarks: [],
      entriesByDay: {},
    },
  }),
];

function normalizePortableState(payload: Partial<Pick<AppState,
  | 'experienceMode'
  | 'theme'
  | 'streakDays'
  | 'currentPlanName'
  | 'currentPlanDay'
  | 'currentPlanTotal'
  | 'translation'
  | 'bibleView'
  | 'activeStudyModuleId'
  | 'studyModuleDayById'
  | 'activeOwnedBookId'
  | 'chronicleEntries'
  | 'prayerItems'
  | 'formationRhythms'
  | 'scriptureBookmarks'
  | 'ownedBooks'
  | 'syncProfile'
  | 'voiceConfig'
>>) {
  const migrated = migratePortableAppState(payload as Record<string, unknown>, CHRONICLE_APP_STATE_VERSION) as Partial<AppState>;
  const experienceMode: AppState['experienceMode'] = migrated.experienceMode === 'fresh' ? 'fresh' : 'sample';
  const nextTheme: Theme = migrated.theme === 'dark' ? 'dark' : 'light';
  const nextBibleView = migrated.bibleView && typeof migrated.bibleView === 'object'
    ? migrated.bibleView
    : DEFAULT_BIBLE_VIEW;
  const ownedBooks = Array.isArray(migrated.ownedBooks)
    ? (migrated.ownedBooks as OwnedBook[]).map((book) => normalizeOwnedBook(book))
    : experienceMode === 'fresh'
      ? []
      : SAMPLE_OWNED_BOOKS;
  const voiceConfig = normalizeVoiceConfig(migrated.voiceConfig || DEFAULT_CHRONICLE_VOICE_CONFIG);
  const hasActiveOwnedBook = typeof migrated.activeOwnedBookId === 'string' && migrated.activeOwnedBookId.length > 0;
  return {
    experienceMode,
    theme: nextTheme,
    streakDays: typeof migrated.streakDays === 'number' ? migrated.streakDays : experienceMode === 'fresh' ? 0 : 12,
    currentPlanName: typeof migrated.currentPlanName === 'string' && migrated.currentPlanName.trim().length > 0
      ? migrated.currentPlanName
      : DEFAULT_PLAN_NAME,
    currentPlanDay: typeof migrated.currentPlanDay === 'number' ? migrated.currentPlanDay : experienceMode === 'fresh' ? 1 : 23,
    currentPlanTotal: typeof migrated.currentPlanTotal === 'number' ? migrated.currentPlanTotal : DEFAULT_PLAN_TOTAL,
    translation: typeof migrated.translation === 'string' ? migrated.translation : 'NKJV',
    bibleView: {
      ...DEFAULT_BIBLE_VIEW,
      ...nextBibleView,
      activeThemeIds: Array.isArray(nextBibleView.activeThemeIds) ? nextBibleView.activeThemeIds : [],
    },
    activeStudyModuleId: typeof migrated.activeStudyModuleId === 'string' ? migrated.activeStudyModuleId : 'bible-study',
    studyModuleDayById: migrated.studyModuleDayById && typeof migrated.studyModuleDayById === 'object'
      ? migrated.studyModuleDayById
      : { 'bible-study': 1, discipleship: 1 },
    activeOwnedBookId: hasActiveOwnedBook
      ? migrated.activeOwnedBookId as string
      : ownedBooks[0]?.id || '',
    chronicleEntries: Array.isArray(migrated.chronicleEntries)
      ? migrated.chronicleEntries as ChronicleEntry[]
      : experienceMode === 'fresh'
        ? []
        : SAMPLE_ENTRIES,
    prayerItems: Array.isArray(migrated.prayerItems) && migrated.prayerItems.length > 0
      ? (migrated.prayerItems as PrayerItem[]).map((item) =>
          item && typeof item === 'object'
            ? {
                timesPrayed: 0,
                ...item,
              }
            : item
        )
      : experienceMode === 'fresh'
        ? []
        : SAMPLE_PRAYERS,
    formationRhythms: Array.isArray(migrated.formationRhythms)
      ? migrated.formationRhythms as FormationRhythm[]
      : experienceMode === 'fresh'
        ? createFreshFormationRhythms()
        : SAMPLE_FORMATION_RHYTHMS,
    scriptureBookmarks: Array.isArray(migrated.scriptureBookmarks) ? migrated.scriptureBookmarks as ScriptureBookmark[] : [],
    ownedBooks,
    syncProfile: migrated.syncProfile && typeof migrated.syncProfile === 'object'
      ? {
          ...createDefaultSyncProfile(),
          ...(migrated.syncProfile as ChronicleSyncProfile),
          cachePolicy: {
            ...createDefaultSyncProfile().cachePolicy,
            ...((migrated.syncProfile as ChronicleSyncProfile).cachePolicy || {}),
          },
        }
      : createDefaultSyncProfile(),
    voiceConfig,
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      experienceMode: 'sample',
      theme: 'light',
      activeTab: 'today',
      translation: 'NKJV',
      bibleView: DEFAULT_BIBLE_VIEW,
      streakDays: 12,
      currentPlanName: 'Daily Walk',
      currentPlanDay: 23,
      currentPlanTotal: 365,
      activeStudyModuleId: 'bible-study',
      studyModuleDayById: { 'bible-study': 1, discipleship: 1 },
      activeOwnedBookId: 'masterlife-book-1',
      chronicleEntries: SAMPLE_ENTRIES,
      prayerItems: SAMPLE_PRAYERS,
      formationRhythms: SAMPLE_FORMATION_RHYTHMS,
      scriptureBookmarks: [],
      ownedBooks: SAMPLE_OWNED_BOOKS,
      syncProfile: createDefaultSyncProfile(),
      voiceConfig: DEFAULT_CHRONICLE_VOICE_CONFIG,

      setTheme: (theme) => {
        set({ theme });
        document.documentElement.setAttribute('data-theme', theme);
      },
      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light';
        set({ theme: next });
        document.documentElement.setAttribute('data-theme', next);
      },
      setActiveTab: (tab) => set({ activeTab: tab }),
      setTranslation: (translation) => set({ translation }),
      setBibleView: (nextView) =>
        set((state) => ({
          bibleView: {
            ...state.bibleView,
            ...nextView,
          },
        })),
      setActiveStudyModule: (activeStudyModuleId) =>
        set((state) => ({
          activeStudyModuleId: activeStudyModuleId === 'masterlife' ? 'discipleship' : activeStudyModuleId,
          studyModuleDayById:
            activeStudyModuleId === 'masterlife'
              ? {
                  ...state.studyModuleDayById,
                  discipleship: state.studyModuleDayById.discipleship || state.studyModuleDayById.masterlife || 1,
                }
              : state.studyModuleDayById,
        })),
      setStudyModuleDay: (moduleId, day) =>
        set((state) => ({
          studyModuleDayById: {
            ...state.studyModuleDayById,
            [moduleId]: day,
          },
        })),
      advanceStudyModuleDay: (moduleId) =>
        set((state) => ({
          studyModuleDayById: {
            ...state.studyModuleDayById,
            [moduleId]: (state.studyModuleDayById[moduleId] || 1) + 1,
          },
        })),
      setActiveOwnedBook: (activeOwnedBookId) => set({ activeOwnedBookId }),
      upsertOwnedBook: (book) => {
        const normalizedBook = normalizeOwnedBook(book);
        set((state) => {
          const existing = state.ownedBooks.find((entry) => entry.id === normalizedBook.id);
          return {
            ownedBooks: existing
              ? state.ownedBooks.map((entry) => (entry.id === normalizedBook.id ? normalizeOwnedBook({ ...entry, ...normalizedBook }) : entry))
              : [
                {
                    ...normalizedBook,
                    studyState: normalizedBook.studyState || { currentDay: 1, bookmarks: [], entriesByDay: {} },
                  },
                  ...state.ownedBooks,
                ],
          };
        })
        const book2 = get().ownedBooks.find(b => b.id === normalizedBook.id)
        if (book2) chronicleApi.updateOwnedBook(book2.id, book2).catch(e => console.warn('[db] upsertOwnedBook failed:', e))
        else chronicleApi.createOwnedBook(normalizedBook).catch(e => console.warn('[db] createOwnedBook failed:', e))
      },
      removeOwnedBook: (bookId) => {
        set((state) => {
          const nextOwnedBooks = state.ownedBooks.filter((book) => book.id !== bookId);
          return {
            ownedBooks: nextOwnedBooks,
            activeOwnedBookId: state.activeOwnedBookId === bookId ? (nextOwnedBooks[0]?.id || '') : state.activeOwnedBookId,
          };
        })
        chronicleApi.deleteOwnedBook(bookId).catch(e => console.warn('[db] removeOwnedBook failed:', e))
      },
      setOwnedBookStudyState: (bookId, studyState) => {
        set((state) => ({
          ownedBooks: state.ownedBooks.map((book) =>
            book.id === bookId
              ? normalizeOwnedBook({
                  ...book,
                  studyState,
                })
              : book
          ),
        }))
        const updated = get().ownedBooks.find(b => b.id === bookId)
        if (updated) chronicleApi.updateOwnedBook(bookId, { studyState: updated.studyState }).catch(e => console.warn('[db] setOwnedBookStudyState failed:', e))
      },
      addChronicleEntry: (entry) => {
        set((state) => ({ chronicleEntries: [entry, ...state.chronicleEntries] }))
        chronicleApi.createEntry(entry).catch(e => console.warn('[db] addChronicleEntry failed:', e))
      },
      addPrayerItem: (item) => {
        set((state) => ({ prayerItems: [item, ...state.prayerItems] }))
        chronicleApi.createPrayerItem(item).catch(e => console.warn('[db] addPrayerItem failed:', e))
      },
      completeFormationRhythm: (id, completedAt) => {
        set((state) => ({
          formationRhythms: state.formationRhythms.map((rhythm) => {
            if (rhythm.id !== id) return rhythm;
            const key = completedAt || getRhythmCompletionKey(rhythm);
            return rhythm.completions.includes(key)
              ? rhythm
              : {
                  ...rhythm,
                  completions: [key, ...rhythm.completions].slice(0, 60),
                };
          }),
        }))
        const updated = get().formationRhythms.find(r => r.id === id)
        if (updated) chronicleApi.updateFormationRhythm(id, { completions: updated.completions }).catch(e => console.warn('[db] completeFormationRhythm failed:', e))
      },
      addScriptureBookmark: (bookmark) => {
        set((state) => ({
          scriptureBookmarks: [bookmark, ...state.scriptureBookmarks.filter((entry) => entry.id !== bookmark.id)],
        }))
        chronicleApi.createScriptureBookmark(bookmark).catch(e => console.warn('[db] addScriptureBookmark failed:', e))
      },
      removeScriptureBookmark: (id) => {
        set((state) => ({
          scriptureBookmarks: state.scriptureBookmarks.filter((bookmark) => bookmark.id !== id),
        }))
        chronicleApi.deleteScriptureBookmark(id).catch(e => console.warn('[db] removeScriptureBookmark failed:', e))
      },
      togglePrayerAnswered: (id) => {
        set((state) => ({
          prayerItems: state.prayerItems.map((p) =>
            p.id === id
              ? {
                  ...p,
                  answered: !p.answered,
                  dateAnswered: !p.answered ? new Date().toISOString().split('T')[0] : undefined,
                }
              : p
          ),
        }))
        const updated = get().prayerItems.find(p => p.id === id)
        if (updated) chronicleApi.updatePrayerItem(id, { answered: updated.answered, dateAnswered: updated.dateAnswered }).catch(e => console.warn('[db] togglePrayerAnswered failed:', e))
      },
      markPrayerAnswered: (id, details) => {
        set((state) => ({
          prayerItems: state.prayerItems.map((p) =>
            p.id === id
              ? {
                  ...p,
                  answered: true,
                  dateAnswered: details?.dateAnswered || new Date().toISOString().split('T')[0],
                  answerSummary: details?.summary?.trim() || p.answerSummary,
                  answerPassage: details?.passage?.trim() || p.answerPassage,
                }
              : p
          ),
        }))
        const updated = get().prayerItems.find(p => p.id === id)
        if (updated) chronicleApi.updatePrayerItem(id, { answered: updated.answered, dateAnswered: updated.dateAnswered, answerSummary: updated.answerSummary, answerPassage: updated.answerPassage }).catch(e => console.warn('[db] markPrayerAnswered failed:', e))
      },
      recordPrayerTouch: (id, details) => {
        set((state) => ({
          prayerItems: state.prayerItems.map((p) =>
            p.id === id
              ? {
                  ...p,
                  lastPrayedAt: details?.lastPrayedAt || new Date().toISOString().split('T')[0],
                  nextFollowUpAt: details?.nextFollowUpAt || p.nextFollowUpAt,
                  timesPrayed: (p.timesPrayed || 0) + 1,
                }
              : p
          ),
        }))
        const updated = get().prayerItems.find(p => p.id === id)
        if (updated) chronicleApi.updatePrayerItem(id, { lastPrayedAt: updated.lastPrayedAt, timesPrayed: updated.timesPrayed, nextFollowUpAt: updated.nextFollowUpAt }).catch(e => console.warn('[db] recordPrayerTouch failed:', e))
      },
      updateSyncProfile: (patch) =>
        set((state) => ({
          syncProfile: {
            ...state.syncProfile,
            ...patch,
            cachePolicy: {
              ...state.syncProfile.cachePolicy,
              ...(patch.cachePolicy || {}),
            },
          },
        })),
      updateVoiceConfig: (patch) =>
        set((state) => ({
          voiceConfig: normalizeVoiceConfig({
            ...state.voiceConfig,
            ...patch,
            whisperCli: {
              ...state.voiceConfig.whisperCli,
              ...(patch.whisperCli || {}),
            },
            localAi: {
              ...state.voiceConfig.localAi,
              ...(patch.localAi || {}),
            },
            piper: {
              ...state.voiceConfig.piper,
              ...(patch.piper || {}),
            },
            homeAssistant: {
              ...state.voiceConfig.homeAssistant,
              ...(patch.homeAssistant || {}),
            },
            liveKit: {
              ...state.voiceConfig.liveKit,
              ...(patch.liveKit || {}),
            },
          }),
        })),
      resetPersonalState: () =>
        set((state) => ({
          experienceMode: 'fresh',
          activeTab: 'today',
          streakDays: 0,
          currentPlanName: DEFAULT_PLAN_NAME,
          currentPlanDay: 1,
          currentPlanTotal: DEFAULT_PLAN_TOTAL,
          activeStudyModuleId: 'bible-study',
          studyModuleDayById: { 'bible-study': 1, discipleship: 1 },
          activeOwnedBookId: state.ownedBooks[0]?.id || '',
          chronicleEntries: [],
          prayerItems: [],
          formationRhythms: createFreshFormationRhythms(),
          scriptureBookmarks: [],
          ownedBooks: state.ownedBooks.map((book) => resetOwnedBookProgress(book)),
        })),
      importPortableState: (payload) => {
        const normalized = normalizePortableState(payload);
        set(normalized);
        document.documentElement.setAttribute('data-theme', normalized.theme);
      },
      mergePortableState: (payload) =>
        set((state) => {
          const localPortableState = {
            experienceMode: state.experienceMode,
            theme: state.theme,
            streakDays: state.streakDays,
            currentPlanName: state.currentPlanName,
            currentPlanDay: state.currentPlanDay,
            currentPlanTotal: state.currentPlanTotal,
            translation: state.translation,
            bibleView: state.bibleView,
            activeStudyModuleId: state.activeStudyModuleId,
            studyModuleDayById: state.studyModuleDayById,
            activeOwnedBookId: state.activeOwnedBookId,
            chronicleEntries: state.chronicleEntries,
            prayerItems: state.prayerItems,
            formationRhythms: state.formationRhythms,
            scriptureBookmarks: state.scriptureBookmarks,
            ownedBooks: state.ownedBooks,
            syncProfile: state.syncProfile,
            voiceConfig: state.voiceConfig,
          };
          const merged = mergePortableSyncState(localPortableState, normalizePortableState(payload) as never) as Partial<AppState>;
          if (merged.theme) {
            document.documentElement.setAttribute('data-theme', merged.theme);
          }
          return merged as AppState;
        }),
      initializeFromDatabase: async () => {
        try {
          const [entriesRes, prayersRes, rhythmsRes, bookmarksRes, booksRes] = await Promise.all([
            chronicleApi.getEntries(),
            chronicleApi.getPrayerItems(),
            chronicleApi.getFormationRhythms(),
            chronicleApi.getScriptureBookmarks(),
            chronicleApi.getOwnedBooks(),
          ])
          set({
            chronicleEntries: entriesRes.entries ?? [],
            prayerItems: prayersRes.items ?? [],
            formationRhythms: rhythmsRes.rhythms ?? [],
            scriptureBookmarks: bookmarksRes.bookmarks ?? [],
            ownedBooks: booksRes.books ?? [],
            experienceMode: 'fresh',
          })
        } catch (e) {
          console.warn('[chronicle-db] initializeFromDatabase failed, keeping local state:', e)
        }
      },
    }),
    {
      name: 'chronicle-app-state',
      version: CHRONICLE_APP_STATE_VERSION,
      migrate: (persistedState: unknown, version) => {
        const state = persistedState && typeof persistedState === 'object'
          ? persistedState as Record<string, unknown>
          : {};
        return normalizePortableState(migratePortableAppState(state, version) as never);
      },
      partialize: (state) => ({
        experienceMode: state.experienceMode,
        theme: state.theme,
        streakDays: state.streakDays,
        currentPlanName: state.currentPlanName,
        currentPlanDay: state.currentPlanDay,
        currentPlanTotal: state.currentPlanTotal,
        translation: state.translation,
        bibleView: state.bibleView,
        activeStudyModuleId: state.activeStudyModuleId,
        studyModuleDayById: state.studyModuleDayById,
        activeOwnedBookId: state.activeOwnedBookId,
        chronicleEntries: state.chronicleEntries,
        prayerItems: state.prayerItems,
        formationRhythms: state.formationRhythms,
        scriptureBookmarks: state.scriptureBookmarks,
        ownedBooks: state.ownedBooks,
        syncProfile: state.syncProfile,
        voiceConfig: state.voiceConfig,
      }),
    }
  )
);
