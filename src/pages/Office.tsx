import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { useToastStore } from '../store/toastStore';
import { getStudyDay } from '../lib/studyModules';
import { getBibleNavigationTarget, loadPassagePreview } from '../lib/scriptureReference';
import { useResponsiveLayout } from '../lib/useResponsiveLayout';

// The Daily Office — Chronicle's home screen. One composed liturgy for the
// day with an ancient shape: Call → Word → Silence → Prayer → Response.
// It is deliberately finite: it scrolls once, it ends, and "the Office is
// complete" is a designed moment. The opposite of a feed.

const CALLS: { text: string; ref: string }[] = [
  { text: 'This is the day the Lord has made; we will rejoice and be glad in it.', ref: 'Psalm 118:24' },
  { text: 'O God, You are my God; early will I seek You; my soul thirsts for You.', ref: 'Psalm 63:1' },
  { text: 'Enter into His gates with thanksgiving, and into His courts with praise.', ref: 'Psalm 100:4' },
  { text: 'My voice You shall hear in the morning, O Lord; in the morning I will direct it to You.', ref: 'Psalm 5:3' },
  { text: 'Be still, and know that I am God.', ref: 'Psalm 46:10' },
  { text: 'Oh, taste and see that the Lord is good; blessed is the man who trusts in Him!', ref: 'Psalm 34:8' },
  { text: 'Cause me to hear Your lovingkindness in the morning, for in You do I trust.', ref: 'Psalm 143:8' },
];

const SILENCE_SECONDS = 60;
const OFFICE_STORAGE_KEY = 'chronicle.office.lastCompleted';

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

function StationLabel({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <span style={{
        width: 22, height: 22, borderRadius: 999, background: 'var(--accent-green-light)',
        color: 'var(--accent-green)', fontSize: 11, fontWeight: 700,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>{n}</span>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        {children}
      </span>
    </div>
  );
}

export default function Office() {
  const navigate = useNavigate();
  const { isPhone } = useResponsiveLayout();
  const { studyModuleDayById, prayerItems, recordPrayerTouch, addChronicleEntry, setBibleView } = useAppStore();
  const { addToast } = useToastStore();

  const [preview, setPreview] = useState<Awaited<ReturnType<typeof loadPassagePreview>> | null>(null);
  const [silenceLeft, setSilenceLeft] = useState<number | null>(null);
  const [silenceDone, setSilenceDone] = useState(false);
  const [response, setResponse] = useState('');
  const [completedToday, setCompletedToday] = useState(() => {
    try { return localStorage.getItem(OFFICE_STORAGE_KEY) === todayKey(); } catch { return false; }
  });
  const [prayedIds, setPrayedIds] = useState<Set<string>>(new Set());
  const silenceTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const call = CALLS[new Date().getDay()];
  const activeStudyDay = getStudyDay('bible-study', studyModuleDayById['bible-study'] || 1);

  useEffect(() => {
    let cancelled = false;
    loadPassagePreview(activeStudyDay.scripture).then((result) => {
      if (!cancelled) setPreview(result);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [activeStudyDay.scripture]);

  useEffect(() => () => { if (silenceTimer.current) clearInterval(silenceTimer.current); }, []);

  const [nowTime] = useState(() => Date.now());
  const prayerTouches = useMemo(() =>
    prayerItems
      .filter((item) => !item.answered)
      .map((item) => {
        const anchor = item.nextFollowUpAt || item.lastPrayedAt || item.dateAdded;
        const daysSince = Math.max(0, Math.round((nowTime - new Date(`${anchor}T12:00:00`).getTime()) / 86400000));
        const due = item.nextFollowUpAt
          ? new Date(`${item.nextFollowUpAt}T12:00:00`).getTime() <= nowTime
          : daysSince >= 7;
        return { ...item, due, daysSince };
      })
      .sort((a, b) => (a.due !== b.due ? (a.due ? -1 : 1) : (b.timesPrayed || 0) - (a.timesPrayed || 0)))
      .slice(0, 3),
    [nowTime, prayerItems],
  );

  const startSilence = () => {
    setSilenceLeft(SILENCE_SECONDS);
    silenceTimer.current = setInterval(() => {
      setSilenceLeft((left) => {
        if (left === null) return null;
        if (left <= 1) {
          if (silenceTimer.current) clearInterval(silenceTimer.current);
          setSilenceDone(true);
          return null;
        }
        return left - 1;
      });
    }, 1000);
  };

  const handlePrayed = (id: string) => {
    const touchDate = new Date().toISOString().split('T')[0];
    const next = new Date();
    next.setDate(next.getDate() + 3);
    recordPrayerTouch(id, { lastPrayedAt: touchDate, nextFollowUpAt: next.toISOString().split('T')[0] });
    setPrayedIds((prev) => new Set(prev).add(id));
  };

  const sealOffice = () => {
    if (response.trim()) {
      addChronicleEntry({
        id: Math.random().toString(36).slice(2),
        date: todayKey(),
        type: 'reflection',
        title: `Daily Office — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
        body: response.trim(),
        passage: preview?.reference || activeStudyDay.scripture,
        autoCapture: true,
        sourceContext: { page: 'today', passage: activeStudyDay.scripture },
      });
    }
    try { localStorage.setItem(OFFICE_STORAGE_KEY, todayKey()); } catch { /* localStorage unavailable */ }
    setCompletedToday(true);
    addToast('The Office is complete', 'success', '✚');
  };

  const openInBible = () => {
    const target = getBibleNavigationTarget(activeStudyDay.scripture);
    if (target) {
      setBibleView({ book: target.book, chapter: target.chapter, overlayOn: false, showThemePanel: false });
    }
    navigate('/bible');
  };

  const card: React.CSSProperties = {
    background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 14,
    padding: isPhone ? '18px 16px' : '22px 24px', boxShadow: 'var(--shadow)',
  };

  if (completedToday) {
    return (
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ maxWidth: 620, margin: '0 auto', padding: isPhone ? '48px 18px' : '72px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 34, color: 'var(--accent-green)', marginBottom: 14 }}>✚</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
            The Office is complete.
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-sub)', lineHeight: 1.7, maxWidth: 440, margin: '0 auto 28px' }}>
            You have kept the day&rsquo;s appointment. There is nothing else this screen wants from you — go in peace, or go deeper.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/bible')} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Open the Word</button>
            <button onClick={() => navigate('/prayer')} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>The Prayer Room</button>
            <button onClick={() => navigate('/thread')} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>The Thread</button>
          </div>
          <button
            onClick={() => { try { localStorage.removeItem(OFFICE_STORAGE_KEY); } catch { /* noop */ } setCompletedToday(false); }}
            style={{ marginTop: 30, padding: '6px 10px', border: 'none', background: 'none', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}
          >
            Pray the Office again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: isPhone ? '22px 16px 48px' : '36px 24px 64px', display: 'grid', gap: 16 }}>

        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-green)' }}>The Daily Office</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* 1 · Call */}
        <section style={card}>
          <StationLabel n={1}>Call to Worship</StationLabel>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: isPhone ? 17 : 18, fontStyle: 'italic', color: 'var(--text)', lineHeight: 1.75, margin: 0 }}>
            "{call.text}"
          </p>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-green)', marginTop: 10 }}>{call.ref}</div>
        </section>

        {/* 2 · Word */}
        <section style={card}>
          <StationLabel n={2}>The Word</StationLabel>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
            {preview?.reference || activeStudyDay.scripture}
            <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> · Day {activeStudyDay.day}</span>
          </div>
          {preview && preview.verses.length > 0 ? (
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: isPhone ? 16 : 17, color: 'var(--text)', lineHeight: 1.85 }}>
              {preview.verses.map((verse) => (
                <span key={verse.number}>
                  <sup style={{ fontSize: 10, color: 'var(--text-muted)', marginRight: 3 }}>{verse.number}</sup>
                  {verse.text}{' '}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading the passage…</div>
          )}
          <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={openInBible} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Read the full passage →
            </button>
          </div>
        </section>

        {/* 3 · Silence */}
        <section style={card}>
          <StationLabel n={3}>Silence</StationLabel>
          {silenceDone ? (
            <p style={{ fontSize: 14, color: 'var(--text-sub)', margin: 0 }}>The silence is kept. <em>"Be still, and know that I am God."</em></p>
          ) : silenceLeft !== null ? (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 44, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                {silenceLeft}
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'var(--card-inner)', overflow: 'hidden', maxWidth: 260, margin: '12px auto 0' }}>
                <div style={{ width: `${((SILENCE_SECONDS - silenceLeft) / SILENCE_SECONDS) * 100}%`, height: '100%', background: 'var(--accent-green)', transition: 'width 1s linear' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>Sit with what you just read.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <p style={{ fontSize: 14, color: 'var(--text-sub)', margin: 0, flex: 1, minWidth: 200 }}>
                One minute of stillness before you speak. No screen will interrupt it.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={startSilence} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent-green)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Begin
                </button>
                <button onClick={() => setSilenceDone(true)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>
                  Skip
                </button>
              </div>
            </div>
          )}
        </section>

        {/* 4 · Prayer */}
        <section style={card}>
          <StationLabel n={4}>Prayer</StationLabel>
          {prayerTouches.length > 0 ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {prayerTouches.map((item) => {
                const prayed = prayedIds.has(item.id);
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.text}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {item.due ? 'Follow-up due' : `Last carried ${item.daysSince} day${item.daysSince === 1 ? '' : 's'} ago`}
                      </div>
                    </div>
                    <button
                      onClick={() => handlePrayed(item.id)}
                      disabled={prayed}
                      style={{ padding: '7px 12px', borderRadius: 8, border: prayed ? 'none' : '1px solid var(--border)', background: prayed ? 'var(--accent-green-light)' : 'transparent', color: prayed ? 'var(--accent-green)' : 'var(--text-sub)', fontSize: 11, fontWeight: 700, cursor: prayed ? 'default' : 'pointer', flexShrink: 0 }}
                    >
                      {prayed ? '✓ Carried' : 'I prayed'}
                    </button>
                  </div>
                );
              })}
              <button onClick={() => navigate('/prayer')} style={{ justifySelf: 'start', padding: '6px 0', border: 'none', background: 'none', color: 'var(--accent-green)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Open the Prayer Room →
              </button>
            </div>
          ) : (
            <p style={{ fontSize: 14, color: 'var(--text-sub)', margin: 0 }}>
              No requests are waiting today. <button onClick={() => navigate('/prayer')} style={{ border: 'none', background: 'none', color: 'var(--accent-green)', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0 }}>Bring something before God →</button>
            </p>
          )}
        </section>

        {/* 5 · Response */}
        <section style={card}>
          <StationLabel n={5}>Response</StationLabel>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="One honest line back to God — what He said, what you're carrying, what you're leaving with Him. It is written to the Thread."
            style={{
              width: '100%', minHeight: 90, padding: '10px 12px', borderRadius: 10,
              border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)',
              fontSize: 16, fontFamily: 'var(--font-serif)', lineHeight: 1.65, resize: 'vertical', outline: 'none', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button
              onClick={sealOffice}
              style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: 'var(--accent-green)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              {response.trim() ? 'Seal the Office ✚' : 'Complete the Office ✚'}
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
