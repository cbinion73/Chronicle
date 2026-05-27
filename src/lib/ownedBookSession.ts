import { getStudyDay } from './studyModules';
import type { OwnedBook } from '../types';

export function getOwnedBookCurrentDay(book: OwnedBook | null) {
  if (!book) return 1;
  return Math.max(1, book.studyState?.currentDay || 1);
}

export function getTodayDiscipleshipSnapshot(book: OwnedBook | null, fallbackModuleDay: number) {
  if (!book) return null;
  if (book.id === 'masterlife-book-1' || book.workflow === 'preserve-daily') {
    const moduleDay = getStudyDay('discipleship', fallbackModuleDay || getOwnedBookCurrentDay(book));
    return {
      day: moduleDay.day,
      title: moduleDay.title,
      phase: moduleDay.phase,
      scripture: moduleDay.scripture,
      focus: moduleDay.focus,
      summary: book.summary,
    };
  }

  const currentDay = getOwnedBookCurrentDay(book);
  const sourceDay = book.generatedPlan?.days?.find((entry) => entry.day === currentDay);
  return {
    day: currentDay,
    title: sourceDay?.title || book.generatedPlan?.title || book.title,
    phase: sourceDay?.phase || book.generatedPlan?.phases?.[0]?.label || 'Discipleship',
    scripture: sourceDay?.scripture || sourceDay?.dailyReading || '',
    focus: sourceDay?.focus || book.summary,
    summary: book.summary,
  };
}
