/**
 * Tests for interview surface components.
 * Task 1: Interview UI — chips, progress dots, domain badge, free-text gate.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProgressDots } from './ProgressDots';
import { DomainBadge } from './DomainBadge';
import { ChoiceChips } from './ChoiceChips';
import { TellMeMore } from './TellMeMore';
import { extractTurnOutput } from './extractTurnOutput';
import type { UIMessage } from 'ai';
import type { InterviewTurnOutput } from '@cited/core';

// ─── extractTurnOutput ────────────────────────────────────────────────────────

const validTurnOutput: InterviewTurnOutput = {
  questionText: 'How many hours of sleep do you typically get?',
  choices: [
    { id: 'c1', label: 'Less than 6 hours' },
    { id: 'c2', label: '6–7 hours' },
    { id: 'c3', label: '7–8 hours' },
    { id: 'c4', label: 'More than 8 hours' },
  ],
  domain: 'sleep',
  citedClipIds: [],
  doneSignal: false,
};

describe('extractTurnOutput', () => {
  it('returns null when message is undefined', () => {
    expect(extractTurnOutput(undefined)).toBeNull();
  });

  it('returns null when message has no parts', () => {
    const msg = { role: 'assistant', parts: [], id: '1', createdAt: new Date() } as unknown as UIMessage;
    expect(extractTurnOutput(msg)).toBeNull();
  });

  it('parses valid InterviewTurnOutput from a text part', () => {
    const msg = {
      role: 'assistant',
      id: '1',
      createdAt: new Date(),
      parts: [{ type: 'text', text: JSON.stringify(validTurnOutput) }],
    } as unknown as UIMessage;
    const result = extractTurnOutput(msg);
    expect(result).not.toBeNull();
    expect(result?.questionText).toBe('How many hours of sleep do you typically get?');
    expect(result?.choices).toHaveLength(4);
    expect(result?.domain).toBe('sleep');
  });

  it('returns null when text part contains invalid JSON', () => {
    const msg = {
      role: 'assistant',
      id: '1',
      createdAt: new Date(),
      parts: [{ type: 'text', text: 'Hello, what is your name?' }],
    } as unknown as UIMessage;
    expect(extractTurnOutput(msg)).toBeNull();
  });

  it('returns null when text part JSON does not match schema', () => {
    const msg = {
      role: 'assistant',
      id: '1',
      createdAt: new Date(),
      parts: [{ type: 'text', text: JSON.stringify({ foo: 'bar' }) }],
    } as unknown as UIMessage;
    expect(extractTurnOutput(msg)).toBeNull();
  });
});

// ─── ProgressDots ─────────────────────────────────────────────────────────────

describe('ProgressDots', () => {
  it('renders MAX_TURNS dots (10 by default)', () => {
    render(<ProgressDots current={0} total={10} />);
    const dots = screen.getAllByRole('presentation', { hidden: true });
    // Each dot is a span with aria-hidden
    expect(dots).toHaveLength(10);
  });

  it('marks the active dot (current turn index)', () => {
    render(<ProgressDots current={3} total={10} />);
    const dots = screen.getAllByRole('presentation', { hidden: true });
    // Dot at index 3 should have the active class
    expect(dots[3]).toHaveClass('bg-[var(--color-accent)]');
  });

  it('inactive dots have paper-3 background', () => {
    render(<ProgressDots current={0} total={10} />);
    const dots = screen.getAllByRole('presentation', { hidden: true });
    // Dots after current (0) should be paper-3
    expect(dots[1]).toHaveClass('bg-[var(--color-paper-3)]');
  });
});

// ─── DomainBadge ─────────────────────────────────────────────────────────────

describe('DomainBadge', () => {
  it('renders "Focusing on: Sleep" for sleep domain', () => {
    render(<DomainBadge domain="sleep" />);
    expect(screen.getByText(/Focusing on:/i)).toBeInTheDocument();
    expect(screen.getByText(/Sleep/i)).toBeInTheDocument();
  });

  it('renders "Focusing on: Nutrition & Gut" for nutrition_gut domain', () => {
    render(<DomainBadge domain="nutrition_gut" />);
    expect(screen.getByText(/Nutrition/i)).toBeInTheDocument();
  });

  it('renders "Focusing on: Exercise & Longevity" for exercise_longevity domain', () => {
    render(<DomainBadge domain="exercise_longevity" />);
    expect(screen.getByText(/Exercise/i)).toBeInTheDocument();
  });

  it('renders "Focusing on: Mental Health" for mental_health domain', () => {
    render(<DomainBadge domain="mental_health" />);
    expect(screen.getByText(/Mental Health/i)).toBeInTheDocument();
  });
});

// ─── ChoiceChips ─────────────────────────────────────────────────────────────

describe('ChoiceChips', () => {
  const choices = [
    { id: 'c1', label: 'Less than 6 hours' },
    { id: 'c2', label: '6–7 hours' },
    { id: 'c3', label: '7–8 hours' },
    { id: 'c4', label: 'More than 8 hours' },
  ];

  it('renders all choice chips', () => {
    const onSelect = vi.fn();
    render(<ChoiceChips choices={choices} onSelect={onSelect} />);
    expect(screen.getByText('Less than 6 hours')).toBeInTheDocument();
    expect(screen.getByText('6–7 hours')).toBeInTheDocument();
    expect(screen.getByText('7–8 hours')).toBeInTheDocument();
    expect(screen.getByText('More than 8 hours')).toBeInTheDocument();
  });

  it('calls onSelect with the choice when clicked', () => {
    const onSelect = vi.fn();
    render(<ChoiceChips choices={choices} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('6–7 hours'));
    expect(onSelect).toHaveBeenCalledWith({ id: 'c2', label: '6–7 hours' });
  });

  it('disables chips when disabled prop is true', () => {
    const onSelect = vi.fn();
    render(<ChoiceChips choices={choices} onSelect={onSelect} disabled />);
    const firstChip = screen.getByText('Less than 6 hours').closest('button');
    expect(firstChip).toBeDisabled();
  });
});

// ─── TellMeMore ──────────────────────────────────────────────────────────────

describe('TellMeMore', () => {
  it('renders the exact prompt text from D-03', () => {
    const onSubmit = vi.fn();
    render(<TellMeMore allowFreeText onSubmit={onSubmit} />);
    expect(
      screen.getByText(/Anything else you'd like to share for better recommendations/i),
    ).toBeInTheDocument();
  });

  it('renders textarea when allowFreeText is true', () => {
    const onSubmit = vi.fn();
    render(<TellMeMore allowFreeText onSubmit={onSubmit} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('does NOT render textarea when allowFreeText is false', () => {
    const onSubmit = vi.fn();
    render(<TellMeMore allowFreeText={false} onSubmit={onSubmit} />);
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('calls onSubmit with empty string on skip', () => {
    const onSubmit = vi.fn();
    render(<TellMeMore allowFreeText onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText(/skip/i));
    expect(onSubmit).toHaveBeenCalledWith('');
  });

  it('calls onSubmit with textarea content on submit', () => {
    const onSubmit = vi.fn();
    render(<TellMeMore allowFreeText onSubmit={onSubmit} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'I eat late at night' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(onSubmit).toHaveBeenCalledWith('I eat late at night');
  });
});
