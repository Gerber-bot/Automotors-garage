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
} from 'lucide-react';

export interface SyntheticOwnerVehicle {
  id: string;
  plate: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  engine: string;
  currentMileage: number;
  fuelType: string;
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

  // Modal states
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
  const [newYear, setNewYear] = React.useState<string>('2021');
  const [newMileage, setNewMileage] = React.useState<string>('25000');
  const [vehicleFormError, setVehicleFormError] = React.useState<string | null>(null);

  const currentVehicle = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0]!;
  const vehicleEvents = events.filter((e) => e.vehicleId === currentVehicle.id);
  const vehiclePredictions = PREDICTIONS[currentVehicle.id] || [];

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    setServiceFormError(null);

    const km = parseInt(serviceMileage, 10);
    if (isNaN(km) || km < currentVehicle.currentMileage) {
      setServiceFormError(`El kilometraje no puede ser inferior al actual (${currentVehicle.currentMileage} km).`);
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

    setEvents([newEvent, ...events]);

    // Update current vehicle mileage if higher
    if (km > currentVehicle.currentMileage) {
      setVehicles(
        vehicles.map((v) => (v.id === currentVehicle.id ? { ...v, currentMileage: km } : v))
      );
    }

    setServiceModalOpen(false);
    setServiceNotes('');
  };

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    setVehicleFormError(null);

    const plateClean = newPlate.trim().toUpperCase();
    if (plateClean.length < 6) {
      setVehicleFormError('Ingresá una patente válida (ej. AB123CD o ABC123).');
      return;
    }
    if (!newMake.trim() || !newModel.trim()) {
      setVehicleFormError('Completá la marca y el modelo del vehículo.');
      return;
    }

    const km = parseInt(newMileage, 10) || 0;
    const yr = parseInt(newYear, 10) || 2020;

    const newVeh: SyntheticOwnerVehicle = {
      id: `veh-user-${Date.now()}`,
      plate: plateClean,
      vin: `DEMO${Date.now()}`,
      make: newMake.trim(),
      model: newModel.trim(),
      year: yr,
      engine: 'Motor Estándar',
      currentMileage: km,
      fuelType: 'Nafta',
    };

    setVehicles([...vehicles, newVeh]);
    setSelectedVehicleId(newVeh.id);
    setNewVehicleModalOpen(false);
    setNewPlate('');
    setNewMake('');
    setNewModel('');
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
              Mi Automotors · Datos sintéticos en memoria local. No interactúa con el servidor ni datos reales.
            </span>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 font-semibold transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-sky-400" />
            <span>Volver a la Landing</span>
          </Link>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* HEADER & VEHICLE SWITCHER                                            */}
      {/* ==================================================================== */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-sky-950">
              <CarFront className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Mi Automotors</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-sky-400 font-mono">
                  DEMO PÚBLICA
                </span>
              </h1>
              <p className="text-xs text-slate-400">Garaje digital de propietario particular</p>
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

        {/* VEHICLE SELECTOR PILLS */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3 flex items-center gap-2 overflow-x-auto">
          {vehicles.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedVehicleId(v.id)}
              className={`px-3 py-2 rounded-xl text-left border transition-all flex items-center gap-3 flex-shrink-0 ${
                v.id === currentVehicle.id
                  ? 'bg-slate-900 border-sky-500 text-white shadow-md'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="h-7 w-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-xs">
                {v.make.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">{v.make} {v.model}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-semibold">
                    {v.plate}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {v.currentMileage.toLocaleString()} km
                </span>
              </div>
            </button>
          ))}
        </div>
      </header>

      {/* ==================================================================== */}
      {/* MAIN CONTENT AREA                                                    */}
      {/* ==================================================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1 w-full">
        {/* VEHICLE QUICK SUMMARY CARD */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-extrabold text-white">
                {currentVehicle.make} {currentVehicle.model} ({currentVehicle.year})
              </h2>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-xs">
                {currentVehicle.plate}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400">
              VIN: {currentVehicle.vin} · Motor: {currentVehicle.engine} · Combustible: {currentVehicle.fuelType}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Odómetro Actual</span>
              <span className="text-base sm:text-lg font-mono font-bold text-emerald-400">
                {currentVehicle.currentMileage.toLocaleString()} km
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Servicios Registrados</span>
              <span className="text-base sm:text-lg font-mono font-bold text-sky-400">
                {vehicleEvents.length} eventos
              </span>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'timeline'
                ? 'bg-slate-800 text-sky-400 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Historial de Mantenimiento ({vehicleEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('predictions')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'predictions'
                ? 'bg-slate-800 text-emerald-400 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Orientación Preventiva ({vehiclePredictions.length})
          </button>
          <button
            onClick={() => setActiveTab('specs')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'specs'
                ? 'bg-slate-800 text-slate-200 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ficha Técnica
          </button>
        </div>

        {/* TAB 1: TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Línea de tiempo cronológica con distinción de origen</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>Certificado por Taller</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  <span>Declarado por Dueño</span>
                </span>
              </div>
            </div>

            {vehicleEvents.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
                <Clock className="h-8 w-8 text-slate-500 mx-auto" />
                <h3 className="text-sm font-semibold text-slate-300">Sin mantenimientos registrados</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Registrá el primer servicio con el botón superior para comenzar tu pasaporte digital.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {vehicleEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">{evt.title}</span>
                        {evt.origin === 'WORKSHOP_CERTIFIED' ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            <span>TALLER CERTIFICADO</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                            DECLARADO POR DUEÑO
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono">
                          {evt.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                        <span className="font-bold text-slate-200">{evt.mileage.toLocaleString()} km</span>
                        <span>·</span>
                        <span>{evt.date}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{evt.notes}</p>

                    {evt.workshopName && (
                      <div className="pt-1 text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                        <span className="text-slate-500">Emisor:</span>
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
                <strong className="text-emerald-400">Descargo técnico obligatorio:</strong> Orientación técnica
                preventiva. La decisión de recambio o reparación siempre debe validarse mediante inspección física en
                taller calificado. Las estimaciones se fundan en datos oficiales por tiempo y kilometraje.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vehiclePredictions.map((pred, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 flex flex-col justify-between"
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
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-300">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Objetivo</span>
                      <span>{pred.targetMileage.toLocaleString()} km</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Fecha Estimada</span>
                      <span>{pred.targetDate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: SPECS */}
        {activeTab === 'specs' && (
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white">Ficha Técnica Oficial del Vehículo</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Marca y Modelo</span>
                <p className="text-sm font-semibold text-white mt-0.5">{currentVehicle.make} {currentVehicle.model}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Año de Fabricación</span>
                <p className="text-sm font-semibold text-white mt-0.5">{currentVehicle.year}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Motorización</span>
                <p className="text-sm font-semibold text-white mt-0.5">{currentVehicle.engine}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Patente de Dominio</span>
                <p className="text-sm font-mono font-bold text-sky-400 mt-0.5">{currentVehicle.plate}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Código VIN</span>
                <p className="text-sm font-mono font-bold text-slate-300 mt-0.5">{currentVehicle.vin}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Tipo de Combustible</span>
                <p className="text-sm font-semibold text-white mt-0.5">{currentVehicle.fuelType}</p>
              </div>
            </div>
          </div>
        )}
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
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-colors"
                >
                  Guardar en Memoria Demo
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
                  <label className="block text-slate-300 font-semibold mb-1">Patente de Dominio</label>
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
                  <label className="block text-slate-300 font-semibold mb-1">Año</label>
                  <input
                    type="number"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Marca</label>
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
                  <label className="block text-slate-300 font-semibold mb-1">Modelo</label>
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
                <label className="block text-slate-300 font-semibold mb-1">Kilometraje Inicial</label>
                <input
                  type="number"
                  value={newMileage}
                  onChange={(e) => setNewMileage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
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
                  className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold transition-colors"
                >
                  Crear Vehículo Demo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
