import * as React from 'react';
import { cn } from '../../lib/utils.ts';
import { Loader2 } from 'lucide-react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  label = 'Cargando...',
}) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 gap-2">
      <Loader2 className={cn('animate-spin text-emerald-500', sizes[size], className)} />
      {label && <p className="text-xs text-slate-400 font-medium">{label}</p>}
    </div>
  );
};

export const LoadingState = LoadingSpinner;

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-slate-800/80', className)}
      {...props}
    />
  );
};
