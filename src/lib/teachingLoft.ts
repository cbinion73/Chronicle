import type { ChronicleEntry } from '../types';
import { downloadTextFile } from './chronicleExport';

// The Teaching Loft — turning a saved Study Council convening into a
// shareable outline for a small group or family devotional. This is the
// "Teach" pillar of Know/Understand/Live/Teach/Pass On. Deliberately no new
// AI call: every seat already wrote its paragraphs tagged and confidence-
// scored under the Source Ledger discipline, so a teaching outline is pure
// derivation over data Chronicle already has.

interface LedgerParagraph {
  tag: string | null;
  confidence: string | null;
  text: string;
}

interface CouncilSeatLike {
  id: string;
  name: string;
  paragraphs: LedgerParagraph[];
}

export interface TeachingOutline {
  title: string;
  passage?: string;
  question?: string;
  bigIdea: string | null;
  keyInsights: Array<{ seat: string; tag: string; text: string }>;
  disputedNotes: Array<{ seat: string; text: string }>;
  discussionPrompts: string[];
  closingPrayer: string;
}

function seatsOf(entry: ChronicleEntry): CouncilSeatLike[] {
  return entry.sourceContext?.studyCouncil?.seats || [];
}

export function hasTeachingMaterial(entry: ChronicleEntry): boolean {
  return entry.type === 'study' && Boolean(entry.sourceContext?.studyCouncil?.seats?.length);
}

export function deriveTeachingOutline(entry: ChronicleEntry): TeachingOutline {
  const seats = seatsOf(entry);
  const allParagraphs = seats.flatMap((seat) =>
    seat.paragraphs.map((paragraph) => ({ seat: seat.name, ...paragraph })),
  );

  const settledScripture = allParagraphs.find((p) => p.tag === 'SCRIPTURE' && p.confidence === 'settled');
  const anyScripture = allParagraphs.find((p) => p.tag === 'SCRIPTURE');
  const bigIdea = (settledScripture || anyScripture || allParagraphs[0])?.text || null;

  const isDisputed = (p: { confidence: string | null }) => p.confidence === 'disputed' || p.confidence === 'minority';

  const keyInsights = allParagraphs
    .filter((p) => p.tag === 'SCRIPTURE' || p.tag === 'INTERPRETATION')
    .filter((p) => p.text !== bigIdea && !isDisputed(p))
    .slice(0, 5)
    .map((p) => ({ seat: p.seat, tag: p.tag || 'INTERPRETATION', text: p.text }));

  const disputedNotes = allParagraphs
    .filter(isDisputed)
    .map((p) => ({ seat: p.seat, text: p.text }));

  const discussionPrompts = allParagraphs
    .filter((p) => p.tag === 'APPLICATION')
    .map((p) => p.text);

  const passage = entry.passage;
  const closingPrayer = passage
    ? `Close in prayer, asking God to help your group live out ${passage} together this week.`
    : 'Close in prayer, asking God to help your group live out what you\'ve studied together this week.';

  return {
    title: entry.title,
    passage,
    question: entry.sourceContext?.studyCouncil?.question,
    bigIdea,
    keyInsights,
    disputedNotes,
    discussionPrompts,
    closingPrayer,
  };
}

export function buildTeachingOutlineMarkdown(outline: TeachingOutline): string {
  const lines: string[] = [];
  lines.push(`# ${outline.title}`);
  if (outline.passage) lines.push(`*${outline.passage}*`);
  if (outline.question) lines.push(`\n**Guiding question:** ${outline.question}`);
  if (outline.bigIdea) lines.push(`\n## Big Idea\n\n${outline.bigIdea}`);
  if (outline.keyInsights.length) {
    lines.push('\n## Key Insights');
    for (const insight of outline.keyInsights) {
      lines.push(`\n- **[${insight.tag}, ${insight.seat}]** ${insight.text}`);
    }
  }
  if (outline.disputedNotes.length) {
    lines.push('\n## Where Scholars Disagree');
    for (const note of outline.disputedNotes) {
      lines.push(`\n- **[${note.seat}]** ${note.text}`);
    }
  }
  if (outline.discussionPrompts.length) {
    lines.push('\n## Discussion & Application');
    for (const prompt of outline.discussionPrompts) {
      lines.push(`\n- ${prompt}`);
    }
  }
  lines.push(`\n## Closing Prayer\n\n${outline.closingPrayer}`);
  return lines.join('\n');
}

export function exportTeachingOutline(outline: TeachingOutline) {
  const slug = outline.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  downloadTextFile(
    `teaching-outline-${slug || 'untitled'}.md`,
    buildTeachingOutlineMarkdown(outline),
    'text/markdown',
  );
}
