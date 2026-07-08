export type Theme = 'light' | 'dark';

export type NavTab =
  | 'today'
  | 'bible'
  | 'study'
  | 'discipleship'
  | 'prayer'
  | 'thread'
  | 'memory'
  | 'explore'
  | 'rule'
  | 'questions'
  | 'heritage'
  | 'chronicle'
  | 'themes'
  | 'plans'
  | 'legacy'
  | 'insights'
  | 'settings';

export interface ChronicleEntrySourceContext {
  page: NavTab;
  passage?: string;
  studyModuleId?: string;
  currentDay?: number;
  ownedBookId?: string;
  readerView?: 'study' | 'workbook';
  bibleView?: {
    book: string;
    chapter: number;
    overlayOn?: boolean;
    echoesOn?: boolean;
    studyColorsOn?: boolean;
    greekOn?: boolean;
    showThemePanel?: boolean;
    panelMode?: 'themes' | 'echoes' | 'study-colors' | 'greek';
  };
  // A saved Study Council convening — the full typed-and-tagged seat
  // responses, so a session can be reopened later and re-rendered exactly
  // (not just its plain-text summary in `body`).
  studyCouncil?: {
    question?: string;
    seats: Array<{
      id: string;
      name: string;
      paragraphs: Array<{ tag: string | null; confidence: string | null; text: string }>;
    }>;
  };
  // A Growth Marker's curated kind (baptism, calling clarified, etc.) — see
  // src/data/growthMarkers.ts for the id list this is drawn from.
  growthMarker?: {
    kind: string;
  };
  // A Rule of Life commitment's curated category — see
  // src/data/ruleCategories.ts for the id list this is drawn from.
  rule?: {
    category: string;
  };
  // A Sealed Prayer — written now, meant to stay unread until a future
  // date or event. `body` holds the prayer text as always, but UI surfaces
  // (Chronicle.tsx's EntryCard, SealedPrayers.tsx) must not render it while
  // !opened. See docs/SEALED_TIER.md — today this is UI-level withholding
  // only, not encryption.
  sealed?: {
    unsealAt?: string;
    eventLabel?: string;
    sealedAt: string;
    opened: boolean;
    openedAt?: string;
  };
  // The Question Lab — an open question held with dignity, possibly for
  // years. Resolution is a ceremony (QuestionResolutionCeremony.tsx) and
  // is rendered as a stone, not a second entry.
  question?: {
    status: 'open' | 'resolved';
    resolvedAt?: string;
    resolution?: string;
  };
  // A lament, kept to its Psalm-shaped structure — complaint, petition,
  // trust — rather than flattened into a single blob. `body` still holds
  // the whole prayer, concatenated, for search/export.
  lament?: {
    complaint: string;
    petition: string;
    trust: string;
  };
  // The Oral History (M19) — a stone captured about someone else, not the
  // keeper's own life. `hadAudio` only discloses that a voice recording
  // was used during capture to help the interviewer write it down; the
  // audio itself is never persisted server-side (see src/lib/oralHistoryVoice.ts).
  heritage?: {
    subjectName: string;
    relationship: string;
    hadAudio?: boolean;
  };
}

export interface ChronicleEntry {
  id: string;
  date: string;
  type: 'insight' | 'prayer' | 'study' | 'note' | 'reflection' | 'growth' | 'rule' | 'sealed' | 'question' | 'heritage';
  title: string;
  body: string;
  passage?: string;
  themes?: string[];
  autoCapture?: boolean;
  sourceContext?: ChronicleEntrySourceContext;
}

export interface PrayerItem {
  id: string;
  text: string;
  category: 'people' | 'needs' | 'praise' | 'world';
  answered: boolean;
  dateAdded: string;
  dateAnswered?: string;
  answerSummary?: string;
  answerPassage?: string;
  lastPrayedAt?: string;
  timesPrayed?: number;
  nextFollowUpAt?: string;
}

export interface ReflectionPromptCard {
  id: string;
  label: string;
  prompt: string;
  followThrough: string;
}

export interface FormationRhythm {
  id: string;
  title: string;
  cadence: 'daily' | 'weekly';
  focus: string;
  prompt: string;
  relatedPassage?: string;
  completions: string[];
}

export interface ChronicleDeviceCachePolicy {
  bibleLibrary: 'eager' | 'on-demand';
  themeAnalysis: 'eager' | 'on-demand';
  importedBooks: 'on-demand' | 'selected-books';
}

export interface ChronicleSyncProfile {
  deviceId: string;
  deviceLabel: string;
  platform: 'desktop' | 'tablet' | 'phone' | 'unknown';
  modelVersion: number;
  cachePolicy: ChronicleDeviceCachePolicy;
  lastSnapshotAt?: string;
  lastMergedAt?: string;
}

export type ChronicleVoiceTranscriptionProvider = 'whisper-cli' | 'localai-openai';
export type ChronicleVoiceSynthesisProvider = 'piper-cli' | 'home-assistant-tts';
export type ChronicleVoiceRealtimeProvider = 'none' | 'livekit';
export type ChronicleVoiceAutomationProvider = 'none' | 'home-assistant';

export interface ChronicleWhisperCliConfig {
  command: string;
  model: string;
  language: string;
  translateToEnglish: boolean;
  initialPrompt: string;
}

export interface ChronicleLocalAIConfig {
  baseUrl: string;
  whisperModel: string;
  apiKey?: string;
}

export interface ChroniclePiperConfig {
  command: string;
  modelPath: string;
  speaker: number;
}

export interface ChronicleHomeAssistantVoiceConfig {
  baseUrl: string;
  conversationAgentId: string;
  ttsEntityId: string;
  mediaPlayerEntityId: string;
  preferredLanguage: string;
}

export interface ChronicleLiveKitVoiceConfig {
  url: string;
  roomName: string;
  participantName: string;
  agentName: string;
  tokenTtlMinutes: number;
}

export interface ChronicleVoiceConfig {
  enabled: boolean;
  autoSpeakResponses: boolean;
  saveVoiceTranscriptsToChronicle: boolean;
  transcriptionProvider: ChronicleVoiceTranscriptionProvider;
  synthesisProvider: ChronicleVoiceSynthesisProvider;
  realtimeProvider: ChronicleVoiceRealtimeProvider;
  automationProvider: ChronicleVoiceAutomationProvider;
  whisperCli: ChronicleWhisperCliConfig;
  localAi: ChronicleLocalAIConfig;
  piper: ChroniclePiperConfig;
  homeAssistant: ChronicleHomeAssistantVoiceConfig;
  liveKit: ChronicleLiveKitVoiceConfig;
}

export interface ScriptureBookmark {
  id: string;
  label: string;
  passage: string;
  book: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
  createdAt: string;
}

// Scripture Memory Engine — verses scheduled with an SM-2-family spaced
// repetition algorithm (see src/lib/memoryEngine.ts).
export interface MemoryVerse {
  id: string;
  reference: string;
  text: string;
  translation: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  dueDate: string; // YYYY-MM-DD
  lastReviewedAt?: string;
  totalReviews: number;
  totalLapses: number;
  addedAt: string;
}

// Patina (VISION.md, Ring 2) — a distinct-day visit log per chapter, kept
// local-only (not DB-synced) for this first version; see REDESIGN.md
// Milestone 16 for the scope note. One entry per book+chapter+day.
export interface BibleVisit {
  book: string;
  chapter: number;
  date: string; // YYYY-MM-DD
}

export interface OwnedBookPlanPhase {
  label: string;
  emphasis: string;
}

export interface OwnedBookPageSlice {
  id?: string;
  pageNumber: number;
  startY?: number;
  endY?: number;
  label?: string;
}

export interface OwnedBookSourceDiagnostics {
  sourceHealth: 'high' | 'medium' | 'low';
  totalDays: number;
  mappedDayCount: number;
  mappedSliceCount: number;
  warningCount: number;
  warnings: string[];
}

export type OwnedBookSourceStructure =
  | 'devotional'
  | 'question-driven'
  | 'workbook'
  | 'teaching'
  | 'narrative'
  | 'mixed';

export interface OwnedBookDaySourceDiagnostics {
  sourceHealth: 'high' | 'medium' | 'low';
  structure: OwnedBookSourceStructure;
  cueCount: number;
  questionCount: number;
  scriptureReferenceCount: number;
  checklistOptionCount: number;
  warnings: string[];
}

export interface OwnedBookPlanDay {
  id?: string;
  day: number;
  week?: number;
  title: string;
  scripture: string;
  focus: string;
  phase?: string;
  sourceSection?: string;
  sourceExcerpt?: string;
  sourceText?: string;
  sourcePageStart?: number;
  sourcePageEnd?: number;
  sourcePageSlices?: OwnedBookPageSlice[];
  sourceDiagnostics?: OwnedBookDaySourceDiagnostics;
  dailyReading?: string;
  memoryVerse?: string;
  studyLayout?: OwnedBookStudyLayout;
  workbookOverlays?: OwnedBookWorkbookOverlay[];
}

export type OwnedBookStudyBlockType =
  | 'overview'
  | 'scripture'
  | 'reading'
  | 'questions'
  | 'journal'
  | 'prayer'
  | 'practice'
  | 'quote';

export interface OwnedBookStudyBlock {
  id: string;
  type: OwnedBookStudyBlockType;
  title: string;
  body?: string;
  items?: string[];
  reference?: string;
  emphasis?: string;
  span?: 'full' | 'half';
}

export interface OwnedBookStudyLayout {
  title: string;
  summary: string;
  supportingPassages: string[];
  prayerFocus?: string;
  practiceFocus?: string;
  blocks: OwnedBookStudyBlock[];
}

export type OwnedBookWorkbookFieldKey =
  | 'highlight'
  | 'underline'
  | 'notes'
  | 'decisionResponse'
  | 'followUpResponse'
  | 'activityResponse'
  | 'yesNoResponse'
  | 'annotationResponse'
  | 'faithResponseChoice'
  | 'abramObservation'
  | 'memoryVerseWrite'
  | 'dailyReviewMeaningful'
  | 'dailyReviewPrayer'
  | 'dailyReviewAction'
  | 'stillness'
  | 'story'
  | 'scriptureTruth'
  | 'truthForMe'
  | 'examination'
  | 'prayerResponse'
  | 'stepToday'
  | 'accountabilityResponse';

export interface OwnedBookWorkbookOverlay {
  id?: string;
  key: OwnedBookWorkbookFieldKey;
  label: string;
  prompt: string;
  placeholder: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  minHeight: number;
  kind?: 'textarea' | 'checkbox-group';
  options?: string[];
}

export interface OwnedBookDailyPlan {
  title: string;
  totalDays: number;
  daysPerWeek?: number;
  cadence: string;
  summary: string;
  generationStrategy?: 'preserved-daily' | 'source-sections' | 'paragraph-chunks';
  sourceDiagnostics?: OwnedBookSourceDiagnostics;
  phases: OwnedBookPlanPhase[];
  days?: OwnedBookPlanDay[];
}

export interface OwnedBookBookmark {
  id: string;
  day: number;
  label: string;
  createdAt: string;
}

export interface OwnedBookStudyDayEntry {
  id?: string;
  highlight: string;
  underline: string;
  notes: string;
  decisionResponse: string;
  followUpResponse: string;
  activityResponse: string;
  yesNoResponse: string;
  annotationResponse: string;
  faithResponseChoice: string;
  abramObservation: string;
  memoryVerseWrite: string;
  dailyReviewMeaningful: string;
  dailyReviewPrayer: string;
  dailyReviewAction: string;
  stillness: string;
  story: string;
  scriptureTruth: string;
  truthForMe: string;
  examination: string;
  prayerResponse: string;
  stepToday: string;
  actsAdoration: string;
  actsConfession: string;
  actsThanksgiving: string;
  actsSupplication: string;
  accountabilityResponse: string;
  answerIdsByField?: Record<string, string>;
  updatedAt?: string;
}

export interface OwnedBookStudyState {
  currentDay: number;
  bookmarks: OwnedBookBookmark[];
  entriesByDay: Record<string, OwnedBookStudyDayEntry>;
}

export interface ChronicleSourceAssetRef {
  id: string;
  kind: 'external-pdf' | 'uploaded-pdf';
  fileName: string;
  originalPath?: string;
}

export interface ChronicleManagedAssetRef {
  id: string;
  kind: 'imported-pdf' | 'ocr-text' | 'ocr-manifest' | 'ocr-pdf';
  relativePath: string;
}

export interface ChronicleBookAssetMap {
  source?: ChronicleSourceAssetRef;
  managed: ChronicleManagedAssetRef[];
}

export interface OwnedBook {
  schemaVersion?: number;
  id: string;
  title: string;
  author?: string;
  recordId?: string;
  sourcePath: string;
  textPath?: string;
  assets?: ChronicleBookAssetMap;
  classification: 'daily-study' | 'general-book';
  workflow: 'preserve-daily' | 'ai-daily-study';
  status: 'ready' | 'draft' | 'processing';
  summary: string;
  importedAt: string;
  generatedPlan?: OwnedBookDailyPlan;
  studyState?: OwnedBookStudyState;
}

export interface ReadingPlan {
  id: string;
  name: string;
  totalDays: number;
  currentDay: number;
  startDate: string;
}

export interface BiblePassage {
  book: string;
  chapter: number;
  verses: BibleVerse[];
  translation: string;
}

export interface BibleVerse {
  number: number;
  text: string;
  themes?: string[];
}

export interface ThemeDef {
  id: string;
  name: string;
  category: string;
  color: string;
  isPersonal?: boolean;
  passageCount?: number;
}

export interface FormationDimension {
  label: string;
  icon: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'flat';
  pct: number;
  color: 'green' | 'amber' | 'blue';
}
