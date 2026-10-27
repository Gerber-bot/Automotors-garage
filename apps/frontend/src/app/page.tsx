import React, { useState } from 'react';
import { Header } from '../components/layout/Header.tsx';
import { ServiceQuickEntry } from '../components/domain/ServiceQuickEntry.tsx';
import { VehicleCard } from '../components/domain/VehicleCard.tsx';
import { StatusBadge } from '../components/domain/StatusBadge.tsx';
import { MaintenanceTimeline } from '../components/domain/MaintenanceTimeline.tsx';
import { MaintenancePredictionCard } from '../components/domain/MaintenancePredictionCard.tsx';
import { WorkOrderForm } from '../components/domain/WorkOrderForm.tsx';
import { EvidenceUploader } from '../components/domain/EvidenceUploader.tsx';
import { VoiceRecorder } from '../components/domain/VoiceRecorder.tsx';
import { MOCK_VEHICLES, MOCK_WORK_ORDERS } from '../api/mock-backend.ts';
import type { Vehicle, WorkOrder } from '../api/contracts.ts';

type ActiveTab =
  | 'DASHBOARD'
  | 'QUICK_SERVICE'
  | 'VEHICLES'
  | 'WORK_ORDERS'
  | 'PREVENTIVE'
  | 'AI_ASSISTANT'
  | 'PASSPORT'
  | 'SETTINGS';

export default function AppDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('DASHBOARD');
  const [vehicles, setVehicles] = useState<Vehicle[]>(MOCK_VEHICLES);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(MOCK_WORK_ORDERS);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle>(MOCK_VEHICLES[0]!);
  const [filterPlate, setFilterPlate] = useState('');
  const [obdCodeInput, setObdCodeInput] = useState('P0300, P0171');
  const [obdResult, setObdResult] = useState<string | null>(null);

  const filteredVehicles = vehicles.filter(
    (v) =>
      !filterPlate ||
      (v.plate && v.plate.toLowerCase().includes(filterPlate.toLowerCase())) ||
      v.make.toLowerCase().includes(filterPlate.toLowerCase()) ||
      v.model.toLowerCase().includes(filterPlate.toLowerCase())
  );

  const handleSimulateObdScan = () => {
    setObdResult(
      'Análisis OBD2: P0300 (Falla de encendido múltiple) + P0171 (Mezcla pobre en Banco 1). Causa más probable: Fuga de vacío en múltiple de admisión o inyectores sucios. Acción: Prueba de humo.'
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      <Header
        workshopName="Alpha Motors Garage"
        activeRole="WORKSHOP_OWNER"
        onQuickServiceClick={() => setActiveTab('QUICK_SERVICE')}
      />

      {/* Navigation Bar */}
      <nav className="border-b border-slate-800/80 bg-slate-900/60 px-4 md:px-6 overflow-x-auto py-2.5">
        <div className="flex items-center gap-1.5 min-w-max text-xs md:text-sm">
          <button
            type="button"
            onClick={() => setActiveTab('DASHBOARD')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'DASHBOARD'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📊 Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('QUICK_SERVICE')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'QUICK_SERVICE'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/60'
                : 'text-emerald-400 hover:bg-emerald-950/40 border border-emerald-500/30'
            }`}
          >
            ⚡ Quick Service (&lt;60s)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('WORK_ORDERS')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'WORK_ORDERS'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🛠️ Órdenes de Trabajo ({workOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('VEHICLES')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'VEHICLES'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🚗 Vehículos ({vehicles.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PREVENTIVE')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'PREVENTIVE'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⏱️ Próximos Services
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('AI_ASSISTANT')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'AI_ASSISTANT'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🧠 Asistente IA &amp; OBD2
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PASSPORT')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'PASSPORT'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🛡️ Pasaporte QR (B2C)
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
        {/* VIEW 1: DASHBOARD */}
        {activeTab === 'DASHBOARD' && (
          <div className="space-y-6 animate-fadeIn">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Órdenes Activas
                </span>
                <p className="text-2xl md:text-3xl font-extrabold text-emerald-400 font-mono mt-1">
                  {workOrders.filter((w) => w.status !== 'COMPLETED').length}
                </p>
                <span className="text-[10px] text-slate-500">En taller hoy</span>
              </div>
              <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Completadas
                </span>
                <p className="text-2xl md:text-3xl font-extrabold text-slate-100 font-mono mt-1">
                  {workOrders.filter((w) => w.status === 'COMPLETED').length}
                </p>
                <span className="text-[10px] text-emerald-500 font-medium">100% verificadas</span>
              </div>
              <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Flota Registrada
                </span>
                <p className="text-2xl md:text-3xl font-extrabold text-slate-100 font-mono mt-1">
                  {vehicles.length}
                </p>
                <span className="text-[10px] text-slate-500">Con pasaporte activo</span>
              </div>
              <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Vencimientos Prox.
                </span>
                <p className="text-2xl md:text-3xl font-extrabold text-amber-400 font-mono mt-1">
                  2
                </p>
                <span className="text-[10px] text-amber-500 font-medium">Recordatorios listos</span>
              </div>
            </div>

            {/* Quick Access Banner */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider">
                  Entrada Rápida de Vehículo
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  ¿Ingresó un service de rutina?
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  Buscá por patente, seleccioná aceite y filtros, o dictá por voz con IA para guardarlo en menos de un minuto.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('QUICK_SERVICE')}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap"
              >
                Abrir Quick Service ⚡
              </button>
            </div>

            {/* Recent Work Orders Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
              <h3 className="font-bold text-base text-slate-100 mb-4">
                Órdenes de Trabajo Recientes
              </h3>
              <div className="space-y-3">
                {workOrders.map((wo) => {
                  const vehicle = vehicles.find((v) => v.id === wo.vehicleId);
                  return (
                    <div
                      key={wo.id}
                      className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {vehicle?.plate && (
                            <span className="font-mono text-xs font-bold px-2 py-0.5 bg-black text-slate-100 rounded border border-slate-700">
                              {vehicle.plate}
                            </span>
                          )}
                          <span className="font-semibold text-sm text-slate-200">
                            {vehicle?.make} {vehicle?.model}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{wo.reportedIssue}</p>
                      </div>
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span className="text-xs font-mono text-slate-400">
                          {wo.reportedMileage.toLocaleString()} km
                        </span>
                        <StatusBadge status={wo.status} size="sm" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: QUICK SERVICE ENTRY */}
        {activeTab === 'QUICK_SERVICE' && (
          <div className="animate-fadeIn">
            <ServiceQuickEntry
              initialVehicles={vehicles}
              onServiceSaved={(res) => {
                // Update local vehicle mileage
                setVehicles((prev) =>
                  prev.map((v) =>
                    v.id === res.vehicleId ? { ...v, currentMileage: res.odometerKm } : v
                  )
                );
              }}
            />
          </div>
        )}

        {/* VIEW 3: VEHICLES & PASSPORT DETAIL */}
        {activeTab === 'VEHICLES' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-100">Parque Automotor Registrado</h2>
              <input
                type="text"
                placeholder="Filtrar por patente o modelo..."
                value={filterPlate}
                onChange={(e) => setFilterPlate(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 font-mono w-full sm:w-64"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Vehicles List */}
              <div className="space-y-3">
                {filteredVehicles.map((vehicle) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    isSelected={selectedVehicle.id === vehicle.id}
                    onSelect={(v) => setSelectedVehicle(v)}
                  />
                ))}
              </div>

              {/* Selected Vehicle Passport Detail */}
              <div className="md:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
                <div className="border-b border-slate-800 pb-3 mb-4 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-black text-emerald-400 rounded border border-slate-700 mr-2 uppercase">
                      {selectedVehicle.plate ?? 'S/P'}
                    </span>
                    <span className="text-lg font-bold text-slate-100">
                      {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.year})
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    VIN: {selectedVehicle.vin ?? 'No especificado'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5 text-xs">
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block">Odómetro Actual</span>
                    <strong className="text-emerald-400 font-mono text-sm">
                      {selectedVehicle.currentMileage.toLocaleString()} km
                    </strong>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block">Motor</span>
                    <strong className="text-slate-200">{selectedVehicle.engine ?? 'Standard'}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block">Combustible</span>
                    <strong className="text-slate-200">{selectedVehicle.fuelType ?? 'N/A'}</strong>
                  </div>
                </div>

                <h4 className="font-bold text-sm text-slate-200 mb-2">
                  Historial de Intervenciones Certificadas
                </h4>
                <MaintenanceTimeline
                  entries={[
                    {
                      recordId: 'rec-101',
                      serviceDate: '2026-06-15T14:30:00Z',
                      recordedMileage: 35000,
                      workshopName: 'Alpha Motors Garage',
                      verificationLevel: 'CORROBORATED',
                      isCertified: true,
                      servicesPerformed: [
                        { title: 'Aceite Sintético 0W20', category: 'Lubricación' },
                        { title: 'Pastillas Cerámicas Delanteras', category: 'Frenos' },
                      ],
                      hasPhotographicEvidence: true,
                      internalNotes: 'Discos con desgaste normal, sin alabeo.',
                      isOwnRecord: true,
                    },
                    {
                      recordId: 'rec-102',
                      serviceDate: '2025-10-10T10:00:00Z',
                      recordedMileage: 20000,
                      workshopName: 'Beta Service Oficial',
                      verificationLevel: 'IDENTIFIED_WORKSHOP',
                      isCertified: true,
                      servicesPerformed: [{ title: 'Service 20,000 km', category: 'Mantenimiento General' }],
                      hasPhotographicEvidence: false,
                      isOwnRecord: false, // External shop: internal notes redacted!
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: WORK ORDERS */}
        {activeTab === 'WORK_ORDERS' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-100">Órdenes de Trabajo</h2>
              <button
                type="button"
                onClick={() => setActiveTab('QUICK_SERVICE')}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all"
              >
                + Nueva Orden
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workOrders.map((wo) => (
                <div key={wo.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-mono text-xs text-slate-400">{wo.id}</span>
                    <StatusBadge status={wo.status} size="sm" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-100 text-sm">{wo.reportedIssue}</h4>
                    {wo.diagnosis && (
                      <p className="text-xs text-slate-400 mt-1 bg-slate-950 p-2 rounded border border-slate-800/80">
                        <strong className="text-slate-300">Diagnóstico:</strong> {wo.diagnosis}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60 font-mono">
                    <span>Odómetro: {wo.reportedMileage.toLocaleString()} km</span>
                    <span>Intervenciones: {wo.interventions.length}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 5: PREVENTIVE MAINTENANCE PREDICTIONS */}
        {activeTab === 'PREVENTIVE' && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-xl font-bold text-slate-100">
              Vencimientos Preventivos Deterministas (Toyota Corolla 2022)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <MaintenancePredictionCard
                category="OIL_AND_FILTER"
                status="UPCOMING_SOON"
                nextDueMileage={40000}
                remainingKm={5000}
                nextDueDate="2026-11-15T00:00:00Z"
                confidence="HIGH"
                sourceCitation="Manual Toyota Corolla 2022 p. 142"
              />
              <MaintenancePredictionCard
                category="BRAKES"
                status="OK"
                nextDueMileage={50000}
                remainingKm={15000}
                nextDueDate="2027-06-01T00:00:00Z"
                confidence="MEDIUM"
                sourceCitation="Manual Toyota Corolla 2022 p. 150"
              />
              <MaintenancePredictionCard
                category="TIMING_BELT"
                status="INSUFFICIENT_DATA"
                nextDueMileage={null}
                remainingKm={null}
                nextDueDate={null}
                confidence="NONE"
                warning="Vehículo equipado con cadena de distribución metálica de por vida. Inspección visual recomendada a los 100k km."
              />
            </div>
          </div>
        )}

        {/* VIEW 6: AI ASSISTANT & OBD2 */}
        {activeTab === 'AI_ASSISTANT' && (
          <div className="space-y-6 animate-fadeIn max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-slate-100">
              Asistente de IA &amp; Diagnóstico OBD2
            </h2>

            {/* OBD2 Scanner Interpretation Card */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <h3 className="font-bold text-base text-slate-200">
                Interpretador de Códigos OBD2 / DTC
              </h3>
              <p className="text-xs text-slate-400">
                Ingresá los códigos arrojados por el scanner para recibir una guía técnica orientativa.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={obdCodeInput}
                  onChange={(e) => setObdCodeInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 font-mono text-sm text-slate-100 focus:outline-none focus:border-emerald-500 uppercase"
                />
                <button
                  type="button"
                  onClick={handleSimulateObdScan}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all"
                >
                  Analizar DTC
                </button>
              </div>

              {obdResult && (
                <div className="p-3 bg-slate-950 border border-emerald-500/50 rounded-xl text-xs text-slate-200 space-y-2 animate-fadeIn">
                  <p>{obdResult}</p>
                  <span className="block text-[10px] text-amber-400 font-medium">
                    ⚠️ Descargo obligatorio: Sugerencia asistida por IA orientativa. Se requiere diagnóstico físico del técnico.
                  </span>
                </div>
              )}
            </div>

            {/* Evidence Uploader Demo */}
            <EvidenceUploader />
          </div>
        )}

        {/* VIEW 7: B2C PUBLIC PASSPORT */}
        {activeTab === 'PASSPORT' && (
          <div className="max-w-xl mx-auto space-y-6 animate-fadeIn">
            <div className="p-6 bg-slate-900 border border-emerald-500/40 rounded-2xl shadow-xl text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-950 rounded-2xl border border-emerald-500/50 flex items-center justify-center text-3xl mx-auto shadow-inner">
                🛡️
              </div>
              <div>
                <span className="text-[11px] font-mono text-emerald-400 font-bold tracking-wider uppercase">
                  Pasaporte Digital Verificable
                </span>
                <h3 className="text-2xl font-black text-white mt-1">
                  {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.year})
                </h3>
                <span className="inline-block mt-2 px-3 py-1 bg-black font-mono font-bold text-sm text-slate-100 rounded border border-slate-700">
                  {selectedVehicle.plate ?? 'S/P'}
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-around text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px]">Odómetro Certificado</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    {selectedVehicle.currentMileage.toLocaleString()} km
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Servicios Verificados</span>
                  <span className="text-slate-200 font-bold text-sm">2 intervenciones</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 text-left">
                ℹ️ Esta vista pública censura datos de contacto personales (PII) y márgenes comerciales del taller para proteger la privacidad.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
