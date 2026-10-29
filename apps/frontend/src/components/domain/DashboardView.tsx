'use client';

import * as React from 'react';
import {
  Wrench,
  Car,
  Clock,
  Zap,
  RotateCw,
  Plus,
  ArrowRight,
  CheckCircle2,
  Activity,
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
  LoadingState,
} from '../ui/index.ts';
import { ApiClient } from '../../api/client.ts';
import type { Vehicle, WorkOrder } from '../../api/contracts.ts';

export interface DashboardViewProps {
  onQuickServiceClick?: () => void;
  onVehicleClick?: (vehicleId?: string) => void;
  onViewAllOrders?: () => void;
  onDiagnosticsClick?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onQuickServiceClick,
  onVehicleClick,
  onViewAllOrders,
  onDiagnosticsClick,
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
      setError(err instanceof Error ? err.message : 'Error al sincronizar datos del taller');
    } finally {
      setIsLoading(false);
    }
  }, [apiClient]);

  React.useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  // Derived metrics
  const activeOrders = React.useMemo(
    () => workOrders.filter((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED'),
    [workOrders]
  );

  const completedOrders = React.useMemo(
    () => workOrders.filter((o) => o.status === 'COMPLETED'),
    [workOrders]
  );

  // Calculate upcoming maintenance items from registered vehicles
  const upcomingMaintenance = React.useMemo(() => {
    return vehicles.slice(0, 3).map((v) => {
      const intervalKm = 10000;
      const nextTargetKm = Math.ceil((v.currentMileage + 1) / intervalKm) * intervalKm;
      const remainingKm = Math.max(0, nextTargetKm - v.currentMileage);
      const isUrgent = remainingKm <= 2000;

      return {
        vehicle: v,
        targetKm: nextTargetKm,
        remainingKm,
        isUrgent,
        recommendedAction: isUrgent
          ? 'Service Completo: Aceite, Filtros e Inspección General'
          : 'Inspección periódica y verificación de fluidos',
      };
    });
  }, [vehicles]);

  return (
    <div className="space-y-5">
      {/* ACTION & STATUS TOP BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-2.5">
          <Badge variant="success" size="sm" dot>
            Taller Operativo
          </Badge>
          <span className="text-xs text-slate-300 font-medium">
            {vehicles.length} {vehicles.length === 1 ? 'unidad' : 'unidades'} • {activeOrders.length}{' '}
            {activeOrders.length === 1 ? 'orden activa' : 'órdenes activas'}
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => loadDashboardData()}
            title="Actualizar datos"
            aria-label="Actualizar datos"
            className="p-2 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <RotateCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Activity className="h-4 w-4 text-emerald-400" />}
            onClick={() => onDiagnosticsClick?.()}
          >
            Diagnóstico OBD
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Car className="h-4 w-4 text-emerald-400" />}
            onClick={() => onVehicleClick?.()}
          >
            Vehículos
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Zap className="h-4 w-4 stroke-[2.5]" />}
            onClick={onQuickServiceClick}
          >
            Servicio Express
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2"
        >
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => loadDashboardData()}>
            Reintentar
          </Button>
        </div>
      )}

      {/* KPI METRIC CARDS (COMPACT & RESPONSIVE) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* FLOTA */}
        <Card variant="default" className="p-3.5 sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Flota Registrada
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Car className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {vehicles.length}
            </span>
            <span className="text-[10px] text-slate-400">unidades</span>
          </div>
        </Card>

        {/* ÓRDENES ACTIVAS */}
        <Card variant="default" className="p-3.5 sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              En Proceso
            </span>
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
              <Wrench className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {activeOrders.length}
            </span>
            <span className="text-[10px] text-sky-400 font-medium">activas</span>
          </div>
        </Card>

        {/* SERVICIOS COMPLETADOS */}
        <Card variant="default" className="p-3.5 sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Completados
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {completedOrders.length}
            </span>
            <span className="text-[10px] text-slate-400">servicios</span>
          </div>
        </Card>

        {/* PRÓXIMOS SERVICIOS */}
        <Card variant="default" className="p-3.5 sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Alertas OEM
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {upcomingMaintenance.filter((m) => m.isUrgent).length}
            </span>
            <span className="text-[10px] text-amber-400 font-medium">próximos</span>
          </div>
        </Card>
      </div>

      {/* ACTIVE WORK ORDERS SECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Órdenes de Trabajo en el Taller
            </h2>
            <p className="text-xs text-slate-400">
              Intervenciones activas y servicios en proceso
            </p>
          </div>
          {workOrders.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
              onClick={onViewAllOrders}
            >
              Ver todas ({workOrders.length})
            </Button>
          )}
        </div>

        {isLoading && workOrders.length === 0 ? (
          <div className="p-6 text-center">
            <LoadingState label="Cargando órdenes operativas..." />
          </div>
        ) : workOrders.length === 0 ? (
          <Card className="p-6 text-center bg-slate-900/60 border-slate-800 space-y-3">
            <Wrench className="h-8 w-8 text-slate-500 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-200">
                No hay órdenes de trabajo abiertas en este taller
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Registrá una nueva intervención express en menos de 60 segundos con Quick Service.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Zap className="h-4 w-4" />}
              onClick={onQuickServiceClick}
            >
              Iniciar Primera Orden
            </Button>
          </Card>
        ) : (
          <>
            {/* MOBILE VIEW: COMPACT TOUCH CARDS */}
            <div className="md:hidden space-y-2.5">
              {workOrders.slice(0, 4).map((order) => (
                <div
                  key={order.id}
                  onClick={onViewAllOrders}
                  className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 active:bg-slate-850 transition-colors space-y-2 cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-emerald-400">
                      #{order.id.slice(0, 8)}
                    </span>
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
                  </div>
                  <div className="text-xs text-slate-200 font-medium">
                    {order.reportedIssue || 'Mantenimiento Preventivo'}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800/80">
                    <span>{order.reportedMileage.toLocaleString()} km</span>
                    <span className="text-slate-400">{order.workshopName || 'Taller'}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP VIEW: CLEAN STRUCTURED TABLE */}
            <div className="hidden md:block rounded-xl border border-slate-800 overflow-hidden bg-slate-900/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Orden</TableHead>
                    <TableHead>Intervención / Problema</TableHead>
                    <TableHead>Kilometraje</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workOrders.slice(0, 5).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <span className="font-mono font-semibold text-emerald-400 block text-xs">
                          #{order.id.slice(0, 8)}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          {order.workshopName || 'Taller Activo'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-200 block text-xs font-medium truncate max-w-xs">
                          {order.reportedIssue || 'Mantenimiento Preventivo'}
                        </span>
                        {order.interventions && order.interventions.length > 0 && (
                          <span className="text-[11px] text-slate-400 block">
                            {order.interventions.length}{' '}
                            {order.interventions.length === 1 ? 'ítem' : 'ítems'}
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
          </>
        )}
      </div>

      {/* TWO-COLUMN GRID: RECENT VEHICLES & PREVENTIVE MAINTENANCE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* RECENT VEHICLES */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white tracking-tight">
              Vehículos en el Taller
            </h3>
            {vehicles.length > 0 && (
              <button
                onClick={() => onVehicleClick?.()}
                className="text-xs text-emerald-400 hover:underline font-medium"
              >
                Ver flota completa
              </button>
            )}
          </div>

          {vehicles.length === 0 ? (
            <Card className="p-5 text-center bg-slate-900/60 border-slate-800 space-y-2">
              <Car className="h-6 w-6 text-slate-500 mx-auto" />
              <p className="text-xs text-slate-300">Sin vehículos en el padrón</p>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => onVehicleClick?.()}
              >
                Registrar Unidad
              </Button>
            </Card>
          ) : (
            <div className="space-y-2">
              {vehicles.slice(0, 3).map((v) => (
                <div
                  key={v.id}
                  onClick={() => onVehicleClick?.(v.id)}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white bg-black px-2 py-0.5 rounded border border-slate-800 shrink-0">
                        {v.plate || 'S/D'}
                      </span>
                      <span className="text-xs font-semibold text-slate-100 truncate">
                        {v.make} {v.model}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono block mt-1">
                      {v.year} • {v.currentMileage.toLocaleString()} km
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickServiceClick?.();
                    }}
                  >
                    Servicio
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* UPCOMING OEM MAINTENANCE */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white tracking-tight">
              Próximos Mantenimientos Preventivos
            </h3>
            <Badge variant="warning" size="sm">
              Intervalos OEM
            </Badge>
          </div>

          {upcomingMaintenance.length === 0 ? (
            <Card className="p-5 text-center bg-slate-900/60 border-slate-800 space-y-2">
              <Clock className="h-6 w-6 text-slate-500 mx-auto" />
              <p className="text-xs text-slate-300">Sin mantenimientos proyectados</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {upcomingMaintenance.map((m) => (
                <div
                  key={m.vehicle.id}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {m.vehicle.make} {m.vehicle.model} ({m.vehicle.plate || 'S/P'})
                    </span>
                    <Badge variant={m.isUrgent ? 'warning' : 'secondary'} size="sm">
                      {m.isUrgent ? 'Próximo' : 'En regla'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400">{m.recommendedAction}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800/80">
                    <span>Objetivo: {m.targetKm.toLocaleString()} km</span>
                    <span className={m.isUrgent ? 'text-amber-400 font-semibold' : 'text-emerald-400'}>
                      Faltan: {m.remainingKm.toLocaleString()} km
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
