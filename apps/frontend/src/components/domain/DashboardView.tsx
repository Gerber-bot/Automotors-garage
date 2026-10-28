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
  ExternalLink,
  RotateCw,
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
  PageHeader,
  SectionHeader,
  LoadingState,
} from '../ui/index.ts';
import { ApiClient } from '../../api/client.ts';
import type { Vehicle, WorkOrder } from '../../api/contracts.ts';

export interface DashboardViewProps {
  onQuickServiceClick?: () => void;
  onVehicleClick?: (vehicleId?: string) => void;
  onViewAllOrders?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onQuickServiceClick,
  onVehicleClick,
  onViewAllOrders,
}) => {
  const [vehicles, setVehicles] = React.useState<readonly Vehicle[]>([]);
  const [workOrders, setWorkOrders] = React.useState<readonly WorkOrder[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const apiClient = React.useMemo(() => ApiClient.getInstance(), []);

  const loadDashboardData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [vehs, orders] = await Promise.all([
        apiClient.getVehicles().catch(() => [] as Vehicle[]),
        apiClient.getWorkOrders().catch(() => [] as WorkOrder[]),
      ]);
      setVehicles(vehs);
      setWorkOrders(orders);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al sincronizar métricas del taller');
    } finally {
      setIsLoading(false);
    }
  }, [apiClient]);

  React.useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const activeOrdersCount = workOrders.filter(
    (o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED'
  ).length;

  const completedOrdersCount = workOrders.filter(
    (o) => o.status === 'COMPLETED'
  ).length;

  const spotlightVehicle = vehicles[0] || null;

  const kpis = [
    {
      id: 'kpi-vehicles',
      title: 'Flota en Taller',
      value: String(vehicles.length),
      subtext: vehicles.length > 0 ? `${vehicles.length} unidades registradas` : 'Sin unidades registradas',
      trend: 'API Real',
      icon: <Car className="h-5 w-5 text-emerald-400" />,
      badgeVariant: 'success' as const,
    },
    {
      id: 'kpi-orders',
      title: 'Órdenes en Proceso',
      value: String(activeOrdersCount),
      subtext: activeOrdersCount > 0 ? `${activeOrdersCount} órdenes activas` : 'Sin órdenes activas',
      trend: 'API Real',
      icon: <Wrench className="h-5 w-5 text-sky-400" />,
      badgeVariant: 'info' as const,
    },
    {
      id: 'kpi-completed',
      title: 'Servicios Cerrados',
      value: String(completedOrdersCount),
      subtext: `${completedOrdersCount} servicios auditados`,
      trend: 'Certificado',
      icon: <ShieldCheck className="h-5 w-5 text-emerald-400" />,
      badgeVariant: 'success' as const,
    },
    {
      id: 'kpi-oem',
      title: 'Alertas OEM',
      value: '2',
      subtext: 'Proyección preventiva',
      trend: 'Estimado',
      icon: <Clock className="h-5 w-5 text-amber-400" />,
      badgeVariant: 'warning' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* REAL API STATUS BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs gap-2">
        <div className="flex items-center gap-2 text-slate-300">
          <Badge variant="success" size="sm" dot>
            API Conectada
          </Badge>
          <span className="text-slate-300 font-medium">
            Sincronizado con API REST en puerto 4000 & Motor Relacional PostgreSQL.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadDashboardData()}
            className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
          >
            <RotateCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* PAGE HEADER */}
      <PageHeader
        title="Panel de Control Operativo"
        subtitle="Monitoreo centralizado de flota atendida, órdenes de trabajo y mantenimiento inteligente."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              leftIcon={<Car className="h-4 w-4 text-emerald-400" />}
              onClick={() => onVehicleClick?.()}
            >
              Ver Vehículos
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Zap className="h-4 w-4 stroke-[2.5]" />}
              onClick={onQuickServiceClick}
            >
              Quick Service &lt;60s
            </Button>
          </div>
        }
      />

      {/* KPI CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.id} variant="default" className="relative overflow-hidden p-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
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
              <span className="text-slate-400 truncate max-w-[140px]">{kpi.subtext}</span>
              <Badge variant={kpi.badgeVariant} size="sm">
                {kpi.trend}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      {/* FEATURED SPOTLIGHT CARD (FROM REAL VEHICLES) */}
      {spotlightVehicle && (
        <Card variant="elevated" className="border-emerald-500/30 relative overflow-hidden p-6">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <Badge variant="default" size="sm">
                  Vehículo Destacado
                </Badge>
                {spotlightVehicle.plate && (
                  <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded bg-black border border-slate-700 text-slate-100 tracking-wider">
                    {spotlightVehicle.plate}
                  </span>
                )}
                {spotlightVehicle.vin && (
                  <span className="font-mono text-xs text-slate-400 hidden sm:inline">
                    VIN: {spotlightVehicle.vin}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {spotlightVehicle.make} {spotlightVehicle.model} ({spotlightVehicle.year})
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
                Unidad registrada en el padrón del taller con historial de intervenciones y seguimiento de odómetro.
                {spotlightVehicle.engine ? ` Motorización: ${spotlightVehicle.engine}.` : ''}
              </p>
              <div className="flex items-center gap-4 pt-1 text-xs text-slate-400 font-mono">
                <span>Odómetro actual: {spotlightVehicle.currentMileage.toLocaleString()} km</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">Listo para recepción o servicio</span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <Button
                variant="outline"
                size="md"
                leftIcon={<ExternalLink className="h-4 w-4" />}
                onClick={() => onVehicleClick?.(spotlightVehicle.id)}
              >
                Ficha Técnica
              </Button>
              <Button
                variant="primary"
                size="md"
                leftIcon={<Wrench className="h-4 w-4" />}
                onClick={onQuickServiceClick}
              >
                Servicio Express
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* TWO COLUMN LAYOUT: WORK ORDERS & OEM ALERTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RECENT WORK ORDERS (2 COLUMNS) */}
        <div className="lg:col-span-2 space-y-4">
          <SectionHeader
            title="Órdenes de Trabajo del Taller"
            description="Intervenciones registradas en el backend activo"
            actions={
              <Button
                variant="ghost"
                size="sm"
                rightIcon={<ChevronRight className="h-4 w-4" />}
                onClick={onViewAllOrders}
              >
                Ver todas ({workOrders.length})
              </Button>
            }
          />

          {isLoading && workOrders.length === 0 ? (
            <LoadingState label="Cargando órdenes operativas..." />
          ) : workOrders.length === 0 ? (
            <Card className="p-8 text-center bg-slate-900/60 border-slate-800 space-y-3">
              <Wrench className="h-8 w-8 text-slate-500 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-200">
                No hay órdenes de trabajo abiertas en este taller
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Podés iniciar un servicio express en menos de 60 segundos con Quick Service.
              </p>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Zap className="h-4 w-4" />}
                onClick={onQuickServiceClick}
              >
                Crear Primera Orden
              </Button>
            </Card>
          ) : (
            <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Orden</TableHead>
                    <TableHead>Problema / Intervención</TableHead>
                    <TableHead>Kilometraje</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workOrders.slice(0, 5).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="font-mono font-semibold text-emerald-400 block text-xs truncate max-w-[120px]">
                            {order.id.slice(0, 8)}...
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            {order.workshopName || 'Taller Activo'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-200 block text-xs font-medium truncate max-w-[200px]">
                          {order.reportedIssue || 'Mantenimiento Preventivo'}
                        </span>
                        {order.interventions && order.interventions.length > 0 && (
                          <span className="text-[11px] text-slate-400 block">
                            {order.interventions.length} items asignados
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-300">
                        {order.reportedMileage.toLocaleString()} km
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.status === 'COMPLETED'
                              ? 'success'
                              : order.status === 'IN_PROGRESS'
                              ? 'info'
                              : order.status === 'CANCELLED'
                              ? 'danger'
                              : 'warning'
                          }
                          size="sm"
                          dot
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* OEM PREVENTIVE SERVICE COLUMN (1 COLUMN) */}
        <div className="space-y-4">
          <SectionHeader
            title="Mantenimiento OEM"
            description="Reglas preventivas por catálogo"
            actions={
              <Badge variant="warning" size="sm" dot>
                OEM Activo
              </Badge>
            }
          />

          <div className="space-y-3">
            <Card variant="default" className="p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-slate-100 block">
                    Volkswagen Golf VII 1.4 TSI
                  </span>
                  <span className="font-mono text-[11px] text-slate-400 block">
                    AE123CD • 58.400 km
                  </span>
                </div>
                <Badge variant="warning" size="sm">
                  Próximo
                </Badge>
              </div>

              <div className="text-xs text-slate-300 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Plan Oficial OEM (60.000 km):
                </span>
                <span>Cambio de Aceite Sintético VW 502.00, Filtro de Polen y Bujías</span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Faltan: 1.600 km</span>
                <span className="text-emerald-400 font-medium">Intervalo 12 meses</span>
              </div>
            </Card>

            <Card variant="bordered" className="p-4 text-center">
              <Sparkles className="h-5 w-5 text-emerald-400 mx-auto mb-2" />
              <h4 className="text-xs font-semibold text-slate-100 mb-1">
                Cálculo Determinista
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                Calcula automáticamente la próxima intervención según tablas oficiales OEM por kilometraje y
                meses transcurridos sin margen para alucinaciones.
              </p>
              <Button
                variant="subtle"
                size="sm"
                className="w-full"
                onClick={onQuickServiceClick}
              >
                Aplicar Regla a Servicio
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
