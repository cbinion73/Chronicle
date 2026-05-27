import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store';
import s from './Sidebar.module.css';
import type { NavTab } from '../../types';
import type { ChronicleDeviceClass } from '../../lib/useResponsiveLayout';

const NAV_ITEMS: { id: NavTab; label: string; path: string; icon: React.ReactNode }[] = [
  {
    id: 'today', label: 'Today', path: '/',
    icon: <svg className={s.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  },
  {
    id: 'bible', label: 'Bible', path: '/bible',
    icon: <svg className={s.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
  },
  {
    id: 'study', label: 'Study', path: '/study',
    icon: <svg className={s.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  },
  {
    id: 'discipleship', label: 'Discipleship', path: '/discipleship',
    icon: <svg className={s.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3l7 4v5c0 5-3.5 8.5-7 9-3.5-.5-7-4-7-9V7l7-4z"/><path d="M9 12l2 2 4-4"/></svg>,
  },
  {
    id: 'prayer', label: 'Prayer', path: '/prayer',
    icon: <svg className={s.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>,
  },
  {
    id: 'chronicle', label: 'Chronicle', path: '/chronicle',
    icon: <svg className={s.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  },
  {
    id: 'themes', label: 'Themes', path: '/themes',
    icon: <svg className={s.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="5"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>,
  },
  {
    id: 'plans', label: 'Plans', path: '/plans',
    icon: <svg className={s.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  },
  {
    id: 'legacy', label: 'Legacy', path: '/legacy',
    icon: <svg className={s.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  },
  {
    id: 'insights', label: 'Insights', path: '/insights',
    icon: <svg className={s.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/></svg>,
  },
  {
    id: 'settings', label: 'Settings', path: '/settings',
    icon: <svg className={s.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  },
];

interface SidebarProps {
  deviceClass?: ChronicleDeviceClass;
}

export default function Sidebar({ deviceClass = 'desktop' }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { streakDays, currentPlanName, currentPlanDay, currentPlanTotal } = useAppStore();

  const progressPct = currentPlanTotal > 0 ? (currentPlanDay / currentPlanTotal) * 100 : 0;
  const isTablet = deviceClass === 'tablet';
  const isPhone = deviceClass === 'phone';

  return (
    <aside
      className={[
        s.sidebar,
        isTablet ? s.sidebarTablet : '',
        isPhone ? s.sidebarPhone : '',
      ].filter(Boolean).join(' ')}
      data-device-class={deviceClass}
    >
      <div className={s.logo}>
        <img className={s.logoIconImage} src="/chronicle-icon.png" alt="Chronicle" />
        <div className={s.logoText}>
          <h1>CHRONICLE</h1>
          <p>{isPhone ? 'Daily formation' : 'Spiritual Formation'}</p>
        </div>
      </div>

      <nav className={s.nav} aria-label="Primary">
        {NAV_ITEMS.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);
          return (
            <button
              key={item.id}
              type="button"
              className={`${s.navItem} ${isActive ? s.active : ''}`}
              onClick={() => navigate(item.path)}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className={s.bottom}>
        <div className={s.bottomLabel}>Current Plan</div>
        <div className={s.planName}>{currentPlanName}</div>
        <div className={s.planDay}>Day {currentPlanDay} of {currentPlanTotal}</div>
        <div className={s.progressBar}>
          <div className={s.progressFill} style={{ width: `${progressPct}%` }} />
        </div>
        <div className={s.bottomLabel} style={{ marginTop: 2 }}>{isTablet ? 'Current Streak' : 'Streak'}</div>
        <div className={s.streakRow}>
          <span className={s.streakFire}>🔥</span>
          <div>
            <div className={s.streakCount}>{streakDays} days</div>
            <div className={s.streakSub}>Keep showing up.</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
