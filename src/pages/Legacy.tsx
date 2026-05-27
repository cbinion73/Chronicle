import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store';
import { answerLegacyQuestion, deriveLegacyChapters, deriveLegacyNarrative } from '../lib/formationAnalytics';
import { useAIChatStore } from '../store/aiChatStore';

type LegacyMessage =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text: string; sources: string[] };

export default function Legacy() {
  const { chronicleEntries } = useAppStore();
  const setPageContext = useAIChatStore((state) => state.setPageContext);
  const setSelectedAgentMode = useAIChatStore((state) => state.setSelectedAgentMode);
  const chapters = useMemo(() => deriveLegacyChapters(chronicleEntries), [chronicleEntries]);
  const narrative = useMemo(() => deriveLegacyNarrative(chronicleEntries), [chronicleEntries]);
  const leadChapterTitle = chapters[0]?.title;
  const [aiInput, setAiInput] = useState('');
  const [conversation, setConversation] = useState<LegacyMessage[]>([
    {
      role: 'assistant',
      text: 'Ask about the life Chronicle has captured so far: fear, trust, prayer, surrender, returning, or what keeps surfacing in the writing.',
      sources: [],
    },
  ]);

  useEffect(() => {
    setSelectedAgentMode('reflection_guide');
    setPageContext('/legacy', {
      page: 'Legacy',
      pathname: '/legacy',
      title: document.title,
      selection: narrative,
      passage: leadChapterTitle,
      summary: `Legacy view built from ${chronicleEntries.length} Chronicle entries across ${chapters.length} derived chapters.`,
    });
  }, [chapters.length, chronicleEntries.length, leadChapterTitle, narrative, setPageContext, setSelectedAgentMode]);

  const sendMessage = () => {
    if (!aiInput.trim()) return;
    const answer = answerLegacyQuestion(chronicleEntries, aiInput.trim());
    setConversation((prev) => [
      ...prev,
      { role: 'user', text: aiInput.trim() },
      { role: 'assistant', text: answer.text, sources: answer.sources },
    ]);
    setAiInput('');
  };

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <div style={{ width: 230, minWidth: 230, borderRight: '1px solid var(--border)', background: 'var(--card-bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'var(--card-inner)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-serif)' }}>The Book of Chris</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>A life walked with God</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {chapters.map((chapter) => (
            <div key={`${chapter.num}-${chapter.period}`} style={{ padding: '8px 16px', borderLeft: chapter.status === 'active' ? '3px solid var(--accent-blue)' : '3px solid transparent', background: chapter.status === 'active' ? 'var(--accent-blue-light)' : 'transparent' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: chapter.status === 'active' ? 'var(--accent-blue)' : 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>
                Chapter {chapter.num}
              </div>
              <div style={{ fontSize: 12, fontWeight: chapter.status === 'active' ? 600 : 400, color: 'var(--text)' }}>{chapter.title}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{chapter.period} · {chapter.count} entries</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)', padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ background: '#fdfcf8', border: '1px solid var(--border)', borderRadius: 16, padding: '40px 48px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16 }}>A Life Walked with God</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>The Book of Chris</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13, fontStyle: 'italic', color: 'var(--text-sub)', lineHeight: 1.7, maxWidth: 420, margin: '20px auto 0' }}>
            For the ones who come after, may the remembered pattern be truthful, humble, and full of return.
          </div>
        </div>

        <div style={{ background: '#fdfcf8', border: '1px solid var(--border)', borderRadius: 16, padding: '40px 48px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-blue)', marginBottom: 8 }}>Current Chapter</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>The Shape of Returning</h2>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 32 }}>
            Built from {chronicleEntries.length} Chronicle entr{chronicleEntries.length === 1 ? 'y' : 'ies'}
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, lineHeight: 2, color: 'var(--text)', whiteSpace: 'pre-line' }}>
            {narrative}
          </div>
        </div>
      </div>

      <div style={{ width: 320, minWidth: 320, borderLeft: '1px solid var(--border)', background: 'var(--card-bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--accent-blue-light)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-blue)' }}>Legacy AI</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>Answers from saved Chronicle material</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {conversation.map((message, index) => (
            <div key={`${message.role}-${index}`} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{
                padding: '8px 12px',
                borderRadius: message.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                background: message.role === 'user' ? 'var(--accent-blue)' : 'var(--card-inner)',
                border: message.role === 'assistant' ? '1px solid var(--border)' : 'none',
                fontSize: 12,
                lineHeight: 1.6,
                color: message.role === 'user' ? 'white' : 'var(--text)',
                fontFamily: message.role === 'assistant' ? 'var(--font-serif)' : 'inherit',
                alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '92%',
                whiteSpace: 'pre-line',
              }}>
                {message.text}
              </div>
              {message.role === 'assistant' && message.sources.length > 0 && (
                <div style={{ fontSize: 9, color: 'var(--text-muted)', paddingLeft: 4 }}>
                  {message.sources.map((source) => (
                    <div key={source} style={{ marginBottom: 1 }}>Source: {source}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <input
            value={aiInput}
            onChange={(event) => setAiInput(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && sendMessage()}
            style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, background: 'var(--card-inner)', color: 'var(--text)', outline: 'none' }}
            placeholder="Ask about fear, trust, prayer..."
          />
          <button onClick={sendMessage} style={{ padding: '7px 12px', background: 'var(--accent-blue)', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
            →
          </button>
        </div>
      </div>
    </div>
  );
}
