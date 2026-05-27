import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store';
import { useToastStore } from '../../store/toastStore';
import type { ChronicleEntry } from '../../types';

const ENTRY_TYPES = [
  { id: 'insight', label: 'Insight', icon: '💡', color: 'var(--accent-green)', desc: 'Something God showed you' },
  { id: 'prayer', label: 'Prayer', icon: '🙏', color: 'var(--accent-blue)', desc: 'A prayer or conversation with God' },
  { id: 'study', label: 'Study', icon: '📖', color: 'var(--accent-purple)', desc: 'Notes from Scripture study' },
  { id: 'note', label: 'Note', icon: '📝', color: 'var(--accent-amber)', desc: 'A general observation or thought' },
  { id: 'reflection', label: 'Reflection', icon: '🪞', color: 'var(--accent-sky)', desc: 'Looking back at what God has done' },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  defaultType?: ChronicleEntry['type'];
  defaultPassage?: string;
  defaultBody?: string;
}

interface DraftProps {
  onClose: () => void;
  defaultType: ChronicleEntry['type'];
  defaultPassage: string;
  defaultBody: string;
}

function NewEntryModalDraft({ onClose, defaultType, defaultPassage, defaultBody }: DraftProps) {
  const { addChronicleEntry } = useAppStore();
  const { addToast } = useToastStore();
  const [type, setType] = useState<ChronicleEntry['type']>(defaultType);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState(defaultBody);
  const [passage, setPassage] = useState(defaultPassage);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const selectedType = ENTRY_TYPES.find((entryType) => entryType.id === type)!;

  const handleSave = useCallback(() => {
    if (!body.trim()) return;
    const entry: ChronicleEntry = {
      id: Math.random().toString(36).slice(2),
      date: new Date().toISOString().split('T')[0],
      type,
      title: title.trim() || body.trim().slice(0, 60) + (body.length > 60 ? '…' : ''),
      body: body.trim(),
      passage: passage.trim() || undefined,
    };
    addChronicleEntry(entry);
    addToast('Saved to Chronicle', 'success', selectedType.icon);
    onClose();
  }, [addChronicleEntry, addToast, body, onClose, passage, selectedType.icon, title, type]);

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
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>New Chronicle Entry</div>
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

        <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Title (optional — we'll generate one from your entry)"
            style={{
              padding: '8px 12px',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 13,
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
              fontSize: 14,
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
              fontSize: 12,
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
              Save to Chronicle
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
}: Props) {
  if (!open) return null;

  return (
    <NewEntryModalDraft
      key={`${defaultType}:${defaultPassage}:${defaultBody}`}
      onClose={onClose}
      defaultType={defaultType}
      defaultPassage={defaultPassage}
      defaultBody={defaultBody}
    />
  );
}
