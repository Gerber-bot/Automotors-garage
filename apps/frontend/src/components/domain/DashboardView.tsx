'use client';

import * as React from 'react';
import {
  Wrench,
  Car,
  ShieldCheck,
  Clock,
  Zap,
  Sparkles,
  ChevronRight,
  MoreVertical,
  ExternalLink,
} from 'lucide-react';
import {
  Button,
  Card,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Dropdown,
  PageHeader,
  SectionHeader,
} from '../ui/index.ts';

export interface DashboardViewProps {
  onQuickServiceClick?: () => void;
  onVehicleClick?: (vehicleId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onQuickServiceClick,
  onVehicleClick,
}) => {
  // Representative Mock Data clearly tagged as simulation for design review
  const kpis = [
    {
      id: 'kpi-orders',
      title: 'Órdenes Activas',
      value: '14',
      subtext: '+3 recepciones hoy',
      trend: '+12% vs sem. ant.',
      icon: <Wrench className="h-5 w-5 text-emerald-400" />,
      badgeVariant: 'success' as const,
    },
    {
      id: 'kpi-bays',
      title: 'Bahías de Trabajo',
      value: '6 / 8',
      subtext: '75% ocupación en planta',
      trend: '2 bahías libres',
      icon: <Car className="h-5 w-5 text-sky-400" />,
      badgeVariant: 'info' as const,
    },
    {
      id: 'kpi-completed',
      title: 'Servicios de Hoy',
      value: '9',
      subtext: 'Tiempo prom. 34 min',
      trend: '100% validados',
      icon: <ShieldCheck className="h-5 w-5 text-emerald-400" />,
      badgeVariant: 'success' as const,
    },
    {
      id: 'kpi-oem',
      title: 'Alertas OEM Pendientes',
      value: '4',
      subtext: '2 vencidas, 2 próximas',
      trend: 'Atención requerida',
      icon: <Clock className="h-5 w-5 text-amber-400" />,
      badgeVariant: 'warning' as const,
    },
  ];

  const recentOrders = [
    {
      id: 'OT-2026-089',
      plate: 'AA 452 CD',
      vehicle: 'Volkswagen Golf VII 1.4 TSI',
      service: 'Service Programado 75.000 km',
      technician: 'Martín Gómez',
      status: 'inProgress' as const,
      statusLabel: 'En Bahía',
      duration: '45 min',
    },
    {
      id: 'OT-2026-088',
      plate: 'AF 123 CD',
      vehicle: 'Toyota Corolla Hybrid 2022',
      service: 'Cambio de Aceite & Filtros (Express)',
      technician: 'Carlos Méndez',
      status: 'success' as const,
      statusLabel: 'Completado',
      duration: '28 min',
    },
    {
      id: 'OT-2026-087',
      plate: 'AD 990 XY',
      vehicle: 'Ford Ranger 3.2 4x4',
      service: 'Pastillas y Discos Delanteros',
      technician: 'Lucas Benítez',
      status: 'warning' as const,
      statusLabel: 'Esperando Repuesto',
      duration: '2h 15m',
    },
    {
      id: 'OT-2026-086',
      plate: 'AE 551 JK',
      vehicle: 'Peugeot 208 1.6 VTi',
      service: 'Diagnóstico OBD-2 (Check Engine DTC P0300)',
      technician: 'Martín Gómez',
      status: 'info' as const,
      statusLabel: 'Diagnóstico IA',
      duration: '15 min',
    },
  ];

  const oemUpcoming = [
    {
      vehicle: 'Toyota Hilux 2.8 D-4D',
      plate: 'AC 782 LL',
      dueKm: '80.000 km',
      currentKm: '79.200 km',
      remaining: 'Faltan 800 km',
      intervention: 'Fluidos de Diferencial & Caja',
      urgency: 'warning' as const,
    },
    {
      vehicle: 'Chevrolet Cruze 1.4 Turbo',
      plate: 'AB 314 MN',
      dueKm: '60.000 km',
      currentKm: '61.400 km',
      remaining: 'Vencido hace 1.400 km',
      intervention: 'Correa de Distribución & Bomba',
      urgency: 'danger' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Simulation Banner */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Badge variant="secondary" size="sm" dot>
            Prototipo UI
          </Badge>
          <span className="hidden sm:inline text-slate-400">
            Datos simulados para validación del Sistema de Diseño (Milestone 10.1).
          </span>
        </div>
        <span className="text-[11px] font-mono text-emerald-400">
          Dark Canvas: #020617 | Acento: #10b981
        </span>
      </div>

      {/* Page Header */}
      <PageHeader
        title="Panel de Control Operativo"
        subtitle="Monitoreo en tiempo real de operaciones, bahías y mantenimiento inteligente"
        badge={
          <Badge variant="success" size="md" dot>
            Operación Activa
          </Badge>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="md"
              leftIcon={<Sparkles className="h-4 w-4 text-emerald-400" />}
            >
              Diagnóstico OBD-2
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Zap className="h-4 w-4 stroke-[2.5]" />}
              onClick={onQuickServiceClick}
            >
              Carga Rápida &lt;60s
            </Button>
          </>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.id} variant="default" className="relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
                  {kpi.title}
                </span>
                <span className="text-2xl font-bold tracking-tight text-white block">
                  {kpi.value}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700/60">
                {kpi.icon}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">{kpi.subtext}</span>
              <Badge variant={kpi.badgeVariant} size="sm">
                {kpi.trend}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      {/* Featured Spotlight Card: Vehicle in Bay #3 */}
      <Card variant="elevated" className="border-emerald-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Badge variant="default" size="sm">
                Vehículo en Bahía #3
              </Badge>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-200">
                Patente: AA 452 CD
              </span>
              <span className="font-mono text-xs text-slate-500 hidden sm:inline">
                VIN: WVWZZZAUZJP123456
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Volkswagen Golf VII 1.4 TSI Highline (2018)
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Alerta de Mantenimiento Preventivo OEM activada por odómetro: servicio mayor de
              75.000 km próximo a vencer. Incluye kit de distribución, bujías y fluidos sintéticos.
            </p>
            <div className="flex items-center gap-4 pt-1 text-xs text-slate-400 font-mono">
              <span>Odómetro actual: 74.850 km</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">Faltan 150 km para service</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <Button
              variant="outline"
              size="md"
              leftIcon={<ExternalLink className="h-4 w-4" />}
              onClick={() => onVehicleClick?.('golf-vii')}
            >
              Pasaporte Digital
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Wrench className="h-4 w-4" />}
            >
              Abrir Orden de Trabajo
            </Button>
          </div>
        </div>
      </Card>

      {/* Two Column Layout: Recent Work Orders & OEM Preventive Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Work Orders (2 Columns on Desktop) */}
        <div className="lg:col-span-2 space-y-4">
          <SectionHeader
            title="Órdenes de Trabajo Recientes"
            description="Flujo operativo en curso y estado de reparaciones"
            actions={
              <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="h-4 w-4" />}>
                Ver todas (14)
              </Button>
            }
          />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orden & Vehículo</TableHead>
                <TableHead>Servicio Solicitado</TableHead>
                <TableHead className="hidden sm:table-cell">Mecánico</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="space-y-0.5">
                      <span className="font-mono font-semibold text-emerald-400 block text-xs">
                        {order.id}
                      </span>
                      <span className="font-medium text-slate-100 block text-xs">
                        {order.vehicle}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {order.plate}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-slate-200 block text-xs font-medium">
                      {order.service}
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Tiempo: {order.duration}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="text-slate-300 text-xs">{order.technician}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        order.status === 'success'
                          ? 'success'
                          : order.status === 'warning'
                          ? 'warning'
                          : order.status === 'inProgress'
                          ? 'inProgress'
                          : 'info'
                      }
                      size="sm"
                      dot
                    >
                      {order.statusLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dropdown
                      trigger={
                        <button
                          aria-label="Acciones de orden"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      }
                      items={[
                        { id: 'view', label: 'Ver Detalle de Orden' },
                        { id: 'print', label: 'Imprimir Comprobante' },
                        {
                          id: 'close',
                          label: 'Cerrar Orden Transaccional',
                          destructive: false,
                        },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* OEM Preventive Service Alerts (1 Column on Desktop) */}
        <div className="space-y-4">
          <SectionHeader
            title="Mantenimiento OEM"
            description="Cálculos predictivos por intervalo"
            actions={
              <Badge variant="warning" size="sm" dot>
                4 Alertas
              </Badge>
            }
          />

          <div className="space-y-3">
            {oemUpcoming.map((item, idx) => (
              <Card key={idx} variant="default" className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-slate-100 block">
                      {item.vehicle}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400 block">
                      {item.plate}
                    </span>
                  </div>
                  <Badge variant={item.urgency} size="sm">
                    {item.remaining}
                  </Badge>
                </div>

                <div className="text-xs text-slate-300 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Intervención Fabricante:
                  </span>
                  <span>{item.intervention}</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Actual: {item.currentKm}</span>
                  <span>Meta: {item.dueKm}</span>
                </div>
              </Card>
            ))}

            <Card variant="bordered" className="p-4 text-center">
              <Sparkles className="h-5 w-5 text-emerald-400 mx-auto mb-2" />
              <h4 className="text-xs font-semibold text-slate-100 mb-1">
                Motor de Reglas Deterministas
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                Calcula automáticamente la próxima intervención según tablas oficiales OEM por km y
                meses transcurridos.
              </p>
              <Button variant="subtle" size="sm" className="w-full">
                Configurar Parámetros OEM
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
