import React from 'react';

export interface WorkshopOption {
  id: string;
  name: string;
  role: string;
}

export interface WorkshopSelectorProps {
  workshops: readonly WorkshopOption[];
  activeWorkshopId: string;
  onSelectWorkshop: (workshopId: string) => void;
}

export function WorkshopSelector({
  workshops,
  activeWorkshopId,
  onSelectWorkshop,
}: WorkshopSelectorProps) {
  const active = workshops.find((w) => w.id === activeWorkshopId);

  return (
    <div className="relative inline-block text-left">
      <select
        value={activeWorkshopId}
        onChange={(e) => onSelectWorkshop(e.target.value)}
        className="bg-slate-900 border border-slate-700 text-slate-100 text-xs md:text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
        aria-label="Seleccionar taller activo"
      >
        {workshops.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name} ({w.role})
          </option>
        ))}
      </select>
    </div>
  );
}
