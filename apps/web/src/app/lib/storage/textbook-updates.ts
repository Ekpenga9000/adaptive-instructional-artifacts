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

/** Number of notes saved or changed after `lastSeen`. */
export function countTextbookUpdates(units: InstructionalUnit[], lastSeen: number): number {
  return units.filter((unit) => isCountable(unit) && unitActivityTimestamp(unit) > lastSeen).length;
}

/** The most recently saved or changed notes, newest first. */
export function latestTextbookUnits(units: InstructionalUnit[], limit = 5): InstructionalUnit[] {
  return units
    .filter(isCountable)
    .sort((a, b) => unitActivityTimestamp(b) - unitActivityTimestamp(a))
    .slice(0, limit);
}

export function getTextbookLastSeen(learnerId: string): number | null {
  try {
    const raw = localStorage.getItem(`${LAST_SEEN_PREFIX}${learnerId}`);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function markTextbookSeen(learnerId: string, at: number = Date.now()): void {
  try {
    localStorage.setItem(`${LAST_SEEN_PREFIX}${learnerId}`, String(at));
  } catch {
    // Private mode or full storage: the counter simply keeps showing.
  }
}
