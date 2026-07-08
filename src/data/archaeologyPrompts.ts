// The Archaeology (ROADMAP M18): a guided backfill interview that
// excavates a keeper's prehistory into stones — the conversion, the
// baptism, the prayer answered decades before Chronicle existed. Most
// people arrive with thirty years of walk behind them, unrecorded; this
// is how the thread gets its beginning back.

export interface ArchaeologyPrompt {
  id: string;
  kind: 'growth' | 'prayer';
  growthKind?: string; // matches src/data/growthMarkers.ts ids, when kind === 'growth'
  icon: string;
  question: string;
  placeholder: string;
}

export const ARCHAEOLOGY_PROMPTS: ArchaeologyPrompt[] = [
  {
    id: 'conversion',
    kind: 'growth',
    growthKind: 'commitment',
    icon: '🤝',
    question: 'Is there a moment you first committed your life to Christ?',
    placeholder: 'What do you remember about that moment, even if it\'s hazy?',
  },
  {
    id: 'baptism',
    kind: 'growth',
    growthKind: 'baptism',
    icon: '💧',
    question: 'Were you baptized? Roughly when?',
    placeholder: 'Where was it, who was there, what do you remember?',
  },
  {
    id: 'calling',
    kind: 'growth',
    growthKind: 'calling',
    icon: '🧭',
    question: 'Has a calling ever become clear to you — even a small one?',
    placeholder: 'What became clear, and how?',
  },
  {
    id: 'conviction',
    kind: 'growth',
    growthKind: 'conviction',
    icon: '⚡',
    question: 'Was there a turning point — a moment of real conviction that changed you?',
    placeholder: 'What happened, and what changed after?',
  },
  {
    id: 'season-closed',
    kind: 'growth',
    growthKind: 'season-closed',
    icon: '🕯️',
    question: 'Was there a season of doubt or distance that eventually resolved?',
    placeholder: 'How did it resolve — what brought you back?',
  },
  {
    id: 'answered-prayer',
    kind: 'prayer',
    icon: '🙏',
    question: 'Is there a prayer God answered that you still remember, even years later?',
    placeholder: 'What did you ask for, and what happened?',
  },
];
