import { useLocation } from 'react-router-dom';
import { sendAIChatMessage } from '../../lib/aiChat';
import { getAIConversationKey, getAIConversationThreadTitle, useAIChatStore } from '../../store/aiChatStore';
import { useToastStore } from '../../store/toastStore';
import s from './AISelectionMenu.module.css';

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

export default function AISelectionMenu() {
  const location = useLocation();
  const pageKey = location.pathname || '/';
  const pageLabel = PAGE_LABELS[pageKey] || 'Page';
  const selectionMenu = useAIChatStore((state) => state.selectionMenu);
  const selectedPersona = useAIChatStore((state) => state.selectedPersona);
  const selectedAgentMode = useAIChatStore((state) => state.selectedAgentMode);
  const conversations = useAIChatStore((state) => state.conversations);
  const contextByPage = useAIChatStore((state) => state.contextByPage);
  const closeSelectionMenu = useAIChatStore((state) => state.closeSelectionMenu);
  const setPending = useAIChatStore((state) => state.setPending);
  const touchThread = useAIChatStore((state) => state.touchThread);
  const { addToast } = useToastStore();

  if (!selectionMenu.open) return null;

  async function handleAskAI() {
    const text = selectionMenu.text.trim();
    if (!text) return;

    const context = {
      ...(contextByPage[pageKey] || {}),
      page: pageLabel,
      pathname: pageKey,
      title: document.title,
      selection: text,
    };
    const conversationKey = getAIConversationKey(pageKey, context);
    const conversationTitle = getAIConversationThreadTitle(pageLabel, context);
    const messages = conversations[conversationKey] || [];

    closeSelectionMenu();
    setPending(conversationKey, true);

    try {
      const { userMessage, assistantMessage } = await sendAIChatMessage({
        pageKey,
        pageLabel,
        context,
        messages,
        persona: selectedPersona,
        agentMode: selectedAgentMode,
        prompt: `Please help me with this selected text:\n\n"${text}"`,
      });

      useAIChatStore.setState((state) => ({
        conversations: {
          ...state.conversations,
          [conversationKey]: [...messages, userMessage, assistantMessage],
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
      addToast(error instanceof Error ? error.message : 'The assistant could not answer right now.', 'warning', 'AI');
    } finally {
      setPending(conversationKey, false);
    }
  }

  return (
    <div
      className={s.menu}
      style={{ left: selectionMenu.x, top: selectionMenu.y }}
    >
      <div className={s.selection}>{selectionMenu.text}</div>
      <button className={s.button} onClick={handleAskAI} type="button">
        Ask Chronicle AI About This
      </button>
    </div>
  );
}
