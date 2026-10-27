import React from 'react';
import type { WorkOrderStatus, VerificationLevel } from '../../api/contracts.ts';

export interface StatusBadgeProps {
  status: WorkOrderStatus | VerificationLevel | string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const normalized = status.toUpperCase();

  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';

  // WorkOrder Status Colors
  if (normalized === 'COMPLETED' || normalized === 'CORROBORATED') {
    colorClasses = 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80 shadow-sm shadow-emerald-950';
  } else if (normalized === 'IN_PROGRESS' || normalized === 'IDENTIFIED_WORKSHOP') {
    colorClasses = 'bg-cyan-950/80 text-cyan-400 border-cyan-800/80';
  } else if (normalized === 'WAITING_APPROVAL' || normalized === 'DOCUMENTED') {
    colorClasses = 'bg-amber-950/80 text-amber-400 border-amber-800/80';
  } else if (normalized === 'CANCELLED' || normalized === 'OVERDUE') {
    colorClasses = 'bg-rose-950/80 text-rose-400 border-rose-800/80';
  } else if (normalized === 'OPEN' || normalized === 'DUE_NOW') {
    colorClasses = 'bg-blue-950/80 text-blue-400 border-blue-800/80';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs md:text-sm';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border transition-colors ${sizeClasses} ${colorClasses}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
      {normalized.replace(/_/g, ' ')}
    </span>
  );
}
