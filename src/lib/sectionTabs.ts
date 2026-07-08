import type { SectionTab } from '../components/ui/SectionTabs';

// One tab list per main room, shared by every page inside that room so
// the same sub-navigation shows up consistently regardless of which
// sub-page a person lands on. Kept centrally rather than duplicated
// per-file so the room's page inventory can't drift between them.
export const OFFICE_TABS: SectionTab[] = [
  { label: 'The Daily Office', path: '/' },
  { label: 'My Rule of Life', path: '/rule' },
];

export const WORD_TABS: SectionTab[] = [
  { label: 'Read', path: '/bible' },
  { label: 'Daily Study', path: '/study' },
  { label: 'Discipleship', path: '/discipleship' },
  { label: 'Reading Plans', path: '/plans' },
  { label: 'Themes', path: '/themes' },
  { label: 'Memory', path: '/memory' },
  { label: 'Explore', path: '/explore' },
];

export const PRAYER_TABS: SectionTab[] = [
  { label: 'The Prayer Room', path: '/prayer' },
  { label: 'Question Lab', path: '/questions' },
  { label: 'Lament', path: '/prayer/lament' },
  { label: 'Sealed Prayers', path: '/prayer/sealed' },
];

// The Thread's own altitude tab bar (Thread.tsx) predates this shared
// component and is left as its own hand-rolled implementation — it has
// route-param-driven view switching this generic component doesn't
// need to replicate. This list exists so the Heritage Room (a genuinely
// separate route/page) can offer the same tab set pointing back in.
export const THREAD_TABS: SectionTab[] = [
  { label: 'Record', path: '/thread' },
  { label: 'Answered Light', path: '/thread/light' },
  { label: 'Growth', path: '/thread/growth' },
  { label: 'Story', path: '/thread/story' },
  { label: 'Patterns', path: '/thread/patterns' },
  { label: 'Heritage Room', path: '/heritage' },
];
