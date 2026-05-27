import type { Chapter } from './scripture';

export interface StudyColorCategory {
  id: string;
  label: string;
  color: string;
  shortLabel: string;
}

export interface StudyColorHit {
  category: StudyColorCategory;
  phrases: string[];
}

const CATEGORIES: Array<StudyColorCategory & {
  patterns: string[];
}> = [
  {
    id: 'gods-character',
    label: "God's Character",
    shortLabel: 'God',
    color: '#7c3aed',
    patterns: ['god', 'lord', 'father', 'light', 'life', 'truth', 'grace', 'mercy', 'glory', 'word'],
  },
  {
    id: 'identity-confession',
    label: 'Identity & Confession',
    shortLabel: 'Identity',
    color: '#2563eb',
    patterns: ['messiah', 'christ', 'son of god', 'lamb of god', 'king of israel', 'rabbi', 'prophet', 'word became flesh'],
  },
  {
    id: 'commands-invitation',
    label: 'Commands & Invitation',
    shortLabel: 'Invite',
    color: '#059669',
    patterns: ['follow me', 'come and see', 'behold', 'seek', 'believe', 'make straight'],
  },
  {
    id: 'promises-gospel',
    label: 'Promises & Gospel',
    shortLabel: 'Promise',
    color: '#d97706',
    patterns: ['gave the right', 'become children of god', 'grace for grace', 'eternal life', 'takes away the sin', 'heaven open'],
  },
  {
    id: 'warning-conflict',
    label: 'Warning & Conflict',
    shortLabel: 'Warning',
    color: '#dc2626',
    patterns: ['darkness', 'did not know', 'did not receive', 'sin', 'not the christ', 'not that light'],
  },
  {
    id: 'prayer-worship',
    label: 'Prayer & Worship',
    shortLabel: 'Worship',
    color: '#ca8a04',
    patterns: ['glory', 'worship', 'bless', 'praise', 'beheld his glory'],
  },
];

export function getChapterStudyColors(chapterData?: Chapter) {
  if (!chapterData) return new Map<number, StudyColorHit[]>();
  const byVerse = new Map<number, StudyColorHit[]>();

  for (const verse of chapterData.verses) {
    const lowered = verse.text.toLowerCase();
    const hits: StudyColorHit[] = [];

    for (const category of CATEGORIES) {
      const phrases = category.patterns.filter((pattern) => lowered.includes(pattern));
      if (phrases.length > 0) {
        hits.push({
          category,
          phrases,
        });
      }
    }

    if (hits.length > 0) byVerse.set(verse.number, hits);
  }

  return byVerse;
}
