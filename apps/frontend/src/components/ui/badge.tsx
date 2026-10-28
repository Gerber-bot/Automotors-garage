import * as React from 'react';
import { cn } from '../../lib/utils.ts';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'inProgress'
    | 'outline';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', dot = false, children, ...props }, ref) => {
    const variants = {
      default: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      secondary: 'bg-slate-800 text-slate-300 border border-slate-700/60',
      success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
      warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
      danger: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
      info: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
      inProgress: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30',
      outline: 'bg-transparent text-slate-300 border border-slate-700',
    };

    const dots = {
      default: 'bg-emerald-400',
      secondary: 'bg-slate-400',
      success: 'bg-emerald-400',
      warning: 'bg-amber-400',
      danger: 'bg-rose-400',
      info: 'bg-sky-400',
      inProgress: 'bg-indigo-400',
      outline: 'bg-slate-400',
    };

    const sizes = {
      sm: 'text-[11px] px-2 py-0.5 gap-1 font-medium',
      md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full tracking-wide select-none',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {dot && <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dots[variant])} />}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
