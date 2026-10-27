import type { Vehicle } from '../../api/contracts.ts';

export interface VehicleCardProps {
  vehicle: Vehicle;
  isSelected?: boolean;
  onSelect?: (vehicle: Vehicle) => void;
}

export function VehicleCard({ vehicle, isSelected = false, onSelect }: VehicleCardProps) {
  return (
    <div
      onClick={() => onSelect?.(vehicle)}
      className={`relative group p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
        isSelected
          ? 'bg-slate-900 border-emerald-500 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/50'
          : 'bg-slate-900/70 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          {/* License Plate Automotive Badge */}
          {vehicle.plate && (
            <span className="inline-block px-2.5 py-0.5 rounded font-mono font-bold text-xs uppercase bg-black text-slate-100 border border-slate-700 tracking-wider shadow-sm mb-2">
              {vehicle.plate}
            </span>
          )}
          <h3 className="font-semibold text-base text-slate-100 group-hover:text-emerald-400 transition-colors">
            {vehicle.make} {vehicle.model}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Year {vehicle.year} {vehicle.engine && `• ${vehicle.engine}`}
          </p>
        </div>

        {/* Current Mileage Display */}
        <div className="text-right">
          <span className="text-sm font-semibold text-slate-200">
            {vehicle.currentMileage.toLocaleString()} km
          </span>
          {vehicle.fuelType && (
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
              {vehicle.fuelType}
            </p>
          )}
        </div>
      </div>

      {/* Selected Indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      )}
    </div>
  );
}
