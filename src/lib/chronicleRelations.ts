import type { ChronicleEntry, ChronicleEntrySourceContext } from '../types';

type ChronicleContextTarget = {
  page?: ChronicleEntrySourceContext['page'];
  passage?: string;
  studyModuleId?: string;
  currentDay?: number;
  ownedBookId?: string;
  readerView?: 'study' | 'workbook';
  limit?: number;
};

function normalizePassage(value?: string) {
  return value?.trim().toLowerCase() || '';
}

function scoreEntry(entry: ChronicleEntry, target: ChronicleContextTarget) {
  let score = 0;
  const source = entry.sourceContext;
  const targetPassage = normalizePassage(target.passage);
  const entryPassage = normalizePassage(entry.passage || source?.passage);

  if (targetPassage && entryPassage && entryPassage === targetPassage) score += 50;
  if (source?.page && target.page && source.page === target.page) score += 25;

  if (target.studyModuleId && source?.studyModuleId === target.studyModuleId) score += 20;
  if (typeof target.currentDay === 'number' && source?.currentDay === target.currentDay) score += 20;
  if (target.ownedBookId && source?.ownedBookId === target.ownedBookId) score += 25;
  if (target.readerView && source?.readerView === target.readerView) score += 10;

  if (
    target.page === 'study'
    && source?.page === 'study'
    && source.studyModuleId === target.studyModuleId
    && source.currentDay === target.currentDay
  ) {
    score += 40;
  }

  if (
    target.page === 'discipleship'
    && source?.page === 'discipleship'
    && source.ownedBookId === target.ownedBookId
    && source.currentDay === target.currentDay
  ) {
    score += 40;
  }

  if (
    target.page === 'prayer'
    && source?.page === 'prayer'
    && (!targetPassage || normalizePassage(source.passage) === targetPassage)
  ) {
    score += 35;
  }

  return score;
}

export function getRelatedChronicleEntries(entries: ChronicleEntry[], target: ChronicleContextTarget) {
  const limit = target.limit || 4;
  return entries
    .map((entry) => ({ entry, score: scoreEntry(entry, target) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return right.entry.date.localeCompare(left.entry.date);
    })
    .slice(0, limit)
    .map(({ entry }) => entry);
}
