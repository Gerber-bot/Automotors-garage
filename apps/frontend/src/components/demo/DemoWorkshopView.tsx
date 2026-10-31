'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Wrench,
  ArrowLeft,
  Plus,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';

export type WorkOrderStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'WAITING_APPROVAL'
  | 'READY_FOR_DELIVERY'
  | 'CLOSED';

export interface SyntheticWorkOrder {
  id: string;
  orderNumber: string;
  plate: string;
  vehicleModel: string;
  customerName: string;
  reportedMileage: number;
  taskTitle: string;
  description: string;
  status: WorkOrderStatus;
  createdAt: string;
  closedAt?: string;
}

export interface SyntheticCustomer {
  id: string;
  name: string;
  docNumber: string;
  phone: string;
  vehiclePlate: string;
}

const INITIAL_WORK_ORDERS: SyntheticWorkOrder[] = [
  {
    id: 'wo-1',
    orderNumber: 'OT-2026-104',
    plate: 'AD456EF',
    vehicleModel: 'Ford Ranger 4x4',
    customerName: 'Esteban Morales',
    reportedMileage: 48500,
    taskTitle: 'Revisión y Recambio de Tren Delantero',
    description: 'Juego axial en extremos de dirección y bujes de parrilla superior.',
    status: 'IN_PROGRESS',
    createdAt: '2026-10-30',
  },
  {
    id: 'wo-2',
    orderNumber: 'OT-2026-103',
    plate: 'AE789GH',
    vehicleModel: 'Chevrolet Cruze 1.4T',
    customerName: 'Lucía Fernández',
    reportedMileage: 52000,
    taskTitle: 'Quick Service: Aceite y Filtros',
    description: 'Aceite 5W-30 dexos1 Gen3 sintético + filtros Mann + chequeo 20 puntos.',
    status: 'READY_FOR_DELIVERY',
    createdAt: '2026-10-31',
  },
  {
    id: 'wo-3',
    orderNumber: 'OT-2026-102',
    plate: 'AF123CD',
    vehicleModel: 'Toyota Corolla Hybrid',
    customerName: 'Martín Gómez',
    reportedMileage: 38500,
    taskTitle: 'Presupuesto Amortiguadores Traseros',
    description: 'Pérdida hidráulica en amortiguador trasero derecho.',
    status: 'WAITING_APPROVAL',
    createdAt: '2026-10-29',
  },
  {
    id: 'wo-4',
    orderNumber: 'OT-2026-101',
    plate: 'AC123ZZ',
    vehicleModel: 'Volkswagen Amarok V6',
    customerName: 'Transportes del Plata',
    reportedMileage: 60150,
    taskTitle: 'Service Integral de 60.000 km',
    description: 'Fluidos completos, pastillas y discos, escaneo de gestión electrónica.',
    status: 'CLOSED',
    createdAt: '2026-10-25',
    closedAt: '2026-10-26',
  },
];

const SYNTHETIC_CUSTOMERS: SyntheticCustomer[] = [
  { id: 'c-1', name: 'Esteban Morales', docNumber: 'DNI 32.145.890', phone: '+54 11 4455-8899', vehiclePlate: 'AD456EF' },
  { id: 'c-2', name: 'Lucía Fernández', docNumber: 'DNI 35.678.901', phone: '+54 11 5566-7788', vehiclePlate: 'AE789GH' },
  { id: 'c-3', name: 'Martín Gómez', docNumber: 'DNI 28.345.678', phone: '+54 11 6677-8899', vehiclePlate: 'AF123CD' },
  { id: 'c-4', name: 'Transportes del Plata', docNumber: 'CUIT 30-71458923-4', phone: '+54 11 3322-1100', vehiclePlate: 'AC123ZZ' },
];

const OBD_CASES = [
  {
    dtc: 'P0300',
    name: 'Falla de Encendido Múltiple / Aleatoria Detectada',
    protocol: 'SAE J2012 ISO 15031',
    severity: 'ALTA',
    rpm: 2340,
    coolant: 89,
    map: 42,
    shortTrim: '+12.5%',
    checklist: [
      'Comprobar resistencia óhmica de bobinas individuales de ignición.',
      'Inspeccionar luz y estado de electrodos en bujías.',
      'Verificar presión de rampa de inyección de combustible.',
      'Revisar tomas de aire secundario en múltiple de admisión.',
    ],
  },
  {
    dtc: 'P0171',
    name: 'Sistema Demasiado Pobre (Banco 1)',
    protocol: 'SAE J2012 ISO 15031',
    severity: 'MEDIA',
    rpm: 1850,
    coolant: 92,
    map: 34,
    shortTrim: '+24.2%',
    checklist: [
      'Limpiar sensor de flujo de masa de aire (MAF) con solvente dieléctrico.',
      'Inspeccionar manguera de ventilación positiva del cárter (PCV).',
      'Comprobar estanqueidad de juntas de escape previas a sonda lambda.',
    ],
  },
  {
    dtc: 'P0420',
    name: 'Eficiencia del Catalizador por Debajo del Umbral (Banco 1)',
    protocol: 'SAE J2012 ISO 15031',
    severity: 'MODERADA',
    rpm: 2100,
    coolant: 90,
    map: 38,
    shortTrim: '+1.5%',
    checklist: [
      'Comparar osciloscopio de sonda lambda pre-catalizador y post-catalizador.',
      'Comprobar temperatura diferencial en entrada y salida del catalizador.',
      'Descartar fugas de escape adyacentes a sensor secundario.',
    ],
  },
];

export function DemoWorkshopView() {
  const [orders, setOrders] = React.useState<SyntheticWorkOrder[]>(INITIAL_WORK_ORDERS);
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'orders' | 'quick-service' | 'obd' | 'customers'>('dashboard');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');

  // Order Detail Modal
  const [selectedOrder, setSelectedOrder] = React.useState<SyntheticWorkOrder | null>(null);

  // Quick Service form states
  const [qsPlate, setQsPlate] = React.useState<string>('AF123CD');
  const [qsMileage, setQsMileage] = React.useState<string>('39200');
  const [qsInterventions, setQsInterventions] = React.useState<string[]>([
    'Aceite Sintético 0W-20',
    'Filtro de Aceite OEM',
  ]);
  const [qsHumanConfirmed, setQsHumanConfirmed] = React.useState<boolean>(false);
  const [qsFormMessage, setQsFormMessage] = React.useState<string | null>(null);

  // Selected OBD case
  const [activeObdIndex, setActiveObdIndex] = React.useState<number>(0);

  const filteredOrders = statusFilter === 'ALL'
    ? orders
    : orders.filter((o) => o.status === statusFilter);

  const handleAdvanceOrderStatus = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        if (o.status === 'IN_PROGRESS') return { ...o, status: 'READY_FOR_DELIVERY' };
        if (o.status === 'READY_FOR_DELIVERY') {
          return { ...o, status: 'CLOSED', closedAt: '2026-10-31' };
        }
        if (o.status === 'WAITING_APPROVAL') return { ...o, status: 'IN_PROGRESS' };
        return o;
      })
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      const updated = orders.find((o) => o.id === orderId);
      if (updated) {
        if (updated.status === 'IN_PROGRESS') setSelectedOrder({ ...updated, status: 'READY_FOR_DELIVERY' });
        else if (updated.status === 'READY_FOR_DELIVERY') setSelectedOrder({ ...updated, status: 'CLOSED', closedAt: '2026-10-31' });
        else if (updated.status === 'WAITING_APPROVAL') setSelectedOrder({ ...updated, status: 'IN_PROGRESS' });
      }
    }
  };

  const handleQuickServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qsHumanConfirmed) {
      setQsFormMessage('Se exige confirmación humana obligatoria antes del cierre.');
      return;
    }

    const km = parseInt(qsMileage, 10);
    if (isNaN(km) || km <= 0) {
      setQsFormMessage('Ingresá un kilometraje válido.');
      return;
    }

    const newOrder: SyntheticWorkOrder = {
      id: `wo-demo-${Date.now()}`,
      orderNumber: `OT-2026-${orders.length + 105}`,
      plate: qsPlate.toUpperCase(),
      vehicleModel: qsPlate.toUpperCase() === 'AF123CD' ? 'Toyota Corolla Hybrid' : 'Vehículo Recepcionado',
      customerName: 'Cliente Rápido de Box',
      reportedMileage: km,
      taskTitle: 'Quick Service Express',
      description: qsInterventions.join(', '),
      status: 'CLOSED',
      createdAt: '2026-10-31',
      closedAt: '2026-10-31',
    };

    setOrders([newOrder, ...orders]);
    setQsFormMessage('¡Servicio rápido registrado y cerrado exitosamente en memoria local!');
    setQsHumanConfirmed(false);
  };

  const toggleIntervention = (item: string) => {
    if (qsInterventions.includes(item)) {
      setQsInterventions(qsInterventions.filter((i) => i !== item));
    } else {
      setQsInterventions([...qsInterventions, item]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* ==================================================================== */}
      {/* TOP DEMO NOTICE BANNER                                               */}
      {/* ==================================================================== */}
      <div className="bg-emerald-950/70 border-b border-emerald-800/80 px-4 py-2.5 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-200">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold uppercase tracking-wider text-[10px]">
              MODO DEMOSTRACIÓN
            </span>
            <span className="text-slate-300">
              Automotors Pro · Taller ficticio &quot;Garage Pro Centro&quot;. Entorno en memoria local sin backend ni datos productivos.
            </span>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 font-semibold transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-emerald-400" />
            <span>Volver a la Landing</span>
          </Link>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* HEADER & OPERATOR IDENTITY                                           */}
      {/* ==================================================================== */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-emerald-950">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white">Garage Pro Centro</h1>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 font-semibold">
                  TALLER MODELO
                </span>
              </div>
              <p className="text-xs text-slate-400">Operador: Mario Rossi (Técnico Mecánico Demo)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('quick-service')}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nuevo Quick Service</span>
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-slate-800 text-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tablero General
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'orders'
                ? 'bg-slate-800 text-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Órdenes de Trabajo ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('quick-service')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'quick-service'
                ? 'bg-slate-800 text-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Registro Ágil de Servicios
          </button>
          <button
            onClick={() => setActiveTab('obd')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'obd'
                ? 'bg-slate-800 text-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Diagnóstico OBD-II
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'customers'
                ? 'bg-slate-800 text-slate-200'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Clientes y Flota ({SYNTHETIC_CUSTOMERS.length})
          </button>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* MAIN WORKSHOP CONTENT                                                */}
      {/* ==================================================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1 w-full">
        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI METRIC CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Órdenes Totales</span>
                <p className="text-2xl font-mono font-bold text-white">{orders.length}</p>
                <span className="text-[11px] text-emerald-400 font-medium">Activas en sistema</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">En Progreso en Boxes</span>
                <p className="text-2xl font-mono font-bold text-amber-400">
                  {orders.filter((o) => o.status === 'IN_PROGRESS').length}
                </p>
                <span className="text-[11px] text-slate-400">En banco de trabajo</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Listas para Entrega</span>
                <p className="text-2xl font-mono font-bold text-sky-400">
                  {orders.filter((o) => o.status === 'READY_FOR_DELIVERY').length}
                </p>
                <span className="text-[11px] text-slate-400">Inspección final OK</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Cerradas y Certificadas</span>
                <p className="text-2xl font-mono font-bold text-emerald-400">
                  {orders.filter((o) => o.status === 'CLOSED').length}
                </p>
                <span className="text-[11px] text-slate-400">Odómetro certificado</span>
              </div>
            </div>

            {/* QUICK ACTIONS BANNER */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-left">
                <h3 className="text-base font-bold text-white">Registro Ágil de Servicios en Box Rápido</h3>
                <p className="text-xs text-slate-400 max-w-xl">
                  Registrá cambios de aceite, filtros y chequeos rutinarios con confirmación técnica en contrato para emitir certificación formal sin demoras de oficina.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('quick-service')}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 flex-shrink-0"
              >
                <Wrench className="h-4 w-4" />
                <span>Abrir Quick Service</span>
              </button>
            </div>

            {/* RECENT ORDERS TABLE */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Órdenes Activas en el Taller</h3>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs text-emerald-400 hover:underline font-semibold"
                >
                  Ver todas →
                </button>
              </div>
              <div className="space-y-2">
                {orders.slice(0, 3).map((o) => (
                  <div
                    key={o.id}
                    onClick={() => setSelectedOrder(o)}
                    className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-200">{o.orderNumber}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 font-bold">
                          {o.plate}
                        </span>
                        <span className="text-xs text-slate-300 font-semibold">{o.vehicleModel}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{o.taskTitle} · Cliente: {o.customerName}</p>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded font-mono ${
                        o.status === 'IN_PROGRESS'
                          ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                          : o.status === 'READY_FOR_DELIVERY'
                          ? 'bg-sky-500/10 border border-sky-500/30 text-sky-400'
                          : o.status === 'CLOSED'
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {o.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: WORK ORDERS LIST */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-white">Listado Completo de Órdenes de Trabajo</h2>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['ALL', 'IN_PROGRESS', 'WAITING_APPROVAL', 'READY_FOR_DELIVERY', 'CLOSED'] as const).map(
                  (st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        statusFilter === st
                          ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {st === 'ALL' ? 'TODAS' : st}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="space-y-2.5">
              {filteredOrders.map((o) => (
                <div
                  key={o.id}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-white">{o.orderNumber}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-sky-400 font-bold">
                        {o.plate}
                      </span>
                      <span className="text-xs font-bold text-slate-200">{o.vehicleModel}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded font-mono ${
                          o.status === 'IN_PROGRESS'
                            ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                            : o.status === 'READY_FOR_DELIVERY'
                            ? 'bg-sky-500/10 border border-sky-500/30 text-sky-400'
                            : o.status === 'CLOSED'
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {o.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">{o.taskTitle}</p>
                    <p className="text-xs text-slate-400">{o.description}</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Cliente: {o.customerName} · Odómetro: {o.reportedMileage.toLocaleString()} km · Creada: {o.createdAt}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setSelectedOrder(o)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                    >
                      Detalle
                    </button>
                    {o.status !== 'CLOSED' && (
                      <button
                        onClick={() => handleAdvanceOrderStatus(o.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold"
                      >
                        {o.status === 'IN_PROGRESS'
                          ? 'Completar Trabajos'
                          : o.status === 'READY_FOR_DELIVERY'
                          ? 'Cierre Transaccional'
                          : 'Avanzar'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: QUICK SERVICE ENTRY */}
        {activeTab === 'quick-service' && (
          <div className="max-w-2xl mx-auto p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Wrench className="h-4 w-4 text-emerald-400" />
                <span>Registro Ágil de Servicios (Quick Service)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Recepción express de mantenimiento rutinario con confirmación humana técnica en contrato Zod.
              </p>
            </div>

            {qsFormMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span>{qsFormMessage}</span>
              </div>
            )}

            <form onSubmit={handleQuickServiceSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Patente del Vehículo</label>
                  <input
                    type="text"
                    value={qsPlate}
                    onChange={(e) => setQsPlate(e.target.value.toUpperCase())}
                    placeholder="AF123CD"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Odómetro del Tablero (km)</label>
                  <input
                    type="number"
                    value={qsMileage}
                    onChange={(e) => setQsMileage(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-2">Intervenciones Realizadas</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Aceite Sintético 0W-20',
                    'Aceite Sintético 5W-30',
                    'Filtro de Aceite OEM',
                    'Filtro de Aire Motor',
                    'Filtro de Habitáculo',
                    'Pastillas Delanteras',
                    'Rotación de Neumáticos',
                    'Líquido de Frenos DOT4',
                  ].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleIntervention(item)}
                      className={`p-2.5 rounded-lg text-left border transition-all flex items-center justify-between text-xs ${
                        qsInterventions.includes(item)
                          ? 'bg-emerald-950/60 border-emerald-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>{item}</span>
                      {qsInterventions.includes(item) && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* MANDATORY HUMAN CONFIRMATION CHECK */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-slate-200">
                  <input
                    type="checkbox"
                    checked={qsHumanConfirmed}
                    onChange={(e) => setQsHumanConfirmed(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-semibold text-xs block">
                      Confirmación Humana Técnica Obligatoria (Zod Schema)
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Confirmo como técnico calificado que los insumos fueron instalados y el odómetro verificado.
                    </span>
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={!qsHumanConfirmed}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs transition-colors shadow-md"
              >
                Registrar y Certificar en Memoria Demo
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: OBD-II DIAGNOSTICS */}
        {activeTab === 'obd' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
              <Info className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p>
                <strong className="text-amber-400">Diagnóstico técnico simulado:</strong> Muestra representativa de
                decodificación bajo norma internacional SAE J2012 / ISO 15031. No se realiza conexión física con una
                ECU en esta demostración. El diagnóstico físico definitivo exige instrumental de banco o escáner en taller.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {OBD_CASES.map((c, i) => (
                <button
                  key={c.dtc}
                  onClick={() => setActiveObdIndex(i)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                    activeObdIndex === i
                      ? 'bg-rose-950 border border-rose-500 text-rose-300 shadow'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  DTC {c.dtc}
                </button>
              ))}
            </div>

            {/* OBD DETAILS CARD */}
            {(() => {
              const currentCase = OBD_CASES[activeObdIndex]!;
              return (
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-mono font-bold text-rose-400">{currentCase.dtc}</span>
                        <span className="text-sm font-bold text-white">{currentCase.name}</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">Protocolo: {currentCase.protocol}</span>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400">
                      SEVERIDAD: {currentCase.severity}
                    </span>
                  </div>

                  {/* FREEZE FRAME PARAMS */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Parámetros Freeze Frame (Momento de Falla)
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">Régimen Motor</span>
                        <span className="text-sm font-bold text-white">{currentCase.rpm} RPM</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">Temp. Refrigerante</span>
                        <span className="text-sm font-bold text-white">{currentCase.coolant} °C</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">Presión MAP</span>
                        <span className="text-sm font-bold text-white">{currentCase.map} kPa</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">Ajuste Combustible (STFT)</span>
                        <span className="text-sm font-bold text-amber-400">{currentCase.shortTrim}</span>
                      </div>
                    </div>
                  </div>

                  {/* CHECKLIST */}
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Checklist Técnico Orientativo para el Mecánico
                    </h4>
                    <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                      {currentCase.checklist.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 5: CUSTOMERS & FLEET */}
        {activeTab === 'customers' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-white">Directorio Sintético de Clientes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {SYNTHETIC_CUSTOMERS.map((c) => (
                <div key={c.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{c.name}</span>
                    <span className="font-mono text-[10px] text-sky-400 bg-sky-950/60 border border-sky-800/40 px-1.5 py-0.5 rounded">
                      {c.vehiclePlate}
                    </span>
                  </div>
                  <p className="text-slate-400 font-mono">{c.docNumber}</p>
                  <p className="text-slate-400">{c.phone}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ==================================================================== */}
      {/* ORDER DETAIL MODAL                                                   */}
      {/* ==================================================================== */}
      {selectedOrder && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Orden de Trabajo {selectedOrder.orderNumber}
                </h3>
                <span className="text-xs font-mono text-sky-400">
                  {selectedOrder.vehicleModel} ({selectedOrder.plate})
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Tarea Asignada</span>
                <p className="text-sm font-bold text-white">{selectedOrder.taskTitle}</p>
                <p className="text-slate-400">{selectedOrder.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Cliente</span>
                  <span className="text-white font-sans">{selectedOrder.customerName}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Odómetro Reportado</span>
                  <span className="text-emerald-400">{selectedOrder.reportedMileage.toLocaleString()} km</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400">Estado actual:</span>
                <span className="font-mono font-bold text-white px-2 py-0.5 rounded bg-slate-800">
                  {selectedOrder.status}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs transition-colors"
              >
                Cerrar
              </button>
              {selectedOrder.status !== 'CLOSED' && (
                <button
                  onClick={() => {
                    handleAdvanceOrderStatus(selectedOrder.id);
                  }}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
                >
                  Avanzar Estado
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
