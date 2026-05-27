import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { useToastStore } from '../store/toastStore';
import type { PrayerItem } from '../types';
import { useAIChatStore } from '../store/aiChatStore';
import { getBibleNavigationTarget } from '../lib/scriptureReference';
import { getRelatedChronicleEntries } from '../lib/chronicleRelations';
import { buildReflectionPrompts } from '../lib/reflectionPrompts';
import { deriveRhythmStats, isRhythmCompletedInCurrentPeriod } from '../lib/formationRhythms';
import { useResponsiveLayout } from '../lib/useResponsiveLayout';

const CATEGORIES = ['All', 'People', 'Needs', 'Praise', 'World', 'Answered'];

const CAT_COLORS: Record<string, string> = {
  people: 'var(--accent-blue)',
  needs: 'var(--accent-amber)',
  praise: 'var(--accent-green)',
  world: 'var(--accent-purple)',
};

export default function Prayer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { prayerItems, chronicleEntries, formationRhythms, completeFormationRhythm, togglePrayerAnswered, markPrayerAnswered, recordPrayerTouch, addPrayerItem, addChronicleEntry, setBibleView } = useAppStore();
  const { addToast } = useToastStore();
  const setPageContext = useAIChatStore((state) => state.setPageContext);
  const setSelectedAgentMode = useAIChatStore((state) => state.setSelectedAgentMode);
  const [activeCategory, setActiveCategory] = useState('All');
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState<'people'|'needs'|'praise'|'world'>('needs');
  const [answeringPrayerId, setAnsweringPrayerId] = useState<string | null>(null);
  const [answerSummary, setAnswerSummary] = useState('');
  const [answerPassage, setAnswerPassage] = useState('');
  const [prayerText, setPrayerText] = useState(
    'Lord, I give you Sarah\'s surgery. I give you the fear I have about what I don\'t know. You know. You hold. That\'s enough.'
  );
  const { isCompact, isPhone } = useResponsiveLayout();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef('');
  const seededRouteKey = useRef<string | null>(null);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (prayerText.trim().length < 15) return;
    saveTimer.current = setTimeout(() => {
      if (prayerText.trim() !== lastSaved.current) {
        lastSaved.current = prayerText.trim();
        addChronicleEntry({
          id: Math.random().toString(36).slice(2),
          date: new Date().toISOString().split('T')[0],
          type: 'prayer',
          title: prayerText.trim().slice(0, 60),
          body: prayerText.trim(),
          autoCapture: true,
          sourceContext: {
            page: 'prayer',
          },
        });
        addToast('Prayer saved to Chronicle', 'success', '🙏');
      }
    }, 2500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [addChronicleEntry, addToast, prayerText]);

  const filtered = prayerItems.filter((p) => {
    if (activeCategory === 'All') return !p.answered;
    if (activeCategory === 'Answered') return p.answered;
    return p.category === activeCategory.toLowerCase() && !p.answered;
  });

  const answeredItems = prayerItems.filter((p) => p.answered);
  const now = useMemo(() => new Date(), []);
  const nowTime = now.getTime();
  const monthPrayerEntries = chronicleEntries.filter((entry) => {
    if (entry.type !== 'prayer') return false;
    const date = new Date(`${entry.date}T12:00:00`);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
  const prayerDaysThisMonth = new Set(monthPrayerEntries.map((entry) => entry.date)).size;
  const activeNeedsCount = prayerItems.filter((item) => item.category === 'needs' && !item.answered).length;
  const followUpQueue = useMemo(
    () =>
      prayerItems
        .filter((item) => !item.answered)
        .map((item) => {
          const anchor = item.nextFollowUpAt || item.lastPrayedAt || item.dateAdded;
          const daysSinceAnchor = Math.max(
            0,
            Math.round((nowTime - new Date(`${anchor}T12:00:00`).getTime()) / 86400000),
          );
          const due = item.nextFollowUpAt
            ? new Date(`${item.nextFollowUpAt}T12:00:00`).getTime() <= nowTime
            : daysSinceAnchor >= 7;
          return { ...item, due, daysSinceAnchor };
        })
        .sort((left, right) => {
          if (left.due !== right.due) return left.due ? -1 : 1;
          return (right.timesPrayed || 0) - (left.timesPrayed || 0);
        })
        .slice(0, 4),
    [nowTime, prayerItems],
  );
  const mostCarriedPrayer = [...prayerItems]
    .filter((item) => !item.answered)
    .sort((left, right) => (right.timesPrayed || 0) - (left.timesPrayed || 0))[0];
  const categoryOrder = ['needs', 'people', 'praise', 'world'] as const;
  const primaryCategory = activeCategory === 'All' || activeCategory === 'Answered'
    ? [...categoryOrder].sort((left, right) => (
      prayerItems.filter((item) => item.category === right && !item.answered).length
      - prayerItems.filter((item) => item.category === left && !item.answered).length
    ))[0]
    : activeCategory.toLowerCase() as 'people' | 'needs' | 'praise' | 'world';
  const prayerGuide = {
    people: {
      title: 'Carry Someone by Name',
      prompt: 'Who needs to be named before God with affection, honesty, and faith today?',
      verse: 'Galatians 6:2',
      text: 'Bear one another’s burdens, and so fulfill the law of Christ.',
    },
    needs: {
      title: 'Bring the Need Honestly',
      prompt: 'What are you trying to manage before you have actually given it to God?',
      verse: 'Philippians 4:6',
      text: 'Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.',
    },
    praise: {
      title: 'Answer with Thanksgiving',
      prompt: 'Where has God already shown kindness, steadiness, or provision that deserves your thanks today?',
      verse: 'Psalm 103:2',
      text: 'Bless the Lord, O my soul, and forget not all His benefits.',
    },
    world: {
      title: 'Lift the World Before God',
      prompt: 'Where does the brokenness around you need intercession more than commentary today?',
      verse: '1 Timothy 2:1',
      text: 'I exhort first of all that supplications, prayers, intercessions, and giving of thanks be made for all men.',
    },
  }[primaryCategory];
  const relatedChronicleEntries = useMemo(
    () => getRelatedChronicleEntries(chronicleEntries, {
      page: 'prayer',
      passage: prayerGuide.verse,
      limit: 4,
    }),
    [chronicleEntries, prayerGuide.verse],
  );
  const reflectionPrompts = useMemo(
    () => buildReflectionPrompts({
      passage: prayerGuide.verse,
      focus: prayerGuide.prompt,
      sourceLabel: prayerGuide.title,
      summary: prayerText || prayerGuide.prompt,
    }),
    [prayerGuide.prompt, prayerGuide.title, prayerGuide.verse, prayerText],
  );
  const rhythmStats = useMemo(() => deriveRhythmStats(formationRhythms), [formationRhythms]);

  useEffect(() => {
    const routeState = location.state as { source?: string; title?: string; passage?: string; prompt?: string } | null;
    if (!routeState?.prompt) return;
    const seedKey = `${routeState.source || 'route'}:${routeState.title || ''}:${routeState.passage || ''}:${routeState.prompt}`;
    if (seededRouteKey.current === seedKey) return;
    seededRouteKey.current = seedKey;
    setPrayerText(routeState.prompt);
    addToast(`Prayer loaded from ${routeState.title || routeState.source || 'another page'}.`, 'success', '🙏');
    navigate(location.pathname, { replace: true, state: null });
  }, [addToast, location.pathname, location.state, navigate]);

  useEffect(() => {
    setSelectedAgentMode('prayer_guide');
    setPageContext('/prayer', {
      page: 'Prayer',
      pathname: '/prayer',
      title: document.title,
      selection: prayerText,
      passage: prayerGuide.verse,
      summary: `Active prayer category: ${activeCategory}. Open requests: ${prayerItems.filter((item) => !item.answered).length}. Answered requests: ${answeredItems.length}. Prayer days recorded this month: ${prayerDaysThisMonth}. Related Chronicle thread entries: ${relatedChronicleEntries.length}.`,
    });
  }, [activeCategory, answeredItems.length, prayerDaysThisMonth, prayerGuide.verse, prayerItems, prayerText, relatedChronicleEntries.length, setPageContext, setSelectedAgentMode]);

  const handleAddRequest = () => {
    if (!newText.trim()) return;
    const today = new Date().toISOString().split('T')[0];
    const followUp = new Date();
    followUp.setDate(followUp.getDate() + 3);
    addPrayerItem({
      id: Math.random().toString(36).slice(2),
      text: newText.trim(),
      category: newCategory,
      answered: false,
      dateAdded: today,
      timesPrayed: 0,
      nextFollowUpAt: followUp.toISOString().split('T')[0],
    });
    setNewText('');
    setAddFormOpen(false);
    addToast('Prayer request added', 'success', '🙏');
  };

  const handlePrayedForItem = (item: PrayerItem) => {
    const touchDate = new Date().toISOString().split('T')[0];
    const nextFollowUp = new Date();
    nextFollowUp.setDate(nextFollowUp.getDate() + 3);
    recordPrayerTouch(item.id, {
      lastPrayedAt: touchDate,
      nextFollowUpAt: nextFollowUp.toISOString().split('T')[0],
    });
    setPrayerText((current) => {
      if (current.includes(item.text)) return current;
      return `${current.trim()}\n\nLord, I bring ${item.text.toLowerCase()} before You again. Keep me faithful in prayer and steady in trust.`.trim();
    });
    addToast('Prayer request brought into today’s prayer', 'success', '🙏');
  };

  const openAnswerPrayer = (item: PrayerItem) => {
    setAnsweringPrayerId(item.id);
    setAnswerSummary(item.answerSummary || '');
    setAnswerPassage(item.answerPassage || '');
  };

  const submitAnsweredPrayer = () => {
    const item = prayerItems.find((entry) => entry.id === answeringPrayerId);
    if (!item || !answerSummary.trim()) return;
    const answeredDate = new Date().toISOString().split('T')[0];
    markPrayerAnswered(item.id, {
      summary: answerSummary.trim(),
      passage: answerPassage.trim(),
      dateAnswered: answeredDate,
    });
    addChronicleEntry({
      id: Math.random().toString(36).slice(2),
      date: answeredDate,
      type: 'prayer',
      title: `Answered prayer — ${item.text.slice(0, 48)}`,
      body: answerSummary.trim(),
      passage: answerPassage.trim() || undefined,
      autoCapture: true,
      sourceContext: {
        page: 'prayer',
        passage: answerPassage.trim() || prayerGuide.verse,
      },
    });
    addToast('Answered prayer saved to Chronicle', 'success', '🙏');
    setAnsweringPrayerId(null);
    setAnswerSummary('');
    setAnswerPassage('');
  };

  const openSuggestedPassageInBible = () => {
    const target = getBibleNavigationTarget(prayerGuide.verse);
    if (target) {
      setBibleView({
        book: target.book,
        chapter: target.chapter,
        overlayOn: false,
        echoesOn: false,
        studyColorsOn: false,
        showThemePanel: false,
        panelMode: 'themes',
      });
    }
    navigate('/bible');
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: isCompact ? 'column' : 'row', overflow: 'hidden' }}>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isPhone ? '12px 14px' : '12px 20px', background: 'var(--card-bg)', borderBottom: '1px solid var(--border)', flexShrink: 0, gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                style={{
                  padding: '5px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: activeCategory === c ? 600 : 400,
                  background: activeCategory === c ? 'var(--accent-green)' : 'transparent',
                  color: activeCategory === c ? 'white' : 'var(--text-sub)',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <button
            onClick={() => setAddFormOpen(true)}
            style={{
              padding: '6px 14px',
              background: 'var(--accent-green)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}>
            + Add Request
          </button>
        </div>

        {/* Add Request Form */}
        {addFormOpen && (
          <div style={{ padding: isPhone ? '12px 14px' : '12px 20px', background: 'var(--card-inner)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>New Prayer Request</div>
            <textarea
              autoFocus
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddRequest(); if (e.key === 'Escape') setAddFormOpen(false); }}
              placeholder="What would you like to bring before God?"
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-serif)', background: 'var(--card-bg)', color: 'var(--text)', resize: 'none', minHeight: 70, outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' }}>
                {(['people', 'needs', 'praise', 'world'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setNewCategory(cat)}
                    style={{
                      padding: '3px 10px',
                      border: `1px solid ${newCategory === cat ? CAT_COLORS[cat] : 'var(--border)'}`,
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: newCategory === cat ? 600 : 400,
                      background: newCategory === cat ? `${CAT_COLORS[cat]}18` : 'transparent',
                      color: newCategory === cat ? CAT_COLORS[cat] : 'var(--text-muted)',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >{cat}</button>
                ))}
              </div>
              <button onClick={() => setAddFormOpen(false)} style={{ padding: '5px 12px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, color: 'var(--text-muted)', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAddRequest} style={{ padding: '5px 14px', background: 'var(--accent-green)', color: 'white', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Add</button>
            </div>
          </div>
        )}

        {/* Prayer list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isPhone ? '14px 14px 20px' : '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>

          {filtered.map((item) => (
            <PrayerCard key={item.id} item={item} onToggle={() => togglePrayerAnswered(item.id)} onPray={() => handlePrayedForItem(item)} onAnswer={() => openAnswerPrayer(item)} />
          ))}

          {/* Answered section */}
          {(activeCategory === 'All' || activeCategory === 'Answered') && answeredItems.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 8, marginBottom: 4 }}>
                ✓ Answered Prayers
              </div>
              {answeredItems.map((item) => (
                <PrayerCard key={item.id} item={item} onToggle={() => togglePrayerAnswered(item.id)} onPray={() => handlePrayedForItem(item)} onAnswer={() => openAnswerPrayer(item)} answered />
              ))}
            </>
          )}

          {filtered.length === 0 && activeCategory !== 'Answered' && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              No requests in this category yet.
            </div>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ width: isCompact ? '100%' : 288, minWidth: isCompact ? 0 : 288, borderLeft: isCompact ? 'none' : '1px solid var(--border)', borderTop: isCompact ? '1px solid var(--border)' : 'none', background: 'var(--card-bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Stats */}
        <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>This Month</div>
          <div style={{ display: 'grid', gridTemplateColumns: isPhone ? 'repeat(2, minmax(0, 1fr))' : '1fr 1fr', gap: 8 }}>
            {[
              { n: prayerItems.filter(p => !p.answered).length, l: 'Active' },
              { n: answeredItems.length, l: 'Answered' },
              { n: prayerDaysThisMonth, l: 'Days prayed' },
              { n: prayerItems.reduce((sum, item) => sum + (item.timesPrayed || 0), 0), l: 'Touches' },
            ].map((stat) => (
              <div key={stat.l} style={{ background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{stat.n}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{stat.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Today's prompt */}
        <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Follow Up Queue</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {followUpQueue.length > 0 ? followUpQueue.map((item) => (
              <div key={item.id} style={{ background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'grid', gap: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{item.text}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {item.due ? 'Follow-up is due now.' : `Last prayed ${item.daysSinceAnchor} day${item.daysSinceAnchor === 1 ? '' : 's'} ago.`} {item.timesPrayed ? `Carried ${item.timesPrayed} time${item.timesPrayed === 1 ? '' : 's'}.` : ''}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handlePrayedForItem(item)}
                    style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Pray Again
                  </button>
                  <button
                    onClick={() => openAnswerPrayer(item)}
                    style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Mark Answered
                  </button>
                </div>
              </div>
            )) : (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>No follow-up queue right now. Chronicle will surface requests that have been carried for a while or need another touch.</div>
            )}
          </div>
        </div>

        <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Pray Now</div>
          <div style={{ background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{prayerGuide.title}</div>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 13, fontStyle: 'italic', color: 'var(--text-sub)', lineHeight: 1.6 }}>
              "{prayerGuide.prompt}"
            </p>
          </div>
          <textarea
            value={prayerText}
            onChange={(e) => setPrayerText(e.target.value)}
            style={{
              width: '100%',
              fontFamily: 'var(--font-serif)',
              fontSize: 13,
              color: 'var(--text)',
              background: 'var(--card-inner)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '10px 12px',
              lineHeight: 1.65,
              resize: 'none',
              minHeight: 120,
              outline: 'none',
            }}
          />
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Auto-saved to Chronicle</div>
        </div>

        <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Reflection Prompts</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {reflectionPrompts.map((prompt) => (
              <div key={prompt.id} style={{ background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{prompt.label}</div>
                <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.55, color: 'var(--text)' }}>{prompt.prompt}</div>
                <div style={{ marginTop: 6, fontSize: 11, lineHeight: 1.5, color: 'var(--text-sub)' }}>{prompt.followThrough}</div>
              </div>
            ))}
            <button
              onClick={() => addChronicleEntry({
                id: Math.random().toString(36).slice(2),
                date: new Date().toISOString().split('T')[0],
                type: 'reflection',
                title: `Reflection prompts · ${prayerGuide.verse}`,
                body: reflectionPrompts.map((prompt) => `${prompt.label}: ${prompt.prompt}\n${prompt.followThrough}`).join('\n\n'),
                passage: prayerGuide.verse,
                autoCapture: true,
                sourceContext: {
                  page: 'prayer',
                  passage: prayerGuide.verse,
                },
              })}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
            >
              Save Reflection Prompts
            </button>
          </div>
        </div>

        {/* Passage */}
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Suggested Passage</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.7, fontStyle: 'italic', borderLeft: '3px solid var(--accent-green)', paddingLeft: 12 }}>
            "{prayerGuide.text}"
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-green)', marginTop: 6 }}>{prayerGuide.verse} · NKJV</div>
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={openSuggestedPassageInBible}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
            >
              Open in Bible
            </button>
            <button
              onClick={() => addChronicleEntry({
                id: Math.random().toString(36).slice(2),
                date: new Date().toISOString().split('T')[0],
                type: 'reflection',
                title: `Prayer reflection on ${prayerGuide.verse}`,
                body: prayerText.trim() || prayerGuide.prompt,
                passage: prayerGuide.verse,
                autoCapture: true,
                sourceContext: {
                  page: 'prayer',
                  passage: prayerGuide.verse,
                },
              })}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
            >
              Save Reflection
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
            {activeNeedsCount > 0
              ? `${activeNeedsCount} open need${activeNeedsCount === 1 ? '' : 's'} still waiting in prayer.`
              : 'No unresolved needs are currently waiting in this list.'}
          </div>
          {mostCarriedPrayer ? (
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Most-carried request right now: <strong style={{ color: 'var(--text)' }}>{mostCarriedPrayer.text}</strong> ({mostCarriedPrayer.timesPrayed || 0} prayer touches).
            </div>
          ) : null}
        </div>

        <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Recurring Rhythms</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 10 }}>
            {rhythmStats.completedNow} of {rhythmStats.total} rhythms are complete in the current cycle.
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {formationRhythms.map((rhythm) => {
              const completed = isRhythmCompletedInCurrentPeriod(rhythm);
              return (
                <div key={rhythm.id} style={{ background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{rhythm.title}</div>
                    <div style={{ fontSize: 10, color: completed ? 'var(--accent-green)' : 'var(--text-muted)', textTransform: 'uppercase' }}>{completed ? 'done' : rhythm.cadence}</div>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 11, lineHeight: 1.5, color: 'var(--text-sub)' }}>{rhythm.prompt}</div>
                  <button
                    onClick={() => {
                      completeFormationRhythm(rhythm.id);
                      addToast(`${rhythm.title} marked complete`, 'success', '✓');
                    }}
                    style={{ marginTop: 8, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {completed ? 'Completed This Cycle' : 'Mark Complete'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Related Chronicle Entries</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {relatedChronicleEntries.length > 0 ? relatedChronicleEntries.map((entry) => (
              <div key={entry.id} style={{ background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{entry.title}</div>
                <div style={{ marginTop: 4, fontSize: 11, lineHeight: 1.55, color: 'var(--text-sub)' }}>{entry.body}</div>
              </div>
            )) : (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.55 }}>
                Prayer entries and reflections saved to Chronicle will stay visible here so intercession does not drift away from the rest of your formation.
              </div>
            )}
            <button
              onClick={() => navigate('/chronicle', { state: { filterPassage: prayerGuide.verse } })}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
            >
              Open in Chronicle
            </button>
          </div>
        </div>

      </div>

      {answeringPrayerId ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30, padding: 24 }}>
          <div style={{ width: 'min(520px, 100%)', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 20px 40px rgba(15, 23, 42, 0.18)', padding: 20, display: 'grid', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Answered Prayer</div>
              <div style={{ marginTop: 6, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                {prayerItems.find((item) => item.id === answeringPrayerId)?.text}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>What happened?</div>
              <textarea
                autoFocus
                value={answerSummary}
                onChange={(e) => setAnswerSummary(e.target.value)}
                placeholder="Write the answer, provision, clarity, or change Chronicle should remember."
                style={{ width: '100%', minHeight: 110, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', fontSize: 13, lineHeight: 1.55, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Supporting passage (optional)</div>
              <input
                value={answerPassage}
                onChange={(e) => setAnswerPassage(e.target.value)}
                placeholder="Philippians 4:19"
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => { setAnsweringPrayerId(null); setAnswerSummary(''); setAnswerPassage(''); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={submitAnsweredPrayer} disabled={!answerSummary.trim()} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--accent-blue)', color: 'white', fontSize: 12, fontWeight: 700, cursor: answerSummary.trim() ? 'pointer' : 'default', opacity: answerSummary.trim() ? 1 : 0.55 }}>
                Save Answer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PrayerCard({ item, onToggle, onPray, onAnswer, answered }: { item: PrayerItem; onToggle: () => void; onPray: () => void; onAnswer: () => void; answered?: boolean }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '12px 14px',
      opacity: answered ? 0.6 : 1,
      boxShadow: 'var(--shadow)',
    }}>
      <button
        onClick={onToggle}
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          border: `2px solid ${answered ? 'var(--accent-green)' : 'var(--border)'}`,
          background: answered ? 'var(--accent-green)' : 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 1,
          transition: 'all 0.15s',
          color: 'white',
          fontSize: 10,
        }}
      >
        {answered ? '✓' : ''}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          color: 'var(--text)',
          textDecoration: answered ? 'line-through' : 'none',
          lineHeight: 1.5,
        }}>
          {item.text}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
          {item.dateAdded}
          {answered && item.dateAnswered && ` · Answered ${item.dateAnswered}`}
          {!answered && item.lastPrayedAt ? ` · Last prayed ${item.lastPrayedAt}` : ''}
          {!answered && item.timesPrayed ? ` · ${item.timesPrayed} touch${item.timesPrayed === 1 ? '' : 'es'}` : ''}
        </div>
        {answered && item.answerSummary ? (
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.55 }}>
            {item.answerSummary}
            {item.answerPassage ? <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}> · {item.answerPassage}</span> : null}
          </div>
        ) : null}
        {!answered ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <button
              onClick={onPray}
              style={{ padding: '5px 9px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
            >
              Pray Now
            </button>
            <button
              onClick={onAnswer}
              style={{ padding: '5px 9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
            >
              Mark Answered
            </button>
          </div>
        ) : null}
      </div>
      <div style={{
        padding: '2px 8px',
        borderRadius: 10,
        fontSize: 10,
        fontWeight: 600,
        background: `${CAT_COLORS[item.category]}20`,
        color: CAT_COLORS[item.category],
        flexShrink: 0,
        textTransform: 'capitalize',
      }}>
        {item.category}
      </div>
    </div>
  );
}
