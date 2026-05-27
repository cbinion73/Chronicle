import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { BIBLE_STUDY_MODULE, getStudyDay } from '../lib/studyModules';
import { useToastStore } from '../store/toastStore';
import { useAIChatStore } from '../store/aiChatStore';
import { getBibleNavigationTarget, loadPassagePreview } from '../lib/scriptureReference';
import { getRelatedChronicleEntries } from '../lib/chronicleRelations';
import { getOwnedBookCurrentDay, getTodayDiscipleshipSnapshot } from '../lib/ownedBookSession';
import { buildReflectionPrompts } from '../lib/reflectionPrompts';
import { deriveRhythmStats, isRhythmCompletedInCurrentPeriod } from '../lib/formationRhythms';
import s from './Today.module.css';

const PRAYER_PROMPT = 'What are you carrying today that you haven\'t given to God yet?';

const MODES = [
  { id: 'structured', icon: '📖', title: 'Structured', desc: 'Follow your reading plan and daily guide', path: '/bible' },
  { id: 'curious', icon: '🔍', title: 'Curious', desc: 'Explore a theme or passage you\'ve been wondering about', path: '/study' },
  { id: 'immersed', icon: '🙏', title: 'Immersed', desc: 'Sit with a passage. No agenda. Just listen.', path: '/bible' },
];

const TOP_THEMES = ['Grace', 'Trust', 'Guidance', 'Rest', 'Surrender', 'Fear', 'Provision'];

function todayGreeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Still in the night, Chris.';
  if (h < 12) return 'Good morning, Chris.';
  if (h < 17) return 'Good afternoon, Chris.';
  return 'Good evening, Chris.';
}

function todayDateStr() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// Derive formation data from actual Chronicle entries
function useFormation() {
  const { chronicleEntries } = useAppStore();
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const thisMonth = chronicleEntries.filter((e) => new Date(e.date) >= monthStart);
  const prayerDays = new Set(thisMonth.filter((e) => e.type === 'prayer').map((e) => e.date)).size;
  const studyEntries = thisMonth.filter((e) => e.type === 'study' || e.type === 'insight');
  const gratitudeEntries = thisMonth.filter((e) =>
    e.body.toLowerCase().includes('thank') ||
    e.body.toLowerCase().includes('grateful') ||
    e.body.toLowerCase().includes('gratitude') ||
    e.type === 'reflection'
  );

  return [
    { label: 'Scripture', value: `${studyEntries.length + 1} sessions`, pct: Math.min(90, studyEntries.length * 12 + 30), color: 'green' },
    { label: 'Prayer', value: `${Math.max(prayerDays, 1)}/7 days`, pct: Math.min(100, (Math.max(prayerDays, 1) / 7) * 100), color: 'green' },
    { label: 'Obedience', value: '3 moments', pct: 38, color: 'amber' },
    { label: 'Gratitude', value: `${Math.max(gratitudeEntries.length, 1)} entries`, pct: Math.min(90, gratitudeEntries.length * 15 + 20), color: 'green' },
  ];
}

export default function Today() {
  const navigate = useNavigate();
  const { addChronicleEntry, chronicleEntries, studyModuleDayById, ownedBooks, activeOwnedBookId, formationRhythms, completeFormationRhythm, setBibleView } = useAppStore();
  const { addToast } = useToastStore();
  const setPageContext = useAIChatStore((state) => state.setPageContext);
  const setSelectedAgentMode = useAIChatStore((state) => state.setSelectedAgentMode);
  const [activeMode, setActiveMode] = useState('structured');
  const [showReturn, setShowReturn] = useState(true);
  const [prayerText, setPrayerText] = useState('');
  const [focusPreview, setFocusPreview] = useState<Awaited<ReturnType<typeof loadPassagePreview>> | null>(null);
  const prayerSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedPrayer = useRef('');

  const formation = useFormation();
  const recentEntries = chronicleEntries.slice(0, 3);
  const activeStudyDay = getStudyDay('bible-study', studyModuleDayById['bible-study'] || 1);
  const activeOwnedBook = ownedBooks.find((book) => book.id === activeOwnedBookId) || ownedBooks[0] || null;
  const activeDiscipleshipSnapshot = getTodayDiscipleshipSnapshot(activeOwnedBook, studyModuleDayById.discipleship || 1);
  const reflectionPrompts = useMemo(
    () => buildReflectionPrompts({
      passage: focusPreview?.reference || activeStudyDay.scripture,
      focus: activeStudyDay.focus,
      sourceLabel: `Day ${activeStudyDay.day}`,
      summary: activeDiscipleshipSnapshot?.focus || activeStudyDay.focus,
    }),
    [activeDiscipleshipSnapshot?.focus, activeStudyDay.day, activeStudyDay.focus, activeStudyDay.scripture, focusPreview?.reference],
  );
  const rhythmStats = useMemo(() => deriveRhythmStats(formationRhythms), [formationRhythms]);
  const todayThreadEntries = useMemo(
    () => getRelatedChronicleEntries(chronicleEntries, {
      page: 'today',
      passage: focusPreview?.reference || activeStudyDay.scripture,
      studyModuleId: 'bible-study',
      currentDay: activeStudyDay.day,
      ownedBookId: activeOwnedBook?.id,
      limit: 4,
    }),
    [activeOwnedBook?.id, activeStudyDay.day, activeStudyDay.scripture, chronicleEntries, focusPreview?.reference],
  );

  useEffect(() => {
    setSelectedAgentMode('reflection_guide');
    setPageContext('/', {
      page: 'Today',
      pathname: '/',
      title: document.title,
      passage: activeStudyDay.scripture,
      studyModuleId: 'bible-study',
      currentDay: activeStudyDay.day,
      ownedBookId: activeOwnedBook?.id,
      selection: `${BIBLE_STUDY_MODULE.title} · Day ${activeStudyDay.day}`,
      summary: `Current Bible study day: ${activeStudyDay.day}. Study title: ${activeStudyDay.title}. Discipleship book: ${activeOwnedBook?.title || 'None active yet'}${activeDiscipleshipSnapshot ? `, day ${activeDiscipleshipSnapshot.day}` : ''}. Today's related Chronicle thread entries: ${todayThreadEntries.length}.`,
    });
  }, [activeDiscipleshipSnapshot, activeOwnedBook?.id, activeOwnedBook?.title, activeStudyDay.day, activeStudyDay.scripture, activeStudyDay.title, setPageContext, setSelectedAgentMode, todayThreadEntries.length]);

  useEffect(() => {
    let cancelled = false;
    loadPassagePreview(activeStudyDay.scripture)
      .then((preview) => {
        if (!cancelled) setFocusPreview(preview);
      })
      .catch(() => {
        if (!cancelled) setFocusPreview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeStudyDay.scripture]);

  // Auto-save prayer to Chronicle after 2s of inactivity
  useEffect(() => {
    if (prayerSaveTimer.current) clearTimeout(prayerSaveTimer.current);
    if (prayerText.trim().length < 10) return;
    prayerSaveTimer.current = setTimeout(() => {
      if (prayerText.trim() !== lastSavedPrayer.current) {
        lastSavedPrayer.current = prayerText.trim();
        addChronicleEntry({
          id: Math.random().toString(36).slice(2),
          date: new Date().toISOString().split('T')[0],
          type: 'prayer',
          title: 'Morning prayer — ' + prayerText.trim().slice(0, 40),
          body: prayerText.trim(),
          autoCapture: true,
          sourceContext: {
            page: 'today',
            passage: activeStudyDay.scripture,
          },
        });
        addToast('Saved to Chronicle', 'success', '🙏');
      }
    }, 2000);
    return () => { if (prayerSaveTimer.current) clearTimeout(prayerSaveTimer.current); };
  }, [activeStudyDay.scripture, addChronicleEntry, addToast, prayerText]);

  const openPassageInBible = (referenceText: string, openThemes = false) => {
    const target = getBibleNavigationTarget(referenceText);
    if (target) {
      setBibleView({
        book: target.book,
        chapter: target.chapter,
        overlayOn: openThemes,
        showThemePanel: openThemes,
        panelMode: 'themes',
        echoesOn: false,
        studyColorsOn: false,
      });
    }
    navigate('/bible');
  };

  const handoffToPrayer = (title: string, referenceText: string, focus: string) => {
    navigate('/prayer', {
      state: {
        source: 'today',
        title,
        passage: referenceText,
        prompt: `Lord, use ${referenceText} to shape my response today. ${focus}`,
      },
    });
  };

  return (
    <div className={s.shell}>
      <div className={s.main}>

        {/* Return banner */}
        {showReturn && (
          <div className={s.returnBanner}>
            <span className={s.returnBannerIcon}>👋</span>
            <span className={s.returnBannerText}>
              Welcome back — you were away for a few days. The shepherd still knows you by name.
            </span>
            <button className={s.returnBannerClose} onClick={() => setShowReturn(false)}>✕</button>
          </div>
        )}

        {/* Greeting */}
        <div className={s.greeting}>
          <div className={s.greetingLabel}>Today</div>
          <div className={s.greetingText}>{todayGreeting()}</div>
          <div className={s.greetingDate}>{todayDateStr()}</div>
        </div>

        {/* Mode cards */}
        <div>
          <div className={s.sectionHeader}>How do you want to show up today?</div>
          <div className={s.modeRow}>
            {MODES.map((m) => (
              <div
                key={m.id}
                className={`${s.modeCard} ${activeMode === m.id ? s.active : ''}`}
                onClick={() => { setActiveMode(m.id); navigate(m.path); }}
              >
                <div className={s.modeIcon}>{m.icon}</div>
                <div className={s.modeTitle}>{m.title}</div>
                <div className={s.modeDesc}>{m.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Today's focus — Psalm 23 */}
        <div className={s.focusCard}>
          <div className={s.focusHeader}>
            <span className={s.focusLabel}>Today's Focus</span>
            <span className={s.focusRef}>{focusPreview?.reference || activeStudyDay.scripture} · NKJV</span>
          </div>
          <div className={s.focusBody}>
            <div className={s.focusVerse}>
              {(focusPreview?.verses || []).map((v) => (
                <span key={v.number}>
                  <span className={s.verseNum}>{v.number}</span>
                  {v.text}{' '}
                </span>
              ))}
              {!focusPreview && activeStudyDay.focus}
            </div>
            <div className={s.focusActions}>
              <button
                className={`${s.actionBtn} ${s.actionBtnPrimary}`}
                onClick={() => openPassageInBible(focusPreview?.reference || activeStudyDay.scripture, false)}
              >
                Read Full Chapter
              </button>
              <button className={s.actionBtn} onClick={() => openPassageInBible(focusPreview?.reference || activeStudyDay.scripture, true)}>
                Explore Theme Overlay
              </button>
              <button className={s.actionBtn} onClick={() => handoffToPrayer(`Today’s Focus · ${focusPreview?.reference || activeStudyDay.scripture}`, focusPreview?.reference || activeStudyDay.scripture, activeStudyDay.focus)}>
                Pray This Passage
              </button>
              <button className={s.actionBtn} onClick={() => {
                addChronicleEntry({
                  id: Math.random().toString(36).slice(2),
                  date: new Date().toISOString().split('T')[0],
                  type: 'insight',
                  title: `Reading ${focusPreview?.reference || activeStudyDay.scripture}`,
                  body: `Read ${focusPreview?.reference || activeStudyDay.scripture} during today's session.`,
                  passage: focusPreview?.reference || activeStudyDay.scripture,
                  autoCapture: true,
                  sourceContext: {
                    page: 'today',
                    passage: focusPreview?.reference || activeStudyDay.scripture,
                  },
                });
                addToast('Reading captured to Chronicle', 'success', '📖');
              }}>
                Mark Read
              </button>
            </div>
          </div>
        </div>

        <div className={s.focusCard}>
          <div className={s.focusHeader}>
            <span className={s.focusLabel}>Daily Study Module</span>
            <span className={s.focusRef}>{BIBLE_STUDY_MODULE.shortTitle} · Day {activeStudyDay.day}</span>
          </div>
          <div className={s.focusBody}>
            <div className={s.focusVerse} style={{ fontFamily: 'inherit', fontSize: 15, lineHeight: 1.7 }}>
              <strong>{activeStudyDay.title}</strong><br />
              {activeStudyDay.phase}<br />
              <span style={{ color: 'var(--text-sub)' }}>{activeStudyDay.scripture}</span>
            </div>
            <div style={{ marginTop: 10, color: 'var(--text-sub)', lineHeight: 1.7 }}>
              {activeStudyDay.focus}
            </div>
            <div className={s.focusActions}>
              <button
                className={`${s.actionBtn} ${s.actionBtnPrimary}`}
                onClick={() => navigate('/study', { state: { requestedStudyModuleId: 'bible-study', requestedDay: activeStudyDay.day } })}
              >
                Open Today&apos;s Study
              </button>
              <button className={s.actionBtn} onClick={() => openPassageInBible(activeStudyDay.scripture, false)}>
                Open Scripture in Bible
              </button>
              <button className={s.actionBtn} onClick={() => handoffToPrayer(`Study Day ${activeStudyDay.day}`, activeStudyDay.scripture, activeStudyDay.focus)}>
                Pray This Study
              </button>
            </div>
          </div>
        </div>

        {activeOwnedBook && (
          <div className={s.focusCard}>
            <div className={s.focusHeader}>
              <span className={s.focusLabel}>Daily Discipleship</span>
              <span className={s.focusRef}>{activeOwnedBook.title}</span>
            </div>
            <div className={s.focusBody}>
              <div className={s.focusVerse} style={{ fontFamily: 'inherit', fontSize: 15, lineHeight: 1.7 }}>
                <strong>{activeDiscipleshipSnapshot?.title || activeOwnedBook.generatedPlan?.title || activeOwnedBook.title}</strong><br />
                {activeDiscipleshipSnapshot?.phase || activeOwnedBook.generatedPlan?.summary}<br />
                <span style={{ color: 'var(--text-sub)' }}>
                  {activeDiscipleshipSnapshot?.scripture
                    ? activeDiscipleshipSnapshot.scripture
                    : `${activeOwnedBook.generatedPlan?.totalDays || 30} days · ${activeOwnedBook.generatedPlan?.cadence || 'Daily'}`}
                </span>
              </div>
              <div style={{ marginTop: 10, color: 'var(--text-sub)', lineHeight: 1.7 }}>
                {activeDiscipleshipSnapshot?.focus || activeOwnedBook.summary}
              </div>
              <div className={s.focusActions}>
                <button
                  className={`${s.actionBtn} ${s.actionBtnPrimary}`}
                  onClick={() => navigate('/discipleship', {
                    state: {
                      requestedBookId: activeOwnedBook.id,
                      requestedDay: getOwnedBookCurrentDay(activeOwnedBook),
                      requestedReaderView: 'study',
                    },
                  })}
                >
                  Open Discipleship
                </button>
                <button className={s.actionBtn} onClick={() => navigate('/discipleship', {
                  state: {
                    requestedBookId: activeOwnedBook.id,
                    requestedDay: getOwnedBookCurrentDay(activeOwnedBook),
                    requestedReaderView: 'study',
                  },
                })}>
                  View My Books
                </button>
                <button
                  className={s.actionBtn}
                  onClick={() => handoffToPrayer(activeOwnedBook.title, activeDiscipleshipSnapshot?.scripture || activeStudyDay.scripture, activeDiscipleshipSnapshot?.focus || activeOwnedBook.summary)}
                >
                  Pray This Day
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Prayer prompt */}
        <div className={s.prayerCard}>
          <div className={s.prayerCardHeader}>
            <span className={s.prayerCardTitle}>Prayer Prompt</span>
          </div>
          <p className={s.prayerPromptText}>"{PRAYER_PROMPT}"</p>
          <textarea
            className={s.prayerTextarea}
            placeholder="Write your response here..."
            value={prayerText}
            onChange={(e) => setPrayerText(e.target.value)}
            rows={3}
          />
          <div className={s.prayerHint}>
            {prayerText.trim().length >= 10 ? '✓ Auto-saving to Chronicle…' : 'Auto-saved to Chronicle as you type'}
          </div>
        </div>

        <div className={s.focusCard}>
          <div className={s.focusHeader}>
            <span className={s.focusLabel}>Reflection Prompts</span>
            <span className={s.focusRef}>{focusPreview?.reference || activeStudyDay.scripture}</span>
          </div>
          <div className={s.focusBody} style={{ display: 'grid', gap: 10 }}>
            {reflectionPrompts.map((prompt) => (
              <div key={prompt.id} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-inner)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{prompt.label}</div>
                <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.6, color: 'var(--text)' }}>{prompt.prompt}</div>
                <div style={{ marginTop: 6, fontSize: 11, lineHeight: 1.55, color: 'var(--text-sub)' }}>{prompt.followThrough}</div>
              </div>
            ))}
            <div className={s.focusActions}>
              <button
                className={s.actionBtn}
                onClick={() => {
                  addChronicleEntry({
                    id: Math.random().toString(36).slice(2),
                    date: new Date().toISOString().split('T')[0],
                    type: 'reflection',
                    title: `Reflection prompts · ${focusPreview?.reference || activeStudyDay.scripture}`,
                    body: reflectionPrompts.map((prompt) => `${prompt.label}: ${prompt.prompt}\n${prompt.followThrough}`).join('\n\n'),
                    passage: focusPreview?.reference || activeStudyDay.scripture,
                    autoCapture: true,
                    sourceContext: {
                      page: 'today',
                      passage: focusPreview?.reference || activeStudyDay.scripture,
                      studyModuleId: 'bible-study',
                      currentDay: activeStudyDay.day,
                    },
                  });
                  addToast('Reflection prompts saved to Chronicle', 'success', '📓');
                }}
              >
                Save Reflection Prompts
              </button>
              <button
                className={s.actionBtn}
                onClick={() => navigate('/chronicle', { state: { filterPassage: focusPreview?.reference || activeStudyDay.scripture } })}
              >
                Open in Chronicle
              </button>
            </div>
          </div>
        </div>

        {/* Top themes */}
        <div>
          <div className={s.sectionHeader}>Your active themes</div>
          <div className={s.themesRow}>
            {TOP_THEMES.map((t) => (
              <div key={t} className={s.themeChip} onClick={() => navigate('/themes')}>
                {t}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── RIGHT PANEL ── */}
      <div className={s.panel}>

        {/* Recent Chronicle */}
        <div className={s.panelSection}>
          <div className={s.panelTitle}>Recent Chronicle</div>
          {recentEntries.map((entry) => (
            <div key={entry.id} className={s.entryCard}>
              <div className={s.entryMeta}>
                <div className={`${s.entryTypeDot} ${s[entry.type]}`} />
                <span className={s.entryTypeLabel}>{entry.type}</span>
                <span className={s.entryTime}>{entry.date === new Date().toISOString().split('T')[0] ? 'Today' : entry.date}</span>
              </div>
              <div className={s.entryTitle}>{entry.title}</div>
              <div className={s.entryBody}>{entry.body}</div>
            </div>
          ))}
          <button
            className={s.actionBtn}
            style={{ marginTop: 10, width: '100%', textAlign: 'center' }}
            onClick={() => navigate('/chronicle')}
          >
            View All →
          </button>
        </div>

        <div className={s.panelSection}>
          <div className={s.panelTitle}>Today&apos;s Thread</div>
          {todayThreadEntries.length > 0 ? todayThreadEntries.map((entry) => (
            <div key={entry.id} className={s.entryCard}>
              <div className={s.entryMeta}>
                <div className={`${s.entryTypeDot} ${s[entry.type]}`} />
                <span className={s.entryTypeLabel}>{entry.type}</span>
              </div>
              <div className={s.entryTitle}>{entry.title}</div>
              <div className={s.entryBody}>{entry.body}</div>
            </div>
          )) : (
            <div className={s.entryCard}>
              <div className={s.entryBody}>
                Chronicle entries saved from today&apos;s study, prayer, and discipleship flow will gather here so the day reads like one thread.
              </div>
            </div>
          )}
          <button
            className={s.actionBtn}
            style={{ marginTop: 10, width: '100%', textAlign: 'center' }}
            onClick={() => navigate('/chronicle', { state: { filterPassage: focusPreview?.reference || activeStudyDay.scripture } })}
          >
            Open in Chronicle →
          </button>
        </div>

        <div className={s.panelSection}>
          <div className={s.panelTitle}>Recurring Rhythms</div>
          <div className={s.entryCard}>
            <div className={s.entryBody}>
              {rhythmStats.completedNow} of {rhythmStats.total} rhythms marked in the current window. {rhythmStats.remainingNow > 0 ? `${rhythmStats.remainingNow} still waiting for attention.` : 'Everything on the current rhythm list has been touched.'}
            </div>
          </div>
          {formationRhythms.map((rhythm) => {
            const completed = isRhythmCompletedInCurrentPeriod(rhythm);
            return (
              <div key={rhythm.id} className={s.entryCard}>
                <div className={s.entryMeta}>
                  <div className={`${s.entryTypeDot} ${completed ? s.insight : s.note}`} />
                  <span className={s.entryTypeLabel}>{rhythm.cadence}</span>
                </div>
                <div className={s.entryTitle}>{rhythm.title}</div>
                <div className={s.entryBody}>{rhythm.prompt}</div>
                <button
                  className={s.actionBtn}
                  style={{ marginTop: 10, width: '100%', textAlign: 'center' }}
                  onClick={() => {
                    completeFormationRhythm(rhythm.id);
                    addToast(`${rhythm.title} marked complete`, 'success', '✓');
                  }}
                >
                  {completed ? 'Completed This Cycle' : 'Mark Complete'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Formation snapshot */}
        <div className={s.panelSection}>
          <div className={s.panelTitle}>Formation Snapshot</div>
          {formation.map((f) => (
            <div key={f.label} className={s.formationBar}>
              <div className={s.formationBarTop}>
                <span className={s.formationBarLabel}>{f.label}</span>
                <span className={s.formationBarValue}>{f.value}</span>
              </div>
              <div className={s.formationTrack}>
                <div
                  className={`${s.formationFill} ${f.color !== 'green' ? s[f.color] : ''}`}
                  style={{ width: `${f.pct}%` }}
                />
              </div>
            </div>
          ))}
          <button
            className={s.actionBtn}
            style={{ marginTop: 10, width: '100%', textAlign: 'center' }}
            onClick={() => navigate('/insights')}
          >
            Full Insights →
          </button>
        </div>

        {/* North Star */}
        <div className={s.panelSection}>
          <div className={s.northStar}>
            <div className={s.northStarLabel}>North Star</div>
            <div className={s.northStarText}>
              "You came carrying yourself. You left carrying Him."
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
