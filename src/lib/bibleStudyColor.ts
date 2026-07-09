import type { Chapter } from './scripture';
import { getChapterStrongsNumbers } from './bibleWordStudy';
import { FAMILY_IDS_BY_STRONGS, STUDY_COLOR_MODES, getTopicFamily, type ModeId, type TopicFamily, type TopicFamilyId } from './studyColorTaxonomy';

// Study Colors, rebuilt on Strong's numbers (see studyColorTaxonomy.ts for
// the verified word lists and REDESIGN.md for why). A verse's topic
// families are classified from the Strong's numbers actually present in
// it — translation-independent by construction, since the same
// underlying Greek/Hebrew word carries the tag regardless of which of
// Chronicle's 9 installed translations is on screen.
//
// Because the Strong's interlinear is word-position-aligned to the KJV
// specifically, word order doesn't line up with every other translation's
// phrasing — so unlike the old engine, this doesn't try to highlight an
// exact substring inside the displayed verse text. It classifies and
// colors the whole verse instead, which is the honest, robust thing to
// do across 9 translations rather than a fragile per-translation guess.
//
// Mode (stated / promise / warning) is a separate, much lighter pass:
// Strong's numbers tag words, not the speech-act of a sentence, so mode
// detection falls back to a small set of English grammatical/phrase
// markers on the displayed verse text. That makes it translation-
// sensitive and lower-confidence than the topic tagging — by design,
// not an oversight — so it only ever adjusts the ink color, never
// whether a verse is tagged at all.

export interface StudyColorHit {
  verse: number;
  familyIds: TopicFamilyId[];
  families: TopicFamily[];
  mode: ModeId;
  matchedStrongs: string[];
}

const WARNING_PATTERNS = [
  /\bwoe\b/i, /\bbeware\b/i, /\btake heed\b/i, /\bcursed?\b/i, /\blest\b/i,
  /\bwrath\b/i, /\bperish(es|ed)?\b/i, /\bjudg(e?ment|ed)\b/i, /\bdestruction\b/i,
  /\bcondemn/i, /\bdo not\b.*\bor\b/i,
];

const PROMISE_PATTERNS = [
  /\bi will\b/i, /\byou will\b/i, /\bthou shalt\b/i, /\bshall be\b/i,
  /\bshall come to pass\b/i, /\bpromis/i, /\bcovenant\b/i, /\bfor ?ever\b/i,
  /\beverlasting\b/i, /\bwill come\b/i, /\bit is written\b/i,
];

function detectMode(verseText: string, familyIds: TopicFamilyId[]): ModeId {
  if (familyIds.includes('prophecy-return')) return 'promise';
  const lower = verseText.toLowerCase();
  if (WARNING_PATTERNS.some((pattern) => pattern.test(lower))) return 'warning';
  if (PROMISE_PATTERNS.some((pattern) => pattern.test(lower))) return 'promise';
  return 'stated';
}

/** Every topic-tagged verse in a chapter, keyed by verse number. */
export async function getChapterStudyColors(book: string, chapter: number, chapterData?: Chapter): Promise<Map<number, StudyColorHit>> {
  const strongsByVerse = await getChapterStrongsNumbers(book, chapter);
  if (strongsByVerse.size === 0) return new Map();

  const textByVerse = new Map((chapterData?.verses || []).map((verse) => [verse.number, verse.text]));
  const result = new Map<number, StudyColorHit>();

  for (const [verseNum, strongsIds] of strongsByVerse) {
    const familyIdSet = new Set<TopicFamilyId>();
    const matched: string[] = [];
    for (const id of strongsIds) {
      const families = FAMILY_IDS_BY_STRONGS.get(id);
      if (!families) continue;
      matched.push(id);
      families.forEach((familyId) => familyIdSet.add(familyId));
    }
    if (familyIdSet.size === 0) continue;

    const familyIds = Array.from(familyIdSet);
    const mode = detectMode(textByVerse.get(verseNum) || '', familyIds);
    result.set(verseNum, {
      verse: verseNum,
      familyIds,
      families: familyIds.map(getTopicFamily),
      mode,
      matchedStrongs: matched,
    });
  }

  return result;
}

export function getModeInk(hit: StudyColorHit): string {
  const mode = STUDY_COLOR_MODES.find((entry) => entry.id === hit.mode);
  return mode?.ink || hit.families[0]?.ink || 'var(--text)';
}
