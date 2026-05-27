import type { Chapter } from './scripture';

export interface BibleThemeDefinition {
  id: string;
  label: string;
  color: string;
  tier: 'Explicit' | 'Strong' | 'Inferred' | 'Debated';
  summary: string;
  supportingVerses: number[];
  versePhrases: Record<number, string[]>;
  verseScores?: Record<number, number>;
  strengthScore?: number;
  evidenceTrail?: ThemeEvidenceItem[];
}

export interface ThemeEvidenceItem {
  kind: 'cross_reference' | 'commentary' | 'historical_commentary' | 'strongs';
  label: string;
  detail: string;
  anchorVerse?: number;
  referenceLabel?: string;
}

interface ThemeBlueprint {
  id: string;
  label: string;
  color: string;
  summary: string;
  keywords: string[];
  evidenceKeywords?: string[];
  anchorKeywords?: string[];
  minDirectHits?: number;
}

interface StudyLibraryManifestEntry {
  bookId: string;
  path: string;
}

interface CrossReferenceBookPayload {
  entries: Record<string, { sourceLabel: string; references: Array<{ targetKey: string; targetLabel: string; note: string }> }>;
}

interface VerseCommentaryBookPayload {
  entries: Record<string, { referenceLabel: string; analysis: string; historical: string; questions: string[] }>;
}

interface HistoricalCommentaryBookPayload {
  entries: Record<string, Array<{
    id: string;
    referenceKey: string;
    referenceLabel: string;
    author: string;
    year?: number;
    sourceTitle?: string;
    sourceUrl?: string;
    quote: string;
  }>>;
}

interface StrongsChapterPayload {
  verses: Record<string, Array<{
    position: number;
    surface: string;
    transliteration: string;
    strongs: string;
    gloss: string;
    morphology: string;
    definition: string;
  }>>;
}

export interface StudyVerseEvidence {
  strongsLines: string[];
  commentarySegments: string[];
  crossReferenceNotes: string[];
  crossReferenceTargets: string[];
  crossReferenceDetails: Array<{ note: string; targetLabel: string }>;
  historicalSegments: string[];
  strongs: string;
  commentary: string;
  crossReferences: string;
  historicalCommentary: string;
}

export interface StudyChapterEvidence {
  verses: Record<number, StudyVerseEvidence>;
  availableSources: {
    strongs: boolean;
    commentary: boolean;
    crossReferences: boolean;
    historicalCommentary: boolean;
  };
}

export interface ThemeAnalysisCacheRecord {
  version: string;
  book: string;
  chapter: number;
  translation: string;
  generatedAt: string;
  themes: BibleThemeDefinition[];
}

export interface VerseStudyInsight {
  verse: number;
  verseText: string;
  themes: string[];
  observation: string;
  theologicalMeaning: string;
  canonicalEcho: string;
  lifePrompt: string;
  prayerPrompt: string;
  evidenceTrail: ThemeEvidenceItem[];
}

const THEME_ANALYSIS_CACHE_VERSION = '2026-05-04-verse-local-v2';

const GENERATED_THEME_BLUEPRINTS: ThemeBlueprint[] = [
  {
    id: 'faith',
    label: 'Faith/Belief',
    color: '#0f4fcf',
    summary: 'This chapter emphasizes trust, belief, confidence, or steadfast reliance on God.',
    keywords: ['faith', 'believe', 'belief', 'trust', 'trusted', 'hope', 'hoped', 'confidence', 'steadfast'],
  },
  {
    id: 'grace',
    label: 'Grace/Mercy',
    color: '#2563eb',
    summary: 'This chapter highlights undeserved favor, mercy, forgiveness, compassion, or pardon.',
    keywords: ['grace', 'gracious', 'mercy', 'merciful', 'compassion', 'forgive', 'forgiveness', 'pardon', 'lovingkindness'],
  },
  {
    id: 'love',
    label: 'Love',
    color: '#db2777',
    summary: 'This chapter foregrounds love, affection, covenant loyalty, or sacrificial care.',
    keywords: ['love', 'loved', 'loving', 'beloved', 'charity', 'kindness'],
  },
  {
    id: 'obedience',
    label: 'Obedience',
    color: '#059669',
    summary: 'This chapter stresses hearing, keeping, following, or walking in God’s commands.',
    keywords: ['obey', 'obedience', 'obeyed', 'command', 'commands', 'keep', 'kept', 'follow', 'statutes', 'ordinances'],
  },
  {
    id: 'prayer',
    label: 'Prayer',
    color: '#7c3aed',
    summary: 'This chapter centers on prayer, calling on God, supplication, or worshipful petition.',
    keywords: ['pray', 'prayer', 'call upon', 'cry out', 'supplication', 'petition', 'intercession'],
  },
  {
    id: 'wisdom',
    label: 'Wisdom',
    color: '#d97706',
    summary: 'This chapter points toward wisdom, understanding, discernment, counsel, or instruction.',
    keywords: ['wisdom', 'wise', 'understanding', 'understand', 'discern', 'discernment', 'counsel', 'instruction', 'knowledge'],
  },
  {
    id: 'fear',
    label: 'Fear/Anxiety',
    color: '#dc2626',
    summary: 'This chapter deals with fear, dread, anxiety, alarm, or the call not to be afraid.',
    keywords: ['fear', 'afraid', 'anxious', 'dismayed', 'terror', 'troubled', 'worry'],
  },
  {
    id: 'peace',
    label: 'Peace/Rest',
    color: '#4f46e5',
    summary: 'This chapter offers peace, rest, stillness, comfort, or settled safety in God.',
    keywords: ['peace', 'rest', 'still', 'quiet', 'comfort', 'refuge', 'safety', 'calm'],
  },
  {
    id: 'salvation',
    label: 'Salvation',
    color: '#0284c7',
    summary: 'This chapter speaks of rescue, deliverance, redemption, life, or being saved.',
    keywords: ['save', 'saved', 'salvation', 'deliver', 'delivered', 'deliverance', 'redeem', 'redemption', 'rescue', 'eternal life'],
  },
  {
    id: 'judgment',
    label: 'Judgment',
    color: '#b91c1c',
    summary: 'This chapter addresses wrath, judgment, condemnation, justice, or divine reckoning.',
    keywords: ['judge', 'judgment', 'wrath', 'condemn', 'condemnation', 'justice', 'punish', 'punishment'],
  },
  {
    id: 'kingdom',
    label: 'Kingdom',
    color: '#1d4ed8',
    summary: 'This chapter stresses reign, kingdom, throne, rule, or the authority of God and His Christ.',
    keywords: ['kingdom', 'king', 'throne', 'reign', 'scepter', 'dominion'],
  },
  {
    id: 'spirit',
    label: 'Spirit',
    color: '#8b5cf6',
    summary: 'This chapter highlights the Spirit’s presence, power, leading, or inner witness.',
    keywords: ['spirit', 'holy spirit', 'ghost', 'breath', 'wind'],
  },
  {
    id: 'creation',
    label: 'Creation',
    color: '#0f766e',
    summary: 'This chapter underscores creation, the heavens and earth, or God’s creative ordering work.',
    keywords: ['create', 'created', 'maker', 'made', 'heavens', 'earth', 'formed', 'light', 'waters'],
  },
  {
    id: 'covenant',
    label: 'Covenant',
    color: '#a16207',
    summary: 'This chapter points to covenant, promise, oath, inheritance, or the enduring faithfulness of God.',
    keywords: ['covenant', 'promise', 'promised', 'oath', 'inheritance', 'blessing', 'bless'],
  },
  {
    id: 'holiness',
    label: 'Holiness',
    color: '#4338ca',
    summary: 'This chapter focuses on holiness, righteousness, purity, consecration, or being set apart.',
    keywords: ['holy', 'holiness', 'righteous', 'righteousness', 'pure', 'purity', 'clean', 'sanctify', 'sanctified'],
  },
  {
    id: 'suffering',
    label: 'Suffering',
    color: '#9f1239',
    summary: 'This chapter deals with affliction, sorrow, trial, lament, endurance, or hardship.',
    keywords: ['suffer', 'suffering', 'afflicted', 'affliction', 'sorrow', 'trouble', 'trial', 'lament', 'weep', 'mourning'],
  },
  {
    id: 'guidance',
    label: 'Guidance',
    color: '#0369a1',
    summary: 'This chapter emphasizes leading, direction, teaching, or the path God sets before His people.',
    keywords: ['lead', 'leads', 'led', 'guide', 'guided', 'teach', 'taught', 'path', 'shepherd', 'counsel'],
  },
  {
    id: 'worship',
    label: 'Worship',
    color: '#ca8a04',
    summary: 'This chapter gives prominence to praise, worship, thanksgiving, or blessing God’s name.',
    keywords: ['praise', 'worship', 'thanks', 'thanksgiving', 'bless the lord', 'sing', 'glory'],
  },
  {
    id: 'presence',
    label: 'Presence',
    color: '#2563eb',
    summary: 'This chapter highlights God’s nearness, abiding presence, indwelling, or covenant companionship.',
    keywords: ['with you', 'with us', 'with me', 'abide', 'abides', 'abiding', 'dwell', 'dwells', 'presence', 'near'],
  },
  {
    id: 'provision',
    label: 'Provision',
    color: '#d97706',
    summary: 'This chapter emphasizes God’s supplying care, nourishment, sufficiency, or generous provision.',
    keywords: ['provide', 'provides', 'provided', 'supply', 'supplies', 'bread', 'cup', 'table', 'portion', 'want', 'need'],
  },
  {
    id: 'righteousness',
    label: 'Righteousness',
    color: '#1d4ed8',
    summary: 'This chapter presses into righteousness, justice, uprightness, or holy living before God.',
    keywords: ['righteous', 'righteousness', 'just', 'justice', 'upright', 'blameless', 'pure heart', 'holy'],
  },
  {
    id: 'truth',
    label: 'Truth',
    color: '#0f4fcf',
    summary: 'This chapter brings truth, faithfulness, revelation, or the trustworthiness of God into focus.',
    keywords: ['truth', 'true', 'faithful', 'faithfulness', 'testimony'],
    evidenceKeywords: ['truth', 'true', 'faithful', 'faithfulness', 'testimony', 'testify', 'witness borne', 'revelation'],
    anchorKeywords: ['truth', 'true', 'faithful', 'faithfulness', 'testimony'],
    minDirectHits: 1,
  },
  {
    id: 'new-birth',
    label: 'New Birth',
    color: '#7c3aed',
    summary: 'This chapter emphasizes regeneration, new life, spiritual birth, or becoming God’s children.',
    keywords: ['born', 'birth', 'children of god', 'adoption', 'receive him'],
    evidenceKeywords: ['born again', 'born from above', 'born of god', 'new life', 'children of god', 'adoption', 'regeneration', 'divine birth', 'made alive', 'receive him'],
  },
  {
    id: 'witness',
    label: 'Witness/Testimony',
    color: '#0284c7',
    summary: 'This chapter emphasizes witness, testimony, confession, and public declaration about who Jesus is.',
    keywords: ['witness', 'testify', 'testimony', 'bear witness', 'confess', 'declared', 'cried out', 'answered and said'],
  },
  {
    id: 'identity',
    label: 'Identity of Christ',
    color: '#4338ca',
    summary: 'This chapter brings Jesus’ identity into focus through names, titles, and revealed claims about His person.',
    keywords: ['lamb of god', 'son of god', 'messiah', 'christ', 'rabbi', 'king of israel', 'prophet', 'elijah', 'the Word'],
  },
  {
    id: 'calling',
    label: 'Calling/Discipleship',
    color: '#059669',
    summary: 'This chapter highlights the invitation to follow Jesus, remain with Him, and bring others to Him.',
    keywords: ['follow', 'come and see', 'disciple', 'abide', 'stay', 'found', 'seeking', 'seek', 'brought him to jesus'],
  },
  {
    id: 'revelation',
    label: 'Revelation/Glory',
    color: '#1d4ed8',
    summary: 'This chapter highlights God being made known through Christ, with glory revealed rather than concealed.',
    keywords: ['glory', 'revealed', 'made known', 'declared him', 'seen his glory'],
    evidenceKeywords: ['revelation', 'revealed', 'glory', 'manifestation', 'declared him', 'made known', 'disclosed', 'unveils', 'beheld his glory'],
  },
  {
    id: 'reception',
    label: 'Reception/Rejection',
    color: '#b91c1c',
    summary: 'This chapter traces the divided human response to Christ: some reject Him, while others receive and confess Him.',
    keywords: ['received him', 'received him not', 'knew him not', 'followed him', 'confessed', 'believed'],
    evidenceKeywords: ['rejected', 'received', 'receive', 'did not know', 'did not receive', 'confession', 'response', 'followed', 'belief', 'unbelief'],
  },
  {
    id: 'sacrifice',
    label: 'Sacrifice/Atonement',
    color: '#a16207',
    summary: 'This chapter frames Christ in sacrificial terms, especially where sin-bearing or redemptive imagery comes to the surface.',
    keywords: ['lamb of god', 'takes away the sin'],
    evidenceKeywords: ['lamb of god', 'takes away sin', 'sacrifice', 'sin-bearing', 'atonement', 'passover', 'offering'],
  },
];

const STOP_WORDS = new Set([
  'about', 'after', 'again', 'against', 'among', 'anything', 'before', 'being', 'because', 'become',
  'called', 'cannot', 'could', 'every', 'first', 'from', 'have', 'into', 'made', 'more', 'most', 'much',
  'only', 'other', 'over', 'shall', 'should', 'their', 'there', 'these', 'they', 'this', 'those', 'through',
  'under', 'until', 'very', 'were', 'what', 'when', 'where', 'which', 'while', 'will', 'with', 'would',
  'your', 'yours', 'them', 'then', 'than', 'that', 'unto', 'upon', 'have', 'been', 'were', 'said', 'lord',
  'god', 'jesus', 'christ', 'father', 'son', 'israel', 'people', 'man', 'woman', 'earth', 'heaven', 'heavens',
  'days', 'shall', 'unto', 'therefore',
]);

const CHAPTER_THEME_MAP: Record<string, BibleThemeDefinition[]> = {
  'Psalms-23': [
    {
      id: 'guidance',
      label: 'Guidance',
      color: '#0f4fcf',
      tier: 'Explicit',
      summary: 'The shepherd theme emphasizes the Lord’s active leading, direction, and care along the path.',
      supportingVerses: [1, 2, 3],
      versePhrases: {
        1: ['shepherd'],
        2: ['leads me'],
        3: ['restores my soul', 'leads me in the paths of righteousness'],
      },
    },
    {
      id: 'rest',
      label: 'Rest',
      color: '#4f46e5',
      tier: 'Strong',
      summary: 'The passage presents rest as settled safety in God’s care, not mere inactivity.',
      supportingVerses: [2, 3, 6],
      versePhrases: {
        2: ['lie down in green pastures', 'still waters'],
        3: ['restores my soul'],
        6: ['dwell in the house of the Lord'],
      },
    },
    {
      id: 'provision',
      label: 'Provision',
      color: '#d97706',
      tier: 'Strong',
      summary: 'God supplies what is needed, from daily sufficiency to abundance in the presence of enemies.',
      supportingVerses: [1, 5, 6],
      versePhrases: {
        1: ['I shall not want'],
        5: ['prepare a table', 'anoint my head with oil', 'cup runs over', 'cup overflows'],
        6: ['goodness and mercy'],
      },
    },
    {
      id: 'trust',
      label: 'Trust',
      color: '#7c3aed',
      tier: 'Inferred',
      summary: 'Confidence in God’s presence steadies the believer through danger and into lasting security.',
      supportingVerses: [4, 6],
      versePhrases: {
        4: ['I will fear no evil', 'You are with me', 'your rod and your staff'],
        6: ['forever', 'all the days of my life'],
      },
    },
  ],
  'John-1': [
    {
      id: 'grace',
      label: 'Grace',
      color: '#0f4fcf',
      tier: 'Explicit',
      summary: 'John ties the coming of Christ to fullness, grace, and truth rather than mere abstract revelation.',
      supportingVerses: [14, 16, 17],
      versePhrases: {
        14: ['full of grace and truth'],
        16: ['grace upon grace'],
        17: ['grace and truth'],
      },
    },
    {
      id: 'incarnation',
      label: 'Incarnation',
      color: '#4f46e5',
      tier: 'Explicit',
      summary: 'The eternal Word enters embodied human history without ceasing to be divine.',
      supportingVerses: [1, 14, 18],
      versePhrases: {
        1: ['the Word', 'was with God', 'was God'],
        14: ['the Word became flesh'],
        18: ['the only begotten Son', 'the only Son'],
      },
    },
    {
      id: 'light',
      label: 'Light',
      color: '#d97706',
      tier: 'Strong',
      summary: 'Light in John 1 signals revelation, life, and divine victory over darkness.',
      supportingVerses: [4, 5, 9],
      versePhrases: {
        4: ['the light of men'],
        5: ['the light shines in the darkness'],
        9: ['the true Light'],
      },
    },
    {
      id: 'reception',
      label: 'Reception/Rejection',
      color: '#b91c1c',
      tier: 'Strong',
      summary: 'John traces the divided human response to Christ: the world resists Him, yet those who receive Him are given a new standing as God’s children.',
      supportingVerses: [10, 11, 12, 13],
      versePhrases: {
        10: ['the world did not know Him'],
        11: ['His own did not receive Him'],
        12: ['as many as received Him', 'to them He gave the right to become children of God'],
        13: ['born, not of blood', 'but of God'],
      },
    },
    {
      id: 'witness',
      label: 'Witness/Testimony',
      color: '#0284c7',
      tier: 'Strong',
      summary: 'John 1 repeatedly advances through testimony: John the Baptist names Christ, and early followers begin confessing Him to others.',
      supportingVerses: [6, 7, 8, 15, 19, 23, 29, 32, 34, 41, 45, 49],
      versePhrases: {
        6: ['sent from God'],
        7: ['came for a witness'],
        8: ['bear witness of that Light'],
        15: ['John bore witness of Him'],
        19: ['this is the testimony of John'],
        23: ['I am the voice'],
        29: ['Behold! The Lamb of God'],
        32: ['John bore witness'],
        34: ['I have seen and testified'],
        41: ['We have found the Messiah'],
        45: ['We have found Him'],
        49: ['You are the Son of God'],
      },
    },
    {
      id: 'identity',
      label: 'Identity of Christ',
      color: '#4338ca',
      tier: 'Explicit',
      summary: 'The chapter presses the reader to reckon with Jesus’ identity through names, titles, and revealed claims about His person.',
      supportingVerses: [1, 18, 29, 34, 41, 45, 49, 51],
      versePhrases: {
        1: ['the Word', 'was with God', 'was God'],
        18: ['the only begotten Son', 'the only Son'],
        29: ['the Lamb of God'],
        34: ['the Son of God'],
        41: ['the Messiah'],
        45: ['Jesus of Nazareth'],
        49: ['the Son of God', 'the King of Israel'],
        51: ['the Son of Man'],
      },
    },
    {
      id: 'calling',
      label: 'Calling/Discipleship',
      color: '#059669',
      tier: 'Strong',
      summary: 'The first chapter of John moves quickly from witness into following, staying, seeking, and bringing others to Jesus.',
      supportingVerses: [37, 38, 39, 40, 42, 43, 46],
      versePhrases: {
        37: ['the two disciples heard him speak, and they followed Jesus'],
        38: ['What do you seek?'],
        39: ['Come and see'],
        40: ['followed Him'],
        42: ['he brought him to Jesus'],
        43: ['Follow Me'],
        46: ['Come and see'],
      },
    },
    {
      id: 'revelation',
      label: 'Revelation/Glory',
      color: '#1d4ed8',
      tier: 'Strong',
      summary: 'John 1 shows Christ making God known, reading hearts, and unveiling heavenly realities rather than leaving them concealed.',
      supportingVerses: [14, 18, 47, 48, 50, 51],
      versePhrases: {
        14: ['we beheld His glory'],
        18: ['He has declared Him'],
        47: ['in whom is no deceit'],
        48: ['Before Philip called you', 'I saw you'],
        50: ['You will see greater things than these'],
        51: ['you shall see heaven open', 'the angels of God ascending and descending'],
      },
    },
  ],
  'Romans-8': [
    {
      id: 'grace',
      label: 'Grace',
      color: '#0f4fcf',
      tier: 'Explicit',
      summary: 'Romans 8 roots assurance in God’s saving action rather than human performance.',
      supportingVerses: [1, 3, 32, 39],
      versePhrases: {
        1: ['no condemnation'],
        3: ['God has done what the law', 'sending his own Son'],
        32: ['graciously give us all things'],
        39: ['love of God in Christ Jesus our Lord'],
      },
    },
    {
      id: 'spirit',
      label: 'Spirit',
      color: '#7c3aed',
      tier: 'Explicit',
      summary: 'The Spirit marks the new life of believers, assuring adoption and belonging.',
      supportingVerses: [2, 15, 16],
      versePhrases: {
        2: ['the Spirit of life'],
        15: ['received the Spirit of adoption', 'Abba! Father!'],
        16: ['The Spirit himself bears witness'],
      },
    },
    {
      id: 'freedom',
      label: 'Freedom',
      color: '#0284c7',
      tier: 'Strong',
      summary: 'Freedom appears as release from condemnation, slavery, and the dominion of sin and death.',
      supportingVerses: [2, 15, 31],
      versePhrases: {
        2: ['set you free', 'law of sin and death'],
        15: ['spirit of slavery'],
        31: ['If God is for us, who can be against us?'],
      },
    },
  ],
  'Philippians-4': [
    {
      id: 'peace',
      label: 'Peace',
      color: '#0f4fcf',
      tier: 'Explicit',
      summary: 'Peace here is God’s guarding presence flowing from prayerful dependence.',
      supportingVerses: [6, 7],
      versePhrases: {
        6: ['by prayer and supplication with thanksgiving'],
        7: ['the peace of God', 'will guard your hearts and your minds'],
      },
    },
    {
      id: 'anxiety',
      label: 'Anxiety/Fear',
      color: '#d97706',
      tier: 'Strong',
      summary: 'Paul directly addresses anxious care and redirects it into prayer, gratitude, and trust.',
      supportingVerses: [6, 7],
      versePhrases: {
        6: ['do not be anxious about anything'],
        7: ['surpasses all understanding'],
      },
    },
    {
      id: 'contentment',
      label: 'Contentment',
      color: '#4f46e5',
      tier: 'Explicit',
      summary: 'Contentment in Philippians 4 is learned Christ-centered steadiness in every circumstance.',
      supportingVerses: [11, 13, 19],
      versePhrases: {
        11: ['I have learned', 'to be content'],
        13: ['I can do all things through him who strengthens me'],
        19: ['my God will supply every need'],
      },
    },
  ],
};

const bookIdByName: Record<string, string> = {
  Genesis: 'GEN',
  Exodus: 'EXO',
  Leviticus: 'LEV',
  Numbers: 'NUM',
  Deuteronomy: 'DEU',
  Joshua: 'JOS',
  Judges: 'JDG',
  Ruth: 'RUT',
  '1 Samuel': '1SA',
  '2 Samuel': '2SA',
  '1 Kings': '1KI',
  '2 Kings': '2KI',
  '1 Chronicles': '1CH',
  '2 Chronicles': '2CH',
  Ezra: 'EZR',
  Nehemiah: 'NEH',
  Esther: 'EST',
  Job: 'JOB',
  Psalms: 'PSA',
  Proverbs: 'PRO',
  Ecclesiastes: 'ECC',
  'Song of Solomon': 'SNG',
  Isaiah: 'ISA',
  Jeremiah: 'JER',
  Lamentations: 'LAM',
  Ezekiel: 'EZK',
  Daniel: 'DAN',
  Hosea: 'HOS',
  Joel: 'JOL',
  Amos: 'AMO',
  Obadiah: 'OBA',
  Jonah: 'JON',
  Micah: 'MIC',
  Nahum: 'NAM',
  Habakkuk: 'HAB',
  Zephaniah: 'ZEP',
  Haggai: 'HAG',
  Zechariah: 'ZEC',
  Malachi: 'MAL',
  Matthew: 'MAT',
  Mark: 'MRK',
  Luke: 'LUK',
  John: 'JHN',
  Acts: 'ACT',
  Romans: 'ROM',
  '1 Corinthians': '1CO',
  '2 Corinthians': '2CO',
  Galatians: 'GAL',
  Ephesians: 'EPH',
  Philippians: 'PHP',
  Colossians: 'COL',
  '1 Thessalonians': '1TH',
  '2 Thessalonians': '2TH',
  '1 Timothy': '1TI',
  '2 Timothy': '2TI',
  Titus: 'TIT',
  Philemon: 'PHM',
  Hebrews: 'HEB',
  James: 'JAS',
  '1 Peter': '1PE',
  '2 Peter': '2PE',
  '1 John': '1JN',
  '2 John': '2JN',
  '3 John': '3JN',
  Jude: 'JUD',
  Revelation: 'REV',
};

const manifestCache = new Map<string, Promise<Record<string, string>>>();
const jsonCache = new Map<string, Promise<unknown>>();

interface GetChapterThemesOptions {
  forceRefresh?: boolean;
  persist?: boolean;
}

interface VerseSupportSnapshot {
  verseNumber: number;
  directMatches: string[];
  textSignals: number;
  strongsSignals: number;
  commentarySignals: number;
  crossReferenceSignals: number;
  historicalSignals: number;
  corroboratingSourceCount: number;
  score: number;
  shouldSupport: boolean;
}

export async function getChapterThemes(
  book: string,
  chapter: number,
  chapterData?: Chapter,
  options: GetChapterThemesOptions = {},
) {
  if (!chapterData) return [];
  const translation = normalizeTranslationId(chapterData.translation || 'default');
  if (!options.forceRefresh) {
    const cached = await loadThemeAnalysisCache(book, chapter, translation).catch(() => null);
    if (cached && cached.version === THEME_ANALYSIS_CACHE_VERSION && Array.isArray(cached.themes) && cached.themes.length > 0) {
      return cached.themes;
    }
  }

  const studyEvidence = await loadStudyEvidence(book, chapter);
  const themes = analyzeChapterThemes(book, chapter, chapterData, studyEvidence);

  if (options.persist !== false) {
    void saveThemeAnalysisCache({
      version: THEME_ANALYSIS_CACHE_VERSION,
      book,
      chapter,
      translation,
      generatedAt: new Date().toISOString(),
      themes,
    });
  }

  return themes;
}

export async function persistChapterThemes(
  book: string,
  chapter: number,
  chapterData: Chapter,
  themes: BibleThemeDefinition[],
) {
  const translation = normalizeTranslationId(chapterData.translation || 'default');
  await saveThemeAnalysisCache({
    version: THEME_ANALYSIS_CACHE_VERSION,
    book,
    chapter,
    translation,
    generatedAt: new Date().toISOString(),
    themes,
  });
}

export async function getVerseStudyInsight(
  book: string,
  chapter: number,
  verseNumber: number,
  chapterData: Chapter,
  themes: BibleThemeDefinition[],
): Promise<VerseStudyInsight | null> {
  const verse = chapterData.verses.find((entry) => entry.number === verseNumber);
  if (!verse) return null;

  const studyEvidence = await loadStudyEvidence(book, chapter);
  const verseThemes = themes
    .filter((theme) => theme.supportingVerses.includes(verseNumber))
    .sort((left, right) => (right.verseScores?.[verseNumber] || 0) - (left.verseScores?.[verseNumber] || 0))
    .slice(0, 3);

  const themeLabels = verseThemes.map((theme) => theme.label);
  const themeKeywords = Array.from(new Set(verseThemes.flatMap((theme) => deriveThemeKeywords(theme))));
  const evidence = studyEvidence?.verses?.[verseNumber];

  const observationParts = [
    verseThemes.length > 0
      ? `Verse ${verseNumber} carries ${themeLabels.join(', ')} in the immediate flow of the chapter.`
      : `Verse ${verseNumber} stands in the current chapter flow without a dominant saved theme yet.`,
  ];

  if (evidence?.crossReferenceTargets?.length) {
    observationParts.push(`Chronicle sees canonical links like ${evidence.crossReferenceTargets.slice(0, 2).join(' and ')} behind this verse.`);
  } else if (verseThemes[0]) {
    observationParts.push(`The chapter-level movement here is especially tied to ${verseThemes[0].label.toLowerCase()}.`);
  }

  const commentaryHint = themeKeywords.length > 0 && evidence
    ? collectEvidenceHints([
      ...(evidence.commentarySegments || []),
      ...(evidence.historicalSegments || []),
    ], themeKeywords)[0]
    : null;
  const strongsHint = themeKeywords.length > 0 && evidence
    ? collectEvidenceHints(evidence.strongsLines || [], themeKeywords)[0]
    : null;
  const crossHint = themeKeywords.length > 0 && evidence
    ? collectEvidenceHints([
      ...(evidence.crossReferenceNotes || []),
      ...(evidence.crossReferenceTargets || []),
    ], themeKeywords)[0]
    : null;

  const theologicalMeaning = [
    verseThemes.length > 0
      ? `Chronicle reads this verse through ${themeLabels.join(', ')}, not as isolated tags but as part of the chapter's witness to Christ and God's work.`
      : `Chronicle treats this verse as a hinge in the chapter's movement, even where the current theme map is still modest.`,
    commentaryHint ? `Commentary especially leans on ${commentaryHint}.` : null,
    strongsHint ? `Word-study detail reinforces ${strongsHint}.` : null,
  ].filter(Boolean).join(' ');

  const canonicalEcho = crossHint
    ? `Cross references especially echo ${crossHint}.`
    : evidence?.crossReferenceTargets?.length
      ? `This verse is linked canonically to ${evidence.crossReferenceTargets.slice(0, 2).join(' and ')}.`
      : verseThemes[0]
        ? `Chronicle currently sees this verse primarily through the chapter's ${verseThemes[0].label.toLowerCase()} movement.`
        : 'Chronicle does not yet have a strong saved canonical echo for this verse.';

  const lifePrompt = verseThemes.length > 0
    ? `If ${themeLabels.join(' and ')} are really at work here, what response of trust, obedience, or confession does this verse ask of you today?`
    : `What is this verse asking you to notice, receive, or obey before you rush past it?`;

  const prayerPrompt = verseThemes.length > 0
    ? `Lord, use ${book} ${chapter}:${verseNumber} to form ${themeLabels.join(' and ').toLowerCase()} in me.`
    : `Lord, teach me to receive ${book} ${chapter}:${verseNumber} with attention and obedience.`;

  const evidenceTrail = verseThemes.length > 0 && studyEvidence
    ? Array.from(
        new Map(
          verseThemes
            .flatMap((theme) => buildThemeEvidenceTrail(deriveThemeKeywords(theme), [verseNumber], studyEvidence))
            .map((item) => [`${item.kind}|${item.label}|${item.detail}`, item]),
        ).values(),
      ).slice(0, 4)
    : [];

  return {
    verse: verseNumber,
    verseText: verse.text,
    themes: themeLabels,
    observation: observationParts.join(' '),
    theologicalMeaning,
    canonicalEcho,
    lifePrompt,
    prayerPrompt,
    evidenceTrail,
  };
}

export function analyzeChapterThemes(
  book: string,
  chapter: number,
  chapterData: Chapter,
  studyEvidence: StudyChapterEvidence | null,
) {
  const curated = CHAPTER_THEME_MAP[`${book}-${chapter}`];
  if (curated?.length) {
    const enrichedCurated = curated.map((theme) => enrichExistingTheme(theme, chapterData, studyEvidence));
    return normalizeVerseLocalThemes(supplementCuratedThemes(enrichedCurated, chapterData, studyEvidence), chapterData, studyEvidence);
  }
  return normalizeVerseLocalThemes(buildGeneratedThemes(chapterData, studyEvidence), chapterData, studyEvidence);
}

function buildGeneratedThemes(chapterData: Chapter, studyEvidence?: StudyChapterEvidence | null) {
  const candidates = GENERATED_THEME_BLUEPRINTS
    .map((blueprint) => buildThemeFromKeywords(blueprint, chapterData, studyEvidence || null))
    .filter((theme): theme is BibleThemeDefinition => Boolean(theme))
    .sort(compareThemesForPriority);
  const generated = selectCoverageAwareThemes(filterWeakThemes(candidates), 5);

  if (generated.length > 0) return generated;
  return buildKeywordFallbackThemes(chapterData);
}

function supplementCuratedThemes(
  curatedThemes: BibleThemeDefinition[],
  chapterData: Chapter,
  studyEvidence: StudyChapterEvidence | null,
) {
  const uncoveredVerses = getUncoveredVerseNumbers(curatedThemes, chapterData);
  if (uncoveredVerses.length === 0) return curatedThemes;

  const existingIds = new Set(curatedThemes.map((theme) => theme.id));
  const candidates = GENERATED_THEME_BLUEPRINTS
    .filter((blueprint) => !existingIds.has(blueprint.id))
    .map((blueprint) => buildThemeFromKeywords(blueprint, chapterData, studyEvidence || null))
    .filter((theme): theme is BibleThemeDefinition => Boolean(theme))
    .filter((theme) => theme.supportingVerses.some((verse) => uncoveredVerses.includes(verse)))
    .sort(compareThemesForPriority);

  const supplements = selectCoverageAwareThemes(candidates, 6, new Set(uncoveredVerses));
  return [...curatedThemes, ...supplements];
}

function getUncoveredVerseNumbers(themes: BibleThemeDefinition[], chapterData: Chapter) {
  const covered = new Set<number>();
  themes.forEach((theme) => {
    Object.keys(theme.versePhrases || {}).forEach((verse) => covered.add(Number(verse)));
  });
  return chapterData.verses
    .map((verse) => verse.number)
    .filter((verseNumber) => !covered.has(verseNumber));
}

function selectCoverageAwareThemes(
  candidates: BibleThemeDefinition[],
  limit: number,
  preferredVerses?: Set<number>,
) {
  const selected: BibleThemeDefinition[] = [];
  const covered = new Set<number>();
  const remaining = [...candidates];

  while (selected.length < limit && remaining.length > 0) {
    let bestIndex = -1;
    let bestScore = -1;

    remaining.forEach((theme, index) => {
      const newCoverage = theme.supportingVerses.filter((verse) => !covered.has(verse));
      const preferredCoverage = preferredVerses
        ? newCoverage.filter((verse) => preferredVerses.has(verse)).length
        : newCoverage.length;
      const score =
        (theme.strengthScore || 0) * 8
        + preferredCoverage * 100
        + newCoverage.length * 10
        + themeTierScore(theme.tier) * 2
        + theme.supportingVerses.length;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    if (bestIndex < 0) break;
    const [chosen] = remaining.splice(bestIndex, 1);
    selected.push(chosen);
    chosen.supportingVerses.forEach((verse) => covered.add(verse));
  }

  return selected.sort(compareThemesForPriority);
}

function compareThemesForPriority(left: BibleThemeDefinition, right: BibleThemeDefinition) {
  const byStrength = (right.strengthScore || 0) - (left.strengthScore || 0);
  if (byStrength !== 0) return byStrength;
  const byTier = themeTierScore(right.tier) - themeTierScore(left.tier);
  if (byTier !== 0) return byTier;
  return right.supportingVerses.length - left.supportingVerses.length;
}

function enrichExistingTheme(theme: BibleThemeDefinition, chapterData: Chapter, studyEvidence: StudyChapterEvidence | null): BibleThemeDefinition {
  const themeKeywords = deriveThemeKeywords(theme);
  const verseScores = buildVerseScoreMap(themeKeywords, chapterData, studyEvidence, theme.versePhrases);
  if (!studyEvidence) {
    return {
      ...theme,
      verseScores,
      strengthScore: scoreThemeStrength(theme.supportingVerses, verseScores),
    };
  }
  const keywords = deriveThemeKeywords(theme);
  const nextVersePhrases = { ...theme.versePhrases };
  const corroboratedHits = theme.supportingVerses.filter((verse) => {
    const evidence = studyEvidence.verses[verse];
    if (!evidence) return false;
    return countKeywordMatches(
      `${evidence.strongs} ${evidence.commentary} ${evidence.crossReferences} ${evidence.historicalCommentary}`,
      keywords,
    ) > 0;
  }).length;

  for (const verseNumber of theme.supportingVerses) {
    if (nextVersePhrases[verseNumber]?.length) continue;
    const verseText = chapterData.verses.find((verse) => verse.number === verseNumber)?.text;
    if (!verseText) continue;
    const fallbackPhrase = extractFallbackPhrase(verseText, keywords);
    if (fallbackPhrase) nextVersePhrases[verseNumber] = [fallbackPhrase];
  }

  return {
    ...theme,
    summary: buildThemeSummaryFromBase(theme.summary, keywords, theme.supportingVerses, corroboratedHits, studyEvidence),
    versePhrases: nextVersePhrases,
    verseScores,
    strengthScore: scoreThemeStrength(theme.supportingVerses, verseScores),
    evidenceTrail: buildThemeEvidenceTrail(keywords, theme.supportingVerses, studyEvidence),
  };
}

function buildThemeFromKeywords(blueprint: ThemeBlueprint, chapterData: Chapter, studyEvidence: StudyChapterEvidence | null): BibleThemeDefinition | null {
  const versePhrases: Record<number, string[]> = {};
  const verseScores: Record<number, number> = {};
  const supportingVerses = new Set<number>();
  let directHits = 0;
  let corroboratedHits = 0;
  const evidenceKeywords = blueprint.evidenceKeywords || blueprint.keywords;
  const anchorKeywords = blueprint.anchorKeywords || blueprint.keywords;

  for (const verse of chapterData.verses) {
    const snapshot = assessVerseThemeSupport(verse.number, verse.text, anchorKeywords, evidenceKeywords, studyEvidence);
    const {
      directMatches,
      commentarySignals,
      crossReferenceSignals,
      historicalSignals,
      strongsSignals,
      shouldSupport,
      score,
    } = snapshot;

    verseScores[verse.number] = score;

    if (shouldSupport) {
      supportingVerses.add(verse.number);
    }

    if (directMatches.length > 0) {
      versePhrases[verse.number] = Array.from(new Set(directMatches));
      directHits += directMatches.length;
    } else if (supportingVerses.has(verse.number)) {
      const fallbackPhrase = extractFallbackPhrase(verse.text, anchorKeywords);
      if (fallbackPhrase) versePhrases[verse.number] = [fallbackPhrase];
    }

    if (commentarySignals > 0 || historicalSignals > 0 || crossReferenceSignals > 0 || strongsSignals > 1) {
      corroboratedHits += 1;
    }
  }

  const supportingVerseList = Array.from(supportingVerses).sort((a, b) => a - b);
  if (supportingVerseList.length === 0) return null;
  if ((blueprint.minDirectHits ?? 1) > directHits) return null;

  return {
    id: blueprint.id,
    label: blueprint.label,
    color: blueprint.color,
    tier: determineTier(directHits, corroboratedHits, studyEvidence),
    summary: buildThemeSummary(blueprint, supportingVerseList, corroboratedHits, studyEvidence),
    supportingVerses: supportingVerseList,
    versePhrases,
    verseScores,
    strengthScore: scoreThemeStrength(supportingVerseList, verseScores),
    evidenceTrail: studyEvidence ? buildThemeEvidenceTrail(blueprint.keywords, supportingVerseList, studyEvidence) : [],
  };
}

function normalizeVerseLocalThemes(
  inputThemes: BibleThemeDefinition[],
  chapterData: Chapter,
  studyEvidence: StudyChapterEvidence | null,
): BibleThemeDefinition[] {
  if (inputThemes.length === 0) return inputThemes;

  const perVerse = new Map<number, Array<{ theme: BibleThemeDefinition; score: number; hasPhrase: boolean }>>();

  inputThemes.forEach((theme) => {
    const themeKeywords = deriveThemeKeywords(theme);
    const verseScores = theme.verseScores || buildVerseScoreMap(themeKeywords, chapterData, studyEvidence, theme.versePhrases);
    theme.supportingVerses.forEach((verseNumber) => {
      const score = verseScores[verseNumber] ?? 0;
      const hasPhrase = Boolean(theme.versePhrases[verseNumber]?.length);
      const current = perVerse.get(verseNumber) || [];
      current.push({ theme, score, hasPhrase });
      perVerse.set(verseNumber, current);
    });
  });

  const allowedByVerse = new Map<number, Set<string>>();
  perVerse.forEach((entries, verseNumber) => {
    const sorted = [...entries].sort((left, right) => right.score - left.score || Number(right.hasPhrase) - Number(left.hasPhrase));
    const bestScore = sorted[0]?.score ?? 0;
    const keep = sorted.filter((entry, index) => {
      if (index === 0) return true;
      if (index === 1) {
        if (entry.hasPhrase && entry.score >= Math.max(6, bestScore - 4)) return true;
        return entry.score >= Math.max(10, bestScore - 2);
      }
      if (entry.hasPhrase && entry.score >= Math.max(12, bestScore - 1)) return true;
      return false;
    }).slice(0, 3);
    allowedByVerse.set(verseNumber, new Set(keep.map((entry) => entry.theme.id)));
  });

  const normalizedThemes: Array<BibleThemeDefinition | null> = inputThemes
    .map((theme) => {
      const nextVersePhrases = Object.fromEntries(
        Object.entries(theme.versePhrases).filter(([verse]) => allowedByVerse.get(Number(verse))?.has(theme.id)),
      );
      const nextSupportingVerses = theme.supportingVerses.filter((verseNumber) => allowedByVerse.get(verseNumber)?.has(theme.id));
      if (nextSupportingVerses.length === 0) return null;
      const themeKeywords = deriveThemeKeywords(theme);
      nextSupportingVerses.forEach((verseNumber) => {
        if (nextVersePhrases[verseNumber]?.length) return;
        const verseText = chapterData.verses.find((verse) => verse.number === verseNumber)?.text;
        if (!verseText) return;
        const fallbackPhrase = extractFallbackPhrase(verseText, themeKeywords);
        if (fallbackPhrase) nextVersePhrases[verseNumber] = [fallbackPhrase];
      });
      const nextVerseScores = Object.fromEntries(
        Object.entries(theme.verseScores || {}).filter(([verse]) => allowedByVerse.get(Number(verse))?.has(theme.id)),
      );

      return {
        ...theme,
        supportingVerses: nextSupportingVerses,
        versePhrases: nextVersePhrases,
        verseScores: nextVerseScores,
        strengthScore: scoreThemeStrength(nextSupportingVerses, nextVerseScores),
      };
    });

  return normalizedThemes
    .filter((theme): theme is BibleThemeDefinition => theme !== null)
    .sort(compareThemesForPriority);
}

function buildKeywordFallbackThemes(chapterData: Chapter): BibleThemeDefinition[] {
  const counts = new Map<string, { verses: Set<number> }>();

  for (const verse of chapterData.verses) {
    for (const token of tokenize(verse.text)) {
      if (token.length < 4 || STOP_WORDS.has(token)) continue;
      if (!counts.has(token)) counts.set(token, { verses: new Set() });
      counts.get(token)!.verses.add(verse.number);
    }
  }

  return Array.from(counts.entries())
    .sort((left, right) => {
      const byVerseCoverage = right[1].verses.size - left[1].verses.size;
      if (byVerseCoverage !== 0) return byVerseCoverage;
      return right[0].length - left[0].length;
    })
    .slice(0, 4)
    .map(([token], index) => {
      const versePhrases: Record<number, string[]> = {};
      for (const verse of chapterData.verses) {
        const matches = findMatchingPhrases(verse.text, token);
        if (matches.length > 0) versePhrases[verse.number] = Array.from(new Set(matches));
      }
      const supportingVerses = Object.keys(versePhrases).map(Number).sort((a, b) => a - b);
      return {
        id: `keyword-${token}`,
        label: toTitleCase(token),
        color: ['#0f4fcf', '#7c3aed', '#d97706', '#059669'][index % 4],
        tier: 'Debated' as const,
        summary: `A generated keyword thread based on repeated chapter language around “${token}.”`,
        supportingVerses,
        versePhrases,
      };
    })
    .filter((theme) => theme.supportingVerses.length > 0);
}

function findMatchingPhrases(text: string, keyword: string) {
  const matcher = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'ig');
  const matches = [];
  let match = matcher.exec(text);
  while (match) {
    matches.push(match[0]);
    match = matcher.exec(text);
  }
  return matches;
}

function extractFallbackPhrase(text: string, keywords: string[]) {
  const lowered = text.toLowerCase();
  const keywordToken = keywords
    .flatMap((keyword) => tokenize(keyword))
    .find((token) => token.length >= 4 && lowered.includes(token));

  if (keywordToken) {
    const phrase = extractClauseAroundToken(text, keywordToken);
    if (phrase) return phrase;
  }

  const clause = text.split(/[.;:!?]/)[0]?.trim();
  if (!clause) return '';
  const words = clause.split(/\s+/);
  if (words.length <= 10) return clause;
  return `${words.slice(0, 10).join(' ')}...`;
}

function extractClauseAroundToken(text: string, token: string) {
  const lowered = text.toLowerCase();
  const index = lowered.indexOf(token.toLowerCase());
  if (index < 0) return '';

  const before = text.slice(0, index);
  const after = text.slice(index);
  const clauseStart = Math.max(
    before.lastIndexOf('.'),
    before.lastIndexOf(';'),
    before.lastIndexOf(':'),
    before.lastIndexOf(','),
  ) + 1;
  const endCandidates = ['.', ';', ':', ',']
    .map((mark) => after.indexOf(mark))
    .filter((value) => value >= 0);
  const clauseEnd = endCandidates.length > 0 ? index + Math.min(...endCandidates) : text.length;
  return text.slice(clauseStart, clauseEnd).trim();
}

function countKeywordMatches(text: string, keywords: string[]) {
  return keywords.reduce((sum, keyword) => sum + findMatchingPhrases(text, keyword).length, 0);
}

function countConceptMatches(text: string, keywords: string[]) {
  const lowered = text.toLowerCase();
  const tokenStems = new Set(tokenize(text).map(normalizeTokenStem).filter(Boolean));

  return keywords.reduce((sum, keyword) => {
    const loweredKeyword = keyword.toLowerCase();
    let hits = 0;
    if (lowered.includes(loweredKeyword)) hits += 2;

    const keywordTokens = tokenize(keyword).map(normalizeTokenStem).filter(Boolean);
    const tokenHits = keywordTokens.filter((token) => tokenStems.has(token)).length;
    if (tokenHits > 0) {
      hits += keywordTokens.length > 1
        ? tokenHits === keywordTokens.length ? 2 : 1
        : 1;
    }
    return sum + hits;
  }, 0);
}

function determineTier(directHits: number, corroboratedHits: number, studyEvidence: StudyChapterEvidence | null): BibleThemeDefinition['tier'] {
  const corroborationAvailable = Boolean(
    studyEvidence && (studyEvidence.availableSources.commentary || studyEvidence.availableSources.strongs || studyEvidence.availableSources.crossReferences),
  );
  if (directHits >= 3 && corroboratedHits >= 2 && corroborationAvailable) return 'Explicit';
  if (directHits >= 2 || (directHits >= 1 && corroboratedHits >= 2)) return 'Strong';
  if (corroboratedHits >= 1 || directHits >= 1) return 'Inferred';
  return 'Debated';
}

function filterWeakThemes(candidates: BibleThemeDefinition[]) {
  if (candidates.length === 0) return candidates;
  const strongest = Math.max(...candidates.map((theme) => theme.strengthScore || 0));
  const minimumStrength = Math.max(14, Math.round(strongest * 0.42));
  return candidates.filter((theme) => (theme.strengthScore || 0) >= minimumStrength);
}

function scoreThemeStrength(supportingVerses: number[], verseScores: Record<number, number>) {
  const rankedScores = supportingVerses
    .map((verse) => verseScores[verse] || 0)
    .sort((left, right) => right - left);
  const topWeight = rankedScores.slice(0, 3).reduce((sum, score) => sum + score, 0);
  return topWeight + rankedScores.length * 2;
}

function assessVerseThemeSupport(
  verseNumber: number,
  verseText: string,
  anchorKeywords: string[],
  evidenceKeywords: string[],
  studyEvidence: StudyChapterEvidence | null,
): VerseSupportSnapshot {
  const directMatches = anchorKeywords.flatMap((keyword) => findMatchingPhrases(verseText, keyword));
  const evidence = studyEvidence?.verses[verseNumber];
  const textSignals = countConceptMatches(verseText, evidenceKeywords);
  const strongsSignals = evidence ? countConceptMatches(evidence.strongs, evidenceKeywords) : 0;
  const commentarySignals = evidence ? countConceptMatches(evidence.commentary, evidenceKeywords) : 0;
  const crossReferenceSignals = evidence ? countConceptMatches(evidence.crossReferences, evidenceKeywords) : 0;
  const historicalSignals = evidence ? countConceptMatches(evidence.historicalCommentary, evidenceKeywords) : 0;
  const corroboratingSourceCount = [
    commentarySignals > 0,
    historicalSignals > 0,
    crossReferenceSignals > 0,
    strongsSignals > 0,
  ].filter(Boolean).length;

  const score =
    directMatches.length * 8
    + Math.min(textSignals, 2) * 2
    + commentarySignals * 5
    + crossReferenceSignals * 4
    + historicalSignals * 3
    + strongsSignals * 2;

  const shouldSupport = studyEvidence
    ? (directMatches.length > 0 && (commentarySignals > 0 || crossReferenceSignals > 0 || historicalSignals > 0 || strongsSignals > 0))
      || (commentarySignals > 0 && crossReferenceSignals > 0)
      || (commentarySignals > 0 && historicalSignals > 0)
      || (score >= 12 && corroboratingSourceCount >= 2)
      || (score >= 16)
    : textSignals >= 2 || directMatches.length > 0;

  return {
    verseNumber,
    directMatches,
    textSignals,
    strongsSignals,
    commentarySignals,
    crossReferenceSignals,
    historicalSignals,
    corroboratingSourceCount,
    score,
    shouldSupport,
  };
}

function buildVerseScoreMap(
  keywords: string[],
  chapterData: Chapter,
  studyEvidence: StudyChapterEvidence | null,
  versePhrases: Record<number, string[]>,
) {
  const scores: Record<number, number> = {};
  const anchorKeywords = Array.from(new Set([
    ...keywords,
    ...Object.values(versePhrases).flat(),
  ]));

  chapterData.verses.forEach((verse) => {
    const snapshot = assessVerseThemeSupport(verse.number, verse.text, anchorKeywords, keywords, studyEvidence);
    let score = snapshot.score;
    if (versePhrases[verse.number]?.length) {
      score += 4;
    }
    scores[verse.number] = score;
  });

  return scores;
}

function buildThemeSummary(
  blueprint: ThemeBlueprint,
  supportingVerses: number[],
  corroboratedHits: number,
  studyEvidence: StudyChapterEvidence | null,
) {
  return buildThemeSummaryFromBase(blueprint.summary, blueprint.keywords, supportingVerses, corroboratedHits, studyEvidence);
}

function buildThemeSummaryFromBase(
  baseSummary: string,
  keywords: string[],
  supportingVerses: number[],
  corroboratedHits: number,
  studyEvidence: StudyChapterEvidence | null,
) {
  if (!studyEvidence || corroboratedHits === 0) return baseSummary;
  const sources = [
    studyEvidence.availableSources.strongs ? 'Strong’s word study' : null,
    studyEvidence.availableSources.crossReferences ? 'cross references' : null,
    studyEvidence.availableSources.commentary ? 'verse commentary' : null,
    studyEvidence.availableSources.historicalCommentary ? 'historical commentary' : null,
  ].filter(Boolean);

  if (sources.length === 0) return baseSummary;
  const evidenceTrail = buildEvidenceTrail(keywords, supportingVerses, studyEvidence);
  const supportCount = supportingVerses.length;
  const supportLine = `Local ${sources.slice(0, 2).join(' and ')} data reinforce this reading across ${supportCount} verse${supportCount === 1 ? '' : 's'}.`;
  return `${baseSummary} ${supportLine}${evidenceTrail ? ` ${evidenceTrail}` : ''}`;
}

function themeTierScore(tier: BibleThemeDefinition['tier']) {
  return { Explicit: 4, Strong: 3, Inferred: 2, Debated: 1 }[tier];
}

async function loadThemeAnalysisCache(book: string, chapter: number, translation: string) {
  const response = await fetch(
    `/api/theme-analysis-cache?book=${encodeURIComponent(book)}&chapter=${encodeURIComponent(String(chapter))}&translation=${encodeURIComponent(translation)}`,
  );
  if (!response.ok) throw new Error('No cached theme analysis found.');
  return response.json() as Promise<ThemeAnalysisCacheRecord>;
}

async function saveThemeAnalysisCache(record: ThemeAnalysisCacheRecord) {
  await fetch('/api/theme-analysis-cache', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
}

async function loadStudyEvidence(book: string, chapter: number): Promise<StudyChapterEvidence | null> {
  const bookId = bookIdByName[book];
  if (!bookId) return null;

  const [strongs, crossRefs, kjvCommentary, historicalCommentary] = await Promise.all([
    loadJson<StrongsChapterPayload>(`/study-library/strongs/kjvstudy/chapters/${bookId}.${chapter}.json`).catch(() => null),
    loadBookManifestJson<CrossReferenceBookPayload>('/study-library/cross-references/kjvstudy/manifest.json', bookId).catch(() => null),
    loadBookManifestJson<VerseCommentaryBookPayload>('/study-library/commentaries/kjvstudy/manifest.json', bookId).catch(() => null),
    loadBookManifestJson<HistoricalCommentaryBookPayload>('/study-library/commentaries/commentaries-database/manifest.json', bookId).catch(() => null),
  ]);

  const verses: Record<number, StudyVerseEvidence> = {};

  for (let verse = 1; verse <= 200; verse += 1) {
    const verseKey = `${bookId}.${chapter}.${verse}`;
    const historicalEntries = resolveHistoricalEntries(historicalCommentary, bookId, chapter, verse);
    const commentaryEntry = kjvCommentary?.entries?.[verseKey];
    const crossRefEntry = crossRefs?.entries?.[verseKey];
    const strongsEntry = strongs?.verses?.[verseKey];

    if (!historicalEntries.length && !commentaryEntry && !crossRefEntry && !strongsEntry) continue;

    verses[verse] = {
      strongsLines: (strongsEntry || []).map((token) => `${token.surface}: ${token.gloss}${token.definition ? ` - ${token.definition}` : ''}`),
      commentarySegments: commentaryEntry
        ? [
            commentaryEntry.analysis || '',
            commentaryEntry.historical || '',
            ...(commentaryEntry.questions || []),
          ].filter(Boolean)
        : [],
      crossReferenceNotes: crossRefEntry
        ? crossRefEntry.references.map((entry) => entry.note).filter(Boolean)
        : [],
      crossReferenceTargets: crossRefEntry
        ? crossRefEntry.references.map((entry) => entry.targetLabel).filter(Boolean)
        : [],
      crossReferenceDetails: crossRefEntry
        ? crossRefEntry.references.map((entry) => ({ note: entry.note || '', targetLabel: entry.targetLabel || '' }))
        : [],
      historicalSegments: historicalEntries.map((entry) => `${entry.author}${entry.sourceTitle ? ` on ${entry.sourceTitle}` : ''}: ${entry.quote}`),
      strongs: (strongsEntry || [])
        .map((token) => `${token.surface} ${token.gloss} ${token.definition} ${token.strongs}`)
        .join(' '),
      commentary: commentaryEntry
        ? `${commentaryEntry.analysis} ${commentaryEntry.historical} ${(commentaryEntry.questions || []).join(' ')}`
        : '',
      crossReferences: crossRefEntry
        ? crossRefEntry.references.map((entry) => `${entry.note} ${entry.targetLabel}`).join(' ')
        : '',
      historicalCommentary: historicalEntries.map((entry) => `${entry.author} ${entry.sourceTitle || ''} ${entry.quote}`).join(' '),
    };
  }

  const availableSources = {
    strongs: Boolean(strongs),
    commentary: Boolean(kjvCommentary),
    crossReferences: Boolean(crossRefs),
    historicalCommentary: Boolean(historicalCommentary),
  };

  if (Object.keys(verses).length === 0) return { verses: {}, availableSources };
  return { verses, availableSources };
}

function buildEvidenceTrail(keywords: string[], supportingVerses: number[], studyEvidence: StudyChapterEvidence) {
  const hints: string[] = [];

  const commentaryHint = collectEvidenceHints(
    supportingVerses.flatMap((verse) => [
      ...(studyEvidence.verses[verse]?.commentarySegments || []),
      ...(studyEvidence.verses[verse]?.historicalSegments || []),
    ]),
    keywords,
  )[0];
  if (commentaryHint) hints.push(`Commentary leans on ${commentaryHint}.`);

  const crossReferenceHint = collectEvidenceHints(
    supportingVerses.flatMap((verse) => [
      ...(studyEvidence.verses[verse]?.crossReferenceNotes || []),
      ...(studyEvidence.verses[verse]?.crossReferenceTargets || []),
    ]),
    keywords,
  )[0];
  if (crossReferenceHint) hints.push(`Cross references echo ${crossReferenceHint}.`);

  const strongsHint = collectEvidenceHints(
    supportingVerses.flatMap((verse) => studyEvidence.verses[verse]?.strongsLines || []),
    keywords,
  )[0];
  if (strongsHint) hints.push(`Word-study detail reinforces ${strongsHint}.`);

  return hints.slice(0, 2).join(' ');
}

function buildThemeEvidenceTrail(keywords: string[], supportingVerses: number[], studyEvidence: StudyChapterEvidence): ThemeEvidenceItem[] {
  const items: ThemeEvidenceItem[] = [];

  for (const verse of supportingVerses) {
    const evidence = studyEvidence.verses[verse];
    if (!evidence) continue;

    const crossRef = evidence.crossReferenceDetails.find((entry) => countKeywordMatches(`${entry.note} ${entry.targetLabel}`, keywords) > 0);
    if (crossRef) {
      items.push({
        kind: 'cross_reference',
        label: crossRef.note || 'Cross reference',
        detail: crossRef.targetLabel,
        anchorVerse: verse,
        referenceLabel: crossRef.targetLabel,
      });
    }

    const commentary = collectEvidenceHints(evidence.commentarySegments, keywords)[0];
    if (commentary) {
      items.push({
        kind: 'commentary',
        label: `Verse ${verse} commentary`,
        detail: commentary.slice(1, -1),
        anchorVerse: verse,
      });
    }

    const historical = collectEvidenceHints(evidence.historicalSegments, keywords)[0];
    if (historical) {
      items.push({
        kind: 'historical_commentary',
        label: `Verse ${verse} historical`,
        detail: historical.slice(1, -1),
        anchorVerse: verse,
      });
    }

    const strongs = collectEvidenceHints(evidence.strongsLines, keywords)[0];
    if (strongs) {
      items.push({
        kind: 'strongs',
        label: `Verse ${verse} word study`,
        detail: strongs.slice(1, -1),
        anchorVerse: verse,
      });
    }
  }

  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.kind}|${item.label}|${item.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 4);
}

function deriveThemeKeywords(theme: BibleThemeDefinition) {
  const labelTokens = tokenize(theme.label);
  const summaryTokens = tokenize(theme.summary).filter((token) => token.length >= 4 && !STOP_WORDS.has(token));
  const phraseTokens = Object.values(theme.versePhrases)
    .flat()
    .flatMap((phrase) => tokenize(phrase))
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));

  return Array.from(new Set([...labelTokens, ...summaryTokens, ...phraseTokens])).slice(0, 18);
}

function collectEvidenceHints(fragments: string[], keywords: string[]) {
  const cleaned = fragments
    .map((fragment) => sanitizeEvidenceText(fragment))
    .filter(Boolean)
    .map((fragment) => ({ fragment, score: countKeywordMatches(fragment, keywords) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.fragment.length - right.fragment.length);

  const seen = new Set<string>();
  const results: string[] = [];
  for (const item of cleaned) {
    const snippet = shortenEvidence(item.fragment);
    const dedupeKey = snippet.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    results.push(`"${snippet}"`);
    if (results.length >= 3) break;
  }
  return results;
}

function sanitizeEvidenceText(value: string) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function shortenEvidence(value: string) {
  if (value.length <= 96) return value;
  return `${value.slice(0, 93).trimEnd()}...`;
}

function resolveHistoricalEntries(
  payload: HistoricalCommentaryBookPayload | null,
  bookId: string,
  chapter: number,
  verse: number,
) {
  if (!payload?.entries) return [];
  const results: HistoricalCommentaryBookPayload['entries'][string] = [];
  for (const [referenceKey, entries] of Object.entries(payload.entries)) {
    const parsed = parseReferenceKey(referenceKey);
    if (!parsed) continue;
    if (parsed.bookId !== bookId || parsed.chapter !== chapter) continue;
    if (parsed.verseStart === null) continue;
    const end = parsed.verseEnd ?? parsed.verseStart;
    if (verse >= parsed.verseStart && verse <= end) {
      results.push(...entries);
    }
  }
  return results;
}

function parseReferenceKey(referenceKey: string) {
  const match = referenceKey.match(/^(?<bookId>[A-Z0-9]+)\.(?<chapter>\d+)(?:\.(?<verseStart>\d+)(?:-(?<verseEnd>\d+))?)?$/);
  if (!match?.groups) return null;
  return {
    bookId: match.groups.bookId,
    chapter: Number.parseInt(match.groups.chapter, 10),
    verseStart: match.groups.verseStart ? Number.parseInt(match.groups.verseStart, 10) : null,
    verseEnd: match.groups.verseEnd ? Number.parseInt(match.groups.verseEnd, 10) : null,
  };
}

async function loadBookManifestJson<T>(manifestPath: string, bookId: string) {
  const manifest = await getManifestMap(manifestPath);
  const filePath = manifest[bookId];
  if (!filePath) return null;
  return loadJson<T>(filePath);
}

async function getManifestMap(manifestPath: string) {
  if (!manifestCache.has(manifestPath)) {
    manifestCache.set(manifestPath, (async () => {
      const manifest = await loadJson<{ books: StudyLibraryManifestEntry[] }>(manifestPath);
      return Object.fromEntries((manifest.books || []).map((entry) => [entry.bookId, entry.path]));
    })());
  }
  return manifestCache.get(manifestPath)!;
}

async function loadJson<T>(url: string): Promise<T> {
  if (!jsonCache.has(url)) {
    jsonCache.set(
      url,
      fetch(url).then(async (response) => {
        if (!response.ok) throw new Error(`Failed to load ${url}`);
        return response.json();
      }),
    );
  }
  return jsonCache.get(url)! as Promise<T>;
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function normalizeTokenStem(token: string) {
  return token
    .replace(/'(s|t|re|ve|ll|d|m)$/i, '')
    .replace(/(ations|ation|itions|ition|ments|ment|ness|ships|ship)$/i, '')
    .replace(/(ingly|edly|ings|ing|ied|ies|iest|ier|ers|er|ed|es|s)$/i, '')
    .replace(/[^a-z0-9]/gi, '')
    .trim();
}

function normalizeTranslationId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'default';
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
