import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InstructionalUnit } from '../../types';
import { TextbookUpdatesButton } from './TextbookUpdatesButton';

const mocks = vi.hoisted(() => ({ getTextbook: vi.fn() }));

vi.mock('../../lib/storage', () => ({
  storage: { getTextbook: mocks.getTextbook },
  subscribeToSync: () => () => undefined,
}));

function note(id: string, added: number): InstructionalUnit {
  return {
    id,
    type: 'explanation',
    conceptId: 'select-basic',
    title: `Note ${id}`,
    content: 'x',
    prerequisites: [],
    addedTimestamp: added,
    sourceInteractionIds: [],
  };
}

function renderButton() {
  return render(
    <MemoryRouter>
      <TextbookUpdatesButton learnerId="learner-1" />
    </MemoryRouter>,
  );
}

describe('TextbookUpdatesButton', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.getTextbook.mockReset();
  });

  it('starts with no badge and does not count notes saved before the first look', () => {
    mocks.getTextbook.mockReturnValue([note('old', 1)]);
    renderButton();
    expect(screen.queryByTestId('textbook-updates-badge')).toBeNull();
  });

  it('shows a counter for notes saved after the last look', () => {
    localStorage.setItem('sql-adapt-textbook-last-seen:learner-1', '100');
    mocks.getTextbook.mockReturnValue([note('a', 200), note('b', 300), note('old', 50)]);
    renderButton();
    expect(screen.getByTestId('textbook-updates-badge').textContent).toBe('2');
    expect(screen.getByRole('button', { name: /2 new updates/i })).toBeTruthy();
  });

  it('opens a quick view and clears the counter', async () => {
    const user = userEvent.setup();
    localStorage.setItem('sql-adapt-textbook-last-seen:learner-1', '100');
    mocks.getTextbook.mockReturnValue([note('a', 200)]);
    renderButton();

    await user.click(screen.getByTestId('textbook-updates-button'));

    expect(screen.getByTestId('textbook-updates-panel').textContent).toContain('Note a');
    expect(screen.getByTestId('textbook-updates-open')).toBeTruthy();
    expect(screen.queryByTestId('textbook-updates-badge')).toBeNull();
  });
});
