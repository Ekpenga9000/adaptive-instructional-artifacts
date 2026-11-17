import { beforeEach, describe, expect, it } from 'vitest';
import type { InstructionalUnit } from '../../types';
import {
  countTextbookUpdates,
  getTextbookLastSeen,
  latestTextbookUnits,
  markTextbookSeen,
  unitActivityTimestamp,
} from './textbook-updates';

function unit(id: string, added: number, updated?: number, status?: InstructionalUnit['status']): InstructionalUnit {
  return {
    id,
    type: 'explanation',
    conceptId: 'select-basic',
    title: `Note ${id}`,
    content: 'x',
    prerequisites: [],
    addedTimestamp: added,
    updatedTimestamp: updated,
    sourceInteractionIds: [],
    status,
  };
}

describe('textbook update counter helpers', () => {
  beforeEach(() => localStorage.clear());

  it('uses the later of added and updated time', () => {
    expect(unitActivityTimestamp(unit('a', 10, 50))).toBe(50);
    expect(unitActivityTimestamp(unit('b', 70))).toBe(70);
  });

  it('counts new and changed notes after the last look, not older ones', () => {
    const units = [unit('old', 10), unit('new', 200), unit('changed', 10, 300)];
    expect(countTextbookUpdates(units, 100)).toBe(2);
    expect(countTextbookUpdates(units, 300)).toBe(0);
  });

  it('does not count archived notes', () => {
    expect(countTextbookUpdates([unit('gone', 500, undefined, 'archived')], 100)).toBe(0);
  });

  it('returns the newest notes first', () => {
    const latest = latestTextbookUnits([unit('a', 1), unit('b', 3), unit('c', 2)], 2);
    expect(latest.map((u) => u.id)).toEqual(['b', 'c']);
  });

  it('remembers the last look per learner', () => {
    expect(getTextbookLastSeen('learner-1')).toBeNull();
    markTextbookSeen('learner-1', 1234);
    expect(getTextbookLastSeen('learner-1')).toBe(1234);
    expect(getTextbookLastSeen('learner-2')).toBeNull();
  });
});
