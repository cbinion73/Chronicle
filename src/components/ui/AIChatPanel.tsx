import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CHRONICLE_AGENT_MODE_DEFS, getAIConversationKey, getAIConversationThreadTitle, type ChronicleAgentMode, useAIChatStore } from '../../store/aiChatStore';
import { useToastStore } from '../../store/toastStore';
import { sendAIChatMessage } from '../../lib/aiChat';
import { CHRONICLE_PERSONAS, type ChroniclePersonaId } from '../../lib/chroniclePersonas';
import { useAppStore } from '../../store';
import s from './AIChatPanel.module.css';
import { getBibleNavigationTarget } from '../../lib/scriptureReference';
import { buildReflectionPrompts } from '../../lib/reflectionPrompts';
import type { ChronicleDeviceClass } from '../../lib/useResponsiveLayout';
import { synthesizeVoice, transcribeVoiceBlob } from '../../lib/voice';

const PAGE_LABELS: Record<string, string> = {
  '/': 'Today',
  '/bible': 'Bible',
  '/study': 'Study',
  '/discipleship': 'Discipleship',
  '/prayer': 'Prayer',
  '/chronicle': 'Chronicle',
  '/themes': 'Themes',
  '/plans': 'Plans',
  '/legacy': 'Legacy',
  '/insights': 'Insights',
  '/settings': 'Settings',
};

const NEW_TESTAMENT_BOOKS = new Set([
  'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians',
  'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter',
  '1 John', '2 John', '3 John', 'Jude', 'Revelation',
]);

function getQuickActions(agentMode: ChronicleAgentMode, pageKey: string, context: { passage?: string; selection?: string; summary?: string }) {
  if (agentMode === 'prayer_guide') {
    return [
      `Turn ${context.passage || 'this burden'} into a prayer`,
      'Write an ACTS prayer for this',
      'What Scripture should I pray here?',
      'Give me a short closing prayer',
    ];
  }
  if (agentMode === 'discipleship_coach') {
    return [
      `Summarize today's discipleship reading`,
      `Help me answer today's workbook prompts`,
      'What is the next act of obedience here?',
      'Give me one accountability question',
    ];
  }
  if (agentMode === 'reflection_guide') {
    return [
      'What pattern do you see here?',
      'Turn this into reflection prompts',
      'What is God teaching me through this season?',
      'Give me a Chronicle reflection',
    ];
  }
  if (pageKey === '/bible') {
    return [
      `Summarize ${context.passage || 'this chapter'}`,
      `Compare translations for ${context.passage || 'this passage'}`,
      `Turn ${context.passage || 'this chapter'} into a prayer`,
      `Give me study questions for ${context.passage || 'this chapter'}`,
    ];
  }
  if (pageKey === '/study') {
    return [
      `Summarize today's study`,
      `Turn today's study into prayer`,
      `What is the next step of obedience here?`,
      `Give me discussion questions for this study day`,
    ];
  }
  if (pageKey === '/discipleship') {
    return [
      `Summarize today's discipleship reading`,
      `Help me answer today's workbook prompts`,
      `Turn this day into a prayer`,
      `What is the main formation takeaway here?`,
    ];
  }
  if (pageKey === '/prayer') {
    return [
      `Help me pray honestly about this`,
      `Turn this pressure into an ACTS prayer`,
      `What Scripture fits this prayer burden?`,
      `Help me write a closing prayer`,
    ];
  }
  if (pageKey === '/chronicle') {
    return [
      `Summarize what God has been teaching me`,
      `Trace the main themes in my recent Chronicle entries`,
      `Turn my recent Chronicle entries into a prayer`,
      `What patterns do you see in my reflections?`,
    ];
  }
  return [
    `Summarize this page for me`,
    `What matters most here?`,
    `Turn this into prayer`,
    `Give me next-step questions`,
  ];
}

interface AIChatPanelProps {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  layoutMode?: ChronicleDeviceClass;
}

export default function AIChatPanel({
  collapsed = false,
  onToggleCollapsed,
  layoutMode = 'desktop',
}: AIChatPanelProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const pageKey = location.pathname || '/';
  const pageLabel = PAGE_LABELS[pageKey] || pageKey.replace('/', '') || 'Today';
  const [draft, setDraft] = useState('');
  const { addToast } = useToastStore();
  const addChronicleEntry = useAppStore((state) => state.addChronicleEntry);
  const addPrayerItem = useAppStore((state) => state.addPrayerItem);
  const setBibleView = useAppStore((state) => state.setBibleView);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const setStudyModuleDay = useAppStore((state) => state.setStudyModuleDay);
  const setActiveOwnedBook = useAppStore((state) => state.setActiveOwnedBook);
  const activeOwnedBookId = useAppStore((state) => state.activeOwnedBookId);
  const voiceConfig = useAppStore((state) => state.voiceConfig);
  const conversations = useAIChatStore((state) => state.conversations);
  const pendingByPage = useAIChatStore((state) => state.pendingByPage);
  const contextByPage = useAIChatStore((state) => state.contextByPage);
  const selectedPersona = useAIChatStore((state) => state.selectedPersona);
  const selectedAgentMode = useAIChatStore((state) => state.selectedAgentMode);
  const appendMessage = useAIChatStore((state) => state.appendMessage);
  const setPending = useAIChatStore((state) => state.setPending);
  const setSelectedPersona = useAIChatStore((state) => state.setSelectedPersona);
  const setSelectedAgentMode = useAIChatStore((state) => state.setSelectedAgentMode);
  const clearConversation = useAIChatStore((state) => state.clearConversation);
  const persona = CHRONICLE_PERSONAS[selectedPersona];
  const agentMode = CHRONICLE_AGENT_MODE_DEFS[selectedAgentMode];

  const context = useMemo(() => ({
    ...(contextByPage[pageKey] || {}),
    page: pageLabel,
    pathname: pageKey,
    title: document.title,
  }), [contextByPage, pageKey, pageLabel]);
  const conversationKey = useMemo(() => getAIConversationKey(pageKey, context), [context, pageKey]);
  const conversationTitle = useMemo(() => getAIConversationThreadTitle(pageLabel, context), [context, pageLabel]);
  const touchThread = useAIChatStore((state) => state.touchThread);
  const threadMetaByKey = useAIChatStore((state) => state.threadMetaByKey);
  const messages = conversations[conversationKey] || [];
  const pending = pendingByPage[conversationKey] || false;
  const recentThreads = useMemo(
    () =>
      Object.values(threadMetaByKey)
        .filter((thread) => thread.pageKey === pageKey)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .slice(0, 4),
    [pageKey, threadMetaByKey],
  );
  const quickActions = useMemo(() => getQuickActions(selectedAgentMode, pageKey, context), [context, pageKey, selectedAgentMode]);
  const latestAssistantMessage = [...messages].reverse().find((message) => message.role === 'assistant');
  const actionText = draft.trim() || latestAssistantMessage?.text.trim() || '';
  const isOverlayLayout = layoutMode !== 'desktop';
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const voiceSupported = voiceConfig.enabled
    && typeof window !== 'undefined'
    && typeof navigator !== 'undefined'
    && typeof MediaRecorder !== 'undefined'
    && Boolean(navigator.mediaDevices?.getUserMedia);
  const reflectionPromptSet = useMemo(
    () => buildReflectionPrompts({
      passage: context.passage,
      focus: context.selection || context.summary,
      sourceLabel: pageLabel,
      summary: actionText || context.summary,
    }),
    [actionText, context.passage, context.selection, context.summary, pageLabel],
  );

  useEffect(() => {
    touchThread({
      key: conversationKey,
      pageKey,
      pageLabel,
      title: conversationTitle,
      passage: context.passage,
      contextSnapshot: context,
      updatedAt: new Date().toISOString(),
    });
  }, [context, conversationKey, conversationTitle, pageKey, pageLabel, touchThread]);

  useEffect(() => () => {
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function openThreadSource(thread: NonNullable<typeof recentThreads[number]>) {
    const threadContext = thread.contextSnapshot;
    if (thread.pageKey === '/bible' && threadContext.passage) {
      const target = getBibleNavigationTarget(threadContext.passage);
      if (target) {
        setBibleView({
          book: target.book,
          chapter: target.chapter,
          overlayOn: false,
          echoesOn: false,
          studyColorsOn: false,
          greekOn: false,
          showThemePanel: false,
          panelMode: 'themes',
        });
      }
      setActiveTab('bible');
      navigate('/bible');
      addToast(`Reopened ${thread.title}`, 'success', '📖');
      return;
    }

    if (thread.pageKey === '/study') {
      if (threadContext.studyModuleId && typeof threadContext.currentDay === 'number') {
        setStudyModuleDay(threadContext.studyModuleId, threadContext.currentDay);
      }
      setActiveTab('study');
      navigate('/study');
      addToast(`Reopened ${thread.title}`, 'success', '📘');
      return;
    }

    if (thread.pageKey === '/discipleship') {
      const targetBookId = threadContext.ownedBookId || activeOwnedBookId;
      if (targetBookId) {
        setActiveOwnedBook(targetBookId);
      }
      setActiveTab('discipleship');
      navigate('/discipleship', {
        state: {
          requestedBookId: targetBookId,
          requestedDay: typeof threadContext.currentDay === 'number' ? threadContext.currentDay : undefined,
          requestedReaderView: threadContext.readerView === 'workbook' ? 'workbook' : 'study',
        },
      });
      addToast(`Reopened ${thread.title}`, 'success', '📗');
      return;
    }

    if (thread.pageKey === '/prayer') {
      setActiveTab('prayer');
      navigate('/prayer');
      addToast(`Reopened ${thread.title}`, 'success', '🙏');
      return;
    }

    if (thread.pageKey === '/chronicle') {
      setActiveTab('chronicle');
      navigate('/chronicle', {
        state: threadContext.passage ? { filterPassage: threadContext.passage } : undefined,
      });
      addToast(`Reopened ${thread.title}`, 'success', '📓');
      return;
    }
  }

  function saveToChronicle() {
    if (!actionText) return;
    addChronicleEntry({
      id: `ai-action-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: pageKey === '/bible' || pageKey === '/study' ? 'study' : 'reflection',
      title: `${pageLabel} · Chronicle AI`,
      body: actionText,
      passage: context.passage,
      autoCapture: true,
      sourceContext: {
        page: (pageKey.replace('/', '') || 'today') as 'today' | 'bible' | 'study' | 'discipleship' | 'prayer' | 'chronicle' | 'themes' | 'plans' | 'legacy' | 'insights' | 'settings',
        passage: context.passage,
        studyModuleId: typeof context.studyModuleId === 'string' ? context.studyModuleId : undefined,
        currentDay: typeof context.currentDay === 'number' ? context.currentDay : undefined,
        ownedBookId: typeof context.ownedBookId === 'string' ? context.ownedBookId : undefined,
        readerView: context.readerView === 'workbook' ? 'workbook' : context.readerView === 'study' ? 'study' : undefined,
      },
    });
    addToast('Saved AI content to Chronicle', 'success', '📓');
  }

  function useInPrayer() {
    if (!actionText) return;
    setActiveTab('prayer');
    navigate('/prayer', {
      state: {
        source: 'Chronicle AI',
        title: `${pageLabel} · AI prayer handoff`,
        passage: context.passage,
        prompt: actionText,
      },
    });
    addToast('Opened Prayer with the current AI text.', 'success', '🙏');
  }

  function addAsPrayerRequest() {
    if (!actionText) return;
    addPrayerItem({
      id: `ai-prayer-${Date.now()}`,
      text: actionText.length > 220 ? `${actionText.slice(0, 217)}...` : actionText,
      category: 'needs',
      answered: false,
      dateAdded: new Date().toISOString().split('T')[0],
    });
    addToast('Added AI text as a prayer request.', 'success', '🙏');
  }

  function openPassageInBible() {
    if (!context.passage) return;
    const target = getBibleNavigationTarget(context.passage);
    if (target) {
      setBibleView({
        book: target.book,
        chapter: target.chapter,
        overlayOn: false,
        echoesOn: false,
        studyColorsOn: false,
        greekOn: false,
        showThemePanel: false,
        panelMode: 'themes',
      });
    }
    setActiveTab('bible');
    navigate('/bible');
    addToast(`Opened ${context.passage} in Bible`, 'success', '📖');
  }

  function openThemesInBible() {
    if (!context.passage) return;
    const target = getBibleNavigationTarget(context.passage);
    if (target) {
      setBibleView({
        book: target.book,
        chapter: target.chapter,
        overlayOn: true,
        echoesOn: false,
        studyColorsOn: false,
        greekOn: false,
        showThemePanel: true,
        panelMode: 'themes',
      });
    }
    setActiveTab('bible');
    navigate('/bible');
    addToast(`Opened themes for ${context.passage}`, 'success', '📖');
  }

  function openEchoesInBible() {
    if (!context.passage) return;
    const target = getBibleNavigationTarget(context.passage);
    if (target) {
      setBibleView({
        book: target.book,
        chapter: target.chapter,
        overlayOn: false,
        echoesOn: true,
        studyColorsOn: false,
        greekOn: false,
        showThemePanel: true,
        panelMode: 'echoes',
      });
    }
    setActiveTab('bible');
    navigate('/bible');
    addToast(`Opened echoes for ${context.passage}`, 'success', '📖');
  }

  function openGreekInBible() {
    if (!context.passage) return;
    const target = getBibleNavigationTarget(context.passage);
    if (!target || !NEW_TESTAMENT_BOOKS.has(target.book)) return;
    setBibleView({
      book: target.book,
      chapter: target.chapter,
      overlayOn: false,
      echoesOn: false,
      studyColorsOn: false,
      greekOn: true,
      showThemePanel: true,
      panelMode: 'greek',
    });
    setActiveTab('bible');
    navigate('/bible');
    addToast(`Opened Greek word study for ${context.passage}`, 'success', '📖');
  }

  function openPassageInChronicle() {
    setActiveTab('chronicle');
    navigate('/chronicle', {
      state: context.passage ? { filterPassage: context.passage } : undefined,
    });
    addToast(context.passage ? `Opened Chronicle entries linked to ${context.passage}` : 'Opened Chronicle', 'success', '📓');
  }

  function saveAsStudyQuestions() {
    if (!actionText) return;
    addChronicleEntry({
      id: `ai-study-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'study',
      title: `${pageLabel} · AI Study Questions`,
      body: actionText,
      passage: context.passage,
      autoCapture: true,
      sourceContext: {
        page: (pageKey.replace('/', '') || 'today') as 'today' | 'bible' | 'study' | 'discipleship' | 'prayer' | 'chronicle' | 'themes' | 'plans' | 'legacy' | 'insights' | 'settings',
        passage: context.passage,
        studyModuleId: typeof context.studyModuleId === 'string' ? context.studyModuleId : undefined,
        currentDay: typeof context.currentDay === 'number' ? context.currentDay : undefined,
        ownedBookId: typeof context.ownedBookId === 'string' ? context.ownedBookId : undefined,
        readerView: context.readerView === 'workbook' ? 'workbook' : context.readerView === 'study' ? 'study' : undefined,
      },
    });
    addToast('Saved AI study content to Chronicle', 'success', '📚');
  }

  function saveAsReflection() {
    if (!actionText) return;
    addChronicleEntry({
      id: `ai-reflection-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'reflection',
      title: `${pageLabel} · AI Reflection`,
      body: actionText,
      passage: context.passage,
      autoCapture: true,
      sourceContext: {
        page: (pageKey.replace('/', '') || 'today') as 'today' | 'bible' | 'study' | 'discipleship' | 'prayer' | 'chronicle' | 'themes' | 'plans' | 'legacy' | 'insights' | 'settings',
        passage: context.passage,
        studyModuleId: typeof context.studyModuleId === 'string' ? context.studyModuleId : undefined,
        currentDay: typeof context.currentDay === 'number' ? context.currentDay : undefined,
        ownedBookId: typeof context.ownedBookId === 'string' ? context.ownedBookId : undefined,
        readerView: context.readerView === 'workbook' ? 'workbook' : context.readerView === 'study' ? 'study' : undefined,
      },
    });
    addToast('Saved AI reflection to Chronicle', 'success', '📓');
  }

  function saveAsInsight() {
    if (!actionText) return;
    addChronicleEntry({
      id: `ai-insight-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'insight',
      title: `${pageLabel} · AI Insight`,
      body: actionText,
      passage: context.passage,
      autoCapture: true,
      sourceContext: {
        page: (pageKey.replace('/', '') || 'today') as 'today' | 'bible' | 'study' | 'discipleship' | 'prayer' | 'chronicle' | 'themes' | 'plans' | 'legacy' | 'insights' | 'settings',
        passage: context.passage,
        studyModuleId: typeof context.studyModuleId === 'string' ? context.studyModuleId : undefined,
        currentDay: typeof context.currentDay === 'number' ? context.currentDay : undefined,
        ownedBookId: typeof context.ownedBookId === 'string' ? context.ownedBookId : undefined,
        readerView: context.readerView === 'workbook' ? 'workbook' : context.readerView === 'study' ? 'study' : undefined,
      },
    });
    addToast('Saved AI insight to Chronicle', 'success', '💡');
  }

  function saveAsPrayerArtifact() {
    if (!actionText) return;
    addChronicleEntry({
      id: `ai-prayer-artifact-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'prayer',
      title: `${pageLabel} · AI Prayer`,
      body: actionText,
      passage: context.passage,
      autoCapture: true,
      sourceContext: {
        page: (pageKey.replace('/', '') || 'today') as 'today' | 'bible' | 'study' | 'discipleship' | 'prayer' | 'chronicle' | 'themes' | 'plans' | 'legacy' | 'insights' | 'settings',
        passage: context.passage,
        studyModuleId: typeof context.studyModuleId === 'string' ? context.studyModuleId : undefined,
        currentDay: typeof context.currentDay === 'number' ? context.currentDay : undefined,
        ownedBookId: typeof context.ownedBookId === 'string' ? context.ownedBookId : undefined,
        readerView: context.readerView === 'workbook' ? 'workbook' : context.readerView === 'study' ? 'study' : undefined,
      },
    });
    addToast('Saved AI prayer to Chronicle', 'success', '🙏');
  }

  function saveReflectionPromptSet() {
    addChronicleEntry({
      id: `ai-reflection-prompt-set-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'reflection',
      title: `${pageLabel} · AI Reflection Prompt Set`,
      body: reflectionPromptSet.map((prompt) => `${prompt.label}: ${prompt.prompt}\n${prompt.followThrough}`).join('\n\n'),
      passage: context.passage,
      autoCapture: true,
      sourceContext: {
        page: (pageKey.replace('/', '') || 'today') as 'today' | 'bible' | 'study' | 'discipleship' | 'prayer' | 'chronicle' | 'themes' | 'plans' | 'legacy' | 'insights' | 'settings',
        passage: context.passage,
        studyModuleId: typeof context.studyModuleId === 'string' ? context.studyModuleId : undefined,
        currentDay: typeof context.currentDay === 'number' ? context.currentDay : undefined,
        ownedBookId: typeof context.ownedBookId === 'string' ? context.ownedBookId : undefined,
        readerView: context.readerView === 'workbook' ? 'workbook' : context.readerView === 'study' ? 'study' : undefined,
      },
    });
    addToast('Saved AI reflection prompt set', 'success', '🪞');
  }

  function openStudyWorkspace() {
    if (context.studyModuleId && typeof context.currentDay === 'number') {
      setStudyModuleDay(context.studyModuleId, context.currentDay);
    }
    setActiveTab('study');
    navigate('/study');
    addToast('Opened Study', 'success', '📘');
  }

  function openDiscipleshipWorkspace() {
    const targetBookId = context.ownedBookId || activeOwnedBookId;
    if (!targetBookId) return;
    setActiveOwnedBook(targetBookId);
    setActiveTab('discipleship');
    navigate('/discipleship', {
      state: {
        requestedBookId: targetBookId,
        requestedDay: typeof context.currentDay === 'number' ? context.currentDay : undefined,
        requestedReaderView: context.readerView === 'workbook' ? 'workbook' : 'study',
      },
    });
    addToast('Opened Discipleship', 'success', '📗');
  }

  function openWorkbookWorkspace() {
    const targetBookId = context.ownedBookId || activeOwnedBookId;
    if (!targetBookId) return;
    setActiveOwnedBook(targetBookId);
    setActiveTab('discipleship');
    navigate('/discipleship', {
      state: {
        requestedBookId: targetBookId,
        requestedDay: typeof context.currentDay === 'number' ? context.currentDay : undefined,
        requestedReaderView: 'workbook',
      },
    });
    addToast('Opened Workbook review', 'success', '📗');
  }

  const canOpenGreek = useMemo(() => {
    if (!context.passage) return false;
    const target = getBibleNavigationTarget(context.passage);
    return Boolean(target && NEW_TESTAMENT_BOOKS.has(target.book));
  }, [context.passage]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const prompt = draft.trim();
    if (!prompt || pending) return;

    const draftMessageId = `${Date.now()}-draft`;
    appendMessage(conversationKey, {
      id: draftMessageId,
      role: 'user',
      text: prompt,
      createdAt: new Date().toISOString(),
    });
    setDraft('');
    setPending(conversationKey, true);

    try {
      const { userMessage, assistantMessage } = await sendAIChatMessage({
        pageKey,
        pageLabel,
        context,
        messages,
        prompt,
        persona: selectedPersona,
        agentMode: selectedAgentMode,
      });
      useAIChatStore.setState((state) => ({
        conversations: {
          ...state.conversations,
          [conversationKey]: (() => {
            const currentMessages = state.conversations[conversationKey] || [];
            const draftIndex = currentMessages.findIndex((message) => message.id === draftMessageId);
            if (draftIndex === -1) {
              return currentMessages;
            }
            return [
              ...currentMessages.slice(0, draftIndex),
              userMessage,
              ...currentMessages.slice(draftIndex + 1),
              assistantMessage,
            ];
          })(),
        },
      }));
      touchThread({
        key: conversationKey,
        pageKey,
        pageLabel,
        title: conversationTitle,
        passage: context.passage,
        contextSnapshot: context,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      useAIChatStore.setState((state) => ({
        conversations: {
          ...state.conversations,
          [conversationKey]: (state.conversations[conversationKey] || []).filter((message) => message.id !== draftMessageId),
        },
      }));
      addToast(error instanceof Error ? error.message : 'The assistant could not answer right now.', 'warning', 'AI');
    } finally {
      setPending(conversationKey, false);
    }
  }

  async function toggleVoiceCapture() {
    if (!voiceSupported) {
      addToast('Voice capture is not available in this browser yet.', 'warning', 'AI');
      return;
    }

    if (isRecording) {
      recorderRef.current?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = async () => {
        setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        audioChunksRef.current = [];
        if (blob.size === 0) return;
        try {
          setVoiceBusy(true);
          const payload = await transcribeVoiceBlob(blob, voiceConfig);
          setDraft((current) => current.trim().length > 0 ? `${current.trim()} ${payload.transcript}` : payload.transcript);
          addToast(`Transcribed with ${payload.provider}`, 'success', '🎙️');
        } catch (error) {
          addToast(error instanceof Error ? error.message : 'Voice transcription failed.', 'warning', 'AI');
        } finally {
          setVoiceBusy(false);
        }
      };
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Microphone access failed.', 'warning', 'AI');
    }
  }

  async function speakCurrentText() {
    if (!actionText) return;
    try {
      setVoiceBusy(true);
      const payload = await synthesizeVoice(actionText, voiceConfig);
      if (payload.audioBase64) {
        const audio = new Audio(`data:${payload.mimeType || 'audio/wav'};base64,${payload.audioBase64}`);
        await audio.play();
        addToast(`Speaking with ${payload.provider}`, 'success', '🔊');
      } else if (payload.delivered) {
        addToast('Handed speech off to Home Assistant.', 'success', '🏠');
      }
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Voice playback failed.', 'warning', 'AI');
    } finally {
      setVoiceBusy(false);
    }
  }

  return (
    <>
      {isOverlayLayout && !collapsed && (
        <button
          type="button"
          className={s.overlayBackdrop}
          onClick={onToggleCollapsed}
          aria-label="Close Chronicle AI"
        />
      )}
      <aside
        className={[
          s.panel,
          collapsed ? s.collapsed : '',
          isOverlayLayout ? s.overlayPanel : '',
          layoutMode === 'tablet' ? s.tabletPanel : '',
          layoutMode === 'phone' ? s.phonePanel : '',
          isOverlayLayout && collapsed ? s.overlayCollapsed : '',
        ].filter(Boolean).join(' ')}
      >
      <button
        className={s.collapseToggle}
        onClick={onToggleCollapsed}
        type="button"
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expand Chronicle AI' : 'Collapse Chronicle AI'}
        title={collapsed ? 'Expand Chronicle AI' : 'Collapse Chronicle AI'}
      >
        <span className={s.collapseIcon}>{collapsed ? '◀' : '▶'}</span>
        <span className={s.collapseLabel}>{collapsed ? 'Chronicle AI' : isOverlayLayout ? 'Close' : 'Hide'}</span>
      </button>

      {!collapsed && (
        <>
          <div className={s.header}>
            <div className={s.titleWrap}>
              <div className={s.eyebrow}>Companion</div>
              <div className={s.title}>Chronicle AI</div>
              <div className={s.page}>{pageLabel}</div>
              {context.passage && <div className={s.page}>{context.passage}</div>}
            </div>
            <button className={s.clearBtn} onClick={() => clearConversation(conversationKey)} type="button" disabled={pending}>
              Clear
            </button>
          </div>

          <div className={s.personaBar}>
            <label className={s.personaLabel} htmlFor="chronicle-agent-mode-select">Role</label>
            <select
              id="chronicle-agent-mode-select"
              className={s.personaSelect}
              value={selectedAgentMode}
              onChange={(event) => setSelectedAgentMode(event.target.value as ChronicleAgentMode)}
            >
              {Object.entries(CHRONICLE_AGENT_MODE_DEFS).map(([id, option]) => (
                <option key={id} value={id}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className={s.personaSummary}>{agentMode.summary}</div>
            <label className={s.personaLabel} htmlFor="chronicle-persona-select">Voice</label>
            <select
              id="chronicle-persona-select"
              className={s.personaSelect}
              value={selectedPersona}
              onChange={(event) => setSelectedPersona(event.target.value as ChroniclePersonaId)}
            >
              {Object.values(CHRONICLE_PERSONAS).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className={s.personaSummary}>{persona.summary}</div>
            <div className={s.modeChip}>{agentMode.label}</div>
            <div className={s.threadChip}>Thread: {conversationTitle}</div>
            {recentThreads.length > 1 && (
              <>
                <div className={s.threadSummary}>
                  Stored context threads on this page: {recentThreads.length}
                </div>
                <div className={s.threadList}>
                  {recentThreads
                    .filter((thread) => thread.key !== conversationKey)
                    .slice(0, 3)
                    .map((thread) => (
                      <button
                        key={thread.key}
                        className={s.threadButton}
                        type="button"
                        onClick={() => openThreadSource(thread)}
                      >
                        {thread.title}
                      </button>
                    ))}
                </div>
              </>
            )}
          </div>

          <div className={s.messages}>
            {messages.length === 0 ? (
              <div className={s.empty}>
                Ask about the page you are on, trace a theme, summarize a passage, or turn your notes into a prayer or study reflection. Chronicle will keep this thread attached to the current passage, day, or book so you can reopen it later from the same workflow.
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`${s.message} ${message.role === 'user' ? s.messageUser : s.messageAssistant}`}
                >
                  <div className={`${s.bubble} ${message.role === 'user' ? s.bubbleUser : s.bubbleAssistant}`}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ ...props }) => <a {...props} target="_blank" rel="noreferrer" className={s.markdownLink} />,
                        code: ({ className, children, ...props }) => {
                          const isBlock = Boolean(className);
                          return isBlock ? (
                            <code className={s.markdownBlockCode} {...props}>{children}</code>
                          ) : (
                            <code className={s.markdownInlineCode} {...props}>{children}</code>
                          );
                        },
                        pre: ({ children }) => <pre className={s.markdownPre}>{children}</pre>,
                        ul: ({ children }) => <ul className={s.markdownList}>{children}</ul>,
                        ol: ({ children }) => <ol className={s.markdownList}>{children}</ol>,
                        p: ({ children }) => <p className={s.markdownParagraph}>{children}</p>,
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>
                  </div>
                  <div className={s.meta}>
                    {message.role === 'user' ? 'You' : CHRONICLE_PERSONAS[message.persona || selectedPersona].shortLabel}
                  </div>
                </div>
              ))
            )}
            {pending && (
              <div className={`${s.message} ${s.messageAssistant}`}>
                <div className={`${s.bubble} ${s.bubbleAssistant}`}>
                  <span className={s.thinking}>
                    <span className={s.dot} />
                    <span className={s.dot} />
                    <span className={s.dot} />
                  </span>
                </div>
              </div>
            )}
          </div>

          <form className={s.composer} onSubmit={handleSubmit}>
            <div className={s.quickActions}>
              {quickActions.map((action) => (
                <button
                  key={action}
                  className={s.quickAction}
                  type="button"
                  onClick={() => setDraft(action)}
                >
                  {action}
                </button>
              ))}
            </div>
            <div className={s.actionRow}>
              {voiceConfig.enabled && (
                <>
                  <button
                    className={s.secondaryAction}
                    type="button"
                    onClick={() => void toggleVoiceCapture()}
                    disabled={voiceBusy}
                  >
                    {isRecording ? 'Stop Recording' : voiceBusy ? 'Processing Voice…' : 'Record Voice'}
                  </button>
                  <button
                    className={s.secondaryAction}
                    type="button"
                    onClick={() => void speakCurrentText()}
                    disabled={!actionText || voiceBusy}
                  >
                    {voiceBusy ? 'Speaking…' : 'Speak Reply'}
                  </button>
                </>
              )}
            </div>
            <div className={s.actionRow}>
              <button
                className={s.secondaryAction}
                type="button"
                onClick={saveToChronicle}
                disabled={!actionText}
              >
                Save to Chronicle
              </button>
              <button
                className={s.secondaryAction}
                type="button"
                onClick={useInPrayer}
                disabled={!actionText}
              >
                Use in Prayer
              </button>
              <button
                className={s.secondaryAction}
                type="button"
                onClick={addAsPrayerRequest}
                disabled={!actionText}
              >
                Add Prayer Request
              </button>
            </div>
            <div className={s.actionRow}>
              <button
                className={s.secondaryAction}
                type="button"
                onClick={saveAsReflection}
                disabled={!actionText}
              >
                Save Reflection
              </button>
              <button
                className={s.secondaryAction}
                type="button"
                onClick={saveAsInsight}
                disabled={!actionText}
              >
                Save Insight
              </button>
              <button
                className={s.secondaryAction}
                type="button"
                onClick={saveAsPrayerArtifact}
                disabled={!actionText}
              >
                Save as Prayer
              </button>
              <button
                className={s.secondaryAction}
                type="button"
                onClick={saveAsStudyQuestions}
                disabled={!actionText || !['/bible', '/study', '/discipleship'].includes(pageKey)}
              >
                Save as Study
              </button>
              <button
                className={s.secondaryAction}
                type="button"
                onClick={openPassageInBible}
                disabled={!context.passage}
              >
                Open Passage
              </button>
              <button
                className={s.secondaryAction}
                type="button"
                onClick={openThemesInBible}
                disabled={!context.passage}
              >
                Open Themes
              </button>
              <button
                className={s.secondaryAction}
                type="button"
                onClick={openEchoesInBible}
                disabled={!context.passage}
              >
                Open Echoes
              </button>
              <button
                className={s.secondaryAction}
                type="button"
                onClick={openGreekInBible}
                disabled={!canOpenGreek}
              >
                Open Greek
              </button>
              <button
                className={s.secondaryAction}
                type="button"
                onClick={saveReflectionPromptSet}
              >
                Save Prompt Set
              </button>
              <button
                className={s.secondaryAction}
                type="button"
                onClick={openPassageInChronicle}
              >
                Open Chronicle
              </button>
            </div>
            <div className={s.actionRow}>
              <button
                className={s.secondaryAction}
                type="button"
                onClick={openStudyWorkspace}
                disabled={pageKey === '/study'}
              >
                Open Study
              </button>
              <button
                className={s.secondaryAction}
                type="button"
                onClick={openDiscipleshipWorkspace}
                disabled={pageKey === '/discipleship' || !activeOwnedBookId}
              >
                Open Discipleship
              </button>
              <button
                className={s.secondaryAction}
                type="button"
                onClick={openWorkbookWorkspace}
                disabled={!activeOwnedBookId && !context.ownedBookId}
              >
                Open Workbook
              </button>
            </div>
            <textarea
              className={s.input}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={`Ask ${persona.shortLabel.toLowerCase()} about ${pageLabel.toLowerCase()}...`}
            />
            <div className={s.row}>
              <div className={s.hint}>Uses your local page context and the selected Chronicle voice.</div>
              <button className={s.sendBtn} disabled={pending || draft.trim().length === 0} type="submit">
                {pending ? 'Thinking…' : 'Send'}
              </button>
            </div>
          </form>
        </>
      )}
      </aside>
    </>
  );
}
