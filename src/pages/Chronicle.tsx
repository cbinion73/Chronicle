import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import NewEntryModal from '../components/ui/NewEntryModal';
import type { ChronicleEntry } from '../types';
import { deriveFormationJourney, deriveLegacyNarrative } from '../lib/formationAnalytics';
import { useAIChatStore } from '../store/aiChatStore';
import { getBibleNavigationTarget } from '../lib/scriptureReference';
import { buildReflectionPrompts } from '../lib/reflectionPrompts';
import s from './Chronicle.module.css';

const TYPE_COLORS: Record<string, string> = {
  insight: 'var(--accent-green)',
  prayer: 'var(--accent-blue)',
  study: 'var(--accent-purple)',
  note: 'var(--accent-amber)',
  reflection: 'var(--accent-sky)',
};

const TYPE_BG: Record<string, string> = {
  insight: 'var(--accent-green-light)',
  prayer: 'var(--accent-blue-light)',
  study: 'var(--accent-purple-light)',
  note: 'var(--accent-amber-light)',
  reflection: '#e0f2fe',
};

export default function Chronicle() {
  const navigate = useNavigate();
  const location = useLocation();
  const { chronicleEntries, prayerItems, formationRhythms, addChronicleEntry, setBibleView, setActiveTab, setStudyModuleDay, setActiveOwnedBook } = useAppStore();
  const setPageContext = useAIChatStore((state) => state.setPageContext);
  const setSelectedAgentMode = useAIChatStore((state) => state.setSelectedAgentMode);
  const [view, setView] = useState<'personal' | 'legacy'>('personal');
  const [filterType, setFilterType] = useState('all');
  const [newEntryOpen, setNewEntryOpen] = useState(false);
  const [passageFilter, setPassageFilter] = useState<string>('');
  const routePassageFilter = location.state && typeof location.state === 'object' && 'filterPassage' in location.state && typeof location.state.filterPassage === 'string'
    ? location.state.filterPassage
    : '';

  useEffect(() => {
    if (routePassageFilter) {
      queueMicrotask(() => setPassageFilter(routePassageFilter));
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, navigate, routePassageFilter]);

  const effectivePassageFilter = routePassageFilter || passageFilter;

  const filtered = useMemo(() => chronicleEntries.filter((entry) => {
    const typeMatch = filterType === 'all' || entry.type === filterType;
    const passageMatch = !effectivePassageFilter || entry.passage === effectivePassageFilter;
    return typeMatch && passageMatch;
  }), [chronicleEntries, effectivePassageFilter, filterType]);
  const legacyNarrative = deriveLegacyNarrative(chronicleEntries);
  const selectedEntry = filtered[0];
  const reflectionPrompts = useMemo(
    () => buildReflectionPrompts({
      passage: effectivePassageFilter || selectedEntry?.passage,
      focus: selectedEntry?.title,
      sourceLabel: selectedEntry ? `${selectedEntry.type} entry` : 'Chronicle',
      summary: selectedEntry?.body,
    }),
    [effectivePassageFilter, selectedEntry],
  );
  const journey = useMemo(() => deriveFormationJourney(chronicleEntries, prayerItems, formationRhythms), [chronicleEntries, formationRhythms, prayerItems]);
  const totalEntries = chronicleEntries.length || 1;

  const groupedByDate = filtered.reduce((acc, entry) => {
    if (!acc[entry.date]) acc[entry.date] = [];
    acc[entry.date].push(entry);
    return acc;
  }, {} as Record<string, ChronicleEntry[]>);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  function openEntryInBible(entry: ChronicleEntry) {
    if (!entry.passage) return;
    const target = getBibleNavigationTarget(entry.passage);
    if (!target) return;
    setBibleView({
      book: target.book,
      chapter: target.chapter,
      overlayOn: false,
      showThemePanel: false,
      activeThemeIds: [],
    });
    setActiveTab('bible');
    navigate('/bible');
  }

  function openEntrySource(entry: ChronicleEntry) {
    const source = entry.sourceContext;
    if (!source) return;

    if (source.page === 'bible' && source.bibleView) {
      setBibleView({
        ...source.bibleView,
        activeThemeIds: [],
      });
      setActiveTab('bible');
      navigate('/bible');
      return;
    }

    if (source.page === 'study') {
      if (source.studyModuleId && typeof source.currentDay === 'number') {
        setStudyModuleDay(source.studyModuleId, source.currentDay);
      }
      setActiveTab('study');
      navigate('/study');
      return;
    }

    if (source.page === 'discipleship') {
      if (source.ownedBookId) setActiveOwnedBook(source.ownedBookId);
      setActiveTab('discipleship');
      navigate('/discipleship', {
        state: {
          requestedBookId: source.ownedBookId,
          requestedDay: source.currentDay,
          requestedReaderView: source.readerView || 'study',
        },
      });
      return;
    }

    if (source.page === 'prayer') {
      setActiveTab('prayer');
      navigate('/prayer');
      return;
    }

    if (source.page === 'today') {
      setActiveTab('today');
      navigate('/');
      return;
    }

    setActiveTab(source.page);
    navigate(`/${source.page}`);
  }

  useEffect(() => {
    setSelectedAgentMode('reflection_guide');
    setPageContext('/chronicle', {
      page: 'Chronicle',
      pathname: '/chronicle',
      title: document.title,
      selection: view === 'legacy' ? legacyNarrative : chronicleEntries[0]?.title,
      passage: chronicleEntries[0]?.passage,
      summary: `Chronicle is in ${view} view. Total entries: ${chronicleEntries.length}. Active filter: ${filterType}.${effectivePassageFilter ? ` Passage filter: ${effectivePassageFilter}.` : ''}`,
    });
  }, [chronicleEntries, effectivePassageFilter, filterType, legacyNarrative, setPageContext, setSelectedAgentMode, view]);

  return (
    <div className={s.shell}>

      {/* Main */}
      <div className={s.main}>

        {/* Header */}
        <div className={s.header}>
          <div className={s.headerCluster}>
            <div className={s.segmented}>
            <button
              onClick={() => setView('personal')}
              className={`${s.segmentedButton} ${view === 'personal' ? s.segmentedButtonActive : ''}`}
            >
              Personal
            </button>
            <button
              onClick={() => setView('legacy')}
              className={`${s.segmentedButton} ${view === 'legacy' ? s.segmentedButtonLegacy : ''}`}
            >
              Legacy View
            </button>
          </div>

          {view === 'personal' && (
            <div className={s.filterRow}>
              {['all', 'insight', 'prayer', 'study', 'note', 'reflection'].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={s.filterChip}
                  style={{
                    background: filterType === t ? TYPE_BG[t] || 'var(--card-inner)' : 'transparent',
                    color: filterType === t ? (TYPE_COLORS[t] || 'var(--text)') : 'var(--text-muted)',
                    borderColor: filterType === t ? (TYPE_COLORS[t] || 'var(--border)') : 'var(--border)',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          </div>

          <button className={s.headerAction}>
            Export
          </button>
        </div>

        {/* Content */}
        <div className={s.content}>
          {effectivePassageFilter && (
            <div className={s.passageBanner}>
              <div className={s.passageBannerText}>
                Showing Chronicle entries linked to <strong style={{ color: 'var(--text)' }}>{effectivePassageFilter}</strong>.
              </div>
              <button
                onClick={() => setPassageFilter('')}
                className={s.clearButton}
              >
                Clear passage filter
              </button>
            </div>
          )}

          {view === 'personal' ? (
            <div>
              {sortedDates.length === 0 ? (
                <div className={s.emptyState}>
                  No Chronicle entries match the current filters yet. Clear the passage filter or save a new reflection, study note, or prayer to keep this thread alive.
                </div>
              ) : sortedDates.map((date, idx) => {
                // Check for gap
                const prevDate = idx > 0 ? sortedDates[idx - 1] : null;
                const dayGap = prevDate
                  ? Math.floor((new Date(prevDate).getTime() - new Date(date).getTime()) / 86400000)
                  : 0;
                const showGap = dayGap > 2;

                return (
                  <div key={date} className={s.dateSection}>
                    {showGap && (
                      <div className={s.absenceBanner}>↩ {dayGap}-day absence, then returned</div>
                    )}
                    <div className={s.dateLabel}>
                      {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </div>
                    <div className={s.entryList}>
                      {groupedByDate[date].map((entry) => (
                        <EntryCard key={entry.id} entry={entry} onOpenBible={openEntryInBible} onOpenSource={openEntrySource} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={s.legacyWrap}>
              <div className={s.legacyCard}>
                <div className={s.legacyEyebrow}>Chapter V</div>
                <h2 className={s.legacyTitle}>The Shape of Returning</h2>
                <div className={s.legacyMeta}>Built from your saved Chronicle entries</div>
                <div className={s.legacyBody}>{legacyNarrative}</div>
                <div className={s.legacyFooter}>
                  Generated from {chronicleEntries.length} Chronicle entr{chronicleEntries.length === 1 ? 'y' : 'ies'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className={s.sidePanel}>
        <div className={s.panelSection}>
          <div className={s.panelTitle}>Summary</div>
          <div className={s.statGrid}>
            {[
              { n: chronicleEntries.length, l: 'Entries' },
              { n: Object.keys(groupedByDate).length, l: 'Days' },
              { n: 6, l: 'Months' },
              { n: chronicleEntries.filter(e => e.autoCapture).length, l: 'Auto' },
            ].map((stat) => (
              <div key={stat.l} className={s.statCard}>
                <div className={s.statValue}>{stat.n}</div>
                <div className={s.statLabel}>{stat.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className={s.panelSection}>
          <div className={s.panelTitle}>By Type</div>
          {(['insight', 'prayer', 'study', 'note', 'reflection'] as const).map((type) => {
            const count = chronicleEntries.filter((e) => e.type === type).length;
            const pct = Math.round((count / totalEntries) * 100);
            return (
              <div key={type} className={s.typeMetric}>
                <div className={s.typeMetricHeader}>
                  <span className={s.typeMetricLabel}>{type}</span>
                  <span className={s.typeMetricCount}>{count}</span>
                </div>
                <div className={s.typeMetricTrack}>
                  <div className={s.typeMetricFill} style={{ background: TYPE_COLORS[type], width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className={s.panelSection}>
          <div className={s.panelTitle}>Formation Story</div>
          <div className={s.panelCard}>{journey.story}</div>
        </div>
        <div className={s.panelSection}>
          <div className={s.panelTitle}>Reflection Prompts</div>
          <div className={s.promptList}>
            {reflectionPrompts.map((prompt) => (
              <div key={prompt.id} className={s.promptCard}>
                <div className={s.promptLabel}>{prompt.label}</div>
                <div className={s.promptBody}>{prompt.prompt}</div>
                <div className={s.promptFollowThrough}>{prompt.followThrough}</div>
              </div>
            ))}
            <button
              onClick={() => {
                addChronicleEntry({
                  id: Math.random().toString(36).slice(2),
                  date: new Date().toISOString().split('T')[0],
                  type: 'reflection',
                  title: `Chronicle reflection prompts${effectivePassageFilter ? ` · ${effectivePassageFilter}` : ''}`,
                  body: reflectionPrompts.map((prompt) => `${prompt.label}: ${prompt.prompt}\n${prompt.followThrough}`).join('\n\n'),
                  passage: effectivePassageFilter || selectedEntry?.passage,
                  autoCapture: true,
                  sourceContext: {
                    page: 'chronicle',
                    passage: effectivePassageFilter || selectedEntry?.passage,
                  },
                });
              }}
              className={s.fullWidthButton}
            >
              Save Prompt Set
            </button>
          </div>
        </div>
        <div className={s.panelSection}>
          <div className={s.panelTitle}>Add Entry</div>
          <button
            onClick={() => setNewEntryOpen(true)}
            className={`${s.fullWidthButton} ${s.primaryButton}`}
          >
            + New Entry
          </button>
        </div>
      </div>

      <NewEntryModal open={newEntryOpen} onClose={() => setNewEntryOpen(false)} />
    </div>
  );
}

function sourceActionLabel(entry: ChronicleEntry) {
  const page = entry.sourceContext?.page;
  if (page === 'bible') return 'Return to Bible';
  if (page === 'study') return 'Return to Study';
  if (page === 'discipleship') {
    return entry.sourceContext?.readerView === 'workbook' ? 'Return to Workbook' : 'Return to Discipleship';
  }
  if (page === 'prayer') return 'Return to Prayer';
  if (page === 'today') return 'Return to Today';
  return 'Return to Source';
}

function EntryCard({ entry, onOpenBible, onOpenSource }: { entry: ChronicleEntry; onOpenBible: (entry: ChronicleEntry) => void; onOpenSource: (entry: ChronicleEntry) => void }) {
  return (
    <div className={s.entryCard} style={{ borderLeftColor: TYPE_COLORS[entry.type] }}>
      <div className={s.entryHeader}>
        <span className={s.typeBadge} style={{ color: TYPE_COLORS[entry.type], background: TYPE_BG[entry.type] }}>
          {entry.type}
        </span>
        {entry.passage && (
          <button
            onClick={() => onOpenBible(entry)}
            className={s.passageButton}
          >
            {entry.passage}
          </button>
        )}
        {entry.autoCapture && (
          <span className={s.autoBadge}>auto</span>
        )}
      </div>
      <div className={s.entryTitle}>{entry.title}</div>
      <div className={s.entryBody}>{entry.body}</div>
      {entry.sourceContext ? (
        <div className={s.entryActions}>
          <button
            onClick={() => onOpenSource(entry)}
            className={s.sourceButton}
          >
            {sourceActionLabel(entry)}
          </button>
        </div>
      ) : null}
      {entry.themes && (
        <div className={s.themeRow}>
          {entry.themes.map((t) => (
            <span key={t} className={s.themeChip}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}
