import { useMemo, useState } from 'react';
import { useAppStore } from '../store';
import { useResponsiveLayout } from '../lib/useResponsiveLayout';
import Card, { EmptyCard } from '../components/ui/Card';
import Badge, { TimelineDot } from '../components/ui/Badge';
import QuestionResolutionCeremony from '../components/ui/QuestionResolutionCeremony';
import { daysOpen, formatOpenDuration } from '../lib/questionLab';
import chapelStyles from '../styles/chapelRegister.module.css';
import SectionTabs from '../components/ui/SectionTabs';
import { PRAYER_TABS } from '../lib/sectionTabs';
import type { ChronicleEntry } from '../types';

// The Question Lab (VISION.md covenant #3 / ROADMAP M17) — open questions
// held with the same dignity as answered prayers, including the
// vocational ones ("what is God asking me to do?"), open for decades if
// need be. Asking is a simple act; resolving — after however long it
// takes — is the ceremony, and the resolved question becomes a stone.

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function QuestionLab() {
  const { isPhone } = useResponsiveLayout();
  const { chronicleEntries, addChronicleEntry, updateChronicleEntry } = useAppStore();
  const [asking, setAsking] = useState(false);
  const [draft, setDraft] = useState('');
  const [resolvingEntry, setResolvingEntry] = useState<ChronicleEntry | null>(null);

  const questions = useMemo(
    () => chronicleEntries.filter((entry) => entry.type === 'question'),
    [chronicleEntries],
  );
  const openQuestions = useMemo(
    () => questions.filter((entry) => entry.sourceContext?.question?.status !== 'resolved')
      .sort((a, b) => (a.date < b.date ? -1 : 1)),
    [questions],
  );
  const resolvedQuestions = useMemo(
    () => questions.filter((entry) => entry.sourceContext?.question?.status === 'resolved')
      .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [questions],
  );

  const submitQuestion = () => {
    if (!draft.trim()) return;
    addChronicleEntry({
      id: Math.random().toString(36).slice(2),
      date: new Date().toISOString().split('T')[0],
      type: 'question',
      title: draft.trim().slice(0, 60) + (draft.length > 60 ? '…' : ''),
      body: draft.trim(),
      sourceContext: { page: 'chronicle', question: { status: 'open' } },
    });
    setDraft('');
    setAsking(false);
  };

  return (
    <div className={chapelStyles.chapelRegister} style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
      <SectionTabs tabs={PRAYER_TABS} />
      <div style={{ maxWidth: 680, margin: '0 auto', padding: isPhone ? '20px 16px 48px' : '32px 24px 64px' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              The Question Lab
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 6, maxWidth: 460, lineHeight: 1.6 }}>
              Open questions held with the same dignity as answered prayers — what is unresolved, what is unclear, what God is still asking of you. Some take years.
            </p>
          </div>
          <button
            onClick={() => setAsking(true)}
            style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--accent-copper)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            + Ask a Question
          </button>
        </div>

        {asking && (
          <Card padding="14px 16px" style={{ marginBottom: 20 }}>
            <textarea
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="What are you carrying that has no answer yet?"
              style={{ width: '100%', minHeight: 80, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-serif)', lineHeight: 1.6, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button
                onClick={() => { setAsking(false); setDraft(''); }}
                style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', fontSize: 11, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={submitQuestion}
                disabled={!draft.trim()}
                style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--accent-copper)', color: 'white', fontSize: 11, fontWeight: 700, cursor: draft.trim() ? 'pointer' : 'default', opacity: draft.trim() ? 1 : 0.55 }}
              >
                Ask It
              </button>
            </div>
          </Card>
        )}

        {questions.length === 0 && !asking ? (
          <EmptyCard>
            Nothing is written yet. When a question has no answer, it belongs here — held, not forced.
          </EmptyCard>
        ) : null}

        {openQuestions.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Open</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {openQuestions.map((entry) => (
                <Card key={entry.id} padding="14px 16px">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                    <Badge color="var(--accent-copper)">{formatOpenDuration(daysOpen(entry.date))}</Badge>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>asked {formatDate(entry.date)}</span>
                  </div>
                  <p style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--text)', lineHeight: 1.6, margin: '0 0 8px' }}>
                    {entry.body}
                  </p>
                  <button
                    onClick={() => setResolvingEntry(entry)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--accent-copper)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                  >
                    This Is Resolving →
                  </button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {resolvedQuestions.length > 0 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Resolved — the Stones</div>
            <div style={{ borderLeft: '2px solid var(--accent-copper)', marginLeft: 6, paddingLeft: 20, display: 'grid', gap: 18 }}>
              {resolvedQuestions.map((entry) => (
                <div key={entry.id} style={{ position: 'relative' }}>
                  <TimelineDot color="var(--accent-copper)" />
                  <Card padding="14px 16px">
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                      Asked {formatDate(entry.date)} → Resolved {entry.sourceContext?.question?.resolvedAt ? formatDate(entry.sourceContext.question.resolvedAt) : ''}
                    </div>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13, fontStyle: 'italic', color: 'var(--text-muted)', marginBottom: 8 }}>
                      "{entry.body}"
                    </div>
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--text)', lineHeight: 1.6, margin: 0 }}>
                      {entry.sourceContext?.question?.resolution}
                    </p>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {resolvingEntry ? (
        <QuestionResolutionCeremony
          questionText={resolvingEntry.body}
          dateAdded={resolvingEntry.date}
          onCancel={() => setResolvingEntry(null)}
          onComplete={(resolution) => {
            const today = new Date().toISOString().split('T')[0];
            updateChronicleEntry(resolvingEntry.id, {
              sourceContext: {
                ...resolvingEntry.sourceContext,
                page: resolvingEntry.sourceContext?.page || 'chronicle',
                question: { status: 'resolved', resolvedAt: today, resolution },
              },
            });
            setResolvingEntry(null);
          }}
        />
      ) : null}
    </div>
  );
}
