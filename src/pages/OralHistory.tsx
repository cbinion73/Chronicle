import { useMemo, useRef, useState } from 'react';
import { useAppStore } from '../store';
import { useResponsiveLayout } from '../lib/useResponsiveLayout';
import { CARD_STYLE } from '../components/ui/cardStyle';
import Card, { EmptyCard } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { ORAL_HISTORY_PROMPTS } from '../data/oralHistoryPrompts';
import { startRecording, type VoiceRecorder } from '../lib/oralHistoryVoice';
import { transcribeVoiceBlob } from '../lib/voice';

// The Oral History (ROADMAP M19) — the same excavation as the
// Archaeology (M18), pointed at someone else. "This is the feature with
// a funeral": deliberately given a permanent room (unlike the one-time
// Archaeology) since a family's stories are gathered across many
// sittings, sometimes years apart. See src/lib/oralHistoryVoice.ts for
// why audio itself is never persisted — only what gets written down.

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

type Stage = 'landing' | 'subject' | 'prompt' | 'done';

export default function OralHistory() {
  const { isPhone } = useResponsiveLayout();
  const { chronicleEntries, addChronicleEntry, voiceConfig } = useAppStore();

  const heritageEntries = useMemo(
    () => chronicleEntries.filter((entry) => entry.type === 'heritage').sort((a, b) => (a.date < b.date ? 1 : -1)),
    [chronicleEntries],
  );

  const subjects = useMemo(() => {
    const groups = new Map<string, { relationship: string; entries: typeof heritageEntries }>();
    for (const entry of heritageEntries) {
      const name = entry.sourceContext?.heritage?.subjectName || 'Unknown';
      if (!groups.has(name)) {
        groups.set(name, { relationship: entry.sourceContext?.heritage?.relationship || '', entries: [] });
      }
      groups.get(name)!.entries.push(entry);
    }
    return Array.from(groups.entries()).map(([name, data]) => ({ name, ...data }));
  }, [heritageEntries]);

  const [stage, setStage] = useState<Stage>('landing');
  const [subjectName, setSubjectName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [index, setIndex] = useState(0);
  const [text, setText] = useState('');
  const [stonesSet, setStonesSet] = useState(0);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'recorded'>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [hadAudio, setHadAudio] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const blobRef = useRef<Blob | null>(null);

  const card: React.CSSProperties = { ...CARD_STYLE, padding: isPhone ? '20px 18px' : '28px 32px' };
  const prompt = ORAL_HISTORY_PROMPTS[index];

  const startInterview = () => {
    setSubjectName('');
    setRelationship('');
    setStage('subject');
  };

  const beginPrompts = () => {
    if (!subjectName.trim()) return;
    setIndex(0);
    setStonesSet(0);
    resetPromptState();
    setStage('prompt');
  };

  const resetPromptState = () => {
    setText('');
    setRecordingState('idle');
    setAudioUrl(null);
    setHadAudio(false);
    setVoiceError(null);
    blobRef.current = null;
  };

  const advance = () => {
    resetPromptState();
    setIndex((i) => i + 1);
  };

  const skip = () => {
    if (index + 1 >= ORAL_HISTORY_PROMPTS.length) {
      setStage('done');
    } else {
      advance();
    }
  };

  const record = async () => {
    if (recordingState === 'recording') {
      const blob = await recorderRef.current?.stop();
      if (blob) {
        blobRef.current = blob;
        setAudioUrl(URL.createObjectURL(blob));
        setHadAudio(true);
      }
      setRecordingState('recorded');
      return;
    }
    try {
      setVoiceError(null);
      recorderRef.current = await startRecording();
      setRecordingState('recording');
    } catch {
      setVoiceError('Microphone unavailable — you can still type it in below.');
    }
  };

  const transcribe = async () => {
    if (!blobRef.current) return;
    setTranscribing(true);
    setVoiceError(null);
    try {
      const result = await transcribeVoiceBlob(blobRef.current, voiceConfig);
      setText((prev) => (prev ? `${prev}\n${result.transcript}` : result.transcript));
    } catch {
      setVoiceError('Transcription failed — you can still type it in below.');
    } finally {
      setTranscribing(false);
    }
  };

  const save = () => {
    if (!text.trim()) return;
    addChronicleEntry({
      id: Math.random().toString(36).slice(2),
      date: new Date().toISOString().split('T')[0],
      type: 'heritage',
      title: text.trim().slice(0, 60) + (text.length > 60 ? '…' : ''),
      body: text.trim(),
      sourceContext: { page: 'heritage', heritage: { subjectName: subjectName.trim(), relationship: relationship.trim(), hadAudio } },
    });
    setStonesSet((n) => n + 1);
    if (index + 1 >= ORAL_HISTORY_PROMPTS.length) {
      setStage('done');
    } else {
      advance();
    }
  };

  if (stage === 'landing') {
    return (
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: isPhone ? '20px 16px 48px' : '32px 24px 64px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                The Heritage Room
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 6, maxWidth: 460, lineHeight: 1.6 }}>
                Stories captured from someone else — a grandparent, a parent, a mentor. Their stones, held in trust.
              </p>
            </div>
            <button
              onClick={startInterview}
              style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--accent-clay)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              + New Interview
            </button>
          </div>

          {subjects.length === 0 ? (
            <EmptyCard>
              No one's story is captured here yet. Sit down with a grandparent, a parent, or a mentor, and start an interview — their stones will take their place here.
            </EmptyCard>
          ) : (
            <div style={{ display: 'grid', gap: 20 }}>
              {subjects.map((subject) => (
                <section key={subject.name}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                      {subject.name}
                    </h2>
                    {subject.relationship ? <Badge color="var(--accent-clay)">{subject.relationship}</Badge> : null}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{subject.entries.length} stone{subject.entries.length === 1 ? '' : 's'}</span>
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {subject.entries.map((entry) => (
                      <Card key={entry.id} padding="14px 16px">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(entry.date)}</span>
                          {entry.sourceContext?.heritage?.hadAudio ? <span style={{ fontSize: 11, color: 'var(--accent-clay)' }}>🎙️ captured with voice</span> : null}
                        </div>
                        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-line' }}>
                          {entry.body}
                        </p>
                      </Card>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (stage === 'subject') {
    return (
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: isPhone ? '40px 16px' : '64px 24px' }}>
          <section style={card}>
            <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 12 }}>🗝️</div>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 600, color: 'var(--text)', textAlign: 'center', lineHeight: 1.6, margin: '0 0 20px' }}>
              Whose story are you capturing?
            </p>
            <div style={{ display: 'grid', gap: 12 }}>
              <input
                autoFocus
                value={subjectName}
                onChange={(event) => setSubjectName(event.target.value)}
                placeholder="Their name"
                style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', fontSize: 16, outline: 'none' }}
              />
              <input
                value={relationship}
                onChange={(event) => setRelationship(event.target.value)}
                placeholder="Their relationship to you (optional — e.g. grandmother)"
                style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
              />
              <button
                onClick={beginPrompts}
                disabled={!subjectName.trim()}
                style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--accent-clay)', color: 'white', fontSize: 13, fontWeight: 700, cursor: subjectName.trim() ? 'pointer' : 'default', opacity: subjectName.trim() ? 1 : 0.55 }}
              >
                Begin the Interview →
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (stage === 'done') {
    return (
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: isPhone ? '48px 18px' : '72px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 34, color: 'var(--accent-clay)', marginBottom: 14 }}>🗝️</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
            {stonesSet > 0 ? `${stonesSet} stone${stonesSet === 1 ? '' : 's'} set for ${subjectName}.` : 'Nothing set this time — that\'s all right.'}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-sub)', lineHeight: 1.7, maxWidth: 440, margin: '0 auto 28px' }}>
            {stonesSet > 0
              ? 'You can sit down with them again whenever there is more to remember — their story here will keep growing.'
              : 'You can come back and try again whenever there is a good moment for it.'}
          </p>
          <button
            onClick={() => setStage('landing')}
            style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Back to the Heritage Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
      <div style={{ maxWidth: 620, margin: '0 auto', padding: isPhone ? '22px 16px 48px' : '40px 24px 64px' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-clay)' }}>
            {subjectName}{relationship ? ` · ${relationship}` : ''}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{index + 1} of {ORAL_HISTORY_PROMPTS.length}</div>
        </div>

        <section style={card}>
          <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 12 }}>{prompt.icon}</div>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 600, color: 'var(--text)', textAlign: 'center', lineHeight: 1.6, margin: '0 0 20px' }}>
            {prompt.question}
          </p>

          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={record}
                style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${recordingState === 'recording' ? 'var(--accent-rose)' : 'var(--border)'}`, background: recordingState === 'recording' ? 'var(--accent-rose-light)' : 'transparent', color: recordingState === 'recording' ? 'var(--accent-rose)' : 'var(--text-sub)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                {recordingState === 'recording' ? '⏹ Stop Recording' : '🎙️ Record Their Answer'}
              </button>
              {audioUrl ? <audio controls src={audioUrl} style={{ height: 32 }} /> : null}
              {audioUrl && voiceConfig.enabled ? (
                <button
                  onClick={transcribe}
                  disabled={transcribing}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', fontSize: 12, fontWeight: 600, cursor: transcribing ? 'default' : 'pointer', opacity: transcribing ? 0.6 : 1 }}
                >
                  {transcribing ? 'Transcribing…' : 'Transcribe →'}
                </button>
              ) : null}
            </div>
            {voiceError ? <p style={{ fontSize: 11, color: 'var(--accent-rose)', margin: 0 }}>{voiceError}</p> : null}
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
              The recording stays in this tab only, for playback and transcription — it's never saved. What you write below is the stone that gets kept.
            </p>

            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={prompt.placeholder}
              style={{ minHeight: 110, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', fontSize: 16, fontFamily: 'var(--font-serif)', lineHeight: 1.65, resize: 'vertical', outline: 'none' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={skip} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', fontSize: 12, cursor: 'pointer' }}>
                Skip this one
              </button>
              <button
                onClick={save}
                disabled={!text.trim()}
                style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--accent-clay)', color: 'white', fontSize: 12, fontWeight: 700, cursor: text.trim() ? 'pointer' : 'default', opacity: text.trim() ? 1 : 0.55 }}
              >
                Set This Stone ✚
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
