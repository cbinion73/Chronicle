export const CHRONICLE_APP_VERSION = '0.1.0';
export const CHRONICLE_BUILD_LABEL = 'Launch Candidate 1';
export const CHRONICLE_TAGLINE = 'Local-first Bible study and spiritual formation.';
export const CHRONICLE_MOTTO = 'You came carrying yourself. You left carrying Him.';

export const CHRONICLE_ONBOARDING_STEPS = [
  {
    title: 'Open Today',
    description: 'Start from the live formation thread, recurring rhythms, and the current study handoff.',
    path: '/',
    actionLabel: 'Open Today',
  },
  {
    title: 'Study Scripture',
    description: 'Use Bible for themes, echoes, Greek, guided synthesis, and chapter-level reflection.',
    path: '/bible',
    actionLabel: 'Open Bible',
  },
  {
    title: 'Import a Book',
    description: 'Bring in a discipleship PDF, run OCR, and let Chronicle shape it into a daily study path.',
    path: '/settings',
    actionLabel: 'Open Study Imports',
    settingsCategory: 'data',
  },
  {
    title: 'Pray and Remember',
    description: 'Carry requests, record answers, and let Chronicle keep the thread of what God is doing.',
    path: '/prayer',
    actionLabel: 'Open Prayer',
  },
] as const;
