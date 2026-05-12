'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useEffect, useState } from 'react';

const SHORTCUTS = [
  { key: '[', description: 'Set clip start at cursor word' },
  { key: ']', description: 'Set clip end at cursor word' },
  { key: 'space', description: 'Play / pause' },
  { key: '← / →', description: 'Nudge ±0.5s' },
  { key: 'g n', description: 'Jump to next Drafting clip' },
] as const;

export function KeyboardCheatsheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Don't trigger when typing in an input/textarea
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[400px] bg-[var(--color-paper)] rounded-[var(--radius-lg)] p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[var(--color-ink)]">
            Keyboard shortcuts
          </DialogTitle>
        </DialogHeader>
        <table className="w-full mt-2 text-[12px]" style={{ fontFamily: 'var(--font-geist-mono)' }}>
          <tbody>
            {SHORTCUTS.map((s) => (
              <tr key={s.key} className="border-b border-[var(--color-rule-soft)] last:border-0">
                <td className="py-2 pr-4">
                  <kbd
                    className="px-1 py-0.5 rounded border border-[var(--color-rule)] bg-[var(--color-paper-3)] text-[var(--color-ink-2)]"
                    style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '12px' }}
                  >
                    {s.key}
                  </kbd>
                </td>
                <td className="py-2 text-[var(--color-ink-2)]">{s.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p
          className="text-[12px] text-[var(--color-ink-3)] mt-3"
          style={{ fontFamily: 'var(--font-geist-mono)' }}
        >
          Press{' '}
          <kbd className="px-1 border border-[var(--color-rule)] rounded bg-[var(--color-paper-3)]">
            ?
          </kbd>{' '}
          to toggle this panel.
        </p>
      </DialogContent>
    </Dialog>
  );
}
