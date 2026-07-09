// Shared between the Daily Office and Chapel mode — a quiet, day-based
// verse source with no network dependency.
//
// The first 7 entries are load-bearing: Office.tsx indexes this array
// directly by weekday (`CALLS[date.getDay()]`), so their order must
// stay exactly as-is. Everything after that is Chapel's own larger
// pool — a curated set of short, well-known stillness/rest/light
// verses for the room's random-cycling contemplative view (see
// randomCall below), not used by weekday indexing.

export interface CallToWorship {
  text: string;
  ref: string;
}

export const CALLS: CallToWorship[] = [
  { text: 'This is the day the Lord has made; we will rejoice and be glad in it.', ref: 'Psalm 118:24' },
  { text: 'O God, You are my God; early will I seek You; my soul thirsts for You.', ref: 'Psalm 63:1' },
  { text: 'Enter into His gates with thanksgiving, and into His courts with praise.', ref: 'Psalm 100:4' },
  { text: 'My voice You shall hear in the morning, O Lord; in the morning I will direct it to You.', ref: 'Psalm 5:3' },
  { text: 'Be still, and know that I am God.', ref: 'Psalm 46:10' },
  { text: 'Oh, taste and see that the Lord is good; blessed is the man who trusts in Him!', ref: 'Psalm 34:8' },
  { text: 'Cause me to hear Your lovingkindness in the morning, for in You do I trust.', ref: 'Psalm 143:8' },

  // Chapel's extended pool — stillness, rest, light, and quiet trust,
  // for the room's contemplative cycling. Kept to single short clauses,
  // matching the voice of the seven above.
  { text: 'God is our refuge and strength, a very present help in trouble.', ref: 'Psalm 46:1' },
  { text: 'The Lord is my shepherd; I shall not want.', ref: 'Psalm 23:1' },
  { text: 'The Lord is my light and my salvation; whom shall I fear?', ref: 'Psalm 27:1' },
  { text: 'Rest in the Lord, and wait patiently for Him.', ref: 'Psalm 37:7' },
  { text: 'Truly my soul silently waits for God; from Him comes my salvation.', ref: 'Psalm 62:1' },
  { text: 'He who dwells in the secret place of the Most High shall abide under the shadow of the Almighty.', ref: 'Psalm 91:1' },
  { text: 'Your word is a lamp to my feet and a light to my path.', ref: 'Psalm 119:105' },
  { text: 'I wait for the Lord, my soul waits, and in His word I do hope.', ref: 'Psalm 130:5' },
  { text: 'Surely I have calmed and quieted my soul, like a weaned child with his mother.', ref: 'Psalm 131:2' },
  { text: 'You will keep him in perfect peace, whose mind is stayed on You, because he trusts in You.', ref: 'Isaiah 26:3' },
  { text: 'In quietness and confidence shall be your strength.', ref: 'Isaiah 30:15' },
  { text: 'Those who wait on the Lord shall renew their strength; they shall mount up with wings like eagles.', ref: 'Isaiah 40:31' },
  { text: 'The Lord is good to those who wait for Him, to the soul who seeks Him.', ref: 'Lamentations 3:25' },
  { text: 'The Lord is in His holy temple. Let all the earth keep silence before Him.', ref: 'Habakkuk 2:20' },
  { text: 'He will quiet you with His love; He will rejoice over you with singing.', ref: 'Zephaniah 3:17' },
  { text: 'Come to Me, all you who labor and are heavy laden, and I will give you rest.', ref: 'Matthew 11:28' },
  { text: 'Do not worry about tomorrow, for tomorrow will worry about its own things.', ref: 'Matthew 6:34' },
  { text: 'Peace I leave with you, My peace I give to you; let not your heart be troubled.', ref: 'John 14:27' },
  { text: 'And the light shines in the darkness, and the darkness did not comprehend it.', ref: 'John 1:5' },
  { text: 'Be anxious for nothing, but in everything, by prayer and supplication, with thanksgiving, let your requests be made known to God.', ref: 'Philippians 4:6' },
  { text: 'And the peace of God, which surpasses all understanding, will guard your hearts and minds through Christ Jesus.', ref: 'Philippians 4:7' },
  { text: 'God, who commanded light to shine out of darkness, has shone in our hearts to give the light of the knowledge of the glory of God.', ref: '2 Corinthians 4:6' },
  { text: 'And after the fire a still small voice.', ref: '1 Kings 19:12' },
  { text: 'The Lord will fight for you, and you shall hold your peace.', ref: 'Exodus 14:14' },
];

export function callOfTheDay(date: Date = new Date()): CallToWorship {
  return CALLS[date.getDay()];
}

// A random verse from the full pool, for Chapel's contemplative
// cycling — optionally excluding the currently-shown reference so
// consecutive picks don't repeat.
export function randomCall(excludeRef?: string): CallToWorship {
  const pool = excludeRef ? CALLS.filter((call) => call.ref !== excludeRef) : CALLS;
  const source = pool.length > 0 ? pool : CALLS;
  return source[Math.floor(Math.random() * source.length)];
}
