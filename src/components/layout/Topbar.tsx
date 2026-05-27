import { useEffect } from 'react';
import { useAppStore } from '../../store';
import type { ChronicleDeviceClass } from '../../lib/useResponsiveLayout';
import s from './Topbar.module.css';

interface Props {
  onSearch: () => void;
  onNewEntry: () => void;
  onToggleCompanion?: () => void;
  companionOpen?: boolean;
  deviceClass?: ChronicleDeviceClass;
}

export default function Topbar({
  onSearch,
  onNewEntry,
  onToggleCompanion,
  companionOpen = false,
  deviceClass = 'desktop',
}: Props) {
  const { theme, toggleTheme } = useAppStore();
  const showCompanionTrigger = deviceClass !== 'desktop';
  const searchLabel = deviceClass === 'phone'
    ? 'Search Chronicle...'
    : 'Search Scripture, themes, notes...';

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onSearch();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSearch]);

  return (
    <header className={s.topbar}>
      <button className={s.searchBar} onClick={onSearch} type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <span className={s.searchText}>{searchLabel}</span>
        <span className={s.searchShortcut}>⌘K</span>
      </button>
      <div className={s.buttons}>
        {showCompanionTrigger && (
          <button
            className={`${s.companionBtn} ${companionOpen ? s.companionBtnActive : ''}`}
            onClick={onToggleCompanion}
            type="button"
            aria-pressed={companionOpen}
            aria-label={companionOpen ? 'Hide Chronicle AI' : 'Open Chronicle AI'}
            title={companionOpen ? 'Hide Chronicle AI' : 'Open Chronicle AI'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3l1.7 4.6L18 9.3l-4.3 1.6L12 15.5l-1.7-4.6L6 9.3l4.3-1.7L12 3z"/>
              <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z"/>
            </svg>
            <span className={s.companionLabel}>{deviceClass === 'tablet' ? 'Companion' : 'AI'}</span>
          </button>
        )}
        {/* Quick capture */}
        <button
          className={s.iconBtn}
          onClick={onNewEntry}
          title="New Chronicle entry (⌘N)"
          style={{ position: 'relative' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <button className={s.iconBtn} title="Notifications">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
        </button>
        <button className={s.iconBtn} onClick={toggleTheme} title={theme === 'light' ? 'Dark mode' : 'Light mode'}>
          {theme === 'light' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          )}
        </button>
        <div className={s.avatar}>C</div>
      </div>
    </header>
  );
}
