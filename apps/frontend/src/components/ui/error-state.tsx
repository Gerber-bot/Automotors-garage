import * as React from 'react';
import { cn } from '../../lib/utils.ts';
import { AlertTriangle } from 'lucide-react';
import { Button } from './button.tsx';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Ha ocurrido un error',
  message,
  onRetry,
  className,
}) => {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center p-6 text-center rounded-xl border border-rose-500/20 bg-rose-500/5 my-4',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 mb-3 border border-rose-500/20">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h4 className="text-sm font-semibold text-rose-300 mb-1">{title}</h4>
      <p className="text-xs text-rose-200/80 max-w-sm mb-4 leading-relaxed">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="border-rose-500/30 text-rose-300 hover:bg-rose-500/10">
          Reintentar operación
        </Button>
      )}
    </div>
  );
};
