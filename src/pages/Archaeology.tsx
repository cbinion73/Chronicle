import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { useResponsiveLayout } from '../lib/useResponsiveLayout';
import { CARD_STYLE } from '../components/ui/cardStyle';
import { ARCHAEOLOGY_PROMPTS } from '../data/archaeologyPrompts';

// The Archaeology (ROADMAP M18) — most keepers arrive with decades of walk
// already behind them, unrecorded. This is the guided excavation that
// sets those stones: a short sequence of prompts, each either skipped or
// answered with a real (often approximate) past date. No AI, no
// judgment about what's remembered imprecisely — a year is enough.

const CARRIED_OPTIONS = [
  { id: 'same-day', label: 'Answered quickly', months: 0 },
  { id: 'weeks', label: 'A few weeks', months: 1 },
  { id: 'months', label: 'Several months', months: 6 },
  { id: 'year', label: 'About a year', months: 12 },
  { id: 'years', label: 'Several years', months: 48 },
];

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function subtractMonths(dateStr: string, months: number) {
  const date = new Date(`${dateStr}T12:00:00`);
  date.setMonth(date.getMonth() - months);
  return date.toISOString().split('T')[0];
}

export default function Archaeology() {
  const navigate = useNavigate();
  const { isPhone } = useResponsiveLayout();
  const { addChronicleEntry, addPrayerItem } = useAppStore();
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<'asking' | 'writing'>('asking');
  const [date, setDate] = useState(() => todayStr());
  const [text, setText] = useState('');
  const [carried, setCarried] = useState(CARRIED_OPTIONS[2].id);
  const [stonesSet, setStonesSet] = useState(0);

  const prompt = ARCHAEOLOGY_PROMPTS[index];
  const card: React.CSSProperties = { ...CARD_STYLE, padding: isPhone ? '20px 18px' : '28px 32px' };

  const advance = () => {
    setStage('asking');
    setDate(todayStr());
    setText('');
    setCarried(CARRIED_OPTIONS[2].id);
    setIndex((i) => i + 1);
  };

  const skip = () => advance();

  const save = () => {
    if (!text.trim()) return;
    if (prompt.kind === 'growth' && prompt.growthKind) {
      addChronicleEntry({
        id: Math.random().toString(36).slice(2),
        date,
        type: 'growth',
        title: text.trim().slice(0, 60) + (text.length > 60 ? '…' : ''),
        body: text.trim(),
        sourceContext: { page: 'chronicle', growthMarker: { kind: prompt.growthKind } },
      });
    } else {
      const monthsBack = CARRIED_OPTIONS.find((option) => option.id === carried)?.months ?? 0;
      addPrayerItem({
        id: Math.random().toString(36).slice(2),
        text: text.trim().slice(0, 120),
        category: 'praise',
        answered: true,
        dateAdded: subtractMonths(date, monthsBack),
        dateAnswered: date,
        answerSummary: text.trim(),
      });
    }
    setStonesSet((n) => n + 1);
    advance();
  };

  if (index >= ARCHAEOLOGY_PROMPTS.length) {
    return (
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: isPhone ? '48px 18px' : '72px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 34, color: 'var(--accent-amber)', marginBottom: 14 }}>🗿</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
            {stonesSet > 0 ? `${stonesSet} stone${stonesSet === 1 ? '' : 's'} set.` : 'Nothing set today — that\'s all right.'}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-sub)', lineHeight: 1.7, maxWidth: 440, margin: '0 auto 28px' }}>
            {stonesSet > 0
              ? 'Your thread now begins further back than today. You can come back and add more whenever something else surfaces.'
              : 'You can return to this whenever a memory surfaces — nothing here has to happen at once.'}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/thread/growth')} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              The Growth Spine
            </button>
            <button onClick={() => navigate('/prayer/answered-light')} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              The Answered Light
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
      <div style={{ maxWidth: 620, margin: '0 auto', padding: isPhone ? '22px 16px 48px' : '40px 24px 64px' }}>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-amber)' }}>The Archaeology</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{index + 1} of {ARCHAEOLOGY_PROMPTS.length}</div>
        </div>

        <section style={card}>
          <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 12 }}>{prompt.icon}</div>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 600, color: 'var(--text)', textAlign: 'center', lineHeight: 1.6, margin: '0 0 20px' }}>
            {prompt.question}
          </p>

          {stage === 'asking' ? (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
              <button onClick={skip} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Skip
              </button>
              <button onClick={() => setStage('writing')} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: 'var(--accent-amber)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Yes, I remember
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                  {prompt.kind === 'prayer' ? 'Roughly when was it answered?' : 'Roughly when did this happen? (a year is enough)'}
                </div>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 16, background: 'var(--card-inner)', color: 'var(--text)', outline: 'none' }}
                />
              </div>
              {prompt.kind === 'prayer' && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>How long had you been carrying it?</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {CARRIED_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setCarried(option.id)}
                        style={{ padding: '5px 10px', borderRadius: 20, border: `1px solid ${carried === option.id ? 'var(--accent-amber)' : 'var(--border)'}`, background: carried === option.id ? 'var(--accent-amber-light)' : 'transparent', color: carried === option.id ? 'var(--accent-amber)' : 'var(--text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <textarea
                autoFocus
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={prompt.placeholder}
                style={{ minHeight: 110, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', fontSize: 16, fontFamily: 'var(--font-serif)', lineHeight: 1.65, resize: 'vertical', outline: 'none' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={skip} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', fontSize: 12, cursor: 'pointer' }}>
                  Skip this one
                </button>
                <button
                  onClick={save}
                  disabled={!text.trim()}
                  style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--accent-amber)', color: 'white', fontSize: 12, fontWeight: 700, cursor: text.trim() ? 'pointer' : 'default', opacity: text.trim() ? 1 : 0.55 }}
                >
                  Set This Stone ✚
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
