import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SectionTabs from '../components/ui/SectionTabs';
import { WORD_TABS } from '../lib/sectionTabs';
import { getBibleNavigationTarget } from '../lib/scriptureReference';
import { useAppStore } from '../store';
import { useToastStore } from '../store/toastStore';
import type { ChronicleEntry } from '../types';
import manuscriptStyles from '../styles/manuscriptRegister.module.css';
import s from './SermonNotes.module.css';

const DRAFT_KEY = 'chronicle-sermon-notes-draft-v1';
const STRUCTURED_MARKER = '<!-- chronicle-sermon-notes:';

interface SermonDraft {
  title: string;
  preacher: string;
  church: string;
  date: string;
  passage: string;
  bigIdea: string;
  keyPoints: string;
  takeaways: string;
  applications: string;
  finalTakeaway: string;
  notes: string;
}

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function emptyDraft(): SermonDraft {
  return {
    title: '',
    preacher: '',
    church: '',
    date: today(),
    passage: '',
    bigIdea: '',
    keyPoints: '',
    takeaways: '',
    applications: '',
    finalTakeaway: '',
    notes: '',
  };
}

function serializeDraft(draft: SermonDraft) {
  const readable = [
    `Preacher: ${draft.preacher.trim() || 'Not recorded'}`,
    `Church: ${draft.church.trim() || 'Not recorded'}`,
    '',
    '## Big Idea',
    draft.bigIdea.trim(),
    '',
    '## Key Points',
    draft.keyPoints.trim(),
    '',
    '## Takeaways',
    draft.takeaways.trim(),
    '',
    '## Applications',
    draft.applications.trim(),
    '',
    '## Final Takeaway',
    draft.finalTakeaway.trim(),
    '',
    '## Notes',
    draft.notes.trim(),
  ].join('\n').trim();
  return `${readable}\n\n${STRUCTURED_MARKER}${encodeURIComponent(JSON.stringify(draft))} -->`;
}

function section(body: string, heading: string, nextHeading?: string) {
  const headingLine = new RegExp(`^## ${heading}$`, 'gm');
  const match = headingLine.exec(body);
  if (!match) return '';
  const contentStart = match.index + match[0].length;
  let end = body.indexOf(STRUCTURED_MARKER, contentStart);
  if (nextHeading) {
    const nextLine = new RegExp(`^## ${nextHeading}$`, 'gm');
    nextLine.lastIndex = contentStart;
    const nextMatch = nextLine.exec(body);
    if (nextMatch) end = end < 0 ? nextMatch.index : Math.min(end, nextMatch.index);
  }
  return body.slice(contentStart, end < 0 ? body.length : end).trim();
}

function draftFromEntry(entry: ChronicleEntry): SermonDraft {
  const markerStart = entry.body.indexOf(STRUCTURED_MARKER);
  if (markerStart >= 0) {
    const encodedStart = markerStart + STRUCTURED_MARKER.length;
    const markerEnd = entry.body.indexOf(' -->', encodedStart);
    if (markerEnd >= 0) {
      try {
        return normalizeDraft(JSON.parse(decodeURIComponent(entry.body.slice(encodedStart, markerEnd))), entry.date);
      } catch {
        // Fall through to the readable legacy format.
      }
    }
  }
  return {
    title: entry.title,
    preacher: entry.body.match(/^Preacher:\s*(.+)$/m)?.[1]?.replace(/^Not recorded$/, '') || '',
    church: entry.body.match(/^Church:\s*(.+)$/m)?.[1]?.replace(/^Not recorded$/, '') || '',
    date: entry.date,
    passage: entry.passage || '',
    bigIdea: section(entry.body, 'Big Idea', section(entry.body, 'Key Points') ? 'Key Points' : 'Notes'),
    keyPoints: section(entry.body, 'Key Points', 'Takeaways'),
    takeaways: section(entry.body, 'Takeaways', 'Applications'),
    applications: section(entry.body, 'Applications', 'Final Takeaway') || section(entry.body, 'Personal Response', 'Prayer'),
    finalTakeaway: section(entry.body, 'Final Takeaway', 'Notes') || section(entry.body, 'Prayer'),
    notes: section(entry.body, 'Notes', entry.body.includes('## Personal Response') ? 'Personal Response' : undefined),
  };
}

function normalizeDraft(value: unknown, fallbackDate = today()): SermonDraft {
  const candidate = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const text = (field: string) => typeof candidate[field] === 'string' ? candidate[field] : '';
  return {
    title: text('title'),
    preacher: text('preacher'),
    church: text('church'),
    date: text('date') || fallbackDate,
    passage: text('passage'),
    bigIdea: text('bigIdea'),
    keyPoints: text('keyPoints'),
    takeaways: text('takeaways'),
    applications: text('applications') || text('response'),
    finalTakeaway: text('finalTakeaway') || text('prayer'),
    notes: text('notes'),
  };
}

interface StoredEditorState {
  draft: SermonDraft;
  editingId: string | null;
  resumeDraft: SermonDraft | null;
}

function readStoredEditor(): StoredEditorState {
  if (typeof window === 'undefined') return { draft: emptyDraft(), editingId: null, resumeDraft: null };
  try {
    const stored = window.localStorage.getItem(DRAFT_KEY);
    if (!stored) return { draft: emptyDraft(), editingId: null, resumeDraft: null };
    const parsed = JSON.parse(stored) as Partial<StoredEditorState>;
    if ('draft' in parsed) {
      return {
        draft: normalizeDraft(parsed.draft),
        editingId: typeof parsed.editingId === 'string' ? parsed.editingId : null,
        resumeDraft: parsed.resumeDraft ? normalizeDraft(parsed.resumeDraft) : null,
      };
    }
    return { draft: normalizeDraft(parsed), editingId: null, resumeDraft: null };
  } catch {
    return { draft: emptyDraft(), editingId: null, resumeDraft: null };
  }
}

function hasMeaningfulDraft(draft: SermonDraft) {
  return Boolean(draft.title.trim() || draft.preacher.trim() || draft.church.trim() || draft.passage.trim()
    || draft.bigIdea.trim() || draft.keyPoints.trim() || draft.takeaways.trim() || draft.applications.trim()
    || draft.finalTakeaway.trim() || draft.notes.trim());
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return 'Date not recorded';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function SermonNotes() {
  const navigate = useNavigate();
  const { chronicleEntries, addChronicleEntry, updateChronicleEntry, deleteChronicleEntry, setBibleView } = useAppStore();
  const addToast = useToastStore((state) => state.addToast);
  const [initialEditor] = useState(readStoredEditor);
  const [draft, setDraft] = useState<SermonDraft>(initialEditor.draft);
  const [editingId, setEditingId] = useState<string | null>(initialEditor.editingId);
  const [resumeDraft, setResumeDraft] = useState<SermonDraft | null>(initialEditor.resumeDraft);
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [draftStorageAvailable, setDraftStorageAvailable] = useState(true);
  const draftStorageAvailableRef = useRef(true);
  const [isSaving, setIsSaving] = useState(false);

  const sermonNotes = useMemo(
    () => chronicleEntries
      .filter((entry) => entry.type === 'study' && entry.sourceContext?.page === 'sermon-notes')
      .sort((a, b) => (a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date))),
    [chronicleEntries],
  );

  const visibleNotes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return sermonNotes;
    return sermonNotes.filter((entry) => `${entry.title} ${entry.body} ${entry.passage || ''} ${entry.date}`.toLowerCase().includes(normalized));
  }, [query, sermonNotes]);

  const passageTarget = getBibleNavigationTarget(draft.passage);
  const canSave = Boolean(draft.title.trim() && draft.notes.trim());

  useEffect(() => {
    let storageAvailable = true;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ draft, editingId, resumeDraft }));
    } catch {
      storageAvailable = false;
    }
    if (storageAvailable !== draftStorageAvailableRef.current) {
      draftStorageAvailableRef.current = storageAvailable;
      queueMicrotask(() => setDraftStorageAvailable(storageAvailable));
    }
  }, [draft, editingId, resumeDraft]);

  function setField<K extends keyof SermonDraft>(field: K, value: SermonDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function clearEditor() {
    setDraft(emptyDraft());
    setEditingId(null);
    setResumeDraft(null);
    setPendingEditId(null);
    try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* Draft state is already cleared in memory. */ }
  }

  function saveNote() {
    if (!canSave || isSaving) return;
    if (editingId && !chronicleEntries.some((entry) => entry.id === editingId)) {
      addToast('These saved notes no longer exist. Your draft is still here.', 'warning', 'AI');
      setEditingId(null);
      return;
    }
    setIsSaving(true);
    const entry: ChronicleEntry = {
      id: editingId || crypto.randomUUID(),
      date: draft.date || today(),
      type: 'study',
      title: draft.title.trim(),
      body: serializeDraft(draft),
      passage: draft.passage.trim() || undefined,
      sourceContext: {
        page: 'sermon-notes',
        passage: draft.passage.trim() || undefined,
      },
    };

    if (editingId) updateChronicleEntry(editingId, entry);
    else addChronicleEntry(entry);
    addToast(editingId ? 'Sermon notes updated on this device.' : 'Sermon notes saved on this device.', 'success');
    clearEditor();
    setIsSaving(false);
  }

  function beginEdit(entry: ChronicleEntry, priorDraft: SermonDraft | null = null) {
    setResumeDraft(priorDraft);
    setDraft(draftFromEntry(entry));
    setEditingId(entry.id);
    setDeleteId(null);
    setPendingEditId(null);
    document.querySelector(`.${s.editor}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function editNote(entry: ChronicleEntry) {
    if (entry.id !== editingId && hasMeaningfulDraft(draft)) {
      setPendingEditId(entry.id);
      return;
    }
    beginEdit(entry, resumeDraft);
  }

  function cancelEdit() {
    setDraft(resumeDraft || emptyDraft());
    setEditingId(null);
    setResumeDraft(null);
    setPendingEditId(null);
  }

  function deleteNote(entry: ChronicleEntry) {
    deleteChronicleEntry(entry.id);
    if (editingId === entry.id) cancelEdit();
    setDeleteId(null);
    addToast('Sermon notes removed from this device.', 'success');
  }

  function openPassage(passage: string) {
    const target = getBibleNavigationTarget(passage);
    if (!target) return;
    setBibleView({ book: target.book, chapter: target.chapter, overlayOn: false, showThemePanel: false });
    navigate('/bible');
  }

  return (
    <div className={`${manuscriptStyles.manuscriptRegister} ${s.page}`}>
      <SectionTabs tabs={WORD_TABS} />
      <div className={s.atmosphere} aria-hidden="true" />
      <main className={s.workspace}>
        <section className={s.editor} aria-labelledby="sermon-notes-title">
          <header className={s.editorHeader}>
            <div>
              <div className={s.eyebrow}>{editingId ? 'Revisiting' : 'Listening Well'}</div>
              <h1 id="sermon-notes-title">Sermon Notes</h1>
              <p>Receive the Word carefully. Keep what was said, what stirred, and what you will carry.</p>
            </div>
            {editingId && <span className={s.editingBadge}>Editing saved notes</span>}
          </header>

          {pendingEditId && (
            <div className={s.draftDecision} role="alert">
              <div>
                <strong>Keep your unfinished notes?</strong>
                <span>Set this draft aside before opening the saved sermon.</span>
              </div>
              <button type="button" onClick={() => setPendingEditId(null)}>Keep writing</button>
              <button type="button" onClick={() => {
                const entry = sermonNotes.find((item) => item.id === pendingEditId);
                if (entry) beginEdit(entry, draft);
              }}>Set aside and edit</button>
            </div>
          )}

          <div className={s.contextGrid}>
            <label className={s.wideField}>
              <span>Sermon title *</span>
              <input required aria-required="true" value={draft.title} onChange={(event) => setField('title', event.target.value)} placeholder="The title or central theme" />
            </label>
            <label>
              <span>Preacher</span>
              <input value={draft.preacher} onChange={(event) => setField('preacher', event.target.value)} placeholder="Who preached?" />
            </label>
            <label>
              <span>Church or gathering</span>
              <input value={draft.church} onChange={(event) => setField('church', event.target.value)} placeholder="Where did you hear it?" />
            </label>
            <label>
              <span>Date</span>
              <input type="date" value={draft.date} onChange={(event) => setField('date', event.target.value)} />
            </label>
            <label>
              <span>Passage</span>
              <input value={draft.passage} onChange={(event) => setField('passage', event.target.value)} placeholder="e.g. Romans 8:1-11" />
            </label>
          </div>

          <label className={s.ruledField}>
            <span>Notes *</span>
            <textarea required aria-required="true" value={draft.notes} onChange={(event) => setField('notes', event.target.value)} placeholder="Capture the sermon as you hear it: movements, quotations, illustrations, questions, and connections…" />
          </label>

          <div className={s.reflectionGrid}>
            <label>
              <span>Big idea</span>
              <textarea value={draft.bigIdea} onChange={(event) => setField('bigIdea', event.target.value)} placeholder="State the sermon in one clear sentence." />
            </label>
            <label>
              <span>Key points</span>
              <textarea value={draft.keyPoints} onChange={(event) => setField('keyPoints', event.target.value)} placeholder="List the main movements or supporting points." />
            </label>
            <label>
              <span>Takeaways</span>
              <textarea value={draft.takeaways} onChange={(event) => setField('takeaways', event.target.value)} placeholder="What truths do you want to carry with you?" />
            </label>
            <label>
              <span>Applications</span>
              <textarea value={draft.applications} onChange={(event) => setField('applications', event.target.value)} placeholder="What should change in belief, practice, or attention?" />
            </label>
          </div>

          <label className={s.finalTakeawayField}>
            <span>Final takeaway</span>
            <textarea value={draft.finalTakeaway} onChange={(event) => setField('finalTakeaway', event.target.value)} placeholder="If you remember one thing from this sermon, let it be…" />
          </label>

          <footer className={s.editorActions}>
            <div className={`${s.draftStatus} ${!draftStorageAvailable ? s.draftWarning : ''}`}>
              {draftStorageAvailable ? 'Draft kept on this device as you write.' : 'Draft backup is unavailable. Keep this page open until you save.'}
            </div>
            <div className={s.actionGroup}>
              {editingId && <button type="button" className={s.secondaryButton} onClick={cancelEdit}>Cancel edit</button>}
              {draft.passage && (
                <button type="button" className={s.secondaryButton} disabled={!passageTarget} onClick={() => openPassage(draft.passage)}>
                  Open passage
                </button>
              )}
              <button type="button" className={s.saveButton} disabled={!canSave || isSaving} onClick={saveNote}>
                {isSaving ? 'Saving...' : editingId ? 'Update notes' : 'Save sermon notes'}
              </button>
            </div>
          </footer>
        </section>

        <aside className={s.archive} aria-label="Saved sermon notes">
          <header className={s.archiveHeader}>
            <div>
              <div className={s.eyebrow}>Archive</div>
              <h2>What You Have Heard</h2>
            </div>
            <span>{sermonNotes.length}</span>
          </header>
          <label className={s.searchField}>
            <span className={s.srOnly}>Search sermon notes</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search preacher, passage, or phrase…" />
          </label>

          <div className={s.noteList}>
            {visibleNotes.length === 0 ? (
              <div className={s.emptyState}>
                {sermonNotes.length === 0 ? 'Your first sermon notes will rest here.' : 'No saved sermon notes match that search.'}
              </div>
            ) : visibleNotes.map((entry) => {
              const parsed = draftFromEntry(entry);
              return (
                <article key={entry.id} className={s.noteCard}>
                  <div className={s.noteMeta}>{formatDate(entry.date)}{parsed.preacher ? ` · ${parsed.preacher}` : ''}</div>
                  <h3>{entry.title}</h3>
                  {entry.passage && <div className={s.passage}>{entry.passage}</div>}
                  <p>{parsed.bigIdea || parsed.notes}</p>
                  {deleteId === entry.id ? (
                    <div className={s.confirmDelete} role="alert">
                      <span>Delete these sermon notes?</span>
                      <button type="button" onClick={() => setDeleteId(null)}>Keep</button>
                      <button type="button" onClick={() => deleteNote(entry)}>Delete</button>
                    </div>
                  ) : (
                    <div className={s.cardActions}>
                      {entry.passage && getBibleNavigationTarget(entry.passage) && <button type="button" onClick={() => openPassage(entry.passage!)}>Bible</button>}
                      <button type="button" onClick={() => editNote(entry)}>Edit</button>
                      <button type="button" onClick={() => setDeleteId(entry.id)}>Delete</button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </aside>
      </main>
    </div>
  );
}
