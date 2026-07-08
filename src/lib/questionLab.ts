// The Question Lab (VISION.md covenant #3 / ROADMAP M17): open questions
// held with the same dignity as answered prayers, open for decades if
// need be. Pure derivation only — no AI.

export function daysOpen(dateAdded: string, today: Date = new Date()): number {
  return Math.max(0, Math.round(
    (today.getTime() - new Date(`${dateAdded}T12:00:00`).getTime()) / 86400000,
  ));
}

export function formatOpenDuration(days: number): string {
  if (days <= 0) return 'asked today';
  if (days === 1) return 'open 1 day';
  if (days < 30) return `open ${days} days`;
  if (days < 365) {
    const months = Math.round(days / 30);
    return `open ${months} month${months === 1 ? '' : 's'}`;
  }
  const years = Math.floor(days / 365);
  const remainingMonths = Math.round((days % 365) / 30);
  const yearPart = `${years} year${years === 1 ? '' : 's'}`;
  return remainingMonths > 0
    ? `open ${yearPart}, ${remainingMonths} month${remainingMonths === 1 ? '' : 's'}`
    : `open ${yearPart}`;
}
