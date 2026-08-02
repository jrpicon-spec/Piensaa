import { type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'text-foreground border-border',
        success: 'border-green-200 bg-green-50 text-[#2E7D32]',
        warning: 'border-amber-200 bg-amber-50 text-amber-800',
        danger: 'border-red-200 bg-red-50 text-[#D32F2F]',
        info: 'border-blue-200 bg-blue-50 text-[#2563EB]',
        muted: 'border-transparent bg-slate-100 text-slate-600',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export function StatusDot({ variant }: { variant: 'success' | 'warning' | 'danger' | 'info' }) {
  const colors = {
    success: 'bg-[#2E7D32]',
    warning: 'bg-amber-500',
    danger: 'bg-[#D32F2F]',
    info: 'bg-[#2563EB]',
  } as const;
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping', colors[variant])} />
      <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', colors[variant])} />
    </span>
  );
}
