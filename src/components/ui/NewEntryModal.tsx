import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store';
import { useToastStore } from '../../store/toastStore';
import type { ChronicleEntry } from '../../types';
import { GROWTH_MARKER_KINDS } from '../../data/growthMarkers';

const ENTRY_TYPES = [
  { id: 'insight', label: 'Insight', icon: '💡', color: 'var(--accent-primary)', desc: 'Something God showed you' },
  { id: 'prayer', label: 'Prayer', icon: '🙏', color: 'var(--accent-blue)', desc: 'A prayer or conversation with God' },
  { id: 'study', label: 'Study', icon: '📖', color: 'var(--accent-purple)', desc: 'Notes from Scripture study' },
  { id: 'note', label: 'Note', icon: '📝', color: 'var(--accent-amber)', desc: 'A general observation or thought' },
  { id: 'reflection', label: 'Reflection', icon: '🪞', color: 'var(--accent-sky)', desc: 'Looking back at what God has done' },
  { id: 'growth', label: 'Growth Marker', icon: '🌱', color: 'var(--accent-rose)', desc: 'A spiritual milestone — baptism, a calling clarified, a season resolved' },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  defaultType?: ChronicleEntry['type'];
  defaultPassage?: string;
  defaultBody?: string;
  editEntry?: ChronicleEntry | null;
}

interface DraftProps {
  onClose: () => void;
  defaultType: ChronicleEntry['type'];
  defaultPassage: string;
  defaultBody: string;
  editEntry?: ChronicleEntry | null;
}

function NewEntryModalDraft({ onClose, defaultType, defaultPassage, defaultBody, editEntry }: DraftProps) {
  const { addChronicleEntry, updateChronicleEntry } = useAppStore();
  const { addToast } = useToastStore();
  const [type, setType] = useState<ChronicleEntry['type']>(editEntry?.type ?? defaultType);
  const [title, setTitle] = useState(editEntry?.title ?? '');
  const [body, setBody] = useState(editEntry?.body ?? defaultBody);
  const [passage, setPassage] = useState(editEntry?.passage ?? defaultPassage);
  const [growthKind, setGrowthKind] = useState(editEntry?.sourceContext?.growthMarker?.kind ?? GROWTH_MARKER_KINDS[0].id);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const selectedType = ENTRY_TYPES.find((entryType) => entryType.id === type)!;

  const handleSave = useCallback(async () => {
    if (!body.trim()) return;
    const sourceContext = type === 'growth' ? { page: 'chronicle' as const, growthMarker: { kind: growthKind } } : undefined;
    try {
      if (editEntry) {
        await updateChronicleEntry(editEntry.id, {
          type,
          title: title.trim() || body.trim().slice(0, 60) + (body.length > 60 ? '…' : ''),
          body: body.trim(),
          passage: passage.trim() || undefined,
          sourceContext,
        });
        addToast('Chronicle entry updated', 'success', selectedType.icon);
        onClose();
        return;
      }
      const entry: ChronicleEntry = {
        id: crypto.randomUUID(),
        date: new Date().toISOString().split('T')[0],
        type,
        title: title.trim() || body.trim().slice(0, 60) + (body.length > 60 ? '…' : ''),
        body: body.trim(),
        passage: passage.trim() || undefined,
        sourceContext,
      };
      await addChronicleEntry(entry);
      addToast('Saved to Chronicle', 'success', selectedType.icon);
      onClose();
    } catch {
      addToast('Chronicle could not save this entry. Your draft is still here.', 'warning', selectedType.icon);
    }
  }, [addChronicleEntry, addToast, body, editEntry, growthKind, onClose, passage, selectedType.icon, title, type, updateChronicleEntry]);

  useEffect(() => {
    const focusTimer = window.setTimeout(() => bodyRef.current?.focus(), 80);
    return () => window.clearTimeout(focusTimer);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') handleSave();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(2px)',
      }}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--card-bg)',
          borderRadius: 16,
          width: 560,
          maxWidth: '92vw',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{editEntry ? 'Edit Chronicle Entry' : 'New Chronicle Entry'}</div>
          <button
            onClick={onClose}
            style={{ fontSize: 18, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6 }}>
          {ENTRY_TYPES.map((entryType) => (
            <button
              key={entryType.id}
              onClick={() => setType(entryType.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 11px',
                border: `1px solid ${type === entryType.id ? entryType.color : 'var(--border)'}`,
                borderRadius: 20,
                fontSize: 12,
                fontWeight: type === entryType.id ? 600 : 400,
                background: type === entryType.id ? `${entryType.color}18` : 'transparent',
                color: type === entryType.id ? entryType.color : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.12s',
              }}
              title={entryType.desc}
            >
              <span>{entryType.icon}</span>
              {entryType.label}
            </button>
          ))}
        </div>

        {type === 'growth' && (
          <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {GROWTH_MARKER_KINDS.map((kind) => (
              <button
                key={kind.id}
                onClick={() => setGrowthKind(kind.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  border: `1px solid ${growthKind === kind.id ? 'var(--accent-rose)' : 'var(--border)'}`,
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: growthKind === kind.id ? 600 : 400,
                  background: growthKind === kind.id ? 'var(--accent-rose-light)' : 'transparent',
                  color: growthKind === kind.id ? 'var(--accent-rose)' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <span>{kind.icon}</span>
                {kind.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Title (optional — we'll generate one from your entry)"
            style={{
              padding: '8px 12px',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 500,
              background: 'var(--card-inner)',
              color: 'var(--text)',
              outline: 'none',
            }}
          />
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write here... what did God show you? What are you carrying? What are you grateful for?"
            style={{
              flex: 1,
              minHeight: 180,
              padding: '12px',
              border: `1px solid ${body.trim() ? selectedType.color : 'var(--border)'}`,
              borderRadius: 8,
              fontSize: 16,
              fontFamily: 'var(--font-serif)',
              lineHeight: 1.75,
              background: 'var(--card-inner)',
              color: 'var(--text)',
              resize: 'none',
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
          />
          <input
            value={passage}
            onChange={(event) => setPassage(event.target.value)}
            placeholder="Passage (e.g. Psalm 23:1, optional)"
            style={{
              padding: '7px 12px',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 16,
              background: 'var(--card-inner)',
              color: 'var(--text)',
              outline: 'none',
            }}
          />
        </div>

        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--card-inner)',
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>⌘↵ to save · Esc to cancel</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '7px 16px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 13,
                color: 'var(--text-sub)',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!body.trim()}
              style={{
                padding: '7px 20px',
                background: body.trim() ? selectedType.color : 'var(--border)',
                color: body.trim() ? 'white' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: body.trim() ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s',
              }}
            >
              {editEntry ? 'Save Changes' : 'Save to Chronicle'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewEntryModal({
  open,
  onClose,
  defaultType = 'insight',
  defaultPassage = '',
  defaultBody = '',
  editEntry = null,
}: Props) {
  if (!open) return null;

  return (
    <NewEntryModalDraft
      key={editEntry ? `edit:${editEntry.id}` : `${defaultType}:${defaultPassage}:${defaultBody}`}
      onClose={onClose}
      defaultType={defaultType}
      defaultPassage={defaultPassage}
      defaultBody={defaultBody}
      editEntry={editEntry}
    />
  );
}
