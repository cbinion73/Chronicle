import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { useToastStore } from '../store/toastStore';
import type { ChronicleBookAssetMap, ChronicleSyncProfile, OwnedBook, OwnedBookSourceDiagnostics } from '../types';
import { useAIChatStore } from '../store/aiChatStore';
import { derivePrayerFormation } from '../lib/formationAnalytics';
import { useResponsiveLayout } from '../lib/useResponsiveLayout';
import { CHRONICLE_AGENT_MODE_DEFS, type ChronicleAgentMode } from '../store/aiChatStore';
import { CHRONICLE_PERSONAS, type ChroniclePersonaId } from '../lib/chroniclePersonas';
import { CHRONICLE_APP_VERSION, CHRONICLE_BUILD_LABEL, CHRONICLE_MOTTO, CHRONICLE_ONBOARDING_STEPS, CHRONICLE_TAGLINE } from '../lib/chronicleBrand';
import { askHomeAssistantVoice, fetchVoiceStatus, generateLiveKitVoiceToken, type ChronicleVoiceStatusPayload } from '../lib/voice';

const CATEGORIES = [
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'scripture', label: 'Scripture', icon: '📖' },
  { id: 'ai', label: 'AI Companion', icon: '💬' },
  { id: 'chronicle', label: 'Chronicle', icon: '📓' },
  { id: 'formation', label: 'Formation', icon: '📈' },
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'data', label: 'Data & Privacy', icon: '🔒' },
  { id: 'about', label: 'About', icon: 'ℹ️' },
];

type SettingsCategoryId = (typeof CATEGORIES)[number]['id'];

const LAST_STUDY_IMPORT_JOB_KEY = 'chronicle-last-study-import-job-id';

function getRequestedSettingsCategory(state: unknown): SettingsCategoryId | null {
  const requestedCategory =
    state && typeof state === 'object' && 'requestedCategory' in state && typeof state.requestedCategory === 'string'
      ? state.requestedCategory
      : '';
  return CATEGORIES.some((category) => category.id === requestedCategory) ? requestedCategory as SettingsCategoryId : null;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: checked ? 'var(--accent-green)' : 'var(--border)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s',
        flexShrink: 0,
        border: 'none',
        padding: 0,
      }}
    >
      <div style={{
        position: 'absolute',
        top: 2, left: checked ? 18 : 2,
        width: 16, height: 16,
        borderRadius: '50%',
        background: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 0.2s',
      }} />
    </button>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '1px solid var(--border)', gap: 16 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function GroupHeader({ title, desc }: { title: string; desc?: string }) {
  return (
    <div style={{ padding: '12px 18px 10px', background: 'var(--card-inner)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-sub)' }}>{title}</div>
      {desc && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>}
    </div>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow)', marginBottom: 16 }}>
      {children}
    </div>
  );
}

function Sel({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: '5px 28px 5px 10px',
        border: '1px solid var(--border)',
        borderRadius: 7,
        fontSize: 12,
        fontWeight: 500,
        color: 'var(--text)',
        background: 'var(--card-inner)',
        cursor: 'pointer',
        minWidth: 130,
        appearance: 'none',
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
        outline: 'none',
      }}
    >
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'number';
}) {
  return (
    <input
      value={String(value)}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      type={type}
      style={{
        padding: '6px 10px',
        border: '1px solid var(--border)',
        borderRadius: 8,
        fontSize: 12,
        color: 'var(--text)',
        background: 'var(--card-inner)',
        minWidth: 160,
      }}
    />
  );
}

function makeBookId(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || `book-${Date.now()}`;
}

interface StudyLibraryRecord {
  schemaVersion?: number;
  id: string;
  title: string;
  originalFileName: string;
  sourcePath: string;
  storedPath: string;
  assets?: ChronicleBookAssetMap;
  status: 'uploaded' | 'ocr_complete' | 'structured';
  uploadedAt: string;
  updatedAt: string;
  ocrTextPath?: string | null;
  ocrPdfPath?: string | null;
  ocrManifestPath?: string | null;
  ocrQuality?: {
    confidence: 'high' | 'medium' | 'low';
    pageCount: number;
    averageCharsPerPage: number;
    sparsePageCount: number;
    verySparsePageCount: number;
    manifestPageCount?: number | null;
    warnings: string[];
  } | null;
  workflow?: 'auto-detect' | 'preserve-daily' | 'ai-daily-study';
  classification?: 'daily-study' | 'general-book';
  summary?: string;
  generatedPlan?: OwnedBook['generatedPlan'];
  importDiagnostics?: OwnedBookSourceDiagnostics | null;
}

interface StudyLibraryManifest {
  schemaVersion: number;
  generatedAt: string;
  catalogPath: string;
  uploadsDir: string;
  ocrBooksDir: string;
  workbookAuditPath: string;
  bibleLibraryManifestPath: string;
  libraryRecordSchemaVersion: number;
  ownedBookSchemaVersion: number;
  recordCount: number;
  structuredCount: number;
}

function generationStrategyLabel(strategy?: NonNullable<OwnedBook['generatedPlan']>['generationStrategy']) {
  if (strategy === 'preserved-daily') return 'Preserved daily source'
  if (strategy === 'source-sections') return 'Built from source sections'
  if (strategy === 'paragraph-chunks') return 'Built from paragraph chunks'
  return ''
}

function sourceStructureLabel(structure?: string) {
  if (structure === 'question-driven') return 'Question-driven'
  if (!structure) return 'Source-guided'
  return structure.charAt(0).toUpperCase() + structure.slice(1)
}

function summarizePlanStructures(plan?: OwnedBook['generatedPlan']) {
  const counts = new Map<string, number>()
  for (const day of plan?.days || []) {
    const structure = day.sourceDiagnostics?.structure
    if (!structure) continue
    counts.set(structure, (counts.get(structure) || 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 2)
    .map(([structure, count]) => `${sourceStructureLabel(structure)} (${count})`)
}

interface BibleLibraryStatus {
  id: string;
  label: string;
  providerId: string;
  sourceLabel: string;
  chapterCount: number;
  cachedCount: number;
  coveragePct: number;
  translation: string;
  attribution?: string;
}

interface ChronicleSyncSnapshot {
  id: string;
  createdAt: string;
  path: string;
  byteSize: number;
  schemaVersion: number;
  appStateVersion: number;
  chronicleEntryCount: number;
  prayerItemCount: number;
  ownedBookCount: number;
  scriptureBookmarkCount: number;
  formationRhythmCount?: number;
  deviceLabel?: string;
  platform?: string;
}

interface ChronicleSyncSummary {
  snapshotCount: number;
  structuredLibraryCount: number;
  uploadedLibraryCount: number;
  themeCacheFileCount: number;
  themeCacheVersion?: string | null;
  appStateVersion?: number;
  snapshotSchemaVersion?: number;
  syncModelVersion?: number;
  localCacheSummary?: {
    importedPdfCount: number;
    ocrTextCount: number;
    installedTranslationCount: number;
    themeCacheFileCount: number;
  };
}

interface WorkbookAuditCuePage {
  pageNumber: number;
  cueLabels: string[];
}

interface WorkbookAuditEntry {
  bookId: string;
  title: string;
  day: number;
  section?: string;
  pageRange: number[];
  coveredPages: number[];
  cuePages: WorkbookAuditCuePage[];
  uncoveredCuePages: WorkbookAuditCuePage[];
}

type OcrRunMode = 'single' | 'segmented';

function statusTone(status: StudyLibraryRecord['status'] | 'running' | 'completed' | 'failed') {
  if (status === 'structured' || status === 'completed') {
    return { border: 'rgba(15, 79, 207, 0.24)', background: 'rgba(15, 79, 207, 0.08)', color: 'var(--accent-blue)' };
  }
  if (status === 'ocr_complete') {
    return { border: 'rgba(6, 95, 70, 0.24)', background: 'rgba(6, 95, 70, 0.08)', color: '#065f46' };
  }
  if (status === 'running' || status === 'uploaded') {
    return { border: 'rgba(180, 83, 9, 0.24)', background: 'rgba(217, 119, 6, 0.08)', color: '#b45309' };
  }
  return { border: 'rgba(180, 35, 24, 0.24)', background: 'rgba(249, 112, 102, 0.1)', color: '#b42318' };
}

function ocrConfidenceTone(confidence: 'high' | 'medium' | 'low') {
  if (confidence === 'high') {
    return { border: 'rgba(15, 79, 207, 0.24)', background: 'rgba(15, 79, 207, 0.08)', color: 'var(--accent-blue)' };
  }
  if (confidence === 'medium') {
    return { border: 'rgba(180, 83, 9, 0.24)', background: 'rgba(217, 119, 6, 0.08)', color: '#b45309' };
  }
  return { border: 'rgba(180, 35, 24, 0.24)', background: 'rgba(249, 112, 102, 0.1)', color: '#b42318' };
}

function chooseOcrRepairMode(record: StudyLibraryRecord): OcrRunMode {
  if (!record.ocrQuality) return 'single';
  if (record.ocrQuality.confidence === 'low') return 'segmented';
  if (record.ocrQuality.verySparsePageCount >= 2) return 'segmented';
  if (record.ocrQuality.pageCount >= 60) return 'segmented';
  return 'single';
}

function sourceHealthTone(health: 'high' | 'medium' | 'low') {
  if (health === 'high') {
    return { border: 'rgba(6, 95, 70, 0.24)', background: 'rgba(6, 95, 70, 0.08)', color: '#065f46' };
  }
  if (health === 'medium') {
    return { border: 'rgba(180, 83, 9, 0.24)', background: 'rgba(217, 119, 6, 0.08)', color: '#b45309' };
  }
  return { border: 'rgba(180, 35, 24, 0.24)', background: 'rgba(249, 112, 102, 0.1)', color: '#b42318' };
}

export default function Settings() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    theme, setTheme, translation, setTranslation, chronicleEntries, prayerItems, streakDays, ownedBooks, upsertOwnedBook, removeOwnedBook, setActiveOwnedBook, setActiveTab, setBibleView,
    bibleView, activeStudyModuleId, studyModuleDayById, activeOwnedBookId, scriptureBookmarks, formationRhythms, syncProfile, voiceConfig, importPortableState, mergePortableState, updateSyncProfile, updateVoiceConfig, resetPersonalState,
  } = useAppStore();
  const { addToast } = useToastStore();
  const setPageContext = useAIChatStore((state) => state.setPageContext);
  const setSelectedAgentMode = useAIChatStore((state) => state.setSelectedAgentMode);
  const selectedAgentMode = useAIChatStore((state) => state.selectedAgentMode);
  const selectedPersona = useAIChatStore((state) => state.selectedPersona);
  const setSelectedPersona = useAIChatStore((state) => state.setSelectedPersona);
  const threadMetaByKey = useAIChatStore((state) => state.threadMetaByKey);
  const { isCompact, isPhone } = useResponsiveLayout();
  const [activeCategory, setActiveCategory] = useState<SettingsCategoryId>(() => getRequestedSettingsCategory(location.state) || 'profile');
  const [ocrPdfPath, setOcrPdfPath] = useState('/Users/chris/Downloads/Masterlife All Sessions Complete.pdf');
  const [ocrStem, setOcrStem] = useState('masterlife-book1');
  const [ocrPageRange, setOcrPageRange] = useState('1-10');
  const [ocrSegmentSize, setOcrSegmentSize] = useState('20');
  const [forceOcr, setForceOcr] = useState(true);
  const [ocrChunkingAdvice, setOcrChunkingAdvice] = useState<{
    pageCount: number;
    mode: 'segmented' | 'single-pass';
    recommendedSegmentSize: number;
    estimatedSegments: number;
    reason: string;
  } | null>(null);
  const [importTextPath, setImportTextPath] = useState('/Users/chris/Desktop/CODE/chronicle/data/ocr/masterlife-book1.txt');
  const [ownedBookTitle, setOwnedBookTitle] = useState('MasterLife 1: The Disciple’s Cross');
  const [ownedBookWorkflow, setOwnedBookWorkflow] = useState<'auto-detect' | 'preserve-daily' | 'ai-daily-study'>('auto-detect');
  const [studyImportFiles, setStudyImportFiles] = useState<string[]>([]);
  const [studyImportTools, setStudyImportTools] = useState({ tesseract: false, ocrmypdf: false, pdftotext: false });
  const [studyImportBusy, setStudyImportBusy] = useState<'upload' | 'ocr' | 'segmented' | 'recommend' | 'import' | 'analyze' | null>(null);
  const [studyImportLog, setStudyImportLog] = useState('');
  const [libraryRecordId, setLibraryRecordId] = useState('');
  const [uploadedBookLabel, setUploadedBookLabel] = useState('');
  const [studyLibraryRecords, setStudyLibraryRecords] = useState<StudyLibraryRecord[]>([]);
  const [studyLibraryManifest, setStudyLibraryManifest] = useState<StudyLibraryManifest | null>(null);
  const [studyLibraryBusy, setStudyLibraryBusy] = useState(false);
  const [studyLibraryDeleteBusyId, setStudyLibraryDeleteBusyId] = useState<string | null>(null);
  const [workbookAuditBusy, setWorkbookAuditBusy] = useState(false);
  const [workbookAuditActionBusy, setWorkbookAuditActionBusy] = useState<'sync' | 'qa' | null>(null);
  const [workbookAuditEntries, setWorkbookAuditEntries] = useState<WorkbookAuditEntry[]>([]);
  const [workbookAuditGeneratedAt, setWorkbookAuditGeneratedAt] = useState<string>('');
  const [workbookAuditWarnings, setWorkbookAuditWarnings] = useState<string[]>([]);
  const [bibleLibraryStatus, setBibleLibraryStatus] = useState<BibleLibraryStatus[]>([]);
  const [bibleLibraryBusy, setBibleLibraryBusy] = useState(false);
  const [themeCacheVersion, setThemeCacheVersion] = useState<string>('');
  const [themeCacheFileCount, setThemeCacheFileCount] = useState(0);
  const [themeCacheBusy, setThemeCacheBusy] = useState(false);
  const [themeCacheTargetTranslation, setThemeCacheTargetTranslation] = useState('nkjv');
  const [chronicleSyncBusy, setChronicleSyncBusy] = useState(false);
  const [chronicleSyncSnapshots, setChronicleSyncSnapshots] = useState<ChronicleSyncSnapshot[]>([]);
  const [chronicleSyncLatest, setChronicleSyncLatest] = useState<ChronicleSyncSnapshot | null>(null);
  const [chronicleSyncSummary, setChronicleSyncSummary] = useState<ChronicleSyncSummary | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<ChronicleVoiceStatusPayload['providers'] | null>(null);
  const [voiceStatusBusy, setVoiceStatusBusy] = useState(false);
  const [homeAssistantPrompt, setHomeAssistantPrompt] = useState('Turn on the porch light and tell me one calm sentence for the evening.');
  const [homeAssistantReply, setHomeAssistantReply] = useState('');
  const [liveKitPreview, setLiveKitPreview] = useState<{ url: string; roomName: string; participantName: string; agentName: string; token: string } | null>(null);
  const [voiceActionBusy, setVoiceActionBusy] = useState<'home-assistant' | 'livekit' | null>(null);
  const snapshotImportInputRef = useRef<HTMLInputElement | null>(null);
  const [studyImportJob, setStudyImportJob] = useState<{
    id: string;
    kind: 'ocr' | 'segmented' | 'import';
    label: string;
    status: 'running' | 'completed' | 'failed';
    progress: number;
    message: string;
    stdout: string;
    stderr: string;
    startedAt: string;
    finishedAt?: string;
    result?: Record<string, unknown>;
    error?: string;
  } | null>(null);

  const [toggles, setToggles] = useState({
    verseNumbers: true,
    redLetter: false,
    paragraphView: true,
    citations: true,
    confidenceBadges: true,
    flagDisagreement: true,
    pastoralReflection: true,
    chronicleContext: true,
    autoCapture: true,
    captureReading: true,
    capturePrayer: true,
    captureAI: true,
    captureMilestones: true,
    captureReturn: true,
    lockChronicle: false,
    scripture: true,
    prayer: true,
    obedience: true,
    gratitude: true,
    worship: true,
    languageAnalysis: true,
    patternDetection: true,
    formationCaveat: true,
    morningReminder: true,
    eveningPrompt: false,
    streakWarning: true,
    milestones: true,
    iCloudBackup: true,
  });
  const oldestEntryDate = chronicleEntries.reduce<Date | null>((oldest, entry) => {
    const candidate = new Date(`${entry.date}T12:00:00`);
    return !oldest || candidate < oldest ? candidate : oldest;
  }, null);
  const uniqueActiveDays = new Set(chronicleEntries.map((entry) => entry.date)).size;
  const monthsDeep = oldestEntryDate ? Math.max(1, nowMonthDiff(oldestEntryDate, new Date()) + 1) : 0;
  const answeredPrayerCount = prayerItems.filter((item) => item.answered).length;
  const localLibraryCount = ownedBooks.length;
  const prayerFormation = useMemo(() => derivePrayerFormation(prayerItems), [prayerItems]);
  const fullyCachedTranslations = bibleLibraryStatus.filter((item) => item.chapterCount > 0 && item.cachedCount >= item.chapterCount).length;
  const libraryStatusCounts = useMemo(() => ({
    uploaded: studyLibraryRecords.filter((record) => record.status === 'uploaded').length,
    ocrComplete: studyLibraryRecords.filter((record) => record.status === 'ocr_complete').length,
    structured: studyLibraryRecords.filter((record) => record.status === 'structured').length,
  }), [studyLibraryRecords]);
  const workbookAuditSummary = useMemo(() => {
    const totalDays = workbookAuditEntries.length;
    const daysWithCueCoverage = workbookAuditEntries.filter((entry) => entry.cuePages.length > 0 && entry.uncoveredCuePages.length === 0).length;
    const daysWithUncoveredCues = workbookAuditEntries.filter((entry) => entry.uncoveredCuePages.length > 0).length;
    const daysWithoutInteractiveCues = workbookAuditEntries.filter((entry) => entry.cuePages.length === 0).length;
    const totalCuePages = workbookAuditEntries.reduce((sum, entry) => sum + entry.cuePages.length, 0);
    const totalUncoveredCuePages = workbookAuditEntries.reduce((sum, entry) => sum + entry.uncoveredCuePages.length, 0);
    return {
      totalDays,
      daysWithCueCoverage,
      daysWithUncoveredCues,
      daysWithoutInteractiveCues,
      totalCuePages,
      totalUncoveredCuePages,
    };
  }, [workbookAuditEntries]);
  const workbookAuditByBook = useMemo(() => {
    const grouped = new Map<string, {
      bookId: string;
      title: string;
      totalDays: number;
      cueSafeDays: number;
      uncoveredDays: number;
      uncoveredCuePages: number;
      noPromptDays: number;
      nextFlaggedEntry: WorkbookAuditEntry | null;
    }>();

    workbookAuditEntries.forEach((entry) => {
      const current = grouped.get(entry.bookId) || {
        bookId: entry.bookId,
        title: entry.title,
        totalDays: 0,
        cueSafeDays: 0,
        uncoveredDays: 0,
        uncoveredCuePages: 0,
        noPromptDays: 0,
        nextFlaggedEntry: null,
      };

      current.totalDays += 1;
      if (entry.cuePages.length === 0) {
        current.noPromptDays += 1;
      }
      if (entry.cuePages.length > 0 && entry.uncoveredCuePages.length === 0) {
        current.cueSafeDays += 1;
      }
      if (entry.uncoveredCuePages.length > 0) {
        current.uncoveredDays += 1;
        current.uncoveredCuePages += entry.uncoveredCuePages.length;
        if (!current.nextFlaggedEntry || entry.day < current.nextFlaggedEntry.day) {
          current.nextFlaggedEntry = entry;
        }
      }

      grouped.set(entry.bookId, current);
    });

    return Array.from(grouped.values()).sort((left, right) => {
      if (left.uncoveredCuePages !== right.uncoveredCuePages) {
        return right.uncoveredCuePages - left.uncoveredCuePages;
      }
      return left.title.localeCompare(right.title);
    });
  }, [workbookAuditEntries]);
  const nextTranslationNeedingCache = useMemo(
    () => bibleLibraryStatus.find((item) => item.chapterCount > 0 && item.cachedCount < item.chapterCount) || null,
    [bibleLibraryStatus],
  );
  const nextOcrRepairRecord = useMemo(
    () =>
      studyLibraryRecords.find((record) => record.ocrQuality?.confidence === 'low')
      || studyLibraryRecords.find((record) => record.ocrQuality?.confidence === 'medium')
      || null,
    [studyLibraryRecords],
  );
  const lowSourceHealthRecords = useMemo(
    () => studyLibraryRecords.filter((record) => record.importDiagnostics?.sourceHealth === 'low').length,
    [studyLibraryRecords],
  );
  const aiThreadCount = useMemo(() => Object.keys(threadMetaByKey).length, [threadMetaByKey]);
  const dataHealthSummary = useMemo(
    () => ({
      cacheGaps: bibleLibraryStatus.filter((item) => item.chapterCount > 0 && item.cachedCount < item.chapterCount).length,
      ocrRepairQueue: studyLibraryRecords.filter((record) => (record.ocrQuality?.confidence || 'high') !== 'high').length,
      workbookFlags: workbookAuditSummary.daysWithUncoveredCues,
      lowSourceHealthRecords,
      snapshotCount: chronicleSyncSummary?.snapshotCount ?? 0,
    }),
    [bibleLibraryStatus, chronicleSyncSummary?.snapshotCount, lowSourceHealthRecords, studyLibraryRecords, workbookAuditSummary.daysWithUncoveredCues],
  );
  const nextWorkbookFlaggedEntry = useMemo(
    () => workbookAuditEntries.find((entry) => entry.uncoveredCuePages.length > 0) || null,
    [workbookAuditEntries],
  );
  const syncReadyState = toggles.iCloudBackup ? 'Private sync posture enabled' : 'Manual snapshot export only';

  useEffect(() => {
    setSelectedAgentMode('reflection_guide');
    setPageContext('/settings', {
      page: 'Settings',
      pathname: '/settings',
      title: document.title,
      selection: CATEGORIES.find((category) => category.id === activeCategory)?.label || 'Settings',
      summary: `Settings section: ${CATEGORIES.find((category) => category.id === activeCategory)?.label || 'Settings'}. Chronicle entries: ${chronicleEntries.length}. Owned books: ${ownedBooks.length}. Current translation: ${translation}. Theme: ${theme}.`,
    });
  }, [activeCategory, chronicleEntries.length, ownedBooks.length, setPageContext, setSelectedAgentMode, theme, translation]);

  const toggle = (key: keyof typeof toggles) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  async function uploadBookFile(file: File) {
    setStudyImportBusy('upload');
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const chunkSize = 0x8000;
      for (let index = 0; index < bytes.length; index += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
      }
      const contentBase64 = btoa(binary);

      const response = await fetch('/api/study-imports/upload-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentBase64,
        }),
      });
      const payload = await response.json() as {
        recordId?: string;
        storedPath?: string;
        originalFileName?: string;
        bytes?: number;
        error?: { errmsg?: string };
      };
      if (!response.ok || !payload.storedPath) {
        throw new Error(payload.error?.errmsg || 'Book upload failed.');
      }

      const derivedStem = (payload.originalFileName || file.name)
        .replace(/\.[^.]+$/, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'book-import';

      setLibraryRecordId(payload.recordId || '');
      setOcrPdfPath(payload.storedPath);
      setOcrStem(derivedStem);
      setUploadedBookLabel(`${payload.originalFileName || file.name} (${Math.round((payload.bytes || 0) / 1024)} KB)`);
      if (!ownedBookTitle || ownedBookTitle === 'MasterLife 1: The Disciple’s Cross') {
        setOwnedBookTitle((payload.originalFileName || file.name).replace(/\.[^.]+$/, ''));
      }
      setStudyImportLog(`Uploaded ${(payload.originalFileName || file.name)} into Chronicle's library.\nStored at: ${payload.storedPath}`);
      addToast('Book uploaded into Chronicle', 'success', '📘');
      await refreshStudyLibrary();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Book upload failed.';
      setStudyImportLog(message);
      addToast(message, 'warning', 'AI');
    } finally {
      setStudyImportBusy(null);
    }
  }

  const refreshStudyImports = useCallback(async () => {
    const response = await fetch('/api/study-imports/status');
    const payload = await response.json() as {
      files?: string[];
      tools?: { tesseract?: boolean; ocrmypdf?: boolean; pdftotext?: boolean };
      error?: { errmsg?: string };
    };
    if (!response.ok) throw new Error(payload.error?.errmsg || 'Unable to load study import status.');
    const files = payload.files || [];
    setStudyImportFiles(files);
    setStudyImportTools({
      tesseract: Boolean(payload.tools?.tesseract),
      ocrmypdf: Boolean(payload.tools?.ocrmypdf),
      pdftotext: Boolean(payload.tools?.pdftotext),
    });

    const availableTextFiles = files.filter((file) => file.endsWith('.txt'));
    const currentTextFile = importTextPath.split('/').pop() || '';
    if (availableTextFiles.length > 0 && !availableTextFiles.some((file) => file === currentTextFile || file.endsWith(`/${currentTextFile}`))) {
      const preferredTextFile = availableTextFiles.find((file) => file.endsWith('.book.txt')) || availableTextFiles[0];
      setImportTextPath(`/Users/chris/Desktop/CODE/chronicle/data/ocr/${preferredTextFile}`);
    }
  }, [importTextPath]);

  function hydrateRecordToForm(record: StudyLibraryRecord) {
    setLibraryRecordId(record.id);
    setUploadedBookLabel(record.originalFileName);
    setOwnedBookTitle(record.title);
    setOwnedBookWorkflow(record.workflow || 'auto-detect');
    setOcrPdfPath(record.storedPath);
    if (record.ocrTextPath) {
      setImportTextPath(record.ocrTextPath);
    }
    const derivedStem = (record.originalFileName || record.title)
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'book-import';
    setOcrStem(derivedStem);
    setStudyImportLog(`Loaded ${record.title} from Chronicle's private library.\nStatus: ${record.status}.`);
  }

  const syncRecordToOwnedBook = useCallback((record: StudyLibraryRecord) => {
    if (record.status !== 'structured' || !record.generatedPlan) return;
    upsertOwnedBook({
      id: record.id,
      title: record.title,
      sourcePath: record.storedPath,
      textPath: record.ocrTextPath || undefined,
      assets: record.assets,
      classification: record.classification || 'general-book',
      workflow: record.workflow === 'preserve-daily' ? 'preserve-daily' : 'ai-daily-study',
      status: 'ready',
      summary: record.summary || record.generatedPlan.summary,
      importedAt: record.uploadedAt.split('T')[0],
      generatedPlan: record.generatedPlan,
    });
  }, [upsertOwnedBook]);

  const refreshStudyLibrary = useCallback(async () => {
    setStudyLibraryBusy(true);
    try {
      const response = await fetch('/api/study-imports/library');
      const payload = await response.json() as {
        records?: StudyLibraryRecord[];
        manifest?: StudyLibraryManifest;
        error?: { errmsg?: string };
      };
      if (!response.ok) throw new Error(payload.error?.errmsg || 'Unable to load Chronicle study library.');
      const sortedRecords = [...(payload.records || [])].sort((left, right) => (
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      ));
      sortedRecords.forEach(syncRecordToOwnedBook);
      setStudyLibraryRecords(sortedRecords);
      setStudyLibraryManifest(payload.manifest || null);
    } finally {
      setStudyLibraryBusy(false);
    }
  }, [syncRecordToOwnedBook]);

  const refreshVoicePlatform = useCallback(async () => {
    setVoiceStatusBusy(true);
    try {
      const payload = await fetchVoiceStatus();
      setVoiceStatus(payload.providers);
    } finally {
      setVoiceStatusBusy(false);
    }
  }, []);

  const refreshWorkbookAudit = useCallback(async () => {
    setWorkbookAuditBusy(true);
    try {
      const response = await fetch('/api/study-imports/workbook-audit');
      const payload = await response.json() as {
        generatedAt?: string | null;
        audits?: WorkbookAuditEntry[];
        warnings?: string[];
        error?: { errmsg?: string };
      };
      if (!response.ok) throw new Error(payload.error?.errmsg || 'Unable to load workbook audit status.');
      const entries = [...(payload.audits || [])].sort((left, right) => {
        if (left.title !== right.title) return left.title.localeCompare(right.title);
        return left.day - right.day;
      });
      setWorkbookAuditEntries(entries);
      setWorkbookAuditGeneratedAt(payload.generatedAt || '');
      setWorkbookAuditWarnings(payload.warnings || []);
    } finally {
      setWorkbookAuditBusy(false);
    }
  }, []);

  async function deleteStudyLibraryRecord(record: StudyLibraryRecord) {
    const confirmed = window.confirm(`Delete "${record.title}" from Chronicle's library?\n\nThis removes the imported book copy, OCR files, and workbook caches for this book.`);
    if (!confirmed) return;

    setStudyLibraryDeleteBusyId(record.id);
    try {
      const response = await fetch('/api/study-imports/delete-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: record.id }),
      });
      const payload = await response.json() as {
        ok?: boolean;
        removedTitle?: string;
        removedPaths?: string[];
        error?: { errmsg?: string };
      };
      if (!response.ok) throw new Error(payload.error?.errmsg || `Unable to delete ${record.title}.`);
      removeOwnedBook(record.id);
      if (libraryRecordId === record.id) {
        setLibraryRecordId('');
        setUploadedBookLabel('');
      }
      await refreshStudyLibrary();
      await refreshWorkbookAudit();
      addToast(`${payload.removedTitle || record.title} deleted from Chronicle`, 'success', '🗑️');
    } catch (error) {
      addToast(error instanceof Error ? error.message : `Unable to delete ${record.title}.`, 'warning', 'AI');
    } finally {
      setStudyLibraryDeleteBusyId(null);
    }
  }

  async function testHomeAssistantVoice() {
    setVoiceActionBusy('home-assistant');
    try {
      const payload = await askHomeAssistantVoice(homeAssistantPrompt, voiceConfig);
      setHomeAssistantReply(payload.reply || 'Home Assistant returned no spoken reply.');
      addToast('Home Assistant voice conversation completed.', 'success', '🏠');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Home Assistant voice check failed.';
      setHomeAssistantReply(message);
      addToast(message, 'warning', 'AI');
    } finally {
      setVoiceActionBusy(null);
    }
  }

  async function generateVoiceSessionToken() {
    setVoiceActionBusy('livekit');
    try {
      const payload = await generateLiveKitVoiceToken(voiceConfig);
      setLiveKitPreview(payload);
      addToast('Generated a LiveKit session token for Chronicle voice.', 'success', '🎙️');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'LiveKit token generation failed.';
      addToast(message, 'warning', 'AI');
    } finally {
      setVoiceActionBusy(null);
    }
  }

  async function runWorkbookSync() {
    setWorkbookAuditActionBusy('sync');
    try {
      const response = await fetch('/api/study-imports/run-workbook-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const payload = await response.json() as {
        stdout?: string;
        stderr?: string;
        error?: { errmsg?: string };
      };
      if (!response.ok) throw new Error(payload.error?.errmsg || 'Workbook sync failed.');
      setStudyImportLog([payload.stdout, payload.stderr].filter(Boolean).join('\n').trim() || 'Workbook sync completed.');
      await refreshStudyLibrary();
      await refreshWorkbookAudit();
      addToast('Workbook overlay sync completed', 'success', '📘');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Workbook sync failed.';
      addToast(message, 'warning', 'AI');
    } finally {
      setWorkbookAuditActionBusy(null);
    }
  }

  async function runWorkbookQa() {
    setWorkbookAuditActionBusy('qa');
    try {
      const response = await fetch('/api/study-imports/run-workbook-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const payload = await response.json() as {
        stdout?: string;
        stderr?: string;
        error?: { errmsg?: string };
      };
      if (!response.ok) throw new Error(payload.error?.errmsg || 'Workbook QA failed.');
      setStudyImportLog([payload.stdout, payload.stderr].filter(Boolean).join('\n').trim() || 'Workbook QA completed.');
      await refreshWorkbookAudit();
      addToast('Workbook QA completed', 'success', '📘');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Workbook QA failed.';
      addToast(message, 'warning', 'AI');
    } finally {
      setWorkbookAuditActionBusy(null);
    }
  }

  const refreshBibleLibraryStatus = useCallback(async () => {
    setBibleLibraryBusy(true);
    try {
      const response = await fetch('/api/bible-library/status');
      const payload = await response.json() as {
        translations?: BibleLibraryStatus[];
        cacheVersion?: string | null;
        totalCacheFiles?: number;
        error?: { errmsg?: string };
      };
      if (!response.ok) {
        throw new Error(payload.error?.errmsg || 'Unable to load Bible library status.');
      }
      const translations = payload.translations || [];
      setBibleLibraryStatus(translations);
      setThemeCacheVersion(payload.cacheVersion || '');
      setThemeCacheFileCount(payload.totalCacheFiles || 0);
      if (translations.length > 0 && !translations.some((item) => item.id === themeCacheTargetTranslation)) {
        setThemeCacheTargetTranslation(translations[0].id);
      }
    } finally {
      setBibleLibraryBusy(false);
    }
  }, [themeCacheTargetTranslation]);

  const refreshChronicleSyncStatus = useCallback(async () => {
    setChronicleSyncBusy(true);
    try {
      const response = await fetch('/api/chronicle-sync/status');
      const payload = await response.json() as {
        snapshots?: ChronicleSyncSnapshot[];
        latestSnapshot?: ChronicleSyncSnapshot | null;
        summary?: ChronicleSyncSummary;
        error?: { errmsg?: string };
      };
      if (!response.ok) throw new Error(payload.error?.errmsg || 'Unable to load Chronicle sync status.');
      setChronicleSyncSnapshots(payload.snapshots || []);
      setChronicleSyncLatest(payload.latestSnapshot || null);
      setChronicleSyncSummary(payload.summary || null);
    } finally {
      setChronicleSyncBusy(false);
    }
  }, []);

  async function createChronicleSnapshot() {
    setChronicleSyncBusy(true);
    try {
      const response = await fetch('/api/chronicle-sync/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appState: {
            theme,
            translation,
            bibleView,
            activeStudyModuleId,
            studyModuleDayById,
            activeOwnedBookId,
            chronicleEntries,
            prayerItems,
            formationRhythms,
            scriptureBookmarks,
            ownedBooks,
            syncProfile,
          },
        }),
      });
      const payload = await response.json() as {
        snapshot?: ChronicleSyncSnapshot;
        error?: { errmsg?: string };
      };
      if (!response.ok || !payload.snapshot) {
        throw new Error(payload.error?.errmsg || 'Unable to create Chronicle snapshot.');
      }
      updateSyncProfile({ lastSnapshotAt: new Date().toISOString() });
      addToast(`Snapshot created at ${payload.snapshot.path}`, 'success', '💾');
      await refreshChronicleSyncStatus();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to create Chronicle snapshot.', 'warning', 'AI');
    } finally {
      setChronicleSyncBusy(false);
    }
  }

  async function restoreLatestChronicleSnapshot() {
    setChronicleSyncBusy(true);
    try {
      const response = await fetch('/api/chronicle-sync/restore-latest');
      const payload = await response.json() as {
        snapshot?: ChronicleSyncSnapshot;
        appState?: Record<string, unknown>;
        error?: { errmsg?: string };
      };
      if (!response.ok || !payload.appState) {
        throw new Error(payload.error?.errmsg || 'Unable to restore the latest Chronicle snapshot.');
      }
      importPortableState(payload.appState as never);
      addToast(`Restored ${payload.snapshot?.id || 'Chronicle snapshot'}`, 'success', '💾');
      await refreshChronicleSyncStatus();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to restore the latest Chronicle snapshot.', 'warning', 'AI');
    } finally {
      setChronicleSyncBusy(false);
    }
  }

  async function restoreChronicleSnapshot(snapshotId: string) {
    setChronicleSyncBusy(true);
    try {
      const response = await fetch(`/api/chronicle-sync/restore?snapshotId=${encodeURIComponent(snapshotId)}`);
      const payload = await response.json() as {
        snapshot?: ChronicleSyncSnapshot;
        appState?: Record<string, unknown>;
        error?: { errmsg?: string };
      };
      if (!response.ok || !payload.appState) {
        throw new Error(payload.error?.errmsg || `Unable to restore snapshot ${snapshotId}.`);
      }
      importPortableState(payload.appState as never);
      addToast(`Restored ${payload.snapshot?.id || snapshotId}`, 'success', '💾');
      await refreshChronicleSyncStatus();
    } catch (error) {
      addToast(error instanceof Error ? error.message : `Unable to restore snapshot ${snapshotId}.`, 'warning', 'AI');
    } finally {
      setChronicleSyncBusy(false);
    }
  }

  function downloadLatestChronicleSnapshot() {
    if (!chronicleSyncLatest) return;
    window.open('/api/chronicle-sync/download-latest', '_blank', 'noopener,noreferrer');
    addToast(`Downloading ${chronicleSyncLatest.id}`, 'success', '💾');
  }

  function downloadChronicleSnapshot(snapshotId: string) {
    window.open(`/api/chronicle-sync/download?snapshotId=${encodeURIComponent(snapshotId)}`, '_blank', 'noopener,noreferrer');
    addToast(`Downloading ${snapshotId}`, 'success', '💾');
  }

  async function importChronicleSnapshotFile(file: File) {
    setChronicleSyncBusy(true);
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as {
        id?: string;
        createdAt?: string;
        appState?: Record<string, unknown>;
      };
      const response = await fetch('/api/chronicle-sync/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot: parsed }),
      });
      const payload = await response.json() as {
        snapshot?: ChronicleSyncSnapshot;
        appState?: Record<string, unknown>;
        error?: { errmsg?: string };
      };
      if (!response.ok || !payload.appState) {
        throw new Error(payload.error?.errmsg || 'Unable to import Chronicle snapshot.');
      }
      mergePortableState(payload.appState as never);
      updateSyncProfile({ lastMergedAt: new Date().toISOString() });
      addToast(`Imported ${payload.snapshot?.id || file.name}`, 'success', '💾');
      await refreshChronicleSyncStatus();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to import Chronicle snapshot.', 'warning', 'AI');
    } finally {
      setChronicleSyncBusy(false);
      if (snapshotImportInputRef.current) {
        snapshotImportInputRef.current.value = '';
      }
    }
  }

  async function mergeLatestChronicleSnapshot() {
    setChronicleSyncBusy(true);
    try {
      const response = await fetch('/api/chronicle-sync/restore-latest');
      const payload = await response.json() as {
        snapshot?: ChronicleSyncSnapshot;
        appState?: Record<string, unknown>;
        error?: { errmsg?: string };
      };
      if (!response.ok || !payload.appState) {
        throw new Error(payload.error?.errmsg || 'Unable to merge the latest Chronicle snapshot.');
      }
      mergePortableState(payload.appState as never);
      updateSyncProfile({ lastMergedAt: new Date().toISOString() });
      addToast(`Merged ${payload.snapshot?.id || 'Chronicle snapshot'}`, 'success', '💾');
      await refreshChronicleSyncStatus();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to merge the latest Chronicle snapshot.', 'warning', 'AI');
    } finally {
      setChronicleSyncBusy(false);
    }
  }

  async function mergeChronicleSnapshot(snapshotId: string) {
    setChronicleSyncBusy(true);
    try {
      const response = await fetch(`/api/chronicle-sync/restore?snapshotId=${encodeURIComponent(snapshotId)}`);
      const payload = await response.json() as {
        snapshot?: ChronicleSyncSnapshot;
        appState?: Record<string, unknown>;
        error?: { errmsg?: string };
      };
      if (!response.ok || !payload.appState) {
        throw new Error(payload.error?.errmsg || `Unable to merge snapshot ${snapshotId}.`);
      }
      mergePortableState(payload.appState as never);
      updateSyncProfile({ lastMergedAt: new Date().toISOString() });
      addToast(`Merged ${payload.snapshot?.id || snapshotId}`, 'success', '💾');
      await refreshChronicleSyncStatus();
    } catch (error) {
      addToast(error instanceof Error ? error.message : `Unable to merge snapshot ${snapshotId}.`, 'warning', 'AI');
    } finally {
      setChronicleSyncBusy(false);
    }
  }

  function handleResetPersonalProgress() {
    resetPersonalState();
    addToast('Personal progress reset. Your imported books and study library are still here.', 'success', '🧭');
  }

  function updateCachePolicy<K extends keyof ChronicleSyncProfile['cachePolicy']>(key: K, value: ChronicleSyncProfile['cachePolicy'][K]) {
    updateSyncProfile({
      cachePolicy: {
        ...syncProfile.cachePolicy,
        [key]: value,
      },
    });
  }

  async function buildThemeCacheForTranslation(targetTranslation: string | 'all', overwrite = false) {
    setThemeCacheBusy(true);
    try {
      const response = await fetch('/api/theme-analysis-cache/precompute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          translations: targetTranslation === 'all' ? undefined : [targetTranslation],
          overwrite,
        }),
      });
      const payload = await response.json() as {
        results?: Array<{ translation: string; generated: number; skipped: number; failed: number }>;
        error?: { errmsg?: string };
      };
      if (!response.ok) {
        throw new Error(payload.error?.errmsg || 'Theme analysis precompute failed.');
      }
      const summary = (payload.results || [])
        .map((entry) => `${entry.translation.toUpperCase()}: ${entry.generated} generated, ${entry.skipped} reused, ${entry.failed} failed`)
        .join(' · ');
      addToast(summary || 'Theme analysis cache updated', 'success', '📖');
      await refreshBibleLibraryStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Theme analysis precompute failed.';
      addToast(message, 'warning', 'AI');
    } finally {
      setThemeCacheBusy(false);
    }
  }

  async function precomputeThemeCache(overwrite = false) {
    await buildThemeCacheForTranslation(themeCacheTargetTranslation as string | 'all', overwrite);
  }

  function openBookInDiscipleship(bookId: string) {
    setActiveOwnedBook(bookId);
    setActiveTab('discipleship');
    navigate('/discipleship');
  }

  function openOnboardingStep(step: (typeof CHRONICLE_ONBOARDING_STEPS)[number]) {
    if (step.path === '/settings' && step.settingsCategory) {
      setActiveCategory(step.settingsCategory);
      return;
    }
    navigate(step.path);
  }

  function openAuditDayInDiscipleship(entry: WorkbookAuditEntry, readerView: 'study' | 'workbook' = 'study') {
    setActiveOwnedBook(entry.bookId);
    setActiveTab('discipleship');
    navigate('/discipleship', {
      state: {
        requestedBookId: entry.bookId,
        requestedDay: entry.day,
        requestedReaderView: readerView,
      },
    });
  }

  function openRecordInDiscipleship(record: StudyLibraryRecord) {
    if (record.status !== 'structured') return;
    syncRecordToOwnedBook(record);
    openBookInDiscipleship(record.id);
  }

  async function startOcrJobRequest(params: {
    pdfPath: string;
    outputStem?: string;
    pageRange?: string;
    recordId?: string;
    forceOcr?: boolean;
  }) {
    const response = await fetch('/api/study-imports/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pdfPath: params.pdfPath,
        outputStem: params.outputStem,
        pageRange: params.pageRange,
        recordId: params.recordId,
        forceOcr: params.forceOcr,
      }),
    });
    const payload = await response.json() as {
      job?: {
        id: string;
        kind: 'ocr' | 'segmented' | 'import';
        label: string;
        status: 'running' | 'completed' | 'failed';
        progress: number;
        message: string;
        stdout: string;
        stderr: string;
        startedAt: string;
      };
      error?: { errmsg?: string };
    };
    if (!response.ok) throw new Error(payload.error?.errmsg || 'OCR failed.');
    setStudyImportJob(payload.job || null);
    setStudyImportLog('OCR job started…');
  }

  async function startSegmentedOcrJobRequest(params: {
    pdfPath: string;
    outputStem?: string;
    segmentSize?: number;
    recordId?: string;
    forceOcr?: boolean;
  }) {
    const response = await fetch('/api/study-imports/ocr-segmented', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pdfPath: params.pdfPath,
        outputStem: params.outputStem,
        segmentSize: params.segmentSize,
        recordId: params.recordId,
        forceOcr: params.forceOcr,
      }),
    });
    const payload = await response.json() as {
      job?: {
        id: string;
        kind: 'ocr' | 'segmented' | 'import';
        label: string;
        status: 'running' | 'completed' | 'failed';
        progress: number;
        message: string;
        stdout: string;
        stderr: string;
        startedAt: string;
      };
      error?: { errmsg?: string };
    };
    if (!response.ok) throw new Error(payload.error?.errmsg || 'Segmented OCR failed.');
    setStudyImportJob(payload.job || null);
    setStudyImportLog('Segmented OCR job started…');
  }

  async function rerunOcrForRecord(record: StudyLibraryRecord, mode: OcrRunMode = chooseOcrRepairMode(record)) {
    const derivedStem = (record.originalFileName || record.title)
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'book-import';

    hydrateRecordToForm(record);
    setStudyImportBusy(mode === 'segmented' ? 'segmented' : 'ocr');
    try {
      if (mode === 'segmented') {
        await startSegmentedOcrJobRequest({
          pdfPath: record.storedPath,
          outputStem: derivedStem,
          segmentSize: Number.parseInt(ocrSegmentSize, 10) || 20,
          recordId: record.id,
          forceOcr: true,
        });
      } else {
        await startOcrJobRequest({
          pdfPath: record.storedPath,
          outputStem: derivedStem,
          pageRange: ocrPageRange.trim() || undefined,
          recordId: record.id,
          forceOcr: true,
        });
      }
      addToast(
        mode === 'segmented' ? `Segmented OCR restarted for ${record.title}` : `OCR restarted for ${record.title}`,
        'success',
        '📘'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to restart OCR.';
      setStudyImportLog(message);
      addToast(message, 'warning', 'AI');
    } finally {
      setStudyImportBusy(null);
    }
  }

  async function runOcrImport() {
    setStudyImportBusy('ocr');
    try {
      await startOcrJobRequest({
        pdfPath: ocrPdfPath,
        outputStem: ocrStem.trim() || undefined,
        pageRange: ocrPageRange.trim() || undefined,
        recordId: libraryRecordId || undefined,
        forceOcr,
      });
    } catch (error) {
      setStudyImportLog(error instanceof Error ? error.message : 'OCR failed.');
      setStudyImportBusy(null);
    }
  }

  async function runSegmentedOcrImport() {
    setStudyImportBusy('segmented');
    try {
      await startSegmentedOcrJobRequest({
        pdfPath: ocrPdfPath,
        outputStem: ocrStem.trim() || undefined,
        segmentSize: Number.parseInt(ocrSegmentSize, 10) || 20,
        recordId: libraryRecordId || undefined,
        forceOcr,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Segmented OCR failed.';
      setStudyImportLog(message);
      addToast(message, 'warning', 'AI');
      setStudyImportBusy(null);
    }
  }

  async function recommendChunkingStrategy() {
    setStudyImportBusy('recommend');
    try {
      const response = await fetch('/api/study-imports/recommend-chunking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfPath: ocrPdfPath,
          workflow: ownedBookWorkflow,
        }),
      });
      const payload = await response.json() as {
        pageCount?: number;
        mode?: 'segmented' | 'single-pass';
        recommendedSegmentSize?: number;
        estimatedSegments?: number;
        reason?: string;
        error?: { errmsg?: string };
      };
      if (!response.ok) throw new Error(payload.error?.errmsg || 'Chunking recommendation failed.');

      const advice = {
        pageCount: payload.pageCount || 0,
        mode: payload.mode || 'segmented',
        recommendedSegmentSize: payload.recommendedSegmentSize || 20,
        estimatedSegments: payload.estimatedSegments || 1,
        reason: payload.reason || 'Chronicle recommended a chunking strategy for this book.',
      };

      setOcrChunkingAdvice(advice);
      setOcrSegmentSize(String(advice.recommendedSegmentSize));
      setStudyImportLog(
        `Recommended ${advice.mode === 'segmented' ? 'segmented OCR' : 'single-pass OCR'} for ${advice.pageCount} pages.\n` +
        `Chunk size: ${advice.recommendedSegmentSize} pages.\n` +
        `Estimated segments: ${advice.estimatedSegments}.\n` +
        `${advice.reason}`
      );
      addToast('Chunking strategy recommended', 'success', '📚');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Chunking recommendation failed.';
      setStudyImportLog(message);
      addToast(message, 'warning', 'AI');
    } finally {
      setStudyImportBusy(null);
    }
  }

  async function runMasterlifeImport() {
    setStudyImportBusy('import');
    try {
      const response = await fetch('/api/study-imports/import-masterlife', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textPath: importTextPath, recordId: libraryRecordId || undefined }),
      });
      const typedPayload = await response.json() as {
        job?: {
          id: string;
          kind: 'ocr' | 'segmented' | 'import';
          label: string;
          status: 'running' | 'completed' | 'failed';
          progress: number;
          message: string;
          stdout: string;
          stderr: string;
          startedAt: string;
        };
        error?: { errmsg?: string };
      };
      if (!response.ok) throw new Error(typedPayload.error?.errmsg || 'MasterLife import failed.');
      setStudyImportJob(typedPayload.job || null);
      setStudyImportLog('MasterLife import started…');
    } catch (error) {
      setStudyImportLog(error instanceof Error ? error.message : 'MasterLife import failed.');
      setStudyImportBusy(null);
    }
  }

  async function analyzeAndAddOwnedBook() {
    setStudyImportBusy('analyze');
    try {
      const response = await fetch('/api/discipleship/analyze-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: ownedBookTitle,
          textPath: importTextPath,
          workflow: ownedBookWorkflow,
          recordId: libraryRecordId || undefined,
        }),
      });
      const payload = await response.json() as {
        classification?: 'daily-study' | 'general-book';
        recommendedWorkflow?: 'preserve-daily' | 'ai-daily-study';
        summary?: string;
        generatedPlan?: OwnedBook['generatedPlan'];
        error?: { errmsg?: string };
      };
      if (!response.ok) throw new Error(payload.error?.errmsg || 'Book analysis failed.');

      const id = libraryRecordId || makeBookId(ownedBookTitle);
      const book: OwnedBook = {
        id,
        title: ownedBookTitle,
        sourcePath: ocrPdfPath,
        textPath: importTextPath,
        classification: payload.classification || 'general-book',
        workflow: payload.recommendedWorkflow || 'ai-daily-study',
        status: 'ready',
        summary: payload.summary || 'Imported into the Chronicle owned-books library.',
        importedAt: new Date().toISOString().split('T')[0],
        generatedPlan: payload.generatedPlan,
      };

      upsertOwnedBook(book);
      setActiveOwnedBook(id);
      setStudyImportLog(`Added ${ownedBookTitle} to your library.\n${book.summary}`);
      addToast('Book added to Discipleship', 'success', '📘');
      await refreshStudyLibrary();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Book analysis failed.';
      setStudyImportLog(message);
      addToast(message, 'warning', 'AI');
    } finally {
      setStudyImportBusy(null);
    }
  }

  useEffect(() => {
    async function loadStudyImports() {
      try {
        await refreshStudyImports();
        await refreshStudyLibrary();
        await refreshWorkbookAudit();
        await refreshBibleLibraryStatus();
        await refreshChronicleSyncStatus();
        await refreshVoicePlatform();
      } catch (error) {
        setStudyImportLog(error instanceof Error ? error.message : 'Unable to load study import status.');
      }
    }
    void loadStudyImports();
  }, [refreshBibleLibraryStatus, refreshChronicleSyncStatus, refreshStudyImports, refreshStudyLibrary, refreshVoicePlatform, refreshWorkbookAudit]);

  useEffect(() => {
    if (studyImportJob?.id) {
      window.localStorage.setItem(LAST_STUDY_IMPORT_JOB_KEY, studyImportJob.id);
      return;
    }
    window.localStorage.removeItem(LAST_STUDY_IMPORT_JOB_KEY);
  }, [studyImportJob?.id]);

  useEffect(() => {
    let cancelled = false;

    async function restoreStudyImportJob() {
      const jobId = window.localStorage.getItem(LAST_STUDY_IMPORT_JOB_KEY);
      if (!jobId) return;

      try {
        const response = await fetch(`/api/study-imports/job-status?jobId=${encodeURIComponent(jobId)}`);
        const payload = await response.json() as {
          job?: typeof studyImportJob;
          error?: { errmsg?: string };
        };

        if (!response.ok || !payload.job) {
          throw new Error(payload.error?.errmsg || 'Unable to restore study import job.');
        }

        if (cancelled) return;

        setStudyImportJob(payload.job);
        setStudyImportBusy(payload.job.status === 'running' ? payload.job.kind : null);
        setStudyImportLog([payload.job.stdout, payload.job.stderr, payload.job.error].filter(Boolean).join('\n').trim());

        const result = payload.job.result || {};
        const nextTextPath =
          (typeof result.fullTextPath === 'string' && result.fullTextPath) ||
          (typeof result.textPath === 'string' && result.textPath) ||
          null;
        if (nextTextPath) {
          setImportTextPath(nextTextPath);
        }
      } catch {
        if (!cancelled) {
          window.localStorage.removeItem(LAST_STUDY_IMPORT_JOB_KEY);
        }
      }
    }

    void restoreStudyImportJob();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const requestedCategory = getRequestedSettingsCategory(location.state);
    if (requestedCategory && requestedCategory !== activeCategory) {
      const frame = window.requestAnimationFrame(() => setActiveCategory(requestedCategory));
      return () => window.cancelAnimationFrame(frame);
    }
  }, [activeCategory, location.state]);

  useEffect(() => {
    if (!studyImportJob || studyImportJob.status !== 'running') return;

    const interval = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/study-imports/job-status?jobId=${encodeURIComponent(studyImportJob.id)}`);
        const payload = await response.json() as {
          job?: typeof studyImportJob;
          error?: { errmsg?: string };
        };
        if (!response.ok || !payload.job) {
          throw new Error(payload.error?.errmsg || 'Unable to load job status.');
        }

        setStudyImportJob(payload.job);
        setStudyImportLog([payload.job.stdout, payload.job.stderr, payload.job.error].filter(Boolean).join('\n').trim());

        if (payload.job.status !== 'running') {
          window.clearInterval(interval);
          setStudyImportBusy(null);
          await refreshStudyImports();
          await refreshStudyLibrary();
          await refreshWorkbookAudit();

          const result = payload.job.result || {};
          const nextTextPath =
            (typeof result.fullTextPath === 'string' && result.fullTextPath) ||
            (typeof result.textPath === 'string' && result.textPath) ||
            null;
          if (nextTextPath) {
            setImportTextPath(nextTextPath);
          }

          if (payload.job.status === 'completed') {
            addToast(`${payload.job.label} finished`, 'success', payload.job.kind === 'segmented' ? '📚' : 'AI');
          } else {
            addToast(payload.job.error || `${payload.job.label} failed`, 'warning', 'AI');
          }
        }
      } catch (error) {
        window.clearInterval(interval);
        setStudyImportBusy(null);
        const message = error instanceof Error ? error.message : 'Unable to track import progress.';
        setStudyImportLog(message);
        addToast(message, 'warning', 'AI');
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [studyImportJob, addToast, refreshStudyImports, refreshStudyLibrary, refreshWorkbookAudit]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: isCompact ? 'column' : 'row', overflow: 'hidden' }}>

      {/* Category nav */}
      <nav
        aria-label="Settings sections"
        style={{ width: isCompact ? '100%' : 196, minWidth: isCompact ? 0 : 196, background: 'var(--card-bg)', borderRight: isCompact ? 'none' : '1px solid var(--border)', borderBottom: isCompact ? '1px solid var(--border)' : 'none', display: 'flex', flexDirection: isCompact ? 'row' : 'column', overflowX: isCompact ? 'auto' : 'hidden', overflowY: 'hidden', padding: isCompact ? '10px 10px 12px' : '12px 0', gap: isCompact ? 6 : 0 }}
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            aria-current={activeCategory === cat.id ? 'page' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: isCompact ? '8px 12px' : '7px 16px',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: activeCategory === cat.id ? 600 : 400,
              color: activeCategory === cat.id ? 'var(--accent-green)' : 'var(--text-sub)',
              background: activeCategory === cat.id ? 'var(--accent-green-light)' : 'transparent',
              transition: 'all 0.1s',
              borderRadius: isCompact ? 999 : 0,
              border: isCompact ? '1px solid var(--border)' : 'none',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              width: isCompact ? 'auto' : '100%',
              textAlign: 'left',
              appearance: 'none',
            }}
          >
            <span style={{ fontSize: 14 }}>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </nav>

      {/* Settings content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isPhone ? '14px 14px' : '14px 24px', background: 'var(--card-bg)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 2, gap: 10, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{CATEGORIES.find(c => c.id === activeCategory)?.label}</div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)' }} />
            Changes saved automatically
          </div>
        </div>

        <div style={{ padding: isPhone ? '16px 14px 32px' : '20px 24px 40px' }}>

          {activeCategory === 'profile' && (
            <>
              <Group>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
                  <img
                    src="/chronicle-icon.png"
                    alt="Chronicle"
                    style={{ width: 52, height: 52, borderRadius: 14, objectFit: 'cover', flexShrink: 0, boxShadow: '0 4px 14px rgba(15, 79, 207, 0.14)' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Chris</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>cbinion73@gmail.com</div>
                  </div>
                </div>
                <SettingRow label="Display Name" desc="Used in greetings and Legacy memoir">
                  <input defaultValue="Chris" style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, background: 'var(--card-inner)', color: 'var(--text)', minWidth: 160, outline: 'none' }} />
                </SettingRow>
              </Group>
              <Group>
                <GroupHeader title="Devotional Identity" desc="Shapes how Chronicle addresses your journey" />
                <SettingRow label="Faith Tradition" desc="Informs theological defaults in AI responses">
                  <Sel options={['Evangelical Protestant', 'Reformed', 'Catholic', 'Anglican', 'Lutheran', 'Other']} value="Evangelical Protestant" onChange={() => {}} />
                </SettingRow>
                <SettingRow label="Spiritual Season" desc="Helps the companion meet you where you are">
                  <Sel options={['Seeking', 'Growing', 'Questioning', 'Resting', 'Suffering', 'Renewed']} value="Seeking" onChange={() => {}} />
                </SettingRow>
              </Group>
            </>
          )}

          {activeCategory === 'scripture' && (
            <>
              <Group>
                <GroupHeader title="Translation" />
                <SettingRow label="Default Translation" desc="Used for daily focus and AI companion responses">
                  <Sel options={['NKJV', 'CSB', 'AMP', 'KJV', 'ESV', 'NIV', 'NASB', 'NLT']} value={translation} onChange={setTranslation} />
                </SettingRow>
                <SettingRow label="Parallel Translation" desc="Show a second translation alongside the primary">
                  <Sel options={['None', 'NIV', 'NASB', 'KJV', 'MSG']} value="None" onChange={() => {}} />
                </SettingRow>
              </Group>
              <Group>
                <GroupHeader title="Reading Display" />
                <SettingRow label="Verse Numbers" desc="Show inline verse numbers while reading">
                  <Toggle checked={toggles.verseNumbers} onChange={() => toggle('verseNumbers')} />
                </SettingRow>
                <SettingRow label="Red Letter Edition" desc="Highlight words of Christ in red">
                  <Toggle checked={toggles.redLetter} onChange={() => toggle('redLetter')} />
                </SettingRow>
                <SettingRow label="Paragraph View" desc="Display Scripture in prose paragraphs">
                  <Toggle checked={toggles.paragraphView} onChange={() => toggle('paragraphView')} />
                </SettingRow>
              </Group>
              <Group>
                <GroupHeader title="Chronicle Bible Library" desc="Local translations and theme-analysis coverage currently installed inside Chronicle." />
                <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {bibleLibraryStatus.length} installed translation{bibleLibraryStatus.length === 1 ? '' : 's'} · {fullyCachedTranslations} fully cached · {themeCacheFileCount} saved chapter analyses
                    {themeCacheVersion ? ` · cache version ${themeCacheVersion}` : ''}
                  </div>
                  <button
                    onClick={() => void refreshBibleLibraryStatus()}
                    disabled={bibleLibraryBusy}
                    style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card-inner)', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: bibleLibraryBusy ? 'default' : 'pointer', opacity: bibleLibraryBusy ? 0.6 : 1 }}
                  >
                    {bibleLibraryBusy ? 'Refreshing…' : 'Refresh Bible Library'}
                  </button>
                </div>
                <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Theme Analysis Cache</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        Chronicle can precompute chapter analysis for a translation so Bible study loads instantly and reuses the saved map.
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <select
                        value={themeCacheTargetTranslation}
                        onChange={(e) => setThemeCacheTargetTranslation(e.target.value)}
                        style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, background: 'var(--card-inner)', color: 'var(--text)', outline: 'none' }}
                      >
                        <option value="all">All installed</option>
                        {bibleLibraryStatus.map((item) => (
                          <option key={item.id} value={item.id}>{item.translation}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => void precomputeThemeCache(false)}
                        disabled={themeCacheBusy}
                        style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card-inner)', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: themeCacheBusy ? 'default' : 'pointer', opacity: themeCacheBusy ? 0.6 : 1 }}
                      >
                        {themeCacheBusy ? 'Building…' : 'Build Missing Analyses'}
                      </button>
                      <button
                        onClick={() => void precomputeThemeCache(true)}
                        disabled={themeCacheBusy}
                        style={{ padding: '8px 14px', border: 'none', borderRadius: 8, background: 'var(--accent-blue)', color: 'white', fontSize: 12, fontWeight: 700, cursor: themeCacheBusy ? 'default' : 'pointer', opacity: themeCacheBusy ? 0.6 : 1 }}
                      >
                        Rebuild Selected
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {bibleLibraryStatus.length > 0 ? bibleLibraryStatus.map((item) => (
                      <div key={item.id} style={{ padding: '12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-inner)', display: 'grid', gap: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.translation}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.sourceLabel || item.label}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Provider route: {item.providerId}</div>
                          </div>
                          <span style={{ padding: '4px 8px', borderRadius: 999, border: '1px solid var(--border)', background: item.coveragePct >= 100 ? 'var(--accent-green-light)' : 'rgba(15, 79, 207, 0.08)', color: item.coveragePct >= 100 ? 'var(--accent-green)' : 'var(--accent-blue)', fontSize: 11, fontWeight: 700 }}>
                            {item.cachedCount}/{item.chapterCount || 0} cached · {item.coveragePct}%
                          </span>
                        </div>
                        <div style={{ height: 8, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.max(2, item.coveragePct)}%`, height: '100%', borderRadius: 999, background: item.coveragePct >= 100 ? 'var(--accent-green)' : 'var(--accent-blue)' }} />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                          {item.chapterCount > 0
                            ? `${item.chapterCount} chapters in the local library. ${item.attribution || 'Chronicle can reuse these analyses once they are built.'}`
                            : 'Chapter metadata is incomplete for this local translation.'}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => setBibleView({ provider: item.providerId })}
                            style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, background: bibleView.provider === item.providerId ? 'var(--accent-green-light)' : 'transparent', color: bibleView.provider === item.providerId ? 'var(--accent-green)' : 'var(--text-sub)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                          >
                            {bibleView.provider === item.providerId ? 'Default Reader Provider' : 'Use as Reader Provider'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void buildThemeCacheForTranslation(item.id, false)}
                            disabled={themeCacheBusy}
                            style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--text-sub)', fontSize: 12, fontWeight: 700, cursor: themeCacheBusy ? 'default' : 'pointer', opacity: themeCacheBusy ? 0.6 : 1 }}
                          >
                            Build Missing
                          </button>
                          <button
                            type="button"
                            onClick={() => void buildThemeCacheForTranslation(item.id, true)}
                            disabled={themeCacheBusy}
                            style={{ padding: '7px 12px', border: 'none', borderRadius: 8, background: 'var(--accent-blue)', color: 'white', fontSize: 12, fontWeight: 700, cursor: themeCacheBusy ? 'default' : 'pointer', opacity: themeCacheBusy ? 0.6 : 1 }}
                          >
                            Rebuild
                          </button>
                        </div>
                      </div>
                    )) : (
                      <div style={{ padding: '12px', borderRadius: 10, border: '1px dashed var(--border)', background: 'var(--card-inner)', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        Chronicle has not loaded any local Bible library metadata yet.
                      </div>
                    )}
                  </div>
                </div>
              </Group>
            </>
          )}

          {activeCategory === 'ai' && (
            <>
              <Group>
                <GroupHeader title="Companion Roles" desc="Choose the default Chronicle role and persona posture for new AI threads." />
                <SettingRow label="Default Agent Role" desc="This becomes the starting role whenever a new page thread opens.">
                  <Sel
                    options={Object.values(CHRONICLE_AGENT_MODE_DEFS).map((mode) => mode.label)}
                    value={CHRONICLE_AGENT_MODE_DEFS[selectedAgentMode].label}
                    onChange={(value) => {
                      const match = Object.entries(CHRONICLE_AGENT_MODE_DEFS).find(([, mode]) => mode.label === value)?.[0] as ChronicleAgentMode | undefined;
                      if (match) setSelectedAgentMode(match);
                    }}
                  />
                </SettingRow>
                <SettingRow label="Default Persona" desc="Shapes the voice, structure, and emphasis of Chronicle responses.">
                  <Sel
                    options={Object.values(CHRONICLE_PERSONAS).map((persona) => persona.label)}
                    value={CHRONICLE_PERSONAS[selectedPersona].label}
                    onChange={(value) => {
                      const match = Object.values(CHRONICLE_PERSONAS).find((persona) => persona.label === value);
                      if (match) setSelectedPersona(match.id as ChroniclePersonaId);
                    }}
                  />
                </SettingRow>
                <div style={{ padding: '13px 18px', borderTop: '1px solid var(--border)', display: 'grid', gap: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Chronicle currently remembers {aiThreadCount} context thread{aiThreadCount === 1 ? '' : 's'} across Bible, Study, Discipleship, Prayer, and Chronicle.
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {Object.entries(CHRONICLE_AGENT_MODE_DEFS).map(([id, mode]) => (
                      <div key={id} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: selectedAgentMode === id ? 'var(--accent-green-light)' : 'var(--card-inner)', display: 'grid', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{mode.label}</div>
                          {selectedAgentMode === id && (
                            <span style={{ padding: '4px 8px', borderRadius: 999, border: '1px solid var(--accent-green)', color: 'var(--accent-green)', fontSize: 10, fontWeight: 700 }}>
                              Default
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.5 }}>{mode.summary}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Group>
              <Group>
                <GroupHeader title="Voice Platform" desc="Chronicle can use local Whisper and Piper directly, bridge to Home Assistant voice services, and mint LiveKit session tokens from your local backend." />
                <SettingRow label="Voice Companion" desc="Turns on voice capture and spoken playback controls inside Chronicle AI.">
                  <Toggle checked={voiceConfig.enabled} onChange={() => updateVoiceConfig({ enabled: !voiceConfig.enabled })} />
                </SettingRow>
                <SettingRow label="Speech-to-Text Provider" desc="Use local Whisper directly or point Chronicle at a LocalAI-compatible OpenAI transcription endpoint.">
                  <Sel
                    options={['Whisper CLI', 'LocalAI / OpenAI-compatible']}
                    value={voiceConfig.transcriptionProvider === 'whisper-cli' ? 'Whisper CLI' : 'LocalAI / OpenAI-compatible'}
                    onChange={(value) => updateVoiceConfig({ transcriptionProvider: value === 'LocalAI / OpenAI-compatible' ? 'localai-openai' : 'whisper-cli' })}
                  />
                </SettingRow>
                <SettingRow label="Text-to-Speech Provider" desc="Use Piper locally on this machine or tell Home Assistant to speak on a remote device.">
                  <Sel
                    options={['Piper CLI', 'Home Assistant TTS']}
                    value={voiceConfig.synthesisProvider === 'piper-cli' ? 'Piper CLI' : 'Home Assistant TTS'}
                    onChange={(value) => updateVoiceConfig({ synthesisProvider: value === 'Home Assistant TTS' ? 'home-assistant-tts' : 'piper-cli' })}
                  />
                </SettingRow>
                <SettingRow label="Realtime Session Provider" desc="Use LiveKit when you want room-based multi-device voice sessions instead of local push-to-talk.">
                  <Sel
                    options={['None', 'LiveKit']}
                    value={voiceConfig.realtimeProvider === 'livekit' ? 'LiveKit' : 'None'}
                    onChange={(value) => updateVoiceConfig({ realtimeProvider: value === 'LiveKit' ? 'livekit' : 'none' })}
                  />
                </SettingRow>
                <SettingRow label="Automation Bridge" desc="Let Chronicle hand voice actions to Home Assistant without moving your notes out of the app.">
                  <Sel
                    options={['None', 'Home Assistant']}
                    value={voiceConfig.automationProvider === 'home-assistant' ? 'Home Assistant' : 'None'}
                    onChange={(value) => updateVoiceConfig({ automationProvider: value === 'Home Assistant' ? 'home-assistant' : 'none' })}
                  />
                </SettingRow>
                <SettingRow label="Auto-speak Responses" desc="When enabled, Chronicle can speak the current AI reply after you ask.">
                  <Toggle checked={voiceConfig.autoSpeakResponses} onChange={() => updateVoiceConfig({ autoSpeakResponses: !voiceConfig.autoSpeakResponses })} />
                </SettingRow>
                <SettingRow label="Keep Voice Transcripts Chronicle-Ready" desc="Voice transcripts are treated like normal Chronicle text so they can be saved, prayed, and reflected on.">
                  <Toggle checked={voiceConfig.saveVoiceTranscriptsToChronicle} onChange={() => updateVoiceConfig({ saveVoiceTranscriptsToChronicle: !voiceConfig.saveVoiceTranscriptsToChronicle })} />
                </SettingRow>
                <div style={{ padding: '13px 18px', borderTop: '1px solid var(--border)', display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      Server-side secrets stay in environment variables. Chronicle stores only the local routing and model choices in app state.
                    </div>
                    <button
                      type="button"
                      onClick={() => void refreshVoicePlatform()}
                      disabled={voiceStatusBusy}
                      style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card-inner)', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: voiceStatusBusy ? 'default' : 'pointer', opacity: voiceStatusBusy ? 0.6 : 1 }}
                    >
                      {voiceStatusBusy ? 'Refreshing…' : 'Refresh Voice Status'}
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isPhone ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                    {[
                      {
                        label: 'Whisper',
                        summary: voiceStatus?.whisperCli.available ? `CLI ready · ${voiceStatus.whisperCli.command}` : 'CLI not detected yet',
                        ready: Boolean(voiceStatus?.whisperCli.available),
                      },
                      {
                        label: 'Piper',
                        summary: voiceStatus?.piper.modelConfigured ? 'Model path configured' : 'Model path still needed',
                        ready: Boolean(voiceStatus?.piper.available && voiceStatus?.piper.modelConfigured),
                      },
                      {
                        label: 'Home Assistant',
                        summary: voiceStatus?.homeAssistant.configured ? 'Remote automation bridge reachable' : 'Base URL or token missing',
                        ready: Boolean(voiceStatus?.homeAssistant.configured),
                      },
                      {
                        label: 'LiveKit',
                        summary: voiceStatus?.liveKit.configured ? 'Token service ready' : 'URL or server secrets missing',
                        ready: Boolean(voiceStatus?.liveKit.configured),
                      },
                    ].map((item) => (
                      <div key={item.label} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-inner)', display: 'grid', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{item.label}</div>
                          <span style={{ padding: '4px 8px', borderRadius: 999, border: `1px solid ${item.ready ? 'rgba(6,95,70,0.24)' : 'rgba(180,83,9,0.24)'}`, background: item.ready ? 'rgba(6,95,70,0.08)' : 'rgba(217,119,6,0.08)', color: item.ready ? '#065f46' : '#b45309', fontSize: 10, fontWeight: 700 }}>
                            {item.ready ? 'Ready' : 'Needs setup'}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.5 }}>{item.summary}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Group>
              <Group>
                <GroupHeader title="Whisper and Piper" desc="These settings drive Chronicle’s direct local STT/TTS path when you want private push-to-talk on the Mac itself." />
                <SettingRow label="Whisper Command" desc="Examples: whisper, python3 -m whisper">
                  <TextInput value={voiceConfig.whisperCli.command} onChange={(value) => updateVoiceConfig({ whisperCli: { command: value } })} />
                </SettingRow>
                <SettingRow label="Whisper Model" desc="Chronicle sends this to the CLI or LocalAI transcription endpoint.">
                  <TextInput value={voiceConfig.whisperCli.model} onChange={(value) => updateVoiceConfig({ whisperCli: { model: value } })} />
                </SettingRow>
                <SettingRow label="Whisper Language" desc="Use auto to let Whisper detect, or force a code like en.">
                  <TextInput value={voiceConfig.whisperCli.language} onChange={(value) => updateVoiceConfig({ whisperCli: { language: value } })} />
                </SettingRow>
                <SettingRow label="Translate to English" desc="Useful when the local Whisper run should normalize multilingual speech into English text.">
                  <Toggle checked={voiceConfig.whisperCli.translateToEnglish} onChange={() => updateVoiceConfig({ whisperCli: { translateToEnglish: !voiceConfig.whisperCli.translateToEnglish } })} />
                </SettingRow>
                <SettingRow label="LocalAI Base URL" desc="Used when you prefer an OpenAI-compatible local transcription server over the Whisper CLI.">
                  <TextInput value={voiceConfig.localAi.baseUrl} onChange={(value) => updateVoiceConfig({ localAi: { baseUrl: value } })} />
                </SettingRow>
                <SettingRow label="LocalAI Whisper Model" desc="Chronicle posts this model name to /v1/audio/transcriptions.">
                  <TextInput value={voiceConfig.localAi.whisperModel} onChange={(value) => updateVoiceConfig({ localAi: { whisperModel: value } })} />
                </SettingRow>
                <SettingRow label="Piper Command" desc="Examples: piper, /opt/homebrew/bin/piper">
                  <TextInput value={voiceConfig.piper.command} onChange={(value) => updateVoiceConfig({ piper: { command: value } })} />
                </SettingRow>
                <SettingRow label="Piper Model Path" desc="Point at the .onnx model you want Chronicle to speak with.">
                  <TextInput value={voiceConfig.piper.modelPath} onChange={(value) => updateVoiceConfig({ piper: { modelPath: value } })} />
                </SettingRow>
                <SettingRow label="Piper Speaker" desc="For multi-speaker Piper models, choose the speaker index.">
                  <TextInput value={voiceConfig.piper.speaker} onChange={(value) => updateVoiceConfig({ piper: { speaker: Number(value) || 0 } })} type="number" />
                </SettingRow>
              </Group>
              <Group>
                <GroupHeader title="Home Assistant Bridge" desc="Use Home Assistant for whole-home announcements, Assist conversations, and automations that should sit next to Chronicle instead of inside it." />
                <SettingRow label="Home Assistant URL" desc="The local or remote base URL for your Home Assistant instance.">
                  <TextInput value={voiceConfig.homeAssistant.baseUrl} onChange={(value) => updateVoiceConfig({ homeAssistant: { baseUrl: value } })} />
                </SettingRow>
                <SettingRow label="Conversation Agent" desc="Defaults to Home Assistant’s built-in conversation agent unless you route it elsewhere.">
                  <TextInput value={voiceConfig.homeAssistant.conversationAgentId} onChange={(value) => updateVoiceConfig({ homeAssistant: { conversationAgentId: value } })} />
                </SettingRow>
                <SettingRow label="TTS Entity" desc="Chronicle will target this entity when using Home Assistant TTS.">
                  <TextInput value={voiceConfig.homeAssistant.ttsEntityId} onChange={(value) => updateVoiceConfig({ homeAssistant: { ttsEntityId: value } })} />
                </SettingRow>
                <SettingRow label="Media Player Entity" desc="Home Assistant will speak on this device when Chronicle asks it to announce something.">
                  <TextInput value={voiceConfig.homeAssistant.mediaPlayerEntityId} onChange={(value) => updateVoiceConfig({ homeAssistant: { mediaPlayerEntityId: value } })} />
                </SettingRow>
                <SettingRow label="Preferred Language" desc="Chronicle passes this through to Home Assistant conversation and TTS calls.">
                  <TextInput value={voiceConfig.homeAssistant.preferredLanguage} onChange={(value) => updateVoiceConfig({ homeAssistant: { preferredLanguage: value } })} />
                </SettingRow>
                <div style={{ padding: '13px 18px', borderTop: '1px solid var(--border)', display: 'grid', gap: 10 }}>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Test Home Assistant Conversation</div>
                    <textarea
                      value={homeAssistantPrompt}
                      onChange={(event) => setHomeAssistantPrompt(event.target.value)}
                      style={{ minHeight: 84, resize: 'vertical', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--card-inner)', color: 'var(--text)' }}
                    />
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => void testHomeAssistantVoice()}
                        disabled={voiceActionBusy === 'home-assistant'}
                        style={{ padding: '8px 14px', border: 'none', borderRadius: 8, background: 'var(--accent-blue)', color: 'white', fontSize: 12, fontWeight: 700, cursor: voiceActionBusy === 'home-assistant' ? 'default' : 'pointer', opacity: voiceActionBusy === 'home-assistant' ? 0.7 : 1 }}
                      >
                        {voiceActionBusy === 'home-assistant' ? 'Testing…' : 'Test Home Assistant'}
                      </button>
                    </div>
                    {homeAssistantReply && (
                      <div style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-inner)', fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.6 }}>
                        {homeAssistantReply}
                      </div>
                    )}
                  </div>
                </div>
              </Group>
              <Group>
                <GroupHeader title="LiveKit Sessions" desc="Chronicle can mint room tokens locally so your phone, iPad, and desktop can join the same voice session when you are ready." />
                <SettingRow label="LiveKit URL" desc="Usually wss://... for cloud or ws://... for your own deployment.">
                  <TextInput value={voiceConfig.liveKit.url} onChange={(value) => updateVoiceConfig({ liveKit: { url: value } })} />
                </SettingRow>
                <SettingRow label="Room Name" desc="The Chronicle voice room to join.">
                  <TextInput value={voiceConfig.liveKit.roomName} onChange={(value) => updateVoiceConfig({ liveKit: { roomName: value } })} />
                </SettingRow>
                <SettingRow label="Participant Name" desc="Used as the client identity when Chronicle asks for a token.">
                  <TextInput value={voiceConfig.liveKit.participantName} onChange={(value) => updateVoiceConfig({ liveKit: { participantName: value } })} />
                </SettingRow>
                <SettingRow label="Agent Name" desc="A human-friendly name for the Chronicle voice worker you intend to connect later.">
                  <TextInput value={voiceConfig.liveKit.agentName} onChange={(value) => updateVoiceConfig({ liveKit: { agentName: value } })} />
                </SettingRow>
                <SettingRow label="Token TTL (minutes)" desc="Short-lived session tokens are safer for mobile voice joins.">
                  <TextInput value={voiceConfig.liveKit.tokenTtlMinutes} onChange={(value) => updateVoiceConfig({ liveKit: { tokenTtlMinutes: Number(value) || 10 } })} type="number" />
                </SettingRow>
                <div style={{ padding: '13px 18px', borderTop: '1px solid var(--border)', display: 'grid', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => void generateVoiceSessionToken()}
                    disabled={voiceActionBusy === 'livekit'}
                    style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card-inner)', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: voiceActionBusy === 'livekit' ? 'default' : 'pointer', opacity: voiceActionBusy === 'livekit' ? 0.7 : 1, justifySelf: 'start' }}
                  >
                    {voiceActionBusy === 'livekit' ? 'Generating…' : 'Generate LiveKit Session Token'}
                  </button>
                  {liveKitPreview && (
                    <div style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-inner)', display: 'grid', gap: 4 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-sub)' }}>URL: <strong style={{ color: 'var(--text)' }}>{liveKitPreview.url}</strong></div>
                      <div style={{ fontSize: 11, color: 'var(--text-sub)' }}>Room: <strong style={{ color: 'var(--text)' }}>{liveKitPreview.roomName}</strong></div>
                      <div style={{ fontSize: 11, color: 'var(--text-sub)' }}>Participant: <strong style={{ color: 'var(--text)' }}>{liveKitPreview.participantName}</strong></div>
                      <div style={{ fontSize: 11, color: 'var(--text-sub)' }}>Agent: <strong style={{ color: 'var(--text)' }}>{liveKitPreview.agentName}</strong></div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>Chronicle keeps the full token only in-memory. This preview confirms your backend can mint one safely.</div>
                    </div>
                  )}
                </div>
              </Group>
              <Group>
                <GroupHeader title="Theological Integrity" desc="Chronicle never generates Scripture from memory. All verses are retrieved from verified sources." />
                <SettingRow label="Require Citations on All Responses" desc="Every AI answer must include a provenance label">
                  <Toggle checked={toggles.citations} onChange={() => toggle('citations')} />
                </SettingRow>
                <SettingRow label="Show Confidence Tier on Passages" desc="Display Explicit / Strong / Inferred / Debated badges">
                  <Toggle checked={toggles.confidenceBadges} onChange={() => toggle('confidenceBadges')} />
                </SettingRow>
                <SettingRow label="Flag Theological Disagreement" desc="When scholars disagree, the companion says so">
                  <Toggle checked={toggles.flagDisagreement} onChange={() => toggle('flagDisagreement')} />
                </SettingRow>
                <SettingRow label="Allow Pastoral Reflection" desc="Companion may offer devotional commentary alongside citations">
                  <Toggle checked={toggles.pastoralReflection} onChange={() => toggle('pastoralReflection')} />
                </SettingRow>
              </Group>
              <Group>
                <GroupHeader title="Response Style" />
                <SettingRow label="Companion Tone">
                  <Sel options={['Warm & Pastoral', 'Scholarly & Grounded', 'Brief & Direct', 'Contemplative']} value="Scholarly & Grounded" onChange={() => {}} />
                </SettingRow>
                <SettingRow label="Use My Chronicle as Context" desc="Companion can reference your past entries when relevant">
                  <Toggle checked={toggles.chronicleContext} onChange={() => toggle('chronicleContext')} />
                </SettingRow>
              </Group>
              <Group>
                <GroupHeader title="Provider Routing" desc="Control the primary local sources Chronicle will favor for Bible reading and AI-grounded responses." />
                <SettingRow label="Bible Reader Provider" desc="Sets the default local provider when opening the Bible tab.">
                  <Sel
                    options={bibleLibraryStatus.map((item) => `${item.translation} · ${item.providerId}`)}
                    value={(bibleLibraryStatus.find((item) => item.providerId === bibleView.provider) && `${bibleLibraryStatus.find((item) => item.providerId === bibleView.provider)?.translation} · ${bibleView.provider}`) || `${translation} · ${bibleView.provider}`}
                    onChange={(value) => {
                      const providerId = value.split(' · ').slice(1).join(' · ');
                      setBibleView({ provider: providerId });
                    }}
                  />
                </SettingRow>
                <SettingRow label="Response Translation" desc="The default translation Chronicle quotes when the current page does not override it.">
                  <Sel options={['NKJV', 'CSB', 'AMP', 'KJV', 'ESV', 'NIV', 'NASB', 'NLT']} value={translation} onChange={setTranslation} />
                </SettingRow>
                <div style={{ padding: '13px 18px', borderTop: '1px solid var(--border)', display: 'grid', gap: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: isPhone ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                    <div style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-inner)' }}>
                      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{bibleLibraryStatus.length}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>Installed providers</div>
                    </div>
                    <div style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-inner)' }}>
                      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{fullyCachedTranslations}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>Fully cached translations</div>
                    </div>
                    <div style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-inner)' }}>
                      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{themeCacheFileCount}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>Saved analyses</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Chronicle is currently routing Bible reading through <strong>{bibleView.provider}</strong> and AI default quotations through <strong>{translation}</strong>.
                  </div>
                </div>
              </Group>
            </>
          )}

          {activeCategory === 'chronicle' && (
            <>
              <Group>
                <GroupHeader title="Auto-Capture" desc="Chronicle records automatically at these moments — you can review or delete any entry" />
                <SettingRow label="Scripture Reading" desc="Capture passage + duration when you finish reading">
                  <Toggle checked={toggles.captureReading} onChange={() => toggle('captureReading')} />
                </SettingRow>
                <SettingRow label="Prayer Completion" desc="Log a brief prayer summary when you close Prayer tab">
                  <Toggle checked={toggles.capturePrayer} onChange={() => toggle('capturePrayer')} />
                </SettingRow>
                <SettingRow label="AI Companion Exchanges" desc="Save notable questions and answers to Chronicle">
                  <Toggle checked={toggles.captureAI} onChange={() => toggle('captureAI')} />
                </SettingRow>
                <SettingRow label="Plan Milestones" desc="Record when you complete reading plan chapters">
                  <Toggle checked={toggles.captureMilestones} onChange={() => toggle('captureMilestones')} />
                </SettingRow>
                <SettingRow label="Return After Absence" desc="Note when you return after 3+ days away">
                  <Toggle checked={toggles.captureReturn} onChange={() => toggle('captureReturn')} />
                </SettingRow>
              </Group>
              <Group>
                <GroupHeader title="Privacy" />
                <SettingRow label="Lock Chronicle" desc="Require device authentication to view entries">
                  <Toggle checked={toggles.lockChronicle} onChange={() => toggle('lockChronicle')} />
                </SettingRow>
              </Group>
            </>
          )}

          {activeCategory === 'formation' && (
            <>
              <Group>
                <GroupHeader title="Dimensions to Track" />
                {[
                  { key: 'scripture' as const, label: '📖 Scripture Engagement' },
                  { key: 'prayer' as const, label: '🙏 Prayer' },
                  { key: 'obedience' as const, label: '✅ Obedience Moments' },
                  { key: 'gratitude' as const, label: '🤲 Gratitude' },
                  { key: 'worship' as const, label: '🎵 Worship' },
                ].map((d) => (
                  <SettingRow key={d.key} label={d.label}>
                    <Toggle checked={toggles[d.key]} onChange={() => toggle(d.key)} />
                  </SettingRow>
                ))}
              </Group>
              <Group>
                <GroupHeader title="Language Analysis" desc="NLP scan of your Chronicle entries for formation-arc language signals" />
                <SettingRow label="Formation Arc Analysis" desc="Track trust and surrender language frequency over time">
                  <Toggle checked={toggles.languageAnalysis} onChange={() => toggle('languageAnalysis')} />
                </SettingRow>
                <SettingRow label="Pattern Detection" desc="Surface recurring themes and return signals">
                  <Toggle checked={toggles.patternDetection} onChange={() => toggle('patternDetection')} />
                </SettingRow>
                <SettingRow label='Show "Language is a signal" caveat'>
                  <Toggle checked={toggles.formationCaveat} onChange={() => toggle('formationCaveat')} />
                </SettingRow>
              </Group>
            </>
          )}

          {activeCategory === 'appearance' && (
            <>
              <Group>
                <GroupHeader title="Color Mode" />
                <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Interface Theme</div>
                  <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                    {(['light', 'dark'] as const).map((t, i) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        style={{
                          padding: '5px 14px',
                          fontSize: 12,
                          fontWeight: theme === t ? 600 : 400,
                          background: theme === t ? 'var(--accent-green)' : 'transparent',
                          color: theme === t ? 'white' : 'var(--text-sub)',
                          border: 'none',
                          borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
                          cursor: 'pointer',
                          textTransform: 'capitalize',
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </Group>
              <Group>
                <GroupHeader title="Typography" />
                <SettingRow label="Scripture & Journal Font" desc="Used for all devotional content">
                  <Sel options={['Georgia (Serif)', 'Palatino', 'System Sans']} value="Georgia (Serif)" onChange={() => {}} />
                </SettingRow>
              </Group>
            </>
          )}

          {activeCategory === 'notifications' && (
            <>
              <Group>
                <GroupHeader title="Daily Reminder" />
                <SettingRow label="Morning Reminder" desc="Gentle nudge to open Chronicle">
                  <Toggle checked={toggles.morningReminder} onChange={() => toggle('morningReminder')} />
                </SettingRow>
                <SettingRow label="Reminder Time">
                  <input type="time" defaultValue="06:30" style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, background: 'var(--card-inner)', color: 'var(--text)', outline: 'none', width: 100 }} />
                </SettingRow>
                <SettingRow label="Evening Reflection Prompt" desc="End-of-day nudge to record a Chronicle entry">
                  <Toggle checked={toggles.eveningPrompt} onChange={() => toggle('eveningPrompt')} />
                </SettingRow>
              </Group>
              <Group>
                <GroupHeader title="Streak & Milestones" />
                <SettingRow label="Streak At-Risk Warning" desc="Notify when streak could break today">
                  <Toggle checked={toggles.streakWarning} onChange={() => toggle('streakWarning')} />
                </SettingRow>
                <SettingRow label="Plan Milestone Celebrations">
                  <Toggle checked={toggles.milestones} onChange={() => toggle('milestones')} />
                </SettingRow>
              </Group>
            </>
          )}

          {activeCategory === 'data' && (
            <>
              <Group>
                <GroupHeader title="Storage" />
                <SettingRow label="Chronicle Library" desc="Local-first study state, notes, and imported book metadata live in Chronicle's private workspace">
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{chronicleEntries.length} entries</span>
                </SettingRow>
                <SettingRow label="Scripture Library" desc="Installed local Bible translations for offline reading across devices later">
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{translation}</span>
                </SettingRow>
              </Group>
              <Group>
                <GroupHeader title="Data Health Center" desc="See the main operational queues Chronicle is watching and run the next repair step from one place." />
                <div style={{ padding: '13px 18px', display: 'grid', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                    {[
                      { label: 'Cache gaps', value: dataHealthSummary.cacheGaps },
                      { label: 'OCR repair queue', value: dataHealthSummary.ocrRepairQueue },
                      { label: 'Workbook flags', value: dataHealthSummary.workbookFlags },
                      { label: 'Low source-health books', value: dataHealthSummary.lowSourceHealthRecords },
                    ].map((item) => (
                      <div key={item.label} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--card-inner)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{item.value}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{item.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => nextTranslationNeedingCache && void buildThemeCacheForTranslation(nextTranslationNeedingCache.id, false)}
                      disabled={!nextTranslationNeedingCache || themeCacheBusy}
                      style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card-inner)', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: !nextTranslationNeedingCache || themeCacheBusy ? 'default' : 'pointer', opacity: !nextTranslationNeedingCache || themeCacheBusy ? 0.6 : 1 }}
                    >
                      {nextTranslationNeedingCache ? `Build ${nextTranslationNeedingCache.translation} Cache` : 'Bible Cache Healthy'}
                    </button>
                    <button
                      type="button"
                      onClick={() => nextOcrRepairRecord && void rerunOcrForRecord(nextOcrRepairRecord, chooseOcrRepairMode(nextOcrRepairRecord))}
                      disabled={!nextOcrRepairRecord || studyImportBusy !== null}
                      style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: !nextOcrRepairRecord || studyImportBusy ? 'default' : 'pointer', opacity: !nextOcrRepairRecord || studyImportBusy ? 0.6 : 1 }}
                    >
                      {nextOcrRepairRecord ? `Repair OCR · ${nextOcrRepairRecord.title}` : 'OCR Health is Stable'}
                    </button>
                    <button
                      type="button"
                      onClick={() => nextWorkbookFlaggedEntry && openAuditDayInDiscipleship(nextWorkbookFlaggedEntry, 'workbook')}
                      disabled={!nextWorkbookFlaggedEntry}
                      style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: nextWorkbookFlaggedEntry ? 'pointer' : 'default', opacity: nextWorkbookFlaggedEntry ? 1 : 0.6 }}
                    >
                      {nextWorkbookFlaggedEntry ? 'Review Next Workbook Flag' : 'Workbook QA is Clear'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void refreshChronicleSyncStatus()}
                      disabled={chronicleSyncBusy}
                      style={{ padding: '8px 14px', border: 'none', borderRadius: 8, background: 'var(--accent-blue)', color: 'white', fontSize: 12, fontWeight: 700, cursor: chronicleSyncBusy ? 'default' : 'pointer', opacity: chronicleSyncBusy ? 0.6 : 1 }}
                    >
                      Refresh Data Health
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Chronicle is watching Bible cache coverage, OCR confidence, workbook overlay coverage, and snapshot availability so repair work can start from here instead of from scattered tabs.
                  </div>
                </div>
              </Group>
              <Group>
                <GroupHeader title="Backup & Sync" />
                <SettingRow label="Private Sync" desc="Prepared for local-first sync across desktop, iPad, and iPhone">
                  <Toggle checked={toggles.iCloudBackup} onChange={() => toggle('iCloudBackup')} />
                </SettingRow>
                <SettingRow label="Device Label" desc="This name travels with exported snapshots so other devices know where they came from.">
                  <input
                    value={syncProfile.deviceLabel}
                    onChange={(event) => updateSyncProfile({ deviceLabel: event.target.value })}
                    style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, background: 'var(--card-inner)', color: 'var(--text)', outline: 'none', minWidth: 170 }}
                  />
                </SettingRow>
                <SettingRow label="Cache Policy" desc="Tell Chronicle what each device should keep fully local versus fetch on demand.">
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Sel options={['eager', 'on-demand']} value={syncProfile.cachePolicy.bibleLibrary} onChange={(value) => updateCachePolicy('bibleLibrary', value as ChronicleSyncProfile['cachePolicy']['bibleLibrary'])} />
                    <Sel options={['eager', 'on-demand']} value={syncProfile.cachePolicy.themeAnalysis} onChange={(value) => updateCachePolicy('themeAnalysis', value as ChronicleSyncProfile['cachePolicy']['themeAnalysis'])} />
                    <Sel options={['selected-books', 'on-demand']} value={syncProfile.cachePolicy.importedBooks} onChange={(value) => updateCachePolicy('importedBooks', value as ChronicleSyncProfile['cachePolicy']['importedBooks'])} />
                  </div>
                </SettingRow>
                <SettingRow label="Last Backup">
                  <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>
                    {chronicleSyncLatest
                      ? `${new Date(chronicleSyncLatest.createdAt).toLocaleString()}`
                      : syncReadyState}
                  </span>
                </SettingRow>
                <div style={{ padding: '13px 18px', borderTop: '1px solid var(--border)', display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Chronicle Sync Snapshot</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        Package your current Chronicle state, imported-book catalog, and Bible-library metadata into a portable local snapshot.
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <input
                        ref={snapshotImportInputRef}
                        type="file"
                        accept="application/json,.json"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            void importChronicleSnapshotFile(file);
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                      <button onClick={() => void refreshChronicleSyncStatus()} disabled={chronicleSyncBusy} style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card-inner)', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: chronicleSyncBusy ? 'default' : 'pointer', opacity: chronicleSyncBusy ? 0.6 : 1 }}>
                        {chronicleSyncBusy ? 'Refreshing…' : 'Refresh Sync Status'}
                      </button>
                      <button
                        onClick={() => snapshotImportInputRef.current?.click()}
                        disabled={chronicleSyncBusy}
                        style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: chronicleSyncBusy ? 'default' : 'pointer', opacity: chronicleSyncBusy ? 0.6 : 1 }}
                      >
                        Import & Merge Snapshot File
                      </button>
                      <button onClick={mergeLatestChronicleSnapshot} disabled={chronicleSyncBusy || !chronicleSyncLatest} style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: chronicleSyncBusy || !chronicleSyncLatest ? 'default' : 'pointer', opacity: chronicleSyncBusy || !chronicleSyncLatest ? 0.6 : 1 }}>
                        Merge Latest Snapshot
                      </button>
                      <button onClick={restoreLatestChronicleSnapshot} disabled={chronicleSyncBusy || !chronicleSyncLatest} style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: chronicleSyncBusy || !chronicleSyncLatest ? 'default' : 'pointer', opacity: chronicleSyncBusy || !chronicleSyncLatest ? 0.6 : 1 }}>
                        Restore Latest Snapshot
                      </button>
                      <button onClick={downloadLatestChronicleSnapshot} disabled={chronicleSyncBusy || !chronicleSyncLatest} style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: chronicleSyncBusy || !chronicleSyncLatest ? 'default' : 'pointer', opacity: chronicleSyncBusy || !chronicleSyncLatest ? 0.6 : 1 }}>
                        Download Latest Snapshot
                      </button>
                      <button onClick={createChronicleSnapshot} disabled={chronicleSyncBusy} style={{ padding: '8px 14px', border: 'none', borderRadius: 8, background: 'var(--accent-blue)', color: 'white', fontSize: 12, fontWeight: 700, cursor: chronicleSyncBusy ? 'default' : 'pointer', opacity: chronicleSyncBusy ? 0.6 : 1 }}>
                        {chronicleSyncBusy ? 'Creating…' : 'Create Chronicle Snapshot'}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                      {[
                        { label: 'Snapshots', value: chronicleSyncSummary?.snapshotCount ?? 0 },
                        { label: 'Structured Books', value: chronicleSyncSummary?.structuredLibraryCount ?? 0 },
                        { label: 'Uploaded Books', value: chronicleSyncSummary?.uploadedLibraryCount ?? 0 },
                        { label: 'Theme Cache Files', value: chronicleSyncSummary?.themeCacheFileCount ?? 0 },
                    ].map((item) => (
                      <div key={item.label} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--card-inner)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{item.value}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{item.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-inner)', display: 'grid', gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Start Over Without Losing Your Books</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.55 }}>
                      This clears Chronicle entries, prayer history, streak and daily-walk progress, bookmarks, and workbook answers. Your imported books, OCR assets, Bible library, and snapshots stay intact.
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={handleResetPersonalProgress}
                        disabled={chronicleSyncBusy}
                        style={{ padding: '8px 14px', border: '1px solid #b42318', borderRadius: 8, background: 'transparent', color: '#b42318', fontSize: 12, fontWeight: 700, cursor: chronicleSyncBusy ? 'default' : 'pointer', opacity: chronicleSyncBusy ? 0.6 : 1 }}
                      >
                        Reset Personal Progress (Keep Books)
                      </button>
                    </div>
                  </div>
                  {chronicleSyncLatest ? (
                    <div style={{ padding: '12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-inner)', display: 'grid', gap: 4 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Latest snapshot</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{chronicleSyncLatest.id}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {new Date(chronicleSyncLatest.createdAt).toLocaleString()} · {Math.max(1, Math.round(chronicleSyncLatest.byteSize / 1024))} KB
                        {chronicleSyncLatest.deviceLabel ? ` · ${chronicleSyncLatest.deviceLabel}` : ''}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        Snapshot schema v{chronicleSyncLatest.schemaVersion || 0} · app state v{chronicleSyncLatest.appStateVersion || 0}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        Portable merge policy: field-aware local-first · sync model v{chronicleSyncSummary?.syncModelVersion || syncProfile.modelVersion}
                      </div>
                      {chronicleSyncSummary?.localCacheSummary ? (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                          Cache posture: {chronicleSyncSummary.localCacheSummary.installedTranslationCount} translations · {chronicleSyncSummary.localCacheSummary.importedPdfCount} imported PDFs · {chronicleSyncSummary.localCacheSummary.ocrTextCount} OCR texts
                        </div>
                      ) : null}
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, wordBreak: 'break-word' }}>
                        {chronicleSyncLatest.path}
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '12px', borderRadius: 10, border: '1px dashed var(--border)', background: 'var(--card-inner)', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      No Chronicle snapshot yet. Create one here to start building a portable local-first backup trail.
                    </div>
                  )}
                  {chronicleSyncSnapshots.length > 0 && (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {chronicleSyncSnapshots.slice(0, 4).map((snapshot) => (
                        <div key={snapshot.id} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-inner)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{new Date(snapshot.createdAt).toLocaleString()}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                                {snapshot.chronicleEntryCount} entries · {snapshot.prayerItemCount} prayers · {snapshot.ownedBookCount} books · {snapshot.scriptureBookmarkCount} bookmarks
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                                Snapshot schema v{snapshot.schemaVersion || 0} · app state v{snapshot.appStateVersion || 0}
                              </div>
                            </div>
                            <button
                              onClick={() => void mergeChronicleSnapshot(snapshot.id)}
                              disabled={chronicleSyncBusy}
                              style={{
                                padding: '6px 10px',
                                border: '1px solid var(--border)',
                                borderRadius: 8,
                                background: 'transparent',
                                color: 'var(--text)',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: chronicleSyncBusy ? 'default' : 'pointer',
                                opacity: chronicleSyncBusy ? 0.6 : 1,
                              }}
                            >
                              Merge
                            </button>
                            <button
                              onClick={() => void restoreChronicleSnapshot(snapshot.id)}
                              disabled={chronicleSyncBusy}
                              style={{
                                padding: '6px 10px',
                                border: '1px solid var(--border)',
                                borderRadius: 8,
                                background: 'transparent',
                                color: 'var(--text)',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: chronicleSyncBusy ? 'default' : 'pointer',
                                opacity: chronicleSyncBusy ? 0.6 : 1,
                              }}
                            >
                              Restore
                            </button>
                            <button
                              onClick={() => downloadChronicleSnapshot(snapshot.id)}
                              disabled={chronicleSyncBusy}
                              style={{
                                padding: '6px 10px',
                                border: '1px solid var(--border)',
                                borderRadius: 8,
                                background: 'transparent',
                                color: 'var(--text)',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: chronicleSyncBusy ? 'default' : 'pointer',
                                opacity: chronicleSyncBusy ? 0.6 : 1,
                              }}
                            >
                              Download
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Group>
              <Group>
                <GroupHeader title="Study Imports" desc="OCR scanned study books and import structured source material for Chronicle study and discipleship workflows" />
                <SettingRow label="OCR Tooling" desc="Installed locally for scanned PDF extraction">
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {[
                      { label: 'tesseract', ok: studyImportTools.tesseract },
                      { label: 'ocrmypdf', ok: studyImportTools.ocrmypdf },
                      { label: 'pdftotext', ok: studyImportTools.pdftotext },
                    ].map((tool) => (
                      <span
                        key={tool.label}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 999,
                          border: `1px solid ${tool.ok ? 'var(--accent-green)' : 'var(--border)'}`,
                          background: tool.ok ? 'var(--accent-green-light)' : 'var(--card-inner)',
                          color: tool.ok ? 'var(--accent-green)' : 'var(--text-sub)',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {tool.label}
                      </span>
                    ))}
                  </div>
                </SettingRow>
                <SettingRow label="Rebuild Text Layer" desc="Use fresh OCR instead of trusting an existing PDF text layer">
                  <Toggle checked={forceOcr} onChange={() => setForceOcr((value) => !value)} />
                </SettingRow>
                <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', display: 'grid', gap: 10 }}>
                  <div style={{ display: 'grid', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'var(--card-inner)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Choose a PDF from your computer</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      Chronicle will copy the file into its own local library and use that stored copy for OCR and study imports.
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        disabled={studyImportBusy !== null}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            void uploadBookFile(file);
                          }
                          event.currentTarget.value = '';
                        }}
                        style={{ fontSize: 12, color: 'var(--text-sub)', maxWidth: '100%' }}
                      />
                      {studyImportBusy === 'upload' ? (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Uploading…</span>
                      ) : uploadedBookLabel ? (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{uploadedBookLabel}</span>
                      ) : null}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Scanned PDF Path</div>
                    <input value={ocrPdfPath} onChange={(e) => setOcrPdfPath(e.target.value)} style={{ marginTop: 6, width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, background: 'var(--card-inner)', color: 'var(--text)', outline: 'none' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isPhone ? '1fr' : '1fr 1fr', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Output stem</div>
                      <input value={ocrStem} onChange={(e) => setOcrStem(e.target.value)} style={{ marginTop: 6, width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, background: 'var(--card-inner)', color: 'var(--text)', outline: 'none' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Page range</div>
                      <input value={ocrPageRange} onChange={(e) => setOcrPageRange(e.target.value)} placeholder="1-10" style={{ marginTop: 6, width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, background: 'var(--card-inner)', color: 'var(--text)', outline: 'none' }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isPhone ? '1fr' : '1fr 1fr', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Segment size</div>
                      <input value={ocrSegmentSize} onChange={(e) => setOcrSegmentSize(e.target.value)} placeholder="20" style={{ marginTop: 6, width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, background: 'var(--card-inner)', color: 'var(--text)', outline: 'none' }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'end', lineHeight: 1.5 }}>
                      For a whole-book pass, leave page range blank and use segmented OCR. Chronicle will OCR the entire book from start to finish in ordered chunks.
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: 560 }}>
                      Chronicle can recommend the chunk size based on book length and whether you want to preserve existing daily sessions or reshape the book into daily study.
                    </div>
                    <button onClick={recommendChunkingStrategy} disabled={studyImportBusy !== null} style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card-inner)', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: studyImportBusy ? 'default' : 'pointer', opacity: studyImportBusy ? 0.6 : 1 }}>
                      {studyImportBusy === 'recommend' ? 'Recommending…' : 'Recommend Chunking'}
                    </button>
                  </div>
                  {ocrChunkingAdvice && (
                    <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--card-inner)', border: '1px solid var(--border)', display: 'grid', gap: 4 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                        Recommended: {ocrChunkingAdvice.mode === 'segmented' ? 'Segmented OCR' : 'Single-pass OCR'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {ocrChunkingAdvice.pageCount} pages total, {ocrChunkingAdvice.recommendedSegmentSize} pages per chunk, about {ocrChunkingAdvice.estimatedSegments} segment{ocrChunkingAdvice.estimatedSegments === 1 ? '' : 's'}.
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {ocrChunkingAdvice.reason}
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Use a page range for faster passes while cleaning up a purchased book.</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={runOcrImport} disabled={studyImportBusy !== null} style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card-inner)', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: studyImportBusy ? 'default' : 'pointer', opacity: studyImportBusy ? 0.6 : 1 }}>
                      {studyImportBusy === 'ocr' ? 'Running OCR…' : 'Run OCR'}
                    </button>
                    <button onClick={runSegmentedOcrImport} disabled={studyImportBusy !== null} style={{ padding: '8px 14px', border: 'none', borderRadius: 8, background: 'var(--accent-green)', color: 'white', fontSize: 12, fontWeight: 700, cursor: studyImportBusy ? 'default' : 'pointer', opacity: studyImportBusy ? 0.6 : 1 }}>
                      {studyImportBusy === 'segmented' ? 'Segmenting…' : 'Run Whole Book in Segments'}
                    </button>
                    </div>
                  </div>
                </div>
                <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', display: 'grid', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>MasterLife Text Import</div>
                    <input value={importTextPath} onChange={(e) => setImportTextPath(e.target.value)} style={{ marginTop: 6, width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, background: 'var(--card-inner)', color: 'var(--text)', outline: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Imports OCR text into Chronicle&apos;s structured MasterLife source data and makes it available on the Study page.</div>
                    <button onClick={runMasterlifeImport} disabled={studyImportBusy !== null} style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card-inner)', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: studyImportBusy ? 'default' : 'pointer', opacity: studyImportBusy ? 0.6 : 1 }}>
                      {studyImportBusy === 'import' ? 'Importing…' : 'Import & Apply MasterLife'}
                    </button>
                  </div>
                </div>
                <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', display: 'grid', gap: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Import a Book You Own</div>
                  <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : '1.2fr 1fr', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Book title</div>
                      <input value={ownedBookTitle} onChange={(e) => setOwnedBookTitle(e.target.value)} style={{ marginTop: 6, width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, background: 'var(--card-inner)', color: 'var(--text)', outline: 'none' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Workflow</div>
                      <select value={ownedBookWorkflow} onChange={(e) => setOwnedBookWorkflow(e.target.value as typeof ownedBookWorkflow)} style={{ marginTop: 6, width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, background: 'var(--card-inner)', color: 'var(--text)', outline: 'none' }}>
                        <option value="auto-detect">Auto-detect</option>
                        <option value="preserve-daily">Already a daily study</option>
                        <option value="ai-daily-study">Turn into daily Bible Study</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Chronicle will preserve books that already have daily sessions. If not, it will generate a daily Bible-study plan from the OCR text, following source sections when it can so the finished path feels closer to the book you imported.
                    </div>
                    <button onClick={analyzeAndAddOwnedBook} disabled={studyImportBusy !== null} style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card-inner)', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: studyImportBusy ? 'default' : 'pointer', opacity: studyImportBusy ? 0.6 : 1 }}>
                      {studyImportBusy === 'analyze' ? 'Adding…' : 'Add to Discipleship'}
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Current library: {ownedBooks.length} book{ownedBooks.length === 1 ? '' : 's'}.
                  </div>
                </div>
                <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Import Progress</div>
                  <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 8, background: 'var(--card-inner)', border: '1px solid var(--border)', display: 'grid', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                          {studyImportJob ? studyImportJob.label : 'No active import'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {studyImportJob ? studyImportJob.message : 'Start OCR or import and Chronicle will show live progress here.'}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: studyImportJob?.status === 'failed' ? '#b42318' : 'var(--text-sub)' }}>
                        {studyImportJob ? `${Math.round((studyImportJob.progress || 0) * 100)}%` : '0%'}
                      </div>
                    </div>
                    <div style={{ height: 10, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.max(4, Math.round((studyImportJob?.progress || 0) * 100))}%`,
                          height: '100%',
                          borderRadius: 999,
                          background: studyImportJob?.status === 'failed' ? '#f97066' : 'var(--accent-green)',
                          transition: 'width 0.35s ease',
                        }}
                      />
                    </div>
                    {studyImportJob && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                        <span>Status: {studyImportJob.status}</span>
                        <span>Started: {new Date(studyImportJob.startedAt).toLocaleTimeString()}</span>
                        {studyImportJob.finishedAt ? <span>Finished: {new Date(studyImportJob.finishedAt).toLocaleTimeString()}</span> : null}
                      </div>
                    )}
                    {studyImportJob && typeof studyImportJob.result?.recordId === 'string' ? (() => {
                      const record = studyLibraryRecords.find((entry) => entry.id === studyImportJob.result?.recordId);
                      const quality = record?.ocrQuality;
                      if (!quality) return null;
                      const tone = ocrConfidenceTone(quality.confidence);
                      return (
                        <div style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${tone.border}`, background: tone.background, display: 'grid', gap: 4 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>OCR signal</div>
                            <span style={{ padding: '3px 8px', borderRadius: 999, border: `1px solid ${tone.border}`, background: 'rgba(255,255,255,0.45)', color: tone.color, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
                              {quality.confidence} confidence
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.5 }}>
                            {quality.pageCount} page{quality.pageCount === 1 ? '' : 's'} · avg {quality.averageCharsPerPage} chars/page · {quality.sparsePageCount} sparse page{quality.sparsePageCount === 1 ? '' : 's'}
                          </div>
                          {quality.warnings.length > 0 ? (
                            <div style={{ fontSize: 11, color: quality.confidence === 'low' ? '#7a271a' : 'var(--text-sub)', lineHeight: 1.5 }}>
                              {quality.warnings[0]}
                            </div>
                          ) : null}
                          {record && quality.confidence !== 'high' ? (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <button
                                onClick={() => void rerunOcrForRecord(record, chooseOcrRepairMode(record))}
                                disabled={studyImportBusy !== null}
                                style={{ padding: '7px 12px', border: 'none', borderRadius: 8, background: quality.confidence === 'low' ? '#b42318' : 'var(--accent-blue)', color: 'white', fontSize: 12, fontWeight: 700, cursor: studyImportBusy ? 'default' : 'pointer', opacity: studyImportBusy ? 0.6 : 1 }}
                              >
                                {quality.confidence === 'low' ? 'Repair This OCR' : 'Re-run OCR'}
                              </button>
                              {chooseOcrRepairMode(record) === 'segmented' ? (
                                <div style={{ fontSize: 11, color: 'var(--text-sub)', alignSelf: 'center' }}>
                                  Chronicle recommends segmented OCR for this book.
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })() : null}
                    {studyImportJob && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setStudyImportJob(null)}
                          style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--text-sub)', fontSize: 12, cursor: 'pointer' }}
                        >
                          Clear Progress
                        </button>
                        {typeof studyImportJob.result?.recordId === 'string' ? (
                          <button
                            onClick={() => {
                              const record = studyLibraryRecords.find((entry) => entry.id === studyImportJob.result?.recordId);
                              if (record) hydrateRecordToForm(record);
                            }}
                            style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card-inner)', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                          >
                            Load Job Output
                          </button>
                        ) : null}
                        {studyImportJob.status === 'completed' && typeof studyImportJob.result?.recordId === 'string' && studyLibraryRecords.some((entry) => entry.id === studyImportJob.result?.recordId && entry.status === 'structured') ? (
                          <button
                            onClick={() => openBookInDiscipleship(String(studyImportJob.result?.recordId))}
                            style={{ padding: '7px 12px', border: 'none', borderRadius: 8, background: 'var(--accent-blue)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                          >
                            Open in Discipleship
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Chronicle Study Library</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {studyLibraryRecords.length} imported book{studyLibraryRecords.length === 1 ? '' : 's'} · {libraryStatusCounts.uploaded} uploaded · {libraryStatusCounts.ocrComplete} OCR complete · {libraryStatusCounts.structured} structured
                      </div>
                      {studyLibraryManifest ? (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          Library manifest v{studyLibraryManifest.schemaVersion} · record schema v{studyLibraryManifest.libraryRecordSchemaVersion} · owned book schema v{studyLibraryManifest.ownedBookSchemaVersion}
                        </div>
                      ) : null}
                    </div>
                    <button onClick={() => void refreshStudyLibrary()} disabled={studyLibraryBusy} style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card-inner)', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: studyLibraryBusy ? 'default' : 'pointer', opacity: studyLibraryBusy ? 0.6 : 1 }}>
                      {studyLibraryBusy ? 'Refreshing…' : 'Refresh Library'}
                    </button>
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {studyLibraryRecords.length > 0 ? studyLibraryRecords.slice(0, 8).map((record) => {
                      const tone = statusTone(record.status);
                      const ocrTone = record.ocrQuality ? ocrConfidenceTone(record.ocrQuality.confidence) : null;
                      return (
                        <div key={record.id} style={{ padding: '12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-inner)', display: 'grid', gap: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{record.title}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                {record.originalFileName} · Schema v{record.schemaVersion || 0} · Updated {new Date(record.updatedAt).toLocaleString()}
                              </div>
                            </div>
                            <span style={{ padding: '4px 8px', borderRadius: 999, border: `1px solid ${tone.border}`, background: tone.background, color: tone.color, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
                              {record.status.replace('_', ' ')}
                            </span>
                          </div>
                          {record.ocrQuality ? (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                              <span style={{ padding: '4px 8px', borderRadius: 999, border: `1px solid ${ocrTone!.border}`, background: ocrTone!.background, color: ocrTone!.color, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
                                OCR {record.ocrQuality.confidence}
                              </span>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {record.ocrQuality.pageCount} pages · avg {record.ocrQuality.averageCharsPerPage} chars/page · {record.ocrQuality.sparsePageCount} sparse
                              </span>
                            </div>
                          ) : null}
                          {record.generatedPlan?.generationStrategy ? (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {generationStrategyLabel(record.generatedPlan.generationStrategy)}
                            </div>
                          ) : null}
                          {summarizePlanStructures(record.generatedPlan).length ? (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {summarizePlanStructures(record.generatedPlan).join(' · ')}
                            </div>
                          ) : null}
                          {record.importDiagnostics ? (() => {
                            const tone = sourceHealthTone(record.importDiagnostics.sourceHealth);
                            return (
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ padding: '4px 8px', borderRadius: 999, border: `1px solid ${tone.border}`, background: tone.background, color: tone.color, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
                                  Source {record.importDiagnostics.sourceHealth}
                                </span>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                  {record.importDiagnostics.mappedDayCount}/{record.importDiagnostics.totalDays} days mapped · {record.importDiagnostics.mappedSliceCount} slices
                                </span>
                              </div>
                            );
                          })() : null}
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                            {record.summary || (record.status === 'structured'
                              ? 'Structured and ready for Discipleship.'
                              : record.status === 'ocr_complete'
                                ? 'OCR is complete. Chronicle can now build the day-by-day study path.'
                                : 'Uploaded into Chronicle’s private library and waiting for OCR.')}
                          </div>
                          {record.ocrQuality?.warnings?.length ? (
                            <div style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${ocrTone!.border}`, background: 'rgba(255,255,255,0.45)', fontSize: 11, color: record.ocrQuality.confidence === 'low' ? '#7a271a' : 'var(--text-sub)', lineHeight: 1.5 }}>
                              {record.ocrQuality.warnings[0]}
                            </div>
                          ) : null}
                          {record.importDiagnostics?.warnings?.length ? (
                            <div style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${sourceHealthTone(record.importDiagnostics.sourceHealth).border}`, background: 'rgba(255,255,255,0.45)', fontSize: 11, color: record.importDiagnostics.sourceHealth === 'low' ? '#7a271a' : 'var(--text-sub)', lineHeight: 1.5 }}>
                              {record.importDiagnostics.warnings[0]}
                            </div>
                          ) : null}
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button
                              onClick={() => hydrateRecordToForm(record)}
                              style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--text-sub)', fontSize: 12, cursor: 'pointer' }}
                            >
                              Load Into Import Form
                            </button>
                            {record.status === 'structured' ? (
                              <button
                                onClick={() => openRecordInDiscipleship(record)}
                                style={{ padding: '7px 12px', border: 'none', borderRadius: 8, background: 'var(--accent-blue)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                              >
                                Open in Discipleship
                              </button>
                            ) : record.status === 'ocr_complete' ? (
                              <button
                                onClick={() => {
                                  hydrateRecordToForm(record);
                                  void analyzeAndAddOwnedBook();
                                }}
                                disabled={studyImportBusy !== null}
                                style={{ padding: '7px 12px', border: 'none', borderRadius: 8, background: 'var(--accent-blue)', color: 'white', fontSize: 12, fontWeight: 700, cursor: studyImportBusy ? 'default' : 'pointer', opacity: studyImportBusy ? 0.6 : 1 }}
                              >
                                Add to Discipleship
                              </button>
                            ) : (
                              <button
                                onClick={() => hydrateRecordToForm(record)}
                                style={{ padding: '7px 12px', border: 'none', borderRadius: 8, background: 'var(--accent-blue)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                              >
                                Continue OCR
                              </button>
                            )}
                            {(record.status === 'ocr_complete' || record.status === 'structured') && record.ocrQuality && record.ocrQuality.confidence !== 'high' ? (
                              <button
                                onClick={() => void rerunOcrForRecord(record, chooseOcrRepairMode(record))}
                                disabled={studyImportBusy !== null}
                                style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', color: record.ocrQuality.confidence === 'low' ? '#b42318' : 'var(--text-sub)', fontSize: 12, fontWeight: 700, cursor: studyImportBusy ? 'default' : 'pointer', opacity: studyImportBusy ? 0.6 : 1 }}
                              >
                                {record.ocrQuality.confidence === 'low' ? 'Repair OCR' : 'Re-run OCR'}
                              </button>
                            ) : null}
                            <button
                              onClick={() => void deleteStudyLibraryRecord(record)}
                              disabled={studyLibraryDeleteBusyId === record.id}
                              style={{ padding: '7px 12px', border: '1px solid rgba(180, 35, 24, 0.24)', borderRadius: 8, background: 'rgba(249, 112, 102, 0.08)', color: '#b42318', fontSize: 12, fontWeight: 700, cursor: studyLibraryDeleteBusyId === record.id ? 'default' : 'pointer', opacity: studyLibraryDeleteBusyId === record.id ? 0.6 : 1 }}
                            >
                              {studyLibraryDeleteBusyId === record.id ? 'Deleting…' : 'Delete Book'}
                            </button>
                          </div>
                        </div>
                      );
                    }) : (
                      <div style={{ padding: '12px', borderRadius: 10, border: '1px dashed var(--border)', background: 'var(--card-inner)', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        No imported books yet. Upload a PDF above and Chronicle will track it here from upload to OCR to structured study.
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Discipleship Workbook QA</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        Chronicle checks workbook days for response cues and whether overlays cover the pages that need interaction.
                        {workbookAuditGeneratedAt ? ` Last audit: ${new Date(workbookAuditGeneratedAt).toLocaleString()}.` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => void refreshWorkbookAudit()}
                        disabled={workbookAuditBusy || workbookAuditActionBusy !== null}
                        style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card-inner)', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: workbookAuditBusy || workbookAuditActionBusy ? 'default' : 'pointer', opacity: workbookAuditBusy || workbookAuditActionBusy ? 0.6 : 1 }}
                      >
                        {workbookAuditBusy ? 'Refreshing…' : 'Refresh QA'}
                      </button>
                      <button
                        onClick={() => void runWorkbookSync()}
                        disabled={workbookAuditActionBusy !== null}
                        style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card-inner)', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: workbookAuditActionBusy ? 'default' : 'pointer', opacity: workbookAuditActionBusy ? 0.6 : 1 }}
                      >
                        {workbookAuditActionBusy === 'sync' ? 'Running Sync…' : 'Run Workbook Sync'}
                      </button>
                      <button
                        onClick={() => void runWorkbookQa()}
                        disabled={workbookAuditActionBusy !== null}
                        style={{ padding: '8px 14px', border: 'none', borderRadius: 8, background: 'var(--accent-blue)', color: 'white', fontSize: 12, fontWeight: 700, cursor: workbookAuditActionBusy ? 'default' : 'pointer', opacity: workbookAuditActionBusy ? 0.6 : 1 }}
                      >
                        {workbookAuditActionBusy === 'qa' ? 'Running QA…' : 'Run Workbook QA'}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                    {[
                      { label: 'Audited days', value: workbookAuditSummary.totalDays },
                      { label: 'Cue-safe days', value: workbookAuditSummary.daysWithCueCoverage, tone: 'var(--accent-blue)' },
                      { label: 'Uncovered cue pages', value: workbookAuditSummary.totalUncoveredCuePages, tone: workbookAuditSummary.totalUncoveredCuePages > 0 ? '#b42318' : 'var(--accent-green)' },
                      { label: 'Days with no prompts', value: workbookAuditSummary.daysWithoutInteractiveCues },
                    ].map((item) => (
                      <div key={item.label} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-inner)' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.label}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: item.tone || 'var(--text)', marginTop: 4 }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                  {workbookAuditWarnings.length > 0 ? (
                    <div style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(180, 35, 24, 0.18)', background: 'rgba(249, 112, 102, 0.08)', display: 'grid', gap: 4 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#b42318' }}>Audit warnings</div>
                      {workbookAuditWarnings.map((warning) => (
                        <div key={warning} style={{ fontSize: 11, color: '#7a271a', lineHeight: 1.5 }}>{warning}</div>
                      ))}
                    </div>
                  ) : null}
                  {workbookAuditByBook.length > 0 ? (
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Book readiness</div>
                      {workbookAuditByBook.map((book) => {
                        const hasUncovered = book.uncoveredCuePages > 0;
                        return (
                          <div key={book.bookId} style={{ padding: '12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-inner)', display: 'grid', gap: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{book.title}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                  {book.totalDays} day{book.totalDays === 1 ? '' : 's'} · {book.cueSafeDays} cue-safe · {book.noPromptDays} reading-only
                                </div>
                              </div>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: 999,
                                border: `1px solid ${hasUncovered ? 'rgba(180, 35, 24, 0.24)' : 'rgba(15, 79, 207, 0.24)'}`,
                                background: hasUncovered ? 'rgba(249, 112, 102, 0.08)' : 'rgba(15, 79, 207, 0.08)',
                                color: hasUncovered ? '#b42318' : 'var(--accent-blue)',
                                fontSize: 11,
                                fontWeight: 700,
                              }}>
                                {hasUncovered ? `${book.uncoveredCuePages} uncovered cue page${book.uncoveredCuePages === 1 ? '' : 's'}` : 'Ready for workbook review'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <button
                                onClick={() => openBookInDiscipleship(book.bookId)}
                                style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--text-sub)', fontSize: 12, cursor: 'pointer' }}
                              >
                                Open Book
                              </button>
                              {book.nextFlaggedEntry ? (
                                <button
                                  onClick={() => openAuditDayInDiscipleship(book.nextFlaggedEntry!, 'workbook')}
                                  style={{ padding: '7px 12px', border: 'none', borderRadius: 8, background: 'var(--accent-blue)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                >
                                  Review Next Flagged Day
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                  <div style={{ display: 'grid', gap: 8 }}>
                    {workbookAuditEntries.length > 0 ? workbookAuditEntries.slice(0, 10).map((entry) => {
                      const hasUncovered = entry.uncoveredCuePages.length > 0;
                      return (
                        <div key={`${entry.bookId}-${entry.day}`} style={{ padding: '12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-inner)', display: 'grid', gap: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                                {entry.title} · Day {entry.day}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                {entry.section || 'Workbook day'} · Pages {entry.pageRange.join(', ')}
                              </div>
                            </div>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: 999,
                              border: `1px solid ${hasUncovered ? 'rgba(180, 35, 24, 0.24)' : 'rgba(15, 79, 207, 0.24)'}`,
                              background: hasUncovered ? 'rgba(249, 112, 102, 0.08)' : 'rgba(15, 79, 207, 0.08)',
                              color: hasUncovered ? '#b42318' : 'var(--accent-blue)',
                              fontSize: 11,
                              fontWeight: 700,
                            }}>
                              {hasUncovered ? `${entry.uncoveredCuePages.length} uncovered cue page${entry.uncoveredCuePages.length === 1 ? '' : 's'}` : 'Cue coverage clear'}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                            {entry.cuePages.length > 0
                              ? `${entry.cuePages.length} cue page${entry.cuePages.length === 1 ? '' : 's'} detected. Covered pages: ${entry.coveredPages.length > 0 ? entry.coveredPages.join(', ') : 'none yet'}.`
                              : 'No workbook response cues were detected on this day, so Chronicle treats it as a plain reading slice for now.'}
                          </div>
                          {entry.cuePages.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {entry.cuePages.map((cue) => (
                                <span key={`${entry.bookId}-${entry.day}-${cue.pageNumber}`} style={{ padding: '4px 8px', borderRadius: 999, border: '1px solid var(--border)', background: 'transparent', fontSize: 11, color: 'var(--text-sub)' }}>
                                  Page {cue.pageNumber}: {cue.cueLabels.slice(0, 2).join(', ')}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {hasUncovered ? (
                            <div style={{ fontSize: 11, color: '#7a271a', lineHeight: 1.5 }}>
                              Uncovered: {entry.uncoveredCuePages.map((cue) => `page ${cue.pageNumber} (${cue.cueLabels.join(', ')})`).join(' · ')}
                            </div>
                          ) : null}
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button
                              onClick={() => openAuditDayInDiscipleship(entry, 'study')}
                              style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--text-sub)', fontSize: 12, cursor: 'pointer' }}
                            >
                              Open Day in Discipleship
                            </button>
                            {entry.cuePages.length > 0 ? (
                              <button
                                onClick={() => openAuditDayInDiscipleship(entry, 'workbook')}
                                style={{ padding: '7px 12px', border: 'none', borderRadius: 8, background: 'var(--accent-blue)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                              >
                                Review Workbook
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    }) : (
                      <div style={{ padding: '12px', borderRadius: 10, border: '1px dashed var(--border)', background: 'var(--card-inner)', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        Chronicle has not generated a workbook QA audit yet. Run the discipleship sync/QA pipeline and the day-level readiness map will appear here.
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>OCR Artifacts</div>
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {studyImportFiles.length > 0 ? studyImportFiles.map((file) => (
                      <span key={file} style={{ padding: '4px 8px', borderRadius: 999, background: 'var(--card-inner)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--text-sub)' }}>
                        {file}
                      </span>
                    )) : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No OCR artifacts yet.</span>}
                  </div>
                </div>
                <div style={{ padding: '13px 18px' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Last Import Log</div>
                  <pre style={{ marginTop: 8, padding: '10px 12px', borderRadius: 8, background: 'var(--card-inner)', border: '1px solid var(--border)', fontSize: 11, lineHeight: 1.5, color: 'var(--text-sub)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 180, overflowY: 'auto' }}>
                    {studyImportLog || 'No OCR or import run yet.'}
                  </pre>
                </div>
              </Group>
              <Group>
                <GroupHeader title="Export" />
                <SettingRow label="Export Chronicle" desc="Download all entries as Markdown or JSON">
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={{ padding: '5px 12px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, color: 'var(--text-sub)', background: 'transparent', cursor: 'pointer' }}>.md</button>
                    <button onClick={createChronicleSnapshot} style={{ padding: '5px 12px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, color: 'var(--text-sub)', background: 'transparent', cursor: 'pointer' }}>.json</button>
                  </div>
                </SettingRow>
                <SettingRow label="Export Legacy Memoir" desc="Download the Legacy View as a formatted PDF">
                  <button style={{ padding: '5px 12px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, color: 'var(--text-sub)', background: 'transparent', cursor: 'pointer' }}>Export PDF</button>
                </SettingRow>
              </Group>
            </>
          )}

          {activeCategory === 'about' && (
            <>
              <Group>
                <div style={{ textAlign: 'center', padding: '28px 18px', borderBottom: '1px solid var(--border)' }}>
                  <img
                    src="/chronicle-icon.png"
                    alt="Chronicle"
                    style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'cover', margin: '0 auto 14px', boxShadow: '0 6px 18px rgba(15, 79, 207, 0.18)' }}
                  />
                  <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Chronicle</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Version {CHRONICLE_APP_VERSION} ({CHRONICLE_BUILD_LABEL})</div>
                  <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 8 }}>{CHRONICLE_TAGLINE}</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 12, fontStyle: 'italic', color: 'var(--text-sub)', marginTop: 12, lineHeight: 1.7 }}>
                    "{CHRONICLE_MOTTO}"
                  </div>
                </div>
              </Group>
              <Group>
                <GroupHeader title="Getting Started" desc="The quickest path into the live Chronicle workflow." />
                <div style={{ padding: '14px 18px', display: 'grid', gap: 10 }}>
                  {CHRONICLE_ONBOARDING_STEPS.map((step, index) => (
                    <div key={step.title} style={{ padding: '12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-inner)', display: 'grid', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{index + 1}. {step.title}</div>
                        <button
                          type="button"
                          onClick={() => openOnboardingStep(step)}
                          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                        >
                          {step.actionLabel}
                        </button>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.6 }}>{step.description}</div>
                    </div>
                  ))}
                </div>
              </Group>
              <Group>
                <GroupHeader title="Launch Readiness" desc="A final whole-product posture check across trust, imports, sync, and formation loops." />
                <div style={{ padding: '14px 18px', display: 'grid', gap: 8 }}>
                  {[
                    { label: 'Bible study engine', detail: `${bibleLibraryStatus.length} installed providers · ${themeCacheFileCount} saved analyses`, tone: 'var(--accent-green)' },
                    { label: 'Imported study library', detail: `${libraryStatusCounts.structured} structured books · ${workbookAuditSummary.totalDays} audited workbook days`, tone: 'var(--accent-blue)' },
                    { label: 'Private sync posture', detail: `${chronicleSyncSummary?.snapshotCount ?? 0} snapshot${(chronicleSyncSummary?.snapshotCount ?? 0) === 1 ? '' : 's'} · model v${chronicleSyncSummary?.syncModelVersion || syncProfile.modelVersion}`, tone: 'var(--accent-green)' },
                    { label: 'Formation memory', detail: `${chronicleEntries.length} Chronicle entries · ${answeredPrayerCount} answered prayers · ${formationRhythms.length} rhythms`, tone: 'var(--accent-blue)' },
                  ].map((item) => (
                    <div key={item.label} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-inner)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-sub)', marginTop: 4, lineHeight: 1.6 }}>{item.detail}</div>
                    </div>
                  ))}
                </div>
              </Group>
              <Group>
                <GroupHeader title="If Something Feels Off" desc="The fastest recovery path when trust gets wobbly." />
                <div style={{ padding: '14px 18px', display: 'grid', gap: 10 }}>
                  {[
                    {
                      title: 'Bible chapter looks incomplete',
                      detail: 'Switch to Scripture to confirm the local translation is installed, then rebuild missing theme analyses if the study layer is stale.',
                      actionLabel: 'Open Scripture',
                      onClick: () => setActiveCategory('scripture'),
                    },
                    {
                      title: 'Import or OCR feels unreliable',
                      detail: 'Use Data & Privacy to rerun OCR, inspect the last import log, and review the workbook QA cards before trusting the generated day.',
                      actionLabel: 'Open Data & Privacy',
                      onClick: () => setActiveCategory('data'),
                    },
                    {
                      title: 'You want backup confidence',
                      detail: 'Create a Chronicle snapshot before major edits or after a good study session so your local-first state has a portable restore point.',
                      actionLabel: 'Open Sync Snapshot',
                      onClick: () => setActiveCategory('data'),
                    },
                  ].map((item) => (
                    <div key={item.title} style={{ padding: '12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-inner)', display: 'grid', gap: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{item.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.6 }}>{item.detail}</div>
                      <div>
                        <button
                          type="button"
                          onClick={item.onClick}
                          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                        >
                          {item.actionLabel}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Group>
              <Group>
                <GroupHeader title="Scripture License" />
                <div style={{ padding: '14px 18px', fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.7 }}>
                  Primary Scripture display uses the <strong>NKJV®</strong> (New King James Version®), Copyright © 1982 by Thomas Nelson. Additional translations may appear where enabled in settings and provider configuration.
                </div>
              </Group>
              <Group>
                <GroupHeader title="Acknowledgments" />
                <div style={{ padding: '14px 18px', fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.8 }}>
                  <p>Built as a local-first Chronicle workspace with React, TypeScript, Vite, OCR tooling, and a private study library.</p>
                  <p style={{ marginTop: 6 }}>Theme analysis is shaped by imported concordance, commentary, cross-reference, and Strong&apos;s data stored in Chronicle&apos;s local library.</p>
                </div>
              </Group>
            </>
          )}

        </div>
      </div>

      {/* Right panel */}
      <div style={{ width: 260, minWidth: 260, borderLeft: '1px solid var(--border)', background: 'var(--card-bg)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Account</div>
          <div style={{ background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { l: 'User', v: 'Chris', green: false },
              { l: 'Data', v: 'Local Only', green: true },
              { l: 'Backup', v: chronicleSyncLatest ? 'Snapshot ready' : (toggles.iCloudBackup ? 'Private sync posture' : 'Manual export only'), green: toggles.iCloudBackup || Boolean(chronicleSyncLatest) },
              { l: 'Version', v: '0.1.0', green: false },
            ].map((row) => (
              <div key={row.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.l}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: row.green ? 'var(--accent-green)' : 'var(--text)' }}>{row.v}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Your Chronicle</div>
          <div style={{ display: 'grid', gridTemplateColumns: isPhone ? '1fr' : '1fr 1fr', gap: 8 }}>
            {[
              { n: chronicleEntries.length, l: 'Entries' },
              { n: uniqueActiveDays, l: 'Days Active' },
              { n: streakDays, l: 'Day Streak' },
              { n: monthsDeep, l: 'Months Deep' },
            ].map((stat) => (
              <div key={stat.l} style={{ background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{stat.n}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{stat.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Library Health</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card-inner)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{localLibraryCount} owned book{localLibraryCount === 1 ? '' : 's'}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Imported discipleship sources available to Chronicle.</div>
            </div>
            <div style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card-inner)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{answeredPrayerCount} answered prayer{answeredPrayerCount === 1 ? '' : 's'}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Prayer history now folded into Chronicle&apos;s formation signals.</div>
            </div>
            <div style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card-inner)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{prayerFormation.followUpDueCount} prayer follow-up{prayerFormation.followUpDueCount === 1 ? '' : 's'} due</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Open requests that Chronicle thinks need another touch right now.</div>
            </div>
            <div style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card-inner)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                {chronicleSyncLatest ? 'Portable snapshot available' : (toggles.iCloudBackup ? 'Sync posture ready' : 'Manual-only posture')}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                {chronicleSyncLatest
                  ? `Latest snapshot: ${new Date(chronicleSyncLatest.createdAt).toLocaleDateString()}`
                  : 'The UI is now being shaped toward local-first sync across desktop, iPad, and iPhone.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function nowMonthDiff(start: Date, end: Date) {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}
