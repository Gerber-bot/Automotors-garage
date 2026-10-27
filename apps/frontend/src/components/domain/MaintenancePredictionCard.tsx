import React from 'react';
import { StatusBadge } from './StatusBadge.tsx';

export interface MaintenancePredictionProps {
  category: string;
  status: string;
  nextDueMileage: number | null;
  remainingKm: number | null;
  nextDueDate: string | null;
  confidence: string;
  sourceCitation?: string;
  warning?: string;
}

export function MaintenancePredictionCard({
  category,
  status,
  nextDueMileage,
  remainingKm,
  nextDueDate,
  confidence,
  sourceCitation,
  warning,
}: MaintenancePredictionProps) {
  const isInsufficient = status === 'INSUFFICIENT_DATA';

  return (
    <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h4 className="font-semibold text-slate-100 text-sm">{category.replace(/_/g, ' ')}</h4>
          <StatusBadge status={status} size="sm" />
        </div>

        {warning ? (
          <p className="text-xs text-amber-400 bg-amber-950/40 p-2 rounded border border-amber-800/40 mt-1">
            ⚠️ {warning}
          </p>
        ) : (
          <div className="space-y-1 mt-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Próximo objetivo:</span>
              <span className="font-mono font-semibold text-slate-200">
                {nextDueMileage ? `${nextDueMileage.toLocaleString()} km` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Kilómetros restantes:</span>
              <span
                className={`font-mono font-bold ${
                  remainingKm !== null && remainingKm <= 500 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {remainingKm !== null ? `${remainingKm.toLocaleString()} km` : 'N/A'}
              </span>
            </div>
            {nextDueDate && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Fecha límite:</span>
                <span className="text-slate-300">
                  {new Date(nextDueDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
        <span>Confianza: <strong className="text-slate-300">{confidence}</strong></span>
        {sourceCitation && <span className="truncate max-w-[140px]">{sourceCitation}</span>}
      </div>
    </div>
  );
}
