import { useMemo, useState } from 'react';
import SectionTabs from '../components/ui/SectionTabs';
import { CANONICAL_BOOKS } from '../data/dailyScripturePlans';
import { WORD_TABS } from '../lib/sectionTabs';
import { useLocalDateKey } from '../lib/useLocalDateKey';
import {
  allTimeChapterCounts,
  chapterKey,
  completedChapterKeys,
  completionEntriesForChapter,
  createReadingCompletionEntry,
  readingCompletionFromEntry,
} from '../lib/readingHistory';
import { useAppStore } from '../store';
import { useToastStore } from '../store/toastStore';
import { localDateKey } from '../lib/dailyScripture';
import manuscriptStyles from '../styles/manuscriptRegister.module.css';

type ReadingLogView = 'year' | 'all-time';

const cardStyle = {
  background: 'var(--card-bg)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  boxShadow: 'var(--shadow)',
} as const;

function repeatReadingOccurrenceId() {
  return `repeat-${Date.now()}`;
}

export default function ReadingLog() {
  const { chronicleEntries, addChronicleEntry, deleteChronicleEntry } = useAppStore();
  const { addToast } = useToastStore();
  const today = useLocalDateKey();
  const currentYear = Number(today.slice(0, 4));
  const [view, setView] = useState<ReadingLogView>('year');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(() => new Set());
  const availableYears = useMemo(() => {
    const years = new Set([currentYear, selectedYear]);
    chronicleEntries.forEach((entry) => { const completion = readingCompletionFromEntry(entry); if (completion) years.add(completion.year); });
    return [...years].sort((left, right) => right - left);
  }, [chronicleEntries, currentYear, selectedYear]);
  const completed = useMemo(() => completedChapterKeys(chronicleEntries, selectedYear), [chronicleEntries, selectedYear]);
  const leaders = useMemo(() => allTimeChapterCounts(chronicleEntries), [chronicleEntries]);

  const toggleChapter = (book: string, chapter: number) => {
    const key = chapterKey(book, chapter);
    const pendingKey = `${selectedYear}:${key}`;
    if (pendingKeys.has(pendingKey)) return;
    const existing = completionEntriesForChapter(chronicleEntries, selectedYear, book, chapter);
    const actionDate = selectedYear === currentYear ? localDateKey() : `${selectedYear}-01-01`;
    setPendingKeys((current) => new Set(current).add(pendingKey));
    const operation = existing.length > 0
      ? Promise.all(existing.map((entry) => deleteChronicleEntry(entry.id))).then(() => undefined)
      : addChronicleEntry(createReadingCompletionEntry(book, chapter, actionDate));
    void operation
      .then(() => addToast(`${book} ${chapter} ${existing.length ? 'removed from' : 'added to'} the ${selectedYear} checklist.`, 'success'))
      .catch(() => addToast('Chronicle could not update the reading record.', 'warning'))
      .finally(() => setPendingKeys((current) => { const next = new Set(current); next.delete(pendingKey); return next; }));
  };

  const logAnotherReading = (book: string, chapter: number) => {
    const actionDate = localDateKey();
    const key = `repeat:${chapterKey(book, chapter)}`;
    if (pendingKeys.has(key)) return;
    setPendingKeys((current) => new Set(current).add(key));
    void addChronicleEntry(createReadingCompletionEntry(book, chapter, actionDate, undefined, repeatReadingOccurrenceId()))
      .then(() => addToast(`Added another reading of ${book} ${chapter}.`, 'success'))
      .catch(() => addToast('Chronicle could not add that reading.', 'warning'))
      .finally(() => setPendingKeys((current) => { const next = new Set(current); next.delete(key); return next; }));
  };

  return (
    <div className={manuscriptStyles.manuscriptRegister} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      <SectionTabs tabs={WORD_TABS} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '22px 24px 40px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent-amber)', marginBottom: 5 }}>The Word</div>
              <h1 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 30, color: 'var(--text)' }}>Reading Record</h1>
              <p style={{ margin: '7px 0 0', color: 'var(--text-sub)', fontSize: 13 }}>An explicit, synced record of the chapters you have actually read.</p>
            </div>
            <div style={{ display: 'flex', padding: 3, border: '1px solid var(--border)', borderRadius: 9, background: 'var(--card-inner)' }}>
              {([['year', 'Yearly Checklist'], ['all-time', 'All-Time Leaders']] as const).map(([id, label]) => (
                <button key={id} onClick={() => setView(id)} style={{ border: 0, borderRadius: 7, padding: '7px 11px', background: view === id ? 'var(--accent-blue)' : 'transparent', color: view === id ? 'white' : 'var(--text-sub)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{label}</button>
              ))}
            </div>
          </div>

          {view === 'year' ? (
            <>
              <section style={{ ...cardStyle, padding: '16px 18px', marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
                  <strong style={{ fontSize: 15, color: 'var(--text)' }}>{completed.size.toLocaleString()} of 1,189 chapters</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{Math.round((completed.size / 1189) * 100)}% read</span>
                    <select aria-label="Checklist year" value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))} style={{ padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--card-inner)', color: 'var(--text)', fontWeight: 700 }}>
                      {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ height: 7, marginTop: 10, borderRadius: 5, overflow: 'hidden', background: 'var(--border)' }}><div style={{ height: '100%', width: `${(completed.size / 1189) * 100}%`, background: 'var(--accent-blue)' }} /></div>
              </section>
              <div style={{ display: 'grid', gap: 10 }}>
                {CANONICAL_BOOKS.map(([book, chapterCount]) => {
                  const bookRead = Array.from({ length: chapterCount }, (_, index) => completed.has(chapterKey(book, index + 1))).filter(Boolean).length;
                  return (
                    <details key={book} style={{ ...cardStyle, padding: '0 16px' }} open={bookRead > 0 && bookRead < chapterCount}>
                      <summary style={{ padding: '13px 0', cursor: 'pointer', color: 'var(--text)', fontSize: 13, fontWeight: 700 }}>
                        {book} <span style={{ float: 'right', color: 'var(--text-muted)', fontWeight: 500 }}>{bookRead}/{chapterCount}</span>
                      </summary>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(54px, 1fr))', gap: 7, padding: '2px 0 16px' }}>
                        {Array.from({ length: chapterCount }, (_, index) => {
                          const chapter = index + 1;
                          const checked = completed.has(chapterKey(book, chapter));
                          return (
                            <label key={chapter} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 8px', borderRadius: 7, border: `1px solid ${checked ? 'var(--accent-blue)' : 'var(--border)'}`, background: checked ? 'var(--accent-blue-light)' : 'var(--card-inner)', color: 'var(--text)', fontSize: 11, cursor: 'pointer' }}>
                              <input type="checkbox" checked={checked} disabled={pendingKeys.has(`${selectedYear}:${chapterKey(book, chapter)}`)} onChange={() => toggleChapter(book, chapter)} aria-label={`${book} ${chapter} read in ${selectedYear}`} />
                              {chapter}
                            </label>
                          );
                        })}
                      </div>
                    </details>
                  );
                })}
              </div>
            </>
          ) : (
            <section style={{ ...cardStyle, overflow: 'hidden' }}>
              <div style={{ padding: '15px 18px', borderBottom: '1px solid var(--border)' }}>
                <strong style={{ color: 'var(--text)' }}>Most-read chapters</strong>
                <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>Every explicit completion counts, including repeat readings.</div>
              </div>
              {leaders.length === 0 ? (
                <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Check off a chapter to begin your all-time record.</div>
              ) : leaders.map((item, index) => (
                <div key={chapterKey(item.book, item.chapter)} style={{ display: 'grid', gridTemplateColumns: '36px 1fr auto auto', gap: 12, alignItems: 'center', padding: '12px 18px', borderBottom: index < leaders.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{index + 1}</span>
                  <strong style={{ color: 'var(--text)', fontSize: 13 }}>{item.book} {item.chapter}</strong>
                  <span style={{ color: 'var(--accent-blue)', fontSize: 12, fontWeight: 700 }}>{item.count} {item.count === 1 ? 'reading' : 'readings'}</span>
                  <button disabled={pendingKeys.has(`repeat:${chapterKey(item.book, item.chapter)}`)} onClick={() => logAnotherReading(item.book, item.chapter)} style={{ border: '1px solid var(--border)', borderRadius: 7, padding: '5px 8px', background: 'var(--card-inner)', color: 'var(--text)', fontSize: 11, cursor: 'pointer' }}>+ Read again</button>
                </div>
              ))}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
