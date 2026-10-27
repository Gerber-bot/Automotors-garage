import React from 'react';
import { WorkshopSelector } from '../domain/WorkshopSelector.tsx';

export interface HeaderProps {
  workshopName: string;
  activeRole: string;
  onQuickServiceClick: () => void;
}

export function Header({
  workshopName,
  activeRole,
  onQuickServiceClick,
}: HeaderProps) {
  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur px-4 md:px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 font-mono text-sm">
          AG
        </div>
        <div>
          <span className="font-bold text-slate-100 text-sm md:text-base tracking-tight">
            Automotors <span className="text-emerald-400 font-mono">Garage</span>
          </span>
          <p className="text-[10px] text-slate-400 -mt-0.5 font-mono">SaaS Platform</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <WorkshopSelector
          workshops={[
            { id: 'w-alpha', name: 'Alpha Motors Garage', role: activeRole },
            { id: 'w-bravo', name: 'Bravo Racing Shop', role: 'MECHANIC' },
          ]}
          activeWorkshopId="w-alpha"
          onSelectWorkshop={() => {}}
        />

        <button
          type="button"
          onClick={onQuickServiceClick}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-sm active:scale-95"
        >
          <span>⚡</span> Quick Service
        </button>
      </div>
    </header>
  );
}
