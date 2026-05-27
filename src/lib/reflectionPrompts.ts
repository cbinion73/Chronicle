import type { ReflectionPromptCard } from '../types';

interface ReflectionPromptInput {
  passage?: string;
  focus?: string;
  sourceLabel?: string;
  summary?: string;
}

function normalizeLine(value?: string) {
  return value?.trim().replace(/\s+/g, ' ') || '';
}

export function buildReflectionPrompts({
  passage,
  focus,
  sourceLabel,
  summary,
}: ReflectionPromptInput): ReflectionPromptCard[] {
  const reference = normalizeLine(passage) || 'this passage';
  const focusLine = normalizeLine(focus) || 'the part that is pressing on you most';
  const source = normalizeLine(sourceLabel) || 'this moment';
  const summaryLine = normalizeLine(summary) || focusLine;

  return [
    {
      id: 'notice',
      label: 'Notice',
      prompt: `What is the first thing ${reference} is bringing into the light for you in ${source}?`,
      followThrough: `Name one line, image, or tension from ${reference} that you do not want to rush past.`,
    },
    {
      id: 'understand',
      label: 'Understand',
      prompt: `What does ${reference} seem to be saying about God, people, or reality through this focus: ${focusLine}?`,
      followThrough: `Write one sentence that explains the heart of the passage in plain language.`,
    },
    {
      id: 'respond',
      label: 'Respond',
      prompt: `Where does ${summaryLine} ask for repentance, trust, courage, or obedience from you today?`,
      followThrough: 'Name one concrete response that would make this more than a good thought.',
    },
    {
      id: 'carry',
      label: 'Carry',
      prompt: `How do you want to carry ${reference} into prayer, conversation, or action before today ends?`,
      followThrough: 'Finish the sentence: "Because of this passage, today I will..."',
    },
  ];
}
