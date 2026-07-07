// Shared between the Daily Office and Chapel mode — a quiet, day-based
// verse source with no network dependency.

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
];

export function callOfTheDay(date: Date = new Date()): CallToWorship {
  return CALLS[date.getDay()];
}
