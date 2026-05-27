import { Fragment, type ReactNode, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { BOOKS, getChapter, getChaptersForBook } from '../lib/scripture';
import { useToastStore } from '../store/toastStore';
import NewEntryModal from '../components/ui/NewEntryModal';
import {
  type BibleProviderId,
  fetchBibleChapter,
  getConfiguredBibleProvider,
  getExternalBibleLinks,
} from '../lib/bibleProviders';
import {
  getAvailableLocalBibleProviders,
  getLocalBibleBooks,
  getLocalBibleChapters,
  isLocalBibleProvider,
} from '../lib/localBibles';
import type { Chapter } from '../lib/scripture';
import {
  getChapterThemes,
  getVerseStudyInsight,
  persistChapterThemes,
  type BibleThemeDefinition,
  type VerseStudyInsight,
} from '../lib/bibleThemes';
import {
  getChapterCrossReferences,
  type ChapterCrossReference,
} from '../lib/bibleCrossReferences';
import {
  getChapterStudyColors,
  type StudyColorHit,
} from '../lib/bibleStudyColor';
import {
  getChapterWordStudy,
  supportsGreekWordStudy,
  type WordStudyToken,
} from '../lib/bibleWordStudy';
import { useAIChatStore } from '../store/aiChatStore';
import { formatPassageLabel, parseScriptureReference } from '../lib/scriptureReference';
import type { ChronicleEntry, ScriptureBookmark } from '../types';
import { useResponsiveLayout } from '../lib/useResponsiveLayout';

const TIER_COLORS: Record<string, string> = {
  Explicit: '#0f4fcf', Strong: '#2b8dff', Inferred: '#d97706', Debated: '#9ca3af',
};

interface VerseThemeHit {
  phrase: string;
  theme: BibleThemeDefinition;
}

interface InlineHighlight extends VerseThemeHit {
  start: number;
  end: number;
}

interface StudyColorInlineHighlight {
  phrase: string;
  start: number;
  end: number;
  hit: StudyColorHit;
}

interface VerseTranslationComparison {
  providerId: BibleProviderId;
  label: string;
  translation: string;
  verseText: string | null;
}

interface ChapterStudyQuestions {
  observation: string;
  interpretation: string;
  canonical: string;
  formation: string;
}

interface ThemeEvidenceSummary {
  totalThemeEvidenceItems: number;
  evidenceKinds: string[];
  totalCrossReferences: number;
  totalStudyColorVerses: number;
  totalGreekVerses: number;
  strength: 'thin' | 'grounded' | 'rich';
}

interface CanonicalThreadSummary {
  title: string;
  summary: string;
  movements: Array<{
    label: string;
    summary: string;
    references: string[];
  }>;
  references: string[];
}

interface TranslationDiscernmentSummary {
  summary: string;
  observations: string[];
  variationType: string;
  sharedCore: string;
  readingStrategy: string;
}

interface PassageSynthesisSummary {
  title: string;
  theologicalCenter: string;
  chapterShape: string[];
  authorStrategy: string;
  redemptiveFrame: string;
  livedResponse: string;
  tensions: string[];
}

function passageMatchesLocation(passage: string | undefined, book: string, chapter: number, verseNumber?: number) {
  if (!passage) return false;
  const parsed = parseScriptureReference(passage);
  if (!parsed) return false;
  if (parsed.book !== book || parsed.chapter !== chapter) return false;
  if (typeof verseNumber !== 'number') return true;
  if (!parsed.verseStart) return true;
  const rangeEnd = parsed.verseEnd || parsed.verseStart;
  return verseNumber >= parsed.verseStart && verseNumber <= rangeEnd;
}

function getEntryPassageLabel(entry: ChronicleEntry) {
  return entry.passage || 'Chronicle entry';
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildMeaningReflection(
  book: string,
  chapter: number,
  chapterData: Chapter | undefined,
  themes: BibleThemeDefinition[],
  crossReferences: ChapterCrossReference[],
  evidenceSummary: ThemeEvidenceSummary,
) {
  const topThemes = themes.slice(0, 3).map((theme) => theme.label);
  const themeIds = new Set(themes.map((theme) => theme.id));
  const topEchoes = crossReferences.slice(0, 3).map((reference) => reference.targetLabel).filter(Boolean);
  const topEcho = topEchoes[0] || null;
  const openingText = chapterData?.verses.slice(0, 3).map((verse) => verse.text).join(' ') || '';
  const evidenceKinds = new Set(evidenceSummary.evidenceKinds);

  let mainMovement = `Chronicle sees ${book} ${chapter} moving through ${topThemes.join(', ') || 'a cluster of linked theological ideas'} rather than one isolated idea.`;
  let whyHere = 'This chapter appears to be shaping how the reader understands God and the right human response, not merely delivering information.';
  let redemptivePlace = `${book} ${chapter} belongs inside the larger story of God making Himself known, calling a people, and drawing them into faithful response.`;
  let lifeImplication = `This chapter asks you to read yourself under God’s word, not over it: to receive what it reveals and let that reshape your next step.`;
  let formationPrompt = `Where does ${book} ${chapter} invite you to move from observation into response?`;

  if (book === 'John' && chapter === 1 && openingText.includes('In the beginning was the Word')) {
    mainMovement = 'John opens by establishing Jesus before creation, with God and as God, then moves from that eternal identity into witness, rejection, reception, and calling.';
    whyHere = 'John begins this way so the rest of the Gospel will be read through Christ’s identity. He does not want Jesus treated first as a miracle worker or teacher, but as the eternal Word who enters history.';
    redemptivePlace = 'This is creation and new-creation language. John deliberately echoes Genesis 1 so the reader sees that the One through whom all things were made is the same One entering the world to redeem it.';
    lifeImplication = 'Your life is not grounded in accident or religious performance but in the eternal Christ who speaks light into darkness, reveals the Father, and calls people to follow Him.';
    formationPrompt = 'If Jesus is truly the eternal Word made flesh, what would trusting Him more fully change in your worship, obedience, and confidence today?';
  } else if (themeIds.has('incarnation') || themeIds.has('identity')) {
    mainMovement = `${book} ${chapter} is strongly concerned with identity and revelation: before asking what Jesus does, the chapter presses the reader to reckon with who He is.`;
    whyHere = 'The chapter front-loads identity so everything else gets interpreted through the person of Christ rather than through detached events alone.';
    redemptivePlace = `This chapter sits close to the center of God’s self-revelation: the person of Christ is being used to interpret the rest of the story, not merely added onto it.`;
    lifeImplication = 'You are being asked to anchor trust, worship, and obedience in the person of Christ rather than in passing circumstances or borrowed familiarity.';
    formationPrompt = 'If this passage is telling you who Christ truly is, what response of trust, confession, or obedience does that call out of you?';
  } else if (themeIds.has('calling')) {
    mainMovement = `${book} ${chapter} moves from recognition into response, showing that seeing Christ rightly leads toward following Him and bringing others with you.`;
    whyHere = 'The author appears to place calling language here so insight turns into discipleship rather than staying abstract.';
    redemptivePlace = `This chapter joins God’s larger pattern of calling people, reshaping them, and then sending them as participants in His purposes.`;
    lifeImplication = 'The question is not only whether you understand this passage, but whether you will follow what it is showing you and help others do the same.';
    formationPrompt = 'What would it look like for this passage to move you from insight into an actual next step of following?';
  } else if (themeIds.has('new-birth') || themeIds.has('salvation')) {
    mainMovement = `${book} ${chapter} centers on God’s saving work and the need for life that comes from above, not from human effort alone.`;
    whyHere = 'The chapter seems to insist that true spiritual life is received from God rather than manufactured by knowledge, effort, or religious habit.';
    redemptivePlace = `This chapter lands in the heart of God’s saving plan, where rescue and new life are shown to come from His action before they become our experience.`;
    lifeImplication = 'You are being invited to receive from God, not merely admire the idea of salvation from a distance or attempt to outwork it by self-effort.';
    formationPrompt = 'Where is this passage inviting you to receive from God rather than trying to generate life on your own strength?';
  } else if (themeIds.has('prayer') || themeIds.has('peace')) {
    mainMovement = `${book} ${chapter} moves toward dependence, showing that God meets anxious, needy, or worshipful people in relationship rather than distance.`;
    whyHere = 'The placement of prayer and peace language suggests the chapter is training the reader’s posture, not merely expanding information.';
    redemptivePlace = `This chapter sits inside Scripture’s larger pattern of God drawing His people into dependence, peace, and nearness rather than self-sufficiency.`;
    lifeImplication = 'The passage is pressing for relational response. What troubles you or steadies you should be taken to God, not merely noted in your head.';
    formationPrompt = 'What pressure, fear, or gratitude in you could be turned into prayer directly from this passage?';
  }

  const canonicalEcho = topEcho
    ? `One strong canonical echo here is ${topEcho}${topEchoes[1] ? `, with ${topEchoes[1]} reinforcing the same thread` : ''}. That helps place this chapter inside the larger biblical story instead of treating it as a standalone scene.`
    : 'Chronicle has not surfaced a dominant canonical echo here yet, so this chapter should still be read with an eye toward its place in the broader biblical story.';
  const evidencePosture = evidenceKinds.size > 0
    ? `Chronicle is weighting local study evidence from ${Array.from(evidenceKinds).map((kind) => kind.replace(/_/g, ' ')).join(', ')}, plus ${evidenceSummary.totalCrossReferences} canonical links${evidenceSummary.totalGreekVerses > 0 ? ` and ${evidenceSummary.totalGreekVerses} verse-level word-study lanes` : ''}.`
    : 'Chronicle is currently leaning more heavily on the chapter text while the study evidence layer continues to deepen.';
  const confidenceNote =
    evidenceSummary.strength === 'rich'
      ? 'This is one of Chronicle’s better-grounded chapter reads right now.'
      : evidenceSummary.strength === 'grounded'
        ? 'This is a grounded reading, but some of the chapter may still deserve a deeper theological pass.'
        : 'This is still a lighter first-pass reading. Use it as a guide, not as a final theological judgment.';

  return {
    mainMovement,
    whyHere,
    redemptivePlace,
    canonicalEcho,
    lifeImplication,
    formationPrompt,
    evidencePosture,
    confidenceNote,
  };
}

function buildStudyQuestions(
  book: string,
  chapter: number,
  themes: BibleThemeDefinition[],
  crossReferences: ChapterCrossReference[],
  meaningReflection: ReturnType<typeof buildMeaningReflection>,
): ChapterStudyQuestions {
  const topTheme = themes[0]?.label || 'the main theological thread';
  const secondTheme = themes[1]?.label || 'the chapter’s supporting movement';
  const topEcho = crossReferences[0]?.targetLabel;

  return {
    observation: `What details in ${book} ${chapter} make ${topTheme} and ${secondTheme} visible in the text itself?`,
    interpretation: `Why does the author place this movement here, and how does that deepen what Chronicle summarized as: ${meaningReflection.mainMovement}`,
    canonical: topEcho
      ? `How does ${topEcho} help you read ${book} ${chapter} inside the larger biblical story rather than as an isolated scene?`
      : `What larger biblical thread or earlier passage helps this chapter make fuller sense?`,
    formation: meaningReflection.formationPrompt,
  };
}

function buildPassageSynthesis(
  book: string,
  chapter: number,
  chapterData: Chapter | undefined,
  themes: BibleThemeDefinition[],
  crossReferences: ChapterCrossReference[],
  meaningReflection: ReturnType<typeof buildMeaningReflection>,
): PassageSynthesisSummary {
  const verseCount = chapterData?.verses.length || 0;
  const firstThirdCutoff = Math.max(1, Math.ceil(verseCount / 3));
  const secondThirdCutoff = Math.max(firstThirdCutoff + 1, Math.ceil((verseCount * 2) / 3));
  const themeDistribution = {
    opening: themes.filter((theme) => theme.supportingVerses.some((verse) => verse <= firstThirdCutoff)).slice(0, 2).map((theme) => theme.label),
    middle: themes.filter((theme) => theme.supportingVerses.some((verse) => verse > firstThirdCutoff && verse <= secondThirdCutoff)).slice(0, 2).map((theme) => theme.label),
    closing: themes.filter((theme) => theme.supportingVerses.some((verse) => verse > secondThirdCutoff)).slice(0, 2).map((theme) => theme.label),
  };
  const topKinds = Array.from(new Set(crossReferences.slice(0, 6).map((reference) => reference.kind)));

  if (book === 'John' && chapter === 1) {
    return {
      title: 'Christ Revealed Before He Is Narrated',
      theologicalCenter: 'John 1 presents Jesus as the eternal Word, the true Light, the Lamb of God, and the meeting place between heaven and earth before the Gospel ever asks the reader to weigh His signs.',
      chapterShape: [
        'The opening places Christ before creation and makes His divine identity the controlling frame.',
        'The middle turns cosmic identity into witness, reception, rejection, and grace received.',
        'The closing moves from testimony to discipleship, showing that true recognition leads people to follow and confess Him.',
      ],
      authorStrategy: 'John begins with theology before narrative so that every later sign, conversation, and conflict will be interpreted through the identity of the Son.',
      redemptiveFrame: 'This chapter bridges creation, incarnation, witness, and new creation. It says the Creator has entered the world He made in order to reveal the Father and gather a people to Himself.',
      livedResponse: 'The chapter presses the reader to move from familiarity with Jesus-language into actual confession, reception, and following.',
      tensions: [
        'Light comes into the world, yet darkness does not comprehend it.',
        'Some do not receive Him, while others are given the right to become children of God.',
      ],
    };
  }

  if (book === 'John' && chapter === 3) {
    return {
      title: 'New Birth, Belief, and the Crisis of Light',
      theologicalCenter: 'John 3 binds salvation, new birth, and belief together by showing that life with God must come from above and culminates in a response to the Son.',
      chapterShape: [
        'The opening conversation with Nicodemus exposes the insufficiency of religious competence without new birth.',
        'The middle lifts up the Son as the saving provision God gives to the world in love.',
        'The closing turns to witness and John the Baptist’s humility, reinforcing that Christ must increase as all others decrease.',
      ],
      authorStrategy: 'John uses dialogue, testimony, and contrast to move the reader from confusion to clarity: spiritual life is not achieved from below but given from above through the Son.',
      redemptiveFrame: 'The chapter stands at the center of redemptive proclamation: the lifted-up Son is the saving answer to human need, and the dividing line becomes belief or unbelief in Him.',
      livedResponse: 'The chapter calls the reader beyond admiration into surrender, asking whether we are coming to the light or shrinking back from it.',
      tensions: [
        'Religious knowledge is present, but spiritual perception is lacking.',
        'God loves the world, yet the human response to light reveals judgment.',
      ],
    };
  }

  if (book === 'Genesis' && chapter === 1) {
    return {
      title: 'God Orders the World by His Word',
      theologicalCenter: 'Genesis 1 presents God as the sovereign Creator whose speech brings order, life, blessing, and purpose out of formlessness and darkness.',
      chapterShape: [
        'The opening establishes God as Creator before any created thing is named.',
        'The middle unfolds ordered acts of separation, filling, and blessing across the created realms.',
        'The close culminates in humanity bearing God’s image and creation resting under His good verdict.',
      ],
      authorStrategy: 'The chapter repeats speech, fulfillment, naming, and evaluation so the reader sees creation as intentional, ordered, and blessed under God’s rule.',
      redemptiveFrame: 'This is the baseline for the whole Bible: God’s world is created good, ordered by His word, and intended to reflect His glory before sin distorts that order.',
      livedResponse: 'The chapter teaches us to see life as received, meaningful, and accountable to the God who made and blessed it.',
      tensions: [
        'The world begins in formless darkness, yet God’s speech establishes light and order.',
        'Human dignity is elevated as image-bearing, yet always remains creaturely and dependent.',
      ],
    };
  }

  return {
    title: `${book} ${chapter} · Passage Synthesis`,
    theologicalCenter: meaningReflection.mainMovement,
    chapterShape: [
      `Opening movement: ${themeDistribution.opening.join(', ') || 'Chronicle sees the chapter opening by establishing its main burden.'}`,
      `Middle movement: ${themeDistribution.middle.join(', ') || 'The middle develops that burden through witness, conflict, or clarification.'}`,
      `Closing movement: ${themeDistribution.closing.join(', ') || 'The chapter closes by pressing the main burden toward response or resolution.'}`,
    ],
    authorStrategy: meaningReflection.whyHere,
    redemptiveFrame: meaningReflection.redemptivePlace,
    livedResponse: meaningReflection.lifeImplication,
    tensions: topKinds.length > 0
      ? [`Chronicle is seeing ${topKinds.join(', ')} canonical links as interpretive lanes, which means this chapter should be read inside the wider scriptural story rather than as a standalone scene.`]
      : [meaningReflection.canonicalEcho],
  };
}

function buildCanonicalThreadSummary(
  book: string,
  chapter: number,
  crossReferences: ChapterCrossReference[],
  meaningReflection: ReturnType<typeof buildMeaningReflection>,
): CanonicalThreadSummary {
  const topReferences = crossReferences.slice(0, 4);
  const targetLabels = topReferences.map((reference) => reference.targetLabel).filter(Boolean);
  const sourceVerses = Array.from(new Set(topReferences.map((reference) => reference.sourceVerse))).sort((left, right) => left - right);

  if (book === 'John' && chapter === 1) {
    return {
      title: 'Creation to New Creation',
      summary: 'Chronicle reads John 1 as a deliberate canonical bridge: the Word who stands at the beginning of creation is the same Son who enters history, is witnessed to, and opens a new creation people around Himself.',
      movements: [
        {
          label: 'Creation',
          summary: 'Genesis 1 frames the opening so Christ is placed on the Creator side of reality, not the created side.',
          references: ['Genesis 1:1', 'Revelation 19:13'],
        },
        {
          label: 'Witness and Reception',
          summary: 'John the Baptist and the first disciples move the chapter from cosmic identity into public witness, confession, and following.',
          references: ['John 1:6-8', 'John 1:29-34'],
        },
        {
          label: 'Heaven and Earth Reopened',
          summary: 'The closing vision of heaven opened points forward to Christ as the meeting place between heaven and earth.',
          references: ['Genesis 28:12', 'John 1:51'],
        },
      ],
      references: ['Genesis 1:1', 'Genesis 28:12', 'Revelation 19:13'],
    };
  }

  if (book === 'John' && chapter === 3) {
    return {
      title: 'From Wilderness Provision to New-Creation Life',
      summary: 'Chronicle reads John 3 as a thread from Israel’s need in the wilderness to God’s saving gift in the Son, then on into the moral crisis of coming to the light.',
      movements: [
        {
          label: 'New Birth From Above',
          summary: 'The chapter opens by insisting that entry into God’s kingdom is a gift of new life, not a product of pedigree or religious expertise.',
          references: ['Ezekiel 36:25-27', 'John 3:3-8'],
        },
        {
          label: 'The Lifted Son',
          summary: 'Jesus interprets His mission through the bronze-serpent pattern: God provides the saving remedy by lifting up the Son for believing sinners.',
          references: ['Numbers 21:8-9', 'John 3:14-16'],
        },
        {
          label: 'Light and Witness',
          summary: 'The thread closes with the crisis of light and John the Baptist’s humility, showing that revelation demands response and every witness must yield to Christ.',
          references: ['John 3:19-21', 'John 3:27-30'],
        },
      ],
      references: ['Ezekiel 36:25-27', 'Numbers 21:8-9', 'John 3:14-16'],
    };
  }

  if (targetLabels.length === 0) {
    return {
      title: 'Canonical Thread',
      summary: `${book} ${chapter} should still be read inside the larger biblical story, even where Chronicle's saved cross-reference graph is still relatively thin.`,
      movements: [
        {
          label: 'Redemptive Placement',
          summary: meaningReflection.redemptivePlace,
          references: [],
        },
        {
          label: 'Echo to Watch',
          summary: meaningReflection.canonicalEcho,
          references: [],
        },
      ],
      references: [],
    };
  }

  const groupedByKind = new Map<string, ChapterCrossReference[]>();
  for (const reference of topReferences) {
    const existing = groupedByKind.get(reference.kind) || [];
    existing.push(reference);
    groupedByKind.set(reference.kind, existing);
  }

  const movements = Array.from(groupedByKind.entries()).slice(0, 3).map(([kind, references]) => {
    const labels = Array.from(new Set(references.map((reference) => reference.targetLabel))).slice(0, 3);
    const versesForKind = Array.from(new Set(references.map((reference) => reference.sourceVerse))).sort((left, right) => left - right);
    return {
      label:
        kind === 'echo' ? 'Old Testament Echo' :
        kind === 'prophecy' ? 'Prophetic Fulfillment' :
        kind === 'word' ? 'Word or Theme Link' :
        kind === 'glory' ? 'Glory Thread' :
        kind === 'parallel' ? 'Parallel Witness' :
        'Canonical Link',
      summary: `${labels.join(', ')} becomes a live interpretive thread around verse${versesForKind.length === 1 ? '' : 's'} ${versesForKind.join(', ')}.`,
      references: labels,
    };
  });

  return {
    title: sourceVerses.length > 1 ? `Thread Through Verses ${sourceVerses.join(', ')}` : 'Canonical Thread',
    summary: `${book} ${chapter} is being read alongside ${targetLabels.join(', ')}, which helps Chronicle treat the chapter as part of Scripture's larger movement instead of a standalone unit.`,
    movements,
    references: targetLabels,
  };
}

function normalizeVerseTextForComparison(text: string | null) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildTranslationDiscernmentSummary(
  focusedVerseInsight: VerseStudyInsight | null,
  comparisons: VerseTranslationComparison[],
): TranslationDiscernmentSummary {
  const available = comparisons.filter((comparison) => comparison.verseText);
  if (available.length <= 1) {
    return {
      summary: 'Chronicle does not yet have enough local translation data here to say much about meaningful English variation.',
      observations: [],
      variationType: 'Insufficient comparison data',
      sharedCore: 'Chronicle needs at least two local renderings before it can weigh English variation responsibly.',
      readingStrategy: 'Use the verse guide and study evidence first until more local comparison data is available.',
    };
  }

  const normalized = new Set(available.map((comparison) => normalizeVerseTextForComparison(comparison.verseText)));
  const hasMeaningfulVariation = normalized.size > 1;
  const highlightedLabels = available.slice(0, 3).map((comparison) => comparison.translation);
  const lengths = available.map((comparison) => comparison.verseText?.length || 0);
  const maxLength = Math.max(...lengths);
  const minLength = Math.min(...lengths);
  const lengthSpread = maxLength - minLength;
  const ampExpansion = available.find((comparison) => comparison.translation.toUpperCase().includes('AMP') && (comparison.verseText?.length || 0) > minLength + 25);
  const christologicalTitleVariance = available.some((comparison) => /only begotten|one and only|only son/i.test(comparison.verseText || ''));
  const lightDarknessVariance = available.some((comparison) => /comprehend|overcome|overpowered/i.test(comparison.verseText || ''));
  const variationType = !hasMeaningfulVariation
    ? 'Aligned renderings'
    : ampExpansion
      ? 'Amplified explanatory wording'
      : christologicalTitleVariance
        ? 'Christological title nuance'
        : lightDarknessVariance
          ? 'Interpretive action nuance'
          : lengthSpread > 18
            ? 'Expanded emphasis'
            : 'Lexical nuance';

  if (!hasMeaningfulVariation) {
    return {
      summary: `Your local translations are largely saying the same thing here, which suggests the main interpretive work belongs in the verse itself and its study evidence rather than in English wording differences.`,
      observations: [
        `Chronicle compared ${highlightedLabels.join(', ')} and found the wording substantially aligned.`,
      ],
      variationType,
      sharedCore: 'The translations are substantially aligned on the same core meaning.',
      readingStrategy: 'Let the shared wording strengthen confidence in the main idea, then use commentary and cross references for deeper theological work.',
    };
  }

  const baseObservation = focusedVerseInsight
    ? `Chronicle is using the verse guide's focus on ${focusedVerseInsight.themes.join(', ') || 'the passage flow'} to weigh how those wording differences matter.`
    : 'Chronicle is treating these as real translation nuances, not just surface wording changes.';
  const sharedCore = focusedVerseInsight
    ? focusedVerseInsight.theologicalMeaning
    : 'Across the variations, the translations still preserve one governing idea that should stay primary when you interpret the verse.';
  const readingStrategy = ampExpansion
    ? 'Read the shorter renderings to hear the backbone of the verse, then let the amplified wording suggest possible shades of meaning without letting it outrank the shared core.'
    : christologicalTitleVariance
      ? 'Treat title differences as theological texture. The question is not which title cancels the others, but how each rendering helps name Christ more fully.'
      : lightDarknessVariance
        ? 'Use the wording difference to ask what kind of action the verse is describing, then let the canonical thread and verse guide determine which nuance deserves more weight.'
        : 'Read the translations together by looking for the shared center first, then ask whether the wording difference is clarifying emphasis, tone, or interpretive expansion.';

  return {
    summary: `Your local translations are not identical here. Chronicle sees this as a cue to read the verse a little more slowly and let the shared core meaning stay primary while the wording differences add texture.`,
    observations: [
      `Compared translations: ${highlightedLabels.join(', ')}.`,
      `Variation type: ${variationType}.`,
      baseObservation,
      'Where the wording diverges, use the cross references and verse guide to decide whether the difference is emphasis, clarity, or interpretive expansion.',
    ],
    variationType,
    sharedCore,
    readingStrategy,
  };
}

export default function Bible() {
  const {
    translation,
    bibleView,
    setBibleView,
    addChronicleEntry,
    setActiveTab,
    chronicleEntries,
    scriptureBookmarks,
    addScriptureBookmark,
    removeScriptureBookmark,
  } = useAppStore();
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const setPageContext = useAIChatStore((state) => state.setPageContext);
  const setSelectedAgentMode = useAIChatStore((state) => state.setSelectedAgentMode);
  const { isCompact, isPhone } = useResponsiveLayout();
  const [book, setBook] = useState(bibleView.book || 'Psalms');
  const [chapter, setChapter] = useState(bibleView.chapter || 23);
  const [provider, setProvider] = useState<BibleProviderId>(
    (bibleView.provider as BibleProviderId) || getConfiguredBibleProvider()
  );
  const [chapterResult, setChapterResult] = useState<{
    referenceKey?: string;
    chapter?: Chapter;
    sourceLabel: string;
    attribution: string;
    warning?: string;
  }>({ sourceLabel: 'Chronicle reading cache', attribution: '' });
  const [loadingChapter, setLoadingChapter] = useState(false);
  const [overlayOn, setOverlayOn] = useState(Boolean(bibleView.overlayOn));
  const [activeThemes, setActiveThemes] = useState<Set<string>>(new Set(bibleView.activeThemeIds || []));
  const [showThemePanel, setShowThemePanel] = useState(Boolean(bibleView.showThemePanel));
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<{ num: number; text: string } | null>(null);
  const [bookOptions, setBookOptions] = useState<string[]>(BOOKS);
  const [availableChapters, setAvailableChapters] = useState<number[]>(getChaptersForBook(book));
  const [providerOptions, setProviderOptions] = useState<Array<{ providerId: string; label: string }>>([]);
  const [themes, setThemes] = useState<BibleThemeDefinition[]>([]);
  const [loadingThemes, setLoadingThemes] = useState(false);
  const [themeDraftDirty, setThemeDraftDirty] = useState(false);
  const [panelMode, setPanelMode] = useState<'themes' | 'echoes' | 'study-colors' | 'greek'>(bibleView.panelMode || 'themes');
  const [echoesOn, setEchoesOn] = useState(Boolean(bibleView.echoesOn));
  const [loadingEchoes, setLoadingEchoes] = useState(false);
  const [crossReferences, setCrossReferences] = useState<ChapterCrossReference[]>([]);
  const [studyColorsOn, setStudyColorsOn] = useState(Boolean(bibleView.studyColorsOn));
  const [greekOn, setGreekOn] = useState(Boolean(bibleView.greekOn));
  const [loadingGreek, setLoadingGreek] = useState(false);
  const [focusedPanelVerse, setFocusedPanelVerse] = useState<number | null>(null);
  const [wordStudyByVerse, setWordStudyByVerse] = useState<Map<number, WordStudyToken[]>>(new Map());
  const [translationComparisons, setTranslationComparisons] = useState<VerseTranslationComparison[]>([]);
  const [loadingTranslationComparisons, setLoadingTranslationComparisons] = useState(false);
  const [focusedVerseInsight, setFocusedVerseInsight] = useState<VerseStudyInsight | null>(null);
  const [loadingVerseInsight, setLoadingVerseInsight] = useState(false);

  const currentReferenceKey = `${provider}:${book}:${chapter}`;
  const chapterData = chapterResult.referenceKey === currentReferenceKey ? chapterResult.chapter : undefined;
  const supportsGreek = useMemo(() => supportsGreekWordStudy(book), [book]);
  const studyColorByVerse = useMemo(() => getChapterStudyColors(chapterData), [chapterData]);
  const themeIds = useMemo(() => themes.map((theme) => theme.id), [themes]);
  const coverage = useMemo(() => {
    const coveredVerses = new Set<number>();
    themes.forEach((theme) => {
      Object.keys(theme.versePhrases || {}).forEach((verse) => coveredVerses.add(Number(verse)));
    });
    const coveredList = Array.from(coveredVerses).sort((a, b) => a - b);
    const totalVerses = chapterData?.verses.length || 0;
    const missingVerses: number[] = [];
    for (let verse = 1; verse <= totalVerses; verse += 1) {
      if (!coveredVerses.has(verse)) {
        missingVerses.push(verse);
      }
    }
    return {
      coveredCount: coveredList.length,
      coveredList,
      maxCoveredVerse: coveredList.length ? coveredList[coveredList.length - 1] : 0,
      totalVerses,
      missingVerses,
    };
  }, [chapterData?.verses.length, themes]);
  const coverageReachesChapterEnd = coverage.totalVerses > 0 && coverage.missingVerses.length === 0;
  const missingCoverageSummary = useMemo(() => {
    if (coverage.missingVerses.length === 0) return '';
    const preview = coverage.missingVerses.slice(0, 4).join(', ');
    const remainingCount = coverage.missingVerses.length - Math.min(coverage.missingVerses.length, 4);
    return remainingCount > 0 ? `${preview}, +${remainingCount} more` : preview;
  }, [coverage.missingVerses]);
  const canSaveThemes = themeDraftDirty && themes.length > 0 && coverageReachesChapterEnd;

  const prevChapterIdx = availableChapters.indexOf(chapter) - 1;
  const nextChapterIdx = availableChapters.indexOf(chapter) + 1;
  const externalLinks = getExternalBibleLinks(book, chapter);
  const currentProviderLabel = providerOptions.find((option) => option.providerId === provider)?.label || chapterResult.sourceLabel;
  const crossReferencesByVerse = useMemo(() => {
    const grouped = new Map<number, ChapterCrossReference[]>();
    crossReferences.forEach((reference) => {
      const existing = grouped.get(reference.sourceVerse) || [];
      existing.push(reference);
      grouped.set(reference.sourceVerse, existing);
    });
    return grouped;
  }, [crossReferences]);
  const topEchoCards = useMemo(() => {
    const seenByVerse = new Set<string>();
    return crossReferences
      .filter((reference) => {
        const key = `${reference.sourceVerse}:${reference.targetLabel}`;
        if (seenByVerse.has(key)) return false;
        seenByVerse.add(key);
        return true;
      })
      .slice(0, 18);
  }, [crossReferences]);
  const greekVerseNumbers = useMemo(() => Array.from(wordStudyByVerse.keys()).sort((a, b) => a - b), [wordStudyByVerse]);
  const activeGreekVerse = focusedPanelVerse && wordStudyByVerse.has(focusedPanelVerse)
    ? focusedPanelVerse
    : greekVerseNumbers[0] || null;
  const evidenceSummary = useMemo<ThemeEvidenceSummary>(() => {
    const evidenceKinds = Array.from(new Set(
      themes.flatMap((theme) => (theme.evidenceTrail || []).map((item) => item.kind)),
    ));
    const totalThemeEvidenceItems = themes.reduce((sum, theme) => sum + (theme.evidenceTrail?.length || 0), 0);
    const totalStudyColorVerses = studyColorByVerse.size;
    const totalGreekVerses = greekVerseNumbers.length;
    const totalCrossReferences = crossReferences.length;
    const strengthScore =
      totalThemeEvidenceItems
      + totalCrossReferences
      + (totalGreekVerses > 0 ? 4 : 0)
      + (totalStudyColorVerses > 0 ? 2 : 0);

    return {
      totalThemeEvidenceItems,
      evidenceKinds,
      totalCrossReferences,
      totalStudyColorVerses,
      totalGreekVerses,
      strength: strengthScore >= 24 ? 'rich' : strengthScore >= 10 ? 'grounded' : 'thin',
    };
  }, [crossReferences.length, greekVerseNumbers.length, studyColorByVerse.size, themes]);
  const meaningReflection = useMemo(
    () => buildMeaningReflection(book, chapter, chapterData, themes, crossReferences, evidenceSummary),
    [book, chapter, chapterData, themes, crossReferences, evidenceSummary],
  );
  const chapterReferenceLabel = `${book === 'Psalms' ? 'Psalm' : book} ${chapter}`;
  const comparisonProviders = useMemo(() => {
    const preferred = providerOptions.filter((option) =>
      ['offline_nkjv', 'offline_csb', 'offline_amp', 'offline_niv'].includes(option.providerId),
    );
    const withCurrent = providerOptions.find((option) => option.providerId === provider);
    const ordered = withCurrent ? [withCurrent, ...preferred.filter((option) => option.providerId !== withCurrent.providerId)] : preferred;
    return ordered.slice(0, 4);
  }, [provider, providerOptions]);
  const fallbackLocalProviderId = comparisonProviders[0]?.providerId || providerOptions[0]?.providerId;
  const studyQuestions = useMemo(
    () => buildStudyQuestions(book, chapter, themes, crossReferences, meaningReflection),
    [book, chapter, themes, crossReferences, meaningReflection],
  );
  const passageSynthesis = useMemo(
    () => buildPassageSynthesis(book, chapter, chapterData, themes, crossReferences, meaningReflection),
    [book, chapter, chapterData, themes, crossReferences, meaningReflection],
  );
  const canonicalThread = useMemo(
    () => buildCanonicalThreadSummary(book, chapter, crossReferences, meaningReflection),
    [book, chapter, crossReferences, meaningReflection],
  );
  const chapterChronicleEntries = useMemo(
    () => chronicleEntries.filter((entry) => passageMatchesLocation(entry.passage, book, chapter)).slice(0, 6),
    [book, chapter, chronicleEntries],
  );
  const focusedVerseChronicleEntries = useMemo(
    () => typeof focusedPanelVerse === 'number'
      ? chronicleEntries.filter((entry) => passageMatchesLocation(entry.passage, book, chapter, focusedPanelVerse)).slice(0, 4)
      : [],
    [book, chapter, chronicleEntries, focusedPanelVerse],
  );
  const chapterBookmarks = useMemo(
    () => scriptureBookmarks.filter((bookmark) => bookmark.book === book && bookmark.chapter === chapter && typeof bookmark.verseStart !== 'number'),
    [book, chapter, scriptureBookmarks],
  );
  const focusedVerseBookmarks = useMemo(
    () => typeof focusedPanelVerse === 'number'
      ? scriptureBookmarks.filter((bookmark) =>
        bookmark.book === book
        && bookmark.chapter === chapter
        && typeof bookmark.verseStart === 'number'
        && passageMatchesLocation(bookmark.passage, book, chapter, focusedPanelVerse))
      : [],
    [book, chapter, focusedPanelVerse, scriptureBookmarks],
  );
  const translationDiscernment = useMemo(
    () => buildTranslationDiscernmentSummary(focusedVerseInsight, translationComparisons),
    [focusedVerseInsight, translationComparisons],
  );

  useEffect(() => {
    let cancelled = false;

    getAvailableLocalBibleProviders()
      .then((providers) => {
        if (cancelled) return;
        setProviderOptions(providers.map(({ providerId, label }) => ({ providerId, label })));
        const preferredProvider = providers.find((entry) => entry.label.toLowerCase().includes(translation.toLowerCase())) || providers[0];
        const currentIsAvailable = provider === 'offline' || providers.some((entry) => entry.providerId === provider);
        if (!currentIsAvailable) {
          setProvider(preferredProvider?.providerId || 'offline');
        } else if (provider === 'offline' && preferredProvider) {
          setProvider(preferredProvider.providerId);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setProviderOptions([]);
        if (provider !== 'offline') setProvider('offline');
      });

    return () => {
      cancelled = true;
    };
  }, [provider, translation]);

  useEffect(() => {
    let cancelled = false;

    async function syncNavigation() {
      const nextBooks = isLocalBibleProvider(provider)
        ? await getLocalBibleBooks(provider)
        : BOOKS;
      if (cancelled) return;
      const nextBook = nextBooks.includes(book) ? book : nextBooks[0];
      const nextChapters = isLocalBibleProvider(provider)
        ? await getLocalBibleChapters(provider, nextBook)
        : getChaptersForBook(nextBook);
      if (cancelled) return;
      setBookOptions(nextBooks);
      setAvailableChapters(nextChapters);
      if (nextBook !== book) {
        setBook(nextBook);
        setChapter(nextChapters[0] || 1);
      } else if (!nextChapters.includes(chapter)) {
        setChapter(nextChapters[0] || 1);
      }
    }

    syncNavigation().catch(() => {
      if (cancelled) return;
      setBookOptions(BOOKS);
      setAvailableChapters(getChaptersForBook(book));
    });

    return () => {
      cancelled = true;
    };
  }, [book, chapter, provider]);

  useEffect(() => {
    const incomingBook = bibleView.book || 'Psalms';
    const incomingChapter = bibleView.chapter || 23;
    const incomingProvider = (bibleView.provider as BibleProviderId) || getConfiguredBibleProvider();
    const incomingOverlayOn = Boolean(bibleView.overlayOn);
    const incomingEchoesOn = Boolean(bibleView.echoesOn);
    const incomingStudyColorsOn = Boolean(bibleView.studyColorsOn);
    const incomingGreekOn = Boolean(bibleView.greekOn);
    const incomingShowThemePanel = Boolean(bibleView.showThemePanel);
    const incomingPanelMode = bibleView.panelMode || 'themes';
    const incomingThemeIds = bibleView.activeThemeIds || [];
    const currentThemeIds = Array.from(activeThemes);
    const shouldSyncThemeIds = currentThemeIds.length !== incomingThemeIds.length
      || currentThemeIds.some((themeId, index) => themeId !== incomingThemeIds[index]);
    const shouldSync =
      book !== incomingBook
      || chapter !== incomingChapter
      || provider !== incomingProvider
      || overlayOn !== incomingOverlayOn
      || echoesOn !== incomingEchoesOn
      || studyColorsOn !== incomingStudyColorsOn
      || greekOn !== incomingGreekOn
      || showThemePanel !== incomingShowThemePanel
      || panelMode !== incomingPanelMode
      || shouldSyncThemeIds;

    if (!shouldSync) return;

    queueMicrotask(() => {
      if (book !== incomingBook) setBook(incomingBook);
      if (chapter !== incomingChapter) setChapter(incomingChapter);
      if (provider !== incomingProvider) setProvider(incomingProvider);
      if (overlayOn !== incomingOverlayOn) setOverlayOn(incomingOverlayOn);
      if (echoesOn !== incomingEchoesOn) setEchoesOn(incomingEchoesOn);
      if (studyColorsOn !== incomingStudyColorsOn) setStudyColorsOn(incomingStudyColorsOn);
      if (greekOn !== incomingGreekOn) setGreekOn(incomingGreekOn);
      if (showThemePanel !== incomingShowThemePanel) setShowThemePanel(incomingShowThemePanel);
      if (panelMode !== incomingPanelMode) setPanelMode(incomingPanelMode);
      if (shouldSyncThemeIds) {
        setActiveThemes(new Set(incomingThemeIds));
      }
    });
  }, [
    activeThemes,
    bibleView.activeThemeIds,
    bibleView.book,
    bibleView.chapter,
    bibleView.echoesOn,
    bibleView.greekOn,
    bibleView.overlayOn,
    bibleView.panelMode,
    bibleView.provider,
    bibleView.showThemePanel,
    bibleView.studyColorsOn,
    book,
    chapter,
    echoesOn,
    greekOn,
    overlayOn,
    panelMode,
    provider,
    showThemePanel,
    studyColorsOn,
  ]);

  useEffect(() => {
    const focusedVerseLabel = typeof focusedPanelVerse === 'number'
      ? formatPassageLabel({ book, chapter, verseStart: focusedPanelVerse })
      : `${book === 'Psalms' ? 'Psalm' : book} ${chapter}`;
    const focusedVerseText = typeof focusedPanelVerse === 'number'
      ? chapterData?.verses.find((verse) => verse.number === focusedPanelVerse)?.text
      : undefined;

    setSelectedAgentMode('bible_study_agent');
    setPageContext('/bible', {
      page: 'Bible',
      pathname: '/bible',
      title: document.title,
      passage: focusedVerseLabel,
      book,
      chapter,
      provider,
      selection: focusedVerseInsight?.theologicalMeaning || focusedVerseText,
      summary: `Bible browser loaded on ${book} ${chapter}${typeof focusedPanelVerse === 'number' ? ` with verse ${focusedPanelVerse} focused` : ''}. Translation provider: ${provider}. Theme overlay is ${overlayOn ? 'active' : 'inactive'}. ${themes.length} theme definitions are available. Chronicle has ${chapterChronicleEntries.length} saved entries and ${chapterBookmarks.length} bookmarks tied to this chapter.`,
    });
  }, [book, chapter, chapterBookmarks.length, chapterChronicleEntries.length, chapterData?.verses, focusedPanelVerse, focusedVerseInsight?.theologicalMeaning, overlayOn, provider, setPageContext, setSelectedAgentMode, themes.length]);

  useEffect(() => {
    let cancelled = false;

    async function loadChapter() {
      const nextReferenceKey = `${provider}:${book}:${chapter}`;
      setLoadingChapter(true);
      setFocusedPanelVerse(null);
      setThemes([]);
      setThemeDraftDirty(false);
      setChapterResult((current) => ({
        ...current,
        referenceKey: nextReferenceKey,
        chapter: undefined,
        warning: undefined,
      }));
      try {
        const result = await fetchBibleChapter(book, chapter, provider);
        if (cancelled) return;
        setChapterResult({
          referenceKey: nextReferenceKey,
          chapter: result.chapter,
          sourceLabel: result.sourceLabel,
          attribution: result.attribution,
          warning: result.warning,
        });
        setFocusedPanelVerse(result.chapter?.verses[0]?.number ?? null);
      } catch (error: unknown) {
        if (cancelled) return;
        const fallback = getChapter(book, chapter);
        setChapterResult({
          referenceKey: nextReferenceKey,
          chapter: fallback,
          sourceLabel: 'Chronicle reading cache',
          attribution: fallback
            ? 'Chronicle reading cache fallback. The preferred local provider request failed.'
            : 'Chapter unavailable in Chronicle reading cache.',
          warning: error instanceof Error ? error.message : 'Bible provider request failed.',
        });
        setFocusedPanelVerse(fallback?.verses[0]?.number ?? null);
      } finally {
        if (!cancelled) setLoadingChapter(false);
      }
    }

    void loadChapter();

    return () => {
      cancelled = true;
    };
  }, [book, chapter, provider]);

  useEffect(() => {
    let cancelled = false;

    async function loadThemes() {
      if (!chapterData) {
        setThemes([]);
        setThemeDraftDirty(false);
        return;
      }

      setThemes([]);
      setThemeDraftDirty(false);
      setLoadingThemes(true);
      try {
        const nextThemes = await getChapterThemes(book, chapter, chapterData);
        if (!cancelled) {
          setThemes(nextThemes);
          setThemeDraftDirty(false);
        }
      } catch {
        if (!cancelled) {
          setThemes([]);
          setThemeDraftDirty(false);
        }
      } finally {
        if (!cancelled) setLoadingThemes(false);
      }
    }

    void loadThemes();

    return () => {
      cancelled = true;
    };
  }, [book, chapter, chapterData]);

  useEffect(() => {
    let cancelled = false;

    async function loadCrossReferences() {
      setLoadingEchoes(true);
      try {
        const next = await getChapterCrossReferences(book, chapter);
        if (!cancelled) {
          setCrossReferences(next);
        }
      } catch {
        if (!cancelled) setCrossReferences([]);
      } finally {
        if (!cancelled) setLoadingEchoes(false);
      }
    }

    void loadCrossReferences();

    return () => {
      cancelled = true;
    };
  }, [book, chapter]);

  useEffect(() => {
    let cancelled = false;

    async function loadGreek() {
      if (!supportsGreek) {
        setWordStudyByVerse(new Map());
        setLoadingGreek(false);
        return;
      }
      setLoadingGreek(true);
      try {
        const next = await getChapterWordStudy(book, chapter);
        if (!cancelled) setWordStudyByVerse(next);
      } catch {
        if (!cancelled) setWordStudyByVerse(new Map());
      } finally {
        if (!cancelled) setLoadingGreek(false);
      }
    }

    void loadGreek();

    return () => {
      cancelled = true;
    };
  }, [book, chapter, supportsGreek]);

  useEffect(() => {
    let cancelled = false;

    async function loadTranslationComparisons() {
      if (!chapterData || comparisonProviders.length === 0) {
        setTranslationComparisons([]);
        setLoadingTranslationComparisons(false);
        return;
      }

      setLoadingTranslationComparisons(true);
      try {
        const results = await Promise.all(comparisonProviders.map(async (option) => {
          if (option.providerId === provider) {
            return {
              providerId: option.providerId as BibleProviderId,
              label: option.label,
              translation: chapterData.translation || option.label,
              verseText: null,
            };
          }
          const result = await fetchBibleChapter(book, chapter, option.providerId as BibleProviderId);
          return {
            providerId: option.providerId as BibleProviderId,
            label: option.label,
            translation: result.chapter?.translation || option.label,
            verseText: null,
            chapter: result.chapter,
          };
        }));

        if (cancelled) return;

        setTranslationComparisons(results.map((result) => ({
          providerId: result.providerId,
          label: result.label,
          translation: result.translation,
          verseText: focusedPanelVerse
            ? (result.providerId === provider
              ? chapterData.verses.find((verse) => verse.number === focusedPanelVerse)?.text || null
              : result.chapter?.verses.find((verse) => verse.number === focusedPanelVerse)?.text || null)
            : null,
        })));
      } catch {
        if (!cancelled) setTranslationComparisons([]);
      } finally {
        if (!cancelled) setLoadingTranslationComparisons(false);
      }
    }

    void loadTranslationComparisons();
    return () => {
      cancelled = true;
    };
  }, [book, chapter, chapterData, comparisonProviders, focusedPanelVerse, provider]);

  useEffect(() => {
    let cancelled = false;

    async function loadFocusedVerseInsight() {
      if (!chapterData || typeof focusedPanelVerse !== 'number' || themes.length === 0) {
        setFocusedVerseInsight(null);
        setLoadingVerseInsight(false);
        return;
      }

      setLoadingVerseInsight(true);
      try {
        const nextInsight = await getVerseStudyInsight(book, chapter, focusedPanelVerse, chapterData, themes);
        if (!cancelled) {
          setFocusedVerseInsight(nextInsight);
        }
      } catch {
        if (!cancelled) {
          setFocusedVerseInsight(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingVerseInsight(false);
        }
      }
    }

    void loadFocusedVerseInsight();
    return () => {
      cancelled = true;
    };
  }, [book, chapter, chapterData, focusedPanelVerse, themes]);

  useEffect(() => {
    queueMicrotask(() => {
      setActiveThemes((current) => {
        if (current.size === 0) return current;
        const validIds = new Set(themeIds);
        const filtered = new Set(Array.from(current).filter((id) => validIds.has(id)));
        return filtered.size === current.size ? current : filtered;
      });
    });
  }, [themeIds]);

  useEffect(() => {
    setBibleView({
      book,
      chapter,
      provider,
      overlayOn,
      echoesOn,
      studyColorsOn,
      greekOn,
      showThemePanel,
      panelMode,
      activeThemeIds: Array.from(activeThemes),
    });
  }, [activeThemes, book, chapter, overlayOn, echoesOn, studyColorsOn, greekOn, provider, setBibleView, showThemePanel, panelMode]);

  const toggleTheme = (id: string) => {
    const next = new Set(activeThemes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setActiveThemes(next);
  };

  const activatePanelMode = (mode: 'themes' | 'echoes' | 'study-colors' | 'greek') => {
    setShowThemePanel(true);
    setPanelMode(mode);
    if (mode === 'themes') {
      setOverlayOn(true);
      setEchoesOn(false);
      setStudyColorsOn(false);
      setGreekOn(false);
      if (activeThemes.size === 0 && themes.length > 0) {
        setActiveThemes(new Set(themes.map((theme) => theme.id)));
      }
      return;
    }
    if (mode === 'echoes') {
      setOverlayOn(false);
      setEchoesOn(true);
      setStudyColorsOn(false);
      setGreekOn(false);
      return;
    }
    if (mode === 'study-colors') {
      setOverlayOn(false);
      setEchoesOn(false);
      setStudyColorsOn(true);
      setGreekOn(false);
      return;
    }
    setOverlayOn(false);
    setEchoesOn(false);
    setStudyColorsOn(false);
    setGreekOn(true);
  };

  const handleOverlayToggle = () => {
    const next = !overlayOn;
    if (next) activatePanelMode('themes');
    else {
      setOverlayOn(false);
      setShowThemePanel(false);
    }
  };

  const handleEchoesToggle = () => {
    const next = !echoesOn;
    if (next) activatePanelMode('echoes');
    else {
      setEchoesOn(false);
      setShowThemePanel(false);
    }
  };

  const handleStudyColorsToggle = () => {
    const next = !studyColorsOn;
    if (next) activatePanelMode('study-colors');
    else {
      setStudyColorsOn(false);
      setShowThemePanel(false);
    }
  };

  const handleGreekToggle = () => {
    if (!supportsGreek) return;
    const next = !greekOn;
    if (next) activatePanelMode('greek');
    else {
      setGreekOn(false);
      setShowThemePanel(false);
    }
  };

  const handleRefreshThemes = async () => {
    if (!chapterData || loadingThemes) return;
    setLoadingThemes(true);
    try {
      const refreshedThemes = await getChapterThemes(book, chapter, chapterData, {
        forceRefresh: true,
        persist: false,
      });
      setThemes(refreshedThemes);
      setThemeDraftDirty(true);
      activatePanelMode('themes');
      setActiveThemes(new Set(refreshedThemes.map((theme) => theme.id)));
      const refreshedCovered = new Set<number>();
      refreshedThemes.forEach((theme) => {
        Object.keys(theme.versePhrases || {}).forEach((verse) => refreshedCovered.add(Number(verse)));
      });
      const coveredCount = refreshedCovered.size;
      const totalVerses = chapterData.verses.length;
      const maxCoveredVerse = coveredCount ? Math.max(...refreshedCovered) : 0;
      addToast(`Refreshed themes for ${book} ${chapter}: ${coveredCount}/${totalVerses} verses currently themed.`, 'success', '✦');
      if (maxCoveredVerse > 0 && maxCoveredVerse < totalVerses) {
        addToast(`Theme coverage currently stops at verse ${maxCoveredVerse}. Keep iterating before saving this chapter.`, 'warning', 'AI');
      }
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to refresh themes.', 'warning', 'AI');
    } finally {
      setLoadingThemes(false);
    }
  };

  const handleSaveThemes = async () => {
    if (!chapterData || themes.length === 0 || !themeDraftDirty) return;
    if (!coverageReachesChapterEnd) {
      addToast(`Chronicle will not save this map yet. Theme coverage is still missing verses: ${missingCoverageSummary || 'unknown gaps'}.`, 'warning', 'AI');
      return;
    }
    try {
      await persistChapterThemes(book, chapter, chapterData, themes);
      setThemeDraftDirty(false);
      addToast(`Saved themes for ${book} ${chapter}. Chronicle will reuse them from cache.`, 'success', '💾');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to save themes.', 'warning', 'AI');
    }
  };

  const handleSaveStudyQuestions = () => {
    addChronicleEntry({
      id: `bible-study-questions-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'study',
      title: `${chapterReferenceLabel} · Study Questions`,
      body: [
        `Observation: ${studyQuestions.observation}`,
        '',
        `Interpretation: ${studyQuestions.interpretation}`,
        '',
        `Canonical thread: ${studyQuestions.canonical}`,
        '',
        `Formation: ${studyQuestions.formation}`,
      ].join('\n'),
      passage: chapterReferenceLabel,
      themes: themes.slice(0, 4).map((theme) => theme.label),
      autoCapture: true,
      sourceContext: {
        page: 'bible',
        passage: chapterReferenceLabel,
        bibleView: {
          book,
          chapter,
          overlayOn: true,
          echoesOn: false,
          studyColorsOn: false,
          greekOn: false,
          showThemePanel: true,
          panelMode: 'themes',
        },
      },
    });
    addToast(`Saved study questions for ${chapterReferenceLabel}`, 'success', '📖');
  };

  const handlePrayThisChapter = () => {
    const prompt = [
      `Lord, meet me in ${chapterReferenceLabel}.`,
      meaningReflection.mainMovement,
      meaningReflection.lifeImplication,
      `Help me answer this honestly: ${meaningReflection.formationPrompt}`,
    ].join(' ');
    setActiveTab('prayer');
    navigate('/prayer', {
      state: {
        source: 'Bible',
        title: `Prayer from ${chapterReferenceLabel}`,
        passage: chapterReferenceLabel,
        prompt,
      },
    });
    addToast(`Opened Prayer from ${chapterReferenceLabel}`, 'success', '🙏');
  };

  const handleSaveMeaningReflection = () => {
    const body = [
      `Passage: ${chapterReferenceLabel}`,
      '',
      `What this chapter is doing: ${meaningReflection.mainMovement}`,
      `Why it says it here: ${meaningReflection.whyHere}`,
      `Where this fits in God's plan: ${meaningReflection.redemptivePlace}`,
      `Canonical echo: ${meaningReflection.canonicalEcho}`,
      `For your life today: ${meaningReflection.lifeImplication}`,
      `Formation question: ${meaningReflection.formationPrompt}`,
      `Study posture: ${meaningReflection.evidencePosture}`,
      `Confidence note: ${meaningReflection.confidenceNote}`,
      '',
      `Passage synthesis: ${passageSynthesis.title}`,
      `Theological center: ${passageSynthesis.theologicalCenter}`,
      `Authorial strategy: ${passageSynthesis.authorStrategy}`,
      `Redemptive frame: ${passageSynthesis.redemptiveFrame}`,
      `Lived response: ${passageSynthesis.livedResponse}`,
    ].join('\n');

    addChronicleEntry({
      id: `bible-reflection-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'reflection',
      title: `${chapterReferenceLabel} · Meaning & Formation`,
      body,
      passage: chapterReferenceLabel,
      themes: themes.slice(0, 4).map((theme) => theme.label),
      autoCapture: true,
      sourceContext: {
        page: 'bible',
        passage: chapterReferenceLabel,
        bibleView: {
          book,
          chapter,
          overlayOn: true,
          echoesOn: false,
          studyColorsOn: false,
          greekOn: false,
          showThemePanel: true,
          panelMode: 'themes',
        },
      },
    });
    addToast(`Saved reflection for ${chapterReferenceLabel}`, 'success', '📓');
  };

  const handleSaveCanonicalThread = () => {
    addChronicleEntry({
      id: `canonical-thread-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'study',
      title: `${chapterReferenceLabel} · Canonical Thread`,
      body: [
        canonicalThread.summary,
        '',
        ...canonicalThread.movements.flatMap((movement) => [
          `- ${movement.label}: ${movement.summary}`,
          ...(movement.references.length > 0 ? [`  References: ${movement.references.join(', ')}`] : []),
        ]),
        canonicalThread.references.length > 0 ? '' : null,
        canonicalThread.references.length > 0 ? `References: ${canonicalThread.references.join(', ')}` : null,
      ].filter(Boolean).join('\n'),
      passage: chapterReferenceLabel,
      themes: themes.slice(0, 3).map((theme) => theme.label),
      autoCapture: true,
      sourceContext: {
        page: 'bible',
        passage: chapterReferenceLabel,
        bibleView: {
          book,
          chapter,
          overlayOn: true,
          echoesOn: true,
          studyColorsOn: false,
          greekOn: false,
          showThemePanel: true,
          panelMode: 'themes',
        },
      },
    });
    addToast(`Saved canonical thread for ${chapterReferenceLabel}`, 'success', '📖');
  };

  const handleBookmarkPassage = (verseNumber?: number) => {
    const passageLabel = verseNumber
      ? formatPassageLabel({ book, chapter, verseStart: verseNumber })
      : chapterReferenceLabel;
    const existing = scriptureBookmarks.find((bookmark) => bookmark.passage === passageLabel);
    if (existing) {
      addToast(`${passageLabel} is already bookmarked.`, 'warning', '🔖');
      return;
    }
    const bookmark: ScriptureBookmark = {
      id: `scripture-bookmark-${Date.now()}-${verseNumber || 'chapter'}`,
      label: verseNumber ? `${passageLabel} · Focus verse` : `${chapterReferenceLabel} · Chapter bookmark`,
      passage: passageLabel,
      book,
      chapter,
      verseStart: verseNumber,
      verseEnd: verseNumber,
      createdAt: new Date().toISOString(),
    };
    addScriptureBookmark(bookmark);
    addToast(`Bookmarked ${passageLabel}`, 'success', '🔖');
  };

  const openChronicleForPassage = (passage?: string) => {
    setActiveTab('chronicle');
    navigate('/chronicle', {
      state: passage ? { filterPassage: passage } : undefined,
    });
  };

  const getVerseThemeHits = (verseNum: number) => {
    if (!overlayOn || activeThemes.size === 0 || themes.length === 0) return [];
    const rankedThemes = themes
      .filter((theme) => activeThemes.has(theme.id))
      .filter((theme) => (theme.versePhrases[verseNum] || []).length > 0)
      .sort((left, right) => (right.verseScores?.[verseNum] || 0) - (left.verseScores?.[verseNum] || 0))
      .slice(0, 3);

    return rankedThemes.flatMap((theme) => (theme.versePhrases[verseNum] || []).map((phrase) => ({ phrase, theme })));
  };

  const buildInlineHighlights = (text: string, hits: VerseThemeHit[]) => {
    const lowerText = text.toLowerCase();
    const ranges = hits.flatMap((hit) => {
      const matcher = new RegExp(escapeRegex(hit.phrase), 'ig');
      const localRanges: InlineHighlight[] = [];
      let match = matcher.exec(text);
      while (match) {
        localRanges.push({
          ...hit,
          start: match.index,
          end: match.index + match[0].length,
        });
        match = matcher.exec(text);
      }

      if (localRanges.length === 0) {
        const fallbackIndex = lowerText.indexOf(hit.phrase.toLowerCase());
        if (fallbackIndex >= 0) {
          localRanges.push({
            ...hit,
            start: fallbackIndex,
            end: fallbackIndex + hit.phrase.length,
          });
        }
      }
      return localRanges;
    });

    return ranges
      .sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start))
      .reduce<InlineHighlight[]>((accepted, candidate) => {
        const overlapsExisting = accepted.some((item) => candidate.start < item.end && candidate.end > item.start);
        if (!overlapsExisting) accepted.push(candidate);
        return accepted;
      }, []);
  };

  const renderVerseText = (text: string, highlights: InlineHighlight[]) => {
    if (highlights.length === 0) return text;

    const nodes: ReactNode[] = [];
    let cursor = 0;
    highlights.forEach((highlight, index) => {
      if (highlight.start > cursor) {
        nodes.push(<Fragment key={`text-${index}-${cursor}`}>{text.slice(cursor, highlight.start)}</Fragment>);
      }
      nodes.push(
        <span
          key={`highlight-${highlight.theme.id}-${highlight.start}-${highlight.end}`}
          style={{
            background: `${highlight.theme.color}22`,
            boxShadow: `inset 0 -0.45em 0 ${highlight.theme.color}26`,
            borderBottom: `1px solid ${highlight.theme.color}55`,
            borderRadius: 4,
            padding: '0 1px',
          }}
          title={`${highlight.theme.label} · ${highlight.theme.tier}`}
        >
          {text.slice(highlight.start, highlight.end)}
        </span>
      );
      cursor = highlight.end;
    });
    if (cursor < text.length) {
      nodes.push(<Fragment key={`text-tail-${cursor}`}>{text.slice(cursor)}</Fragment>);
    }
    return nodes;
  };

  const handleVerseClick = (num: number, text: string) => {
    setFocusedPanelVerse(num);
    setSelectedVerse({ num, text });
    setNoteModalOpen(true);
  };

  const jumpToVerse = (verse: number) => {
    setFocusedPanelVerse(verse);
    const node = document.getElementById(`verse-${verse}`);
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const navigateToReference = (referenceLabel: string) => {
    const match = referenceLabel.match(/^(?<book>.+?)\s+(?<chapter>\d+)(?::(?<verse>\d+))?/);
    if (!match?.groups) return;
    const nextBook = match.groups.book;
    const nextChapter = Number.parseInt(match.groups.chapter, 10);
    if (!Number.isNaN(nextChapter) && bookOptions.includes(nextBook)) {
      setBook(nextBook);
      setChapter(nextChapter);
      setShowThemePanel(true);
      setOverlayOn(true);
      window.setTimeout(() => {
        if (match.groups?.verse) {
          jumpToVerse(Number.parseInt(match.groups.verse, 10));
        }
      }, 250);
    }
  };

  const getVerseStudyColorHits = (verseNum: number) => {
    if (!studyColorsOn) return [];
    return studyColorByVerse.get(verseNum) || [];
  };

  const buildStudyColorHighlights = (text: string, hits: StudyColorHit[]) => {
    const lowerText = text.toLowerCase();
    const ranges: StudyColorInlineHighlight[] = hits.flatMap((hit) =>
      hit.phrases.flatMap((phrase) => {
        const matcher = new RegExp(escapeRegex(phrase), 'ig');
        const localRanges: StudyColorInlineHighlight[] = [];
        let match = matcher.exec(text);
        while (match) {
          localRanges.push({
            phrase,
            start: match.index,
            end: match.index + match[0].length,
            hit,
          });
          match = matcher.exec(text);
        }
        if (localRanges.length === 0) {
          const fallbackIndex = lowerText.indexOf(phrase.toLowerCase());
          if (fallbackIndex >= 0) {
            localRanges.push({
              phrase,
              start: fallbackIndex,
              end: fallbackIndex + phrase.length,
              hit,
            });
          }
        }
        return localRanges;
      })
    );

    return ranges
      .sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start))
      .reduce<StudyColorInlineHighlight[]>((accepted, candidate) => {
        const overlapsExisting = accepted.some((item) => candidate.start < item.end && candidate.end > item.start);
        if (!overlapsExisting) accepted.push(candidate);
        return accepted;
      }, []);
  };

  const renderStudyColorText = (text: string, highlights: StudyColorInlineHighlight[]) => {
    if (highlights.length === 0) return text;

    const nodes: ReactNode[] = [];
    let cursor = 0;
    highlights.forEach((highlight, index) => {
      if (highlight.start > cursor) {
        nodes.push(<Fragment key={`study-color-text-${index}-${cursor}`}>{text.slice(cursor, highlight.start)}</Fragment>);
      }
      nodes.push(
        <span
          key={`study-color-highlight-${highlight.hit.category.id}-${highlight.start}-${highlight.end}`}
          style={{
            background: `${highlight.hit.category.color}18`,
            boxShadow: `inset 0 -0.42em 0 ${highlight.hit.category.color}22`,
            borderBottom: `1px solid ${highlight.hit.category.color}44`,
            borderRadius: 4,
            padding: '0 1px',
          }}
          title={highlight.hit.category.label}
        >
          {text.slice(highlight.start, highlight.end)}
        </span>
      );
      cursor = highlight.end;
    });
    if (cursor < text.length) {
      nodes.push(<Fragment key={`study-color-tail-${cursor}`}>{text.slice(cursor)}</Fragment>);
    }
    return nodes;
  };

  if (!chapterData) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 32 }}>📖</div>
        <div>Chapter not available from the selected provider</div>
        <div style={{ fontSize: 12 }}>Provider: {chapterResult.sourceLabel}</div>
        {chapterResult.warning && <div style={{ fontSize: 12 }}>{chapterResult.warning}</div>}
        {availableChapters.length > 0 && <div style={{ fontSize: 12 }}>Available chapters: {availableChapters.join(', ')}</div>}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: isCompact ? 'column' : 'row', overflow: 'hidden', position: 'relative' }}>

      {/* Book picker overlay */}
      {showBookPicker && (
        <div
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 10 }}
          onClick={() => setShowBookPicker(false)}
        >
          <div
            style={{ position: 'absolute', top: 52, left: 0, background: 'var(--card-bg)', width: 240, maxHeight: 400, overflowY: 'auto', borderRadius: '0 0 12px 0', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {bookOptions.map((b) => (
              <div
                key={b}
                style={{
                  padding: '9px 16px',
                  fontSize: 13,
                  fontWeight: b === book ? 600 : 400,
                  color: b === book ? 'var(--accent-green)' : 'var(--text)',
                  background: b === book ? 'var(--accent-green-light)' : 'transparent',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                }}
                onClick={() => {
                  setBook(b);
                  if (isLocalBibleProvider(provider)) {
                    getLocalBibleChapters(provider, b).then((chapters) => setChapter(chapters[0] || 1));
                  } else {
                    const chapters = getChaptersForBook(b);
                    setChapter(chapters[0]);
                  }
                  setShowBookPicker(false);
                  setOverlayOn(false);
                  setActiveThemes(new Set());
                  setShowThemePanel(false);
                }}
              >
                {b}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reader column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Nav bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: isPhone ? '10px 14px' : '10px 20px', background: 'var(--card-bg)', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowBookPicker(true)}
            style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 7, padding: '4px 10px', cursor: 'pointer' }}
          >
            {book}
          </button>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>›</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-green)' }}>
            {book === 'Psalms' ? 'Psalm' : book} {chapter}
          </span>

          {/* Chapter nav */}
          <div style={{ display: 'flex', gap: 3 }}>
            <button
              onClick={() => prevChapterIdx >= 0 && setChapter(availableChapters[prevChapterIdx])}
              disabled={prevChapterIdx < 0}
              style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, color: prevChapterIdx < 0 ? 'var(--text-muted)' : 'var(--text-sub)', background: 'var(--card-inner)', cursor: prevChapterIdx < 0 ? 'not-allowed' : 'pointer', opacity: prevChapterIdx < 0 ? 0.5 : 1 }}
            >‹</button>
            <button
              onClick={() => nextChapterIdx < availableChapters.length && setChapter(availableChapters[nextChapterIdx])}
              disabled={nextChapterIdx >= availableChapters.length}
              style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, color: nextChapterIdx >= availableChapters.length ? 'var(--text-muted)' : 'var(--text-sub)', background: 'var(--card-inner)', cursor: nextChapterIdx >= availableChapters.length ? 'not-allowed' : 'pointer', opacity: nextChapterIdx >= availableChapters.length ? 0.5 : 1 }}
            >›</button>
          </div>

          {/* Available chapters */}
          <div style={{ display: 'flex', gap: 3, flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 2, maxWidth: '100%' }}>
            {availableChapters.map((c) => (
              <button
                key={c}
                onClick={() => setChapter(c)}
                style={{
                  width: 28, height: 28,
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: c === chapter ? 700 : 400,
                  background: c === chapter ? 'var(--accent-green)' : 'var(--card-inner)',
                  color: c === chapter ? 'white' : 'var(--text-sub)',
                  cursor: 'pointer',
                }}
              >
                {c}
              </button>
            ))}
          </div>

          <div style={{ marginLeft: isCompact ? 0 : 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as BibleProviderId)}
              style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, background: 'var(--card-inner)', color: 'var(--text)', cursor: 'pointer', outline: 'none' }}
              title="Chronicle local Bible source"
            >
              {providerOptions.map((option) => (
                <option key={option.providerId} value={option.providerId}>{option.label}</option>
              ))}
            </select>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{currentProviderLabel}</span>
            <button
              style={{
                padding: '5px 12px',
                border: '1px solid var(--border)',
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 500,
                background: overlayOn ? 'var(--accent-green)' : 'var(--card-inner)',
                color: overlayOn ? 'white' : 'var(--text-sub)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                opacity: chapterData ? 1 : 0.6,
              }}
              onClick={handleOverlayToggle}
              disabled={!chapterData}
            >
              {loadingThemes ? '…' : '✦'} Theme Overlay
            </button>
            <button
              style={{
                padding: '5px 12px',
                border: '1px solid var(--border)',
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 500,
                background: echoesOn ? 'var(--accent-blue, #2563eb)' : 'var(--card-inner)',
                color: echoesOn ? 'white' : 'var(--text-sub)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                opacity: chapterData ? 1 : 0.6,
              }}
              onClick={handleEchoesToggle}
              disabled={!chapterData}
            >
              {loadingEchoes ? '…' : '↔'} Echoes
            </button>
            <button
              style={{
                padding: '5px 12px',
                border: '1px solid var(--border)',
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 500,
                background: studyColorsOn ? '#7c3aed' : 'var(--card-inner)',
                color: studyColorsOn ? 'white' : 'var(--text-sub)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                opacity: chapterData ? 1 : 0.6,
              }}
              onClick={handleStudyColorsToggle}
              disabled={!chapterData}
            >
              {studyColorsOn ? '●' : '◌'} Study Colors
            </button>
            <button
              style={{
                padding: '5px 12px',
                border: '1px solid var(--border)',
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 500,
                background: greekOn ? '#4338ca' : 'var(--card-inner)',
                color: greekOn ? 'white' : 'var(--text-sub)',
                cursor: supportsGreek ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s',
                opacity: supportsGreek ? 1 : 0.45,
              }}
              onClick={handleGreekToggle}
              disabled={!supportsGreek}
              title={supportsGreek ? 'Open Greek / word study layer' : 'Greek word study is available for New Testament passages'}
            >
              {loadingGreek ? '…' : 'α'} Greek
            </button>
            <button
              style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, color: 'var(--text-sub)', background: 'var(--card-inner)', cursor: chapterData && !loadingThemes ? 'pointer' : 'not-allowed', opacity: chapterData ? 1 : 0.6 }}
              onClick={handleRefreshThemes}
              disabled={!chapterData || loadingThemes}
            >
              {loadingThemes ? 'Refreshing…' : 'Refresh Themes'}
            </button>
          </div>
        </div>

        {(loadingChapter || loadingThemes || chapterResult.warning) && (
          <div
            style={{
              padding: isPhone ? '10px 14px' : '10px 20px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--card-inner)',
              color: chapterResult.warning ? 'var(--accent-amber)' : 'var(--text-muted)',
              fontSize: 11,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 10,
              justifyContent: 'space-between',
            }}
          >
            <div style={{ lineHeight: 1.55, minWidth: 0, flex: 1 }}>
              {loadingChapter
                ? `Loading ${book} ${chapter} from ${provider}...`
                : loadingThemes
                  ? `Building theme overlay from Chronicle's local concordance, cross references, and commentary...`
                  : chapterResult.warning}
              {chapterResult.warning && (
                <div style={{ marginTop: 4, color: 'var(--text-sub)' }}>
                  If this chapter feels incomplete, switch to an installed local translation or open Scripture settings to rebuild Chronicle&apos;s reading and theme cache.
                </div>
              )}
            </div>
            {chapterResult.warning && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {fallbackLocalProviderId && fallbackLocalProviderId !== provider && (
                  <button
                    type="button"
                    onClick={() => setProvider(fallbackLocalProviderId as BibleProviderId)}
                    style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Use Local Bible
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate('/settings', { state: { requestedCategory: 'scripture' } })}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                >
                  Open Scripture Settings
                </button>
              </div>
            )}
          </div>
        )}

        {/* Scripture pane */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isPhone ? '18px 14px 24px' : isCompact ? '24px 24px 32px' : '28px 48px 40px' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            {book === 'Psalms' ? 'Psalm' : book} {chapter}
            {chapterData?.heading && (
              <span style={{ display: 'block', fontSize: 15, fontWeight: 400, color: 'var(--text-sub)', marginTop: 4 }}>{chapterData.heading}</span>
            )}
          </h2>
          {chapterData?.subheading && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24, fontStyle: 'italic' }}>{chapterData.subheading}</div>
          )}
          {!chapterData?.subheading && <div style={{ marginBottom: 24 }} />}

          {chapterData ? chapterData.verses.map((v) => {
            const verseThemeHits = getVerseThemeHits(v.number);
            const inlineHighlights = buildInlineHighlights(v.text, verseThemeHits);
            const verseThemes = Array.from(new Map(verseThemeHits.map((hit) => [hit.theme.id, hit.theme])).values());
            const studyColorHits = getVerseStudyColorHits(v.number);
            const studyColorHighlights = buildStudyColorHighlights(v.text, studyColorHits);
            const greekTokens = greekOn ? (wordStudyByVerse.get(v.number) || []) : [];
            return (
              <div
                key={v.number}
                id={`verse-${v.number}`}
                style={{
                  marginBottom: 12,
                  paddingLeft: verseThemes.length > 0 ? 12 : 6,
                  borderLeft: verseThemes.length > 0 ? `3px solid ${verseThemes[0].color}` : '3px solid transparent',
                  borderRadius: '0 6px 6px 0',
                  background: studyColorsOn && studyColorHits.length > 0 ? 'rgba(124,58,237,0.02)' : 'transparent',
                }}
              >
                <p
                  onClick={() => handleVerseClick(v.number, v.text)}
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 17,
                    lineHeight: 2.0,
                    color: 'var(--text)',
                    marginBottom: verseThemes.length > 0 ? 8 : 0,
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                  }}
                  title="Click to add a note"
                >
                  <sup style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginRight: 3, verticalAlign: 'super' }}>{v.number}</sup>
                  {overlayOn && inlineHighlights.length > 0
                    ? renderVerseText(v.text, inlineHighlights)
                    : studyColorsOn && studyColorHighlights.length > 0
                      ? renderStudyColorText(v.text, studyColorHighlights)
                      : v.text}
                </p>
                {overlayOn && verseThemes.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingBottom: 2 }}>
                    {verseThemes.map((theme) => (
                      <span
                        key={`${v.number}-${theme.id}`}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.02em',
                          padding: '2px 6px',
                          borderRadius: 999,
                          background: `${theme.color}15`,
                          border: `1px solid ${theme.color}35`,
                          color: theme.color,
                        }}
                      >
                        {theme.label}
                      </span>
                    ))}
                  </div>
                )}
                {studyColorsOn && studyColorHits.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: verseThemes.length > 0 ? 6 : 2 }}>
                    {studyColorHits.map((hit) => (
                      <span
                        key={`${v.number}-${hit.category.id}`}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.02em',
                          padding: '2px 6px',
                          borderRadius: 999,
                          background: `${hit.category.color}14`,
                          border: `1px solid ${hit.category.color}35`,
                          color: hit.category.color,
                        }}
                      >
                        {hit.category.label}
                      </span>
                    ))}
                  </div>
                )}
                {echoesOn && (crossReferencesByVerse.get(v.number)?.length || 0) > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: verseThemes.length > 0 ? 6 : 2 }}>
                    {(crossReferencesByVerse.get(v.number) || []).slice(0, 3).map((reference, index) => (
                      <button
                        key={`${v.number}-echo-${reference.targetKey}-${index}`}
                        onClick={() => {
                          activatePanelMode('echoes');
                          jumpToVerse(v.number);
                        }}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.02em',
                          padding: '2px 6px',
                          borderRadius: 999,
                          background: 'rgba(37,99,235,0.08)',
                          border: '1px solid rgba(37,99,235,0.22)',
                          color: '#1d4ed8',
                          cursor: 'pointer',
                        }}
                        title={`${reference.targetLabel} · ${reference.note}`}
                      >
                        {reference.targetLabel}
                      </button>
                    ))}
                  </div>
                )}
                {greekOn && greekTokens.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 6 }}>
                    {greekTokens.slice(0, 4).map((token) => (
                      <button
                        key={`${v.number}-${token.position}-${token.strongs}`}
                        onClick={() => {
                          setFocusedPanelVerse(v.number);
                          activatePanelMode('greek');
                        }}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.02em',
                          padding: '2px 6px',
                          borderRadius: 999,
                          background: 'rgba(67,56,202,0.08)',
                          border: '1px solid rgba(67,56,202,0.22)',
                          color: '#4338ca',
                          cursor: 'pointer',
                        }}
                        title={`${token.surface} · ${token.gloss || 'word'} · ${token.strongs}`}
                      >
                        {token.gloss || token.surface}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }) : (
            <div style={{ padding: '18px 0', fontSize: 13, color: 'var(--text-muted)' }}>
              Chronicle is loading this chapter...
            </div>
          )}

          <div style={{ marginTop: 40, paddingTop: 16, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
            {chapterResult.sourceLabel} · {chapterData ? `${chapterData.verses.length} verses shown` : 'loading'}
            <div style={{ marginTop: 6, lineHeight: 1.5 }}>{chapterResult.attribution}</div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {externalLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--accent-green)', fontWeight: 600 }}
                >
                  {link.label} ↗
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Theme panel */}
      {showThemePanel && (themes.length > 0 || crossReferences.length > 0 || studyColorByVerse.size > 0 || wordStudyByVerse.size > 0) && (
        <div style={{ width: isCompact ? '100%' : 260, borderLeft: isCompact ? 'none' : '1px solid var(--border)', borderTop: isCompact ? '1px solid var(--border)' : 'none', background: 'var(--card-bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--card-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                  onClick={() => activatePanelMode('themes')}
                style={{
                  border: 'none',
                  background: panelMode === 'themes' ? 'rgba(15,79,207,0.12)' : 'transparent',
                  color: panelMode === 'themes' ? '#0f4fcf' : 'var(--text-muted)',
                  borderRadius: 999,
                  padding: '4px 8px',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Themes
              </button>
              <button
                  onClick={() => activatePanelMode('echoes')}
                style={{
                  border: 'none',
                  background: panelMode === 'echoes' ? 'rgba(37,99,235,0.12)' : 'transparent',
                  color: panelMode === 'echoes' ? '#2563eb' : 'var(--text-muted)',
                  borderRadius: 999,
                  padding: '4px 8px',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Echoes
              </button>
              <button
                  onClick={() => activatePanelMode('study-colors')}
                style={{
                  border: 'none',
                  background: panelMode === 'study-colors' ? 'rgba(124,58,237,0.12)' : 'transparent',
                  color: panelMode === 'study-colors' ? '#7c3aed' : 'var(--text-muted)',
                  borderRadius: 999,
                  padding: '4px 8px',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Colors
              </button>
              <button
                  onClick={() => activatePanelMode('greek')}
                disabled={!supportsGreek}
                style={{
                  border: 'none',
                  background: panelMode === 'greek' ? 'rgba(67,56,202,0.12)' : 'transparent',
                  color: panelMode === 'greek' ? '#4338ca' : 'var(--text-muted)',
                  borderRadius: 999,
                  padding: '4px 8px',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: supportsGreek ? 'pointer' : 'not-allowed',
                  opacity: supportsGreek ? 1 : 0.45,
                }}
              >
                Greek
              </button>
            </div>
            <button onClick={() => setShowThemePanel(false)} style={{ fontSize: 14, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
            {panelMode === 'themes' && themes.map((t) => (
              <div
                key={t.id}
                onClick={() => toggleTheme(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', marginBottom: 7,
                  border: `1px solid ${activeThemes.has(t.id) ? t.color : 'var(--border)'}`,
                  borderRadius: 8,
                  background: activeThemes.has(t.id) ? `${t.color}10` : 'var(--card-inner)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: 2, background: t.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{t.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-sub)', marginTop: 3, lineHeight: 1.45 }}>{t.summary}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 5 }}>
                    Key verses: {t.supportingVerses.join(', ')}
                  </div>
                  {t.evidenceTrail && t.evidenceTrail.length > 0 && (
                    <div style={{ marginTop: 7, display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                        Why Chronicle Thinks This
                      </div>
                      {t.evidenceTrail.map((item, index) => (
                        <div
                          key={`${t.id}-evidence-${index}`}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 3,
                            padding: '6px 7px',
                            borderRadius: 6,
                            background: 'rgba(255,255,255,0.45)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: 999,
                                background: `${t.color}14`,
                                color: t.color,
                              }}
                            >
                              {item.kind === 'cross_reference'
                                ? 'Cross Ref'
                                : item.kind === 'commentary'
                                  ? 'Commentary'
                                  : item.kind === 'historical_commentary'
                                    ? 'Historical'
                                    : 'Word Study'}
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-sub)' }}>{item.label}</span>
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-sub)', lineHeight: 1.45 }}>{item.detail}</div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {typeof item.anchorVerse === 'number' && (
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  jumpToVerse(item.anchorVerse!);
                                }}
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  padding: 0,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: t.color,
                                  cursor: 'pointer',
                                }}
                              >
                                Verse {item.anchorVerse}
                              </button>
                            )}
                            {item.referenceLabel && (
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  navigateToReference(item.referenceLabel!);
                                }}
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  padding: 0,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: t.color,
                                  cursor: 'pointer',
                                }}
                              >
                                {item.referenceLabel}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: `${TIER_COLORS[t.tier]}20`, color: TIER_COLORS[t.tier] }}>{t.tier}</span>
              </div>
            ))}
            {panelMode === 'echoes' && (
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ padding: '10px 12px', background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.5 }}>
                  Chronicle is now surfacing canonical echoes and cross references from your local study library so passages can be read in conversation with the rest of Scripture.
                </div>
                {topEchoCards.map((reference, index) => (
                  <div
                    key={`${reference.sourceVerse}-${reference.targetKey}-${index}`}
                    style={{
                      padding: '10px 12px',
                      background: 'var(--card-inner)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      display: 'grid',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <button
                        onClick={() => jumpToVerse(reference.sourceVerse)}
                        style={{
                          border: 'none',
                          background: 'none',
                          padding: 0,
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#1d4ed8',
                          cursor: 'pointer',
                        }}
                      >
                        Verse {reference.sourceVerse}
                      </button>
                      <span style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: 999,
                        background: 'rgba(37,99,235,0.10)',
                        color: '#2563eb',
                      }}>
                        {reference.kind === 'echo' ? 'Canonical Echo' : reference.kind === 'prophecy' ? 'Prophetic Link' : 'Cross Reference'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{reference.targetLabel}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-sub)', lineHeight: 1.45 }}>{reference.note}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => navigateToReference(reference.targetLabel)}
                        style={{
                          border: 'none',
                          background: 'none',
                          padding: 0,
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#1d4ed8',
                          cursor: 'pointer',
                        }}
                      >
                        Open {reference.targetLabel}
                      </button>
                    </div>
                  </div>
                ))}
                {topEchoCards.length === 0 && !loadingEchoes && (
                  <div style={{ padding: '10px 12px', background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: 'var(--text-sub)' }}>
                    No cross references were found for this chapter in the local study library.
                  </div>
                )}
              </div>
            )}
            {panelMode === 'study-colors' && (
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ padding: '10px 12px', background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.5 }}>
                  Study Color Code gives you a simpler reading layer: God's character, identity/confession, invitation, gospel promises, warning/conflict, and worship cues.
                </div>
                {chapterData.verses
                  .filter((verse) => (studyColorByVerse.get(verse.number) || []).length > 0)
                  .slice(0, 18)
                  .map((verse) => (
                    <div
                      key={`study-color-panel-${verse.number}`}
                      style={{
                        padding: '10px 12px',
                        background: 'var(--card-inner)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        display: 'grid',
                        gap: 6,
                      }}
                    >
                      <button
                        onClick={() => jumpToVerse(verse.number)}
                        style={{
                          border: 'none',
                          background: 'none',
                          padding: 0,
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#7c3aed',
                          cursor: 'pointer',
                          justifySelf: 'start',
                        }}
                      >
                        Verse {verse.number}
                      </button>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {(studyColorByVerse.get(verse.number) || []).map((hit) => (
                          <span
                            key={`${verse.number}-${hit.category.id}`}
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 999,
                              background: `${hit.category.color}14`,
                              border: `1px solid ${hit.category.color}35`,
                              color: hit.category.color,
                            }}
                          >
                            {hit.category.label}
                          </span>
                        ))}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-sub)', lineHeight: 1.45 }}>
                        {verse.text.slice(0, 140)}{verse.text.length > 140 ? '…' : ''}
                      </div>
                    </div>
                  ))}
              </div>
            )}
            {panelMode === 'greek' && (
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ padding: '10px 12px', background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.5 }}>
                  Greek / Word Study follows the New Testament text with local Strong's tokens so you can see key glosses, forms, and repeated ideas without leaving the chapter.
                </div>
                {supportsGreek && activeGreekVerse && (
                  <div style={{ padding: '10px 12px', background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 8, display: 'grid', gap: 8 }}>
                    <button
                      onClick={() => jumpToVerse(activeGreekVerse)}
                      style={{
                        border: 'none',
                        background: 'none',
                        padding: 0,
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#4338ca',
                        cursor: 'pointer',
                        justifySelf: 'start',
                      }}
                    >
                      Verse {activeGreekVerse}
                    </button>
                    {(wordStudyByVerse.get(activeGreekVerse) || []).slice(0, 12).map((token) => (
                      <div
                        key={`${activeGreekVerse}-${token.position}-${token.strongs}`}
                        style={{
                          padding: '8px 9px',
                          borderRadius: 8,
                          background: 'rgba(67,56,202,0.05)',
                          border: '1px solid rgba(67,56,202,0.14)',
                          display: 'grid',
                          gap: 3,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#312e81' }}>{token.surface}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#4338ca' }}>{token.strongs}</span>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-sub)' }}>
                          {token.gloss || token.transliteration || 'Greek token'}
                        </div>
                        {(token.definition || token.morphology) && (
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                            {[token.definition, token.morphology].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {supportsGreek && greekVerseNumbers.length > 0 && (
                  <div style={{ padding: '10px 12px', background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 8, display: 'grid', gap: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      Chapter verses with Greek tokens
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {greekVerseNumbers.slice(0, 28).map((verseNumber) => (
                        <button
                          key={`greek-verse-${verseNumber}`}
                          onClick={() => {
                            setFocusedPanelVerse(verseNumber);
                            jumpToVerse(verseNumber);
                          }}
                          style={{
                            border: '1px solid rgba(67,56,202,0.18)',
                            background: activeGreekVerse === verseNumber ? 'rgba(67,56,202,0.12)' : 'transparent',
                            color: '#4338ca',
                            borderRadius: 999,
                            padding: '3px 7px',
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {verseNumber}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {!supportsGreek && (
                  <div style={{ padding: '10px 12px', background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: 'var(--text-sub)' }}>
                    Greek word study is available on New Testament passages.
                  </div>
                )}
              </div>
            )}
            <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 8, display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Reading Layer Status
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.5 }}>
                Active mode: <strong style={{ color: 'var(--text)' }}>
                  {panelMode === 'themes' ? 'Themes' : panelMode === 'echoes' ? 'Echoes' : panelMode === 'study-colors' ? 'Study Colors' : 'Greek / Word Study'}
                </strong>.
                {panelMode === 'themes' && ' Chronicle is highlighting verse-local theme phrases only.'}
                {panelMode === 'echoes' && ' Chronicle is surfacing canonical links and echoes for the current chapter.'}
                {panelMode === 'study-colors' && ' Chronicle is using a simpler devotional reading code instead of broader theological theme labels.'}
                {panelMode === 'greek' && ' Chronicle is showing local word-study support for the current New Testament passage.'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[
                  { label: `Themes ${themes.length}`, active: overlayOn },
                  { label: `Echoes ${crossReferences.length}`, active: echoesOn },
                  { label: `Colors ${studyColorByVerse.size}`, active: studyColorsOn },
                  { label: `Greek ${greekVerseNumbers.length}`, active: greekOn },
                ].map((item) => (
                  <span
                    key={item.label}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 999,
                      border: '1px solid var(--border)',
                      background: item.active ? 'rgba(15,79,207,0.08)' : 'transparent',
                      color: item.active ? 'var(--accent-blue)' : 'var(--text-sub)',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
            {panelMode === 'themes' && <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.5 }}>
              Theme overlay now highlights the specific phrases carrying each theme, rather than painting the whole passage.
            </div>}
            {panelMode === 'themes' && <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 8, display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Evidence Posture
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.5 }}>
                {meaningReflection.evidencePosture}
              </div>
              <div style={{ fontSize: 11, color: evidenceSummary.strength === 'thin' ? 'var(--accent-amber)' : 'var(--text-sub)', lineHeight: 1.5 }}>
                {meaningReflection.confidenceNote}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {evidenceSummary.evidenceKinds.map((kind) => (
                  <span
                    key={kind}
                    style={{ padding: '3px 8px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--card-bg)', fontSize: 10, fontWeight: 700, color: 'var(--text-sub)' }}
                  >
                    {kind.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>}
            <div style={{ marginTop: panelMode === 'themes' ? 10 : 0, padding: '10px 12px', background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.5 }}>
              Chronicle is now reading from your local Bible library. Installed local providers: {providerOptions.length || 0}
            </div>
            <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.5 }}>
              Preferred stack: NKJV first, then CSB, AMP, NIV, and the broader local library after that. Theme analysis is cached locally, so once Chronicle has studied a chapter it does not need to rebuild it every time.
            </div>
            {panelMode === 'themes' && <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.5 }}>
              Current coverage: {coverage.coveredCount}/{coverage.totalVerses} verses visibly themed
              {coverage.coveredCount === 0
                ? ' · no visible themed verses yet'
                : coverageReachesChapterEnd
                  ? ` · chapter coverage is complete through verse ${coverage.maxCoveredVerse}`
                  : ` · still missing verses ${missingCoverageSummary}`}
            </div>}
            {focusedPanelVerse && (
              <div style={{ marginTop: 10, padding: '12px', background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 8, display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Translation Compare · Verse {focusedPanelVerse}
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {loadingTranslationComparisons ? (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Loading local translation comparisons…
                    </div>
                  ) : translationComparisons.length > 0 ? translationComparisons.map((comparison) => (
                    <div key={comparison.providerId} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', display: 'grid', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: comparison.providerId === provider ? 'var(--accent-blue)' : 'var(--text)' }}>
                          {comparison.translation}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{comparison.label}</span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.6 }}>
                        {comparison.verseText || 'Verse unavailable in this local translation.'}
                      </div>
                    </div>
                  )) : (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Chronicle could not load local translation comparisons for this verse yet.
                    </div>
                  )}
                </div>
                <div style={{ display: 'grid', gap: 6, paddingTop: 2 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Translation Discernment
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.55 }}>
                    {translationDiscernment.summary}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-sub)', lineHeight: 1.5 }}>
                    <strong style={{ color: 'var(--text)' }}>Variation type:</strong> {translationDiscernment.variationType}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-sub)', lineHeight: 1.5 }}>
                    <strong style={{ color: 'var(--text)' }}>Shared core:</strong> {translationDiscernment.sharedCore}
                  </div>
                  {translationDiscernment.observations.map((observation) => (
                    <div key={observation} style={{ fontSize: 10, color: 'var(--text-sub)', lineHeight: 1.5 }}>
                      {observation}
                    </div>
                  ))}
                  <div style={{ fontSize: 10, color: 'var(--text-sub)', lineHeight: 1.5 }}>
                    <strong style={{ color: 'var(--text)' }}>How to read it:</strong> {translationDiscernment.readingStrategy}
                  </div>
                </div>
              </div>
            )}
            {panelMode === 'themes' && typeof focusedPanelVerse === 'number' && (
              <div style={{ marginTop: 10, padding: '12px', background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 8, display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Focused Verse Guide · Verse {focusedPanelVerse}
                </div>
                {loadingVerseInsight ? (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Building a verse-level guide from Chronicle&apos;s local commentary, cross references, and word-study data…
                  </div>
                ) : focusedVerseInsight ? (
                  <>
                    {focusedVerseInsight.themes.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {focusedVerseInsight.themes.map((theme) => (
                          <span
                            key={`focused-verse-theme-${focusedPanelVerse}-${theme}`}
                            style={{ padding: '3px 8px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--card-bg)', fontSize: 10, fontWeight: 700, color: 'var(--text-sub)' }}
                          >
                            {theme}
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'grid', gap: 7, fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.55 }}>
                      <div><strong style={{ color: 'var(--text)' }}>Observation:</strong> {focusedVerseInsight.observation}</div>
                      <div><strong style={{ color: 'var(--text)' }}>Meaning:</strong> {focusedVerseInsight.theologicalMeaning}</div>
                      <div><strong style={{ color: 'var(--text)' }}>Canonical echo:</strong> {focusedVerseInsight.canonicalEcho}</div>
                      <div><strong style={{ color: 'var(--text)' }}>For your life:</strong> {focusedVerseInsight.lifePrompt}</div>
                      <div><strong style={{ color: 'var(--text)' }}>Prayer prompt:</strong> {focusedVerseInsight.prayerPrompt}</div>
                    </div>
                    {focusedVerseInsight.evidenceTrail.length > 0 && (
                      <div style={{ display: 'grid', gap: 6 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                          Verse-level evidence
                        </div>
                        {focusedVerseInsight.evidenceTrail.map((item, index) => (
                          <div key={`focused-verse-evidence-${focusedPanelVerse}-${index}`} style={{ padding: '8px 9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', display: 'grid', gap: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 999, background: 'rgba(15,79,207,0.12)', color: 'var(--accent-blue)' }}>
                                {item.kind === 'cross_reference'
                                  ? 'Cross Ref'
                                  : item.kind === 'commentary'
                                    ? 'Commentary'
                                    : item.kind === 'historical_commentary'
                                      ? 'Historical'
                                      : 'Word Study'}
                              </span>
                              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-sub)' }}>{item.label}</span>
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-sub)', lineHeight: 1.45 }}>{item.detail}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          setActiveTab('prayer');
                          navigate('/prayer', {
                            state: {
                              source: 'Bible',
                              title: `${chapterReferenceLabel}:${focusedPanelVerse} · Verse prayer`,
                              passage: formatPassageLabel({ book, chapter, verseStart: focusedPanelVerse }),
                              prompt: focusedVerseInsight.prayerPrompt,
                            },
                          });
                        }}
                        style={{
                          padding: '8px 12px',
                          border: 'none',
                          borderRadius: 8,
                          background: 'var(--accent-blue)',
                          color: 'white',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Pray This Verse
                      </button>
                      <button
                        onClick={() => {
                          addChronicleEntry({
                            id: `verse-insight-${Date.now()}`,
                            date: new Date().toISOString().split('T')[0],
                            type: 'study',
                            title: `${chapterReferenceLabel}:${focusedPanelVerse} · Verse Guide`,
                            body: [
                              `Observation: ${focusedVerseInsight.observation}`,
                              '',
                              `Meaning: ${focusedVerseInsight.theologicalMeaning}`,
                              '',
                              `Canonical echo: ${focusedVerseInsight.canonicalEcho}`,
                              '',
                              `For your life: ${focusedVerseInsight.lifePrompt}`,
                              '',
                              `Prayer prompt: ${focusedVerseInsight.prayerPrompt}`,
                            ].join('\n'),
                            passage: formatPassageLabel({ book, chapter, verseStart: focusedPanelVerse }),
                            themes: focusedVerseInsight.themes,
                            autoCapture: true,
                            sourceContext: {
                              page: 'bible',
                              passage: formatPassageLabel({ book, chapter, verseStart: focusedPanelVerse }),
                              bibleView: {
                                book,
                                chapter,
                                overlayOn: true,
                                echoesOn: false,
                                studyColorsOn: false,
                                greekOn: false,
                                showThemePanel: true,
                                panelMode: 'themes',
                              },
                            },
                          });
                          addToast(`Saved verse guide for ${chapterReferenceLabel}:${focusedPanelVerse}`, 'success', '📖');
                        }}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          background: 'transparent',
                          color: 'var(--text-sub)',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Save Verse Guide
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Chronicle could not build a focused verse guide for this verse yet.
                  </div>
                )}
              </div>
            )}
            {panelMode === 'themes' && themes.length > 0 && <div style={{ marginTop: 10, padding: '12px', background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 8, display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Meaning & Formation
              </div>
              <div style={{ display: 'grid', gap: 7, fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.55 }}>
                <div><strong style={{ color: 'var(--text)' }}>What this chapter is doing:</strong> {meaningReflection.mainMovement}</div>
                <div><strong style={{ color: 'var(--text)' }}>Why it says it here:</strong> {meaningReflection.whyHere}</div>
                <div><strong style={{ color: 'var(--text)' }}>Where this fits in God&apos;s plan:</strong> {meaningReflection.redemptivePlace}</div>
                <div><strong style={{ color: 'var(--text)' }}>Canonical echo:</strong> {meaningReflection.canonicalEcho}</div>
                <div><strong style={{ color: 'var(--text)' }}>For your life today:</strong> {meaningReflection.lifeImplication}</div>
                <div><strong style={{ color: 'var(--text)' }}>Formation question:</strong> {meaningReflection.formationPrompt}</div>
                <div><strong style={{ color: 'var(--text)' }}>Study posture:</strong> {meaningReflection.evidencePosture}</div>
                <div><strong style={{ color: 'var(--text)' }}>Confidence note:</strong> {meaningReflection.confidenceNote}</div>
              </div>
              <div style={{ display: 'grid', gap: 7, paddingTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Passage-Level Theological Synthesis
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{passageSynthesis.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.55 }}>
                  <strong style={{ color: 'var(--text)' }}>Theological center:</strong> {passageSynthesis.theologicalCenter}
                </div>
                <div style={{ display: 'grid', gap: 5 }}>
                  {passageSynthesis.chapterShape.map((movement) => (
                    <div key={movement} style={{ fontSize: 10, color: 'var(--text-sub)', lineHeight: 1.5 }}>
                      {movement}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.55 }}>
                  <strong style={{ color: 'var(--text)' }}>Authorial strategy:</strong> {passageSynthesis.authorStrategy}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.55 }}>
                  <strong style={{ color: 'var(--text)' }}>Redemptive frame:</strong> {passageSynthesis.redemptiveFrame}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.55 }}>
                  <strong style={{ color: 'var(--text)' }}>Lived response:</strong> {passageSynthesis.livedResponse}
                </div>
                <div style={{ display: 'grid', gap: 5 }}>
                  {passageSynthesis.tensions.map((tension) => (
                    <div key={tension} style={{ fontSize: 10, color: 'var(--text-sub)', lineHeight: 1.5 }}>
                      {tension}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gap: 7, paddingTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Guided Canonical Thread
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{canonicalThread.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.55 }}>{canonicalThread.summary}</div>
                <div style={{ display: 'grid', gap: 5 }}>
                  {canonicalThread.movements.map((movement) => (
                    <div key={`${movement.label}-${movement.summary}`} style={{ padding: '8px 9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', display: 'grid', gap: 4 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text)' }}>{movement.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-sub)', lineHeight: 1.5 }}>
                        {movement.summary}
                      </div>
                      {movement.references.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {movement.references.map((reference) => (
                            <button
                              key={`${movement.label}-${reference}`}
                              onClick={() => navigateToReference(reference)}
                              style={{
                                padding: '3px 7px',
                                borderRadius: 999,
                                border: '1px solid var(--border)',
                                background: 'transparent',
                                color: 'var(--accent-blue)',
                                fontSize: 10,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {reference}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {canonicalThread.references.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {canonicalThread.references.slice(0, 4).map((reference) => (
                      <button
                        key={reference}
                        onClick={() => navigateToReference(reference)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 999,
                          border: '1px solid var(--border)',
                          background: 'var(--card-bg)',
                          color: 'var(--accent-blue)',
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Open {reference}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={handlePrayThisChapter}
                  style={{
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: 8,
                    background: 'var(--accent-blue)',
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Pray This Chapter
                </button>
                <button
                  onClick={handleSaveMeaningReflection}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    background: 'transparent',
                    color: 'var(--text-sub)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Save Reflection to Chronicle
                </button>
                <button
                  onClick={handleSaveCanonicalThread}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    background: 'transparent',
                    color: 'var(--text-sub)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Save Canonical Thread
                </button>
                <button
                  onClick={() => handleBookmarkPassage()}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    background: 'transparent',
                    color: 'var(--text-sub)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Bookmark Chapter
                </button>
              </div>
            </div>}
            {panelMode === 'themes' && (
              <div style={{ marginTop: 10, padding: '12px', background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 8, display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Chronicle Links
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {typeof focusedPanelVerse === 'number' && (
                      <button
                        onClick={() => handleBookmarkPassage(focusedPanelVerse)}
                        style={{
                          padding: '6px 10px',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          background: 'transparent',
                          color: 'var(--text-sub)',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Bookmark Verse {focusedPanelVerse}
                      </button>
                    )}
                    <button
                      onClick={() => openChronicleForPassage(typeof focusedPanelVerse === 'number' ? formatPassageLabel({ book, chapter, verseStart: focusedPanelVerse }) : chapterReferenceLabel)}
                      style={{
                        padding: '6px 10px',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        background: 'transparent',
                        color: 'var(--text-sub)',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Open in Chronicle
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
                    Related Chronicle entries
                  </div>
                  {chapterChronicleEntries.length > 0 ? chapterChronicleEntries.map((entry) => (
                    <button
                      key={`chronicle-link-${entry.id}`}
                      onClick={() => openChronicleForPassage(entry.passage)}
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--card-bg)',
                        display: 'grid',
                        gap: 4,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{entry.title}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{getEntryPassageLabel(entry)}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-sub)', lineHeight: 1.45 }}>
                        {entry.body.slice(0, 140)}{entry.body.length > 140 ? '…' : ''}
                      </div>
                    </button>
                  )) : (
                    <div style={{ fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.5 }}>
                      Chronicle does not have saved entries for {chapterReferenceLabel} yet. Click a verse to add one, or save the chapter reflection and study questions here.
                    </div>
                  )}
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
                    Saved bookmarks
                  </div>
                  {(focusedVerseBookmarks.length > 0 || chapterBookmarks.length > 0) ? (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {[...focusedVerseBookmarks, ...chapterBookmarks].slice(0, 6).map((bookmark) => (
                        <div
                          key={bookmark.id}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            background: 'var(--card-bg)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 8,
                            alignItems: 'center',
                          }}
                        >
                          <div style={{ display: 'grid', gap: 3 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{bookmark.label}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{bookmark.passage}</div>
                          </div>
                          <button
                            onClick={() => removeScriptureBookmark(bookmark.id)}
                            style={{
                              border: 'none',
                              background: 'none',
                              padding: 0,
                              fontSize: 10,
                              fontWeight: 700,
                              color: 'var(--accent-amber)',
                              cursor: 'pointer',
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.5 }}>
                      No bookmarks saved for this chapter yet.
                    </div>
                  )}
                </div>
                {typeof focusedPanelVerse === 'number' && focusedVerseChronicleEntries.length > 0 && (
                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
                      Verse {focusedPanelVerse} focus
                    </div>
                    {focusedVerseChronicleEntries.map((entry) => (
                      <button
                        key={`focused-verse-entry-${entry.id}`}
                        onClick={() => openChronicleForPassage(entry.passage)}
                        style={{
                          textAlign: 'left',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          background: 'var(--card-bg)',
                          display: 'grid',
                          gap: 4,
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{entry.title}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{getEntryPassageLabel(entry)}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {panelMode === 'themes' && themes.length > 0 && (
              <div style={{ marginTop: 10, padding: '12px', background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 8, display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Study Questions
                </div>
                <div style={{ display: 'grid', gap: 7, fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.55 }}>
                  <div><strong style={{ color: 'var(--text)' }}>Observation:</strong> {studyQuestions.observation}</div>
                  <div><strong style={{ color: 'var(--text)' }}>Interpretation:</strong> {studyQuestions.interpretation}</div>
                  <div><strong style={{ color: 'var(--text)' }}>Canonical thread:</strong> {studyQuestions.canonical}</div>
                  <div><strong style={{ color: 'var(--text)' }}>Formation:</strong> {studyQuestions.formation}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={handleSaveStudyQuestions}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      background: 'transparent',
                      color: 'var(--text-sub)',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Save Study Questions
                  </button>
                </div>
              </div>
            )}
            {panelMode === 'themes' && <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.5, display: 'grid', gap: 8 }}>
              <div>
                Refresh themes on the page until the chapter feels right. Save only when you want Chronicle to reuse this exact map from the local cache.
              </div>
              {!coverageReachesChapterEnd && coverage.totalVerses > 0 && (
                <div style={{ color: 'var(--accent-amber)' }}>
                  Save is disabled until every verse in the chapter is visibly covered. Right now Chronicle is still missing verses {missingCoverageSummary}.
                </div>
              )}
              <button
                onClick={handleSaveThemes}
                disabled={!canSaveThemes}
                style={{
                  justifySelf: 'start',
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: canSaveThemes ? 'var(--accent-green)' : 'var(--card-bg)',
                  color: canSaveThemes ? 'white' : 'var(--text-muted)',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: canSaveThemes ? 'pointer' : 'not-allowed',
                  opacity: canSaveThemes ? 1 : 0.7,
                }}
              >
                {themeDraftDirty
                  ? canSaveThemes
                    ? 'Save Themes to Chronicle Cache'
                    : 'Finish Chapter Coverage Before Saving'
                  : 'Themes Already Match Saved Cache'}
              </button>
            </div>}
          </div>
        </div>
      )}

      {/* Note modal for verse tap */}
      {selectedVerse && (
        <NewEntryModal
          open={noteModalOpen}
          onClose={() => { setNoteModalOpen(false); setSelectedVerse(null); }}
          defaultType="study"
          defaultPassage={`${book === 'Psalms' ? 'Psalm' : book} ${chapter}:${selectedVerse.num}`}
          defaultBody={`"${selectedVerse.text}"\n\n`}
        />
      )}
    </div>
  );
}
