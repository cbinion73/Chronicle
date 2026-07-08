import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { useResponsiveLayout } from '../lib/useResponsiveLayout';
import Card, { EmptyCard } from '../components/ui/Card';
import SealedPrayerCeremony from '../components/ui/SealedPrayerCeremony';
import { exportSealedPrayers } from '../lib/sealedPrayersExport';
import chapelStyles from '../styles/chapelRegister.module.css';
import SectionTabs from '../components/ui/SectionTabs';
import { PRAYER_TABS } from '../lib/sectionTabs';
import type { ChronicleEntry } from '../types';

// Sealed Prayers (VISION.md, Ring 2) — written now, meant to stay unread
// until a future date or event. "Seen, not touchable": the label and the
// unlock condition are visible; the body never renders until opened.
// Today this is UI-level withholding only, not encryption — see
// docs/SEALED_TIER.md for the target design and why.

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function SealedPrayers() {
  const navigate = useNavigate();
  const { isPhone } = useResponsiveLayout();
  const { chronicleEntries, addChronicleEntry, updateChronicleEntry } = useAppStore();
  const [sealingOpen, setSealingOpen] = useState(false);

  const sealedItems = useMemo(
    () => chronicleEntries.filter((entry) => entry.type === 'sealed').sort((a, b) => (a.date < b.date ? 1 : -1)),
    [chronicleEntries],
  );

  const today = todayStr();

  const openPrayer = (entry: ChronicleEntry) => {
    if (!entry.sourceContext?.sealed) return;
    updateChronicleEntry(entry.id, {
      sourceContext: {
        ...entry.sourceContext,
        sealed: {
          ...entry.sourceContext.sealed,
          opened: true,
          openedAt: today,
        },
      },
    });
  };

  return (
    <div className={chapelStyles.chapelRegister} style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
      <SectionTabs tabs={PRAYER_TABS} />
      <div style={{ maxWidth: 680, margin: '0 auto', padding: isPhone ? '20px 16px 48px' : '32px 24px 64px' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
          <div>
            <button
              onClick={() => navigate('/prayer')}
              style={{ border: 'none', background: 'none', padding: 0, fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', marginBottom: 6 }}
            >
              ← Back to the Prayer Room
            </button>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              Sealed Prayers
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 6, maxWidth: 460, lineHeight: 1.6 }}>
              Written now, meant to stay unread until a future date or event — seen on the path ahead, not touchable until then.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {sealedItems.length > 0 && (
              <button
                onClick={() => exportSealedPrayers(chronicleEntries)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--accent-slate)', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                ⬇ Export
              </button>
            )}
            <button
              onClick={() => setSealingOpen(true)}
              style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--accent-slate)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Seal a Prayer
            </button>
          </div>
        </div>

        {sealedItems.length === 0 ? (
          <EmptyCard>
            Nothing is sealed yet. When you write a prayer for the future — for someone, or for who you'll be — it will take its place here.
          </EmptyCard>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {sealedItems.map((entry) => {
              const sealed = entry.sourceContext?.sealed;
              const opened = sealed?.opened;
              const unlockable = opened || (sealed?.unsealAt ? sealed.unsealAt <= today : false);
              const condition = sealed?.unsealAt ? `Opens ${formatDate(sealed.unsealAt)}` : `Opens when: ${sealed?.eventLabel}`;
              return (
                <Card key={entry.id} padding="16px 18px">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 16 }}>{opened ? '📖' : '🔒'}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{entry.title}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: opened ? 10 : 0 }}>
                    {condition}
                    {sealed?.sealedAt ? ` · sealed ${formatDate(sealed.sealedAt)}` : ''}
                  </div>
                  {opened ? (
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--text)', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-line' }}>
                      {entry.body}
                    </p>
                  ) : unlockable ? (
                    <button
                      onClick={() => openPrayer(entry)}
                      style={{ marginTop: 10, padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--accent-slate)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Open This Prayer
                    </button>
                  ) : null}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {sealingOpen ? (
        <SealedPrayerCeremony
          onCancel={() => setSealingOpen(false)}
          onComplete={({ title, body, unsealAt, eventLabel }) => {
            addChronicleEntry({
              id: Math.random().toString(36).slice(2),
              date: today,
              type: 'sealed',
              title,
              body,
              sourceContext: {
                page: 'prayer',
                sealed: { unsealAt, eventLabel, sealedAt: today, opened: false },
              },
            });
            setSealingOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
