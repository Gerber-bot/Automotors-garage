import React, { useState } from 'react';
import type { Vehicle } from '../../api/contracts.ts';

export interface WorkOrderFormProps {
  vehicles: readonly Vehicle[];
  onSubmit: (formData: {
    vehicleId: string;
    reportedMileage: number;
    reportedIssue: string;
    initialCondition?: string;
  }) => Promise<void>;
}

export function WorkOrderForm({ vehicles, onSubmit }: WorkOrderFormProps) {
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicles[0]?.id ?? '');
  const [reportedMileage, setReportedMileage] = useState<number>(vehicles[0]?.currentMileage ?? 0);
  const [reportedIssue, setReportedIssue] = useState('');
  const [initialCondition, setInitialCondition] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  const handleVehicleChange = (id: string) => {
    setSelectedVehicleId(id);
    const v = vehicles.find((veh) => veh.id === id);
    if (v) setReportedMileage(v.currentMileage);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedVehicleId) {
      setErrorMessage('Seleccioná un vehículo.');
      return;
    }
    if (!reportedIssue.trim()) {
      setErrorMessage('Ingresá el problema reportado por el cliente.');
      return;
    }
    if (selectedVehicle && reportedMileage < selectedVehicle.currentMileage) {
      setErrorMessage(
        `El kilometraje ingresado (${reportedMileage} km) no puede ser menor al kilometraje registrado (${selectedVehicle.currentMileage} km).`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        vehicleId: selectedVehicleId,
        reportedMileage,
        reportedIssue: reportedIssue.trim(),
        initialCondition: initialCondition.trim() || undefined,
      });
    } catch (err: unknown) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
      <h3 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-2">
        Apertura de Orden de Reparación
      </h3>

      {errorMessage && (
        <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-lg text-rose-300 text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {/* Vehicle selection */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          Vehículo
        </label>
        <select
          value={selectedVehicleId}
          onChange={(e) => handleVehicleChange(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
        >
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.plate ? `[${v.plate}] ` : ''}
              {v.make} {v.model} ({v.year}) — {v.currentMileage.toLocaleString()} km
            </option>
          ))}
        </select>
      </div>

      {/* Mileage */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          Kilometraje de Ingreso (km)
        </label>
        <input
          type="number"
          value={reportedMileage}
          onChange={(e) => setReportedMileage(Number(e.target.value))}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
        />
      </div>

      {/* Issue */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          Motivo de Ingreso / Problema Reportado
        </label>
        <textarea
          rows={3}
          value={reportedIssue}
          onChange={(e) => setReportedIssue(e.target.value)}
          placeholder="Describí los síntomas reportados por el cliente..."
          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Initial condition */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          Estado Inicial del Vehículo (Opcional)
        </label>
        <input
          type="text"
          value={initialCondition}
          onChange={(e) => setInitialCondition(e.target.value)}
          placeholder="Rayones, nivel de combustible, pertenencias..."
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-lg transition-all"
      >
        {isSubmitting ? 'Abriendo orden...' : 'Crear Orden de Trabajo'}
      </button>
    </form>
  );
}
