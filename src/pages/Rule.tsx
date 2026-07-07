import { useMemo, useState } from 'react';
import { useAppStore } from '../store';
import { useResponsiveLayout } from '../lib/useResponsiveLayout';
import { RULE_CATEGORIES, getRuleCategory } from '../data/ruleCategories';
import Card, { EmptyCard } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import SeasonalExamenCeremony from '../components/ui/SeasonalExamenCeremony';

// The Rule of Life — the Live pillar's flagship (VISION.md). A personal
// rule authored in your own words: prayer, Scripture, Sabbath, service,
// generosity, calling. Deliberately not a habit tracker — no completion
// percentages, no chains. A Rule is returned to, not broken; grace at
// re-entry (Milestone 9) is how returning is already met. Reuses the
// existing Chronicle entry infrastructure (type: 'rule'), the same
// precedent as Growth Markers.

export default function Rule() {
  const { isPhone } = useResponsiveLayout();
  const { chronicleEntries, addChronicleEntry } = useAppStore();
  const [addingCategory, setAddingCategory] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');
  const [examenOpen, setExamenOpen] = useState(false);

  const ruleItems = useMemo(
    () => chronicleEntries.filter((entry) => entry.type === 'rule'),
    [chronicleEntries],
  );

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, typeof ruleItems>();
    for (const category of RULE_CATEGORIES) map.set(category.id, []);
    for (const item of ruleItems) {
      const categoryId = item.sourceContext?.rule?.category || 'calling';
      if (!map.has(categoryId)) map.set(categoryId, []);
      map.get(categoryId)!.push(item);
    }
    return map;
  }, [ruleItems]);

  const submitDraft = (categoryId: string) => {
    if (!draftText.trim()) return;
    addChronicleEntry({
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      type: 'rule',
      title: draftText.trim().slice(0, 60) + (draftText.length > 60 ? '…' : ''),
      body: draftText.trim(),
      sourceContext: { page: 'rule', rule: { category: categoryId } },
    });
    setDraftText('');
    setAddingCategory(null);
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: isPhone ? '20px 16px 48px' : '32px 24px 64px' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              My Rule of Life
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 6, maxWidth: 460, lineHeight: 1.6 }}>
              A pattern of apprenticeship to Christ, in your own words — prayer, Scripture, Sabbath, service, generosity, calling. Not a checklist. You return to it; you don't break it.
            </p>
          </div>
          {ruleItems.length > 0 && (
            <button
              onClick={() => setExamenOpen(true)}
              style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--accent-forest)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Keep the Seasonal Examen
            </button>
          )}
        </div>

        {ruleItems.length === 0 && addingCategory === null ? (
          <EmptyCard>
            Nothing is written yet. A Rule of Life starts small — one honest commitment in one area below.
          </EmptyCard>
        ) : null}

        <div style={{ display: 'grid', gap: 16 }}>
          {RULE_CATEGORIES.map((category) => {
            const items = itemsByCategory.get(category.id) || [];
            const isAdding = addingCategory === category.id;
            return (
              <Card key={category.id} padding="14px 16px">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: items.length || isAdding ? 10 : 0 }}>
                  <Badge color="var(--accent-forest)">{category.icon} {category.label}</Badge>
                  {!isAdding && (
                    <button
                      onClick={() => setAddingCategory(category.id)}
                      style={{ marginLeft: 'auto', padding: 0, border: 'none', background: 'none', color: 'var(--accent-forest)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                    >
                      + Add
                    </button>
                  )}
                </div>
                {items.map((item) => (
                  <p key={item.id} style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--text)', lineHeight: 1.6, margin: '0 0 8px' }}>
                    {item.body}
                  </p>
                ))}
                {isAdding && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <textarea
                      autoFocus
                      value={draftText}
                      onChange={(event) => setDraftText(event.target.value)}
                      placeholder={`Write a commitment for ${category.label.toLowerCase()}, in your own words.`}
                      style={{ flex: 1, minWidth: 220, minHeight: 60, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-serif)', lineHeight: 1.6, resize: 'vertical', outline: 'none' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <button
                        onClick={() => submitDraft(category.id)}
                        disabled={!draftText.trim()}
                        style={{ padding: '7px 12px', borderRadius: 8, border: 'none', background: 'var(--accent-forest)', color: 'white', fontSize: 11, fontWeight: 700, cursor: draftText.trim() ? 'pointer' : 'default', opacity: draftText.trim() ? 1 : 0.55 }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setAddingCategory(null); setDraftText(''); }}
                        style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', fontSize: 11, cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {examenOpen ? (
        <SeasonalExamenCeremony
          ruleItems={ruleItems.map((item) => ({ text: item.body, category: getRuleCategory(item.sourceContext?.rule?.category).label }))}
          onCancel={() => setExamenOpen(false)}
          onComplete={(text) => {
            addChronicleEntry({
              id: Math.random().toString(36).slice(2),
              date: new Date().toISOString().split('T')[0],
              type: 'reflection',
              title: `Seasonal Examen — ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
              body: text,
              sourceContext: { page: 'rule' },
            });
            setExamenOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
