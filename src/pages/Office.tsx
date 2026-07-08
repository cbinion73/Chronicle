import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { useToastStore } from '../store/toastStore';
import { getStudyDay } from '../lib/studyModules';
import { getBibleNavigationTarget, loadPassagePreview } from '../lib/scriptureReference';
import { useResponsiveLayout } from '../lib/useResponsiveLayout';
import { dueVerses } from '../lib/memoryEngine';
import { currentRegister } from '../lib/hours';
import { CALLS } from '../data/callsToWorship';
import { deriveOnThisDay, formatAnniversary, isFeastDay } from '../lib/remembrance';
import type { ChronicleEntry, PrayerItem } from '../types';
import chapelStyles from '../styles/chapelRegister.module.css';
import SectionTabs from '../components/ui/SectionTabs';
import { OFFICE_TABS } from '../lib/sectionTabs';

// The Daily Office — Chronicle's home screen. One composed liturgy for the
// day with an ancient shape: Call → Word → Silence → Prayer → Response.
// It is deliberately finite: it scrolls once, it ends, and "the Office is
// complete" is a designed moment. The opposite of a feed.
//
// The Office keeps the Hours (VISION.md): morning and midday pray the full
// Office; evening becomes the Examen — a review of the day the Thread
// actually recorded. And re-entry after a long absence is met with grace,
// not a counter: the Office opens with what you were carrying, never with
// what you missed.

const SILENCE_SECONDS = 60;
const OFFICE_STORAGE_KEY = 'chronicle.office.lastCompleted';
const EXAMEN_STORAGE_KEY = 'chronicle.office.examenCompleted';
const LAST_VISIT_KEY = 'chronicle.office.lastVisit';
const RETURN_GRACE_DAYS = 7;

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

// Re-entry as grace: if the keeper has been away a while, greet them with
// what they were carrying — never with a count of what was missed. The
// read and the write are kept in separate passes (a lazy useState
// initializer that also writes is impure and gets corrupted by React
// StrictMode's intentional double-invoke in development).
function useWelcomeBack(): boolean {
  const [welcomeBack] = useState(() => {
    try {
      const previous = localStorage.getItem(LAST_VISIT_KEY);
      if (!previous) return false;
      const days = Math.round(
        (new Date(`${todayKey()}T12:00:00`).getTime() - new Date(`${previous}T12:00:00`).getTime()) / 86400000,
      );
      return days >= RETURN_GRACE_DAYS;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(LAST_VISIT_KEY, todayKey()); } catch { /* localStorage unavailable */ }
  }, []);
  return welcomeBack;
}

function WelcomeBackCard({ prayerItems, lastEntry }: {
  prayerItems: PrayerItem[];
  lastEntry: ChronicleEntry | undefined;
}) {
  const carried = prayerItems.filter((item) => !item.answered).slice(0, 3);
  return (
    <section style={{ margin: '0 auto', maxWidth: 480, textAlign: 'center' }}>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 300, color: 'var(--text)', margin: '0 0 10px' }}>
        Welcome back.
      </h2>
      <p style={{ fontSize: 15, fontWeight: 300, color: 'var(--text-sub)', lineHeight: 1.75, margin: 0 }}>
        The thread held your place. Nothing was lost.
      </p>
      {carried.length > 0 ? (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontVariant: 'small-caps', letterSpacing: '0.28em', fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
            You were carrying
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {carried.map((item) => (
              <div key={item.id} style={{ fontSize: 15, fontWeight: 300, color: 'var(--text)', fontFamily: 'var(--font-serif)' }}>
                {item.text}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {lastEntry ? (
        <p style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--text-muted)', margin: '18px 0 0' }}>
          The last thing you wrote: "{lastEntry.title}"
        </p>
      ) : null}
    </section>
  );
}

// The Remembrance glow — the one place a candle actually burns on this
// page (DESIGN.md's Chapel rule: "gold never decorates"). Built to the
// exact spec in .working/direction-chapel.html's .remembrance block:
// a soft radial-gradient wash plus a three-layer box-shadow glow, not a
// solid card. Left un-abstracted into the shared `card` shape on
// purpose — this is the one deliberate exception to it.
function RemembranceCard({ memories }: {
  memories: ReturnType<typeof deriveOnThisDay>;
}) {
  return (
    <section
      style={{
        margin: '0 auto', maxWidth: 480, padding: '36px 32px', textAlign: 'center',
        border: '1px solid rgba(232,180,79,0.45)', borderRadius: 3,
        background: 'radial-gradient(ellipse at 50% 0%, rgba(232,180,79,0.13) 0%, rgba(232,180,79,0.03) 60%, transparent 100%)',
        boxShadow: '0 0 40px rgba(232,180,79,0.18), 0 0 90px rgba(232,180,79,0.10), inset 0 0 30px rgba(232,180,79,0.06)',
      }}
    >
      <div style={{ fontSize: 18, color: '#f5d489', textShadow: '0 0 14px rgba(245,212,137,0.9), 0 0 34px rgba(232,180,79,0.6)', marginBottom: 14 }}>✦</div>
      <h2 style={{ fontVariant: 'small-caps', letterSpacing: '0.3em', fontSize: 12, fontWeight: 400, margin: '0 0 16px', color: 'var(--accent-primary)' }}>
        Remembrance
      </h2>
      <div style={{ display: 'grid', gap: 20 }}>
        {memories.map((memory) => (
          <div key={memory.id}>
            <div style={{ fontVariant: 'small-caps', letterSpacing: '0.2em', fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
              {isFeastDay(memory) ? 'Feast Day · ' : ''}{formatAnniversary(memory.yearsAgo)}
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 300, color: 'var(--text)', lineHeight: 1.6 }}>
              {memory.title}
            </div>
            {memory.body ? (
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 300, fontStyle: 'italic', color: '#f5d489', textShadow: '0 0 22px rgba(232,180,79,0.35)', lineHeight: 1.7, margin: '10px 0 0' }}>
                "{memory.body}"
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

// Station labels — a whisper-level ordinal above a large, light heading,
// matching direction-chapel.html's .station .ordinal / h2 pair. Weight
// 300, not 700: the mockup's whole voice is quiet, wide-spaced serif,
// never bold outside the one gold accent.
function StationLabel({ n, total, children }: { n: number; total: number; children: React.ReactNode }) {
  const ORDINALS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six'];
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontVariant: 'small-caps', letterSpacing: '0.32em', fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
        Station {ORDINALS[n - 1] || n} of {ORDINALS[total - 1] || total}
      </div>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 300, letterSpacing: '0.02em', color: 'var(--text)', margin: 0 }}>
        {children}
      </h2>
    </div>
  );
}

export default function Office() {
  const navigate = useNavigate();
  const { isPhone } = useResponsiveLayout();
  const { studyModuleDayById, prayerItems, chronicleEntries, memoryVerses, recordPrayerTouch, addChronicleEntry, setBibleView } = useAppStore();
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

  // The Hours: which liturgy does this hour ask for?
  const [register] = useState(() => currentRegister());
  const [fullOffice, setFullOffice] = useState(false);
  const [examenDone, setExamenDone] = useState(() => {
    try { return localStorage.getItem(EXAMEN_STORAGE_KEY) === todayKey(); } catch { return false; }
  });
  const welcomeBack = useWelcomeBack();
  const lastEntry = chronicleEntries.length > 0 ? chronicleEntries[0] : undefined;
  const remembrances = useMemo(() => deriveOnThisDay(chronicleEntries, prayerItems), [chronicleEntries, prayerItems]);

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
  const dueVerseCount = useMemo(() => dueVerses(memoryVerses, todayKey()).length, [memoryVerses]);
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

  const sealExamen = () => {
    if (response.trim()) {
      addChronicleEntry({
        id: Math.random().toString(36).slice(2),
        date: todayKey(),
        type: 'reflection',
        title: `Evening Examen — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
        body: response.trim(),
        autoCapture: true,
        sourceContext: { page: 'today' },
      });
    }
    try { localStorage.setItem(EXAMEN_STORAGE_KEY, todayKey()); } catch { /* localStorage unavailable */ }
    setExamenDone(true);
    addToast('The day is sealed', 'success', '✚');
  };

  const openInBible = () => {
    const target = getBibleNavigationTarget(activeStudyDay.scripture);
    if (target) {
      setBibleView({ book: target.book, chapter: target.chapter, overlayOn: false, showThemePanel: false });
    }
    navigate('/bible');
  };

  // A "station" on this page is never a card in the Chapel register —
  // direction-chapel.html's whole voice is boxless: a centered column,
  // generous whitespace, and a single hairline rule between stations.
  // No border, no background, no shadow — those all belonged to the
  // pre-Chapel card-list layout this register replaces.
  const card: React.CSSProperties = {
    margin: '0 auto', maxWidth: 480, textAlign: 'center',
    paddingBottom: isPhone ? 40 : 56,
    borderBottom: '1px solid var(--border)',
  };
  const lastStation: React.CSSProperties = { ...card, borderBottom: 'none', paddingBottom: 0 };

  // ── The Evening Examen ────────────────────────────────────────────────
  if (register === 'evening' && !fullOffice) {
    const today = todayKey();
    const todaysEntries = chronicleEntries.filter((entry) => entry.date === today);
    const todaysPrayers = prayerItems.filter(
      (item) => item.lastPrayedAt === today || item.dateAnswered === today,
    );

    if (examenDone) {
      return (
        <div className={chapelStyles.chapelRegister} style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <SectionTabs tabs={OFFICE_TABS} />
          <div style={{ maxWidth: 620, margin: '0 auto', padding: isPhone ? '48px 18px' : '72px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 34, color: 'var(--accent-primary)', marginBottom: 14 }}>✚</div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
              The day is sealed.
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-sub)', lineHeight: 1.7, maxWidth: 440, margin: '0 auto 28px' }}>
              It has been reviewed before God and given back to Him. Rest now — tomorrow's Office will be waiting in the morning.
            </p>
            <button onClick={() => navigate('/thread')} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              The Thread
            </button>
            <div>
              <button
                onClick={() => { try { localStorage.removeItem(EXAMEN_STORAGE_KEY); } catch { /* noop */ } setExamenDone(false); }}
                style={{ marginTop: 30, padding: '6px 10px', border: 'none', background: 'none', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Pray the Examen again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={chapelStyles.chapelRegister} style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <SectionTabs tabs={OFFICE_TABS} />
        <div style={{ maxWidth: 640, margin: '0 auto', padding: isPhone ? '22px 16px 48px' : '36px 24px 64px', display: 'grid', gap: 16 }}>

          <div style={{ textAlign: 'center', marginBottom: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-primary)' }}>The Evening Examen</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · the day is ending — review it before God
            </div>
          </div>

          {welcomeBack && <WelcomeBackCard prayerItems={prayerItems} lastEntry={lastEntry} />}
          {remembrances.length > 0 && <RemembranceCard memories={remembrances} />}

          {/* 1 · Review */}
          <section style={card}>
            <StationLabel n={1} total={3}>The Day's Thread</StationLabel>
            {todaysEntries.length > 0 ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {todaysEntries.map((entry) => (
                  <div key={entry.id} style={{ background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{entry.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, textTransform: 'capitalize' }}>{entry.type}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 14, color: 'var(--text-sub)', margin: 0, fontStyle: 'italic' }}>
                The day left no written trace — that is not a failure. Some days are lived, not written. Review it in memory instead.
              </p>
            )}
            {todaysPrayers.length > 0 ? (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Carried in prayer today
                </div>
                {todaysPrayers.map((item) => (
                  <div key={item.id} style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-serif)', marginBottom: 3 }}>
                    · {item.text}{item.dateAnswered === today ? ' — answered' : ''}
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          {/* 2 · Silence */}
          <section style={card}>
            <StationLabel n={2} total={3}>Silence</StationLabel>
            {silenceDone ? (
              <p style={{ fontSize: 14, color: 'var(--text-sub)', margin: 0 }}>The silence is kept. <em>"In peace I will lie down and sleep."</em></p>
            ) : silenceLeft !== null ? (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 44, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                  {silenceLeft}
                </div>
                <div style={{ height: 4, borderRadius: 2, background: 'var(--card-inner)', overflow: 'hidden', maxWidth: 260, margin: '12px auto 0' }}>
                  <div style={{ width: `${((SILENCE_SECONDS - silenceLeft) / SILENCE_SECONDS) * 100}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 1s linear' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>Sit with the day before you speak about it.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <p style={{ fontSize: 14, color: 'var(--text-sub)', margin: 0, flex: 1, minWidth: 200 }}>
                  One minute of stillness at the day's end.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={startSilence} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent-primary)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Begin
                  </button>
                  <button onClick={() => setSilenceDone(true)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>
                    Skip
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* 3 · Response */}
          <section style={lastStation}>
            <StationLabel n={3} total={3}>Give the Day Back</StationLabel>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Where was God in this day? What are you grateful for; what do you leave with Him before sleep? It is written to the Thread."
              style={{
                width: '100%', minHeight: 90, padding: '10px 12px', borderRadius: 10,
                border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)',
                fontSize: 16, fontFamily: 'var(--font-serif)', lineHeight: 1.65, resize: 'vertical', outline: 'none', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => setFullOffice(true)}
                style={{ padding: 0, border: 'none', background: 'none', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Pray the full Office instead
              </button>
              <button
                onClick={sealExamen}
                style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: 'var(--accent-primary)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                {response.trim() ? 'Seal the Day ✚' : 'Complete the Examen ✚'}
              </button>
            </div>
          </section>

        </div>
      </div>
    );
  }

  if (completedToday) {
    return (
      <div className={chapelStyles.chapelRegister} style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <SectionTabs tabs={OFFICE_TABS} />
        <div style={{ maxWidth: 620, margin: '0 auto', padding: isPhone ? '48px 18px' : '72px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 34, color: 'var(--accent-primary)', marginBottom: 14 }}>✚</div>
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
    <div className={chapelStyles.chapelRegister} style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
      <SectionTabs tabs={OFFICE_TABS} />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: isPhone ? '48px 16px 48px' : '80px 24px 64px', display: 'grid', gap: isPhone ? 40 : 56 }}>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontVariant: 'small-caps', letterSpacing: '0.34em', fontSize: 13, color: 'var(--text-sub)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} — The Daily Office
          </div>
        </div>

        {/* The call to worship is ambient, not a numbered station — it
            sits above the stations the way direction-chapel.html's
            .call does, unlabeled, before "Station One" begins. */}
        <section style={card}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: isPhone ? 26 : 32, fontWeight: 300, color: 'var(--text)', lineHeight: 1.8, margin: 0 }}>
            {call.text}
          </p>
          <div style={{ fontVariant: 'small-caps', letterSpacing: '0.24em', fontSize: 13, color: 'var(--text-muted)', marginTop: 18 }}>{call.ref}</div>
        </section>

        {welcomeBack && <WelcomeBackCard prayerItems={prayerItems} lastEntry={lastEntry} />}
        {remembrances.length > 0 && <RemembranceCard memories={remembrances} />}

        {/* 1 · Word */}
        <section style={card}>
          <StationLabel n={1} total={4}>The Word</StationLabel>
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
          {dueVerseCount > 0 ? (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>
                🧠 {dueVerseCount} memorized verse{dueVerseCount === 1 ? '' : 's'} waiting to be remembered before it fades.
              </span>
              <button onClick={() => navigate('/memory')} style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--accent-primary)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                Review now →
              </button>
            </div>
          ) : null}
        </section>

        {/* 3 · Silence */}
        <section style={card}>
          <StationLabel n={2} total={4}>Silence</StationLabel>
          {silenceDone ? (
            <p style={{ fontSize: 14, color: 'var(--text-sub)', margin: 0 }}>The silence is kept. <em>"Be still, and know that I am God."</em></p>
          ) : silenceLeft !== null ? (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 44, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                {silenceLeft}
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'var(--card-inner)', overflow: 'hidden', maxWidth: 260, margin: '12px auto 0' }}>
                <div style={{ width: `${((SILENCE_SECONDS - silenceLeft) / SILENCE_SECONDS) * 100}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 1s linear' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>Sit with what you just read.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <p style={{ fontSize: 14, color: 'var(--text-sub)', margin: 0, flex: 1, minWidth: 200 }}>
                One minute of stillness before you speak. No screen will interrupt it.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={startSilence} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent-primary)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Begin
                </button>
                <button onClick={() => setSilenceDone(true)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>
                  Skip
                </button>
              </div>
            </div>
          )}
          <button
            onClick={() => navigate('/chapel')}
            style={{ marginTop: 12, padding: 0, border: 'none', background: 'none', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}
          >
            Or enter chapel — one verse, no chrome
          </button>
        </section>

        {/* 4 · Prayer */}
        <section style={card}>
          <StationLabel n={3} total={4}>Prayer</StationLabel>
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
                      style={{ padding: '7px 12px', borderRadius: 8, border: prayed ? 'none' : '1px solid var(--border)', background: prayed ? 'var(--accent-primary-light)' : 'transparent', color: prayed ? 'var(--accent-primary)' : 'var(--text-sub)', fontSize: 11, fontWeight: 700, cursor: prayed ? 'default' : 'pointer', flexShrink: 0 }}
                    >
                      {prayed ? '✓ Carried' : 'I prayed'}
                    </button>
                  </div>
                );
              })}
              <button onClick={() => navigate('/prayer')} style={{ justifySelf: 'start', padding: '6px 0', border: 'none', background: 'none', color: 'var(--accent-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Open the Prayer Room →
              </button>
            </div>
          ) : (
            <p style={{ fontSize: 14, color: 'var(--text-sub)', margin: 0 }}>
              No requests are waiting today. <button onClick={() => navigate('/prayer')} style={{ border: 'none', background: 'none', color: 'var(--accent-primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0 }}>Bring something before God →</button>
            </p>
          )}
        </section>

        {/* 5 · Response */}
        <section style={lastStation}>
          <StationLabel n={4} total={4}>Response</StationLabel>
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
              style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: 'var(--accent-primary)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              {response.trim() ? 'Seal the Office ✚' : 'Complete the Office ✚'}
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
