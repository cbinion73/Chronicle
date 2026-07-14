import {
  CANONICAL_BOOKS,
  DAILY_SCRIPTURE_PLANS,
  DEFAULT_DAILY_SCRIPTURE_PLAN_ID,
  type DailyScripturePlan,
  type DailyScripturePlanId,
} from '../data/dailyScripturePlans';

export interface DailyScriptureAnchor {
  startDate: string;
  updatedAt: string;
}

export interface DailyScriptureState {
  selectedPlanId: DailyScripturePlanId;
  anchors: Partial<Record<DailyScripturePlanId, DailyScriptureAnchor>>;
  updatedAt: string;
}

export interface ResolvedDailyScripture {
  plan: DailyScripturePlan;
  day: number;
  cycle: number;
  references: string[];
  anchor: DailyScriptureAnchor;
}

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateAtLocalNoon(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function isValidTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

const UNSET_PREFERENCE_TIMESTAMP = '1970-01-01T00:00:00.000Z';
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

function normalizedTimestamp(value: unknown, fallback = UNSET_PREFERENCE_TIMESTAMP): string {
  if (!isValidTimestamp(value)) return fallback;
  const parsed = Date.parse(value);
  return parsed > Date.now() + MAX_CLOCK_SKEW_MS ? new Date().toISOString() : new Date(parsed).toISOString();
}

export function isValidLocalDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = dateAtLocalNoon(value);
  return Number.isFinite(date.getTime()) && localDateKey(date) === value;
}

function isValidAnchor(value: unknown): value is DailyScriptureAnchor {
  if (!value || typeof value !== 'object') return false;
  const anchor = value as Partial<DailyScriptureAnchor>;
  return isValidLocalDateKey(anchor.startDate) && isValidTimestamp(anchor.updatedAt);
}

function isPlanId(value: unknown): value is DailyScripturePlanId {
  return typeof value === 'string' && Object.hasOwn(DAILY_SCRIPTURE_PLANS, value);
}

export function localCalendarDayDifference(from: string, to: string): number {
  const start = dateAtLocalNoon(from);
  const end = dateAtLocalNoon(to);
  const startUtcDay = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtcDay = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.floor((endUtcDay - startUtcDay) / 86_400_000);
}

function calendarYearStart(today: string): string {
  const date = isValidLocalDateKey(today) ? dateAtLocalNoon(today) : new Date();
  return `${date.getFullYear()}-01-01`;
}

export function calendarPlanDay(today = localDateKey()): number {
  const safeToday = isValidLocalDateKey(today) ? today : localDateKey();
  const date = dateAtLocalNoon(safeToday);
  const rawDay = localCalendarDayDifference(`${date.getFullYear()}-01-01`, safeToday) + 1;
  const isLeapYear = new Date(date.getFullYear(), 1, 29).getMonth() === 1;
  const afterFebruary28 = date.getMonth() > 1 || (date.getMonth() === 1 && date.getDate() === 29);
  return Math.min(365, Math.max(1, rawDay - (isLeapYear && afterFebruary28 ? 1 : 0)));
}

export function createDefaultDailyScriptureState(today = localDateKey(), updatedAt = UNSET_PREFERENCE_TIMESTAMP): DailyScriptureState {
  const startDate = updatedAt === UNSET_PREFERENCE_TIMESTAMP ? '1970-01-01' : calendarYearStart(today);
  return {
    selectedPlanId: DEFAULT_DAILY_SCRIPTURE_PLAN_ID,
    anchors: { [DEFAULT_DAILY_SCRIPTURE_PLAN_ID]: { startDate, updatedAt } },
    updatedAt,
  };
}

export function normalizeDailyScriptureState(
  value: unknown,
  _legacy?: { currentPlanName?: unknown; currentPlanDay?: unknown },
  today = localDateKey(),
): DailyScriptureState {
  const raw = value && typeof value === 'object' ? value as Partial<DailyScriptureState> : {};
  const selectedPlanId = isPlanId(raw.selectedPlanId)
    ? raw.selectedPlanId
    : DEFAULT_DAILY_SCRIPTURE_PLAN_ID;
  const anchors: DailyScriptureState['anchors'] = {};
  if (raw.anchors && typeof raw.anchors === 'object') {
    for (const planId of Object.keys(DAILY_SCRIPTURE_PLANS) as DailyScripturePlanId[]) {
      const anchor = raw.anchors[planId];
      if (isValidAnchor(anchor)) anchors[planId] = { ...anchor, updatedAt: normalizedTimestamp(anchor.updatedAt) };
    }
  }
  if (!anchors[selectedPlanId]) {
    const migratedAt = _legacy?.currentPlanName ? new Date().toISOString() : UNSET_PREFERENCE_TIMESTAMP;
    anchors[selectedPlanId] = { startDate: migratedAt === UNSET_PREFERENCE_TIMESTAMP ? '1970-01-01' : calendarYearStart(today), updatedAt: migratedAt };
  }
  return { selectedPlanId, anchors, updatedAt: normalizedTimestamp(raw.updatedAt, anchors[selectedPlanId]?.updatedAt) };
}

export function selectDailyScripturePlan(
  state: DailyScriptureState,
  planId: DailyScripturePlanId,
  today = localDateKey(),
  updatedAt = new Date().toISOString(),
): DailyScriptureState {
  return {
    selectedPlanId: planId,
    anchors: {
      ...state.anchors,
      [planId]: state.anchors[planId]
        ? { ...state.anchors[planId], startDate: calendarYearStart(today), updatedAt }
        : { startDate: calendarYearStart(today), updatedAt },
    },
    updatedAt,
  };
}

export function mergeDailyScriptureStates(
  localValue: unknown,
  incomingValue: unknown,
  today = localDateKey(),
): DailyScriptureState {
  const local = normalizeDailyScriptureState(localValue, undefined, today);
  const incomingRaw = incomingValue && typeof incomingValue === 'object'
    ? incomingValue as Partial<DailyScriptureState>
    : null;
  if (!incomingRaw || !isValidTimestamp(incomingRaw.updatedAt)) return local;
  const incoming = normalizeDailyScriptureState(incomingRaw, undefined, today);
  const anchors: DailyScriptureState['anchors'] = {};
  for (const planId of Object.keys(DAILY_SCRIPTURE_PLANS) as DailyScripturePlanId[]) {
    const localAnchor = local.anchors[planId];
    const incomingAnchor = incomingRaw.anchors?.[planId];
    const incomingAnchorWins = isValidAnchor(incomingAnchor) && (!localAnchor
      || Date.parse(normalizedTimestamp(incomingAnchor.updatedAt)) > Date.parse(localAnchor.updatedAt)
      || (Date.parse(normalizedTimestamp(incomingAnchor.updatedAt)) === Date.parse(localAnchor.updatedAt) && incomingAnchor.startDate.localeCompare(localAnchor.startDate) > 0));
    if (incomingAnchorWins && isValidAnchor(incomingAnchor)) {
      anchors[planId] = { ...incomingAnchor, updatedAt: normalizedTimestamp(incomingAnchor.updatedAt) };
    } else if (localAnchor) {
      anchors[planId] = localAnchor;
    }
  }
  const incomingSelectionAnchor = incomingRaw.selectedPlanId && incomingRaw.anchors
    ? incomingRaw.anchors[incomingRaw.selectedPlanId]
    : undefined;
  const incomingSelectionValid = Boolean(
    incomingRaw.selectedPlanId
    && isPlanId(incomingRaw.selectedPlanId)
    && isValidAnchor(incomingSelectionAnchor),
  );
  const incomingTime = Date.parse(incoming.updatedAt);
  const localTime = Date.parse(local.updatedAt);
  const incomingWins = incomingSelectionValid && (
    incomingTime > localTime
    || (incomingTime === localTime && incoming.selectedPlanId.localeCompare(local.selectedPlanId) > 0)
  );
  const selectedPlanId = incomingWins ? incoming.selectedPlanId : local.selectedPlanId;
  if (!anchors[selectedPlanId]) anchors[selectedPlanId] = { startDate: calendarYearStart(today), updatedAt: incomingWins ? incoming.updatedAt : local.updatedAt };
  return {
    selectedPlanId,
    anchors,
    updatedAt: incomingWins ? incoming.updatedAt : local.updatedAt,
  };
}

export function resolveDailyScripture(
  state: DailyScriptureState,
  today = localDateKey(),
): ResolvedDailyScripture {
  const requestedPlan = DAILY_SCRIPTURE_PLANS[state.selectedPlanId];
  const planIsValid = requestedPlan && validateDailyScripturePlan(requestedPlan).valid;
  const plan = planIsValid ? requestedPlan : DAILY_SCRIPTURE_PLANS[DEFAULT_DAILY_SCRIPTURE_PLAN_ID];
  if (!planIsValid) {
    const anchor = { startDate: calendarYearStart(today), updatedAt: state.updatedAt };
    return { plan, day: 1, cycle: 1, references: plan.days[0].readings.map((reading) => reading.reference), anchor };
  }
  const day = calendarPlanDay(today);
  const anchor = { startDate: calendarYearStart(today), updatedAt: state.updatedAt };
  return { plan, day, cycle: 1, references: plan.days[day - 1].readings.map((reading) => reading.reference), anchor };
}

export function validateDailyScripturePlan(plan: DailyScripturePlan) {
  const expected = new Set(CANONICAL_BOOKS.flatMap(([book, count]) =>
    Array.from({ length: count }, (_, index) => `${book} ${index + 1}`)));
  const actual = plan.days.flatMap((day) => day.readings.map((reading) => reading.reference));
  const counts = new Map<string, number>();
  actual.forEach((reference) => counts.set(reference, (counts.get(reference) || 0) + 1));
  const missing = [...expected].filter((reference) => !counts.has(reference));
  const duplicates = [...counts].filter(([, count]) => count !== 1).map(([reference]) => reference);
  const structurallyValid = plan.days.length === 365 && plan.days.every((day, index) =>
    day.day === index + 1
    && day.readings.length > 0
    && day.readings.every((reading) => reading.reference === `${reading.book} ${reading.chapter}` && expected.has(reading.reference)));
  return { valid: structurallyValid && actual.length === 1189 && missing.length === 0 && duplicates.length === 0, missing, duplicates };
}
