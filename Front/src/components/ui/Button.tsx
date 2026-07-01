import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-sm hover:bg-sky-600 active:scale-[0.98]',
        destructive: 'bg-rose-500 text-white shadow-sm hover:bg-rose-600 active:scale-[0.98]',
        outline:
          'border border-input bg-white text-foreground shadow-sm hover:bg-slate-50 hover:text-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-sky-100',
        ghost: 'hover:bg-slate-100 text-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        success: 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 active:scale-[0.98]',
        warning: 'bg-amber-500 text-white shadow-sm hover:bg-amber-600 active:scale-[0.98]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-lg px-8',
        xl: 'h-12 rounded-xl px-10 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
