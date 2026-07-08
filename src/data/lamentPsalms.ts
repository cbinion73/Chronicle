// Lament (VISION.md covenant #3): "the Psalms are roughly forty percent
// lament and no product has a lament mode." A short, curated set of
// lament-psalm openings — not the whole psalm, just enough to give the
// room its shape before the keeper writes their own words. Rotated by
// day of week, the same pattern as the Office's CALLS array.

export interface LamentPsalm {
  text: string;
  ref: string;
}

export const LAMENT_PSALMS: LamentPsalm[] = [
  { text: 'How long, O Lord? Will You forget me forever? How long will You hide Your face from me?', ref: 'Psalm 13:1' },
  { text: 'My God, my God, why have You forsaken me? Why are You so far from helping Me?', ref: 'Psalm 22:1' },
  { text: 'Out of the depths I have cried to You, O Lord; Lord, hear my voice!', ref: 'Psalm 130:1-2' },
  { text: 'Hear my prayer, O Lord, and let my cry come to You. Do not hide Your face from me in the day of my trouble.', ref: 'Psalm 102:1-2' },
  { text: 'I am weary with my groaning; all night I make my bed swim; I drench my couch with my tears.', ref: 'Psalm 6:6' },
  { text: 'Why do You stand afar off, O Lord? Why do You hide in times of trouble?', ref: 'Psalm 10:1' },
  { text: 'How long will You forget me, O Lord? Forever? How long will You hide Your face from me?', ref: 'Psalm 13:1' },
];

export function lamentPsalmOfTheDay(date: Date = new Date()): LamentPsalm {
  return LAMENT_PSALMS[date.getDay()];
}
