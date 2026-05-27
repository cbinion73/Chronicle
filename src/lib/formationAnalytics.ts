import type { ChronicleEntry, PrayerItem, FormationRhythm } from '../types';
import { deriveRhythmStats, isRhythmCompletedInCurrentPeriod } from './formationRhythms';

export interface ThemeSignal {
  id: string;
  label: string;
  count: number;
  mine: boolean;
  color: string;
  category: string;
  passages: Array<{ ref: string; text: string; entryId: string }>;
  relatedThemes: string[];
  entryTypes: Record<ChronicleEntry['type'], number>;
  timeline: Array<{ month: string; count: number }>;
}

const THEME_COLOR_MAP: Record<string, string> = {
  grace: '#0f4fcf',
  faith: '#4f46e5',
  love: '#db2777',
  trust: '#7c3aed',
  guidance: '#2563eb',
  rest: '#2b8dff',
  surrender: '#d97706',
  provision: '#0f766e',
  fear: '#0284c7',
  prayer: '#8b5cf6',
  peace: '#2563eb',
  truth: '#0f4fcf',
  incarnation: '#4f46e5',
  justification: '#1d4ed8',
};

const THEME_CATEGORY_MAP: Record<string, string> = {
  grace: 'Foundational',
  faith: 'Foundational',
  love: 'Foundational',
  truth: 'Foundational',
  trust: 'Formation',
  surrender: 'Formation',
  rest: 'Formation',
  guidance: 'Formation',
  fear: 'Personal',
  provision: 'Personal',
  prayer: 'Practice',
  peace: 'Practice',
  incarnation: 'Doctrine',
  justification: 'Doctrine',
};

const STOPWORDS = new Set([
  'about', 'after', 'again', 'been', 'before', 'because', 'being', 'came', 'come', 'could',
  'every', 'from', 'have', 'into', 'just', 'keep', 'lord', 'more', 'much', 'only', 'over',
  'really', 'said', 'still', 'that', 'their', 'them', 'there', 'these', 'this', 'those',
  'through', 'today', 'very', 'what', 'when', 'where', 'which', 'while', 'with', 'would',
  'your', 'yours', 'jesus', 'god',
]);

function parseEntryDate(date: string) {
  return new Date(`${date}T12:00:00`);
}

function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short' });
}

function formatLongDate(date: string) {
  return parseEntryDate(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !STOPWORDS.has(token));
}

function slugifyTheme(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function titleCase(value: string) {
  return value.split(/\s+/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function pickColor(themeId: string) {
  return THEME_COLOR_MAP[themeId] || '#0f4fcf';
}

function pickCategory(themeId: string) {
  return THEME_CATEGORY_MAP[themeId] || 'Emerging';
}

function inferThemesFromEntry(entry: ChronicleEntry) {
  if (entry.themes?.length) return entry.themes;

  const text = `${entry.title} ${entry.body}`.toLowerCase();
  const matches: string[] = [];
  const themeKeywords: Record<string, string[]> = {
    grace: ['grace', 'mercy', 'forgiveness'],
    trust: ['trust', 'trusted', 'rely'],
    guidance: ['guide', 'lead', 'path', 'shepherd'],
    rest: ['rest', 'peace', 'still'],
    surrender: ['surrender', 'release', 'give', 'yield'],
    fear: ['fear', 'afraid', 'anxiety', 'anxious'],
    provision: ['provide', 'provision', 'need'],
    prayer: ['pray', 'prayer', 'asked'],
  };

  for (const [theme, keywords] of Object.entries(themeKeywords)) {
    if (keywords.some((keyword) => text.includes(keyword))) matches.push(titleCase(theme));
  }

  return matches;
}

export function deriveThemeSignals(entries: ChronicleEntry[]): ThemeSignal[] {
  const themeMap = new Map<string, ThemeSignal>();

  for (const entry of entries) {
    const themes = inferThemesFromEntry(entry);
    const passageRef = entry.passage;
    const monthKey = formatMonthKey(parseEntryDate(entry.date));

    for (const themeLabel of themes) {
      const id = slugifyTheme(themeLabel);
      if (!themeMap.has(id)) {
        themeMap.set(id, {
          id,
          label: themeLabel,
          count: 0,
          mine: !entry.themes?.includes(themeLabel),
          color: pickColor(id),
          category: pickCategory(id),
          passages: [],
          relatedThemes: [],
          entryTypes: { insight: 0, prayer: 0, study: 0, note: 0, reflection: 0 },
          timeline: [],
        });
      }

      const signal = themeMap.get(id)!;
      signal.count += 1;
      signal.entryTypes[entry.type] += 1;

      if (passageRef && !signal.passages.some((passage) => passage.ref === passageRef)) {
        signal.passages.push({
          ref: passageRef,
          text: entry.body.slice(0, 180),
          entryId: entry.id,
        });
      }

      const timelineEntry = signal.timeline.find((item) => item.month === monthKey);
      if (timelineEntry) timelineEntry.count += 1;
      else signal.timeline.push({ month: monthKey, count: 1 });

      const related = new Set(signal.relatedThemes);
      for (const other of themes) {
        if (other !== themeLabel) related.add(other);
      }
      signal.relatedThemes = Array.from(related);
    }
  }

  return Array.from(themeMap.values())
    .map((signal) => ({
      ...signal,
      passages: signal.passages.slice(0, 6),
      timeline: signal.timeline.sort((a, b) => a.month.localeCompare(b.month)),
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function deriveMonthlyActivity(entries: ChronicleEntry[], months = 6) {
  const now = new Date();
  const monthKeys = Array.from({ length: months }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (months - index - 1), 1);
    return formatMonthKey(date);
  });

  return monthKeys.map((month) => ({
    month,
    label: formatMonthLabel(month),
    count: entries.filter((entry) => formatMonthKey(parseEntryDate(entry.date)) === month).length,
  }));
}

export function deriveScriptureRetention(entries: ChronicleEntry[]) {
  const counts = new Map<string, { count: number; last: string }>();
  for (const entry of entries) {
    if (!entry.passage) continue;
    const current = counts.get(entry.passage) || { count: 0, last: entry.date };
    current.count += 1;
    if (entry.date > current.last) current.last = entry.date;
    counts.set(entry.passage, current);
  }

  const maxCount = Math.max(1, ...Array.from(counts.values()).map((item) => item.count));
  return Array.from(counts.entries())
    .map(([ref, data]) => ({
      ref,
      pct: Math.round((data.count / maxCount) * 100),
      revisits: data.count,
      last: data.last === new Date().toISOString().slice(0, 10) ? 'today' : formatLongDate(data.last),
    }))
    .sort((a, b) => b.revisits - a.revisits || a.ref.localeCompare(b.ref))
    .slice(0, 8);
}

export function deriveFormationSummary(entries: ChronicleEntry[]) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const dates = Array.from(new Set(sorted.map((entry) => entry.date)));
  const gaps = dates.slice(1).map((date, index) => {
    const prev = parseEntryDate(dates[index]);
    const current = parseEntryDate(date);
    return Math.round((current.getTime() - prev.getTime()) / 86400000) - 1;
  });
  const longestGap = Math.max(0, ...gaps);
  const returnCount = gaps.filter((gap) => gap >= 2).length;
  const surrenderCount = entries.filter((entry) => /give|release|surrender|trust/i.test(entry.body)).length;
  const prayerCount = entries.filter((entry) => entry.type === 'prayer').length;
  const psalmCount = entries.filter((entry) => /psalm/i.test(entry.passage || entry.title || '')).length;

  return {
    totalEntries: entries.length,
    activeDays: dates.length,
    longestGap,
    returnCount,
    surrenderCount,
    prayerCount,
    psalmCount,
    summary:
      entries.length === 0
        ? 'Chronicle has not gathered enough writing yet to describe a formation pattern.'
        : `Chronicle shows a returning rhythm. ${returnCount > 0 ? `There ${returnCount === 1 ? 'was' : 'were'} ${returnCount} meaningful return${returnCount === 1 ? '' : 's'} after time away.` : 'The writing has been fairly steady.'} Prayer appears in ${prayerCount} entries, and language of trust, release, or surrender shows up ${surrenderCount} times. ${psalmCount > 0 ? `The Psalms still look like a stabilizing place, with ${psalmCount} Psalm-linked entries.` : 'The next step is letting Scripture references become more regular.'}`,
  };
}

export function derivePatterns(entries: ChronicleEntry[]) {
  const summary = deriveFormationSummary(entries);
  const prayerEntries = entries.filter((entry) => entry.type === 'prayer').length;
  const studyEntries = entries.filter((entry) => entry.type === 'study' || entry.type === 'insight').length;
  const fearEntries = entries.filter((entry) => /fear|anxiety|afraid|worry/i.test(`${entry.title} ${entry.body}`)).length;
  const gratitudeEntries = entries.filter((entry) => /thank|grat|praise/i.test(`${entry.title} ${entry.body}`)).length;

  const patterns = [
    {
      icon: '↩',
      title: 'Return Rhythm',
      desc: summary.returnCount > 0
        ? `Chronicle detected ${summary.returnCount} meaningful return${summary.returnCount === 1 ? '' : 's'} after time away. The important pattern is not perfection, but return.`
        : 'Your recent writing pattern is more steady than stop-start. Consistency is becoming a formation habit.',
    },
    {
      icon: '🙏',
      title: 'Prayer Weight',
      desc: `Prayer entries account for ${prayerEntries} of ${entries.length || 1} Chronicle moments. The app is functioning more like a prayer companion than a general notes app.`,
    },
    {
      icon: '📖',
      title: 'Scripture Anchor',
      desc: studyEntries > 0
        ? `Study and insight entries show up ${studyEntries} times, which means Scripture is not just being read but processed.`
        : 'Scripture-linked entries are still thin. Chronicle should keep nudging study into writing.',
    },
    {
      icon: '😰',
      title: 'Pressure Signal',
      desc: fearEntries > 0
        ? `Fear or anxiety language appears in ${fearEntries} entries. Chronicle should keep routing those moments toward prayer, trust, and concrete passages.`
        : 'Fear language is not dominating the recent writing, which suggests the current season is less pressure-driven.',
    },
    {
      icon: '🤲',
      title: 'Gratitude and Release',
      desc: gratitudeEntries > 0
        ? `Thanksgiving, praise, or gratitude appears in ${gratitudeEntries} entries. That gives Chronicle real evidence of softening, not just strain.`
        : 'Gratitude language is still sparse. That may be a good place for Chronicle to gently cultivate balance.',
    },
  ];

  return patterns;
}

export function deriveSuggestions(_entries: ChronicleEntry[], themes: ThemeSignal[]) {
  const topThemes = themes.slice(0, 3).map((theme) => theme.label.toLowerCase());
  const suggestions: Array<{ reason: string; ref: string; text: string }> = [];

  if (topThemes.some((theme) => theme.includes('fear') || theme.includes('trust'))) {
    suggestions.push({ reason: 'Trust and fear keep surfacing', ref: 'Isaiah 41:10', text: '"Fear not, for I am with you..."' });
  }
  if (topThemes.some((theme) => theme.includes('rest') || theme.includes('guidance'))) {
    suggestions.push({ reason: 'Rest and guidance remain active', ref: 'Psalm 46:10', text: '"Be still, and know that I am God."' });
  }
  if (topThemes.some((theme) => theme.includes('grace') || theme.includes('love'))) {
    suggestions.push({ reason: 'Grace language is carrying weight', ref: 'Ephesians 2:8-10', text: '"By grace you have been saved through faith..."' });
  }

  if (suggestions.length === 0) {
    suggestions.push({ reason: 'Keep Scripture central', ref: 'Psalm 23', text: '"The Lord is my shepherd; I shall not want."' });
  }

  return suggestions.slice(0, 3);
}

export function derivePlanMilestones(currentPlanDay: number, currentPlanTotal: number) {
  const checkpoints = [
    { label: 'Quarter mark', day: Math.max(1, Math.round(currentPlanTotal * 0.25)) },
    { label: 'Halfway point', day: Math.max(1, Math.round(currentPlanTotal * 0.5)) },
    { label: 'Three-quarter mark', day: Math.max(1, Math.round(currentPlanTotal * 0.75)) },
    { label: 'Plan complete', day: currentPlanTotal },
  ];

  return checkpoints.map((checkpoint) => ({
    label: checkpoint.label,
    day: checkpoint.day,
    status: currentPlanDay > checkpoint.day ? 'done' : currentPlanDay === checkpoint.day ? 'next' : 'future',
    date: `Day ${checkpoint.day}`,
  }));
}

export function derivePlanStats(entries: ChronicleEntry[], prayerItems: PrayerItem[], currentPlanDay: number) {
  const now = new Date();
  const thisMonthEntries = entries.filter((entry) => {
    const date = parseEntryDate(entry.date);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
  const activeDays = new Set(thisMonthEntries.map((entry) => entry.date)).size;
  const daysSoFar = now.getDate();

  return {
    daysRead: activeDays,
    missedDays: Math.max(0, daysSoFar - activeDays),
    pace: `${Math.round((activeDays / Math.max(1, daysSoFar)) * 100)}%`,
    answeredPrayers: prayerItems.filter((item) => item.answered).length,
    todayPassage: currentPlanDay <= 150 ? `Psalm ${Math.max(1, currentPlanDay)}` : `Proverbs ${Math.max(1, currentPlanDay - 150)}`,
  };
}

export function derivePrayerFormation(prayerItems: PrayerItem[]) {
  const now = new Date();
  const openItems = prayerItems.filter((item) => !item.answered);
  const answeredItems = prayerItems.filter((item) => item.answered);
  const prayedTouches = prayerItems.reduce((sum, item) => sum + (item.timesPrayed || 0), 0);

  const turnaroundDays = answeredItems
    .filter((item) => item.dateAnswered)
    .map((item) => {
      const start = parseEntryDate(item.dateAdded);
      const end = parseEntryDate(item.dateAnswered!);
      return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
    });

  const avgTurnaroundDays = turnaroundDays.length
    ? Math.round(turnaroundDays.reduce((sum, days) => sum + days, 0) / turnaroundDays.length)
    : 0;

  const oldestOpenDays = openItems.length
    ? Math.max(
        ...openItems.map((item) =>
          Math.max(0, Math.round((now.getTime() - parseEntryDate(item.dateAdded).getTime()) / 86400000)),
        ),
      )
    : 0;

  const followUpDueCount = openItems.filter((item) => {
    if (item.nextFollowUpAt) {
      return parseEntryDate(item.nextFollowUpAt).getTime() <= now.getTime();
    }
    const anchor = item.lastPrayedAt || item.dateAdded;
    return Math.round((now.getTime() - parseEntryDate(anchor).getTime()) / 86400000) >= 7;
  }).length;

  const recentlyAnswered = answeredItems
    .filter((item) => item.dateAnswered)
    .sort((left, right) => (right.dateAnswered || '').localeCompare(left.dateAnswered || ''))
    .slice(0, 3)
    .map((item) => ({
      text: item.text,
      dateAnswered: item.dateAnswered!,
      summary: item.answerSummary || 'Chronicle marked this request as answered.',
      passage: item.answerPassage,
    }));

  const mostCarried = [...openItems]
    .sort((left, right) => (right.timesPrayed || 0) - (left.timesPrayed || 0))
    .slice(0, 3)
    .map((item) => ({
      text: item.text,
      timesPrayed: item.timesPrayed || 0,
      lastPrayedAt: item.lastPrayedAt,
    }));

  return {
    activeCount: openItems.length,
    answeredCount: answeredItems.length,
    avgTurnaroundDays,
    oldestOpenDays,
    prayedTouches,
    followUpDueCount,
    recentlyAnswered,
    mostCarried,
  };
}

export function deriveRhythmFormation(rhythms: FormationRhythm[]) {
  const stats = deriveRhythmStats(rhythms);
  const totalCompletions = rhythms.reduce((sum, rhythm) => sum + rhythm.completions.length, 0);

  return {
    total: stats.total,
    completedNow: stats.completedNow,
    remainingNow: stats.remainingNow,
    dailyCompleted: stats.dailyCompleted,
    weeklyCompleted: stats.weeklyCompleted,
    totalCompletions,
    strongestRhythm: stats.strongestRhythm
      ? {
          title: stats.strongestRhythm.title,
          count: stats.strongestRhythm.completions.length,
          cadence: stats.strongestRhythm.cadence,
        }
      : null,
    dueRhythms: rhythms
      .filter((rhythm) => !isRhythmCompletedInCurrentPeriod(rhythm))
      .map((rhythm) => ({
        id: rhythm.id,
        title: rhythm.title,
        cadence: rhythm.cadence,
        focus: rhythm.focus,
      })),
  };
}

export function deriveFormationJourney(
  entries: ChronicleEntry[],
  prayerItems: PrayerItem[],
  rhythms: FormationRhythm[],
) {
  const summary = deriveFormationSummary(entries);
  const prayer = derivePrayerFormation(prayerItems);
  const rhythm = deriveRhythmFormation(rhythms);
  const topThemes = deriveThemeSignals(entries).slice(0, 3).map((theme) => theme.label);
  const anchoredPassages = deriveScriptureRetention(entries).slice(0, 3).map((item) => item.ref);

  const story = [
    `Chronicle sees formation taking shape through return, not raw intensity.`,
    `${summary.returnCount > 0 ? `There have been ${summary.returnCount} meaningful returns after quiet stretches.` : 'Recent engagement has been comparatively steady.'} Prayer requests have been carried ${prayer.prayedTouches} times, with ${prayer.answeredCount} answered request${prayer.answeredCount === 1 ? '' : 's'} remembered instead of forgotten.`,
    `${rhythm.completedNow} of ${Math.max(1, rhythm.total)} recurring rhythm${rhythm.total === 1 ? '' : 's'} are marked in the current window, and ${rhythm.strongestRhythm ? `${rhythm.strongestRhythm.title} is becoming the steadiest practiced pattern.` : 'the recurring-rhythm layer is only beginning to gather history.'}`,
    `${topThemes.length > 0 ? `The strongest formation themes right now are ${topThemes.join(', ')}.` : 'Theme history is still thin.'} ${anchoredPassages.length > 0 ? `The passages most often returned to are ${anchoredPassages.join(', ')}.` : 'Chronicle still needs more repeated passage anchors to tell that part of the story well.'}`,
  ].join(' ');

  return {
    story,
    milestones: [
      { label: 'Answered prayers remembered', value: prayer.answeredCount },
      { label: 'Prayer touches recorded', value: prayer.prayedTouches },
      { label: 'Rhythm completions logged', value: rhythm.totalCompletions },
      { label: 'Scripture revisits tracked', value: anchoredPassages.length },
    ],
  };
}

export function deriveLegacyChapters(entries: ChronicleEntry[]) {
  const byYear = new Map<number, number>();
  for (const entry of entries) {
    const year = parseEntryDate(entry.date).getFullYear();
    byYear.set(year, (byYear.get(year) || 0) + 1);
  }

  const years = Array.from(byYear.entries()).sort((a, b) => a[0] - b[0]);
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  return years.map(([year, count], index) => ({
    num: roman[index] || String(index + 1),
    title: index === years.length - 1 ? 'The Current Season' : `The ${year} Season`,
    period: String(year),
    status: index === years.length - 1 ? 'active' : 'done',
    count,
  }));
}

export function deriveLegacyNarrative(entries: ChronicleEntry[]) {
  const summary = deriveFormationSummary(entries);
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const latestReflection = [...entries].find((entry) => entry.type === 'reflection' || entry.type === 'prayer');

  const lines = [
    `Chronicle reads this season as a life of returning, not a life of flawless momentum.`,
    '',
    `Across ${summary.totalEntries} saved entries and ${summary.activeDays} active days, the recurring movement is simple: show up, drift, return, and listen again.`,
    '',
    summary.longestGap > 0
      ? `The longest recent gap was ${summary.longestGap} day${summary.longestGap === 1 ? '' : 's'}, yet the writing keeps bending back toward prayer and Scripture.`
      : 'There have not been large gaps in the recent writing, which suggests a growing steadiness in formation.',
    '',
    latestReflection
      ? `One of the clearest lines in the Chronicle came on ${formatLongDate(latestReflection.date)}: "${latestReflection.body.slice(0, 160)}${latestReflection.body.length > 160 ? '...' : ''}"`
      : 'The recent entries are still gathering shape, but the tone already suggests honesty, dependence, and a willingness to begin again.',
    '',
    `The period from ${first ? formatLongDate(first.date) : 'the first saved day'} to ${last ? formatLongDate(last.date) : 'today'} looks less like a straight climb and more like a faithful return path. That is a better legacy than polished language without repentance.`,
  ];

  return lines.join('\n');
}

export function answerLegacyQuestion(entries: ChronicleEntry[], question: string) {
  const lower = question.toLowerCase();
  const scored = entries
    .map((entry) => {
      const haystack = `${entry.title} ${entry.body} ${entry.passage || ''}`.toLowerCase();
      let score = 0;
      for (const token of tokenize(question)) {
        if (haystack.includes(token)) score += 1;
      }
      return { entry, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.entry.date.localeCompare(a.entry.date));

  const chosen = scored.slice(0, 3).map((item) => item.entry);
  if (chosen.length === 0) {
    return {
      text: 'I do not have a strong answer from the saved Chronicle entries yet. The next best step is to keep writing honestly so the legacy surface has more real material to draw from.',
      sources: [],
    };
  }

  const emphasis = lower.includes('fear')
    ? 'Fear shows up, but it is usually carried into prayer or Scripture rather than left alone.'
    : lower.includes('trust')
      ? 'Trust appears less as instant confidence and more as a repeated act of handing things back to God.'
      : lower.includes('prayer')
        ? 'Prayer reads less like performance and more like a place to tell the truth.'
        : 'The clearest answer is in the repeated patterns of language, Scripture, and return.';

  return {
    text: `${emphasis}\n\n${chosen.map((entry) => `${formatLongDate(entry.date)} — ${entry.title}: ${entry.body.slice(0, 150)}${entry.body.length > 150 ? '...' : ''}`).join('\n\n')}`,
    sources: chosen.map((entry) => `${formatLongDate(entry.date)} — ${entry.title}`),
  };
}

export function groupThemesByCategory(themes: ThemeSignal[]) {
  const groups = new Map<string, ThemeSignal[]>();
  for (const theme of themes) {
    const category = theme.category;
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category)!.push(theme);
  }
  return Array.from(groups.entries())
    .map(([name, items]) => ({ name, themes: items.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function deriveCanonCoverage(passages: string[]) {
  const buckets = [
    { label: 'Law', match: ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'] },
    { label: 'History', match: ['Joshua', 'Judges', 'Ruth', 'Samuel', 'Kings', 'Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Acts'] },
    { label: 'Wisdom', match: ['Job', 'Psalm', 'Proverbs', 'Ecclesiastes', 'Song'] },
    { label: 'Prophets', match: ['Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi'] },
    { label: 'Gospels', match: ['Matthew', 'Mark', 'Luke', 'John'] },
    { label: 'Epistles', match: ['Romans', 'Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', 'Thessalonians', 'Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', 'Peter', 'Jude', 'Revelation', 'John'] },
  ];

  const totals = buckets.map((bucket) => ({
    label: bucket.label,
    count: passages.filter((passage) => bucket.match.some((name) => passage.startsWith(name))).length,
  }));
  const total = Math.max(1, totals.reduce((sum, bucket) => sum + bucket.count, 0));
  const colors = ['#0f4fcf', '#4f46e5', '#7c3aed', '#d97706', '#0284c7', '#db2777'];

  return totals.map((bucket, index) => ({
    label: bucket.label,
    pct: Math.max(0, Math.round((bucket.count / total) * 100)),
    color: colors[index % colors.length],
  }));
}
