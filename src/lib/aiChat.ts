import type { AIChatMessage, AIPageContext, ChronicleAgentMode } from '../store/aiChatStore';
import type { ChroniclePersonaId } from './chroniclePersonas';

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function sendAIChatMessage({
  pageKey,
  pageLabel,
  context,
  messages,
  prompt,
  persona,
  agentMode,
}: {
  pageKey: string;
  pageLabel: string;
  context: AIPageContext;
  messages: AIChatMessage[];
  prompt: string;
  persona: ChroniclePersonaId;
  agentMode: ChronicleAgentMode;
}) {
  const userMessage: AIChatMessage = {
    id: makeId(),
    role: 'user',
    text: prompt,
    createdAt: new Date().toISOString(),
  };

  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      page: pageLabel,
      pathname: pageKey,
      persona,
      agentMode,
      context,
      messages: [...messages, userMessage].slice(-10),
    }),
  });

  const payload = await response.json() as { reply?: string; error?: { errmsg?: string } };
  if (!response.ok || !payload.reply) {
    throw new Error(payload.error?.errmsg || 'The assistant could not answer right now.');
  }

  const assistantMessage: AIChatMessage = {
    id: makeId(),
    role: 'assistant',
    text: payload.reply,
    createdAt: new Date().toISOString(),
    persona,
  };

  return { userMessage, assistantMessage };
}
