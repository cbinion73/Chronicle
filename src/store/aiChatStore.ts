import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_CHRONICLE_PERSONA, type ChroniclePersonaId } from '../lib/chroniclePersonas';

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  persona?: ChroniclePersonaId;
}

export interface AIPageContext {
  page: string;
  pathname: string;
  title?: string;
  passage?: string;
  book?: string;
  chapter?: number;
  provider?: string;
  studyModuleId?: string;
  currentDay?: number;
  ownedBookId?: string;
  readerView?: 'study' | 'workbook';
  selection?: string;
  summary?: string;
}

export interface AISelectionMenuState {
  open: boolean;
  x: number;
  y: number;
  text: string;
}

export type ChronicleAgentMode =
  | 'bible_study_agent'
  | 'discipleship_coach'
  | 'prayer_guide'
  | 'reflection_guide';

export const CHRONICLE_AGENT_MODE_DEFS: Record<ChronicleAgentMode, {
  label: string;
  shortLabel: string;
  summary: string;
}> = {
  bible_study_agent: {
    label: 'Bible Study Agent',
    shortLabel: 'Bible',
    summary: 'Text-first interpretation, passage explanation, cross-reference tracing, and study clarity.',
  },
  discipleship_coach: {
    label: 'Discipleship Coach',
    shortLabel: 'Coach',
    summary: 'Daily obedience, workbook help, accountability, and next-step formation guidance.',
  },
  prayer_guide: {
    label: 'Prayer Guide',
    shortLabel: 'Prayer',
    summary: 'Scripture-shaped prayer, intercession, follow-up burdens, and secret-place help.',
  },
  reflection_guide: {
    label: 'Reflection Guide',
    shortLabel: 'Reflect',
    summary: 'Meaning-making, journaling, growth synthesis, and Chronicle-centered reflection.',
  },
};

export function getDefaultAgentModeForPage(pageKey: string): ChronicleAgentMode {
  if (pageKey === '/discipleship') return 'discipleship_coach';
  if (pageKey === '/prayer') return 'prayer_guide';
  if (pageKey === '/chronicle' || pageKey === '/legacy' || pageKey === '/insights' || pageKey === '/plans' || pageKey === '/' || pageKey === '/settings') {
    return 'reflection_guide';
  }
  return 'bible_study_agent';
}

export interface AIConversationThreadMeta {
  key: string;
  pageKey: string;
  pageLabel: string;
  title: string;
  passage?: string;
  contextSnapshot: AIPageContext;
  updatedAt: string;
}

export function getAIConversationKey(pageKey: string, context: AIPageContext) {
  if (pageKey === '/') {
    return `${pageKey}|study:${context.studyModuleId || 'bible-study'}|day:${context.currentDay || 1}|book:${context.ownedBookId || 'none'}|${context.passage || 'passage'}`;
  }
  if (pageKey === '/bible') {
    return `${pageKey}|${context.passage || `${context.book || 'book'}-${context.chapter || 1}`}`;
  }
  if (pageKey === '/study') {
    return `${pageKey}|${context.studyModuleId || 'module'}|day:${context.currentDay || 1}|${context.passage || 'passage'}`;
  }
  if (pageKey === '/discipleship') {
    return `${pageKey}|${context.ownedBookId || 'book'}|day:${context.currentDay || 1}|view:${context.readerView || 'study'}`;
  }
  if (pageKey === '/prayer') {
    return `${pageKey}|${context.passage || context.selection || 'general-prayer'}`;
  }
  if (pageKey === '/chronicle') {
    return `${pageKey}|${context.passage || context.selection || 'overview'}`;
  }
  return `${pageKey}|${context.passage || context.selection || context.title || 'default'}`;
}

export function getAIConversationThreadTitle(pageLabel: string, context: AIPageContext) {
  if (context.passage) return `${pageLabel} · ${context.passage}`;
  if (typeof context.currentDay === 'number') return `${pageLabel} · Day ${context.currentDay}`;
  if (context.title) return `${pageLabel} · ${context.title}`;
  return `${pageLabel} Thread`;
}

interface AIChatState {
  conversations: Record<string, AIChatMessage[]>;
  pendingByPage: Record<string, boolean>;
  contextByPage: Record<string, AIPageContext>;
  threadMetaByKey: Record<string, AIConversationThreadMeta>;
  selectedPersona: ChroniclePersonaId;
  selectedAgentMode: ChronicleAgentMode;
  selectionMenu: AISelectionMenuState;
  appendMessage: (pageKey: string, message: AIChatMessage) => void;
  setPending: (pageKey: string, pending: boolean) => void;
  setPageContext: (pageKey: string, context: AIPageContext) => void;
  touchThread: (thread: AIConversationThreadMeta) => void;
  setSelectedPersona: (persona: ChroniclePersonaId) => void;
  setSelectedAgentMode: (mode: ChronicleAgentMode) => void;
  openSelectionMenu: (menu: AISelectionMenuState) => void;
  closeSelectionMenu: () => void;
  clearConversation: (pageKey: string) => void;
}

export const useAIChatStore = create<AIChatState>()(
  persist(
    (set) => ({
      conversations: {},
      pendingByPage: {},
      contextByPage: {},
      threadMetaByKey: {},
      selectedPersona: DEFAULT_CHRONICLE_PERSONA,
      selectedAgentMode: 'bible_study_agent',
      selectionMenu: { open: false, x: 0, y: 0, text: '' },
      appendMessage: (pageKey, message) =>
        set((state) => ({
          conversations: {
            ...state.conversations,
            [pageKey]: [...(state.conversations[pageKey] || []), message],
          },
        })),
      setPending: (pageKey, pending) =>
        set((state) => ({
          pendingByPage: {
            ...state.pendingByPage,
            [pageKey]: pending,
          },
        })),
      setPageContext: (pageKey, context) =>
        set((state) => ({
          contextByPage: {
            ...state.contextByPage,
            [pageKey]: context,
          },
        })),
      touchThread: (thread) =>
        set((state) => ({
          threadMetaByKey: {
            ...state.threadMetaByKey,
            [thread.key]: thread,
          },
        })),
      setSelectedPersona: (selectedPersona) => set({ selectedPersona }),
      setSelectedAgentMode: (selectedAgentMode) => set({ selectedAgentMode }),
      openSelectionMenu: (selectionMenu) => set({ selectionMenu }),
      closeSelectionMenu: () => set({ selectionMenu: { open: false, x: 0, y: 0, text: '' } }),
      clearConversation: (pageKey) =>
        set((state) => ({
          conversations: {
            ...state.conversations,
            [pageKey]: [],
          },
        })),
    }),
    {
      name: 'chronicle-ai-chat',
      partialize: (state) => ({
        conversations: state.conversations,
        contextByPage: state.contextByPage,
        threadMetaByKey: state.threadMetaByKey,
        selectedPersona: state.selectedPersona,
        selectedAgentMode: state.selectedAgentMode,
      }),
    },
  ),
);
