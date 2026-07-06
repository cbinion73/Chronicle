// Stone bead photos, mapped to the "Mapping Stone Meanings to Prayers" table in
// the source document. Each bead in baptistRosary.ts references one of these
// keys via `stoneKey`.

import agate from '../assets/stones/agate.webp';
import amethyst from '../assets/stones/amethyst.webp';
import beryl from '../assets/stones/beryl.webp';
import carbuncle from '../assets/stones/carbuncle.webp';
import centerpiece from '../assets/stones/centerpiece.webp';
import diamond from '../assets/stones/diamond.webp';
import emerald from '../assets/stones/emerald.webp';
import gold from '../assets/stones/gold.webp';
import jasper from '../assets/stones/jasper.webp';
import largeCross from '../assets/stones/large-cross.webp';
import onyx from '../assets/stones/onyx.webp';
import ruby from '../assets/stones/ruby.webp';
import sapphire from '../assets/stones/sapphire.webp';
import silverCross from '../assets/stones/silver-cross.webp';
import topaz from '../assets/stones/topaz.webp';

export type StoneKey =
  | 'agate' | 'amethyst' | 'beryl' | 'carbuncle' | 'centerpiece' | 'diamond'
  | 'emerald' | 'gold' | 'jasper' | 'large-cross' | 'onyx' | 'ruby'
  | 'sapphire' | 'silver-cross' | 'topaz';

export const STONE_IMAGES: Record<StoneKey, string> = {
  agate,
  amethyst,
  beryl,
  carbuncle,
  centerpiece,
  diamond,
  emerald,
  gold,
  jasper,
  'large-cross': largeCross,
  onyx,
  ruby,
  sapphire,
  'silver-cross': silverCross,
  topaz,
};

export const STONE_LABELS: Record<StoneKey, string> = {
  agate: 'Agate',
  amethyst: 'Amethyst',
  beryl: 'Beryl',
  carbuncle: 'Carbuncle',
  centerpiece: 'Centerpiece',
  diamond: 'Diamond',
  emerald: 'Emerald',
  gold: 'Gold',
  jasper: 'Jasper',
  'large-cross': 'Crucifix',
  onyx: 'Onyx',
  ruby: 'Ruby',
  sapphire: 'Sapphire',
  'silver-cross': 'Silver Cross',
  topaz: 'Topaz',
};
