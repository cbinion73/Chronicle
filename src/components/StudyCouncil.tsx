import { useMemo, useState } from 'react';
import { useAppStore } from '../store';
import { useToastStore } from '../store/toastStore';
import { useResponsiveLayout } from '../lib/useResponsiveLayout';
import { fetchStudyCouncil, type CouncilSeat, type SourceTag, type Confidence } from '../lib/studyCouncil';

// The Study Council modal — five independent voices on one passage, each
// paragraph typed by source and (for interpretation) confidence. Full-screen
// on phone, centered card on desktop, matching PrayerPathPlayer's pattern.

const TAG_COLOR: Record<SourceTag, string> = {
  SCRIPTURE: 'var(--accent-primary)',
  TEXT: 'var(--text-muted)',
  LANGUAGE: 'var(--accent-purple)',
  HISTORY: 'var(--accent-amber)',
  INTERPRETATION: 'var(--accent-blue)',
  APPLICATION: 'var(--accent-sky)',
};

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  settled: 'Settled',
  'broadly held': 'Broadly held',
  disputed: 'Disputed',
  minority: 'Minority view',
  speculative: 'Speculative',
};

const SEAT_TAGLINE: Record<string, string> = {
  exegete: 'What the text says, in its own argument',
  historian: 'What it meant to its first hearers',
  canonist: 'How the whole Bible reads it',
  churchman: 'How the church has read it for 20 centuries',
  berean: 'Testing the other four against the text',
};

export default function StudyCouncil({ passage, passageText, onClose }: { passage: string; passageText?: string; onClose: () => void }) {
  const { isPhone } = useResponsiveLayout();
  const { chronicleEntries, addChronicleEntry } = useAppStore();
  const { addToast } = useToastStore();
  const [question, setQuestion] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'done'>('idle');
  const [seats, setSeats] = useState<CouncilSeat[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [askedQuestion, setAskedQuestion] = useState('');
  const [saved, setSaved] = useState(false);

  const pastConvenings = useMemo(
    () => chronicleEntries
      .filter((entry) => entry.type === 'study' && entry.passage === passage && entry.sourceContext?.studyCouncil)
      .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [chronicleEntries, passage],
  );

  const convene = async () => {
    setStatus('loading');
    setErrorMessage('');
    try {
      const trimmedQuestion = question.trim();
      const result = await fetchStudyCouncil({ passage, passageText, question: trimmedQuestion || undefined });
      setSeats(result);
      setAskedQuestion(trimmedQuestion);
      setSaved(false);
      setStatus('done');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The Council could not convene right now.');
      setStatus('error');
    }
  };

  const loadPastConvening = (entry: typeof chronicleEntries[number]) => {
    const council = entry.sourceContext?.studyCouncil;
    if (!council) return;
    setSeats(council.seats.map((seat) => ({
      id: seat.id,
      name: seat.name,
      paragraphs: seat.paragraphs.map((paragraph) => ({
        tag: paragraph.tag as SourceTag | null,
        confidence: paragraph.confidence as Confidence | null,
        text: paragraph.text,
      })),
    })));
    setAskedQuestion(council.question || '');
    setSaved(true);
    setStatus('done');
  };

  const saveToThread = () => {
    const summary = seats
      .map((seat) => `${seat.name}\n${seat.paragraphs.map((p) => `[${p.tag || 'UNTYPED'}${p.confidence ? ` · ${p.confidence}` : ''}] ${p.text}`).join('\n')}`)
      .join('\n\n');
    addChronicleEntry({
      id: Math.random().toString(36).slice(2),
      date: new Date().toISOString().split('T')[0],
      type: 'study',
      title: `Study Council — ${passage}`,
      body: askedQuestion ? `Question: ${askedQuestion}\n\n${summary}` : summary,
      passage,
      autoCapture: false,
      sourceContext: {
        page: 'bible',
        passage,
        studyCouncil: { question: askedQuestion || undefined, seats },
      },
    });
    setSaved(true);
    addToast('Study Council session saved to the Thread', 'success', '⚖');
  };

  return (
    <div
      style={isPhone ? {
        position: 'fixed', inset: 0, background: 'var(--card-bg)', zIndex: 50,
        display: 'flex', alignItems: 'stretch', justifyContent: 'stretch',
      } : {
        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        padding: '20px',
        paddingTop: 'max(20px, env(safe-area-inset-top))',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(20px, env(safe-area-inset-left))',
        paddingRight: 'max(20px, env(safe-area-inset-right))',
      }}
    >
      <div
        style={isPhone ? {
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          background: 'var(--card-bg)', overflow: 'hidden',
        } : {
          width: 'min(820px, 94vw)', height: 'min(880px, 92dvh, 92vh)', display: 'flex', flexDirection: 'column',
          background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 18,
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.28)', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px 12px',
          paddingTop: isPhone ? 'max(16px, env(safe-area-inset-top))' : 16,
          borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                The Study Council
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{passage}</div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)', padding: 4, lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {status === 'idle' || status === 'error' ? (
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.6, marginBottom: 14 }}>
                Five independent readings of this passage — the Exegete, the Historian, the Canonist, the Churchman, and the Berean, who tests the other four. Every claim is labeled by kind and, where it's an interpretation, by how settled it is. Disagreement is preserved, not resolved.
              </p>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Optional — ask the Council something specific about this passage..."
                style={{
                  width: '100%', minHeight: 70, padding: '10px 12px', borderRadius: 10,
                  border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)',
                  fontSize: 16, fontFamily: 'var(--font-serif)', lineHeight: 1.6, resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                }}
              />
              {status === 'error' ? (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--accent-amber)' }}>{errorMessage}</div>
              ) : null}
              <button
                onClick={() => void convene()}
                style={{ marginTop: 14, padding: '10px 18px', borderRadius: 10, border: 'none', background: 'var(--accent-primary)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Convene the Council
              </button>

              {pastConvenings.length > 0 ? (
                <div style={{ marginTop: 26 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
                    Past Convenings on {passage}
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {pastConvenings.map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => loadPastConvening(entry)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-inner)', cursor: 'pointer', textAlign: 'left' }}
                      >
                        <span style={{ fontSize: 12, color: 'var(--text)' }}>
                          {entry.sourceContext?.studyCouncil?.question || 'General reading of the passage'}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{entry.date}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : status === 'loading' ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              The Council is convening — the Berean speaks last, after seeing what the other four say...
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {seats.map((seat) => (
                <section key={seat.id} style={{ background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{seat.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{SEAT_TAGLINE[seat.id]}</div>
                  </div>
                  <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                    {seat.paragraphs.map((paragraph, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                            color: paragraph.tag ? TAG_COLOR[paragraph.tag] : 'var(--text-muted)',
                          }}>
                            {paragraph.tag || 'UNTYPED'}
                          </span>
                          {paragraph.confidence ? (
                            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', padding: '1px 6px', borderRadius: 999, border: '1px solid var(--border)' }}>
                              {CONFIDENCE_LABEL[paragraph.confidence]}
                            </span>
                          ) : null}
                        </div>
                        <p style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.65, margin: 0 }}>{paragraph.text}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {status === 'done' ? (
          <div style={{
            display: 'flex', gap: 8, padding: '14px 20px',
            paddingBottom: isPhone ? 'max(14px, env(safe-area-inset-bottom))' : 14,
            borderTop: '1px solid var(--border)', flexShrink: 0,
          }}>
            <button
              onClick={() => setStatus('idle')}
              style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              ← Ask again
            </button>
            <div style={{ flex: 1 }} />
            <button
              onClick={saveToThread}
              disabled={saved}
              style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border)', background: saved ? 'var(--accent-primary-light)' : 'var(--card-inner)', color: saved ? 'var(--accent-primary)' : 'var(--text)', fontSize: 12, fontWeight: 700, cursor: saved ? 'default' : 'pointer' }}
            >
              {saved ? '✓ Saved to the Thread' : 'Save to the Thread'}
            </button>
            <button
              onClick={onClose}
              style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--accent-primary)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              Back to the text
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
