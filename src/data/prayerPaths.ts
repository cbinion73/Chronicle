// Prayer Paths — guided, Scripture-anchored prayer structures.
//
// A path is data, not code: an ordered sequence of steps, each holding a
// section, an optional instruction, a scripture, a prayer, and optional
// imagery. The Baptist Beads walkthrough was the prototype; it is preserved
// here verbatim as the founding path, and every future guided prayer form
// (Examen, ACTS, Lectio, church-authored paths) is just another PrayerPath.

import { BAPTIST_ROSARY } from './baptistRosary';
import type { StoneKey } from './stoneImages';

export type PathStep = {
  /** 1-based position across the path. */
  index: number;
  /** Visual glyph class for the progress header. */
  kind: 'crucifix' | 'large' | 'small' | 'step';
  section: string;
  /** Framing instruction, usually only on the first step of a section. */
  instruction?: string;
  /** e.g. "Bead 3 of 10" within a decade. */
  positionLabel?: string;
  title: string;
  scriptureRef?: string;
  scriptureText?: string;
  prayerText?: string;
  /** Optional imagery (the Beads' stone photos). */
  imageKey?: StoneKey;
};

export type PrayerPath = {
  id: string;
  name: string;
  subtitle: string;
  /** What a completed step is called in the progress header. */
  stepNoun: string;
  glyph: string;
  estimatedMinutes: number;
  steps: PathStep[];
};

const BAPTIST_BEADS_PATH: PrayerPath = {
  id: 'baptist-beads',
  name: 'Pray the Baptist Beads',
  subtitle: 'A guided walk through all 68 beads — scripture and prayer for each.',
  stepNoun: 'Bead',
  glyph: '✚',
  estimatedMinutes: 25,
  steps: BAPTIST_ROSARY.map((bead) => ({
    index: bead.index,
    kind: bead.beadType,
    section: bead.section,
    instruction: bead.instruction,
    positionLabel: bead.positionLabel,
    title: bead.title,
    scriptureRef: bead.scriptureRef,
    scriptureText: bead.scriptureText,
    prayerText: bead.prayerText,
    imageKey: bead.stoneKey,
  })),
};

const DAILY_EXAMEN_PATH: PrayerPath = {
  id: 'daily-examen',
  name: 'The Daily Examen',
  subtitle: 'Five movements of evening reflection — reviewing the day in God’s presence.',
  stepNoun: 'Movement',
  glyph: '◐',
  estimatedMinutes: 10,
  steps: [
    {
      index: 1,
      kind: 'step',
      section: 'Presence',
      title: 'Become Aware of God’s Presence',
      instruction: 'Be still. Ask God to bring clarity as you look back over the day with Him.',
      scriptureRef: 'Psalm 139:1-2',
      scriptureText: 'O Lord, You have searched me and known me. You know my sitting down and my rising up; You understand my thought afar off.',
      prayerText: 'Lord, You were present in every hour of this day. Quiet my heart now, and help me to see the day as You saw it.',
    },
    {
      index: 2,
      kind: 'step',
      section: 'Gratitude',
      title: 'Review the Day with Gratitude',
      instruction: 'Walk back through the day. Notice the gifts — ordinary and small ones especially.',
      scriptureRef: '1 Thessalonians 5:18',
      scriptureText: 'In everything give thanks; for this is the will of God in Christ Jesus for you.',
      prayerText: 'Thank You, Father, for the specific gifts of this day — the people, the provision, the moments I nearly missed.',
    },
    {
      index: 3,
      kind: 'step',
      section: 'Attention',
      title: 'Pay Attention to Your Emotions',
      instruction: 'Where was there joy, peace, irritation, anxiety? What might God be showing you through what you felt?',
      scriptureRef: 'Psalm 42:5',
      scriptureText: 'Why are you cast down, O my soul? And why are you disquieted within me? Hope in God.',
      prayerText: 'Lord, You know what stirred in me today. Show me what my heart was seeking, and turn it toward You.',
    },
    {
      index: 4,
      kind: 'step',
      section: 'Confession',
      title: 'Face What Went Wrong',
      instruction: 'Choose one moment from the day — a word, a silence, a choice — and bring it honestly before God.',
      scriptureRef: '1 John 1:9',
      scriptureText: 'If we confess our sins, He is faithful and just to forgive us our sins and to cleanse us from all unrighteousness.',
      prayerText: 'Father, I confess where I fell short today. Forgive me, cleanse me, and let me receive Your mercy rather than carry the weight.',
    },
    {
      index: 5,
      kind: 'step',
      section: 'Tomorrow',
      title: 'Look Toward Tomorrow',
      instruction: 'Look at what is coming. Ask for what you will need — and entrust the unknown to God before you sleep.',
      scriptureRef: 'Lamentations 3:22-23',
      scriptureText: 'Through the Lord’s mercies we are not consumed, because His compassions fail not. They are new every morning; great is Your faithfulness.',
      prayerText: 'Lord, tomorrow is Yours before it is mine. Give me what I will need, guard what I cannot control, and let me rest tonight in Your faithfulness. Amen.',
    },
  ],
};

const LORDS_PRAYER_PATH: PrayerPath = {
  id: 'lords-prayer',
  name: 'Pray the Lord’s Prayer',
  subtitle: 'The prayer Jesus taught, prayed slowly — each petition opened and made your own.',
  stepNoun: 'Petition',
  glyph: '♰',
  estimatedMinutes: 12,
  steps: [
    {
      index: 1,
      kind: 'step',
      section: 'Our Father in heaven',
      title: 'Our Father in Heaven',
      instruction: 'Begin with who God is — Father — and who you are: a child, not a beggar at a stranger’s door.',
      scriptureRef: 'Matthew 6:9',
      scriptureText: 'In this manner, therefore, pray: Our Father in heaven, hallowed be Your name.',
      prayerText: 'Father — my Father — thank You that I come to You as a child, welcomed and known. You are in heaven, above all things, and yet You bend to hear me.',
    },
    {
      index: 2,
      kind: 'step',
      section: 'Hallowed be Your name',
      title: 'Hallowed Be Your Name',
      instruction: 'Before asking anything, honor Him. Pray that His name would be treated as holy — starting in your own heart and house.',
      scriptureRef: 'Psalm 115:1',
      scriptureText: 'Not unto us, O Lord, not unto us, but to Your name give glory, because of Your mercy, because of Your truth.',
      prayerText: 'Let Your name be holy in my life today, Lord — in my words, my work, and what I love. Be glorified before You are consulted.',
    },
    {
      index: 3,
      kind: 'step',
      section: 'Your kingdom come',
      title: 'Your Kingdom Come, Your Will Be Done',
      instruction: 'Surrender the day’s agenda. Name the places — in your life and in the world — where you long for His rule.',
      scriptureRef: 'Matthew 6:10',
      scriptureText: 'Your kingdom come. Your will be done on earth as it is in heaven.',
      prayerText: 'King Jesus, rule where I have been ruling. Let Your will be done in my family, my church, my city — and in the decisions in front of me — as it is done in heaven.',
    },
    {
      index: 4,
      kind: 'step',
      section: 'Daily bread',
      title: 'Give Us This Day Our Daily Bread',
      instruction: 'Ask plainly for what you need — today’s needs, not a stockpile. Name them.',
      scriptureRef: 'Philippians 4:19',
      scriptureText: 'And my God shall supply all your need according to His riches in glory by Christ Jesus.',
      prayerText: 'Father, You know what this day requires. Provide what is needed — bread, strength, wisdom, help — and teach me to trust You for tomorrow when tomorrow comes.',
    },
    {
      index: 5,
      kind: 'step',
      section: 'Forgiveness',
      title: 'Forgive Us, As We Forgive',
      instruction: 'Receive forgiveness — then extend it. Bring to mind anyone you are holding a debt against.',
      scriptureRef: 'Matthew 6:14',
      scriptureText: 'For if you forgive men their trespasses, your heavenly Father will also forgive you.',
      prayerText: 'Forgive my sins, Lord — the ones I know and the ones I hide. And give me the grace to release those who have wounded me, as You have released me.',
    },
    {
      index: 6,
      kind: 'step',
      section: 'Deliverance',
      title: 'Lead Us Not into Temptation',
      instruction: 'Be honest about where you are weak. Ask for protection before the moment of testing, not after.',
      scriptureRef: '1 Corinthians 10:13',
      scriptureText: 'God is faithful, who will not allow you to be tempted beyond what you are able, but with the temptation will also make the way of escape.',
      prayerText: 'Father, You know where I am weakest. Keep me from the paths where I fall, deliver me from the evil one, and make the way of escape plain when testing comes.',
    },
    {
      index: 7,
      kind: 'step',
      section: 'Doxology',
      title: 'Yours Is the Kingdom',
      instruction: 'End where you began — in worship. The prayer closes not with your needs but with His glory.',
      scriptureRef: 'Matthew 6:13',
      scriptureText: 'For Yours is the kingdom and the power and the glory forever. Amen.',
      prayerText: 'Yours is the kingdom, Lord — not mine. Yours is the power — not mine. Yours is the glory, forever. I leave this prayer in Your hands, and I go into the day with You. Amen.',
    },
  ],
};

export const PRAYER_PATHS: PrayerPath[] = [
  BAPTIST_BEADS_PATH,
  LORDS_PRAYER_PATH,
  DAILY_EXAMEN_PATH,
];

export function getPrayerPath(id: string): PrayerPath | undefined {
  return PRAYER_PATHS.find((path) => path.id === id);
}
