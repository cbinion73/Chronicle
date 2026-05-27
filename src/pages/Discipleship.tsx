import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DISCIPLESHIP_MODULE, getStudyDay, type StudyModuleDay } from '../lib/studyModules';
import { useAppStore } from '../store';
import { useAIChatStore } from '../store/aiChatStore';
import { useToastStore } from '../store/toastStore';
import { getBibleNavigationTarget } from '../lib/scriptureReference';
import { getRelatedChronicleEntries } from '../lib/chronicleRelations';
import { useResponsiveLayout } from '../lib/useResponsiveLayout';
import type {
  ChronicleBookAssetMap,
  OwnedBook,
  OwnedBookDaySourceDiagnostics,
  OwnedBookDailyPlan,
  OwnedBookPageSlice,
  OwnedBookPlanDay,
  OwnedBookSourceDiagnostics,
  OwnedBookStudyBlock,
  OwnedBookStudyDayEntry,
  OwnedBookStudyLayout,
  OwnedBookStudyState,
  OwnedBookWorkbookFieldKey,
  OwnedBookWorkbookOverlay,
} from '../types';

type ImportedMasterlifeSource = {
  sourceTitle: string;
  weekTitles: Array<{ week: number; title: string }>;
  sixDisciplines: string[];
};

type WorkbookFieldKey = OwnedBookWorkbookFieldKey;
type WorkbookOverlayField = OwnedBookWorkbookOverlay;

type DiscipleshipSession = StudyModuleDay & {
  sourceText?: string;
  sourcePageStart?: number;
  sourcePageEnd?: number;
  sourcePageSlices?: OwnedBookPageSlice[];
  sourceDiagnostics?: OwnedBookDaySourceDiagnostics;
  studyLayout?: OwnedBookStudyLayout;
  workbookOverlays?: OwnedBookWorkbookOverlay[];
};

type LibraryBookRecord = {
  id: string;
  title: string;
  storedPath: string;
  assets?: ChronicleBookAssetMap;
  status: 'uploaded' | 'ocr_complete' | 'structured';
  uploadedAt: string;
  updatedAt: string;
  ocrTextPath?: string | null;
  workflow?: 'auto-detect' | 'preserve-daily' | 'ai-daily-study';
  classification?: 'daily-study' | 'general-book';
  summary?: string;
  generatedPlan?: OwnedBookDailyPlan;
};

type WorkbookAuditCuePage = {
  pageNumber: number;
  cueLabels: string[];
};

type WorkbookAuditEntry = {
  bookId: string;
  title: string;
  day: number;
  section?: string;
  pageRange: number[];
  coveredPages: number[];
  cuePages: WorkbookAuditCuePage[];
  uncoveredCuePages: WorkbookAuditCuePage[];
};

function generationStrategyLabel(strategy?: OwnedBookDailyPlan['generationStrategy']) {
  if (strategy === 'preserved-daily') return 'Preserved daily source';
  if (strategy === 'source-sections') return 'Built from source sections';
  if (strategy === 'paragraph-chunks') return 'Built from paragraph chunks';
  return 'Daily Bible-study plan';
}

function sourceHealthTone(health?: OwnedBookSourceDiagnostics['sourceHealth']) {
  if (health === 'high') return { border: 'rgba(6, 95, 70, 0.24)', background: 'rgba(6, 95, 70, 0.08)', color: '#065f46' };
  if (health === 'medium') return { border: 'rgba(180, 83, 9, 0.24)', background: 'rgba(217, 119, 6, 0.08)', color: '#b45309' };
  return { border: 'rgba(180, 35, 24, 0.24)', background: 'rgba(249, 112, 102, 0.1)', color: '#b42318' };
}

function sourceStructureLabel(structure?: OwnedBookDaySourceDiagnostics['structure']) {
  if (structure === 'question-driven') return 'Question-driven'
  if (!structure) return 'Source-guided'
  return structure.charAt(0).toUpperCase() + structure.slice(1)
}

function summarizeBookStructures(book: OwnedBook | null) {
  const counts = new Map<string, number>()
  for (const day of book?.generatedPlan?.days || []) {
    const structure = day.sourceDiagnostics?.structure
    if (!structure) continue
    counts.set(structure, (counts.get(structure) || 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 2)
    .map(([structure, count]) => `${sourceStructureLabel(structure as OwnedBookDaySourceDiagnostics['structure'])} (${count})`)
}

const FALLBACK_SOURCE: ImportedMasterlifeSource = {
  sourceTitle: 'MasterLife 1: The Disciple’s Cross',
  weekTitles: [],
  sixDisciplines: [],
};

const EMPTY_DAY_ENTRY: OwnedBookStudyDayEntry = {
  highlight: '',
  underline: '',
  notes: '',
  decisionResponse: '',
  followUpResponse: '',
  activityResponse: '',
  yesNoResponse: '',
  annotationResponse: '',
  faithResponseChoice: '',
  abramObservation: '',
  memoryVerseWrite: '',
  dailyReviewMeaningful: '',
  dailyReviewPrayer: '',
  dailyReviewAction: '',
  stillness: '',
  story: '',
  scriptureTruth: '',
  truthForMe: '',
  examination: '',
  prayerResponse: '',
  stepToday: '',
  actsAdoration: '',
  actsConfession: '',
  actsThanksgiving: '',
  actsSupplication: '',
  accountabilityResponse: '',
};

function createDefaultStudyState(currentDay: number): OwnedBookStudyState {
  return {
    currentDay,
    bookmarks: [],
    entriesByDay: {},
  };
}

function getBookTotalDays(book: OwnedBook | null) {
  if (!book) return 1;
  if (book.id === 'masterlife-book-1') return DISCIPLESHIP_MODULE.totalDays;
  return book.generatedPlan?.totalDays || 30;
}

function getBookDaysPerWeek(book: OwnedBook | null) {
  if (!book) return 7;
  if (book.id === 'masterlife-book-1') return DISCIPLESHIP_MODULE.daysPerWeek || 5;
  return book.generatedPlan?.daysPerWeek || (book.workflow === 'preserve-daily' ? 5 : 7);
}

const GENERATED_DAY_PATTERNS = [
  {
    label: 'Read & Observe',
    focusLead: 'Start by reading slowly and noticing what is actually on the page.',
    stillnessPrompt: 'Before reading, ask the Lord to quiet you and help you notice what is really here.',
    storyPrompt: 'Walk back through the reading in order. What happened, what ideas repeated, and where did the tension or emphasis rise?',
    stepsPrompts: [
      'Scripture truth: What did you notice first that seems important today?',
      'Truth for me: What part of the reading immediately presses on your life?',
      'Examination: What did you almost skim past too quickly?',
      'Prayer response: What do you want to say to God after this first read?',
      'Step today: What is one thing you will revisit later today?',
    ],
    accountability: 'What observation do you want to remember before you move on too quickly?',
  },
  {
    label: 'Interpret & Clarify',
    focusLead: 'Push past first impressions and clarify what the author is emphasizing.',
    stillnessPrompt: 'Ask for understanding, not just inspiration, as you come back to the text.',
    storyPrompt: 'Retell the argument or movement again, but this time ask what the author seems to be driving toward.',
    stepsPrompts: [
      'Scripture truth: What central idea seems clearest after a second look?',
      'Truth for me: Where does this truth confront or steady you?',
      'Examination: What assumptions need to be corrected today?',
      'Prayer response: How does clearer understanding reshape your prayer?',
      'Step today: What one sentence would summarize today’s lesson?',
    ],
    accountability: 'How would you explain today’s central truth to someone else in one sentence?',
  },
  {
    label: 'Reflect & Internalize',
    focusLead: 'Let the truth move from analysis into your inner life.',
    stillnessPrompt: 'Ask the Spirit to move what you read from your head into your heart.',
    storyPrompt: 'Where does this reading meet your fears, habits, hopes, or current season most directly?',
    stepsPrompts: [
      'Scripture truth: What part of the reading feels weightiest today?',
      'Truth for me: Where is this becoming personal instead of abstract?',
      'Examination: What resistance is surfacing in you?',
      'Prayer response: What needs surrender, honesty, or trust today?',
      'Step today: What inward response do you need to keep practicing?',
    ],
    accountability: 'What is God pressing into your inner life today that you do not want to avoid?',
  },
  {
    label: 'Respond in Prayer',
    focusLead: 'Turn the reading back into conversation with God.',
    stillnessPrompt: 'Slow down and come to God with today’s reading open in your hands.',
    storyPrompt: 'What lines, themes, or convictions from the reading naturally become prayer?',
    stepsPrompts: [
      'Scripture truth: What in today’s reading most reveals God’s heart or character?',
      'Truth for me: What do you need to bring honestly before God right now?',
      'Examination: What part of your prayer life needs renewal?',
      'Prayer response: What will you actually pray because of this reading?',
      'Step today: What prayer will you return to later today?',
    ],
    accountability: 'What specific prayer are you committing to carry through the day?',
  },
  {
    label: 'Practice & Obey',
    focusLead: 'Move from insight to one clear act of obedience.',
    stillnessPrompt: 'Ask God for courage to obey what He is showing you.',
    storyPrompt: 'If this reading shaped your choices today, what would look different by tonight?',
    stepsPrompts: [
      'Scripture truth: What response does this reading call for?',
      'Truth for me: Where is obedience most concrete today?',
      'Examination: What excuse or delay are you tempted to accept?',
      'Prayer response: Ask for help to obey simply and quickly.',
      'Step today: What one visible action will you take today?',
    ],
    accountability: 'What exact act of obedience will you complete today?',
  },
  {
    label: 'Journal & Connect',
    focusLead: 'Gather the week’s insights and connect them to your larger walk with God.',
    stillnessPrompt: 'Ask the Lord to help you see connections, not just isolated thoughts.',
    storyPrompt: 'How does today’s reading connect with things God has already been surfacing this week?',
    stepsPrompts: [
      'Scripture truth: What theme is beginning to repeat for you?',
      'Truth for me: How is this reading connecting to your current season or calling?',
      'Examination: What patterns are becoming easier to notice?',
      'Prayer response: What needs to be recorded before it slips away?',
      'Step today: What note, memory, or testimony should you capture in Chronicle?',
    ],
    accountability: 'What connection from this week do you want to preserve in writing?',
  },
  {
    label: 'Review & Prepare',
    focusLead: 'Review what God has been doing and prepare your heart for the next stretch.',
    stillnessPrompt: 'Thank God for what He has shown you and ask for readiness for what is next.',
    storyPrompt: 'Look back over the last several days. What has become clearer, heavier, or more hopeful?',
    stepsPrompts: [
      'Scripture truth: What truth from this week do you most need to keep carrying?',
      'Truth for me: Where have you actually changed, even in a small way?',
      'Examination: What still needs attention before you move on?',
      'Prayer response: Offer thanks and ask for grace for the coming week.',
      'Step today: What will you carry forward into next week’s reading?',
    ],
    accountability: 'What is the main thing you do not want to lose from this week?',
  },
] as const;

function buildGeneratedSession(book: OwnedBook, day: number): DiscipleshipSession {
  const totalDays = Math.max(1, getBookTotalDays(book));
  const phases = book.generatedPlan?.phases || [{ label: 'Daily Reading', emphasis: book.summary }];
  const sourceDay = book.generatedPlan?.days?.find((entry) => entry.day === day);
  const phaseIndex = Math.min(
    phases.length - 1,
    Math.floor(((day - 1) / totalDays) * phases.length),
  );
  const phase = sourceDay?.phase
    ? { label: sourceDay.phase, emphasis: sourceDay.focus }
    : phases[phaseIndex] || phases[0];
  const bookTitle = book.generatedPlan?.title || book.title;
  const daysPerWeek = getBookDaysPerWeek(book);
  const week = sourceDay?.week || Math.ceil(day / daysPerWeek);
  const dayOfWeek = ((day - 1) % daysPerWeek) + 1;
  const pattern = GENERATED_DAY_PATTERNS[dayOfWeek - 1];

  if (sourceDay) {
    const scripture = sourceDay.scripture || sourceDay.dailyReading || 'Read today’s source section';
    const title = sourceDay.title || pattern.label;
    const sourceLabel = sourceDay.sourceSection || title;

    return {
      day,
      week,
      phase: phase.label,
      title,
      scripture,
      focus: sourceDay.focus || `${pattern.focusLead} ${phase.emphasis}`,
      stillnessPrompt: `${pattern.stillnessPrompt} As you read ${bookTitle}, ask for a clear next step.`,
      storyPrompt: `Summarize the movement of today’s source section, “${sourceLabel}.” What is the author asking you to notice, practice, or surrender?`,
      stepsPrompts: [
        `Scripture truth: What does ${scripture} reveal that supports today’s section?`,
        `Truth for me: Where does “${sourceLabel}” press on your actual obedience today?`,
        pattern.stepsPrompts[2],
        pattern.stepsPrompts[3],
        `Step today: Complete today’s source assignment and name one concrete action.`,
      ],
      actsPrayer: [
        `Adoration: praise God for the truth highlighted in ${scripture}.`,
        'Confession: name any resistance or neglect that surfaced.',
        'Thanksgiving: thank God for one clear gift in the reading.',
        'Supplication: ask for help to live out today’s lesson.',
      ],
      accountability: `What will show by tonight that Day ${dayOfWeek}, “${sourceLabel},” became obedience and not just reading?`,
      leaderNote: 'Stay concrete. The point is not to admire the material but to let it reorder a real day.',
      partnerNote: 'Honest, consistent steps matter more than impressive answers.',
      dailyReading: sourceDay.dailyReading || scripture,
      memoryVerse: sourceDay.memoryVerse,
      sourceSection: sourceDay.sourceSection,
      sourceText: sourceDay.sourceText,
      sourcePageStart: sourceDay.sourcePageStart,
      sourcePageEnd: sourceDay.sourcePageEnd,
      sourcePageSlices: sourceDay.sourcePageSlices,
      sourceExcerpt: sourceDay.sourceExcerpt,
      sourceDiagnostics: sourceDay.sourceDiagnostics,
      studyLayout: sourceDay.studyLayout,
      workbookOverlays: sourceDay.workbookOverlays,
    };
  }

  return {
    day,
    week,
    phase: phase.label,
    title: `${pattern.label}`,
    scripture: book.workflow === 'preserve-daily' ? 'Follow the source passage for today' : 'Pair today’s section with a supporting passage',
    focus: `${pattern.focusLead} ${phase.emphasis}`,
    stillnessPrompt: `${pattern.stillnessPrompt} As you read ${bookTitle}, ask for a clear next step.`,
    storyPrompt: pattern.storyPrompt,
    stepsPrompts: [...pattern.stepsPrompts],
    actsPrayer: [
      'Adoration: praise God for what today reveals about His character.',
      'Confession: name any resistance or neglect that surfaced.',
      'Thanksgiving: thank God for one clear gift in the reading.',
      'Supplication: ask for help to live out today’s lesson.',
    ],
    accountability: pattern.accountability,
    leaderNote: 'Stay concrete. The point is not to admire the material but to let it reorder a real day.',
    partnerNote: 'Honest, consistent steps matter more than impressive answers.',
  };
}

function fallbackDynamicLayout(day: OwnedBookPlanDay): OwnedBookStudyLayout {
  const supportingPassages = Array.from(new Set([day.scripture, day.dailyReading].filter(Boolean) as string[])).slice(0, 3);
  return {
    title: day.title,
    summary: day.focus,
    supportingPassages,
    blocks: [
      {
        id: `overview-${day.day}`,
        type: 'overview',
        title: 'Today’s Aim',
        body: day.focus,
        emphasis: day.phase || 'Daily Study',
        span: 'full',
      },
      {
        id: `scripture-${day.day}`,
        type: 'scripture',
        title: 'Bible Reading',
        body: day.scripture || day.dailyReading || 'Read today’s Scripture support.',
        reference: day.scripture || day.dailyReading,
        span: 'half',
      },
      {
        id: `reading-${day.day}`,
        type: 'reading',
        title: 'Source Reading',
        body: day.sourceExcerpt || day.sourceText || 'Read today’s source portion slowly and carefully.',
        reference: day.sourceSection || day.title,
        span: 'half',
      },
      {
        id: `questions-${day.day}`,
        type: 'questions',
        title: 'Study Questions',
        items: [
          'What is the clearest truth or burden in today’s reading?',
          'Where does this day connect most directly with the attached Scripture?',
          'What response is God inviting from you today?',
        ],
        span: 'full',
      },
    ],
  };
}

function toneForStudyBlock(type: OwnedBookStudyBlock['type']) {
  switch (type) {
    case 'scripture':
      return { background: 'rgba(43, 141, 255, 0.09)', borderColor: 'rgba(15, 79, 207, 0.18)' };
    case 'prayer':
      return { background: 'rgba(59, 130, 246, 0.08)', borderColor: 'rgba(59, 130, 246, 0.18)' };
    case 'practice':
      return { background: 'rgba(249, 115, 22, 0.08)', borderColor: 'rgba(249, 115, 22, 0.18)' };
    case 'quote':
      return { background: 'rgba(139, 92, 246, 0.08)', borderColor: 'rgba(139, 92, 246, 0.18)' };
    default:
      return { background: 'var(--card-bg)', borderColor: 'var(--border)' };
  }
}

function renderStudyBlock(block: OwnedBookStudyBlock) {
  const tone = toneForStudyBlock(block.type);

  return (
    <div
      key={block.id}
      style={{
        gridColumn: block.span === 'full' ? '1 / -1' : 'span 1',
        background: tone.background,
        border: `1px solid ${tone.borderColor}`,
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={eyebrowStyle}>{block.title}</div>
        {block.reference && (
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-green)' }}>{block.reference}</div>
        )}
      </div>
      {block.emphasis && (
        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-sub)' }}>{block.emphasis}</div>
      )}
      {block.body && (
        <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.75, color: 'var(--text)' }}>{block.body}</div>
      )}
      {!!block.items?.length && (
        <ul style={{ margin: '10px 0 0', paddingLeft: 18, lineHeight: 1.75, color: 'var(--text)' }}>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function buildWorkbookPageNumbers(session: DiscipleshipSession) {
  if (session.sourcePageSlices?.length) return session.sourcePageSlices.map((slice) => slice.pageNumber);
  const start = session.sourcePageStart || 1;
  const end = session.sourcePageEnd || start;
  return Array.from({ length: Math.max(1, end - start + 1) }, (_, index) => start + index);
}

function buildWorkbookPageSlices(session: DiscipleshipSession) {
  if (session.sourcePageSlices?.length) return session.sourcePageSlices;
  return buildWorkbookPageNumbers(session).map((pageNumber) => ({ pageNumber }));
}

function buildWorkbookOverlayFields(session: DiscipleshipSession): WorkbookOverlayField[] {
  const pages = buildWorkbookPageNumbers(session);
  const firstPage = pages[0];
  const secondPage = pages[Math.min(1, pages.length - 1)];
  const lastPage = pages[pages.length - 1];

  return [
    {
      key: 'highlight',
      label: 'Highlight',
      prompt: 'Key line or takeaway',
      placeholder: 'What stands out?',
      pageNumber: firstPage,
      x: 6,
      y: 8,
      width: 40,
      minHeight: 96,
    },
    {
      key: 'underline',
      label: 'Underline',
      prompt: 'Exact phrase to hold onto',
      placeholder: 'What phrase would you underline?',
      pageNumber: firstPage,
      x: 54,
      y: 8,
      width: 40,
      minHeight: 96,
    },
    {
      key: 'notes',
      label: 'Notes',
      prompt: 'Observations, questions, cross-references',
      placeholder: 'Capture notes directly over the workbook page.',
      pageNumber: firstPage,
      x: 6,
      y: 22,
      width: 88,
      minHeight: 138,
    },
    {
      key: 'stillness',
      label: 'Stillness',
      prompt: session.stillnessPrompt,
      placeholder: 'What surfaced as you slowed down?',
      pageNumber: secondPage,
      x: 6,
      y: 8,
      width: 42,
      minHeight: 116,
    },
    {
      key: 'story',
      label: 'Story',
      prompt: session.storyPrompt,
      placeholder: 'Retell the movement of the passage or reading.',
      pageNumber: secondPage,
      x: 52,
      y: 8,
      width: 42,
      minHeight: 116,
    },
    {
      key: 'scriptureTruth',
      label: 'Scripture Truth',
      prompt: session.stepsPrompts[0],
      placeholder: 'What is the text saying?',
      pageNumber: lastPage,
      x: 6,
      y: 10,
      width: 42,
      minHeight: 120,
    },
    {
      key: 'truthForMe',
      label: 'Truth for Me',
      prompt: session.stepsPrompts[1],
      placeholder: 'Where is this landing in your life?',
      pageNumber: lastPage,
      x: 52,
      y: 10,
      width: 42,
      minHeight: 120,
    },
    {
      key: 'examination',
      label: 'Examination',
      prompt: session.stepsPrompts[2],
      placeholder: 'What is being exposed?',
      pageNumber: lastPage,
      x: 6,
      y: 30,
      width: 42,
      minHeight: 120,
    },
    {
      key: 'prayerResponse',
      label: 'Prayer Response',
      prompt: session.stepsPrompts[3],
      placeholder: 'How are you responding to God?',
      pageNumber: lastPage,
      x: 52,
      y: 30,
      width: 42,
      minHeight: 120,
    },
    {
      key: 'stepToday',
      label: 'Step Today',
      prompt: session.stepsPrompts[4],
      placeholder: 'Name one concrete response.',
      pageNumber: lastPage,
      x: 6,
      y: 50,
      width: 42,
      minHeight: 120,
    },
    {
      key: 'accountabilityResponse',
      label: 'Accountability',
      prompt: session.accountability,
      placeholder: 'What should future-you be held to?',
      pageNumber: lastPage,
      x: 52,
      y: 50,
      width: 42,
      minHeight: 120,
    },
  ];
}

function getWorkbookOverlayFields(book: OwnedBook | null, session: DiscipleshipSession | null) {
  if (!book || !session) return [];
  if (session.workbookOverlays?.length) return session.workbookOverlays;
  if (book.workflow === 'preserve-daily') return [];
  return buildWorkbookOverlayFields(session);
}

function overlayBelongsToSlice(field: WorkbookOverlayField, slice: OwnedBookPageSlice) {
  if (field.pageNumber !== slice.pageNumber) return false;
  if (slice.startY == null && slice.endY == null) return true;
  const start = slice.startY ?? 0;
  const end = slice.endY ?? 100;
  return field.y >= start && field.y <= end;
}

function parseCheckboxValue(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getSessionForBook(book: OwnedBook | null, day: number): DiscipleshipSession | null {
  if (!book) return null;
  if (book.id === 'masterlife-book-1') {
    return getStudyDay('discipleship', Math.min(Math.max(day, 1), DISCIPLESHIP_MODULE.totalDays));
  }
  return buildGeneratedSession(book, day);
}

function getWeekLabel(week: number, source: ImportedMasterlifeSource, phaseLabel?: string) {
  const importedWeek = source.weekTitles.find((entry) => entry.week === week);
  if (importedWeek) return `Week ${week} · ${importedWeek.title}`;
  if (phaseLabel) return `Week ${week} · ${phaseLabel}`;
  return `Week ${week}`;
}

function getMasterlifeWeekLabel(week: number) {
  const day = DISCIPLESHIP_MODULE.days.find((entry) => entry.week === week);
  if (!day) return `Week ${week}`;
  return `Week ${week} · ${day.sourceBook || 'MasterLife'} · ${day.sourceWeekTitle || day.phase}`;
}

function normalizeBookKey(book: OwnedBook) {
  return `${book.title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getPhaseLabelForWeekValue(book: OwnedBook | null, currentPhase: string | undefined, totalWeeks: number, week: number) {
  if (!book?.generatedPlan?.phases?.length) return currentPhase;
  const phaseIndex = Math.min(
    book.generatedPlan.phases.length - 1,
    Math.floor(((week - 1) / totalWeeks) * book.generatedPlan.phases.length),
  );
  return book.generatedPlan.phases[phaseIndex]?.label || currentPhase;
}

function compareBookPriority(left: OwnedBook, right: OwnedBook) {
  const leftScore =
    (left.workflow === 'preserve-daily' ? 100 : 0) +
    (left.classification === 'daily-study' ? 20 : 0) +
    (left.id === 'masterlife-book-1' ? 10 : 0);
  const rightScore =
    (right.workflow === 'preserve-daily' ? 100 : 0) +
    (right.classification === 'daily-study' ? 20 : 0) +
    (right.id === 'masterlife-book-1' ? 10 : 0);

  return rightScore - leftScore;
}

export default function Discipleship() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    ownedBooks,
    activeOwnedBookId,
    chronicleEntries,
    setActiveOwnedBook,
    studyModuleDayById,
    setStudyModuleDay,
    addChronicleEntry,
    setOwnedBookStudyState,
    upsertOwnedBook,
    setBibleView,
  } = useAppStore();
  const { addToast } = useToastStore();
  const setPageContext = useAIChatStore((state) => state.setPageContext);
  const setSelectedAgentMode = useAIChatStore((state) => state.setSelectedAgentMode);
  const { isCompact, isPhone } = useResponsiveLayout();
  const [importedSourceState, setImportedSourceState] = useState<ImportedMasterlifeSource>(FALLBACK_SOURCE);
  const [readerView, setReaderView] = useState<'study' | 'workbook'>('study');
  const [activeWorkbookFieldKey, setActiveWorkbookFieldKey] = useState<WorkbookFieldKey | null>(null);
  const [workbookAuditEntries, setWorkbookAuditEntries] = useState<WorkbookAuditEntry[]>([]);
  const [workbookAuditBusy, setWorkbookAuditBusy] = useState(false);
  const [workbookAuditActionBusy, setWorkbookAuditActionBusy] = useState<'sync' | 'qa' | null>(null);
  const skipReaderResetRef = useRef(false);

  const displayBooks = useMemo(() => {
    const grouped = new Map<string, OwnedBook[]>();
    for (const book of ownedBooks) {
      const key = normalizeBookKey(book);
      const current = grouped.get(key) || [];
      current.push(book);
      grouped.set(key, current);
    }

    return Array.from(grouped.values())
      .map((books) => [...books].sort(compareBookPriority)[0])
      .sort(compareBookPriority);
  }, [ownedBooks]);

  const activeBook = useMemo(
    () => displayBooks.find((book) => book.id === activeOwnedBookId) || displayBooks[0] || null,
    [activeOwnedBookId, displayBooks],
  );
  const isMasterlifeBook = activeBook?.id === 'masterlife-book-1';
  const totalDays = getBookTotalDays(activeBook);
  const daysPerWeek = getBookDaysPerWeek(activeBook);
  const fallbackDay = isMasterlifeBook ? studyModuleDayById.discipleship || 1 : 1;
  const currentStudyState = activeBook?.studyState || createDefaultStudyState(fallbackDay);
  const currentDay = Math.min(Math.max(currentStudyState.currentDay || 1, 1), totalDays);
  const currentSession = getSessionForBook(activeBook, currentDay);
  const currentWeek = currentSession?.week || Math.ceil(currentDay / daysPerWeek);
  const totalWeeks = Math.max(1, Math.ceil(totalDays / daysPerWeek));
  const currentEntry = currentStudyState.entriesByDay[String(currentDay)] || EMPTY_DAY_ENTRY;

  useEffect(() => {
    setSelectedAgentMode('discipleship_coach');
  }, [setSelectedAgentMode]);

  useEffect(() => {
    let cancelled = false;

    async function loadStructuredLibrary() {
      const response = await fetch('/api/study-imports/library');
      if (!response.ok) return;
      const payload = (await response.json()) as { records?: LibraryBookRecord[] };
      if (cancelled) return;

      for (const record of payload.records || []) {
        if (record.status !== 'structured' || !record.generatedPlan) continue;
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
      }
    }

    loadStructuredLibrary().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [upsertOwnedBook]);

  const refreshWorkbookAudit = useCallback(async () => {
    setWorkbookAuditBusy(true);
    try {
      const response = await fetch('/api/study-imports/workbook-audit');
      if (!response.ok) return;
      const payload = (await response.json()) as { audits?: WorkbookAuditEntry[] };
      setWorkbookAuditEntries(payload.audits || []);
    } finally {
      setWorkbookAuditBusy(false);
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void refreshWorkbookAudit();
    }, 0);
    return () => window.clearTimeout(handle);
  }, [refreshWorkbookAudit]);

  useEffect(() => {
    if (activeBook && activeBook.id !== activeOwnedBookId) {
      setActiveOwnedBook(activeBook.id);
    }
  }, [activeBook, activeOwnedBookId, setActiveOwnedBook]);

  useEffect(() => {
    if (skipReaderResetRef.current) {
      skipReaderResetRef.current = false;
      return;
    }
    queueMicrotask(() => {
      setReaderView('study');
      setActiveWorkbookFieldKey(null);
    });
  }, [activeBook?.id, currentDay]);

  useEffect(() => {
    if (!activeBook || !currentSession) return;
    setPageContext('/discipleship', {
      page: 'Discipleship',
      pathname: '/discipleship',
      title: document.title,
      passage: currentSession.scripture,
      ownedBookId: activeBook.id,
      currentDay: currentSession.day,
      readerView,
      selection: `${activeBook.title} · Day ${currentSession.day} · ${currentSession.title}`,
      summary: `Discipleship book ${activeBook.title}. Day ${currentSession.day} of ${getBookTotalDays(activeBook)}. Reader mode: ${readerView}. Workbook overlays on this day: ${(currentSession.workbookOverlays || []).length}.`,
    });
  }, [activeBook, currentSession, readerView, setPageContext]);

  useEffect(() => {
    if (!isMasterlifeBook) {
      queueMicrotask(() => {
        setImportedSourceState(FALLBACK_SOURCE);
      });
      return;
    }

    let cancelled = false;
    async function loadImportedSource() {
      const response = await fetch('/api/study-imports/masterlife-source');
      const payload = (await response.json()) as ImportedMasterlifeSource & { error?: { errmsg?: string } };
      if (cancelled || !response.ok) return;
      setImportedSourceState({
        sourceTitle: payload.sourceTitle || FALLBACK_SOURCE.sourceTitle,
        weekTitles: payload.weekTitles || [],
        sixDisciplines: payload.sixDisciplines || [],
      });
    }

    loadImportedSource().catch(() => {
      if (!cancelled) setImportedSourceState(FALLBACK_SOURCE);
    });
    return () => {
      cancelled = true;
    };
  }, [isMasterlifeBook]);

  const weekOptions = Array.from({ length: totalWeeks }, (_, index) => {
    const week = index + 1;
    return {
      value: week,
      label: isMasterlifeBook
        ? getMasterlifeWeekLabel(week)
        : getWeekLabel(week, importedSourceState, getPhaseLabelForWeekValue(activeBook, currentSession?.phase, totalWeeks, week)),
    };
  });

  const dayOptions = (() => {
    const weekNumber = currentSession?.week || Math.ceil(currentDay / daysPerWeek);
    const start = (weekNumber - 1) * daysPerWeek + 1;
    const end = Math.min(totalDays, start + daysPerWeek - 1);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  })();

  const saveStudyState = useCallback((nextState: OwnedBookStudyState) => {
    if (!activeBook) return;
    setOwnedBookStudyState(activeBook.id, nextState);
    if (isMasterlifeBook) {
      setStudyModuleDay('discipleship', nextState.currentDay);
    }
  }, [activeBook, isMasterlifeBook, setOwnedBookStudyState, setStudyModuleDay]);

  useEffect(() => {
    const request = location.state as { requestedBookId?: string; requestedDay?: number; requestedReaderView?: 'study' | 'workbook' } | null;
    if (request?.requestedBookId && request.requestedBookId !== activeOwnedBookId) {
      const matchingBook = displayBooks.find((book) => book.id === request.requestedBookId);
      if (matchingBook) {
        setActiveOwnedBook(matchingBook.id);
        return;
      }
    }
    if (!request?.requestedBookId || !request?.requestedDay) return;
    if (!activeBook || request.requestedBookId !== activeBook.id) return;
    const nextDay = Math.min(Math.max(request.requestedDay, 1), getBookTotalDays(activeBook));
    const requestedReaderView = request.requestedReaderView;
    if (requestedReaderView) {
      skipReaderResetRef.current = true;
      queueMicrotask(() => setReaderView(requestedReaderView));
    }
    if (currentStudyState.currentDay !== nextDay) {
      saveStudyState({
        ...currentStudyState,
        currentDay: nextDay,
      });
    }
    navigate(location.pathname, { replace: true, state: null });
  }, [activeBook, activeOwnedBookId, currentStudyState, displayBooks, location.pathname, location.state, navigate, saveStudyState, setActiveOwnedBook]);

  function goToDay(nextDay: number) {
    if (!activeBook) return;
    saveStudyState({
      ...currentStudyState,
      currentDay: Math.min(Math.max(nextDay, 1), totalDays),
    });
  }

  function updateDayEntry<K extends keyof OwnedBookStudyDayEntry>(key: K, value: OwnedBookStudyDayEntry[K]) {
    if (!activeBook) return;
    const nextEntries = {
      ...currentStudyState.entriesByDay,
      [String(currentDay)]: {
        ...EMPTY_DAY_ENTRY,
        ...currentEntry,
        [key]: value,
        updatedAt: new Date().toISOString(),
      },
    };
    saveStudyState({
      ...currentStudyState,
      entriesByDay: nextEntries,
    });
  }

  function addBookmark() {
    if (!activeBook || !currentSession) return;
    const existing = currentStudyState.bookmarks.find((bookmark) => bookmark.day === currentDay);
    if (existing) {
      addToast('This day is already bookmarked.', 'warning', '🔖');
      return;
    }

    const bookmark = {
      id: Math.random().toString(36).slice(2),
      day: currentDay,
      label: `Week ${currentSession.week} · Day ${currentSession.day} · ${currentSession.title}`,
      createdAt: new Date().toISOString(),
    };

    saveStudyState({
      ...currentStudyState,
      bookmarks: [bookmark, ...currentStudyState.bookmarks],
    });
    addToast('Bookmark added.', 'success', '🔖');
  }

  function removeBookmark(bookmarkId: string) {
    if (!activeBook) return;
    saveStudyState({
      ...currentStudyState,
      bookmarks: currentStudyState.bookmarks.filter((bookmark) => bookmark.id !== bookmarkId),
    });
  }

  function completeToday() {
    if (!activeBook || !currentSession) return;
    addChronicleEntry({
      id: Math.random().toString(36).slice(2),
      date: new Date().toISOString().split('T')[0],
      type: 'study',
      title: `${activeBook.title} — Day ${currentSession.day} complete`,
      body: `${currentSession.title}\n\nFocus: ${currentSession.focus}\n\nAccountability: ${currentSession.accountability}\n\nNotes: ${currentEntry.notes || 'No notes yet.'}`,
      passage: currentSession.scripture,
      autoCapture: true,
      sourceContext: {
        page: 'discipleship',
        passage: currentSession.scripture,
        ownedBookId: activeBook.id,
        currentDay: currentSession.day,
        readerView,
      },
    });

    const nextDay = Math.min(totalDays, currentDay + 1);
    saveStudyState({
      ...currentStudyState,
      currentDay: nextDay,
    });
    addToast(`Saved Day ${currentSession.day}.`, 'success', '📘');
  }

  if (!activeBook || !currentSession) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ maxWidth: 540, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>Discipleship</div>
          <div style={{ marginTop: 10, fontSize: 15, lineHeight: 1.7, color: 'var(--text-sub)' }}>
            Once you import a book in Settings, this page becomes your daily reader, study workbook, and note space.
          </div>
          <button type="button" onClick={() => window.location.assign('/settings')} style={{ ...primaryButtonStyle, marginTop: 18 }}>
            Import Books in Settings
          </button>
        </div>
      </div>
    );
  }

  const phaseChips = isMasterlifeBook ? importedSourceState.sixDisciplines : activeBook.generatedPlan?.phases.map((phase) => phase.label) || [];
  const hasMappedPages =
    typeof currentSession.sourcePageStart === 'number'
    && typeof currentSession.sourcePageEnd === 'number'
    && currentSession.sourcePageStart > 0
    && currentSession.sourcePageEnd >= currentSession.sourcePageStart;
  const workbookFields = getWorkbookOverlayFields(activeBook, currentSession);
  const workbookSlices = buildWorkbookPageSlices(currentSession);
  const workbookPages = Array.from(
    new Set([
      ...workbookSlices.map((slice) => slice.pageNumber),
      ...workbookFields.map((field) => field.pageNumber),
    ]),
  ).sort((left, right) => left - right);
  const sourceViewAvailable = activeBook.sourcePath.toLowerCase().endsWith('.pdf');
  const currentStudyLayout = currentSession.studyLayout || fallbackDynamicLayout({
    day: currentSession.day,
    week: currentSession.week,
    title: currentSession.title,
    scripture: currentSession.scripture,
    focus: currentSession.focus,
    phase: currentSession.phase,
    sourceSection: currentSession.sourceSection,
    sourceExcerpt: currentSession.sourceExcerpt,
    sourceText: currentSession.sourceText,
    sourcePageStart: currentSession.sourcePageStart,
    sourcePageEnd: currentSession.sourcePageEnd,
    sourcePageSlices: currentSession.sourcePageSlices,
    dailyReading: currentSession.dailyReading,
    memoryVerse: currentSession.memoryVerse,
  });
  const currentWorkbookAudit = workbookAuditEntries.find((entry) => entry.bookId === activeBook.id && entry.day === currentDay) || null;
  const flaggedWorkbookAuditDays = workbookAuditEntries
    .filter((entry) => entry.bookId === activeBook.id && entry.uncoveredCuePages.length > 0)
    .sort((left, right) => left.day - right.day);
  const nextFlaggedWorkbookAudit =
    flaggedWorkbookAuditDays.find((entry) => entry.day > currentDay)
    || flaggedWorkbookAuditDays[0]
    || null;
  const relatedChronicleEntries = getRelatedChronicleEntries(chronicleEntries, {
    page: 'discipleship',
    passage: currentSession.scripture,
    ownedBookId: activeBook.id,
    currentDay,
    readerView,
    limit: 4,
  });

  function openSessionPassageInBible(openThemes = false) {
    if (!currentSession) return;
    const primaryPassage = currentStudyLayout.supportingPassages[0] || currentSession.scripture || currentSession.dailyReading;
    if (!primaryPassage) return;
    const target = getBibleNavigationTarget(primaryPassage);
    if (target) {
      setBibleView({
        book: target.book,
        chapter: target.chapter,
        overlayOn: openThemes,
        showThemePanel: openThemes,
        panelMode: 'themes',
        echoesOn: false,
        studyColorsOn: false,
      });
    }
    navigate('/bible');
  }

  function prayThisDay() {
    if (!currentSession) return;
    const primaryPassage = currentStudyLayout.supportingPassages[0] || currentSession.scripture || currentSession.dailyReading || '';
    navigate('/prayer', {
      state: {
        source: 'discipleship',
        title: `${activeBook.title} · Day ${currentSession.day}`,
        passage: primaryPassage,
        prompt: `Lord, use ${primaryPassage || 'today’s reading'} to form me through ${activeBook.title}. ${currentSession.focus}`,
      },
    });
  }

  async function runWorkbookSync() {
    setWorkbookAuditActionBusy('sync');
    try {
      const response = await fetch('/api/study-imports/run-workbook-sync', { method: 'POST' });
      const payload = await response.json() as { error?: { errmsg?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.errmsg || 'Workbook sync failed.');
      }
      await refreshWorkbookAudit();
      addToast('Workbook overlay sync completed.', 'success', '📘');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Workbook sync failed.', 'warning', 'AI');
    } finally {
      setWorkbookAuditActionBusy(null);
    }
  }

  async function runWorkbookQa() {
    setWorkbookAuditActionBusy('qa');
    try {
      const response = await fetch('/api/study-imports/run-workbook-qa', { method: 'POST' });
      const payload = await response.json() as { error?: { errmsg?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.errmsg || 'Workbook QA failed.');
      }
      await refreshWorkbookAudit();
      addToast('Workbook QA completed.', 'success', '📘');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Workbook QA failed.', 'warning', 'AI');
    } finally {
      setWorkbookAuditActionBusy(null);
    }
  }

  return (
    <div style={{ flex: 1, overflow: 'hidden' }}>
      <div style={{ height: '100%', overflowY: 'auto', padding: isPhone ? '14px 14px 24px' : '16px 18px 28px' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <section style={{ ...heroPanelStyle, padding: isPhone ? '16px' : heroPanelStyle.padding }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ maxWidth: 820 }}>
                <div style={eyebrowStyle}>Discipleship</div>
                <div style={{ marginTop: 6, fontSize: 30, fontWeight: 750, color: 'var(--text)' }}>{activeBook.title}</div>
                <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.7, color: 'var(--text-sub)', maxWidth: 780 }}>
                  {activeBook.summary}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => window.location.assign('/settings')} style={ghostButtonStyle}>
                  Import Books
                </button>
                <button type="button" onClick={() => openSessionPassageInBible(false)} style={ghostButtonStyle}>
                  Open in Bible
                </button>
                <button type="button" onClick={prayThisDay} style={ghostButtonStyle}>
                  Pray This Day
                </button>
                <button type="button" onClick={addBookmark} style={secondaryButtonStyle}>
                  Bookmark This Day
                </button>
                <button type="button" onClick={completeToday} style={primaryButtonStyle}>
                  Complete Today
                </button>
              </div>
            </div>

            {phaseChips.length > 0 && (
              <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {phaseChips.slice(0, 6).map((chip) => (
                  <span key={chip} style={chipStyle}>{chip}</span>
                ))}
              </div>
            )}
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : readerView === 'workbook' ? '250px minmax(0, 1fr)' : '250px minmax(0, 1.45fr) minmax(320px, 0.9fr)', gap: 16, alignItems: 'start' }}>
            <aside style={isCompact ? { ...sidebarPanelStyle, position: 'static', top: 'auto' } : sidebarPanelStyle}>
              <div style={eyebrowStyle}>Library</div>
              <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                {displayBooks.map((book) => {
                  const selected = book.id === activeBook.id;
                  return (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => setActiveOwnedBook(book.id)}
                      style={{
                        ...libraryItemStyle,
                        border: selected ? '1px solid var(--accent-green)' : '1px solid var(--border)',
                        background: selected ? 'var(--accent-green-light)' : 'var(--card-inner)',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{book.title}</div>
                      <div style={{ marginTop: 4, fontSize: 11, lineHeight: 1.5, color: 'var(--text-muted)' }}>
                        {book.workflow === 'preserve-daily'
                          ? 'Daily devotional preserved'
                          : generationStrategyLabel(book.generatedPlan?.generationStrategy)}
                      </div>
                      {book.generatedPlan?.sourceDiagnostics ? (
                        <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: 999,
                            border: `1px solid ${sourceHealthTone(book.generatedPlan.sourceDiagnostics.sourceHealth).border}`,
                            background: sourceHealthTone(book.generatedPlan.sourceDiagnostics.sourceHealth).background,
                            color: sourceHealthTone(book.generatedPlan.sourceDiagnostics.sourceHealth).color,
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: 'capitalize',
                          }}>
                            {book.generatedPlan.sourceDiagnostics.sourceHealth} source
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            {book.generatedPlan.sourceDiagnostics.mappedDayCount}/{book.generatedPlan.sourceDiagnostics.totalDays} days mapped
                          </span>
                        </div>
                      ) : null}
                      {summarizeBookStructures(book).length ? (
                        <div style={{ marginTop: 4, fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                          {summarizeBookStructures(book).join(' · ')}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={eyebrowStyle}>Bookmarks</div>
                <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                  {currentStudyState.bookmarks.length > 0 ? currentStudyState.bookmarks.map((bookmark) => (
                    <div key={bookmark.id} style={bookmarkRowStyle}>
                      <button type="button" onClick={() => goToDay(bookmark.day)} style={bookmarkJumpStyle}>
                        {bookmark.label}
                      </button>
                      <button type="button" onClick={() => removeBookmark(bookmark.id)} style={bookmarkRemoveStyle}>
                        Remove
                      </button>
                    </div>
                  )) : (
                    <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-muted)' }}>
                      Save multiple bookmarks to jump back to important days or sections.
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={eyebrowStyle}>Related Chronicle Entries</div>
                <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                  {relatedChronicleEntries.length > 0 ? relatedChronicleEntries.map((entry) => (
                    <div key={entry.id} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--card-inner)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{entry.title}</div>
                      <div style={{ marginTop: 4, fontSize: 11, lineHeight: 1.55, color: 'var(--text-sub)' }}>{entry.body}</div>
                    </div>
                  )) : (
                    <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-muted)' }}>
                      Chronicle entries saved from this day will stay visible here so the workbook and your reflections stay connected.
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate('/chronicle', { state: { filterPassage: currentSession.scripture } })}
                    style={ghostButtonStyle}
                  >
                    Open in Chronicle
                  </button>
                </div>
              </div>
            </aside>

            <main style={{ display: 'grid', gap: 16 }}>
              <section style={{ ...readerPanelStyle, padding: isPhone ? '16px' : readerPanelStyle.padding }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div>
                    <div style={eyebrowStyle}>{getWeekLabel(currentWeek, importedSourceState, getPhaseLabelForWeekValue(activeBook, currentSession?.phase, totalWeeks, currentWeek))}</div>
                    <div style={{ marginTop: 6, fontSize: 26, fontWeight: 740, color: 'var(--text)' }}>
                      Day {currentSession.day} · {currentSession.title}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 14, color: 'var(--text-sub)' }}>{currentSession.phase}</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => goToDay(currentDay - 1)} disabled={currentDay === 1} style={navButtonStyle}>
                      ←
                    </button>
                    <select value={currentWeek} onChange={(event) => goToDay((Number(event.target.value) - 1) * daysPerWeek + 1)} style={selectStyle}>
                      {weekOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <select value={currentDay} onChange={(event) => goToDay(Number(event.target.value))} style={selectStyle}>
                      {dayOptions.map((day) => (
                        <option key={day} value={day}>Day {day}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => goToDay(currentDay + 1)} disabled={currentDay === totalDays} style={navButtonStyle}>
                      →
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 16, display: 'grid', gap: 16 }}>
                  {currentWorkbookAudit && (
                    <div style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: `1px solid ${currentWorkbookAudit.uncoveredCuePages.length > 0 ? 'rgba(180, 35, 24, 0.2)' : 'rgba(15, 79, 207, 0.18)'}`,
                      background: currentWorkbookAudit.uncoveredCuePages.length > 0 ? 'rgba(249, 112, 102, 0.08)' : 'rgba(15, 79, 207, 0.06)',
                      display: 'grid',
                      gap: 8,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div>
                          <div style={eyebrowStyle}>Workbook QA</div>
                          <div style={{ marginTop: 4, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                            {currentWorkbookAudit.uncoveredCuePages.length > 0
                              ? 'Some response cues still need overlay coverage'
                              : currentWorkbookAudit.cuePages.length > 0
                                ? 'Chronicle found workbook cues and believes this day is covered'
                                : 'Chronicle found no interactive workbook cues on this day'}
                          </div>
                        </div>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: 999,
                          border: '1px solid var(--border)',
                          background: 'var(--card-inner)',
                          fontSize: 11,
                          fontWeight: 700,
                          color: currentWorkbookAudit.uncoveredCuePages.length > 0 ? '#b42318' : 'var(--accent-blue)',
                        }}>
                          {currentWorkbookAudit.uncoveredCuePages.length > 0
                            ? `${currentWorkbookAudit.uncoveredCuePages.length} uncovered cue page${currentWorkbookAudit.uncoveredCuePages.length === 1 ? '' : 's'}`
                            : currentWorkbookAudit.cuePages.length > 0
                              ? `${currentWorkbookAudit.cuePages.length} cue page${currentWorkbookAudit.cuePages.length === 1 ? '' : 's'} covered`
                              : 'Plain reading slice'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.6 }}>
                        Pages {currentWorkbookAudit.pageRange.join(', ')} · Covered pages: {currentWorkbookAudit.coveredPages.length > 0 ? currentWorkbookAudit.coveredPages.join(', ') : 'none yet'}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {currentWorkbookAudit.cuePages.length > 0 && readerView !== 'workbook' && (
                          <button type="button" onClick={() => setReaderView('workbook')} style={ghostButtonStyle}>
                            Review Workbook
                          </button>
                        )}
                        {nextFlaggedWorkbookAudit && nextFlaggedWorkbookAudit.day !== currentDay && (
                          <button type="button" onClick={() => goToDay(nextFlaggedWorkbookAudit.day)} style={ghostButtonStyle}>
                            Review Next Flagged Day
                          </button>
                        )}
                        <button type="button" onClick={() => void refreshWorkbookAudit()} disabled={workbookAuditBusy} style={ghostButtonStyle}>
                          {workbookAuditBusy ? 'Refreshing QA…' : 'Refresh QA'}
                        </button>
                        <button type="button" onClick={() => void runWorkbookSync()} disabled={workbookAuditActionBusy !== null} style={ghostButtonStyle}>
                          {workbookAuditActionBusy === 'sync' ? 'Running Sync…' : 'Run Workbook Sync'}
                        </button>
                        <button type="button" onClick={() => void runWorkbookQa()} disabled={workbookAuditActionBusy !== null} style={ghostButtonStyle}>
                          {workbookAuditActionBusy === 'qa' ? 'Running QA…' : 'Run Workbook QA'}
                        </button>
                      </div>
                      {currentWorkbookAudit.cuePages.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {currentWorkbookAudit.cuePages.slice(0, 6).map((cue) => (
                            <span
                              key={`${currentWorkbookAudit.bookId}-${currentWorkbookAudit.day}-${cue.pageNumber}`}
                              style={{ padding: '4px 8px', borderRadius: 999, border: '1px solid var(--border)', background: 'transparent', fontSize: 11, color: 'var(--text-sub)' }}
                            >
                              Page {cue.pageNumber}: {cue.cueLabels.slice(0, 2).join(', ')}
                            </span>
                          ))}
                        </div>
                      )}
                      {currentWorkbookAudit.uncoveredCuePages.length > 0 && (
                        <div style={{ fontSize: 11, color: '#7a271a', lineHeight: 1.5 }}>
                          Uncovered cues: {currentWorkbookAudit.uncoveredCuePages.map((cue) => `page ${cue.pageNumber} (${cue.cueLabels.join(', ')})`).join(' · ')}
                        </div>
                      )}
                    </div>
                  )}
                  <div style={scripturePanelStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={eyebrowStyle}>Daily Reader</div>
                      <div style={readerTabRowStyle}>
                        <button type="button" onClick={() => setReaderView('study')} style={readerView === 'study' ? readerTabActiveStyle : readerTabStyle}>
                          Study
                        </button>
                        <button type="button" onClick={() => setReaderView('workbook')} style={readerView === 'workbook' ? readerTabActiveStyle : readerTabStyle}>
                          Workbook
                        </button>
                      </div>
                    </div>
                    {readerView === 'study' && (
                      <>
                        <div style={{ marginTop: 8, display: 'grid', gap: 14 }}>
                          <div style={sourceGridStyle}>
                            {currentStudyLayout.supportingPassages[0] && (
                              <div style={sourceInfoStyle}>
                                <div style={eyebrowStyle}>Bible Reading</div>
                                <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{currentStudyLayout.supportingPassages[0]}</div>
                              </div>
                            )}
                            {currentSession.sourceSection && (
                              <div style={sourceInfoStyle}>
                                <div style={eyebrowStyle}>Source Section</div>
                                <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.55, color: 'var(--text)' }}>{currentSession.sourceSection}</div>
                              </div>
                            )}
                            {activeBook.generatedPlan?.sourceDiagnostics && (
                              <div style={sourceInfoStyle}>
                                <div style={eyebrowStyle}>Source Health</div>
                                <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                  <span style={{
                                    padding: '3px 8px',
                                    borderRadius: 999,
                                    border: `1px solid ${sourceHealthTone(activeBook.generatedPlan.sourceDiagnostics.sourceHealth).border}`,
                                    background: sourceHealthTone(activeBook.generatedPlan.sourceDiagnostics.sourceHealth).background,
                                    color: sourceHealthTone(activeBook.generatedPlan.sourceDiagnostics.sourceHealth).color,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    textTransform: 'capitalize',
                                  }}>
                                    {activeBook.generatedPlan.sourceDiagnostics.sourceHealth}
                                  </span>
                                  <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>
                                    {activeBook.generatedPlan.sourceDiagnostics.mappedDayCount}/{activeBook.generatedPlan.sourceDiagnostics.totalDays} days mapped · {activeBook.generatedPlan.sourceDiagnostics.mappedSliceCount} slices
                                  </span>
                                </div>
                              </div>
                            )}
                            {currentSession.sourceDiagnostics && (
                              <div style={sourceInfoStyle}>
                                <div style={eyebrowStyle}>Day Structure</div>
                                <div style={{ marginTop: 6, display: 'grid', gap: 6 }}>
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                    <span style={{
                                      padding: '3px 8px',
                                      borderRadius: 999,
                                      border: `1px solid ${sourceHealthTone(currentSession.sourceDiagnostics.sourceHealth).border}`,
                                      background: sourceHealthTone(currentSession.sourceDiagnostics.sourceHealth).background,
                                      color: sourceHealthTone(currentSession.sourceDiagnostics.sourceHealth).color,
                                      fontSize: 11,
                                      fontWeight: 700,
                                    }}>
                                      {sourceStructureLabel(currentSession.sourceDiagnostics.structure)}
                                    </span>
                                    <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>
                                      {currentSession.sourceDiagnostics.scriptureReferenceCount} refs · {currentSession.sourceDiagnostics.questionCount} questions · {currentSession.sourceDiagnostics.cueCount} cues
                                    </span>
                                  </div>
                                  <div style={{ fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.5 }}>
                                    {currentSession.sourceDiagnostics.warnings[0] || 'Chronicle can trace this day cleanly back to its source material.'}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                          {currentStudyLayout.blocks.map((block) => renderStudyBlock(block))}
                        </div>
                      </>
                    )}
                    {readerView === 'workbook' && (
                      <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
                        <div style={sourceGridStyle}>
                          <div style={sourceInfoStyle}>
                            <div style={eyebrowStyle}>Workbook Mode</div>
                            <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-sub)' }}>
                              These overlays and the Study prompts use the same saved answers, so you can move between them without losing anything.
                            </div>
                          </div>
                          {hasMappedPages && (
                            <div style={sourceInfoStyle}>
                              <div style={eyebrowStyle}>Source Pages</div>
                              <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                                {currentSession.sourcePageSlices?.length
                                  ? currentSession.sourcePageSlices.map((slice) => slice.label || `Page ${slice.pageNumber}`).join(' · ')
                                  : <>Pages {currentSession.sourcePageStart}{currentSession.sourcePageEnd !== currentSession.sourcePageStart ? `-${currentSession.sourcePageEnd}` : ''}</>}
                              </div>
                            </div>
                          )}
                        </div>
                        {sourceViewAvailable ? (
                          <div style={{ display: 'grid', gap: 16 }}>
                            {(currentSession.sourcePageSlices?.length
                              ? currentSession.sourcePageSlices
                              : workbookPages.map((pageNumber) => ({ pageNumber } as OwnedBookPageSlice))).map((slice, index) => (
                              <div key={`${slice.pageNumber}-${index}-${slice.startY || 0}-${slice.endY || 100}`} style={workbookPageWrapStyle}>
                                <div style={workbookPageLabelStyle}>{slice.label || `Page ${slice.pageNumber}`}</div>
                                <div style={workbookCanvasStyle}>
                                  {slice.startY != null || slice.endY != null ? (
                                    <div style={{
                                      position: 'relative',
                                      width: '100%',
                                      overflow: 'hidden',
                                      aspectRatio: `${8.5} / ${11 * (((slice.endY ?? 100) - (slice.startY ?? 0)) / 100)}`,
                                      borderRadius: 20,
                                    }}>
                                      <img
                                        src={`/api/study-imports/book-page-image?bookId=${encodeURIComponent(activeBook.id)}&sourcePath=${encodeURIComponent(activeBook.sourcePath)}&page=${encodeURIComponent(String(slice.pageNumber))}`}
                                        alt={`${activeBook.title} page ${slice.pageNumber}`}
                                        style={{
                                          ...workbookImageStyle,
                                          position: 'absolute',
                                          inset: 0,
                                          width: '100%',
                                          height: 'auto',
                                          transform: `translateY(-${slice.startY || 0}%)`,
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <img
                                      src={`/api/study-imports/book-page-image?bookId=${encodeURIComponent(activeBook.id)}&sourcePath=${encodeURIComponent(activeBook.sourcePath)}&page=${encodeURIComponent(String(slice.pageNumber))}`}
                                      alt={`${activeBook.title} page ${slice.pageNumber}`}
                                      style={workbookImageStyle}
                                    />
                                  )}
                                  {workbookFields
                                    .filter((field) => overlayBelongsToSlice(field, slice))
                                    .map((field) => {
                                      const value = currentEntry[field.key] || '';
                                      const isActive = activeWorkbookFieldKey === field.key;
                                      return (
                                        <WorkbookOverlayHotspot
                                          key={`${slice.pageNumber}-${field.key}`}
                                          field={field}
                                          value={value}
                                          active={isActive}
                                          onActivate={() => setActiveWorkbookFieldKey(field.key)}
                                          onClose={() => setActiveWorkbookFieldKey((current) => (current === field.key ? null : current))}
                                          onChange={(nextValue) => updateDayEntry(field.key, nextValue)}
                                        />
                                      );
                                    })}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={transcriptionPanelStyle}>
                            <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-sub)' }}>
                              This book does not have a PDF source attached yet, so Workbook mode is not available for it.
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {readerView === 'study' && (
                    <>
                      <div style={worksheetGridStyle}>
                        <PromptEditor
                          title="Stillness"
                          prompt={currentSession.stillnessPrompt}
                          value={currentEntry.stillness}
                          onChange={(value) => updateDayEntry('stillness', value)}
                          placeholder="What surfaced as you got quiet before God?"
                        />
                        <PromptEditor
                          title="Story the Scripture"
                          prompt={currentSession.storyPrompt}
                          value={currentEntry.story}
                          onChange={(value) => updateDayEntry('story', value)}
                          placeholder="Retell the passage in your own words."
                        />
                      </div>

                      <div style={worksheetGridStyle}>
                        <PromptEditor
                          title="Scripture Truth"
                          prompt={currentSession.stepsPrompts[0]}
                          value={currentEntry.scriptureTruth}
                          onChange={(value) => updateDayEntry('scriptureTruth', value)}
                          placeholder="What is this passage clearly saying?"
                        />
                        <PromptEditor
                          title="Truth for Me"
                          prompt={currentSession.stepsPrompts[1]}
                          value={currentEntry.truthForMe}
                          onChange={(value) => updateDayEntry('truthForMe', value)}
                          placeholder="Where is this meeting your life?"
                        />
                        <PromptEditor
                          title="Examination"
                          prompt={currentSession.stepsPrompts[2]}
                          value={currentEntry.examination}
                          onChange={(value) => updateDayEntry('examination', value)}
                          placeholder="What is being exposed or invited?"
                        />
                        <PromptEditor
                          title="Prayer Response"
                          prompt={currentSession.stepsPrompts[3]}
                          value={currentEntry.prayerResponse}
                          onChange={(value) => updateDayEntry('prayerResponse', value)}
                          placeholder="How are you responding to God?"
                        />
                        <PromptEditor
                          title="Step Today"
                          prompt={currentSession.stepsPrompts[4]}
                          value={currentEntry.stepToday}
                          onChange={(value) => updateDayEntry('stepToday', value)}
                          placeholder="What one action will you take today?"
                        />
                        <PromptEditor
                          title="Accountability"
                          prompt={currentSession.accountability}
                          value={currentEntry.accountabilityResponse}
                          onChange={(value) => updateDayEntry('accountabilityResponse', value)}
                          placeholder="What should future-you be held to?"
                        />
                      </div>
                    </>
                  )}
                </div>
              </section>
            </main>

            {readerView !== 'workbook' && (
            <aside style={sidebarPanelStyle}>
              <div style={eyebrowStyle}>Toolkit</div>
              <div style={{ marginTop: 10, display: 'grid', gap: 12 }}>
                <ToolkitEditor
                  title="Highlight"
                  helper="Capture the key sentence, insight, or takeaway you want to keep front and center."
                  value={currentEntry.highlight}
                  onChange={(value) => updateDayEntry('highlight', value)}
                  placeholder="What are you highlighting today?"
                />
                <ToolkitEditor
                  title="Underline"
                  helper="Save the exact phrase or line you want to return to later."
                  value={currentEntry.underline}
                  onChange={(value) => updateDayEntry('underline', value)}
                  placeholder="What phrase deserves an underline?"
                />
                <ToolkitEditor
                  title="Study Notes"
                  helper="Keep your notes, observations, questions, and cross-reference ideas here."
                  value={currentEntry.notes}
                  onChange={(value) => updateDayEntry('notes', value)}
                  placeholder="Take notes, ask questions, and capture connections."
                  rows={8}
                />
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={eyebrowStyle}>ACTS Prayer</div>
                <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                  <PromptEditorCompact
                    label="Adoration"
                    prompt={currentSession.actsPrayer[0]}
                    value={currentEntry.actsAdoration}
                    onChange={(value) => updateDayEntry('actsAdoration', value)}
                  />
                  <PromptEditorCompact
                    label="Confession"
                    prompt={currentSession.actsPrayer[1]}
                    value={currentEntry.actsConfession}
                    onChange={(value) => updateDayEntry('actsConfession', value)}
                  />
                  <PromptEditorCompact
                    label="Thanksgiving"
                    prompt={currentSession.actsPrayer[2]}
                    value={currentEntry.actsThanksgiving}
                    onChange={(value) => updateDayEntry('actsThanksgiving', value)}
                  />
                  <PromptEditorCompact
                    label="Supplication"
                    prompt={currentSession.actsPrayer[3]}
                    value={currentEntry.actsSupplication}
                    onChange={(value) => updateDayEntry('actsSupplication', value)}
                  />
                </div>
              </div>

              <div style={{ marginTop: 18, padding: '12px 14px', borderRadius: 12, background: 'var(--card-inner)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Auto-saved</div>
                <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.6, color: 'var(--text-sub)' }}>
                  {currentEntry.updatedAt
                    ? `Saved ${new Date(currentEntry.updatedAt).toLocaleString()}`
                    : 'As you type, today’s answers are stored in Chronicle and will still be here when you come back.'}
                </div>
              </div>
            </aside>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PromptEditor({
  title,
  prompt,
  value,
  onChange,
  placeholder,
}: {
  title: string;
  prompt: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div style={workPanelStyle}>
      <div style={eyebrowStyle}>{title}</div>
      <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.65, color: 'var(--text-sub)' }}>{prompt}</div>
      <AutoGrowTextarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        minRows={5}
        style={textAreaStyle}
      />
    </div>
  );
}

function PromptEditorCompact({
  label,
  prompt,
  value,
  onChange,
}: {
  label: string;
  prompt: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div style={compactPromptStyle}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 11, lineHeight: 1.55, color: 'var(--text-muted)' }}>{prompt}</div>
      <AutoGrowTextarea value={value} onChange={(event) => onChange(event.target.value)} minRows={3} style={textAreaStyle} />
    </div>
  );
}

function ToolkitEditor({
  title,
  helper,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  title: string;
  helper: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <div style={compactPromptStyle}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
      <div style={{ marginTop: 4, fontSize: 11, lineHeight: 1.55, color: 'var(--text-muted)' }}>{helper}</div>
      <AutoGrowTextarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} minRows={rows} style={textAreaStyle} />
    </div>
  );
}

function WorkbookOverlayHotspot({
  field,
  value,
  active,
  onActivate,
  onClose,
  onChange,
}: {
  field: WorkbookOverlayField;
  value: string;
  active: boolean;
  onActivate: () => void;
  onClose: () => void;
  onChange: (value: string) => void;
}) {
  const hasValue = value.trim().length > 0;
  const selectedOptions = parseCheckboxValue(value);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${field.x}%`,
        top: `${field.y}%`,
        width: `${field.width}%`,
        minHeight: field.minHeight,
      }}
    >
      {!active && (
        <button
          type="button"
          onClick={onActivate}
          style={{
            ...workbookHotspotIconStyle,
            border: hasValue ? '1px solid rgba(15, 79, 207, 0.28)' : '1px solid rgba(15, 23, 42, 0.08)',
            color: hasValue ? 'var(--accent-green)' : 'rgba(15, 23, 42, 0.42)',
          }}
          aria-label={`Open ${field.label}`}
        >
          {field.kind === 'checkbox-group' ? '☐' : '✎'}
        </button>
      )}

      {active && (
        <div style={workbookEditorCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{field.label}</div>
              <div style={{ marginTop: 4, fontSize: 11, lineHeight: 1.45, color: 'var(--text-muted)' }}>{field.prompt}</div>
            </div>
            <button type="button" onClick={onClose} style={workbookCloseButtonStyle}>Done</button>
          </div>
          {field.kind === 'checkbox-group' ? (
            <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
              {(field.options || []).map((option) => {
                const checked = selectedOptions.includes(option);
                return (
                  <label key={option} style={workbookCheckboxLabelStyle}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        const next = event.target.checked
                          ? [...selectedOptions, option]
                          : selectedOptions.filter((entry) => entry !== option);
                        onChange(next.join('\n'));
                      }}
                    />
                    <span>{option}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <AutoGrowTextarea
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder={field.placeholder}
              minRows={4}
              style={workbookOverlayTextareaStyle}
            />
          )}
        </div>
      )}
    </div>
  );
}

function AutoGrowTextarea({
  minRows = 3,
  style,
  onInput,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  minRows?: number;
  style?: CSSProperties;
}) {
  const minHeight = minRows * 24 + 12;
  return (
    <textarea
      {...props}
      rows={minRows}
      onInput={(event) => {
        const target = event.currentTarget;
        target.style.height = 'auto';
        target.style.height = `${Math.max(target.scrollHeight, minHeight)}px`;
        onInput?.(event);
      }}
      style={{ ...style, minHeight }}
    />
  );
}

const heroPanelStyle: CSSProperties = {
  background: 'var(--card-bg)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  padding: '20px 22px',
  boxShadow: 'var(--shadow)',
};

const sidebarPanelStyle: CSSProperties = {
  position: 'sticky',
  top: 16,
  alignSelf: 'start',
  background: 'var(--card-bg)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  padding: '16px',
  boxShadow: 'var(--shadow)',
};

const readerPanelStyle: CSSProperties = {
  background: 'var(--card-bg)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  padding: '18px',
  boxShadow: 'var(--shadow)',
};

const scripturePanelStyle: CSSProperties = {
  padding: '16px 18px',
  borderRadius: 14,
  background: 'var(--card-inner)',
  border: '1px solid var(--border)',
};

const readerTabRowStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
};

const readerTabStyle: CSSProperties = {
  padding: '7px 12px',
  borderRadius: 999,
  border: '1px solid var(--border)',
  background: 'var(--card-bg)',
  color: 'var(--text-sub)',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};

const readerTabActiveStyle: CSSProperties = {
  ...readerTabStyle,
  border: '1px solid var(--accent-green)',
  background: 'var(--accent-green-light)',
  color: 'var(--accent-green)',
};

const sourceGridStyle: CSSProperties = {
  marginTop: 14,
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 10,
};

const transcriptionPanelStyle: CSSProperties = {
  padding: '16px 18px',
  borderRadius: 12,
  background: 'var(--card-bg)',
  border: '1px solid var(--border)',
  minHeight: 220,
};

const sourceInfoStyle: CSSProperties = {
  padding: '10px 12px',
  borderRadius: 10,
  background: 'var(--card-bg)',
  border: '1px solid var(--border)',
};

const workbookPageWrapStyle: CSSProperties = {
  display: 'grid',
  gap: 10,
};

const workbookPageLabelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--text-sub)',
};

const workbookCanvasStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  borderRadius: 14,
  overflow: 'hidden',
  border: '1px solid var(--border)',
  background: '#f8fafc',
};

const workbookImageStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  height: 'auto',
};

const workbookOverlayTextareaStyle: CSSProperties = {
  marginTop: 8,
  width: '100%',
  borderRadius: 8,
  border: '1px solid rgba(15, 23, 42, 0.12)',
  background: 'rgba(255,255,255,0.94)',
  color: 'var(--text)',
  padding: '8px 10px',
  fontSize: 12,
  lineHeight: 1.55,
  resize: 'vertical',
  outline: 'none',
  boxSizing: 'border-box',
};

const workbookHotspotIconStyle: CSSProperties = {
  position: 'absolute',
  left: -18,
  top: 6,
  width: 22,
  height: 22,
  borderRadius: 999,
  border: '1px solid rgba(15, 23, 42, 0.08)',
  background: 'rgba(255,255,255,0.92)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontSize: 12,
  lineHeight: 1,
  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
  transition: 'border-color 120ms ease, color 120ms ease, background 120ms ease',
};

const workbookEditorCardStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.94)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(15, 23, 42, 0.12)',
  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.16)',
};

const workbookCloseButtonStyle: CSSProperties = {
  border: 'none',
  background: 'rgba(15, 23, 42, 0.06)',
  color: 'var(--text-sub)',
  borderRadius: 999,
  padding: '5px 10px',
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
};

const workbookCheckboxLabelStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '16px minmax(0, 1fr)',
  gap: 8,
  alignItems: 'start',
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--text)',
};

const workPanelStyle: CSSProperties = {
  padding: '14px',
  borderRadius: 12,
  background: 'var(--card-inner)',
  border: '1px solid var(--border)',
  display: 'grid',
  gap: 10,
};

const compactPromptStyle: CSSProperties = {
  padding: '12px',
  borderRadius: 12,
  background: 'var(--card-inner)',
  border: '1px solid var(--border)',
};

const worksheetGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 12,
};

const chipStyle: CSSProperties = {
  padding: '5px 10px',
  borderRadius: 999,
  border: '1px solid var(--border)',
  background: 'var(--card-inner)',
  fontSize: 11,
  color: 'var(--text-sub)',
};

const libraryItemStyle: CSSProperties = {
  textAlign: 'left',
  padding: '12px',
  borderRadius: 12,
  border: '1px solid var(--border)',
  cursor: 'pointer',
};

const bookmarkRowStyle: CSSProperties = {
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid var(--border)',
  background: 'var(--card-inner)',
  display: 'grid',
  gap: 8,
};

const bookmarkJumpStyle: CSSProperties = {
  textAlign: 'left',
  border: 'none',
  background: 'transparent',
  color: 'var(--text)',
  fontSize: 12,
  lineHeight: 1.55,
  fontWeight: 600,
  cursor: 'pointer',
  padding: 0,
};

const bookmarkRemoveStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: 'var(--text-muted)',
  fontSize: 11,
  cursor: 'pointer',
  padding: 0,
  justifySelf: 'start',
};

const textAreaStyle: CSSProperties = {
  width: '100%',
  resize: 'vertical',
  minHeight: 96,
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--card-bg)',
  color: 'var(--text)',
  fontSize: 13,
  lineHeight: 1.6,
  outline: 'none',
  marginTop: 2,
};

const primaryButtonStyle: CSSProperties = {
  padding: '10px 14px',
  border: 'none',
  borderRadius: 10,
  background: 'var(--accent-green)',
  color: 'white',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};

const secondaryButtonStyle: CSSProperties = {
  padding: '10px 14px',
  border: '1px solid var(--border)',
  borderRadius: 10,
  background: 'var(--card-inner)',
  color: 'var(--text)',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};

const ghostButtonStyle: CSSProperties = {
  padding: '10px 14px',
  border: '1px solid var(--border)',
  borderRadius: 10,
  background: 'transparent',
  color: 'var(--text)',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};

const navButtonStyle: CSSProperties = {
  width: 36,
  height: 36,
  border: '1px solid var(--border)',
  borderRadius: 10,
  background: 'var(--card-inner)',
  color: 'var(--text)',
  fontSize: 16,
  fontWeight: 700,
  cursor: 'pointer',
};

const selectStyle: CSSProperties = {
  minWidth: 180,
  padding: '9px 12px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--card-inner)',
  color: 'var(--text)',
  fontSize: 12,
  fontWeight: 600,
  outline: 'none',
};

const eyebrowStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
};
