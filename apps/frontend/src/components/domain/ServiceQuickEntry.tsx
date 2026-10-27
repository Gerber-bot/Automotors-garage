import React, { useState } from 'react';
import { VehicleCard } from './VehicleCard.tsx';
import { VoiceRecorder } from './VoiceRecorder.tsx';
import { AIConfirmationPanel } from './AIConfirmationPanel.tsx';
import type { Vehicle, AIProposal } from '../../api/contracts.ts';
import { ApiClient } from '../../api/client.ts';

export interface ServiceQuickEntryProps {
  initialVehicles?: readonly Vehicle[];
  onServiceSaved?: (result: { vehicleId: string; odometerKm: number; interventions: string[] }) => void;
}

const COMMON_SERVICES = [
  { id: 'oil_change', label: 'Aceite y Filtro' },
  { id: 'brake_pads', label: 'Pastillas de Freno' },
  { id: 'cabin_air_filter', label: 'Filtro Aire/Habitáculo' },
  { id: 'tire_rotation', label: 'Rotación Neumáticos' },
  { id: 'general_inspection', label: 'Chequeo General' },
  { id: 'coolant_flush', label: 'Líquido Refrigerante' },
];

export function ServiceQuickEntry({ initialVehicles = [], onServiceSaved }: ServiceQuickEntryProps) {
  const [searchPlate, setSearchPlate] = useState('');
  const [availableVehicles, setAvailableVehicles] = useState<readonly Vehicle[]>(initialVehicles);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [odometerKm, setOdometerKm] = useState<number>(0);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [aiProposal, setAiProposal] = useState<AIProposal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const apiClient = ApiClient.getInstance();

  const handleSearch = async (term: string) => {
    setSearchPlate(term);
    if (term.trim().length >= 2) {
      const results = await apiClient.getVehicles(term);
      setAvailableVehicles(results);
    } else {
      setAvailableVehicles(initialVehicles);
    }
  };

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setOdometerKm(vehicle.currentMileage);
  };

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAudioCaptured = async (audioBlob: Blob) => {
    setIsProcessingVoice(true);
    try {
      const proposal = await apiClient.processVoiceNote(audioBlob);
      setAiProposal(proposal);
      setOdometerKm(proposal.odometerKm);

      // Pre-select services recognized by AI
      const matched = proposal.workPerformed
        .map((p) => {
          if (p.includes('oil')) return 'oil_change';
          if (p.includes('brake')) return 'brake_pads';
          if (p.includes('filter')) return 'cabin_air_filter';
          return null;
        })
        .filter(Boolean) as string[];

      setSelectedServices((prev) => Array.from(new Set([...prev, ...matched])));
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const handleAiConfirmed = (confirmed: AIProposal) => {
    setOdometerKm(confirmed.odometerKm);
    setAiProposal(null);
    submitFinalService(confirmed.odometerKm, selectedServices, confirmed.diagnosisNotes);
  };

  const submitFinalService = async (km: number, services: string[], notes?: string) => {
    if (!selectedVehicle) return;
    setIsSubmitting(true);
    try {
      await apiClient.submitQuickService({
        vehicleId: selectedVehicle.id,
        odometerKm: km,
        interventions: services,
        observations: notes,
      });

      setSuccessMessage(`¡Servicio registrado con éxito para ${selectedVehicle.make} ${selectedVehicle.model}!`);
      onServiceSaved?.({
        vehicleId: selectedVehicle.id,
        odometerKm: km,
        interventions: services,
      });

      // Reset for next car
      setTimeout(() => {
        setSelectedVehicle(null);
        setSelectedServices([]);
        setSuccessMessage(null);
        setSearchPlate('');
      }, 2500);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 md:p-6 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-5">
        <div>
          <span className="text-emerald-400 font-mono text-[11px] uppercase tracking-widest font-semibold">
            ⚡ Quick Service Entry (&lt; 60s)
          </span>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white mt-0.5">
            Registro Rápido de Taller
          </h2>
        </div>
        <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700/80 text-xs font-mono text-slate-300">
          Modo Mecánico
        </div>
      </div>

      {successMessage && (
        <div className="mb-4 p-3 bg-emerald-950/80 border border-emerald-500 rounded-xl text-emerald-300 text-sm font-medium animate-fadeIn">
          ✓ {successMessage}
        </div>
      )}

      {/* Step 1: Vehicle Plate Lookup */}
      {!selectedVehicle ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              1. Buscar por Patente o VIN
            </label>
            <input
              type="text"
              placeholder="Ingresá patente (ej. AF123CD) o marca..."
              value={searchPlate}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
            />
          </div>

          <div className="space-y-2 mt-3">
            <span className="text-xs text-slate-400">Resultados disponibles:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
              {availableVehicles.map((vehicle) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  onSelect={handleSelectVehicle}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Step 2: Service Form (< 60s target) */
        <div className="space-y-5">
          {/* Selected Vehicle Banner */}
          <div className="flex items-center justify-between p-3.5 bg-slate-900/90 rounded-xl border border-slate-800">
            <div>
              <span className="font-mono text-xs font-bold px-2 py-0.5 bg-black text-emerald-400 rounded border border-slate-700 mr-2 uppercase">
                {selectedVehicle.plate ?? 'SIN PATENTE'}
              </span>
              <span className="font-semibold text-sm text-slate-100">
                {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.year})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedVehicle(null)}
              className="text-xs text-slate-400 hover:text-slate-200 underline"
            >
              Cambiar
            </button>
          </div>

          {/* Odometer Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              2. Kilometraje Actual
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={odometerKm}
                onChange={(e) => setOdometerKm(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-lg font-bold font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => setOdometerKm((prev) => prev + 5000)}
                className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-mono rounded-lg text-slate-300"
              >
                +5k
              </button>
              <button
                type="button"
                onClick={() => setOdometerKm((prev) => prev + 10000)}
                className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-mono rounded-lg text-slate-300"
              >
                +10k
              </button>
            </div>
          </div>

          {/* Work Performed Quick Chips */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              3. Trabajos Realizados
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {COMMON_SERVICES.map((service) => {
                const isSelected = selectedServices.includes(service.id);
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service.id)}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-medium text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow-sm'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span>{service.label}</span>
                    {isSelected && <span className="text-emerald-400 font-bold ml-1">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Voice Notes Dictation */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              4. Dictado por Voz Asistido por IA (Opcional)
            </label>
            <VoiceRecorder
              isProcessing={isProcessingVoice}
              onAudioCaptured={handleAudioCaptured}
            />
          </div>

          {/* AI Extraction Staging Panel */}
          {aiProposal && (
            <AIConfirmationPanel
              proposal={aiProposal}
              onConfirm={handleAiConfirmed}
              onDismiss={() => setAiProposal(null)}
            />
          )}

          {/* Final Submit Button */}
          {!aiProposal && (
            <button
              type="button"
              disabled={isSubmitting || selectedServices.length === 0}
              onClick={() => submitFinalService(odometerKm, selectedServices)}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-base rounded-xl transition-all shadow-lg shadow-emerald-950/50 active:scale-[0.98] mt-3"
            >
              {isSubmitting ? 'Guardando en Libro de Taller...' : 'Finalizar y Guardar Intervención'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
