// The Book, Typeset (ROADMAP M20) — print-grade PDF export. "Print-grade"
// here means real page breaks driven by CSS (@page, page-break-before per
// chapter/part), rendered through the browser's own print engine via
// window.print() → Save as PDF. That produces better paginated, properly
// margined output than a client-side PDF-generation library would for
// this kind of long-form reflowable text, without adding a new dependency.
//
// Honesty note: the browser's own print pagination (driven by paper size
// and margins) is independent of Chronicle's in-app page count shown on
// /thread/story (Legacy.tsx) — the two "page N of M" figures will not
// match, and that's expected, not a bug.

import type { ChronicleEntry } from '../types';
import { deriveBookParts } from './bookPagination';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
}

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function openLegacyMemoirPrintWindow(entries: ChronicleEntry[], bookTitle: string): Window | null {
  const parts = deriveBookParts(entries);
  const printWindow = window.open('', '_blank');
  if (!printWindow) return null;

  const partsHtml = parts
    .map((part) => {
      const chaptersHtml = part.chapters
        .map((chapter, chapterIndex) => {
          const entriesHtml = chapter.entries
            .map((entry) => `
              <div class="entry">
                <div class="entry-meta">${formatDate(entry.date)}</div>
                <div class="entry-body">${escapeHtml(entry.body)}</div>
              </div>`)
            .join('\n');
          return `
            <section class="chapter" style="${chapterIndex > 0 ? 'page-break-before: always;' : ''}">
              <h2>${escapeHtml(chapter.title)}</h2>
              ${entriesHtml}
            </section>`;
        })
        .join('\n');
      return `
        <section class="part">
          <div class="part-break"></div>
          <h1 class="part-title">Part ${part.roman}<span class="part-year">${part.year}</span></h1>
          ${chaptersHtml}
        </section>`;
    })
    .join('\n');

  printWindow.document.write(`<!doctype html>
<html>
<head>
<title>${escapeHtml(bookTitle)}</title>
<meta charset="utf-8" />
<style>
  @page { margin: 1in; }
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 680px; margin: 48px auto; color: #1a1a1a; line-height: 1.7; }
  h1.cover { font-size: 28px; text-align: center; }
  .subtitle { text-align: center; font-style: italic; color: #555; margin-bottom: 48px; }
  .part { }
  .part-break { page-break-before: always; }
  .part:first-child .part-break { page-break-before: avoid; }
  .part-title { font-size: 22px; text-align: center; letter-spacing: 0.08em; text-transform: uppercase; margin-top: 0; }
  .part-year { display: block; font-size: 13px; letter-spacing: normal; text-transform: none; color: #777; margin-top: 4px; }
  .chapter h2 { font-size: 18px; margin-top: 40px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  .entry { margin-top: 20px; }
  .entry-meta { font-size: 11px; color: #888; margin-bottom: 4px; }
  .entry-body { white-space: pre-line; }
  @media print { body { margin: 0 24px; } }
</style>
</head>
<body>
  <h1 class="cover">${escapeHtml(bookTitle)}</h1>
  <div class="subtitle">A life walked with God</div>
  ${partsHtml}
</body>
</html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  return printWindow;
}
