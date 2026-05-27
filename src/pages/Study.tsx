import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BIBLE_STUDY_MODULE, getStudyDay } from '../lib/studyModules';
import { useAppStore } from '../store';
import { useAIChatStore } from '../store/aiChatStore';
import { useToastStore } from '../store/toastStore';
import { getBibleNavigationTarget } from '../lib/scriptureReference';
import { getRelatedChronicleEntries } from '../lib/chronicleRelations';
import { useResponsiveLayout } from '../lib/useResponsiveLayout';

export default function Study() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToastStore();
  const {
    studyModuleDayById,
    setStudyModuleDay,
    advanceStudyModuleDay,
    addChronicleEntry,
    chronicleEntries,
    setBibleView,
  } = useAppStore();
  const setPageContext = useAIChatStore((state) => state.setPageContext);
  const setSelectedAgentMode = useAIChatStore((state) => state.setSelectedAgentMode);
  const { isCompact, isPhone } = useResponsiveLayout();

  const module = BIBLE_STUDY_MODULE;
  const currentDayNumber = Math.min(studyModuleDayById[module.id] || 1, module.totalDays);
  const currentDay = getStudyDay('bible-study', currentDayNumber);
  const isLastDay = currentDayNumber >= module.totalDays;
  const relatedChronicleEntries = useMemo(
    () => getRelatedChronicleEntries(chronicleEntries, {
      page: 'study',
      passage: currentDay.scripture,
      studyModuleId: module.id,
      currentDay: currentDay.day,
      limit: 4,
    }),
    [chronicleEntries, currentDay.day, currentDay.scripture, module.id],
  );

  useEffect(() => {
    const request = location.state as { requestedStudyModuleId?: string; requestedDay?: number } | null;
    if (!request?.requestedStudyModuleId || typeof request.requestedDay !== 'number') return;
    if (request.requestedStudyModuleId !== module.id) return;
    const nextDay = Math.min(Math.max(request.requestedDay, 1), module.totalDays);
    if (nextDay !== currentDayNumber) {
      setStudyModuleDay(module.id, nextDay);
    }
    navigate(location.pathname, { replace: true, state: null });
  }, [currentDayNumber, location.pathname, location.state, module.id, module.totalDays, navigate, setStudyModuleDay]);

  useEffect(() => {
    setSelectedAgentMode('bible_study_agent');
    setPageContext('/study', {
      page: 'Study',
      pathname: '/study',
      title: document.title,
      passage: currentDay.scripture,
      studyModuleId: module.id,
      currentDay: currentDay.day,
      selection: `${module.title} · Day ${currentDay.day}`,
      summary: `Study module ${module.title}, day ${currentDay.day} of ${module.totalDays}. Phase: ${currentDay.phase}. Scripture: ${currentDay.scripture}.`,
    });
  }, [currentDay.day, currentDay.phase, currentDay.scripture, module.id, module.title, module.totalDays, setPageContext, setSelectedAgentMode]);

  const openCurrentPassageInBible = (openThemes = false) => {
    const target = getBibleNavigationTarget(currentDay.scripture);
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

  const prayCurrentPassage = () => {
    navigate('/prayer', {
      state: {
        source: 'study',
        title: `${module.title} · Day ${currentDay.day}`,
        passage: currentDay.scripture,
        prompt: `Lord, use ${currentDay.scripture} to form me today. ${currentDay.focus}`,
      },
    });
  };

  const completeToday = () => {
    addChronicleEntry({
      id: Math.random().toString(36).slice(2),
      date: new Date().toISOString().split('T')[0],
      type: 'study',
      title: `${module.title} — Day ${currentDay.day} complete`,
      body: `${currentDay.title}\n\nFocus: ${currentDay.focus}\n\nAccountability: ${currentDay.accountability}`,
      passage: currentDay.scripture,
      autoCapture: true,
      sourceContext: {
        page: 'study',
        passage: currentDay.scripture,
        studyModuleId: module.id,
        currentDay: currentDay.day,
      },
    });

    if (!isLastDay) {
      advanceStudyModuleDay(module.id);
    }

    addToast(
      isLastDay ? `${module.title} is complete.` : `Saved Day ${currentDay.day}. Tomorrow is ready when you are.`,
      'success',
      '📘'
    );
  };

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--card-bg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Daily Bible Study
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{module.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 4 }}>
                {module.summary}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                {module.sourceSummary}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ padding: '8px 12px', borderRadius: 999, background: 'var(--card-inner)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-sub)' }}>
              {module.tradition}
            </div>
            <div style={{ padding: '8px 12px', borderRadius: 999, background: 'var(--card-inner)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-sub)' }}>
              {module.cadence}
            </div>
            <div style={{ padding: '8px 12px', borderRadius: 999, background: 'var(--accent-green-light)', border: '1px solid var(--accent-green)', fontSize: 12, color: 'var(--accent-green)' }}>
              Bible Study Agent is the default Chronicle study mode
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: isPhone ? '14px 14px 20px' : '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : '2.2fr 1fr', gap: 14 }}>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px', boxShadow: 'var(--shadow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Today&apos;s Session
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Day {currentDay.day} · {currentDay.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 4 }}>{currentDay.phase}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setStudyModuleDay(module.id, Math.max(1, currentDay.day - 1))}
                    disabled={currentDay.day === 1}
                    style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', opacity: currentDay.day === 1 ? 0.45 : 1 }}
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudyModuleDay(module.id, Math.min(module.totalDays, currentDay.day + 1))}
                    disabled={isLastDay}
                    style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', opacity: isLastDay ? 0.45 : 1 }}
                  >
                    Next
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
                <div style={{ padding: '14px 14px', borderRadius: 10, background: 'var(--card-inner)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Scripture</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginTop: 6 }}>{currentDay.scripture}</div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-sub)', marginTop: 8 }}>{currentDay.focus}</div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => openCurrentPassageInBible(false)}
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: 12, fontWeight: 600 }}
                    >
                      Open in Bible
                    </button>
                    <button
                      type="button"
                      onClick={() => openCurrentPassageInBible(true)}
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: 12, fontWeight: 600 }}
                    >
                      Open Theme Overlay
                    </button>
                    <button
                      type="button"
                      onClick={prayCurrentPassage}
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: 12, fontWeight: 600 }}
                    >
                      Turn Into Prayer
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isPhone ? '1fr' : '1fr 1fr', gap: 12 }}>
                  <div style={{ padding: '14px 14px', borderRadius: 10, background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>1. Start in Stillness</div>
                    <div style={{ marginTop: 8, lineHeight: 1.65, color: 'var(--text)' }}>{currentDay.stillnessPrompt}</div>
                  </div>
                  <div style={{ padding: '14px 14px', borderRadius: 10, background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>2. Story the Scripture</div>
                    <div style={{ marginTop: 8, lineHeight: 1.65, color: 'var(--text)' }}>{currentDay.storyPrompt}</div>
                  </div>
                </div>

                <div style={{ padding: '14px 14px', borderRadius: 10, background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>3. S.T.E.P.S. Journal</div>
                  <ol style={{ margin: '10px 0 0 18px', padding: 0, lineHeight: 1.75, color: 'var(--text)' }}>
                    {currentDay.stepsPrompts.map((prompt) => (
                      <li key={prompt} style={{ marginBottom: 6 }}>{prompt}</li>
                    ))}
                  </ol>
                </div>

                <div style={{ padding: '14px 14px', borderRadius: 10, background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>4. ACTS Prayer</div>
                  <div style={{ display: 'grid', gridTemplateColumns: isPhone ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 10 }}>
                    {currentDay.actsPrayer.map((prompt) => (
                      <div key={prompt} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--card-inner)', border: '1px solid var(--border)', color: 'var(--text-sub)' }}>
                        {prompt}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px', boxShadow: 'var(--shadow)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Leader Insight</div>
                <div style={{ marginTop: 8, lineHeight: 1.7, color: 'var(--text)' }}>{currentDay.leaderNote}</div>
              </div>

              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px', boxShadow: 'var(--shadow)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Partner Reflection</div>
                <div style={{ marginTop: 8, lineHeight: 1.7, color: 'var(--text)' }}>{currentDay.partnerNote}</div>
              </div>

              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px', boxShadow: 'var(--shadow)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Accountability Check</div>
                <div style={{ marginTop: 8, lineHeight: 1.7, color: 'var(--text)' }}>{currentDay.accountability}</div>
              </div>

              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px', boxShadow: 'var(--shadow)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Progress</div>
                <div style={{ marginTop: 8, fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
                  Day {currentDay.day} / {module.totalDays}
                </div>
                <div style={{ marginTop: 8, height: 10, borderRadius: 999, background: 'var(--card-inner)', overflow: 'hidden' }}>
                  <div style={{ width: `${(currentDay.day / module.totalDays) * 100}%`, height: '100%', background: 'var(--accent-green)' }} />
                </div>
                <button
                  type="button"
                  onClick={completeToday}
                  style={{ marginTop: 14, width: '100%', padding: '10px 14px', borderRadius: 10, border: 'none', background: 'var(--accent-green)', color: 'white', fontWeight: 700 }}
                >
                  {isLastDay ? `Finish ${module.shortTitle}` : 'Complete Today'}
                </button>
              </div>

              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px', boxShadow: 'var(--shadow)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Related Chronicle Entries</div>
                <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                  {relatedChronicleEntries.length > 0 ? relatedChronicleEntries.map((entry) => (
                    <div key={entry.id} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--card-inner)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{entry.title}</div>
                      <div style={{ marginTop: 4, fontSize: 11, lineHeight: 1.55, color: 'var(--text-sub)' }}>{entry.body}</div>
                    </div>
                  )) : (
                    <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-muted)' }}>
                      Chronicle entries you save from this day will stay visible here so study, prayer, and reflection travel together.
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate('/chronicle', { state: { filterPassage: currentDay.scripture } })}
                    style={{ marginTop: 2, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', fontSize: 12, fontWeight: 600 }}
                  >
                    Open in Chronicle
                  </button>
                </div>
              </div>

              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px', boxShadow: 'var(--shadow)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Study Framework</div>
                <div style={{ marginTop: 8, fontWeight: 700, color: 'var(--text)' }}>Bible Study Agent</div>
                <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.6, color: 'var(--text-sub)' }}>
                  This page is reserved for Scripture study itself: close reading, context, Christ-centered interpretation, doctrine, application, and prayerful response.
                </div>
                <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                  {[
                    'Observation before interpretation',
                    'Interpretation in context',
                    'Christ at the center',
                    'Application tied to the passage',
                    'Prayer and obedience each day',
                  ].map((item) => (
                    <div key={item} style={{ fontSize: 12, color: 'var(--text-sub)' }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
              Roadmap
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {module.phases.map((phase) => (
                <div key={phase.label} style={{ padding: '12px', borderRadius: 10, background: 'var(--card-inner)', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>{phase.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Weeks {phase.weeks[0]}–{phase.weeks[phase.weeks.length - 1]}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 8, lineHeight: 1.6 }}>{phase.emphasis}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
