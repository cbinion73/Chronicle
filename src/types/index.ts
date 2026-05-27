export type Theme = 'light' | 'dark';

export type NavTab =
  | 'today'
  | 'bible'
  | 'study'
  | 'discipleship'
  | 'prayer'
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
}

export interface ChronicleEntry {
  id: string;
  date: string;
  type: 'insight' | 'prayer' | 'study' | 'note' | 'reflection';
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
