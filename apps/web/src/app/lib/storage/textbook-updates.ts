/**
 * Helpers for the "My Textbook" update counter in the navigation bar.
 *
 * An update is a saved or changed note. We compare each note's last activity
 * time with the time the learner last looked at their textbook.
 */
import type { InstructionalUnit } from '../../types';

const LAST_SEEN_PREFIX = 'sql-adapt-textbook-last-seen:';

/** Window event other code can fire right after a note is saved. */
export const TEXTBOOK_CHANGED_EVENT = 'sql-adapt-textbook-changed';

export function unitActivityTimestamp(unit: Pick<InstructionalUnit, 'addedTimestamp' | 'updatedTimestamp'>): number {
  return Math.max(unit.addedTimestamp ?? 0, unit.updatedTimestamp ?? 0);
}

function isCountable(unit: InstructionalUnit): boolean {
  return unit.status !== 'archived';
}

/**
 * What the learner has already looked at: note id -> the activity time the
 * learner saw. Comparing per note (not against a clock time) means a clock that
 * runs behind the server cannot leave the counter stuck.
 */
export type SeenVersions = Record<string, number>;

/** True when the note is new, or changed since the learner last saw it. */
export function isUnitUnseen(unit: InstructionalUnit, seen: SeenVersions): boolean {
  if (!isCountable(unit)) return false;
  const seenAt = seen[unit.id];
  return seenAt === undefined || unitActivityTimestamp(unit) > seenAt;
}

/** Number of notes the learner has not looked at yet. */
export function countTextbookUpdates(units: InstructionalUnit[], seen: SeenVersions): number {
  return units.filter((unit) => isUnitUnseen(unit, seen)).length;
}

/** The most recently saved or changed notes, newest first. */
export function latestTextbookUnits(units: InstructionalUnit[], limit = 5): InstructionalUnit[] {
  return units
    .filter(isCountable)
    .sort((a, b) => unitActivityTimestamp(b) - unitActivityTimestamp(a))
    .slice(0, limit);
}

const SEEN_PREFIX = 'sql-adapt-textbook-seen:';

/** Saved "seen" record for a learner, or null if they have never had one. */
export function getSeenVersions(learnerId: string): SeenVersions | null {
  try {
    const raw = localStorage.getItem(`${SEEN_PREFIX}${learnerId}`);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const result: SeenVersions = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'number' && Number.isFinite(value)) result[id] = value;
    }
    return result;
  } catch {
    return null;
  }
}

function saveSeenVersions(learnerId: string, seen: SeenVersions): void {
  try {
    localStorage.setItem(`${SEEN_PREFIX}${learnerId}`, JSON.stringify(seen));
  } catch {
    // Private mode or full storage: the counter simply keeps showing.
  }
}

/** Mark the given notes as seen, keeping what was already seen. Returns the new record. */
export function markUnitsSeen(learnerId: string, units: InstructionalUnit[]): SeenVersions {
  const seen = { ...(getSeenVersions(learnerId) ?? {}) };
  for (const unit of units) {
    seen[unit.id] = Math.max(seen[unit.id] ?? 0, unitActivityTimestamp(unit));
  }
  saveSeenVersions(learnerId, seen);
  return seen;
}
