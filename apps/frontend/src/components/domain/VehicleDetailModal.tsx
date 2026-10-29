'use client';

import * as React from 'react';
import {
  Car,
  Calendar,
  Cpu,
  ShieldCheck,
  Zap,
  Copy,
  Check,
  X,
  Clock,
  RotateCw,
  FileText,
  Fuel,
  Gauge,
  Tag,
} from 'lucide-react';
import { Button, Badge } from '../ui/index.ts';
import type { Vehicle } from '../../api/contracts.ts';

export interface VehicleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  passportData?: {
    timeline?: Array<{
      recordId?: string;
      category?: string;
      serviceMileage?: number;
      description?: string;
      performedAt?: string;
      isCertified?: boolean;
    }>;
    summary?: {
      totalInterventions?: number;
      lastServiceDate?: string;
      lastRecordedMileage?: number;
    };
  } | null;
  isLoadingPassport?: boolean;
  onQuickServiceForVehicle?: (vehicle: Vehicle) => void;
}

export function VehicleDetailModal({
  isOpen,
  onClose,
  vehicle,
  passportData,
  isLoadingPassport = false,
  onQuickServiceForVehicle,
}: VehicleDetailModalProps) {
  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement | null>(null);

  // Focus and Escape key handling
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
      // Accessibility focus on close button upon opening
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !vehicle) {
    return null;
  }

  const handleCopy = (text: string, fieldKey: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      setTimeout(() => {
        setCopiedField(null);
      }, 2000);
    }
  };

  const timelineEntries = passportData?.timeline || [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="vehicle-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden"
    >
      {/* SEMITRANSPARENT BACKDROP */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in-0 duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* MODAL CONTAINER */}
      <div
        className="relative w-full sm:max-w-[820px] max-h-[92vh] sm:max-h-[90vh] bg-slate-900 border-t sm:border border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl shadow-black/80 text-slate-100 flex flex-col z-10 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 overflow-hidden"
      >
        {/* MOBILE DRAG HANDLE */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="h-1 w-10 rounded-full bg-slate-700" />
        </div>

        {/* HEADER */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="vehicle-modal-title"
                  className="text-base sm:text-lg font-bold text-white tracking-tight"
                >
                  {vehicle.make} {vehicle.model}
                </h2>
                {vehicle.plate ? (
                  <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-black text-slate-100 border border-slate-700 tracking-wider shadow-sm">
                    {vehicle.plate}
                  </span>
                ) : (
                  <Badge variant="secondary" size="sm">
                    Sin Dominio
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Modelo {vehicle.year} {vehicle.engine && `• ${vehicle.engine}`}
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Cerrar ficha técnica"
            className="rounded-lg p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* INTERNAL SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 no-scrollbar">
          {/* SUMMARY GRID (4 METRICS) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {/* ODOMETER */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span className="font-medium text-[11px] uppercase tracking-wider">Odómetro</span>
                <Gauge className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <div className="text-base sm:text-lg font-bold font-mono text-emerald-400 truncate">
                {vehicle.currentMileage.toLocaleString()}{' '}
                <span className="text-xs text-slate-400 font-normal">km</span>
              </div>
            </div>

            {/* YEAR */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span className="font-medium text-[11px] uppercase tracking-wider">Año Modelo</span>
                <Calendar className="h-3.5 w-3.5 text-cyan-400" />
              </div>
              <div className="text-base sm:text-lg font-bold text-white">
                {vehicle.year}
              </div>
            </div>

            {/* FUEL TYPE */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span className="font-medium text-[11px] uppercase tracking-wider">Combustible</span>
                <Fuel className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <div className="text-sm sm:text-base font-semibold text-slate-200 truncate">
                {vehicle.fuelType || 'Nafta'}
              </div>
            </div>

            {/* MOTOR */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span className="font-medium text-[11px] uppercase tracking-wider">Motor</span>
                <Cpu className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <div className="text-sm sm:text-base font-semibold text-slate-200 truncate" title={vehicle.engine || 'Estándar OEM'}>
                {vehicle.engine || 'Estándar OEM'}
              </div>
            </div>
          </div>

          {/* TECHNICAL SPECIFICATIONS & IDENTIFIERS */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Identificación y Datos Técnicos
            </h3>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3 text-xs">
              {/* VIN ROW WITH COPY BUTTON */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-slate-500" />
                  Número VIN / Chasis:
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-200 text-xs tracking-wider font-semibold">
                    {vehicle.vin || 'No registrado'}
                  </span>
                  {vehicle.vin && (
                    <button
                      type="button"
                      onClick={() => handleCopy(vehicle.vin!, 'vin')}
                      className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                      title="Copiar VIN al portapapeles"
                      aria-label="Copiar VIN al portapapeles"
                    >
                      {copiedField === 'vin' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* ENGINE CODE ROW */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-slate-500" />
                  Código de Motorización:
                </span>
                <span className="text-slate-200 font-medium">
                  {vehicle.engine || 'Especificación de fábrica'}
                </span>
              </div>

              {/* SYSTEM INTERNAL ID (SECONDARY/DISCREET) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                <span className="text-slate-500">ID de Sistema (interno):</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-slate-500 truncate max-w-[220px]">
                    {vehicle.id}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(vehicle.id, 'id')}
                    className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    title="Copiar ID interno"
                    aria-label="Copiar ID interno"
                  >
                    {copiedField === 'id' ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* VEHICLE HISTORY & MAINTENANCE TIMELINE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-emerald-400" />
                Historial de Servicios del Rodado
              </h3>
              {timelineEntries.length > 0 && (
                <Badge variant="success" size="sm">
                  {timelineEntries.length} {timelineEntries.length === 1 ? 'intervención' : 'intervenciones'}
                </Badge>
              )}
            </div>

            {isLoadingPassport ? (
              <div className="p-8 rounded-xl bg-slate-950/40 border border-slate-800/80 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                <RotateCw className="h-5 w-5 animate-spin text-emerald-400" />
                <span>Recuperando historial oficial del pasaporte digital...</span>
              </div>
            ) : timelineEntries.length > 0 ? (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 max-h-56 overflow-y-auto no-scrollbar space-y-3">
                <div className="relative border-l border-slate-800 ml-2 pl-4 space-y-4">
                  {timelineEntries.map((entry, idx) => (
                    <div key={entry.recordId || idx} className="relative group">
                      {/* Timeline dot */}
                      <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-slate-900" />

                      <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs space-y-1 hover:border-slate-700 transition-colors">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-semibold text-slate-200">
                            {entry.category || 'Mantenimiento General'}
                          </span>
                          {entry.serviceMileage !== undefined && entry.serviceMileage > 0 && (
                            <span className="font-mono text-emerald-400 font-bold text-xs">
                              {entry.serviceMileage.toLocaleString()} km
                            </span>
                          )}
                        </div>

                        {entry.description && (
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            {entry.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 border-t border-slate-800/60 mt-1.5">
                          <span>
                            {entry.performedAt
                              ? new Date(entry.performedAt).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'Fecha no registrada'}
                          </span>
                          {entry.isCertified ? (
                            <span className="text-emerald-400 font-medium flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3" /> Certificado
                            </span>
                          ) : (
                            <span className="text-slate-400">Registro Taller</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-slate-950/40 border border-slate-800/80 text-center text-xs text-slate-400 space-y-1">
                <FileText className="h-6 w-6 text-slate-600 mx-auto mb-1.5" />
                <p className="font-medium text-slate-300">
                  Sin intervenciones previas registradas
                </p>
                <p className="text-[11px] text-slate-500">
                  Las órdenes cerradas o servicios express quedarán asentados en esta cronología inmutable.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 sm:px-6 sm:py-3.5 border-t border-slate-800 bg-slate-950/80 backdrop-blur flex flex-col-reverse sm:flex-row items-center justify-between gap-3 shrink-0">
          <Button
            variant="ghost"
            size="md"
            onClick={onClose}
            className="w-full sm:w-auto text-slate-400 hover:text-slate-200"
          >
            Cerrar Ficha
          </Button>

          {onQuickServiceForVehicle && (
            <Button
              variant="primary"
              size="md"
              leftIcon={<Zap className="h-4 w-4 stroke-[2.5]" />}
              className="w-full sm:w-auto min-w-[210px] justify-center"
              onClick={() => {
                onClose();
                onQuickServiceForVehicle(vehicle);
              }}
            >
              Iniciar Quick Service Express
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
