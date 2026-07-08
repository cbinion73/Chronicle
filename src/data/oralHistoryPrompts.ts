// The Oral History (ROADMAP M19): the same excavation as the Archaeology
// (M18), pointed at someone else — a grandparent, a parent, a mentor.
// "This is the feature with a funeral": the stones here are often the
// only record of a person's walk that will ever exist. Prompts are
// phrased for an interviewer asking, not a keeper remembering.

export interface OralHistoryPrompt {
  id: string;
  icon: string;
  question: string;
  placeholder: string;
}

export const ORAL_HISTORY_PROMPTS: OralHistoryPrompt[] = [
  {
    id: 'conversion',
    icon: '🤝',
    question: 'Did they ever share a moment they first committed their life to Christ?',
    placeholder: 'What do they remember about it, in their own words?',
  },
  {
    id: 'baptism',
    icon: '💧',
    question: 'Were they baptized? What do they remember about it?',
    placeholder: 'Where, when, who was there?',
  },
  {
    id: 'calling',
    icon: '🧭',
    question: 'Did a calling or a purpose ever become clear to them?',
    placeholder: 'What became clear, and how?',
  },
  {
    id: 'hard-season',
    icon: '🕯️',
    question: 'Is there a hard season they came through — and how?',
    placeholder: 'What was it, and what carried them through it?',
  },
  {
    id: 'answered-prayer',
    icon: '🙏',
    question: 'Is there a prayer they remember God answering?',
    placeholder: 'What did they ask for, and what happened?',
  },
  {
    id: 'wisdom',
    icon: '📜',
    question: 'Is there something they\'d want passed down — a piece of wisdom, a verse, a way of living?',
    placeholder: 'What would they want remembered?',
  },
  {
    id: 'open-memory',
    icon: '🗝️',
    question: 'Is there any other memory of theirs worth keeping?',
    placeholder: 'Anything at all — nothing here has to be dramatic to matter.',
  },
];
