import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { answerLegacyQuestion, deriveLegacyNarrative } from '../lib/formationAnalytics';
import { deriveBookParts, paginateBook } from '../lib/bookPagination';
import { useAIChatStore } from '../store/aiChatStore';
import { useResponsiveLayout } from '../lib/useResponsiveLayout';

type LegacyMessage =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text: string; sources: string[] };

export default function Legacy() {
  const navigate = useNavigate();
  const { chronicleEntries } = useAppStore();
  const setPageContext = useAIChatStore((state) => state.setPageContext);
  const setSelectedAgentMode = useAIChatStore((state) => state.setSelectedAgentMode);
  const { isCompact } = useResponsiveLayout();
  const parts = useMemo(() => deriveBookParts(chronicleEntries), [chronicleEntries]);
  const pages = useMemo(() => paginateBook(parts), [parts]);
  const narrative = useMemo(() => deriveLegacyNarrative(chronicleEntries), [chronicleEntries]);
  const leadChapterTitle = parts[0]?.chapters[0]?.title;
  const [pageIndex, setPageIndex] = useState(0);
  const currentPage = pages[Math.min(pageIndex, Math.max(0, pages.length - 1))];
  const [aiInput, setAiInput] = useState('');
  const [conversation, setConversation] = useState<LegacyMessage[]>([
    {
      role: 'assistant',
      text: 'Ask about the life Chronicle has captured so far: fear, trust, prayer, surrender, returning, or what keeps surfacing in the writing.',
      sources: [],
    },
  ]);

  const totalChapters = useMemo(() => parts.reduce((sum, part) => sum + part.chapters.length, 0), [parts]);

  useEffect(() => {
    setSelectedAgentMode('reflection_guide');
    setPageContext('/legacy', {
      page: 'Legacy',
      pathname: '/legacy',
      title: document.title,
      selection: narrative,
      passage: leadChapterTitle,
      summary: `Legacy view built from ${chronicleEntries.length} Chronicle entries across ${totalChapters} derived chapters and ${pages.length} typeset pages.`,
    });
  }, [chronicleEntries.length, leadChapterTitle, narrative, pages.length, setPageContext, setSelectedAgentMode, totalChapters]);

  const jumpToChapter = (chapterId: string) => {
    const target = pages.findIndex((page) => page.chapterId === chapterId);
    if (target >= 0) setPageIndex(target);
  };

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
    <div style={{ flex: 1, display: 'flex', flexDirection: isCompact ? 'column' : 'row', overflow: 'hidden', minHeight: 0 }}>
      <div style={{ width: isCompact ? '100%' : 230, minWidth: isCompact ? 0 : 230, maxHeight: isCompact ? 200 : undefined, borderRight: isCompact ? 'none' : '1px solid var(--border)', borderBottom: isCompact ? '1px solid var(--border)' : 'none', background: 'var(--card-bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'var(--card-inner)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-serif)' }}>The Book of Chris</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>A narrated life, drawn from your Chronicle</div>
          <button
            type="button"
            onClick={() => navigate('/thread')}
            style={{ marginTop: 8, padding: 0, background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
          >
            ← See the raw daily log
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0', minHeight: 0 }}>
          {parts.map((part) => (
            <div key={part.year}>
              <div style={{ padding: '10px 16px 4px', fontSize: 10, fontWeight: 700, color: part.status === 'active' ? 'var(--accent-blue)' : 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Part {part.roman} · {part.year}
              </div>
              {part.chapters.map((chapter) => {
                const isCurrent = currentPage?.chapterId === chapter.id;
                return (
                  <button
                    key={chapter.id}
                    onClick={() => jumpToChapter(chapter.id)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                      padding: '6px 16px', borderLeft: isCurrent ? '3px solid var(--accent-blue)' : '3px solid transparent',
                      background: isCurrent ? 'var(--accent-blue-light)' : 'transparent',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: isCurrent ? 600 : 400, color: 'var(--text)' }}>{chapter.title}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{chapter.entries.length} entr{chapter.entries.length === 1 ? 'y' : 'ies'}</div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)', padding: '24px', display: 'flex', flexDirection: 'column', gap: 20, minHeight: 0 }}>
        <div style={{ background: '#fdfcf8', border: '1px solid var(--border)', borderRadius: 16, padding: '40px 48px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16 }}>A Life Walked with God</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>The Book of Chris</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13, fontStyle: 'italic', color: 'var(--text-sub)', lineHeight: 1.7, maxWidth: 420, margin: '20px auto 0' }}>
            For the ones who come after, may the remembered pattern be truthful, humble, and full of return.
          </div>
        </div>

        {pages.length === 0 ? (
          <div style={{ background: '#fdfcf8', border: '1px solid var(--border)', borderRadius: 16, padding: '40px 48px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, lineHeight: 2, color: 'var(--text)', whiteSpace: 'pre-line' }}>
              {narrative}
            </div>
          </div>
        ) : (
          <div style={{ background: '#fdfcf8', border: '1px solid var(--border)', borderRadius: 16, padding: '40px 48px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', minHeight: 420 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-blue)', marginBottom: 8 }}>
              {currentPage.year} · {currentPage.chapterTitle}
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, lineHeight: 2, color: 'var(--text)', whiteSpace: 'pre-line', flex: 1 }}>
              {currentPage.text}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
                disabled={pageIndex === 0}
                style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', fontSize: 12, fontWeight: 600, cursor: pageIndex === 0 ? 'default' : 'pointer', opacity: pageIndex === 0 ? 0.4 : 1 }}
              >
                ← Previous
              </button>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>
                Page {currentPage.pageNumber} of {pages.length}
              </div>
              <button
                onClick={() => setPageIndex((i) => Math.min(pages.length - 1, i + 1))}
                disabled={pageIndex >= pages.length - 1}
                style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', fontSize: 12, fontWeight: 600, cursor: pageIndex >= pages.length - 1 ? 'default' : 'pointer', opacity: pageIndex >= pages.length - 1 ? 0.4 : 1 }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ width: isCompact ? '100%' : 320, minWidth: isCompact ? 0 : 320, maxHeight: isCompact ? 360 : undefined, borderLeft: isCompact ? 'none' : '1px solid var(--border)', borderTop: isCompact ? '1px solid var(--border)' : 'none', background: 'var(--card-bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--accent-blue-light)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-blue)' }}>Legacy AI</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>Answers from saved Chronicle material</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
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
            style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 16, background: 'var(--card-inner)', color: 'var(--text)', outline: 'none' }}
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
