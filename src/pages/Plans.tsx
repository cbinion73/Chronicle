import { useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../store';
import { derivePlanMilestones, derivePlanStats } from '../lib/formationAnalytics';
import { useAIChatStore } from '../store/aiChatStore';
import { deriveRhythmStats, isRhythmCompletedInCurrentPeriod } from '../lib/formationRhythms';

const PLAN_LIBRARY = [
  { name: 'Daily Walk', duration: '365 days', desc: 'One chapter a day through the entire Bible' },
  { name: 'Psalms & Proverbs', duration: '30 days', desc: 'Deep dive into wisdom literature' },
  { name: 'Jesus in All of Scripture', duration: '90 days', desc: 'Christ-centered reading through the canon' },
  { name: 'Sermon on the Mount', duration: '14 days', desc: 'Matthew 5–7 verse by verse' },
];

export default function Plans() {
  const { currentPlanName, currentPlanDay, currentPlanTotal, streakDays, chronicleEntries, prayerItems, formationRhythms, completeFormationRhythm } = useAppStore();
  const setPageContext = useAIChatStore((state) => state.setPageContext);
  const setSelectedAgentMode = useAIChatStore((state) => state.setSelectedAgentMode);
  const calRef = useRef<HTMLDivElement>(null);
  const progressPct = Math.round((currentPlanDay / currentPlanTotal) * 100);
  const stats = derivePlanStats(chronicleEntries, prayerItems, currentPlanDay);
  const milestones = derivePlanMilestones(currentPlanDay, currentPlanTotal);
  const rhythmStats = useMemo(() => deriveRhythmStats(formationRhythms), [formationRhythms]);
  const now = useMemo(() => new Date(), []);
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const todayOfMonth = now.getDate();

  const activeDaysSet = useMemo(
    () =>
      new Set(
        chronicleEntries
          .filter((entry) => {
            const date = new Date(`${entry.date}T12:00:00`);
            return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
          })
          .map((entry) => new Date(`${entry.date}T12:00:00`).getDate()),
      ),
    [chronicleEntries, currentMonth, currentYear],
  );

  useEffect(() => {
    setSelectedAgentMode('reflection_guide');
    setPageContext('/plans', {
      page: 'Plans',
      pathname: '/plans',
      title: document.title,
      selection: `${currentPlanName} · Day ${currentPlanDay} of ${currentPlanTotal}`,
      summary: `Current plan ${currentPlanName}. Day ${currentPlanDay} of ${currentPlanTotal}. Streak ${streakDays} days. Reading pace: ${stats.pace}.`,
    });
  }, [currentPlanDay, currentPlanName, currentPlanTotal, setPageContext, setSelectedAgentMode, stats.pace, streakDays]);

  useEffect(() => {
    if (!calRef.current) return;
    calRef.current.innerHTML = '';
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach((day) => {
      const el = document.createElement('div');
      el.textContent = day;
      el.style.cssText = 'font-size:10px;font-weight:700;color:var(--text-muted);text-align:center;padding:4px 0;';
      calRef.current!.appendChild(el);
    });

    for (let i = 0; i < firstDay; i += 1) calRef.current.appendChild(document.createElement('div'));

    for (let day = 1; day <= daysInMonth; day += 1) {
      const el = document.createElement('div');
      el.textContent = String(day);
      el.style.cssText = `
        width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;
        font-size:11px;font-weight:500;cursor:default;margin:2px auto;transition:all 0.12s;
      `;
      const hasActivity = activeDaysSet.has(day);
      if (day < todayOfMonth && hasActivity) {
        el.style.background = 'var(--accent-blue)';
        el.style.color = 'white';
        el.style.fontWeight = '600';
      } else if (day === todayOfMonth) {
        el.style.border = '2px solid var(--accent-blue)';
        el.style.color = 'var(--accent-blue)';
        el.style.fontWeight = '700';
      } else if (day < todayOfMonth && !hasActivity) {
        el.style.border = '1px solid var(--border)';
        el.style.color = 'var(--text-muted)';
        el.style.background = 'var(--card-inner)';
      } else {
        el.style.color = 'var(--text-muted)';
        el.style.opacity = '0.4';
      }
      calRef.current.appendChild(el);
    }
  }, [activeDaysSet, currentMonth, currentYear, todayOfMonth]);

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
          <div style={{ background: 'radial-gradient(circle at 50% 42%, rgba(43, 141, 255, 0.34), transparent 28%), linear-gradient(135deg, #0f4fcf 0%, #0b2f88 100%)', padding: '18px 20px', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.8, marginBottom: 4 }}>Active Plan</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{currentPlanName}</div>
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>A daily reading rhythm, paced by the life you are actually living.</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 28, fontWeight: 800 }}>Day {currentPlanDay}</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>of {currentPlanTotal}</div>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.8, marginBottom: 4 }}>
                <span>{progressPct}% complete</span>
                <span>Current streak: {streakDays} days</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.3)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'white', borderRadius: 3, width: `${progressPct}%` }} />
              </div>
            </div>
          </div>
          <div style={{ padding: '14px 20px', background: 'var(--card-inner)', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', marginBottom: 3 }}>Today&apos;s reading anchor: {stats.todayPassage}</div>
            <div style={{ fontSize: 12, color: 'var(--text-sub)' }}>Chronicle is using your entry history this month as a proxy for whether the reading rhythm is really being kept.</div>
          </div>
        </div>

        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{monthName}</div>
            <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-blue)', display: 'inline-block' }} /> Active</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--accent-blue)', display: 'inline-block' }} /> Today</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--card-inner)', display: 'inline-block' }} /> Quiet</span>
            </div>
          </div>
          <div ref={calRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }} />
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Plan Library</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {PLAN_LIBRARY.map((plan) => {
              const active = plan.name === currentPlanName;
              return (
                <div key={plan.name} style={{ background: 'var(--card-bg)', border: `1px solid ${active ? 'var(--accent-blue)' : 'var(--border)'}`, borderRadius: 12, padding: '14px 16px', boxShadow: 'var(--shadow)', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{plan.name}</div>
                    {active && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', background: 'var(--accent-blue-light)', color: 'var(--accent-blue)', borderRadius: 4 }}>ACTIVE</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-sub)', marginBottom: 4 }}>{plan.desc}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{plan.duration}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Recurring Rhythms</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rhythmStats.completedNow}/{rhythmStats.total} current</div>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {formationRhythms.map((rhythm) => {
              const completed = isRhythmCompletedInCurrentPeriod(rhythm);
              return (
                <div key={rhythm.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', background: 'var(--card-inner)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{rhythm.title}</div>
                    <div style={{ fontSize: 10, color: completed ? 'var(--accent-green)' : 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {completed ? 'done' : rhythm.cadence}
                    </div>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 11, lineHeight: 1.55, color: 'var(--text-sub)' }}>{rhythm.prompt}</div>
                  <button
                    onClick={() => completeFormationRhythm(rhythm.id)}
                    style={{ marginTop: 8, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {completed ? 'Completed This Cycle' : 'Mark Complete'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ width: 268, minWidth: 268, borderLeft: '1px solid var(--border)', background: 'var(--card-bg)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>This Month</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { n: stats.daysRead, l: 'Days active' },
              { n: stats.missedDays, l: 'Quiet days' },
              { n: `${streakDays}d`, l: 'Current streak' },
              { n: stats.pace, l: 'Pace' },
            ].map((stat) => (
              <div key={stat.l} style={{ background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{stat.n}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{stat.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Milestones</div>
          {milestones.map((milestone) => (
            <div key={milestone.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: milestone.status === 'done' ? 'var(--accent-blue)' : milestone.status === 'next' ? 'var(--accent-amber)' : 'var(--text-muted)' }}>
                {milestone.status === 'done' ? '✓' : milestone.status === 'next' ? '→' : '○'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: milestone.status === 'next' ? 600 : 400, color: milestone.status === 'done' ? 'var(--text-muted)' : 'var(--text)' }}>{milestone.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{milestone.date}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Pace</div>
          <div style={{ padding: '12px 14px', background: progressPct >= 50 ? 'var(--accent-blue-light)' : 'var(--accent-amber-light)', border: `1px solid ${progressPct >= 50 ? 'var(--accent-blue)' : 'var(--accent-amber)'}`, borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: progressPct >= 50 ? 'var(--accent-blue)' : 'var(--accent-amber)', marginBottom: 4 }}>
              {progressPct >= 50 ? 'Steady forward motion' : 'Early in the journey'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-sub)' }}>
              Answered prayers: {stats.answeredPrayers}. Quiet days this month: {stats.missedDays}. Chronicle is starting to measure plan health with more honesty.
            </div>
          </div>
          {rhythmStats.strongestRhythm ? (
            <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>Strongest Rhythm</div>
              <div style={{ marginTop: 4, fontSize: 11, lineHeight: 1.5, color: 'var(--text-sub)' }}>
                {rhythmStats.strongestRhythm.title} has {rhythmStats.strongestRhythm.completions.length} recorded completion{rhythmStats.strongestRhythm.completions.length === 1 ? '' : 's'}.
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
