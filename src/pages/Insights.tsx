import { useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../store';
import {
  deriveFormationSummary,
  deriveFormationJourney,
  deriveMonthlyActivity,
  derivePatterns,
  derivePrayerFormation,
  deriveRhythmFormation,
  deriveScriptureRetention,
  deriveSuggestions,
  deriveThemeSignals,
} from '../lib/formationAnalytics';
import { useAIChatStore } from '../store/aiChatStore';

export default function Insights() {
  const { chronicleEntries, prayerItems, formationRhythms } = useAppStore();
  const setPageContext = useAIChatStore((state) => state.setPageContext);
  const setSelectedAgentMode = useAIChatStore((state) => state.setSelectedAgentMode);
  const heatRef = useRef<HTMLDivElement>(null);
  const summary = useMemo(() => deriveFormationSummary(chronicleEntries), [chronicleEntries]);
  const patterns = useMemo(() => derivePatterns(chronicleEntries), [chronicleEntries]);
  const retention = useMemo(() => deriveScriptureRetention(chronicleEntries), [chronicleEntries]);
  const monthly = useMemo(() => deriveMonthlyActivity(chronicleEntries), [chronicleEntries]);
  const themes = useMemo(() => deriveThemeSignals(chronicleEntries), [chronicleEntries]);
  const suggestions = useMemo(() => deriveSuggestions(chronicleEntries, themes), [chronicleEntries, themes]);
  const prayerFormation = useMemo(() => derivePrayerFormation(prayerItems), [prayerItems]);
  const rhythmFormation = useMemo(() => deriveRhythmFormation(formationRhythms), [formationRhythms]);
  const journey = useMemo(() => deriveFormationJourney(chronicleEntries, prayerItems, formationRhythms), [chronicleEntries, formationRhythms, prayerItems]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = chronicleEntries.filter((entry) => new Date(`${entry.date}T12:00:00`) >= monthStart);
  const prayerDays = new Set(thisMonth.filter((entry) => entry.type === 'prayer').map((entry) => entry.date)).size;
  const gratitudeCount = thisMonth.filter((entry) => /thank|grat|praise/i.test(`${entry.title} ${entry.body}`)).length;
  const studyCount = thisMonth.filter((entry) => entry.type === 'study' || entry.type === 'insight').length;

  const dimensions = [
    { label: '📖 Scripture', value: `${studyCount} sessions`, pct: Math.min(100, studyCount * 16), color: 'var(--accent-blue)' },
    { label: '🙏 Prayer', value: `${prayerDays}/7 days`, pct: Math.min(100, (prayerDays / 7) * 100), color: 'var(--accent-green)' },
    { label: '🤲 Surrender', value: `${summary.surrenderCount} signals`, pct: Math.min(100, summary.surrenderCount * 14), color: 'var(--accent-amber)' },
    { label: '🎁 Gratitude', value: `${gratitudeCount} entries`, pct: Math.min(100, gratitudeCount * 18), color: 'var(--accent-blue)' },
  ];

  useEffect(() => {
    setSelectedAgentMode('reflection_guide');
    setPageContext('/insights', {
      page: 'Insights',
      pathname: '/insights',
      title: document.title,
      selection: summary.summary,
      passage: themes[0]?.label,
      summary: `Insights synthesized from ${summary.totalEntries} entries, ${summary.activeDays} active days, ${themes.length} derived themes, and ${prayerFormation.answeredCount} answered prayers.`,
    });
  }, [prayerFormation.answeredCount, setPageContext, setSelectedAgentMode, summary.activeDays, summary.summary, summary.totalEntries, themes]);

  useEffect(() => {
    if (!heatRef.current) return;
    heatRef.current.innerHTML = '';
    const activityMap = new Map<string, number>();
    chronicleEntries.forEach((entry) => activityMap.set(entry.date, (activityMap.get(entry.date) || 0) + 1));

    const today = new Date();
    const colors = ['var(--border)', '#dbeafe', '#93c5fd', '#2b8dff', '#0f4fcf'];
    for (let i = 90; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      const count = activityMap.get(key) || 0;
      const level = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 5 ? 3 : 4;
      const cell = document.createElement('div');
      cell.title = `${key}: ${count} entries`;
      cell.style.cssText = `width:10px;height:10px;border-radius:2px;background:${colors[level]};`;
      heatRef.current.appendChild(cell);
    }
  }, [chronicleEntries]);

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: 'var(--card-bg)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Insights</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Formation patterns drawn from your actual Chronicle entries</div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{summary.totalEntries} entries · {summary.activeDays} active days</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderLeft: '4px solid var(--accent-blue)', borderRadius: 12, padding: '18px 20px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-blue)', marginBottom: 8 }}>Formation Summary</div>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 14, lineHeight: 1.8, color: 'var(--text)', margin: 0 }}>{summary.summary}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Longest gap: {summary.longestGap} day{summary.longestGap === 1 ? '' : 's'} · Returns: {summary.returnCount}</span>
              <span style={{ fontSize: 10, fontStyle: 'italic', color: 'var(--text-muted)' }}>Signals, not final verdicts.</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Formation Dimensions</div>
              {dimensions.map((dimension) => (
                <div key={dimension.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text)' }}>{dimension.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{dimension.value}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: dimension.color, borderRadius: 2, width: `${dimension.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Monthly Arc</div>
              <svg width="100%" height="100" viewBox="0 0 300 100" preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
                <line x1="0" y1="80" x2="300" y2="80" stroke="var(--border)" strokeWidth="1" />
                <polyline
                  points={monthly.map((item, index) => {
                    const max = Math.max(1, ...monthly.map((entry) => entry.count));
                    const x = (300 / Math.max(1, monthly.length - 1)) * index;
                    const y = 80 - ((item.count / max) * 50);
                    return `${x},${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#0f4fcf"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                {monthly.map((item) => (
                  <span key={item.month} style={{ fontSize: 9, color: 'var(--text-muted)' }}>{item.label}</span>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Prayer Outcomes</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                {[
                  { label: 'Answered', value: prayerFormation.answeredCount },
                  { label: 'Avg turnaround', value: prayerFormation.avgTurnaroundDays ? `${prayerFormation.avgTurnaroundDays}d` : '—' },
                  { label: 'Open oldest', value: `${prayerFormation.oldestOpenDays}d` },
                  { label: 'Follow-up due', value: prayerFormation.followUpDueCount },
                ].map((item) => (
                  <div key={item.label} style={{ background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{item.value}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{item.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {prayerFormation.recentlyAnswered.length > 0 ? prayerFormation.recentlyAnswered.map((item) => (
                  <div key={`${item.text}-${item.dateAnswered}`} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-inner)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{item.text}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Answered {item.dateAnswered}{item.passage ? ` · ${item.passage}` : ''}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-sub)', marginTop: 6, lineHeight: 1.5 }}>{item.summary}</div>
                  </div>
                )) : (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>As answered prayers are recorded, Chronicle will surface the story of God’s faithfulness here.</div>
                )}
              </div>
            </div>

            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Recurring Rhythms</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                {[
                  { label: 'Current', value: `${rhythmFormation.completedNow}/${Math.max(1, rhythmFormation.total)}` },
                  { label: 'Daily done', value: rhythmFormation.dailyCompleted },
                  { label: 'Weekly done', value: rhythmFormation.weeklyCompleted },
                  { label: 'Logged', value: rhythmFormation.totalCompletions },
                ].map((item) => (
                  <div key={item.label} style={{ background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{item.value}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{item.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.6 }}>
                {rhythmFormation.strongestRhythm
                  ? `${rhythmFormation.strongestRhythm.title} is currently the steadiest practiced rhythm with ${rhythmFormation.strongestRhythm.count} logged completion${rhythmFormation.strongestRhythm.count === 1 ? '' : 's'}.`
                  : 'Recurring rhythms are now tracked here as they begin to gather history.'}
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-blue)', marginBottom: 8 }}>Growth Story</div>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 14, lineHeight: 1.8, color: 'var(--text)', margin: 0 }}>{journey.story}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 14 }}>
              {journey.milestones.map((milestone) => (
                <div key={milestone.label} style={{ background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{milestone.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{milestone.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Patterns Detected</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {patterns.map((pattern) => (
                <div key={pattern.title} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', boxShadow: 'var(--shadow)' }}>
                  <div style={{ fontSize: 18, marginBottom: 6 }}>{pattern.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{pattern.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.5 }}>{pattern.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Scripture Retention</div>
            {retention.length > 0 ? retention.map((item) => (
              <div key={item.ref} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', minWidth: 90 }}>{item.ref}</span>
                <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--accent-blue)', borderRadius: 3, width: `${item.pct}%` }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 72 }}>{item.revisits} revisit{item.revisits !== 1 ? 's' : ''}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 86 }}>Last: {item.last}</span>
              </div>
            )) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Start attaching passages to Chronicle entries and this panel will begin to fill in.</div>
            )}
          </div>
        </div>
      </div>

      <div style={{ width: 268, minWidth: 268, borderLeft: '1px solid var(--border)', background: 'var(--card-bg)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Engagement — Last 91 Days</div>
          <div ref={heatRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 10, color: 'var(--text-muted)', justifyContent: 'flex-end' }}>
            Less
            {['var(--border)', '#dbeafe', '#93c5fd', '#0f4fcf'].map((color) => (
              <div key={color} style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
            ))}
            More
          </div>
        </div>

        <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Suggested for You</div>
          {suggestions.map((suggestion) => (
            <div key={suggestion.ref} style={{ background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{suggestion.reason}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-blue)', marginBottom: 4 }}>{suggestion.ref}</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 11, color: 'var(--text-sub)', fontStyle: 'italic' }}>{suggestion.text}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>A Word</div>
          <div style={{ background: 'var(--accent-blue-light)', border: '1px solid var(--accent-blue)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-blue)', marginBottom: 6 }}>Formation Note</div>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 12, fontStyle: 'italic', color: 'var(--text)', lineHeight: 1.65, margin: 0 }}>
              Chronicle is most helpful when it tells the truth gently: not only where you are thriving, but where you keep returning because you still need God there.
            </p>
          </div>
          {prayerFormation.mostCarried.length > 0 ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Most Carried Requests</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {prayerFormation.mostCarried.map((item) => (
                  <div key={item.text} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-inner)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{item.text}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{item.timesPrayed} prayer touch{item.timesPrayed === 1 ? '' : 'es'}{item.lastPrayedAt ? ` · last prayed ${item.lastPrayedAt}` : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
