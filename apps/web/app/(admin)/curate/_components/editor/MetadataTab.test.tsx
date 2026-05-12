import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MetadataTab } from './MetadataTab';

// Mock the approveClip action (wired inside MetadataTab via onSubmit prop)
const mockOnSubmit = vi.fn();
const mockOnSaveDraft = vi.fn();

const defaultProps = {
  defaultValues: {},
  onSubmit: mockOnSubmit,
  onSaveDraft: mockOnSaveDraft,
};

describe('MetadataTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all required form fields', () => {
    render(<MetadataTab {...defaultProps} />);

    // Claim textarea (id="claim")
    expect(screen.getByRole('textbox', { name: /^claim$/i })).toBeInTheDocument();
    // Rationale textarea
    expect(screen.getByRole('textbox', { name: /rationale/i })).toBeInTheDocument();

    // Speaker input
    expect(screen.getByRole('textbox', { name: /speaker$/i })).toBeInTheDocument();

    // Speaker status radios (3 options)
    expect(screen.getByRole('radio', { name: /^verified$/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^unverified$/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^host$/i })).toBeInTheDocument();

    // Domain radios (4 options)
    expect(screen.getByRole('radio', { name: /^sleep$/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /nutrition/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /exercise/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /mental health/i })).toBeInTheDocument();

    // Risk flag checkboxes (4)
    expect(screen.getByRole('checkbox', { name: /medical advice/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /supplement/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /contraindication/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /general wellness/i })).toBeInTheDocument();

    // Evidence strength select trigger
    expect(screen.getByRole('combobox', { name: /evidence strength/i })).toBeInTheDocument();

    // Start/End number inputs
    expect(screen.getByLabelText(/start \(sec\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end \(sec\)/i)).toBeInTheDocument();
  });

  it('renders the ADMN-15 hint string below the claim field', () => {
    render(<MetadataTab {...defaultProps} />);
    expect(
      screen.getByText('Length: as detailed as needed to convey the claim, not more.'),
    ).toBeInTheDocument();
  });

  it('shows inline error when submitting with empty riskFlags', async () => {
    render(<MetadataTab {...defaultProps} />);

    // Fill required fields to get past other validations
    await userEvent.type(
      screen.getByRole('textbox', { name: /^claim$/i }),
      'Sleep affects cognitive function significantly',
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: /rationale/i }),
      'Research shows sleep quality impacts memory',
    );
    await userEvent.type(screen.getByRole('textbox', { name: /speaker$/i }), 'Dr. Matthew Walker');

    const endInput = screen.getByLabelText(/end \(sec\)/i);
    await userEvent.clear(endInput);
    await userEvent.type(endInput, '120');

    // Do NOT check any risk flag — submit with empty riskFlags
    const form = document.querySelector('form');
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/risk_flags is mandatory/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit prop with parsed values when form is valid', async () => {
    render(<MetadataTab {...defaultProps} />);

    await userEvent.type(
      screen.getByRole('textbox', { name: /^claim$/i }),
      'Getting 8 hours of sleep improves cognition',
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: /rationale/i }),
      'Multiple RCTs show sleep duration affects memory consolidation',
    );
    await userEvent.type(screen.getByRole('textbox', { name: /speaker$/i }), 'Dr. Matthew Walker');

    // Set end > start to pass the refine check
    const startInput = screen.getByLabelText(/start \(sec\)/i);
    const endInput = screen.getByLabelText(/end \(sec\)/i);
    await userEvent.clear(startInput);
    await userEvent.type(startInput, '10');
    await userEvent.clear(endInput);
    await userEvent.type(endInput, '120');

    // Check a risk flag
    await userEvent.click(screen.getByRole('checkbox', { name: /general wellness/i }));

    await userEvent.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
      const firstCallArg = mockOnSubmit.mock.calls[0]?.[0];
      expect(firstCallArg).toMatchObject({
        claim: 'Getting 8 hours of sleep improves cognition',
        speaker: 'Dr. Matthew Walker',
        riskFlags: expect.arrayContaining(['general']),
      });
    });
  });
});
