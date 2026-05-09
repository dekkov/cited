import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*=size-])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--color-ink)] text-[var(--color-paper)] shadow hover:bg-[var(--color-ink-2)]',
        destructive: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
        outline:
          'border border-[var(--color-rule)] bg-transparent shadow-sm hover:bg-[var(--color-paper-2)] text-[var(--color-ink)]',
        secondary:
          'bg-[var(--color-paper-2)] text-[var(--color-ink)] shadow-sm hover:bg-[var(--color-paper-3)]',
        ghost: 'hover:bg-[var(--color-paper-2)] text-[var(--color-ink)]',
        link: 'text-[var(--color-accent)] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-full px-3 has-[>svg]:px-2.5 text-xs',
        lg: 'h-10 rounded-full px-6 has-[>svg]:px-4',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
