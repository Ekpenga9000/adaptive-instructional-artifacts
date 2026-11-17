import { useCallback, useEffect, useState } from 'react';

import { storage, subscribeToSync } from '../lib/storage';
import {
  TEXTBOOK_CHANGED_EVENT,
  countTextbookUpdates,
  getTextbookLastSeen,
  latestTextbookUnits,
  markTextbookSeen,
} from '../lib/storage/textbook-updates';
import type { InstructionalUnit } from '../types';

const POLL_MS = 2500;

export interface TextbookUpdatesState {
  /** Notes saved or changed since the learner last looked. */
  count: number;
  /** Newest notes first. */
  recent: InstructionalUnit[];
  /** Time the learner last looked (0 if never). */
  lastSeen: number;
  /** Mark everything as seen. Returns the previous last-seen time. */
  markSeen: () => number;
}

/**
 * Tracks new or changed My Textbook notes for the navigation bar counter.
 * The first time it runs for a learner it sets a starting point, so old notes
 * do not show up as new.
 */
export function useTextbookUpdates(learnerId: string | undefined): TextbookUpdatesState {
  const [state, setState] = useState<{ count: number; recent: InstructionalUnit[]; lastSeen: number }>({
    count: 0,
    recent: [],
    lastSeen: 0,
  });

  const refresh = useCallback(() => {
    if (!learnerId) {
      setState({ count: 0, recent: [], lastSeen: 0 });
      return;
    }
    let lastSeen = getTextbookLastSeen(learnerId);
    if (lastSeen === null) {
      lastSeen = Date.now();
      markTextbookSeen(learnerId, lastSeen);
    }
    let units: InstructionalUnit[] = [];
    try {
      units = storage.getTextbook(learnerId) ?? [];
    } catch {
      units = [];
    }
    const count = countTextbookUpdates(units, lastSeen);
    const recent = latestTextbookUnits(units, 5);
    setState((prev) =>
      prev.count === count &&
      prev.lastSeen === lastSeen &&
      prev.recent.length === recent.length &&
      prev.recent.every((unit, index) => unit.id === recent[index].id && unit.updatedTimestamp === recent[index].updatedTimestamp)
        ? prev
        : { count, recent, lastSeen: lastSeen as number },
    );
  }, [learnerId]);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', refresh);
    window.addEventListener(TEXTBOOK_CHANGED_EVENT, refresh);
    document.addEventListener('visibilitychange', onVisible);
    const unsubscribe = subscribeToSync((key) => {
      if (key === 'sql-adapt-textbook') refresh();
    });
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      window.removeEventListener(TEXTBOOK_CHANGED_EVENT, refresh);
      document.removeEventListener('visibilitychange', onVisible);
      unsubscribe();
    };
  }, [refresh]);

  const markSeen = useCallback(() => {
    const previous = state.lastSeen;
    if (learnerId) {
      markTextbookSeen(learnerId);
      refresh();
    }
    return previous;
  }, [learnerId, refresh, state.lastSeen]);

  return { ...state, markSeen };
}
