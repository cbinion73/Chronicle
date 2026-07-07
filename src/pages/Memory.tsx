import { useMemo, useState } from 'react';
import { useAppStore } from '../store';
import { useToastStore } from '../store/toastStore';
import { useResponsiveLayout } from '../lib/useResponsiveLayout';
import { createMemoryVerse, dueVerses, firstLetterPrompt } from '../lib/memoryEngine';
import type { MemoryVerse } from '../types';

// The Scripture Memory Engine — verses scheduled with spaced repetition.
// Review flow: first-letter prompt to self-test, reveal, then grade honestly.
// No AI, no gamification beyond the schedule itself telling the truth about
// what's about to be forgotten.

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function Memory() {
  const { memoryVerses, addMemoryVerse, reviewMemoryVerse, deleteMemoryVerse } = useAppStore();
  const { addToast } = useToastStore();
  const { isPhone } = useResponsiveLayout();
  const [addOpen, setAddOpen] = useState(false);
  const [reference, setReference] = useState('');
  const [text, setText] = useState('');
  const [translation, setTranslation] = useState('NKJV');
  const [reviewIndex, setReviewIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const today = useMemo(() => todayStr(), []);
  const due = useMemo(() => dueVerses(memoryVerses, today), [memoryVerses, today]);
  const current = due[reviewIndex];

  const addVerse = () => {
    if (!reference.trim() || !text.trim()) return;
    addMemoryVerse(createMemoryVerse({ reference: reference.trim(), text: text.trim(), translation }, today));
    setReference('');
    setText('');
    setAddOpen(false);
    addToast('Added to the Memory Engine', 'success', '🧠');
  };

  const grade = (quality: 'struggled' | 'good' | 'easy') => {
    if (!current) return;
    reviewMemoryVerse(current.id, quality);
    setRevealed(false);
    setReviewIndex((i) => (i >= due.length - 2 ? 0 : i));
  };

  const card: React.CSSProperties = {
    background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 14,
    padding: isPhone ? '16px' : '20px 22px', boxShadow: 'var(--shadow)',
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: isPhone ? '18px 16px 40px' : '28px 24px 56px', display: 'grid', gap: 16 }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-primary)' }}>Scripture Memory Engine</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
              {memoryVerses.length} verse{memoryVerses.length === 1 ? '' : 's'} planted · {due.length} due today
            </div>
          </div>
          <button
            onClick={() => setAddOpen((v) => !v)}
            style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--accent-primary)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            {addOpen ? 'Cancel' : '+ Plant a Verse'}
          </button>
        </div>

        {addOpen ? (
          <section style={card}>
            <div style={{ display: 'grid', gap: 10 }}>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Reference — e.g. Philippians 4:6-7"
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', fontSize: 16, outline: 'none' }}
              />
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="The verse text..."
                style={{ minHeight: 80, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', fontSize: 16, fontFamily: 'var(--font-serif)', lineHeight: 1.6, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  value={translation}
                  onChange={(e) => setTranslation(e.target.value)}
                  style={{ width: 90, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', fontSize: 16, outline: 'none' }}
                />
                <div style={{ flex: 1 }} />
                <button onClick={addVerse} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent-primary)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Plant It
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {due.length > 0 && current ? (
          <section style={card}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
              Review · {reviewIndex + 1} of {due.length} due
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>{current.reference}</div>

            {!revealed ? (
              <>
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: 17, color: 'var(--text-sub)', lineHeight: 1.75, letterSpacing: '0.02em' }}>
                  {firstLetterPrompt(current.text)}
                </p>
                <button
                  onClick={() => setRevealed(true)}
                  style={{ marginTop: 8, padding: '9px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Reveal
                </button>
              </>
            ) : (
              <>
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: 17, color: 'var(--text)', lineHeight: 1.75 }}>
                  "{current.text}"
                </p>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  {current.repetitions === 0 ? 'First review' : `Held ${current.repetitions} review${current.repetitions === 1 ? '' : 's'} · was due every ${current.intervalDays || 1} day${current.intervalDays === 1 ? '' : 's'}`}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                  <button onClick={() => grade('struggled')} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid var(--accent-amber)', background: 'transparent', color: 'var(--accent-amber)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Struggled
                  </button>
                  <button onClick={() => grade('good')} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Good
                  </button>
                  <button onClick={() => grade('easy')} style={{ padding: '9px 14px', borderRadius: 8, border: 'none', background: 'var(--accent-primary)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Easy
                  </button>
                </div>
              </>
            )}
          </section>
        ) : memoryVerses.length > 0 ? (
          <section style={{ ...card, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Nothing is due right now. Every planted verse is holding.
          </section>
        ) : (
          <section style={{ ...card, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No verses planted yet. Add one above — the engine will bring it back right when you're about to forget it.
          </section>
        )}

        {memoryVerses.length > 0 ? (
          <section>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
              The Garden — {memoryVerses.length} verse{memoryVerses.length === 1 ? '' : 's'}
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {[...memoryVerses].sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1)).map((verse: MemoryVerse) => (
                <div key={verse.id} style={{ ...card, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{verse.reference}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {verse.dueDate <= today ? 'Due now' : `Next review ${verse.dueDate}`} · {verse.totalReviews} review{verse.totalReviews === 1 ? '' : 's'}
                      {verse.totalLapses > 0 ? ` · ${verse.totalLapses} lapse${verse.totalLapses === 1 ? '' : 's'}` : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMemoryVerse(verse.id)}
                    title="Remove from the Memory Engine"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', padding: 4 }}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

      </div>
    </div>
  );
}
