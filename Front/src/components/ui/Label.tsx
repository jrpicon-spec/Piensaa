import { type HTMLAttributes, type LabelHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      'text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      className,
    )}
    {...props}
  />
));
Label.displayName = 'Label';

export const FormField = ({ children, className }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1.5', className)}>{children}</div>
);

export const FormLabel = ({ children, required, htmlFor }: { children: React.ReactNode; required?: boolean; htmlFor?: string }) => (
  <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
    {children}
    {required && <span className="text-rose-500 ml-0.5">*</span>}
  </Label>
);

export const FormHint = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <p className={cn('text-xs text-muted-foreground', className)}>{children}</p>
);
