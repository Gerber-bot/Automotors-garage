'use client';

import * as React from 'react';
import {
  Car,
  Search,
  Plus,
  RotateCw,
  FileText,
  ShieldCheck,
  Zap,
  Calendar,
  Cpu,
  AlertCircle,
  CheckCircle2,
  X,
  LayoutGrid,
  List,
} from 'lucide-react';
import {
  Button,
  Card,
  Badge,
  Input,
  Select,
  Dialog,
  Sheet,
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

  // Initial load
  React.useEffect(() => {
    void fetchVehicles();
  }, [fetchVehicles]);

  // Debounced Search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      void fetchVehicles(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchVehicles]);

  // Open Vehicle Detail
  const handleOpenDetail = async (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDetailOpen(true);
    setPassportData(null);
    setLoadingPassport(true);
    try {
      const passport = await apiClient.getVehiclePassport(vehicle.id);
      setPassportData(passport);
    } catch {
      // Passport may be empty or unavailable for newly registered vehicles
      setPassportData(null);
    } finally {
      setLoadingPassport(false);
    }
  };

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
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <PageHeader
        title="Gestión de Vehículos & Flota"
        subtitle="Padrón unificado de vehículos atendidos con validación de patentes, números de chasis (VIN) e historial de kilometraje certificado."
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
      <Card className="bg-slate-900/80 border-slate-800 p-4">
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
                    className="text-slate-400 hover:text-slate-200"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : undefined
              }
              className="bg-slate-950/80 border-slate-800 focus:border-emerald-500 text-sm"
            />
          </div>

          {/* VIEW SWITCHER & STATS */}
          <div className="flex items-center justify-between sm:justify-end gap-3">
            <span className="text-xs text-slate-400 font-medium">
              <strong className="text-slate-100">{vehicles.length}</strong> {vehicles.length === 1 ? 'vehículo' : 'vehículos'}
            </span>

            <div className="flex items-center bg-slate-950/80 rounded-lg p-1 border border-slate-800">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${
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
                className={`p-1.5 rounded-md transition-colors ${
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
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v) => (
            <div key={v.id} onClick={() => handleOpenDetail(v)}>
              <VehicleCard vehicle={v} />
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <Card className="bg-slate-900/70 border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
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

      {/* MODAL: REGISTRAR NUEVO VEHÍCULO */}
      <Dialog
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Registrar Nuevo Vehículo"
        description="Ingresá los datos técnicos del vehículo para incorporarlo al registro oficial del taller."
        maxWidth="lg"
      >
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              placeholder="ej. Golf GTI MK7.5"
              value={formModel}
              onChange={(e) => setFormModel(e.target.value)}
              disabled={isSubmitting}
            />

            <Input
              label="Año de Fabricación *"
              type="number"
              required
              min={1950}
              max={2030}
              value={formYear}
              onChange={(e) => setFormYear(Number(e.target.value))}
              disabled={isSubmitting}
            />

            <Input
              label="Kilometraje Actual (km) *"
              type="number"
              required
              min={0}
              placeholder="ej. 45000"
              value={formMileage}
              onChange={(e) => setFormMileage(e.target.value === '' ? '' : Number(e.target.value))}
              disabled={isSubmitting}
            />

            <Input
              label="Patente / Dominio"
              placeholder="ej. AF123CD"
              value={formPlate}
              onChange={(e) => setFormPlate(e.target.value.toUpperCase())}
              hint="Formato Mercosur o anterior"
              disabled={isSubmitting}
            />

            <Input
              label="Número de Chasis (VIN)"
              placeholder="ej. WVWZZZAUZMP999999"
              value={formVin}
              onChange={(e) => setFormVin(e.target.value.toUpperCase())}
              hint="17 caracteres alfanuméricos"
              disabled={isSubmitting}
            />

            <Input
              label="Motorización"
              placeholder="ej. 2.0 TSI 230 CV (EA888)"
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

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsRegisterOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              {isSubmitting ? 'Guardando...' : 'Crear Ficha de Vehículo'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* DRAWER / SHEET: FICHA TÉCNICA DEL VEHÍCULO */}
      <Sheet
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : 'Ficha Técnica'}
        description="Especificaciones del rodado e historial de mantenimiento oficial"
      >
        {selectedVehicle && (
          <div className="space-y-6 pt-2">
            {/* BADGES & ODOMETER SUMMARY */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                    Dominio Oficial
                  </span>
                  {selectedVehicle.plate ? (
                    <span className="inline-block mt-1 font-mono font-bold text-sm px-3 py-1 rounded bg-black text-slate-100 border border-slate-700 tracking-widest shadow">
                      {selectedVehicle.plate}
                    </span>
                  ) : (
                    <span className="text-slate-500 text-xs italic">Sin chapa registrada</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                    Kilometraje Registrado
                  </span>
                  <span className="text-lg font-bold text-emerald-400">
                    {selectedVehicle.currentMileage.toLocaleString()} km
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-400">Año de Modelo:</span>{' '}
                  <strong className="text-slate-200">{selectedVehicle.year}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Combustible:</span>{' '}
                  <strong className="text-slate-200">{selectedVehicle.fuelType || 'Nafta'}</strong>
                </div>
              </div>
            </div>

            {/* TECHNICAL DETAILS */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Datos de Chasis & Motor
              </h3>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
                    Número VIN / Chasis:
                  </span>
                  <span className="font-mono text-slate-200">
                    {selectedVehicle.vin || 'No informado'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5 text-slate-500" />
                    Motorización:
                  </span>
                  <span className="text-slate-200">{selectedVehicle.engine || 'Estándar OEM'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    Identificador Interno:
                  </span>
                  <span className="font-mono text-[11px] text-slate-400 truncate max-w-[180px]">
                    {selectedVehicle.id}
                  </span>
                </div>
              </div>
            </div>

            {/* TIMELINE / PASSPORT PREVIEW */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Historial Certificado
                </h3>
                {passportData?.timeline?.length > 0 && (
                  <Badge variant="success" size="sm">
                    {passportData.timeline.length} intervenciones
                  </Badge>
                )}
              </div>

              {loadingPassport ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  <RotateCw className="h-4 w-4 animate-spin mx-auto mb-1 text-emerald-400" />
                  Recuperando libro digital...
                </div>
              ) : passportData?.timeline?.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                  {passportData.timeline.map((entry: any, idx: number) => (
                    <div
                      key={entry.recordId || idx}
                      className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-medium">
                        <span className="text-slate-200">{entry.category || 'Mantenimiento'}</span>
                        <span className="text-emerald-400 font-mono">
                          {entry.serviceMileage ? `${entry.serviceMileage.toLocaleString()} km` : ''}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{entry.description}</p>
                      <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                        <span>{entry.performedAt ? new Date(entry.performedAt).toLocaleDateString() : ''}</span>
                        {entry.isCertified && (
                          <span className="text-emerald-400 font-medium flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" /> Certificado
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 text-center text-xs text-slate-400">
                  <FileText className="h-5 w-5 text-slate-600 mx-auto mb-1" />
                  No registra intervenciones previas en este taller.
                </div>
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              {onQuickServiceForVehicle && (
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  leftIcon={<Zap className="h-4 w-4" />}
                  onClick={() => {
                    setIsDetailOpen(false);
                    onQuickServiceForVehicle(selectedVehicle);
                  }}
                >
                  Iniciar Quick Service Express
                </Button>
              )}
              <Button
                variant="outline"
                size="md"
                fullWidth
                onClick={() => setIsDetailOpen(false)}
              >
                Cerrar Ficha
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
