import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'clinical-primary-button bg-primary text-white hover:bg-[#B71C1C]',
        destructive: 'clinical-primary-button bg-[#D32F2F] text-white hover:bg-[#B71C1C]',
        outline:
          'border border-input bg-white text-foreground shadow-sm hover:bg-slate-50 hover:text-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-slate-200',
        ghost: 'hover:bg-slate-100 text-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        success: 'bg-[#2E7D32] text-white hover:bg-[#256A2A]',
        warning: 'bg-[#F9A825] text-slate-900 hover:bg-[#E49A1D]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-md px-8',
        xl: 'h-12 rounded-md px-10 text-base',
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
