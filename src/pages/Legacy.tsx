import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { deriveLegacyNarrative } from '../lib/formationAnalytics';
import { deriveBookParts, paginateBook } from '../lib/bookPagination';
import { useAIChatStore } from '../store/aiChatStore';
import s from './Legacy.module.css';

// The Book / Story — the Old Family Bible register (UX redesign,
// Design-1). An heirloom on a shelf, not a museum piece: oxblood
// leather, brass gilt page-edges, foxed and aged paper. Domesticates
// scripture-adjacent reverence rather than venerating it — "Sunday
// afternoon at grandmother's house," not a scriptorium (that
// register belongs to Bible reading — see Design-2, Manuscript).
//
// Per DESIGN.md's structural commitment #4, no AI companion panel
// appears in any of the five named registers — this page's previous
// bespoke "Legacy AI" sidebar is removed. The page still feeds the
// app's one global AI companion panel via setPageContext/
// setSelectedAgentMode below, so a person can still ask about their
// book from the same quiet threshold used everywhere else; there is
// no second, competing panel duplicating it on this page.

type BookViewState = { mode: 'reading' } | { mode: 'contents' };

export default function Legacy() {
  const navigate = useNavigate();
  const { chronicleEntries } = useAppStore();
  const setPageContext = useAIChatStore((state) => state.setPageContext);
  const setSelectedAgentMode = useAIChatStore((state) => state.setSelectedAgentMode);
  const parts = useMemo(() => deriveBookParts(chronicleEntries), [chronicleEntries]);
  const pages = useMemo(() => paginateBook(parts), [parts]);
  const narrative = useMemo(() => deriveLegacyNarrative(chronicleEntries), [chronicleEntries]);
  const leadChapterTitle = parts[0]?.chapters[0]?.title;
  const [pageIndex, setPageIndex] = useState(0);
  const currentPage = pages[Math.min(pageIndex, Math.max(0, pages.length - 1))];
  const [view, setView] = useState<BookViewState>({ mode: 'reading' });

  const totalChapters = useMemo(() => parts.reduce((sum, part) => sum + part.chapters.length, 0), [parts]);

  useEffect(() => {
    setSelectedAgentMode('reflection_guide');
    setPageContext('/legacy', {
      page: 'Legacy',
      pathname: '/legacy',
      title: document.title,
      selection: narrative,
      passage: leadChapterTitle,
      summary: `The Book of Chris — ${chronicleEntries.length} Chronicle entries across ${totalChapters} chapters and ${pages.length} typeset pages.`,
    });
  }, [chronicleEntries.length, leadChapterTitle, narrative, pages.length, setPageContext, setSelectedAgentMode, totalChapters]);

  const jumpToChapter = (chapterId: string) => {
    const target = pages.findIndex((page) => page.chapterId === chapterId);
    if (target >= 0) setPageIndex(target);
    setView({ mode: 'reading' });
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, background: 'var(--oldbible-shelf, #0f0b08)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 32px 64px' }}>
        <div style={{ position: 'relative' }}>
          {/* the leather cover */}
          <div
            className={s.cover}
            style={{
              background: 'radial-gradient(ellipse at 20% 15%, #5a2a2a 0%, #4a1f1f 38%, #3a1717 78%, #2b1010 100%)',
              borderRadius: 6,
              padding: 22,
              boxShadow: '0 25px 45px rgba(0,0,0,0.6), inset 0 0 0 1px #2b1010, inset 0 0 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ border: '1px solid #8a5a1f', outline: '1px solid rgba(201,162,39,0.35)', outlineOffset: 3, borderRadius: 3, padding: 3 }}>
              <div style={{ display: 'flex', boxShadow: '0 10px 26px rgba(0,0,0,0.45)' }}>
                <div
                  className={s.giltEdge}
                  style={{
                    width: 16, flex: '0 0 16px',
                    background: 'linear-gradient(90deg, #7a5410 0%, #c9a227 18%, #e8c766 38%, #b8860b 55%, #e8c766 70%, #97701a 88%, #6b4a10 100%)',
                  }}
                />

                <div
                  className={s.page}
                  style={{
                    flex: 1,
                    background: 'radial-gradient(ellipse at 50% 45%, #fbf3dc 0%, #f0e4c8 55%, #e9d8ab 88%, #d9c48f 100%)',
                    minHeight: 520,
                  }}
                >
                  <div style={{ position: 'relative', zIndex: 1, padding: '32px 48px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                      <button
                        onClick={() => setView((v) => (v.mode === 'contents' ? { mode: 'reading' } : { mode: 'contents' }))}
                        style={{ border: 'none', background: 'none', padding: 0, fontSize: 11, fontVariant: 'small-caps', letterSpacing: '0.08em', color: '#8a5a1f', fontWeight: 700, cursor: 'pointer' }}
                      >
                        {view.mode === 'contents' ? '← Back to reading' : '📖 Table of Contents'}
                      </button>
                      <button
                        onClick={() => navigate('/thread')}
                        style={{ border: 'none', background: 'none', padding: 0, fontSize: 11, color: '#8a5a1f', cursor: 'pointer' }}
                      >
                        See the raw daily log →
                      </button>
                    </div>

                    {view.mode === 'contents' ? (
                      <div style={{ padding: '20px 0 10px' }}>
                        <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: '#3a2b17', textAlign: 'center', marginBottom: 24 }}>
                          The Book of Chris
                        </div>
                        {parts.length === 0 ? (
                          <p style={{ textAlign: 'center', fontSize: 14, color: '#6b4a10', fontStyle: 'italic' }}>
                            Nothing set down yet — the first chapter begins with your first entry.
                          </p>
                        ) : (
                          <div style={{ display: 'grid', gap: 20, maxWidth: 480, margin: '0 auto' }}>
                            {parts.map((part) => (
                              <div key={part.year}>
                                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8a5a1f', marginBottom: 6 }}>
                                  Part {part.roman} · {part.year}
                                </div>
                                <div style={{ display: 'grid', gap: 4 }}>
                                  {part.chapters.map((chapter) => (
                                    <button
                                      key={chapter.id}
                                      onClick={() => jumpToChapter(chapter.id)}
                                      style={{
                                        textAlign: 'left', border: 'none', background: currentPage?.chapterId === chapter.id ? 'rgba(138,90,31,0.12)' : 'transparent',
                                        padding: '6px 10px', borderRadius: 4, cursor: 'pointer', fontFamily: 'Georgia, serif', fontSize: 14, color: '#3a2b17',
                                      }}
                                    >
                                      {chapter.title}
                                      <span style={{ fontSize: 11, color: '#6b4a10', marginLeft: 8 }}>
                                        {chapter.entries.length} entr{chapter.entries.length === 1 ? 'y' : 'ies'}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : pages.length === 0 ? (
                      <div style={{ padding: '48px 0', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: '#3a2b17', marginBottom: 16 }}>The Book of Chris</div>
                        <p style={{ fontFamily: 'Georgia, serif', fontSize: 15.5, lineHeight: 1.85, color: '#5a4326', maxWidth: 480, margin: '0 auto', whiteSpace: 'pre-line' }}>
                          {narrative}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div style={{ textAlign: 'center', fontFamily: 'Georgia, serif', fontVariant: 'small-caps', letterSpacing: '0.08em', fontSize: 13, color: '#7a6a4a', borderBottom: '1px solid rgba(122,90,20,0.4)', paddingBottom: 12, marginBottom: 10 }}>
                          The Book of Chris · Part {parts.find((p) => p.year === currentPage.year)?.roman ?? currentPage.year} · The {currentPage.year} Season
                        </div>
                        <div style={{ textAlign: 'center', fontSize: 11, color: '#9a8a63', fontStyle: 'italic', marginBottom: 28, letterSpacing: '0.02em' }}>
                          You are on page {currentPage.pageNumber} of your book.
                        </div>

                        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 25, color: '#3a2b17', textAlign: 'center', letterSpacing: '0.02em', margin: '0 0 10px', fontWeight: 'normal' }}>
                          {currentPage.chapterTitle}
                        </h1>
                        <div
                          className={s.dropRule}
                          style={{ width: 140, height: 6, margin: '0 auto 28px', background: 'linear-gradient(90deg, transparent 0%, #8a5a1f 15%, #c9a227 50%, #8a5a1f 85%, transparent 100%)' }}
                        />

                        <p style={{ fontFamily: 'Georgia, serif', fontSize: 15.5, lineHeight: 1.85, color: '#5a4326', textAlign: 'justify', whiteSpace: 'pre-line', maxWidth: 640, margin: '0 auto' }}>
                          {currentPage.text}
                        </p>

                        <div style={{ textAlign: 'center', marginTop: 30, fontVariant: 'small-caps', letterSpacing: '0.15em', fontSize: 13, color: '#6b4a10' }}>
                          — {currentPage.pageNumber} —
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(122,90,20,0.3)' }}>
                          <button
                            onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
                            disabled={pageIndex === 0}
                            style={{ padding: '7px 14px', borderRadius: 4, border: '1px solid #8a5a1f', background: 'transparent', color: '#6b4a10', fontSize: 12, fontWeight: 600, cursor: pageIndex === 0 ? 'default' : 'pointer', opacity: pageIndex === 0 ? 0.35 : 1 }}
                          >
                            ← Previous
                          </button>
                          <button
                            onClick={() => setPageIndex((i) => Math.min(pages.length - 1, i + 1))}
                            disabled={pageIndex >= pages.length - 1}
                            style={{ padding: '7px 14px', borderRadius: 4, border: '1px solid #8a5a1f', background: 'transparent', color: '#6b4a10', fontSize: 12, fontWeight: 600, cursor: pageIndex >= pages.length - 1 ? 'default' : 'pointer', opacity: pageIndex >= pages.length - 1 ? 0.35 : 1 }}
                          >
                            Next →
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div
                  className={s.giltEdge}
                  style={{
                    width: 16, flex: '0 0 16px',
                    background: 'linear-gradient(90deg, #7a5410 0%, #c9a227 18%, #e8c766 38%, #b8860b 55%, #e8c766 70%, #97701a 88%, #6b4a10 100%)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
