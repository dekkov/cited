import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthDisclaimer } from './HealthDisclaimer';

describe('HealthDisclaimer', () => {
  it('renders the locked copy "This is not medical advice." verbatim', () => {
    render(<HealthDisclaimer />);
    expect(screen.getByText(/This is not medical advice\./)).toBeDefined();
  });

  it('renders a "See a clinician" recommendation phrase', () => {
    render(<HealthDisclaimer />);
    expect(screen.getByText(/See a clinician/)).toBeDefined();
  });

  it('accepts variant prop and reflects it via data-variant', () => {
    const { container, rerender } = render(<HealthDisclaimer variant="card" />);
    expect(container.querySelector('[data-variant="card"]')).not.toBeNull();
    rerender(<HealthDisclaimer variant="page" />);
    expect(container.querySelector('[data-variant="page"]')).not.toBeNull();
    rerender(<HealthDisclaimer variant="footer" />);
    expect(container.querySelector('[data-variant="footer"]')).not.toBeNull();
  });
});
