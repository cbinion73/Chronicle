// The Hours — Chronicle keeps liturgical time (VISION.md, Design Language #3).
// The register is the app's current tone of day: morning, midday, or evening.
// It is exposed as a data attribute on the document root (mirroring the
// data-theme pattern) so tokens.css can re-tone the ground, and consumed
// directly by surfaces that reshape with the hour (the Daily Office).

export type Register = 'morning' | 'midday' | 'evening';

// Test/dev hook: a localStorage override pins the register regardless of the
// wall clock, so Playwright runs are deterministic at any hour.
export const REGISTER_OVERRIDE_KEY = 'chronicle.register.override';

export function deriveRegister(date: Date): Register {
  const hour = date.getHours();
  if (hour >= 4 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'midday';
  return 'evening';
}

export function currentRegister(now: Date = new Date()): Register {
  try {
    const override = localStorage.getItem(REGISTER_OVERRIDE_KEY);
    if (override === 'morning' || override === 'midday' || override === 'evening') {
      return override;
    }
  } catch { /* localStorage unavailable */ }
  return deriveRegister(now);
}
