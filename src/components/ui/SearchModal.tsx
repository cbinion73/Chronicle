import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchScripture } from '../../lib/scripture';
import { useAppStore } from '../../store';
import { BIBLE_STUDY_MODULE, getStudyDay } from '../../lib/studyModules';

interface Props {
  open: boolean;
  onClose: () => void;
}

function SearchModalContent({ onClose }: Omit<Props, 'open'>) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { chronicleEntries, activeOwnedBookId, ownedBooks, studyModuleDayById } = useAppStore();
  const activeStudyDay = getStudyDay('bible-study', studyModuleDayById['bible-study'] || 1);
  const activeOwnedBook = ownedBooks.find((book) => book.id === activeOwnedBookId) || ownedBooks[0] || null;

  useEffect(() => {
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(focusTimer);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const scriptureResults = searchScripture(query);
  const chronicleResults = query.length > 1
    ? chronicleEntries.filter(
        (entry) =>
          entry.title.toLowerCase().includes(query.toLowerCase()) ||
          entry.body.toLowerCase().includes(query.toLowerCase()),
      ).slice(0, 5)
    : [];

  const hasResults = scriptureResults.length > 0 || chronicleResults.length > 0;

  const quickLinks = [
    { label: 'Today', path: '/', icon: '📋' },
    { label: `Bible — ${activeStudyDay.scripture}`, path: '/bible', icon: '📖' },
    { label: `Study — ${BIBLE_STUDY_MODULE.shortTitle} Day ${activeStudyDay.day}`, path: '/study', icon: '🔍' },
    { label: activeOwnedBook ? `Discipleship — ${activeOwnedBook.title}` : 'Discipleship — My Books', path: '/discipleship', icon: '📚' },
    { label: 'Prayer List', path: '/prayer', icon: '🙏' },
    { label: 'My Chronicle', path: '/chronicle', icon: '📓' },
    { label: 'Insights', path: '/insights', icon: '📊' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1100,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '12vh',
        backdropFilter: 'blur(2px)',
      }}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div style={{ width: 600, maxWidth: '92vw', background: 'var(--card-bg)', borderRadius: 14, boxShadow: '0 24px 64px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Scripture, themes, Chronicle entries..."
            style={{ flex: 1, fontSize: 15, color: 'var(--text)', background: 'transparent', border: 'none', outline: 'none' }}
          />
          <kbd style={{ fontSize: 11, padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text-muted)', background: 'var(--card-inner)' }}>Esc</kbd>
        </div>

        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {!query && (
            <div style={{ padding: '10px 0' }}>
              <div style={{ padding: '4px 16px 6px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Quick Links</div>
              {quickLinks.map((link) => (
                <div
                  key={link.path}
                  onClick={() => {
                    navigate(link.path);
                    onClose();
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={(event) => (event.currentTarget.style.background = 'var(--card-inner)')}
                  onMouseLeave={(event) => (event.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: 15 }}>{link.icon}</span>
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{link.label}</span>
                </div>
              ))}
            </div>
          )}

          {scriptureResults.length > 0 && (
            <div style={{ padding: '8px 0' }}>
              <div style={{ padding: '4px 16px 6px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Scripture</div>
              {scriptureResults.slice(0, 5).map((result) => (
                <div
                  key={result.ref + result.verse.number}
                  onClick={() => {
                    navigate('/bible');
                    onClose();
                  }}
                  style={{ padding: '8px 16px', cursor: 'pointer' }}
                  onMouseEnter={(event) => (event.currentTarget.style.background = 'var(--card-inner)')}
                  onMouseLeave={(event) => (event.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-blue)' }}>{result.ref}</span>
                    {result.chapter.heading && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>· {result.chapter.heading}</span>}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 12,
                      color: 'var(--text-sub)',
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {result.verse.text}
                  </div>
                </div>
              ))}
            </div>
          )}

          {chronicleResults.length > 0 && (
            <div style={{ padding: '8px 0', borderTop: '1px solid var(--border)' }}>
              <div style={{ padding: '4px 16px 6px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Chronicle Entries</div>
              {chronicleResults.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => {
                    navigate('/chronicle');
                    onClose();
                  }}
                  style={{ padding: '8px 16px', cursor: 'pointer' }}
                  onMouseEnter={(event) => (event.currentTarget.style.background = 'var(--card-inner)')}
                  onMouseLeave={(event) => (event.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{entry.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{entry.type} · {entry.date}</div>
                </div>
              ))}
            </div>
          )}

          {query.length > 1 && !hasResults && (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No results for "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchModal({ open, onClose }: Props) {
  if (!open) return null;
  return <SearchModalContent onClose={onClose} />;
}
