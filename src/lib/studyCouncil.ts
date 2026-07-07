// The Study Council — client side. Fetches the five-seat response and parses
// the Source Ledger tags each seat is instructed to use, so the UI can never
// render an AI claim without knowing (and showing) what kind of claim it is.

export type SourceTag = 'SCRIPTURE' | 'TEXT' | 'LANGUAGE' | 'HISTORY' | 'INTERPRETATION' | 'APPLICATION';

export type Confidence = 'settled' | 'broadly held' | 'disputed' | 'minority' | 'speculative';

export interface LedgerParagraph {
  tag: SourceTag | null;
  confidence: Confidence | null;
  text: string;
}

export interface CouncilSeat {
  id: string;
  name: string;
  paragraphs: LedgerParagraph[];
}

const TAG_PATTERN = /^\[(SCRIPTURE|TEXT|LANGUAGE|HISTORY|INTERPRETATION|APPLICATION)\]\s*/i;
const CONFIDENCE_PATTERN = /\((settled|broadly held|disputed|minority|speculative)\)\s*$/i;

// Splits a seat's raw text into tagged paragraphs. A paragraph missing a
// recognized tag is still shown (never silently dropped) with tag: null —
// the UI renders that visibly as "untyped," which is itself useful signal
// that the model didn't follow the Ledger discipline for that sentence.
export function parseLedgerParagraphs(raw: string): LedgerParagraph[] {
  const blocks = raw.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  return blocks.map((block) => {
    const tagMatch = block.match(TAG_PATTERN);
    const tag = tagMatch ? (tagMatch[1].toUpperCase() as SourceTag) : null;
    let rest = tagMatch ? block.slice(tagMatch[0].length) : block;
    const confidenceMatch = rest.match(CONFIDENCE_PATTERN);
    const confidence = confidenceMatch ? (confidenceMatch[1].toLowerCase() as Confidence) : null;
    if (confidenceMatch) rest = rest.slice(0, confidenceMatch.index).trim();
    return { tag, confidence, text: rest.trim() };
  });
}

export async function fetchStudyCouncil(input: { passage: string; passageText?: string; question?: string }): Promise<CouncilSeat[]> {
  const response = await fetch('/api/ai/study-council', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await response.json() as { seats?: Array<{ id: string; name: string; text: string }>; error?: { errmsg?: string } };
  if (!response.ok || !payload.seats) {
    throw new Error(payload.error?.errmsg || 'The Study Council could not convene right now.');
  }
  return payload.seats.map((seat) => ({ id: seat.id, name: seat.name, paragraphs: parseLedgerParagraphs(seat.text) }));
}
