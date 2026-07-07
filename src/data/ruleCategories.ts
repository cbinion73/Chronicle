// The Rule of Life's curated vocabulary (VISION.md — the Live pillar's
// flagship). A short, fixed list — not free text — so a Rule reads as a
// recognizable shape, the way historic rules of life always have:
// prayer, Scripture, Sabbath, service, generosity, calling.

export interface RuleCategory {
  id: string;
  label: string;
  icon: string;
}

export const RULE_CATEGORIES: RuleCategory[] = [
  { id: 'prayer', label: 'Prayer', icon: '🙏' },
  { id: 'scripture', label: 'Scripture', icon: '📖' },
  { id: 'sabbath', label: 'Sabbath', icon: '🕊️' },
  { id: 'service', label: 'Service', icon: '🤝' },
  { id: 'generosity', label: 'Generosity', icon: '🌾' },
  { id: 'calling', label: 'Calling', icon: '🧭' },
];

export function getRuleCategory(id: string | undefined): RuleCategory {
  return RULE_CATEGORIES.find((category) => category.id === id) || RULE_CATEGORIES[RULE_CATEGORIES.length - 1];
}
