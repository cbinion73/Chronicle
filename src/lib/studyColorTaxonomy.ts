// Study Colors taxonomy — a highlighter-and-ink system for tagging Bible
// verses by theme, built on Strong's numbers rather than English phrase
// matching (see REDESIGN.md's Study Colors section for the full brief).
//
// Highlighter = topic (12 families below). Ink = mode — the same verse
// reads differently in tone depending on whether it states a truth,
// makes a promise/prophecy, or gives a warning; that's handled in
// bibleStudyColor.ts's mode-detection pass, not here.
//
// Every Strong's number in every family below was independently
// verified against the actual STEPBible lexicon files
// (data/vendor/stepbible/.../Lexicons/TBESG, TBESH) via a multi-agent
// workflow: propose → grep-verify against ground truth → adversarial
// doctrinal review with WebSearch cross-checks for the theologically
// load-bearing families. Numbers that didn't exist, pointed to the
// wrong word, or turned out too generic/contested were dropped — see
// REDESIGN.md for the specific catches (a hallucinated Strong's number
// for Spirit baptism, several mis-cited numbers pointing to unrelated
// words, etc.). This is a curated core vocabulary (~250 words), not
// every occurrence of every related word — most Strong's numbers are
// ordinary words with no thematic weight, so a verse with none of these
// simply doesn't light up.
//
// IDs are unpadded (G26, H120 — not G0026, H0120) to match the format
// used by the actual word-study corpus at
// public/study-library/strongs/kjvstudy/chapters/*.json.

export type TopicFamilyId =
  | 'god-names'
  | 'praise-thanksgiving'
  | 'spirit'
  | 'gospel-salvation'
  | 'faith-healing-miracles'
  | 'the-walk'
  | 'lament-repentance'
  | 'sin-enemy'
  | 'prophecy-return'
  | 'family-household'
  | 'comfort-refuge'
  | 'leadership-calling'
  | 'money-stewardship';

export interface TopicFamily {
  id: TopicFamilyId;
  label: string;
  shortLabel: string;
  /** Highlighter background. */
  bg: string;
  /** Default ("stated"-mode) ink color for text under this highlight. */
  ink: string;
  /** Verified Strong's numbers — see file header for the verification process. */
  strongs: readonly string[];
}

export const TOPIC_FAMILIES: readonly TopicFamily[] = [
  {
    id: 'god-names',
    label: "God's names and character",
    shortLabel: 'God',
    bg: '#fdf3d0',
    ink: '#634d06',
    strongs: [
      'H3068', 'H430', 'H136', 'H7706', 'H6635', 'H5945',
      'G2316', 'G2962', 'G3962', 'G5207', 'G2424', 'G5547', 'G4151',
      'G4336', 'G4335', 'H6419', 'H8605', 'H6942', 'G40', 'G26',
    ],
  },
  {
    id: 'praise-thanksgiving',
    label: 'Praise, thanksgiving, and exaltation',
    shortLabel: 'Praise',
    bg: '#ffe9b3',
    ink: '#7a4e00',
    strongs: [
      'H1984', 'G134', 'G1391', 'G2168', 'H3034', 'H7891', 'G4352',
      'G5312', 'H7311', 'H1431', 'G3170',
    ],
  },
  {
    id: 'spirit',
    label: 'The Holy Spirit',
    shortLabel: 'Spirit',
    bg: '#fde4d0',
    ink: '#712b13',
    strongs: [
      'G4151', 'H7307', 'G907', 'G908', 'G1100', 'G5486', 'G4152',
      'G5548', 'G5545', 'H4886', 'G4130', 'G1411', 'G1968', 'G3875',
    ],
  },
  {
    id: 'gospel-salvation',
    label: 'Gospel and salvation',
    shortLabel: 'Gospel',
    bg: '#fbdde8',
    ink: '#72243e',
    strongs: [
      'G4991', 'G4982', 'G4990', 'G4716', 'G4717', 'G129', 'G1344',
      'G1343', 'G629', 'G3084', 'G3083', 'G59', 'G859', 'G863', 'G266',
      'G2435', 'G2644', 'G313', 'G5485', 'H3444', 'H3467', 'H1350',
      'H6299', 'H1818', 'H3722', 'H5545',
    ],
  },
  {
    id: 'faith-healing-miracles',
    label: 'Faith, healing, and miracles',
    shortLabel: 'Faith',
    bg: '#d9ebfb',
    ink: '#0c447c',
    strongs: [
      'G4102', 'G4100', 'G4103', 'H539', 'G4592', 'G5059', 'G1411',
      'H226', 'H4159', 'G2390', 'G2323', 'G4982', 'H7495', 'H4832',
      'G5199', 'G1140', 'G1544', 'G169',
    ],
  },
  {
    id: 'the-walk',
    label: 'The walk',
    shortLabel: 'The Walk',
    bg: '#e2f0d2',
    ink: '#27500a',
    strongs: [
      'H1980', 'G4043', 'G4748', 'H8451', 'H4687', 'H2706', 'H4941',
      'H1285', 'G1785', 'G3551', 'G1242', 'H2451', 'H4148', 'G4678',
      'G1319', 'G2590', 'G26', 'G5479', 'G1515', 'G4102', 'G4236',
      'G1466', 'H6944', 'G40', 'G1577', 'G2842',
    ],
  },
  {
    id: 'lament-repentance',
    label: 'Lament and repentance',
    shortLabel: 'Lament',
    bg: '#e9e7f8',
    ink: '#3c3489',
    strongs: [
      'H1058', 'H56', 'H60', 'H4553', 'H5594', 'H6969', 'H7015',
      'H6087', 'H7665', 'H1794', 'H7725', 'H5162', 'H6031', 'G3996',
      'G3997', 'G2799', 'G2805', 'G2875', 'G3341', 'G3340', 'G4959',
      'G2347', 'G3600', 'G1994',
    ],
  },
  {
    id: 'sin-enemy',
    label: 'Sin and the enemy',
    shortLabel: 'Sin',
    bg: '#ece5dc',
    ink: '#4a3a28',
    strongs: [
      'G266', 'G264', 'H2403', 'H2398', 'H6588', 'H5771', 'G3986',
      'G3985', 'G1228', 'G4567', 'G3789', 'H5175', 'G4190', 'G2556',
      'H7451', 'H7563', 'G4106', 'G4105', 'G1388', 'H4820', 'H457',
      'G1497', 'H8441', 'G93',
    ],
  },
  {
    id: 'prophecy-return',
    label: 'Prophecy and the return of Christ',
    shortLabel: 'Prophecy',
    bg: '#e6e0f5',
    ink: '#3d2570',
    strongs: [
      'G4395', 'G4396', 'G4394', 'G3705', 'G3706', 'H5030', 'H2374',
      'H2472', 'G4137', 'G5547', 'H4899', 'G3952', 'G602', 'G601',
      'G2015', 'G2078', 'G1127', 'G4328', 'G386', 'G1453', 'G968',
      'G2920', 'G2537', 'G166', 'H5769',
    ],
  },
  {
    id: 'family-household',
    label: 'Family and household',
    shortLabel: 'Family',
    bg: '#f5ded0',
    ink: '#7a3d1a',
    strongs: [
      'G1062', 'G1135', 'G435', 'G3566', 'G3565', 'G5043', 'G5207',
      'G2364', 'G3962', 'G3384', 'G80', 'G79', 'G3624', 'G3614',
      'G5384', 'H802', 'H376', 'H1', 'H517', 'H1121', 'H1323', 'H251',
      'H1004',
    ],
  },
  {
    id: 'comfort-refuge',
    label: 'Comfort, refuge, and help in trouble',
    shortLabel: 'Comfort',
    bg: '#d4f0ea',
    ink: '#0d5c4f',
    strongs: [
      // H5162 (nacham) was flagged "uncertain" in doctrinal review (it
      // spans comfort/console AND relent/repent senses) and dropped from
      // this family on that basis alone — but it's the literal word
      // behind "Comfort, yes, comfort My people" (Isaiah 40:1), the
      // verse this family exists for. Restored here on that concrete
      // evidence; it's already correctly kept in lament-repentance too,
      // so it's dual-tagged like several other genuinely dual-sense words.
      'H5162',
      'H4268', 'H4581', 'H6697', 'H2620', 'H982', 'H8575', 'H5117',
      'H4496', 'H5828', 'H5826', 'H6098', 'H7965', 'G3870', 'G3874',
      'G3875', 'G373', 'G372', 'G3309', 'G3308', 'G1977', 'G997',
    ],
  },
  {
    id: 'leadership-calling',
    label: 'Leadership and calling',
    shortLabel: 'Leadership',
    bg: '#dde3f0',
    ink: '#2a3d63',
    strongs: [
      'G4165', 'G4166', 'H7462', 'G750', 'G4245', 'G1985', 'G1249',
      'G1247', 'G652', 'G649', 'G1320', 'G2099', 'G4396', 'G3011',
      'G2564', 'G2821', 'G2525', 'H7121', 'H5057',
    ],
  },
  {
    id: 'money-stewardship',
    label: 'Money, work, and stewardship',
    shortLabel: 'Stewardship',
    bg: '#e6ecdf',
    ink: '#3a4a2b',
    strongs: [
      // Tithe, gift, firstfruits
      'H4643', 'G1181', 'H8641', 'G1435', 'H1061', 'G536',
      // Giving and greed/contentment
      'G1325', 'G4124', 'H2530',
      // Work and diligence vs. laziness
      'G2038', 'G2872', 'G2040', 'H5647', 'G3636', 'H6102',
      // Stewardship/management proper
      'G3623', 'G3622',
      // Wealth, poverty, and provision
      'G2344', 'H6239', 'G4434', 'H34', 'H7646',
    ],
  },
];

export type ModeId = 'stated' | 'promise' | 'warning';

export interface StudyColorMode {
  id: ModeId;
  label: string;
  description: string;
  /** Ink override; 'stated' has none and inherits the family's own ink. */
  ink?: string;
}

export const STUDY_COLOR_MODES: readonly StudyColorMode[] = [
  { id: 'stated', label: 'Stated', description: 'a truth simply stated — teaching, record' },
  { id: 'promise', label: 'Promise & prophecy', description: '"this will be" — a promise or prophecy', ink: '#534ab7' },
  { id: 'warning', label: 'Warning', description: '"take heed" — a warning or judgment', ink: '#a32d2d' },
];

/** Strong's number -> every family it belongs to (a word may legitimately serve more than one theme). */
export const FAMILY_IDS_BY_STRONGS: ReadonlyMap<string, TopicFamilyId[]> = (() => {
  const map = new Map<string, TopicFamilyId[]>();
  for (const family of TOPIC_FAMILIES) {
    for (const strongs of family.strongs) {
      const existing = map.get(strongs);
      if (existing) existing.push(family.id);
      else map.set(strongs, [family.id]);
    }
  }
  return map;
})();

export function getTopicFamily(id: TopicFamilyId): TopicFamily {
  const family = TOPIC_FAMILIES.find((entry) => entry.id === id);
  if (!family) throw new Error(`Unknown Study Colors family: ${id}`);
  return family;
}
