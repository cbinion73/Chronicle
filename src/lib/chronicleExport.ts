import type { ChronicleEntry } from '../types';

export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function buildChronicleMarkdown(entries: ChronicleEntry[]) {
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));
  const body = sorted
    .map((entry) => {
      const heading = `## ${entry.date} — ${entry.title}`;
      const meta = `*${entry.type}${entry.passage ? ` · ${entry.passage}` : ''}${entry.themes?.length ? ` · ${entry.themes.join(', ')}` : ''}*`;
      return `${heading}\n\n${meta}\n\n${entry.body}\n`;
    })
    .join('\n---\n\n');
  return `# Chronicle Export\n\n${sorted.length} entr${sorted.length === 1 ? 'y' : 'ies'} · exported ${new Date().toLocaleDateString()}\n\n---\n\n${body}`;
}

export function exportChronicleMarkdown(entries: ChronicleEntry[]) {
  downloadTextFile(
    `chronicle-export-${new Date().toISOString().split('T')[0]}.md`,
    buildChronicleMarkdown(entries),
    'text/markdown',
  );
}

function nowMonthDiff(start: Date, end: Date) {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

export function monthsSinceOldestEntry(entries: ChronicleEntry[]) {
  const oldestEntryDate = entries.reduce<Date | null>((oldest, entry) => {
    const candidate = new Date(`${entry.date}T12:00:00`);
    return !oldest || candidate < oldest ? candidate : oldest;
  }, null);
  return oldestEntryDate ? Math.max(1, nowMonthDiff(oldestEntryDate, new Date()) + 1) : 0;
}
