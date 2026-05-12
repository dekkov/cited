import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DmcaPage from './page';

describe('/legal/dmca page (LGL-02)', () => {
  it('renders the H1 "DMCA Takedown Requests"', () => {
    render(<DmcaPage />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toContain('DMCA Takedown Requests');
  });

  it('renders the "48 hours" SLA copy', () => {
    render(<DmcaPage />);
    expect(screen.getByText(/48 hours from receipt/)).toBeDefined();
  });

  it('renders a contact email placeholder beginning with "dmca@"', () => {
    render(<DmcaPage />);
    expect(screen.getByText(/dmca@/)).toBeDefined();
  });
});
