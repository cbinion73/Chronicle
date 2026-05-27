import type {
  ChronicleBookAssetMap,
  ChronicleManagedAssetRef,
  ChronicleSourceAssetRef,
  OwnedBook,
  OwnedBookPageSlice,
  OwnedBookPlanDay,
  OwnedBookStudyDayEntry,
  OwnedBookWorkbookOverlay,
} from '../types';

export const CHRONICLE_OWNED_BOOK_SCHEMA_VERSION = 2;
export const CHRONICLE_LIBRARY_MANIFEST_SCHEMA_VERSION = 1;
export const CHRONICLE_BIBLE_LIBRARY_MANIFEST_SCHEMA_VERSION = 2;

function slugPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'item';
}

export function buildDayId(bookId: string, day: number) {
  return `${bookId}:day:${day}`;
}

export function buildPageSliceId(bookId: string, day: number, slice: Partial<OwnedBookPageSlice>, index: number) {
  return `${buildDayId(bookId, day)}:slice:${slice.pageNumber || index + 1}:${slugPart(slice.label || `slice-${index + 1}`)}`;
}

export function buildOverlayId(bookId: string, day: number, overlay: Partial<OwnedBookWorkbookOverlay>, index: number) {
  return `${buildDayId(bookId, day)}:overlay:${overlay.pageNumber || 0}:${overlay.key || `field-${index + 1}`}`;
}

export function buildDayEntryId(bookId: string, day: number) {
  return `${buildDayId(bookId, day)}:entry`;
}

export function buildAnswerIds(bookId: string, day: number, entry: OwnedBookStudyDayEntry) {
  const next: Record<string, string> = { ...(entry.answerIdsByField || {}) };
  for (const key of Object.keys(entry)) {
    if (key === 'id' || key === 'updatedAt' || key === 'answerIdsByField') continue;
    if (!next[key]) next[key] = `${buildDayEntryId(bookId, day)}:${slugPart(key)}`;
  }
  return next;
}

export function makeSourceAssetRef(bookId: string, fileName: string, originalPath?: string, kind: ChronicleSourceAssetRef['kind'] = 'external-pdf'): ChronicleSourceAssetRef {
  return {
    id: `${bookId}:source:${slugPart(fileName || 'pdf')}`,
    kind,
    fileName,
    originalPath,
  };
}

export function makeManagedAssetRef(bookId: string, kind: ChronicleManagedAssetRef['kind'], relativePath: string): ChronicleManagedAssetRef {
  return {
    id: `${bookId}:managed:${kind}`,
    kind,
    relativePath,
  };
}

export function normalizeOwnedBookDay(bookId: string, day: OwnedBookPlanDay): OwnedBookPlanDay {
  const dayId = day.id || buildDayId(bookId, day.day);
  return {
    ...day,
    id: dayId,
    sourcePageSlices: (day.sourcePageSlices || []).map((slice, index) => ({
      ...slice,
      id: slice.id || buildPageSliceId(bookId, day.day, slice, index),
    })),
    workbookOverlays: (day.workbookOverlays || []).map((overlay, index) => ({
      ...overlay,
      id: overlay.id || buildOverlayId(bookId, day.day, overlay, index),
    })),
  };
}

export function normalizeBookAssets(book: Partial<OwnedBook>, assetMap?: ChronicleBookAssetMap | null) {
  if (assetMap?.managed?.length || assetMap?.source) return assetMap;
  const managed: ChronicleManagedAssetRef[] = [];
  if (typeof book.sourcePath === 'string' && book.sourcePath.includes('/data/')) {
    managed.push(makeManagedAssetRef(book.id || 'book', 'imported-pdf', book.sourcePath));
  }
  if (typeof book.textPath === 'string' && book.textPath.length > 0) {
    managed.push(makeManagedAssetRef(book.id || 'book', 'ocr-text', book.textPath));
  }
  const source = typeof book.sourcePath === 'string' && !book.sourcePath.includes('/data/')
    ? makeSourceAssetRef(book.id || 'book', book.sourcePath.split('/').pop() || 'source.pdf', book.sourcePath)
    : undefined;
  return { source, managed };
}

export function normalizeOwnedBook(book: OwnedBook): OwnedBook {
  const assets = normalizeBookAssets(book, book.assets);
  const generatedPlan = book.generatedPlan
    ? {
        ...book.generatedPlan,
        days: (book.generatedPlan.days || []).map((day) => normalizeOwnedBookDay(book.id, day)),
      }
    : undefined;
  const entriesByDay = Object.fromEntries(
    Object.entries(book.studyState?.entriesByDay || {}).map(([dayKey, entry]) => {
      const dayNumber = Number(dayKey) || 1;
      const normalizedEntry: OwnedBookStudyDayEntry = {
        ...entry,
        id: entry.id || buildDayEntryId(book.id, dayNumber),
        answerIdsByField: buildAnswerIds(book.id, dayNumber, entry),
      };
      return [dayKey, normalizedEntry];
    }),
  );

  return {
    ...book,
    schemaVersion: CHRONICLE_OWNED_BOOK_SCHEMA_VERSION,
    recordId: book.recordId || book.id,
    assets,
    generatedPlan,
    studyState: book.studyState
      ? {
          ...book.studyState,
          entriesByDay,
        }
      : book.studyState,
  };
}
