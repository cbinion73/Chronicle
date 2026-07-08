import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store';
import s from './Sidebar.module.css';
import type { NavTab } from '../../types';
import type { ChronicleDeviceClass } from '../../lib/useResponsiveLayout';
import { activeRegisterForPath } from '../../lib/activeRegister';
import chapelStyles from '../../styles/chapelRegister.module.css';
import manuscriptStyles from '../../styles/manuscriptRegister.module.css';
import stoneCourtStyles from '../../styles/stoneCourtRegister.module.css';

type NavItem = { id: NavTab; label: string; path: string; icon: React.ReactNode };

// Five rooms, five sidebar entries — everything else lives inside its
// room, reached from that room's own tab bar (SectionTabs), not from a
// persistent global list. A room is named for what a person does there,
// not for the feature that lives there.
const NAV_ITEMS: NavItem[] = [
  {
    id: 'today', label: 'The Daily Office', path: '/',
    icon: <svg className={s.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  },
  {
    id: 'bible', label: 'The Word', path: '/bible',
    icon: <svg className={s.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
  },
  {
    id: 'prayer', label: 'The Prayer Room', path: '/prayer',
    icon: <svg className={s.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>,
  },
  {
    id: 'thread', label: 'The Thread', path: '/thread',
    icon: <svg className={s.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  },
];

const SETTINGS_ITEM: NavItem = {
  id: 'settings', label: 'Settings', path: '/settings',
  icon: <svg className={s.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
};

const REGISTER_STYLES = {
  chapel: chapelStyles.chapelRegister,
  manuscript: manuscriptStyles.manuscriptRegister,
  stonecourt: stoneCourtStyles.stoneCourtRegister,
  ledger: '',
};

interface SidebarProps {
  deviceClass?: ChronicleDeviceClass;
}

export default function Sidebar({ deviceClass = 'desktop' }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentPlanName, currentPlanDay, currentPlanTotal } = useAppStore();

  const progressPct = currentPlanTotal > 0 ? (currentPlanDay / currentPlanTotal) * 100 : 0;
  const isTablet = deviceClass === 'tablet';
  const isPhone = deviceClass === 'phone';
  const register = activeRegisterForPath(location.pathname);

  function isItemActive(item: NavItem) {
    return item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
  }

  function renderItem(item: NavItem) {
    const isActive = isItemActive(item);
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
  }

  return (
    <aside
      className={[
        s.sidebar,
        isTablet ? s.sidebarTablet : '',
        isPhone ? s.sidebarPhone : '',
        REGISTER_STYLES[register],
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
        <div className={s.navGroup}>
          {NAV_ITEMS.map(renderItem)}
        </div>
        <div className={s.navGroup}>
          {renderItem(SETTINGS_ITEM)}
        </div>
      </nav>

      {/* No streaks, no fire, no guilt. The plan is a trellis, not a scoreboard —
          formation is measured in returns, and those live on the Thread. */}
      <div className={s.bottom}>
        <div className={s.bottomLabel}>Current Plan</div>
        <div className={s.planName}>{currentPlanName}</div>
        <div className={s.planDay}>Day {currentPlanDay} of {currentPlanTotal}</div>
        <div className={s.progressBar}>
          <div className={s.progressFill} style={{ width: `${progressPct}%` }} />
        </div>
      </div>
    </aside>
  );
}
