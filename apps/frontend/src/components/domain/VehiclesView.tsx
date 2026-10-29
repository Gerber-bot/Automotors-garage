'use client';

import * as React from 'react';
import {
  Car,
  Search,
  Plus,
  RotateCw,
  AlertCircle,
  CheckCircle2,
  X,
  LayoutGrid,
  List,
} from 'lucide-react';
import {
  Button,
  Card,
  Input,
  Select,
  Dialog,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from '../ui/index.ts';
import { ApiClient, ApiError } from '../../api/client.ts';
import { type Vehicle, CreateVehicleDtoSchema } from '../../api/contracts.ts';
import { VehicleCard } from './VehicleCard.tsx';
import { VehicleDetailModal } from './VehicleDetailModal.tsx';

export interface VehiclesViewProps {
  onQuickServiceForVehicle?: (vehicle: Vehicle) => void;
}

export function VehiclesView({ onQuickServiceForVehicle }: VehiclesViewProps) {
  const [vehicles, setVehicles] = React.useState<readonly Vehicle[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Detail Drawer / Modal state
  const [selectedVehicle, setSelectedVehicle] = React.useState<Vehicle | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [passportData, setPassportData] = React.useState<any | null>(null);
  const [loadingPassport, setLoadingPassport] = React.useState(false);

  // Register Modal state
  const [isRegisterOpen, setIsRegisterOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [registerError, setRegisterError] = React.useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = React.useState<string | null>(null);

  // Form Fields
  const [formMake, setFormMake] = React.useState('');
  const [formModel, setFormModel] = React.useState('');
  const [formYear, setFormYear] = React.useState(new Date().getFullYear());
  const [formMileage, setFormMileage] = React.useState<number | ''>(0);
  const [formPlate, setFormPlate] = React.useState('');
  const [formVin, setFormVin] = React.useState('');
  const [formEngine, setFormEngine] = React.useState('');
  const [formFuelType, setFormFuelType] = React.useState('Nafta');

  // Layout View Mode (grid / table)
  const [viewMode, setViewMode] = React.useState<'grid' | 'table'>('grid');

  const apiClient = React.useMemo(() => ApiClient.getInstance(), []);

  // Fetch Vehicles
  const fetchVehicles = React.useCallback(
    async (query?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiClient.getVehicles(query);
        setVehicles(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al cargar el listado de vehículos.';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [apiClient]
  );

  // Open Vehicle Detail
  const handleOpenDetail = React.useCallback(
    async (vehicle: Vehicle) => {
      setSelectedVehicle(vehicle);
      setIsDetailOpen(true);
      setPassportData(null);
      setLoadingPassport(true);
      try {
        const passport = await apiClient.getVehiclePassport(vehicle.id);
        setPassportData(passport);
      } catch {
        setPassportData(null);
      } finally {
        setLoadingPassport(false);
      }
    },
    [apiClient]
  );

  // Initial load
  React.useEffect(() => {
    void fetchVehicles();
  }, [fetchVehicles]);

  // Deep-link support for vehicle detail modal
  React.useEffect(() => {
    if (typeof window !== 'undefined' && vehicles.length > 0 && !selectedVehicle) {
      const params = new URLSearchParams(window.location.search);
      const vehicleParam = params.get('vehicleId');
      if (vehicleParam) {
        const found =
          vehicleParam === 'first'
            ? vehicles[0]
            : vehicles.find((v) => v.id === vehicleParam || v.plate === vehicleParam);
        if (found) {
          void handleOpenDetail(found);
        }
      }
    }
  }, [vehicles, selectedVehicle, handleOpenDetail]);

  // Debounced Search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      void fetchVehicles(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchVehicles]);

  // Submit Vehicle Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    setRegisterSuccess(null);

    const rawPayload = {
      make: formMake.trim(),
      model: formModel.trim(),
      year: Number(formYear),
      currentMileage: Number(formMileage),
      plate: formPlate.trim() ? formPlate.trim().toUpperCase() : undefined,
      vin: formVin.trim() ? formVin.trim().toUpperCase() : undefined,
      engine: formEngine.trim() || undefined,
      fuelType: formFuelType || undefined,
    };

    // Client-side Zod validation
    const validation = CreateVehicleDtoSchema.safeParse(rawPayload);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Datos de vehículo inválidos.';
      setRegisterError(firstError);
      return;
    }

    setIsSubmitting(true);
    try {
      const newVeh = await apiClient.createVehicle(rawPayload);
      setRegisterSuccess(`Vehículo ${newVeh.make} ${newVeh.model} registrado exitosamente.`);
      // Reset form
      setFormMake('');
      setFormModel('');
      setFormYear(new Date().getFullYear());
      setFormMileage(0);
      setFormPlate('');
      setFormVin('');
      setFormEngine('');
      // Refresh list
      await fetchVehicles();
      setTimeout(() => {
        setIsRegisterOpen(false);
        setRegisterSuccess(null);
      }, 1200);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setRegisterError(err.message);
      } else {
        setRegisterError('Error al registrar el vehículo en el servidor.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* PAGE HEADER */}
      <PageHeader
        title="Gestión de Vehículos & Flota"
        subtitle="Padrón oficial de vehículos atendidos con validación de patentes, números de chasis (VIN) y seguimiento de odómetro."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />}
              onClick={() => fetchVehicles(searchQuery)}
              disabled={isLoading}
            >
              Actualizar
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setRegisterError(null);
                setRegisterSuccess(null);
                setIsRegisterOpen(true);
              }}
            >
              Registrar Vehículo
            </Button>
          </div>
        }
      />

      {/* SEARCH AND CONTROLS BAR */}
      <Card className="bg-slate-900/80 border-slate-800 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* SEARCH INPUT */}
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Buscar por patente (ej. AE123CD), VIN o modelo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="h-4 w-4 text-slate-400" />}
              rightIcon={
                searchQuery ? (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : undefined
              }
              className="bg-slate-950/80 border-slate-800 focus:border-emerald-500 text-sm min-h-[44px]"
            />
          </div>

          {/* VIEW SWITCHER & STATS */}
          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            <span className="text-xs text-slate-400 font-medium">
              <strong className="text-slate-100">{vehicles.length}</strong>{' '}
              {vehicles.length === 1 ? 'vehículo' : 'vehículos'}
            </span>

            <div className="flex items-center bg-slate-950/80 rounded-lg p-1 border border-slate-800">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center ${
                  viewMode === 'grid'
                    ? 'bg-slate-800 text-emerald-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                aria-label="Vista en cuadrícula"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center ${
                  viewMode === 'table'
                    ? 'bg-slate-800 text-emerald-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                aria-label="Vista en tabla"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* CONTENT REGION: LOADING / ERROR / EMPTY / VEHICLES */}
      {isLoading && vehicles.length === 0 ? (
        <LoadingState label="Consultando padrón vehicular del taller..." />
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={() => fetchVehicles(searchQuery)}
          title="Fallo de comunicación con el inventario"
        />
      ) : vehicles.length === 0 ? (
        <EmptyState
          icon={<Car className="h-8 w-8 text-slate-500" />}
          title={searchQuery ? 'Sin coincidencias' : 'No hay vehículos registrados'}
          description={
            searchQuery
              ? `No se encontraron unidades que coincidan con "${searchQuery}". Verificá la patente o el número de chasis.`
              : 'El taller no cuenta con vehículos en su flota activa. Podés dar de alta la primera unidad ahora.'
          }
          action={
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setRegisterError(null);
                setRegisterSuccess(null);
                setIsRegisterOpen(true);
              }}
            >
              Registrar Primer Vehículo
            </Button>
          }
        />
      ) : viewMode === 'grid' ? (
        /* GRID VIEW (RESPONSIVE CARDS) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {vehicles.map((v) => (
            <div key={v.id} onClick={() => handleOpenDetail(v)} className="cursor-pointer">
              <VehicleCard vehicle={v} />
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW (RESPONSIVE WRAPPER) */
        <Card className="bg-slate-900/70 border-slate-800 overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patente</TableHead>
                  <TableHead>Vehículo (Marca & Modelo)</TableHead>
                  <TableHead>Año</TableHead>
                  <TableHead>Chasis (VIN)</TableHead>
                  <TableHead>Odómetro</TableHead>
                  <TableHead>Motor / Combustible</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((v) => (
                  <TableRow
                    key={v.id}
                    className="cursor-pointer hover:bg-slate-800/50"
                    onClick={() => handleOpenDetail(v)}
                  >
                    <TableCell>
                      {v.plate ? (
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-black text-slate-100 border border-slate-700 tracking-wider">
                          {v.plate}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs italic">Sin chapa</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-slate-200">
                      {v.make} {v.model}
                    </TableCell>
                    <TableCell className="text-slate-300 font-mono text-xs">{v.year}</TableCell>
                    <TableCell className="text-slate-400 font-mono text-xs">
                      {v.vin || <span className="italic text-slate-600">—</span>}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-200">
                      {v.currentMileage.toLocaleString()} km
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {v.engine || 'Estándar'} {v.fuelType && `• ${v.fuelType}`}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(v);
                        }}
                      >
                        Ver Ficha
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* MODAL: REGISTRAR NUEVO VEHÍCULO (MOBILE-FIRST GROUPED FORM) */}
      <Dialog
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Registrar Nuevo Vehículo"
        description="Ingresá los datos técnicos del vehículo para incorporarlo al registro oficial del taller."
        maxWidth="lg"
      >
        <form onSubmit={handleRegisterSubmit} className="space-y-5">
          {registerError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span className="font-medium">{registerError}</span>
            </div>
          )}

          {registerSuccess && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              <span className="font-medium">{registerSuccess}</span>
            </div>
          )}

          {/* GROUP 1: IDENTIFICACIÓN PRINCIPAL */}
          <div className="space-y-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              1. Datos del Vehículo
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Marca *"
                required
                placeholder="ej. Volkswagen"
                value={formMake}
                onChange={(e) => setFormMake(e.target.value)}
                disabled={isSubmitting}
              />
              <Input
                label="Modelo *"
                required
                placeholder="ej. Golf VII 1.4 TSI"
                value={formModel}
                onChange={(e) => setFormModel(e.target.value)}
                disabled={isSubmitting}
              />
              <Input
                label="Año de Fabricación *"
                type="number"
                inputMode="numeric"
                required
                min={1950}
                max={2030}
                value={formYear}
                onChange={(e) => setFormYear(Number(e.target.value))}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* GROUP 2: IDENTIFICACIÓN REGISTRAL */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              2. Identificación Registral
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Patente / Dominio"
                placeholder="ej. AF123CD"
                value={formPlate}
                onChange={(e) => setFormPlate(e.target.value.toUpperCase())}
                hint="Formato Mercosur o alfanumérico"
                disabled={isSubmitting}
              />
              <Input
                label="Número de Chasis (VIN)"
                placeholder="ej. WVWZZZAUZKP100001"
                value={formVin}
                onChange={(e) => setFormVin(e.target.value.toUpperCase())}
                hint="17 caracteres alfanuméricos"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* GROUP 3: MECÁNICA & ODÓMETRO */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              3. Mecánica & Odómetro
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Kilometraje Actual (km) *"
                type="number"
                inputMode="numeric"
                required
                min={0}
                placeholder="ej. 58400"
                value={formMileage}
                onChange={(e) => setFormMileage(e.target.value === '' ? '' : Number(e.target.value))}
                disabled={isSubmitting}
              />
              <Input
                label="Motorización"
                placeholder="ej. 1.4 TSI 150 CV"
                value={formEngine}
                onChange={(e) => setFormEngine(e.target.value)}
                disabled={isSubmitting}
              />
              <Select
                label="Tipo de Combustible"
                value={formFuelType}
                onChange={(e) => setFormFuelType(e.target.value)}
                disabled={isSubmitting}
                options={[
                  { value: 'Nafta', label: 'Nafta (Super / Premium)' },
                  { value: 'Diesel', label: 'Diesel / Gasoil' },
                  { value: 'Híbrido', label: 'Híbrido (HEV / PHEV)' },
                  { value: 'Eléctrico', label: '100% Eléctrico (BEV)' },
                  { value: 'GNC', label: 'GNC / Bi-combustible' },
                ]}
              />
            </div>
          </div>

          {/* FORM ACTIONS */}
          <div className="pt-4 border-t border-slate-800 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setIsRegisterOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              {isSubmitting ? 'Guardando...' : 'Crear Ficha de Vehículo'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL: FICHA TÉCNICA Y DETALLES DEL VEHÍCULO */}
      <VehicleDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        vehicle={selectedVehicle}
        passportData={passportData}
        isLoadingPassport={loadingPassport}
        onQuickServiceForVehicle={onQuickServiceForVehicle}
      />
    </div>
  );
}
