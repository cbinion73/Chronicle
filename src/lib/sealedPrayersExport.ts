import type { ChronicleEntry } from '../types';
import { downloadTextFile } from './chronicleExport';

// F1 (ROADMAP.md standing foundation): every feature's data must export
// to an open format. This one also has to respect the seal — an export
// must never leak a still-sealed prayer's body, or the seal means
// nothing the moment you back up your data.

export function buildSealedPrayersMarkdown(entries: ChronicleEntry[]): string {
  const sealed = entries.filter((entry) => entry.type === 'sealed');
  const sorted = [...sealed].sort((a, b) => (a.date < b.date ? 1 : -1));
  const body = sorted
    .map((entry) => {
      const seal = entry.sourceContext?.sealed;
      const heading = `## ${entry.title}`;
      const condition = seal?.unsealAt
        ? `Opens ${seal.unsealAt}`
        : `Opens when: ${seal?.eventLabel || 'unspecified'}`;
      const meta = `*Sealed ${seal?.sealedAt || entry.date} · ${condition}${seal?.opened ? ` · opened ${seal.openedAt}` : ''}*`;
      const content = seal?.opened ? entry.body : `[Still sealed — ${condition.toLowerCase()}]`;
      return `${heading}\n\n${meta}\n\n${content}\n`;
    })
    .join('\n---\n\n');
  return `# Sealed Prayers Export\n\n${sorted.length} prayer${sorted.length === 1 ? '' : 's'} · exported ${new Date().toLocaleDateString()}\n\nStill-sealed entries export as a placeholder, never their contents.\n\n---\n\n${body}`;
}

export function exportSealedPrayers(entries: ChronicleEntry[]) {
  downloadTextFile(
    `sealed-prayers-export-${new Date().toISOString().split('T')[0]}.md`,
    buildSealedPrayersMarkdown(entries),
    'text/markdown',
  );
}
