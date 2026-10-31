'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  CarFront,
  ArrowLeft,
  ShieldCheck,
  Clock,
  Plus,
  Info,
  X,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Gauge,
  FileText,
} from 'lucide-react';
import { formatMileage } from '../../lib/utils.ts';

export interface SyntheticOwnerVehicle {
  id: string;
  plate: string;
  vin?: string;
  make: string;
  model: string;
  year: number;
  engine?: string;
  currentMileage: number;
  fuelType?: string;
  isCustom?: boolean;
}

export interface SyntheticTimelineEvent {
  id: string;
  vehicleId: string;
  title: string;
  category: string;
  origin: 'WORKSHOP_CERTIFIED' | 'OWNER_DECLARED';
  workshopName?: string;
  mileage: number;
  date: string;
  notes: string;
}

export interface SyntheticPrediction {
  category: string;
  description: string;
  targetMileage: number;
  targetDate: string;
  status: 'PENDING' | 'DUE_SOON' | 'OK';
  officialSource: string;
}

const STORAGE_KEY = 'automotors_demo_owner_v1';

const INITIAL_VEHICLES: SyntheticOwnerVehicle[] = [
  {
    id: 'veh-toyota-demo',
    plate: 'AF123CD',
    vin: '8AJBA25G000123456',
    make: 'Toyota',
    model: 'Corolla Hybrid Seg',
    year: 2022,
    engine: '1.8L Hybrid 16v (2ZR-FXE)',
    currentMileage: 38500,
    fuelType: 'Híbrido',
    isCustom: false,
  },
  {
    id: 'veh-ford-demo',
    plate: 'AD456EF',
    vin: '8AFFA11B000789012',
    make: 'Ford',
    model: 'Ranger 4x4 Limited',
    year: 2023,
    engine: '3.0L V6 Turbo Diesel',
    currentMileage: 48500,
    fuelType: 'Diésel',
    isCustom: false,
  },
];

const INITIAL_EVENTS: SyntheticTimelineEvent[] = [
  {
    id: 'evt-1',
    vehicleId: 'veh-toyota-demo',
    title: 'Service Oficial de 30.000 km',
    category: 'Mantenimiento Preventivo',
    origin: 'WORKSHOP_CERTIFIED',
    workshopName: 'Garage Pro Centro (Taller Certificado)',
    mileage: 30120,
    date: '2026-05-14',
    notes: 'Reemplazo de aceite sintético 0W-20 API SP, filtro de aceite y filtro de habitáculo.',
  },
  {
    id: 'evt-2',
    vehicleId: 'veh-toyota-demo',
    title: 'Reemplazo de Pastillas de Freno Delanteras',
    category: 'Frenos',
    origin: 'WORKSHOP_CERTIFIED',
    workshopName: 'Garage Pro Centro (Taller Certificado)',
    mileage: 30120,
    date: '2026-05-14',
    notes: 'Instalación de pastillas cerámicas OEM y rectificado preventivo de discos.',
  },
  {
    id: 'evt-3',
    vehicleId: 'veh-toyota-demo',
    title: 'Rotación y Balanceo de Neumáticos',
    category: 'Neumáticos',
    origin: 'OWNER_DECLARED',
    mileage: 35000,
    date: '2026-09-02',
    notes: 'Rotación en X y alineación en gomería de confianza. Registrado por el titular.',
  },
  {
    id: 'evt-4',
    vehicleId: 'veh-ford-demo',
    title: 'Service de 40.000 km',
    category: 'Mantenimiento Mayor',
    origin: 'WORKSHOP_CERTIFIED',
    workshopName: 'Servicio Integral Diesel',
    mileage: 40050,
    date: '2026-03-20',
    notes: 'Aceite 5W-30 sintético pesado, cartucho de combustible doble y purga de decantador.',
  },
];

const PREDICTIONS: Record<string, SyntheticPrediction[]> = {
  'veh-toyota-demo': [
    {
      category: 'Aceite y Filtro de Motor',
      description: 'Reemplazo de 0W-20 sintético y filtro cada 10.000 km o 12 meses.',
      targetMileage: 40000,
      targetDate: '2026-11-15',
      status: 'DUE_SOON',
      officialSource: 'Manual de Usuario Toyota Corolla Hybrid 2022',
    },
    {
      category: 'Filtro de Aire y Polen',
      description: 'Inspección y cambio según condiciones de uso urbano.',
      targetMileage: 40000,
      targetDate: '2026-11-15',
      status: 'DUE_SOON',
      officialSource: 'Manual de Mantenimiento Preventivo Oficial',
    },
    {
      category: 'Líquido de Frenos DOT 4',
      description: 'Purga y renovación periódica cada 24 meses.',
      targetMileage: 50000,
      targetDate: '2027-05-14',
      status: 'OK',
      officialSource: 'Norma Técnica de Seguridad Hidráulica',
    },
  ],
  'veh-ford-demo': [
    {
      category: 'Service Integral 50.000 km',
      description: 'Inspección de diferenciales, engrase de crucetas y fluidos.',
      targetMileage: 50000,
      targetDate: '2026-12-01',
      status: 'DUE_SOON',
      officialSource: 'Manual Oficial Ford Ranger V6',
    },
  ],
};

export function DemoOwnerView() {
  const [vehicles, setVehicles] = React.useState<SyntheticOwnerVehicle[]>(INITIAL_VEHICLES);
  const [selectedVehicleId, setSelectedVehicleId] = React.useState<string>('veh-toyota-demo');
  const [events, setEvents] = React.useState<SyntheticTimelineEvent[]>(INITIAL_EVENTS);
  const [activeTab, setActiveTab] = React.useState<'timeline' | 'predictions' | 'specs'>('timeline');
  const [isHydrated, setIsHydrated] = React.useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = React.useState<string | null>(null);

  // Modals
  const [serviceModalOpen, setServiceModalOpen] = React.useState(false);
  const [newVehicleModalOpen, setNewVehicleModalOpen] = React.useState(false);

  // Form states for new service
  const [serviceMileage, setServiceMileage] = React.useState<string>('38500');
  const [serviceDate, setServiceDate] = React.useState<string>('2026-10-31');
  const [serviceCategory, setServiceCategory] = React.useState<string>('Aceite y Filtro');
  const [serviceTitle, setServiceTitle] = React.useState<string>('Cambio de Aceite de Motor');
  const [serviceNotes, setServiceNotes] = React.useState<string>('');
  const [serviceFormError, setServiceFormError] = React.useState<string | null>(null);

  // Form states for new vehicle
  const [newPlate, setNewPlate] = React.useState<string>('');
  const [newMake, setNewMake] = React.useState<string>('');
  const [newModel, setNewModel] = React.useState<string>('');
  const [newYear, setNewYear] = React.useState<string>('2022');
  const [newMileage, setNewMileage] = React.useState<string>('30000');
  const [newEngine, setNewEngine] = React.useState<string>('');
  const [newFuelType, setNewFuelType] = React.useState<string>('');
  const [newVin, setNewVin] = React.useState<string>('');
  const [vehicleFormError, setVehicleFormError] = React.useState<string | null>(null);

  // Safe client hydration from localStorage
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.vehicles) && parsed.vehicles.length > 0) {
          setVehicles(parsed.vehicles);
          if (parsed.selectedVehicleId && parsed.vehicles.some((v: SyntheticOwnerVehicle) => v.id === parsed.selectedVehicleId)) {
            setSelectedVehicleId(parsed.selectedVehicleId);
          } else {
            setSelectedVehicleId(parsed.vehicles[0].id);
          }
        }
        if (Array.isArray(parsed.events)) {
          setEvents(parsed.events);
        }
      }
    } catch {
      // LocalStorage access failed or invalid JSON, maintain initial defaults
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Save to localStorage upon mutation (only once hydrated)
  React.useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          vehicles,
          selectedVehicleId,
          events,
        })
      );
    } catch {
      // Silent error in private/restricted storage
    }
  }, [vehicles, selectedVehicleId, events, isHydrated]);

  const currentVehicle =
    vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0] || INITIAL_VEHICLES[0]!;

  // Keep serviceMileage synced with selected vehicle
  React.useEffect(() => {
    if (currentVehicle) {
      setServiceMileage(String(currentVehicle.currentMileage));
    }
  }, [currentVehicle.id, currentVehicle.currentMileage]);

  // Maintenance events for current vehicle, sorted date descending
  const vehicleEvents = React.useMemo(() => {
    return events
      .filter((e) => e.vehicleId === currentVehicle.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [events, currentVehicle.id]);

  const vehiclePredictions = PREDICTIONS[currentVehicle.id] || [];

  const handleResetDemo = () => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        '¿Deseás restablecer los datos de la demostración de Mi Automotors a sus valores iniciales?'
      );
      if (!confirmed) return;
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      setVehicles(INITIAL_VEHICLES);
      setSelectedVehicleId(INITIAL_VEHICLES[0]!.id);
      setEvents(INITIAL_EVENTS);
      setFeedbackMessage('Demostración restablecida a los valores iniciales.');
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    setServiceFormError(null);

    const km = parseInt(serviceMileage, 10);
    if (isNaN(km) || km < currentVehicle.currentMileage) {
      setServiceFormError(
        `El kilometraje ingresado (${formatMileage(km)}) no puede ser inferior al odómetro actual (${formatMileage(currentVehicle.currentMileage)}).`
      );
      return;
    }
    if (!serviceTitle.trim()) {
      setServiceFormError('Ingresá un título descriptivo para la intervención.');
      return;
    }

    const newEvent: SyntheticTimelineEvent = {
      id: `evt-user-${Date.now()}`,
      vehicleId: currentVehicle.id,
      title: serviceTitle.trim(),
      category: serviceCategory,
      origin: 'OWNER_DECLARED',
      mileage: km,
      date: serviceDate,
      notes: serviceNotes.trim() || 'Servicio declarado por el propietario en demostración.',
    };

    setEvents((prev) => [newEvent, ...prev]);

    // Update current vehicle mileage if higher
    if (km > currentVehicle.currentMileage) {
      setVehicles((prev) =>
        prev.map((v) => (v.id === currentVehicle.id ? { ...v, currentMileage: km } : v))
      );
    }

    setServiceModalOpen(false);
    setServiceNotes('');
    setFeedbackMessage('Mantenimiento declarado exitosamente en la memoria de este navegador.');
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    setVehicleFormError(null);

    const plateClean = newPlate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (plateClean.length < 6 || plateClean.length > 9) {
      setVehicleFormError('Ingresá una patente válida (entre 6 y 9 caracteres alfanuméricos, ej. AF123CD o ABC123).');
      return;
    }

    // Duplicate check
    const duplicate = vehicles.some((v) => v.plate.replace(/[^A-Z0-9]/g, '').toUpperCase() === plateClean);
    if (duplicate) {
      setVehicleFormError(`Ya existe un vehículo registrado con la patente ${plateClean} en tu garaje.`);
      return;
    }

    if (!newMake.trim() || !newModel.trim()) {
      setVehicleFormError('Completá la marca y el modelo del vehículo.');
      return;
    }

    const yr = parseInt(newYear, 10);
    const maxYear = new Date().getFullYear() + 1;
    if (isNaN(yr) || yr < 1900 || yr > maxYear) {
      setVehicleFormError(`El año debe ser un número válido entre 1900 y ${maxYear}.`);
      return;
    }

    const km = parseInt(newMileage, 10);
    if (isNaN(km) || km < 0) {
      setVehicleFormError('El kilometraje debe ser un número entero no negativo (0 o mayor).');
      return;
    }

    // Optional fields handling - never invent fake VIN
    const cleanedVin = newVin.trim().toUpperCase();
    const cleanedEngine = newEngine.trim();
    const cleanedFuel = newFuelType.trim();

    const newVeh: SyntheticOwnerVehicle = {
      id: `veh-user-${Date.now()}`,
      plate: plateClean,
      vin: cleanedVin.length > 0 ? cleanedVin : undefined,
      make: newMake.trim(),
      model: newModel.trim(),
      year: yr,
      engine: cleanedEngine.length > 0 ? cleanedEngine : undefined,
      currentMileage: km,
      fuelType: cleanedFuel.length > 0 ? cleanedFuel : undefined,
      isCustom: true,
    };

    setVehicles((prev) => [...prev, newVeh]);
    setSelectedVehicleId(newVeh.id);
    setNewVehicleModalOpen(false);
    setNewPlate('');
    setNewMake('');
    setNewModel('');
    setNewYear('2022');
    setNewMileage('30000');
    setNewEngine('');
    setNewFuelType('');
    setNewVin('');
    setFeedbackMessage(`Vehículo ${newVeh.make} ${newVeh.model} (${newVeh.plate}) agregado y seleccionado.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* ==================================================================== */}
      {/* TOP DEMO NOTICE BANNER                                               */}
      {/* ==================================================================== */}
      <div className="bg-sky-950/70 border-b border-sky-800/80 px-4 py-2.5 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-sky-200">
            <span className="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-sky-300 font-bold uppercase tracking-wider text-[10px]">
              MODO DEMOSTRACIÓN
            </span>
            <span className="text-slate-300">
              Mi Automotors · Los cambios de esta demostración se guardan únicamente en este navegador (localStorage).
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleResetDemo}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 font-semibold transition-colors text-[11px]"
              title="Restablecer flota y servicios a valores originales"
            >
              <RotateCcw className="h-3 w-3 text-sky-400" />
              <span>Restablecer demostración</span>
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 font-semibold transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-sky-400" />
              <span>Volver a la Landing</span>
            </Link>
          </div>
        </div>
      </div>

      {/* FEEDBACK TOAST BANNER */}
      {feedbackMessage && (
        <div className="bg-emerald-950/90 border-b border-emerald-700 px-4 py-2 text-emerald-200 text-xs flex items-center justify-center gap-2 animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* HEADER                                                               */}
      {/* ==================================================================== */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-sky-950">
              <CarFront className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white">Mi Automotors</h1>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-sky-400 font-mono">
                  DEMO PÚBLICA
                </span>
              </div>
              <p className="text-xs text-slate-400">Garaje digital y pasaporte de mantenimiento particular</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setNewVehicleModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="h-3.5 w-3.5 text-emerald-400" />
              <span>Agregar Vehículo</span>
            </button>
            <button
              onClick={() => setServiceModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Registrar Servicio</span>
            </button>
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* RESPONSIVE LAYOUT: SIDEBAR (DESKTOP) + MAIN CONTENT                   */}
      {/* ==================================================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ================================================================ */}
          {/* LEFT COLUMN: GARAJE DIGITAL (VEHICLE LIST)                       */}
          {/* ================================================================ */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Mi Garaje Digital</h2>
                  <span className="text-[11px] text-slate-400">{vehicles.length} unidades registradas</span>
                </div>
                <button
                  onClick={() => setNewVehicleModalOpen(true)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition-colors"
                  title="Agregar nuevo vehículo"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* VEHICLE LIST CARDS */}
              <div className="space-y-2">
                {vehicles.map((v) => {
                  const isSelected = v.id === currentVehicle.id;
                  const vEventsCount = events.filter((e) => e.vehicleId === v.id).length;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVehicleId(v.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-2 ${
                        isSelected
                          ? 'bg-slate-900 border-sky-500 ring-1 ring-sky-500/30 text-white shadow-lg shadow-sky-950/20'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-900/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                              isSelected
                                ? 'bg-sky-500 text-slate-950 font-black'
                                : 'bg-slate-800 text-sky-400'
                            }`}
                          >
                            {v.make.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block leading-tight">
                              {v.make} {v.model}
                            </span>
                            <span className="text-[11px] text-slate-400">Año {v.year}</span>
                          </div>
                        </div>

                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-sky-300 font-bold">
                          {v.plate}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
                        <span className="flex items-center gap-1 text-slate-300">
                          <Gauge className="h-3 w-3 text-slate-500" />
                          <span>{formatMileage(v.currentMileage)}</span>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {vEventsCount} {vEventsCount === 1 ? 'servicio' : 'servicios'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-800/60">
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Podés cambiar de unidad haciendo clic sobre cualquier tarjeta. Los servicios agregados impactan
                  exclusivamente sobre el vehículo activo.
                </p>
              </div>
            </div>

            {/* QUICK ACTIONS BOX */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-950 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-300 block">Acciones Rápidas</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                <button
                  onClick={() => setServiceModalOpen(true)}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Declarar Mantenimiento</span>
                </button>
                <button
                  onClick={() => setNewVehicleModalOpen(true)}
                  className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <CarFront className="h-3.5 w-3.5 text-sky-400" />
                  <span>Agregar Otro Vehículo</span>
                </button>
              </div>
            </div>
          </aside>

          {/* ================================================================ */}
          {/* RIGHT COLUMN: VEHICLE DETAILS, TIMELINE & TABS                    */}
          {/* ================================================================ */}
          <div className="lg:col-span-8 space-y-6">
            {/* CURRENT VEHICLE HERO BANNER */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black text-white">
                      {currentVehicle.make} {currentVehicle.model}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 font-mono font-bold text-xs">
                      {currentVehicle.plate}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
                      {currentVehicle.year}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {currentVehicle.engine ? `Motor: ${currentVehicle.engine}` : 'Motor: No informado'} ·{' '}
                    {currentVehicle.fuelType ? `Combustible: ${currentVehicle.fuelType}` : 'Combustible: No informado'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-right min-w-[120px]">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Odómetro</span>
                    <span className="text-base sm:text-lg font-mono font-bold text-emerald-400">
                      {formatMileage(currentVehicle.currentMileage)}
                    </span>
                  </div>
                  <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-right min-w-[120px]">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Historial</span>
                    <span className="text-base sm:text-lg font-mono font-bold text-sky-400">
                      {vehicleEvents.length} {vehicleEvents.length === 1 ? 'evento' : 'eventos'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* NAVIGATION TABS */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  activeTab === 'timeline'
                    ? 'bg-slate-800 text-sky-400 shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                Historial de Mantenimiento ({vehicleEvents.length})
              </button>
              <button
                onClick={() => setActiveTab('predictions')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  activeTab === 'predictions'
                    ? 'bg-slate-800 text-emerald-400 shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                Orientación Preventiva ({vehiclePredictions.length})
              </button>
              <button
                onClick={() => setActiveTab('specs')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  activeTab === 'specs'
                    ? 'bg-slate-800 text-slate-200 shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                Ficha Técnica y Datos Declarados
              </button>
            </div>

            {/* TAB 1: TIMELINE */}
            {activeTab === 'timeline' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
                  <span>Línea de tiempo cronológica ordenada por fecha más reciente</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="text-slate-300">Taller Certificado</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-slate-400" />
                      <span className="text-slate-300">Declarado por Titular</span>
                    </span>
                  </div>
                </div>

                {vehicleEvents.length === 0 ? (
                  <div className="p-10 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-3">
                    <Clock className="h-10 w-10 text-slate-500 mx-auto" />
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-slate-200">Sin mantenimientos registrados</h3>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        Este vehículo aún no cuenta con intervenciones anotadas en su pasaporte digital. Podés cargar
                        tu primer comprobante o service realizado para comenzar su historial.
                      </p>
                    </div>
                    <button
                      onClick={() => setServiceModalOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Registrar Primer Servicio</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {vehicleEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="p-4 sm:p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors space-y-2.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white">{evt.title}</span>
                            {evt.origin === 'WORKSHOP_CERTIFIED' ? (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3" />
                                <span>TALLER CERTIFICADO</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                                DECLARADO POR TITULAR
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono">
                              {evt.category}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                            <span className="font-bold text-emerald-400 flex items-center gap-1">
                              <Gauge className="h-3.5 w-3.5 text-slate-500" />
                              <span>{formatMileage(evt.mileage)}</span>
                            </span>
                            <span>·</span>
                            <span className="flex items-center gap-1 text-slate-300">
                              <Calendar className="h-3.5 w-3.5 text-slate-500" />
                              <span>{evt.date}</span>
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">{evt.notes}</p>

                        {evt.workshopName && (
                          <div className="pt-1.5 border-t border-slate-800/60 text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                            <span className="text-slate-500">Emisor registrado:</span>
                            <span className="text-slate-300">{evt.workshopName}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PREDICTIONS */}
            {activeTab === 'predictions' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
                  <Info className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-emerald-400">Descargo técnico obligatorio:</strong> La orientación
                    predictiva se basa en los planes de mantenimiento oficial del fabricante según tiempo y kilometraje.
                    Cualquier reemplazo o servicio debe confirmarse mediante inspección física en un taller calificado.
                  </p>
                </div>

                {vehiclePredictions.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
                    <Info className="h-8 w-8 text-slate-500 mx-auto" />
                    <h3 className="text-sm font-semibold text-slate-300">
                      No hay recomendaciones de mantenimiento verificadas disponibles para este vehículo.
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Las predicciones oficiales automáticas requieren un plan de servicio homologado por fabricante
                      en la base de conocimiento para este modelo y motorización específicos.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vehiclePredictions.map((pred, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">{pred.category}</span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                pred.status === 'DUE_SOON'
                                  ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                                  : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                              }`}
                            >
                              {pred.status === 'DUE_SOON' ? 'PRÓXIMO RECAMBIO' : 'ESTADO NORMAL'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{pred.description}</p>
                          <span className="text-[10px] text-slate-500 block italic">
                            Fuente: {pred.officialSource}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-300">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Objetivo</span>
                            <span className="font-bold text-emerald-400">{formatMileage(pred.targetMileage)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 block">Fecha Estimada</span>
                            <span>{pred.targetDate}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: SPECS & DECLARED DATA */}
            {activeTab === 'specs' && (
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="h-4 w-4 text-sky-400" />
                    <span>Ficha Técnica y Datos Declarados</span>
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                    {currentVehicle.isCustom ? 'Datos declarados por usuario' : 'Muestra homologada de prueba'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Marca y Modelo</span>
                    <p className="text-sm font-semibold text-white mt-0.5">
                      {currentVehicle.make} {currentVehicle.model}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Año de Fabricación</span>
                    <p className="text-sm font-semibold text-white mt-0.5">{currentVehicle.year}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Motorización</span>
                    <p className="text-sm font-semibold text-white mt-0.5">
                      {currentVehicle.engine || 'No informado'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Patente de Dominio</span>
                    <p className="text-sm font-mono font-bold text-sky-400 mt-0.5">{currentVehicle.plate}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Identificador VIN</span>
                    <p className="text-sm font-mono font-bold text-slate-300 mt-0.5">
                      {currentVehicle.vin || 'No informado'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Tipo de Combustible</span>
                    <p className="text-sm font-semibold text-white mt-0.5">
                      {currentVehicle.fuelType || 'No informado'}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                  <strong className="text-slate-300">Aclaración de integridad:</strong> Automotors Garage no sintetiza ni
                  certifica un número de chasis (VIN) oficial si el titular o el registro oficial no lo proveyeron. Los
                  campos no ingresados se indican explícitamente como &quot;No informado&quot;.
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ==================================================================== */}
      {/* MODAL 1: REGISTRAR SERVICIO                                          */}
      {/* ==================================================================== */}
      {serviceModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Declarar Mantenimiento</h3>
                <p className="text-xs text-slate-400">
                  Vehículo: {currentVehicle.make} {currentVehicle.model} ({currentVehicle.plate})
                </p>
              </div>
              <button
                onClick={() => setServiceModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {serviceFormError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{serviceFormError}</span>
              </div>
            )}

            <form onSubmit={handleAddService} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Título de la Intervención</label>
                <input
                  type="text"
                  value={serviceTitle}
                  onChange={(e) => setServiceTitle(e.target.value)}
                  placeholder="Ej. Cambio de Aceite 0W-20 y Filtros"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Categoría</label>
                  <select
                    value={serviceCategory}
                    onChange={(e) => setServiceCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Aceite y Filtro">Aceite y Filtro</option>
                    <option value="Frenos">Frenos</option>
                    <option value="Filtros de Aire">Filtros de Aire</option>
                    <option value="Neumáticos">Neumáticos</option>
                    <option value="Bujías">Bujías</option>
                    <option value="Refrigerante">Refrigerante</option>
                    <option value="Mantenimiento General">Mantenimiento General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kilometraje al Realizar</label>
                  <input
                    type="number"
                    value={serviceMileage}
                    onChange={(e) => setServiceMileage(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Fecha de Intervención</label>
                <input
                  type="date"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Detalles / Notas Adicionales</label>
                <textarea
                  value={serviceNotes}
                  onChange={(e) => setServiceNotes(e.target.value)}
                  placeholder="Detalles sobre marca de insumos, taller emisor o comprobantes..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setServiceModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-colors shadow-sm"
                >
                  Guardar en Demostración
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: AGREGAR VEHÍCULO                                            */}
      {/* ==================================================================== */}
      {newVehicleModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Agregar Vehículo al Garaje Demo</h3>
                <p className="text-xs text-slate-400">Incorporá una nueva unidad a tu flota personal de prueba</p>
              </div>
              <button
                onClick={() => setNewVehicleModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {vehicleFormError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{vehicleFormError}</span>
              </div>
            )}

            <form onSubmit={handleAddVehicle} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Patente de Dominio <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newPlate}
                    onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                    placeholder="Ej. AB123CD"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Año de Fabricación <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Marca <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newMake}
                    onChange={(e) => setNewMake(e.target.value)}
                    placeholder="Ej. Peugeot"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Modelo <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    placeholder="Ej. 208 Allure"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Kilometraje Inicial (Odómetro) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  value={newMileage}
                  onChange={(e) => setNewMileage(e.target.value)}
                  min="0"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <div className="border-t border-slate-800/80 pt-3 space-y-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Datos Técnicos Opcionales (pueden dejarse en blanco)
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Motorización</label>
                    <input
                      type="text"
                      value={newEngine}
                      onChange={(e) => setNewEngine(e.target.value)}
                      placeholder="Ej. 1.6L 16v VTi (Opcional)"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Combustible</label>
                    <input
                      type="text"
                      value={newFuelType}
                      onChange={(e) => setNewFuelType(e.target.value)}
                      placeholder="Ej. Nafta / Diésel / GNC (Opcional)"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Número de Chasis (VIN)</label>
                  <input
                    type="text"
                    value={newVin}
                    onChange={(e) => setNewVin(e.target.value.toUpperCase())}
                    placeholder="17 caracteres alfanuméricos (Opcional)"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Si no lo conocés, dejalo en blanco; se reflejará como &quot;No informado&quot; sin inventar códigos ficticios.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setNewVehicleModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold transition-colors shadow-md"
                >
                  Crear Vehículo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
