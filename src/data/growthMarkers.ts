// Growth Marker kinds — the curated vocabulary for spiritual milestones.
// A short, fixed list (not free text) so the Growth spine reads as a
// recognizable shape at a glance rather than a wall of one-off labels.

export interface GrowthMarkerKind {
  id: string;
  label: string;
  icon: string;
}

export const GROWTH_MARKER_KINDS: GrowthMarkerKind[] = [
  { id: 'baptism', label: 'Baptism', icon: '💧' },
  { id: 'calling', label: 'Calling Clarified', icon: '🧭' },
  { id: 'conviction', label: 'Conviction', icon: '⚡' },
  { id: 'breakthrough', label: 'Breakthrough', icon: '🌅' },
  { id: 'commitment', label: 'Commitment Made', icon: '🤝' },
  { id: 'season-closed', label: 'Season of Doubt Resolved', icon: '🕯️' },
  { id: 'other', label: 'Other', icon: '✳️' },
];

export function getGrowthMarkerKind(id: string | undefined): GrowthMarkerKind {
  return GROWTH_MARKER_KINDS.find((kind) => kind.id === id) || GROWTH_MARKER_KINDS[GROWTH_MARKER_KINDS.length - 1];
}
