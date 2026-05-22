import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/app/actions/check-in', () => ({
  checkInAction: vi.fn().mockResolvedValue({ freezeApplied: false, graduated: false }),
}));

vi.mock('@/app/actions/archive-habit', () => ({
  archiveHabitAction: vi.fn().mockResolvedValue(undefined),
}));

// Mock next navigation for router
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { CheckInSheet } from './CheckInSheet';

describe('CheckInSheet', () => {
  it('Test 4: renders the trigger button', () => {
    render(<CheckInSheet userHabitId="habit-1" />);
    expect(screen.getByText(/check in/i)).toBeTruthy();
  });

  it('Test 4b: sheet has a radiogroup with Done/Partial/Skip options', async () => {
    const user = userEvent.setup();
    render(<CheckInSheet userHabitId="habit-1" />);

    // Open the sheet
    const triggerBtn = screen.getByText(/check in/i);
    await user.click(triggerBtn);

    // radiogroup should be present
    const radiogroup = document.querySelector('[role="radiogroup"]');
    expect(radiogroup).toBeTruthy();

    // All three options should be present
    expect(screen.getByText('Done')).toBeTruthy();
    expect(screen.getByText('Partial')).toBeTruthy();
    expect(screen.getByText('Skip')).toBeTruthy();
  });

  it('radio buttons have role="radio"', async () => {
    const user = userEvent.setup();
    render(<CheckInSheet userHabitId="habit-1" />);

    await user.click(screen.getByText(/check in/i));

    const radios = document.querySelectorAll('[role="radio"]');
    expect(radios.length).toBe(3);
  });
});
