'use client';

import * as React from 'react';
import {
  CarFront,
  History,
  CalendarClock,
  UserCheck,
  Plus,
  ShieldCheck,
  User,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  FileEdit,
  LogOut,
  Building2,
  Sparkles,
  Phone,
  Mail,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Input,
  Dialog,
  LoadingState,
  EmptyState,
} from '../ui/index.ts';
import {
  ApiClient,
  type OwnerVehicle,
  type OwnerTimelineEntry,
  type OwnerPredictionItem,
} from '../../api/client.ts';
import type {
  HistorySummary,
  MaintenanceExplanation,
  PreventiveConsultationResponse,
  KbConfiguration,
  KbTechnicalSpec,
  KbMaintenanceRule,
  TechnicalIdentificationResult,
} from '../../api/contracts.ts';
import { useAuth } from '../../context/AuthContext.tsx';

export type OwnerTabId = 'garage' | 'history' | 'predictions' | 'profile';

const CATEGORY_LABELS: Record<string, string> = {
  OIL_AND_FILTER: 'Aceite y Filtro',
  AIR_AND_CABIN_FILTERS: 'Filtro de Aire / Habitáculo',
  BRAKES: 'Frenos',
  SPARK_PLUGS: 'Bujías',
  COOLANT: 'Refrigerante',
  TIMING_BELT: 'Distribución',
  TRANSMISSION_FLUID: 'Transmisión',
  GENERAL_INSPECTION: 'Inspección General',
};

export function MiAutomotorsView() {
  const { user, workshops, setActivePortal, logout, refreshSession } = useAuth();
  const apiClient = React.useMemo(() => ApiClient.getInstance(), []);

  const [activeTab, setActiveTab] = React.useState<OwnerTabId>('garage');
  const [vehicles, setVehicles] = React.useState<OwnerVehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = React.useState<string | null>(null);
  const [historyData, setHistoryData] = React.useState<{
    totalRecords: number;
    certifiedCount: number;
    declaredCount: number;
    timeline: OwnerTimelineEntry[];
  } | null>(null);
  const [predictionsData, setPredictionsData] = React.useState<{
    estimatedMonthlyKm: number;
    insufficientDataMessage: string;
    predictions: OwnerPredictionItem[];
  } | null>(null);

  // Knowledge Base state
  const [kbConfigData, setKbConfigData] = React.useState<
    (KbConfiguration & { specs: KbTechnicalSpec[]; rules: KbMaintenanceRule[] }) | null
  >(null);
  const [kbIdentification, setKbIdentification] = React.useState<TechnicalIdentificationResult | null>(null);
  const [isLoadingKb, setIsLoadingKb] = React.useState<boolean>(false);
  const [isBindingKb, setIsBindingKb] = React.useState<boolean>(false);

  const [isLoadingVehicles, setIsLoadingVehicles] = React.useState<boolean>(true);
  const [isLoadingDetails, setIsLoadingDetails] = React.useState<boolean>(false);
  const [errorBanner, setErrorBanner] = React.useState<string | null>(null);
  const [successBanner, setSuccessBanner] = React.useState<string | null>(null);

  // Modals state
  const [isAddVehicleOpen, setIsAddVehicleOpen] = React.useState(false);
  const [isUpdateMileageOpen, setIsUpdateMileageOpen] = React.useState(false);
  const [isAddMaintOpen, setIsAddMaintOpen] = React.useState(false);
  const [correctionTarget, setCorrectionTarget] = React.useState<OwnerTimelineEntry | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Add Vehicle form state
  const [vehMake, setVehMake] = React.useState('');
  const [vehModel, setVehModel] = React.useState('');
  const [vehYear, setVehYear] = React.useState('2020');
  const [vehEngine, setVehEngine] = React.useState('');
  const [vehPlate, setVehPlate] = React.useState('');
  const [vehMileage, setVehMileage] = React.useState('');
  const [vehVin, setVehVin] = React.useState('');
  const [vehTransmission, setVehTransmission] = React.useState('Manual (5 velocidades)');
  const [vehDistribution, setVehDistribution] = React.useState('CADENA');

  // Update Odometer form state
  const [newMileageInput, setNewMileageInput] = React.useState('');

  // Add Maintenance form state
  const [maintCategory, setMaintCategory] = React.useState('OIL_AND_FILTER');
  const [maintDescription, setMaintDescription] = React.useState('');
  const [maintMileage, setMaintMileage] = React.useState('');
  const [maintDate, setMaintDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [maintWorkshop, setMaintWorkshop] = React.useState('');
  const [maintCost, setMaintCost] = React.useState('');
  const [maintObservations, setMaintObservations] = React.useState('');

  // Audited Correction form state
  const [corrReason, setCorrReason] = React.useState('');
  const [corrMileage, setCorrMileage] = React.useState('');
  const [corrDescription, setCorrDescription] = React.useState('');
  const [corrObservations, setCorrObservations] = React.useState('');

  // Profile form state
  const [profFullName, setProfFullName] = React.useState(user?.fullName ?? '');
  const [profPhone, setProfPhone] = React.useState(user?.phone ?? '');

  // Contextual AI Feature 1: History Summary
  const [historySummary, setHistorySummary] = React.useState<HistorySummary | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = React.useState<boolean>(false);
  const [isLoadingSummary, setIsLoadingSummary] = React.useState<boolean>(false);
  const [summaryError, setSummaryError] = React.useState<string | null>(null);

  const handleOpenSummary = async () => {
    if (!selectedVehicleId) return;
    setIsSummaryModalOpen(true);
    setIsLoadingSummary(true);
    setSummaryError(null);
    try {
      const summary = await apiClient.getOwnerHistorySummary(selectedVehicleId);
      setHistorySummary(summary);
    } catch (err: any) {
      setSummaryError(err?.message || 'No se pudo generar el resumen del historial.');
    } finally {
      setIsLoadingSummary(false);
    }
  };

  // Contextual AI Feature 2: Maintenance Prediction Explanation
  const [maintenanceExplanation, setMaintenanceExplanation] = React.useState<MaintenanceExplanation | null>(null);
  const [isExplanationModalOpen, setIsExplanationModalOpen] = React.useState<boolean>(false);
  const [isLoadingExplanation, setIsLoadingExplanation] = React.useState<boolean>(false);
  const [explanationError, setExplanationError] = React.useState<string | null>(null);

  const handleOpenExplanation = async (category: string) => {
    if (!selectedVehicleId) return;
    setIsExplanationModalOpen(true);
    setIsLoadingExplanation(true);
    setExplanationError(null);
    try {
      const explanation = await apiClient.explainOwnerMaintenance(selectedVehicleId, category);
      setMaintenanceExplanation(explanation);
    } catch (err: any) {
      setExplanationError(err?.message || 'No se pudo generar la explicación del mantenimiento.');
    } finally {
      setIsLoadingExplanation(false);
    }
  };

  // Automotors AI Core: Preventive Maintenance Consultation
  const [consultCategory, setConsultCategory] = React.useState<string>('OIL_AND_FILTER');
  const [consultQuestion, setConsultQuestion] = React.useState<string>('');
  const [consultAllowExternalAi, setConsultAllowExternalAi] = React.useState<boolean>(false);
  const [consultationResult, setConsultationResult] =
    React.useState<PreventiveConsultationResponse | null>(null);
  const [isLoadingConsultation, setIsLoadingConsultation] = React.useState<boolean>(false);
  const [consultationError, setConsultationError] = React.useState<string | null>(null);

  const handleRunPreventiveConsultation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedVehicleId) return;
    setIsLoadingConsultation(true);
    setConsultationError(null);
    try {
      const res = await apiClient.consultOwnerPreventiveMaintenance(selectedVehicleId, {
        category: consultCategory,
        question: consultQuestion.trim() || undefined,
        allowExternalAi: consultAllowExternalAi,
        privacyConsent: consultAllowExternalAi,
      });
      setConsultationResult(res);
    } catch (err: unknown) {
      setConsultationError(
        err instanceof Error
          ? err.message
          : 'No se pudo procesar la consulta preventiva para este vehículo.'
      );
    } finally {
      setIsLoadingConsultation(false);
    }
  };

  React.useEffect(() => {
    if (user) {
      setProfFullName(user.fullName || '');
      setProfPhone(user.phone || '');
    }
  }, [user]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as OwnerTabId | null;
      if (tabParam && ['garage', 'history', 'predictions', 'profile'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const loadVehicles = React.useCallback(async () => {
    setIsLoadingVehicles(true);
    setErrorBanner(null);
    try {
      const list = await apiClient.getOwnerVehicles();
      setVehicles(list);
      if (list.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(list[0]!.id);
      }
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : 'Error al cargar tus vehículos.');
    } finally {
      setIsLoadingVehicles(false);
    }
  }, [apiClient, selectedVehicleId]);

  const loadVehicleDetails = React.useCallback(
    async (vehicleId: string) => {
      setIsLoadingDetails(true);
      try {
        const [hist, preds] = await Promise.all([
          apiClient.getOwnerVehicleHistory(vehicleId),
          apiClient.getOwnerVehiclePredictions(vehicleId),
        ]);
        setHistoryData({
          totalRecords: hist.totalRecords,
          certifiedCount: hist.certifiedCount,
          declaredCount: hist.declaredCount,
          timeline: hist.timeline,
        });
        setPredictionsData({
          estimatedMonthlyKm: preds.estimatedMonthlyKm,
          insufficientDataMessage: preds.insufficientDataMessage,
          predictions: preds.predictions,
        });
      } catch (err: unknown) {
        setErrorBanner(err instanceof Error ? err.message : 'Error al cargar historial y estimaciones.');
      } finally {
        setIsLoadingDetails(false);
      }
    },
    [apiClient]
  );

  React.useEffect(() => {
    void loadVehicles();
  }, [loadVehicles]);

  React.useEffect(() => {
    setConsultationResult(null);
    setConsultationError(null);
    if (selectedVehicleId) {
      void loadVehicleDetails(selectedVehicleId);
    } else {
      setHistoryData(null);
      setPredictionsData(null);
    }
  }, [selectedVehicleId, loadVehicleDetails]);

  const selectedVehicle = React.useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) ?? vehicles[0] ?? null,
    [vehicles, selectedVehicleId]
  );

  const loadVehicleKbData = React.useCallback(
    async (targetVehicle: OwnerVehicle) => {
      setIsLoadingKb(true);
      try {
        if (targetVehicle.configurationId) {
          const configData = await apiClient.getKbConfiguration(targetVehicle.configurationId);
          setKbConfigData(configData);
          setKbIdentification(null);
        } else {
          setKbConfigData(null);
          const ident = await apiClient.identifyVehicleTechnicalProfile({
            make: targetVehicle.make,
            model: targetVehicle.model,
            year: targetVehicle.year,
            engine: targetVehicle.engine || undefined,
            fuelType: targetVehicle.fuelType,
            transmission: targetVehicle.transmission,
            userDeclaredDistribution: targetVehicle.distributionType,
          });
          setKbIdentification(ident);
          if (ident.status === 'EXACT_MATCH' && ident.matchedConfiguration) {
            const configData = await apiClient.getKbConfiguration(ident.matchedConfiguration.id);
            setKbConfigData(configData);
          }
        }
      } catch (err: unknown) {
        console.warn('Error loading vehicle KB data:', err);
      } finally {
        setIsLoadingKb(false);
      }
    },
    [apiClient]
  );

  React.useEffect(() => {
    if (selectedVehicle) {
      void loadVehicleKbData(selectedVehicle);
    } else {
      setKbConfigData(null);
      setKbIdentification(null);
    }
  }, [selectedVehicle, loadVehicleKbData]);

  const handleSelectCandidateConfiguration = async (candidateId: string) => {
    if (!selectedVehicle) return;
    setIsBindingKb(true);
    setErrorBanner(null);
    try {
      await apiClient.bindOwnerVehicleConfiguration(selectedVehicle.id, candidateId);
      setSuccessBanner('Configuración técnica homologada vinculada exitosamente al vehículo.');
      setVehicles((prev) =>
        prev.map((v) => (v.id === selectedVehicle.id ? { ...v, configurationId: candidateId } : v))
      );
      await Promise.all([
        loadVehicleDetails(selectedVehicle.id),
        loadVehicleKbData({ ...selectedVehicle, configurationId: candidateId }),
      ]);
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : 'Error al vincular la motorización homologada.');
    } finally {
      setIsBindingKb(false);
    }
  };

  const handleFillLoganTemplate = () => {
    setVehMake('Renault');
    setVehModel('Logan II Zen 1.6 16v SCe');
    setVehYear('2020');
    setVehEngine('1.6 16v SCe (H4M / HR16 probable)');
    setVehPlate(`AE${Math.floor(100 + Math.random() * 899)}LG`);
    setVehMileage('48500');
    setVehVin('');
    setVehTransmission('Manual (5 velocidades)');
    setVehDistribution('CADENA');
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    setSuccessBanner(null);
    setIsSubmitting(true);
    try {
      const created = await apiClient.createOwnerVehicle({
        make: vehMake.trim(),
        model: vehModel.trim(),
        year: Number(vehYear),
        engine: vehEngine.trim() || undefined,
        plate: vehPlate.trim().toUpperCase(),
        currentMileage: Number(vehMileage || 0),
        vin: vehVin.trim() || undefined,
        transmission: vehTransmission,
        distributionType: vehDistribution,
      });
      setVehicles((prev) => [...prev, created]);
      setSelectedVehicleId(created.id);
      setIsAddVehicleOpen(false);
      setSuccessBanner(`Vehículo ${created.make} ${created.model} registrado en Mi Garaje.`);
      setVehMake('');
      setVehModel('');
      setVehPlate('');
      setVehMileage('');
      setVehVin('');
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : 'No se pudo registrar el vehículo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateMileage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;
    setErrorBanner(null);
    setSuccessBanner(null);
    setIsSubmitting(true);
    try {
      const updated = await apiClient.updateOwnerVehicle(selectedVehicle.id, {
        currentMileage: Number(newMileageInput),
      });
      setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      setIsUpdateMileageOpen(false);
      setSuccessBanner(`Kilometraje actualizado a ${updated.currentMileage.toLocaleString('es-AR')} km.`);
      await loadVehicleDetails(updated.id);
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : 'No se pudo actualizar el kilometraje.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;
    setErrorBanner(null);
    setSuccessBanner(null);
    setIsSubmitting(true);
    try {
      await apiClient.createOwnerMaintenanceRecord(selectedVehicle.id, {
        category: maintCategory,
        description: maintDescription.trim(),
        recordedMileage: Number(maintMileage),
        serviceDate: maintDate ? new Date(`${maintDate}T12:00:00Z`).toISOString() : undefined,
        workshopName: maintWorkshop.trim() || undefined,
        cost: maintCost ? Number(maintCost) : undefined,
        observations: maintObservations.trim() || undefined,
      });
      setIsAddMaintOpen(false);
      setMaintDescription('');
      setMaintWorkshop('');
      setMaintCost('');
      setMaintObservations('');
      setSuccessBanner('Mantenimiento registrado como Declarado por el Propietario.');
      await loadVehicles();
      await loadVehicleDetails(selectedVehicle.id);
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : 'Error al registrar el mantenimiento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionTarget || !selectedVehicle) return;
    setErrorBanner(null);
    setSuccessBanner(null);
    setIsSubmitting(true);
    try {
      await apiClient.createOwnerMaintenanceCorrection(correctionTarget.id, {
        reason: corrReason.trim(),
        correctedData: {
          recordedMileage: corrMileage ? Number(corrMileage) : correctionTarget.recordedMileage,
          description: corrDescription.trim() || correctionTarget.description,
          observations: corrObservations.trim() || correctionTarget.observations,
        },
      });
      setCorrectionTarget(null);
      setCorrReason('');
      setSuccessBanner('Corrección auditada guardada sin alterar la trazabilidad histórica.');
      await loadVehicleDetails(selectedVehicle.id);
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : 'Error al guardar la corrección auditada.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    setSuccessBanner(null);
    setIsSubmitting(true);
    try {
      await apiClient.updateOwnerProfile({
        fullName: profFullName.trim(),
        phone: profPhone.trim(),
      });
      await refreshSession();
      setSuccessBanner('Tu perfil de propietario fue actualizado correctamente.');
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : 'Error al actualizar el perfil.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const navItems: Array<{ id: OwnerTabId; label: string; icon: React.ReactNode }> = [
    { id: 'garage', label: 'Mi Garaje', icon: <CarFront className="h-4 w-4" /> },
    { id: 'history', label: 'Historial', icon: <History className="h-4 w-4" /> },
    { id: 'predictions', label: 'Mantenimientos', icon: <CalendarClock className="h-4 w-4" /> },
    { id: 'profile', label: 'Mi Perfil', icon: <UserCheck className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-20 md:pb-8 overflow-x-hidden">
      {/* TOP BAR */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-600 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-sky-950/50 shrink-0">
              <CarFront className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-extrabold tracking-tight text-white truncate">
                  Mi Automotors
                </span>
                <Badge variant="info" size="sm">
                  Portal Propietario
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {user?.fullName || user?.email}
              </p>
            </div>
          </div>

          {/* DESKTOP NAVIGATION PILLS */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === item.id
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {workshops.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Building2 className="h-3.5 w-3.5" />}
                onClick={() => setActivePortal('WORKSHOP')}
              >
                <span className="hidden sm:inline">Automotors Pro</span>
                <span className="sm:hidden">Taller</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<LogOut className="h-3.5 w-3.5" />}
              onClick={logout}
              aria-label="Cerrar sesión"
            >
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-5 space-y-5">
        {/* FEEDBACK BANNERS */}
        {errorBanner && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{errorBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="text-rose-300 hover:text-white font-bold px-2"
            >
              ×
            </button>
          </div>
        )}

        {successBanner && (
          <div
            role="status"
            className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{successBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessBanner(null)}
              className="text-emerald-300 hover:text-white font-bold px-2"
            >
              ×
            </button>
          </div>
        )}

        {/* VEHICLE SELECTOR BAR (Shown when owner has vehicles and is on Garage/History/Predictions) */}
        {activeTab !== 'profile' && vehicles.length > 0 && (
          <div className="flex items-center justify-between gap-2 flex-wrap bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Vehículo Activo:
              </span>
              {vehicles.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVehicleId(v.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    selectedVehicle?.id === v.id
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                      : 'bg-slate-950/60 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <CarFront className="h-3.5 w-3.5" />
                  <span>
                    {v.make} {v.model.split(' ')[0]} ({v.plate || 'S/P'})
                  </span>
                </button>
              ))}
            </div>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setIsAddVehicleOpen(true)}
            >
              Agregar Vehículo
            </Button>
          </div>
        )}

        {/* TAB 1: MI GARAJE */}
        {activeTab === 'garage' && (
          <div className="space-y-5">
            {isLoadingVehicles ? (
              <LoadingState label="Cargando vehículos de Mi Garaje..." />
            ) : !selectedVehicle ? (
              <Card className="bg-slate-900/80 border-slate-800 p-6">
                <EmptyState
                  icon={<CarFront className="h-8 w-8 text-sky-400" />}
                  title="Tu Garaje Personal está vacío"
                  description="Registrá tu primer vehículo para llevar su historial de mantenimiento trazable y recibir estimaciones preventivas basadas en reglas técnicas documentadas."
                  action={
                    <Button
                      variant="primary"
                      size="md"
                      leftIcon={<Plus className="h-4 w-4" />}
                      onClick={() => setIsAddVehicleOpen(true)}
                    >
                      Registrar Mi Primer Vehículo
                    </Button>
                  }
                />
              </Card>
            ) : (
              <>
                {/* HERO VEHICLE CARD */}
                <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/40 border-slate-800 p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="info" size="sm">
                          {selectedVehicle.plate || 'SIN PATENTE'}
                        </Badge>
                        <Badge variant="secondary" size="sm">
                          Año {selectedVehicle.year}
                        </Badge>
                        <Badge variant="success" size="sm" dot>
                          Titularidad Protegida
                        </Badge>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                        {selectedVehicle.make} {selectedVehicle.model}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-300">
                        Motor / Versión: <span className="font-semibold text-white">{selectedVehicle.engine || 'No especificado'}</span>
                      </p>
                    </div>

                    <div className="flex flex-col sm:items-end justify-between gap-2 bg-slate-950/70 border border-slate-800/90 rounded-2xl p-3.5 min-w-[200px]">
                      <div className="flex items-center gap-2 text-slate-400 text-xs">
                        <Gauge className="h-4 w-4 text-sky-400" />
                        <span>Kilometraje Actual</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-white font-mono">
                        {selectedVehicle.currentMileage.toLocaleString('es-AR')} km
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        fullWidth
                        onClick={() => {
                          setNewMileageInput(String(selectedVehicle.currentMileage));
                          setIsUpdateMileageOpen(true);
                        }}
                      >
                        Actualizar Odómetro
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-800/80">
                    <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/70">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 block">
                        Transmisión
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-slate-100 mt-0.5 block">
                        {selectedVehicle.transmission || 'Manual'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/70">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 block">
                        Sistema de Distribución
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-emerald-300 mt-0.5 block">
                        {selectedVehicle.distributionType === 'CADENA'
                          ? 'Por Cadena Metálica'
                          : selectedVehicle.distributionType === 'CORREA'
                          ? 'Por Correa Dentada'
                          : 'Pendiente de confirmar'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/70">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 block">
                        Código VIN / Chasis
                      </span>
                      <span className="text-xs sm:text-sm font-mono text-slate-200 mt-0.5 block truncate">
                        {selectedVehicle.vin || 'Opcional (Sin declarar)'}
                      </span>
                    </div>
                  </div>

                  {/* QUICK ACTIONS */}
                  <div className="flex flex-wrap items-center gap-2.5 mt-4">
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Plus className="h-4 w-4" />}
                      onClick={() => {
                        setMaintMileage(String(selectedVehicle.currentMileage));
                        setIsAddMaintOpen(true);
                      }}
                    >
                      Registrar Mantenimiento
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<History className="h-4 w-4" />}
                      onClick={() => setActiveTab('history')}
                    >
                      Ver Historial ({historyData?.totalRecords ?? 0})
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<CalendarClock className="h-4 w-4" />}
                      onClick={() => setActiveTab('predictions')}
                    >
                      Ver Próximos Mantenimientos
                    </Button>
                  </div>
                </Card>

                {/* TECHNICAL KNOWLEDGE BASE PROFILE CARD */}
                <Card className="bg-slate-900/90 border-slate-800 p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-sky-400" />
                      <h3 className="text-sm font-bold text-white">
                        Ficha Técnica & Pautas de Mantenimiento (Knowledge Base)
                      </h3>
                    </div>
                    {isLoadingKb ? (
                      <Badge variant="secondary" size="sm">
                        Consultando catálogo técnico...
                      </Badge>
                    ) : kbConfigData ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="info" size="sm" dot>
                          Selección Realizada por el Propietario
                        </Badge>
                        {kbConfigData.verificationStatus === 'VERIFIED' ? (
                          <Badge variant="success" size="sm">
                            Especificación Técnica Verificada
                          </Badge>
                        ) : (
                          <Badge variant="warning" size="sm">
                            Especificación Pendiente de Verificación
                          </Badge>
                        )}
                        <Badge
                          variant={kbConfigData.powertrain?.timingMechanism === 'CADENA' ? 'success' : 'warning'}
                          size="sm"
                        >
                          Distribución: {kbConfigData.powertrain?.timingMechanism || 'OEM'}
                        </Badge>
                      </div>
                    ) : kbIdentification?.status === 'AMBIGUOUS' ? (
                      <Badge variant="warning" size="sm" dot>
                        Configuración Pendiente — Variantes Detectadas
                      </Badge>
                    ) : kbIdentification?.status === 'POSSIBLE_MATCH' ? (
                      <Badge variant="info" size="sm">
                        Coincidencia Sugerida en Catálogo
                      </Badge>
                    ) : (
                      <Badge variant="secondary" size="sm">
                        Configuración Pendiente
                      </Badge>
                    )}
                  </div>

                  {isLoadingKb ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      Cargando especificaciones y pautas de mantenimiento homologadas...
                    </div>
                  ) : kbConfigData ? (
                    <div className="space-y-4">
                      {/* MOTOR & POWERTRAIN SUMMARY */}
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                            Configuración Homologada:
                          </span>
                          <span className="text-sm font-bold text-white block">
                            {kbConfigData.commercialName}
                          </span>
                          <span className="text-slate-300">
                            Motor {kbConfigData.powertrain?.engineCode} ({kbConfigData.powertrain?.family || kbConfigData.commercialName}) •{' '}
                            {kbConfigData.powertrain?.valves ?? 0}V • {kbConfigData.powertrain?.displacementCc ?? 0} cc •{' '}
                            {kbConfigData.powertrain?.powerHp ?? 0} CV
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-xs">Mercado:</span>
                          <Badge variant="secondary" size="sm">{kbConfigData.market}</Badge>
                          {kbConfigData.sourceTitle && (
                            <Badge variant="info" size="sm" title={kbConfigData.sourceTitle}>
                              Doc. OEM
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* TECHNICAL SPECS GRID */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
                          <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
                            Aceite Motor OEM
                          </span>
                          <span className="text-white font-mono font-medium block mt-1">
                            {kbConfigData.powertrain?.oilViscosityOem || 'Pendiente de verificación'}
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            Capacidad:{' '}
                            {kbConfigData.powertrain?.oilCapacityLiters
                              ? `${kbConfigData.powertrain.oilCapacityLiters} L`
                              : 'Pendiente de verificación documental'}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
                          <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
                            Líquido de Frenos
                          </span>
                          <span className="text-white font-medium block mt-1">
                            {kbConfigData.specs.find((s) => s.category === 'BRAKES')?.specValue ||
                              'Pendiente de verificación documental'}
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {kbConfigData.verificationStatus === 'VERIFIED'
                              ? 'Según pauta verificada'
                              : 'En revisión documental'}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
                          <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
                            Refrigerante Motor
                          </span>
                          <span className="text-white font-medium block mt-1">
                            {kbConfigData.specs.find((s) => s.category === 'COOLANT' || s.category === 'COOLING')
                              ?.specValue || 'Pendiente de verificación documental'}
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {kbConfigData.verificationStatus === 'VERIFIED'
                              ? 'Circuito verificado'
                              : 'En revisión documental'}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
                          <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
                            Distribución ({kbConfigData.powertrain?.timingMechanism})
                          </span>
                          <span className={`font-semibold block mt-1 ${kbConfigData.powertrain?.timingMechanism === 'CADENA' ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {kbConfigData.powertrain?.timingMechanism === 'CADENA'
                              ? 'Arquitectura por Cadena Metálica'
                              : 'Arquitectura por Correa Dentada'}
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {kbConfigData.powertrain?.timingObservations || 'Pendiente de verificación documental'}
                          </span>
                        </div>
                      </div>

                      {/* RULES ACCORDION / SUMMARY */}
                      {kbConfigData.rules && kbConfigData.rules.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-800/70">
                          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                            {kbConfigData.rules.every((r) => r.verificationStatus === 'VERIFIED')
                              ? `Pautas de Mantenimiento Homologadas (${kbConfigData.rules.length} reglas verificadas)`
                              : `Pautas de Mantenimiento en Catálogo (${kbConfigData.rules.filter((r) => r.verificationStatus === 'VERIFIED').length} verificadas / ${kbConfigData.rules.filter((r) => r.verificationStatus !== 'VERIFIED').length} pendientes de verificación — excluidas de cálculo automático)`}
                          </span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            {kbConfigData.rules.slice(0, 6).map((rule) => (
                              <div
                                key={rule.id}
                                className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60 flex items-center justify-between gap-2"
                              >
                                <div>
                                  <span className="font-semibold text-slate-200 block">{rule.title}</span>
                                  <span className="text-[11px] text-slate-400">
                                    {rule.intervalKm ? `${rule.intervalKm.toLocaleString('es-AR')} km` : 'Solo por tiempo'}
                                    {rule.intervalMonths ? ` / ${rule.intervalMonths} meses` : ''}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Badge
                                    variant={rule.verificationStatus === 'VERIFIED' ? 'success' : 'warning'}
                                    size="sm"
                                  >
                                    {rule.verificationStatus === 'VERIFIED' ? 'Verificada' : 'Pendiente'}
                                  </Badge>
                                  <Badge variant={rule.operation === 'REPLACE' ? 'info' : 'secondary'} size="sm">
                                    {rule.operation === 'REPLACE' ? 'Cambio' : 'Inspección'}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : kbIdentification?.status === 'AMBIGUOUS' ? (
                    /* AMBIGUOUS VARIANT SELECTION (RENAULT LOGAN CASE) */
                    <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/60 space-y-3">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                            Selección Requerida: Se detectaron múltiples motorizaciones posibles
                          </h4>
                          <p className="text-xs text-amber-300/90 leading-relaxed">
                            {kbIdentification.reason}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        {kbIdentification.candidateConfigurations.map((candidate) => (
                          <div
                            key={candidate.id}
                            className="p-3.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-sky-500/60 transition-all flex flex-col justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-1 flex-wrap">
                                <span className="font-bold text-white text-sm">
                                  {candidate.commercialName}
                                </span>
                                <Badge
                                  variant={candidate.powertrain?.timingMechanism === 'CADENA' ? 'success' : 'warning'}
                                  size="sm"
                                >
                                  {candidate.powertrain?.timingMechanism === 'CADENA'
                                    ? 'CADENA (Libre mant.)'
                                    : 'CORREA (60.000 km)'}
                                </Badge>
                              </div>
                              <p className="text-slate-300">
                                Motor {candidate.powertrain?.engineCode} ({candidate.powertrain?.family || candidate.commercialName}) •{' '}
                                {candidate.powertrain?.valves}V • {candidate.powertrain?.powerHp} CV
                              </p>
                              {candidate.sourceTitle && (
                                <p className="text-[11px] text-slate-500">
                                  Fuente: {candidate.sourceTitle}
                                </p>
                              )}
                            </div>

                            <div className="space-y-1.5 pt-1">
                              <Button
                                variant="primary"
                                size="sm"
                                fullWidth
                                isLoading={isBindingKb}
                                leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                                onClick={() => handleSelectCandidateConfiguration(candidate.id)}
                              >
                                Seleccionar esta Motorización (Mi Unidad)
                              </Button>
                              <span className="text-[10px] text-slate-400 block text-center">
                                Selección declarada por titular • Aplica pautas OEM verificadas
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : kbIdentification?.status === 'POSSIBLE_MATCH' && kbIdentification.matchedConfiguration ? (
                    <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-800/60 space-y-3">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <span className="text-xs font-bold text-sky-200">
                            Coincidencia Sugerida en Catálogo:
                          </span>
                          <p className="text-xs text-sky-300 mt-0.5">
                            {kbIdentification.matchedConfiguration.commercialName} ({kbIdentification.matchedConfiguration.powertrain?.engineCode})
                          </p>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={isBindingKb}
                          onClick={() => handleSelectCandidateConfiguration(kbIdentification.matchedConfiguration!.id)}
                        >
                          Seleccionar Motorización Sugerida
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                        <span className="font-semibold text-slate-300 block">
                          Identificación de Motorización:
                        </span>
                        <p className="text-slate-400 leading-relaxed">
                          {selectedVehicle.technicalProfile?.exactEngineCodeNote ||
                            selectedVehicle.exactEngineCode ||
                            'Motor estándar sin homologación específica asignada.'}
                        </p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                        <span className="font-semibold text-slate-300 block">
                          Arquitectura de Distribución:
                        </span>
                        <p className="text-slate-400 leading-relaxed">
                          {selectedVehicle.technicalProfile?.distributionNote ||
                            'Consultá el manual de propietario para verificar si equipa cadena metálica o correa dentada.'}
                        </p>
                      </div>
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>
        )}

        {/* TAB 2: HISTORIAL DEL VEHÍCULO */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Historial Cronológico de Mantenimiento
                </h2>
                <p className="text-xs text-slate-400">
                  Los registros nunca se eliminan. Se distingue claramente entre servicios certificados por talleres de la red y declaraciones personales del propietario.
                </p>
              </div>
              {selectedVehicle && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Sparkles className="h-4 w-4 text-emerald-400" />}
                    onClick={handleOpenSummary}
                  >
                    Resumen Inteligente
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={() => {
                      setMaintMileage(String(selectedVehicle.currentMileage));
                      setIsAddMaintOpen(true);
                    }}
                  >
                    Registrar Mantenimiento Manual
                  </Button>
                </div>
              )}
            </div>

            {/* ORIGIN SUMMARY BADGES */}
            {historyData && (
              <div className="grid grid-cols-3 gap-3">
                <Card className="bg-slate-900/80 border-slate-800 p-3.5">
                  <span className="text-[11px] text-slate-400 block">Total Eventos</span>
                  <span className="text-lg font-extrabold text-white">{historyData.totalRecords}</span>
                </Card>
                <Card className="bg-emerald-950/20 border-emerald-500/30 p-3.5">
                  <span className="text-[11px] text-emerald-300 block">Certificados por Taller</span>
                  <span className="text-lg font-extrabold text-emerald-400">{historyData.certifiedCount}</span>
                </Card>
                <Card className="bg-sky-950/20 border-sky-500/30 p-3.5">
                  <span className="text-[11px] text-sky-300 block">Declarados por Propietario</span>
                  <span className="text-lg font-extrabold text-sky-400">{historyData.declaredCount}</span>
                </Card>
              </div>
            )}

            {isLoadingDetails ? (
              <LoadingState label="Cargando cronología del vehículo..." />
            ) : !historyData || historyData.timeline.length === 0 ? (
              <Card className="bg-slate-900/80 border-slate-800 p-6">
                <EmptyState
                  icon={<History className="h-8 w-8 text-sky-400" />}
                  title="Sin mantenimientos registrados aún"
                  description="Cargá tu último cambio de aceite, filtros o frenos para activar el cálculo determinístico de próximos vencimientos."
                  action={
                    selectedVehicle ? (
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Plus className="h-4 w-4" />}
                        onClick={() => {
                          setMaintMileage(String(selectedVehicle.currentMileage));
                          setIsAddMaintOpen(true);
                        }}
                      >
                        Cargar Primer Mantenimiento
                      </Button>
                    ) : undefined
                  }
                />
              </Card>
            ) : (
              <div className="space-y-3">
                {historyData.timeline.map((item) => (
                  <Card
                    key={item.id}
                    className={`p-4 sm:p-5 border transition-colors ${
                      item.isCertified
                        ? 'bg-slate-900/90 border-emerald-500/30'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.isCertified ? (
                            <Badge variant="success" size="sm" dot>
                              Certificado por Taller Red Automotors
                            </Badge>
                          ) : (
                            <Badge variant="info" size="sm">
                              Declarado por Propietario (No Certificado)
                            </Badge>
                          )}
                          <Badge variant="secondary" size="sm">
                            {CATEGORY_LABELS[item.category] || item.category}
                          </Badge>
                          <span className="text-xs font-mono text-slate-400">
                            {new Date(item.serviceDate).toLocaleDateString('es-AR')}
                          </span>
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-white">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {item.description}
                        </p>

                        <div className="flex items-center gap-4 pt-1 text-xs text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            {item.isCertified ? (
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <User className="h-3.5 w-3.5 text-sky-400" />
                            )}
                            <span>{item.workshopName}</span>
                          </span>
                          {item.cost !== null && item.cost > 0 && (
                            <span className="font-mono text-slate-300">
                              Costo declarado: ${item.cost.toLocaleString('es-AR')}
                            </span>
                          )}
                        </div>

                        {item.observations && (
                          <p className="text-xs text-slate-400 italic bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 mt-2">
                            Observaciones: {item.observations}
                          </p>
                        )}
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                        <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-right">
                          <span className="text-[10px] text-slate-400 uppercase block">
                            Odómetro
                          </span>
                          <span className="text-sm font-extrabold font-mono text-white">
                            {item.recordedMileage.toLocaleString('es-AR')} km
                          </span>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<FileEdit className="h-3.5 w-3.5" />}
                          onClick={() => {
                            setCorrectionTarget(item);
                            setCorrMileage(String(item.recordedMileage));
                            setCorrDescription(item.description);
                            setCorrObservations(item.observations || '');
                            setCorrReason('');
                          }}
                        >
                          Corrección Auditada
                        </Button>
                      </div>
                    </div>

                    {/* AUDITED CORRECTIONS TRAIL */}
                    {item.corrections && item.corrections.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 block">
                          Trazabilidad de Correcciones Auditadas ({item.corrections.length}):
                        </span>
                        {item.corrections.map((corr) => (
                          <div
                            key={corr.id}
                            className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[11px] text-slate-300 space-y-0.5"
                          >
                            <div className="flex items-center justify-between text-amber-300 font-semibold">
                              <span>Motivo: {corr.reason}</span>
                              <span className="font-mono text-[10px]">
                                {new Date(corr.createdAt).toLocaleDateString('es-AR')} — {corr.actorName}
                              </span>
                            </div>
                            <div className="text-slate-400 font-mono">
                              Valor original conservado: {(corr.previousData as any)?.recordedMileage} km — &ldquo;{(corr.previousData as any)?.description}&rdquo;
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MOTOR DE MANTENIMIENTO INTELIGENTE (ESTIMACIONES DETERMINÍSTICAS) */}
        {activeTab === 'predictions' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Plan de Mantenimiento Inteligente (Determinístico)
                </h2>
                <p className="text-xs text-slate-400">
                  Cálculo exacto basado en el odómetro actual ({selectedVehicle?.currentMileage.toLocaleString('es-AR') ?? 0} km), historial registrado y manuales técnicos verificados.
                </p>
              </div>
              {predictionsData && (
                <Badge variant="secondary" size="sm">
                  Uso estimado: ~{predictionsData.estimatedMonthlyKm.toLocaleString('es-AR')} km/mes
                </Badge>
              )}
            </div>

            {isLoadingDetails ? (
              <LoadingState label="Calculando estimaciones determinísticas..." />
            ) : !predictionsData ? (
              <Card className="bg-slate-900/80 border-slate-800 p-6">
                <EmptyState
                  icon={<CalendarClock className="h-8 w-8 text-sky-400" />}
                  title="Seleccioná o registrá un vehículo"
                  description="Necesitamos un vehículo activo en Mi Garaje para calcular sus próximos mantenimientos."
                />
              </Card>
            ) : (
              <>
                {/* AUTOMOTORS AI CORE: PREVENTIVE MAINTENANCE CONSULTATION PANEL */}
                <Card className="bg-slate-900/95 border-slate-800 p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Sparkles className="h-4 w-4 text-emerald-400" />
                        <h3 className="text-sm sm:text-base font-bold text-white">
                          Automotors AI — Consulta Preventiva Fundamentada
                        </h3>
                        <Badge variant="info" size="sm">
                          Solo Lectura · Motor Determinista + Evidencias
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400">
                        Consultá el estado preventivo de un rubro mecánico con trazabilidad explícita entre datos confirmados, estimaciones e información faltante.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleRunPreventiveConsultation} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label
                          htmlFor="ai-consult-category"
                          className="block text-xs font-semibold text-slate-300 mb-1"
                        >
                          Rubro de Mantenimiento
                        </label>
                        <select
                          id="ai-consult-category"
                          value={consultCategory}
                          onChange={(e) => setConsultCategory(e.target.value)}
                          className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100"
                        >
                          <option value="OIL_AND_FILTER">Aceite y Filtro de Motor</option>
                          <option value="AIR_AND_CABIN_FILTERS">Filtros de Aire y Habitáculo</option>
                          <option value="BRAKES">Sistema de Frenos</option>
                          <option value="SPARK_PLUGS">Bujías de Encendido</option>
                          <option value="COOLANT">Líquido Refrigerante</option>
                          <option value="TIMING_BELT">Sistema de Distribución (Cadena / Correa)</option>
                          <option value="GENERAL_INSPECTION">Inspección Multipunto General</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label
                          htmlFor="ai-consult-question"
                          className="block text-xs font-semibold text-slate-300 mb-1"
                        >
                          Consulta puntual (opcional)
                        </label>
                        <Input
                          id="ai-consult-question"
                          placeholder="Ej: ¿Cuándo corresponde el próximo servicio y en qué registros se basa?"
                          value={consultQuestion}
                          onChange={(e) => setConsultQuestion(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={consultAllowExternalAi}
                          onChange={(e) => setConsultAllowExternalAi(e.target.checked)}
                          className="mt-0.5 rounded border-slate-700 bg-slate-950 text-emerald-500"
                        />
                        <span>
                          Autorizo asistencia de proveedor externo de IA con contexto técnico minimizado (sin datos personales, patente, VIN ni notas privadas). Si no está configurado, se utiliza la explicación determinista local.
                        </span>
                      </label>

                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        isLoading={isLoadingConsultation}
                        leftIcon={<BookOpen className="h-3.5 w-3.5" />}
                      >
                        Consultar Mantenimiento
                      </Button>
                    </div>
                  </form>

                  {isLoadingConsultation && (
                    <LoadingState label="Verificando permisos, historial, reglas técnicas y cálculo determinista..." />
                  )}

                  {consultationError && (
                    <div
                      role="alert"
                      className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2"
                    >
                      <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                      <span>{consultationError}</span>
                    </div>
                  )}

                  {!isLoadingConsultation && consultationResult && (
                    <div className="space-y-3.5 pt-2 border-t border-slate-800/80 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white">
                            {consultationResult.categoryLabel}
                          </span>
                          <Badge
                            variant={
                              consultationResult.deterministicCalculation.status === 'OVERDUE' ||
                              consultationResult.deterministicCalculation.status === 'DUE_NOW'
                                ? 'danger'
                                : consultationResult.deterministicCalculation.status === 'UPCOMING_SOON'
                                  ? 'warning'
                                  : consultationResult.deterministicCalculation.status ===
                                      'INSUFFICIENT_DATA'
                                    ? 'secondary'
                                    : 'success'
                            }
                            size="sm"
                          >
                            {consultationResult.deterministicCalculation.status}
                          </Badge>
                          <Badge variant="secondary" size="sm">
                            Confianza: {consultationResult.deterministicCalculation.confidence}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              consultationResult.privacy.mode === 'EXTERNAL_AI_ASSISTED'
                                ? 'success'
                                : 'secondary'
                            }
                            size="sm"
                          >
                            {consultationResult.privacy.mode === 'EXTERNAL_AI_ASSISTED'
                              ? 'IA ASISTIDA (MINIMIZADA)'
                              : 'MODO DETERMINISTA LOCAL'}
                          </Badge>
                          <span className="font-mono text-[11px] text-slate-400">
                            {consultationResult.privacy.providerName}
                          </span>
                        </div>
                      </div>

                      {/* Respuesta Explicativa Principal */}
                      <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 text-slate-200 leading-relaxed">
                        {consultationResult.answer}
                      </div>

                      {/* Distinción Estricta: Datos Confirmados vs Inferencias vs Información Faltante */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl bg-emerald-950/15 border border-emerald-500/30 space-y-1.5">
                          <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            Datos Confirmados ({consultationResult.confirmedFacts.length})
                          </span>
                          <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
                            {consultationResult.confirmedFacts.map((fact, idx) => (
                              <li key={idx}>{fact}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-3 rounded-xl bg-sky-950/15 border border-sky-500/30 space-y-1.5">
                          <span className="font-bold text-sky-300 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            Inferencias y Proyecciones ({consultationResult.inferences.length})
                          </span>
                          {consultationResult.inferences.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic">
                              No se realizaron inferencias adicionales por falta de regla verificada.
                            </p>
                          ) : (
                            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
                              {consultationResult.inferences.map((inf, idx) => (
                                <li key={idx}>{inf}</li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div className="p-3 rounded-xl bg-amber-950/15 border border-amber-500/30 space-y-1.5">
                          <span className="font-bold text-amber-300 flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            Información Faltante o No Confirmada (
                            {consultationResult.unknownOrMissingData.length})
                          </span>
                          <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
                            {consultationResult.unknownOrMissingData.map((missing, idx) => (
                              <li key={idx}>{missing}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Fuentes y Evidencias Verificables */}
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <span className="font-bold text-slate-200 block">
                          Fuentes y Evidencias Utilizadas ({consultationResult.sources.length})
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {consultationResult.sources.map((src, idx) => (
                            <div
                              key={`${src.sourceId}-${idx}`}
                              className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/90 space-y-1"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-white truncate">
                                  {src.title}
                                </span>
                                <Badge variant="secondary" size="sm">
                                  {src.verificationStatus}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-slate-300">{src.summary}</p>
                              <p className="text-[10px] font-mono text-slate-500 truncate">
                                Fuente: {src.citation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Trazabilidad de Herramientas Read-Only y Descargo */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 pt-1">
                        <span>
                          Herramientas de solo lectura ejecutadas:{' '}
                          <code className="text-slate-300">
                            {consultationResult.toolsInvoked.join(' → ')}
                          </code>
                        </span>
                        <span>PII enviada a terceros: 0 bytes</span>
                      </div>
                    </div>
                  )}
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {predictionsData.predictions.map((pred) => {
                  const isInsufficient = pred.status === 'INSUFFICIENT_DATA';
                  const isOverdue = pred.status === 'OVERDUE' || pred.status === 'DUE_NOW';
                  const isUpcoming = pred.status === 'UPCOMING_SOON';

                  return (
                    <Card
                      key={pred.category}
                      className={`p-4 sm:p-5 flex flex-col justify-between gap-3 border ${
                        isOverdue
                          ? 'bg-rose-950/15 border-rose-500/40'
                          : isUpcoming
                          ? 'bg-amber-950/15 border-amber-500/40'
                          : isInsufficient
                          ? 'bg-slate-900/60 border-slate-800/90'
                          : 'bg-slate-900/90 border-slate-800'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-white">{pred.label}</span>
                          {isOverdue ? (
                            <Badge variant="danger" size="sm" dot>
                              VENCIDO
                            </Badge>
                          ) : isUpcoming ? (
                            <Badge variant="warning" size="sm" dot>
                              PRÓXIMO
                            </Badge>
                          ) : isInsufficient ? (
                            <Badge variant="secondary" size="sm">
                              DATOS INSUFICIENTES
                            </Badge>
                          ) : (
                            <Badge variant="success" size="sm" dot>
                              OK / AL DÍA
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {pred.shortDescription}
                        </p>

                        {isInsufficient ? (
                          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 mt-2">
                            <div className="flex items-center gap-1.5 text-amber-300 font-semibold text-xs">
                              <Info className="h-4 w-4 shrink-0" />
                              <span>{pred.message}</span>
                            </div>
                            {pred.technicalNote && (
                              <p className="text-[11px] text-slate-400 leading-relaxed">
                                {pred.technicalNote}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2.5 pt-2">
                            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                              <span className="text-[10px] text-slate-400 uppercase block">
                                Próximo Kilometraje
                              </span>
                              <span className="text-sm font-extrabold font-mono text-white">
                                {pred.nextDueMileage?.toLocaleString('es-AR')} km
                              </span>
                              <span
                                className={`text-[11px] block font-semibold ${
                                  (pred.remainingKm ?? 0) <= 0
                                    ? 'text-rose-400'
                                    : 'text-emerald-400'
                                }`}
                              >
                                {(pred.remainingKm ?? 0) >= 0
                                  ? `Restan ${pred.remainingKm?.toLocaleString('es-AR')} km`
                                  : `Excedido por ${Math.abs(pred.remainingKm ?? 0).toLocaleString('es-AR')} km`}
                              </span>
                            </div>

                            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                              <span className="text-[10px] text-slate-400 uppercase block">
                                Fecha Estimada
                              </span>
                              <span className="text-sm font-bold text-white">
                                {pred.nextDueDate
                                  ? new Date(pred.nextDueDate).toLocaleDateString('es-AR')
                                  : 'S/D'}
                              </span>
                              <span className="text-[11px] text-slate-400 block">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {pred.estimatedDaysRemaining !== null
                                  ? `${pred.estimatedDaysRemaining} días restantes`
                                  : 'Sin estimación'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-800/70 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                        <span className="truncate">
                          {pred.lastServiceMileage
                            ? `Último registro: ${pred.lastServiceMileage.toLocaleString('es-AR')} km`
                            : 'Sin servicio previo registrado en esta categoría'}
                        </span>
                        {pred.sourceCitation && (
                          <span className="text-slate-500 truncate max-w-[180px]" title={pred.sourceCitation}>
                            {pred.sourceCitation}
                          </span>
                        )}
                      </div>

                      <div className="pt-2 flex justify-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<HelpCircle className="h-3.5 w-3.5 text-sky-400" />}
                          onClick={() => handleOpenExplanation(pred.category)}
                        >
                          Explicar Proyección
                        </Button>
                      </div>
                    </Card>
                  );
                })}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 4: MI PERFIL */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card className="bg-slate-900/90 border-slate-800 p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Mi Perfil de Propietario</h2>
                  <p className="text-xs text-slate-400">
                    Gestioná tus datos personales en Mi Automotors.
                  </p>
                </div>
                <Badge variant="info" size="sm">
                  VEHICLE_OWNER
                </Badge>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300 uppercase">
                    Correo Electrónico (Identidad Verificada)
                  </label>
                  <Input
                    type="email"
                    value={user?.email ?? ''}
                    disabled
                    leftIcon={<Mail className="h-4 w-4 text-slate-500" />}
                    className="bg-slate-950/50 border-slate-800 text-slate-400 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300 uppercase">
                    Nombre y Apellido
                  </label>
                  <Input
                    type="text"
                    required
                    value={profFullName}
                    onChange={(e) => setProfFullName(e.target.value)}
                    leftIcon={<User className="h-4 w-4 text-slate-400" />}
                    className="bg-slate-950/70 border-slate-800 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300 uppercase">
                    Teléfono de Contacto
                  </label>
                  <Input
                    type="tel"
                    placeholder="+54 9 11 5555-0000"
                    value={profPhone}
                    onChange={(e) => setProfPhone(e.target.value)}
                    leftIcon={<Phone className="h-4 w-4 text-slate-400" />}
                    className="bg-slate-950/70 border-slate-800 text-sm"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isSubmitting}
                  >
                    Guardar Cambios
                  </Button>
                </div>
              </form>
            </Card>

            <Card className="bg-slate-900/80 border-slate-800 p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  Privacidad y Seguridad de tu Garaje
                </h3>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Autorización por Recurso:</strong> Tus vehículos e historiales están vinculados exclusivamente a tu identificador de usuario.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Protección contra Reclamo No Autorizado:</strong> Conocer una patente o VIN no otorga acceso automático al historial privado de otra persona.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Trazabilidad Inmutable:</strong> Los registros declarados se diferencian de los certificados por taller y las correcciones conservan auditoría completa.
                  </span>
                </li>
              </ul>
            </Card>
          </div>
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav
        aria-label="Navegación Principal Mi Automotors"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 px-2 py-1.5"
      >
        <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-semibold transition-colors ${
                activeTab === item.id
                  ? 'text-sky-300 bg-sky-500/15'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.icon}
              <span className="mt-1 truncate">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* MODAL 1: REGISTRAR VEHÍCULO EN MI GARAJE */}
      <Dialog
        isOpen={isAddVehicleOpen}
        onClose={() => setIsAddVehicleOpen(false)}
        title="Registrar Vehículo en Mi Garaje"
        description="Ingresá los datos de tu vehículo. El código VIN es opcional inicialmente."
      >
        <form onSubmit={handleCreateVehicle} className="space-y-3.5">
          <div className="flex items-center justify-between bg-sky-950/30 border border-sky-500/30 rounded-xl p-2.5">
            <span className="text-xs text-sky-200">
              ¿Querés probar el perfil de referencia Renault Logan 1.6 2020?
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleFillLoganTemplate}
            >
              Autocompletar Logan 2020
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Marca *</label>
              <Input
                required
                placeholder="ej. Renault"
                value={vehMake}
                onChange={(e) => setVehMake(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Modelo *</label>
              <Input
                required
                placeholder="ej. Logan 1.6 Zen"
                value={vehModel}
                onChange={(e) => setVehModel(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Año *</label>
              <Input
                type="number"
                required
                value={vehYear}
                onChange={(e) => setVehYear(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Patente *</label>
              <Input
                required
                placeholder="ej. AE202LG"
                value={vehPlate}
                onChange={(e) => setVehPlate(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Kilometraje Actual *
              </label>
              <Input
                type="number"
                required
                placeholder="ej. 46800"
                value={vehMileage}
                onChange={(e) => setVehMileage(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Motor / Versión
              </label>
              <Input
                placeholder="ej. 1.6 16v (H4M / HR16)"
                value={vehEngine}
                onChange={(e) => setVehEngine(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                VIN / Chasis (Opcional)
              </label>
              <Input
                placeholder="Opcional (8-17 caracteres)"
                value={vehVin}
                onChange={(e) => setVehVin(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Transmisión
              </label>
              <select
                value={vehTransmission}
                onChange={(e) => setVehTransmission(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100"
              >
                <option value="Manual (5 velocidades)">Manual (5 velocidades)</option>
                <option value="Manual (6 velocidades)">Manual (6 velocidades)</option>
                <option value="Automática / CVT">Automática / CVT</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tipo de Distribución
              </label>
              <select
                value={vehDistribution}
                onChange={(e) => setVehDistribution(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100"
              >
                <option value="CADENA">Por Cadena Metálica</option>
                <option value="CORREA">Por Correa Dentada</option>
                <option value="DESCONOCIDO">No estoy seguro</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsAddVehicleOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Guardar Vehículo
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL 2: ACTUALIZAR ODÓMETRO */}
      <Dialog
        isOpen={isUpdateMileageOpen}
        onClose={() => setIsUpdateMileageOpen(false)}
        title="Actualizar Kilometraje Actual"
        description="El odómetro no puede retroceder respecto del último kilometraje registrado."
      >
        <form onSubmit={handleUpdateMileage} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nuevo Kilometraje (km)
            </label>
            <Input
              type="number"
              required
              value={newMileageInput}
              onChange={(e) => setNewMileageInput(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsUpdateMileageOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Confirmar Lectura
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL 3: REGISTRAR MANTENIMIENTO MANUAL */}
      <Dialog
        isOpen={isAddMaintOpen}
        onClose={() => setIsAddMaintOpen(false)}
        title="Registrar Mantenimiento Realizado"
        description="Este evento quedará registrado en tu historial como Declarado por el Propietario (No Certificado)."
      >
        <form onSubmit={handleCreateMaintenance} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Categoría *
              </label>
              <select
                value={maintCategory}
                onChange={(e) => setMaintCategory(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100"
              >
                <option value="OIL_AND_FILTER">Aceite y filtro</option>
                <option value="AIR_AND_CABIN_FILTERS">Filtro de aire / habitáculo</option>
                <option value="BRAKES">Frenos</option>
                <option value="SPARK_PLUGS">Bujías</option>
                <option value="COOLANT">Refrigerante</option>
                <option value="TIMING_BELT">Distribución</option>
                <option value="GENERAL_INSPECTION">Inspección general / Batería / Neumáticos</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Kilometraje al momento del servicio *
              </label>
              <Input
                type="number"
                required
                value={maintMileage}
                onChange={(e) => setMaintMileage(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Descripción del trabajo realizado *
            </label>
            <Input
              required
              placeholder="ej. Cambio de aceite sintético 5W40 y filtro original"
              value={maintDescription}
              onChange={(e) => setMaintDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Fecha del servicio *
              </label>
              <Input
                type="date"
                required
                value={maintDate}
                onChange={(e) => setMaintDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Taller o Lugar (Opcional)
              </label>
              <Input
                placeholder="ej. Lubricentro Centro"
                value={maintWorkshop}
                onChange={(e) => setMaintWorkshop(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Costo Total ARS (Opcional)
              </label>
              <Input
                type="number"
                placeholder="ej. 75000"
                value={maintCost}
                onChange={(e) => setMaintCost(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Observaciones (Opcional)
            </label>
            <Input
              placeholder="Marca de repuestos utilizados, notas o número de factura"
              value={maintObservations}
              onChange={(e) => setMaintObservations(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsAddMaintOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Registrar en Historial
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL 4: CORRECCIÓN AUDITADA */}
      <Dialog
        isOpen={Boolean(correctionTarget)}
        onClose={() => setCorrectionTarget(null)}
        title="Registrar Corrección Auditada"
        description="Los eventos históricos nunca se borran. La corrección conserva el valor original en el registro de auditoría."
      >
        <form onSubmit={handleCreateCorrection} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Motivo de la corrección *
            </label>
            <Input
              required
              placeholder="ej. Error de tipeo al cargar el kilometraje de la factura"
              value={corrReason}
              onChange={(e) => setCorrReason(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Kilometraje Corregido (km)
            </label>
            <Input
              type="number"
              required
              value={corrMileage}
              onChange={(e) => setCorrMileage(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Descripción Corregida
            </label>
            <Input
              required
              value={corrDescription}
              onChange={(e) => setCorrDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Observaciones Adicionales
            </label>
            <Input
              value={corrObservations}
              onChange={(e) => setCorrObservations(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCorrectionTarget(null)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Guardar Corrección Auditada
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL 5: RESUMEN INTELIGENTE DEL HISTORIAL */}
      <Dialog
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        title="Resumen Inteligente del Historial Vehicular"
        description="Síntesis técnica estructurada basada exclusivamente en los registros verificados en la plataforma."
      >
        <div className="space-y-4">
          {isLoadingSummary && (
            <LoadingState label="Generando resumen estructurado a partir del historial..." />
          )}

          {summaryError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{summaryError}</span>
            </div>
          )}

          {!isLoadingSummary && historySummary && (
            <div className="space-y-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2">
                  <Badge variant={historySummary.isAiGenerated ? 'success' : 'secondary'} size="sm">
                    {historySummary.isAiGenerated ? 'IA ASISTIDA' : 'MOTOR DETERMINISTA'}
                  </Badge>
                  <span className="text-slate-400 text-[11px] font-mono">
                    {historySummary.providerName}
                  </span>
                </div>
                <span className="text-slate-400 text-[11px]">
                  {historySummary.totalRecordsAnalyzed} registros analizados
                </span>
              </div>

              {/* Intervenciones Principales */}
              <div className="space-y-1.5">
                <span className="text-slate-300 font-bold block">Intervenciones Principales Detectadas</span>
                {historySummary.mainInterventions.length === 0 ? (
                  <p className="text-slate-500 italic">No se registraron intervenciones mayores.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {historySummary.mainInterventions.map((item, idx) => (
                      <Badge key={idx} variant="secondary" size="sm">
                        {item}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Servicios Recientes */}
              {historySummary.recentServices.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-slate-300 font-bold block">Últimos Servicios Realizados</span>
                  <div className="space-y-1.5">
                    {historySummary.recentServices.map((svc, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2"
                      >
                        <div>
                          <span className="text-white font-medium block">{svc.title}</span>
                          <span className="text-slate-400 text-[11px]">
                            {svc.date} · {svc.mileage.toLocaleString('es-AR')} km
                          </span>
                        </div>
                        {svc.isCertified ? (
                          <Badge variant="success" size="sm">
                            Certificado
                          </Badge>
                        ) : (
                          <Badge variant="secondary" size="sm">
                            Declarado
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reparaciones Recurrentes */}
              {historySummary.recurringRepairs.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1 text-amber-300">
                  <span className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Patrones de Reparación Recurrente
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {historySummary.recurringRepairs.map((r, idx) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Observaciones Técnicas Relevantes */}
              {historySummary.relevantObservations.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-slate-300 font-bold block">Notas Técnicas de Talleres</span>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1 text-slate-300 text-[11px]">
                    {historySummary.relevantObservations.map((obs, idx) => (
                      <p key={idx} className="italic">
                        &ldquo;{obs}&rdquo;
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Limitaciones de los Datos */}
              {historySummary.dataLimitations.length > 0 && (
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <span className="font-semibold text-slate-300 block">Limitaciones de Información</span>
                  <ul className="list-disc list-inside space-y-0.5">
                    {historySummary.dataLimitations.map((lim, idx) => (
                      <li key={idx}>{lim}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2 text-[10px] text-slate-500 text-right">
                Trazabilidad: {historySummary.referencedRecordIds.length} eventos contrastados con el libro de mantenimiento.
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsSummaryModalOpen(false)}
            >
              Cerrar Resumen
            </Button>
          </div>
        </div>
      </Dialog>

      {/* MODAL 6: EXPLICACIÓN DE MANTENIMIENTO PREVENTIVO */}
      <Dialog
        isOpen={isExplanationModalOpen}
        onClose={() => setIsExplanationModalOpen(false)}
        title={maintenanceExplanation?.title ?? 'Explicación del Mantenimiento'}
        description="Detalle técnico de la proyección determinística conforme a pautas de fabricante y kilometraje."
      >
        <div className="space-y-4">
          {isLoadingExplanation && (
            <LoadingState label="Generando desglose técnico de la proyección preventiva..." />
          )}

          {explanationError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{explanationError}</span>
            </div>
          )}

          {!isLoadingExplanation && maintenanceExplanation && (
            <div className="space-y-3.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <Badge
                  variant={
                    maintenanceExplanation.status === 'OVERDUE' || maintenanceExplanation.status === 'DUE_NOW'
                      ? 'danger'
                      : maintenanceExplanation.status === 'UPCOMING_SOON'
                      ? 'warning'
                      : maintenanceExplanation.status === 'INSUFFICIENT_DATA'
                      ? 'secondary'
                      : 'success'
                  }
                  size="sm"
                >
                  {maintenanceExplanation.status}
                </Badge>
                <div className="flex items-center gap-2">
                  <Badge variant={maintenanceExplanation.isAiGenerated ? 'success' : 'secondary'} size="sm">
                    {maintenanceExplanation.isAiGenerated ? 'IA ASISTIDA' : 'MOTOR DETERMINISTA'}
                  </Badge>
                  <span className="text-slate-400 text-[10px] font-mono">
                    {maintenanceExplanation.providerName}
                  </span>
                </div>
              </div>

              {/* Proyecciones numéricas (inmutables) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Próximo Kilometraje</span>
                  <span className="text-sm font-extrabold font-mono text-white">
                    {maintenanceExplanation.nextDueMileage !== null
                      ? `${maintenanceExplanation.nextDueMileage.toLocaleString('es-AR')} km`
                      : 'Sin calcular'}
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    {maintenanceExplanation.remainingKm !== null
                      ? maintenanceExplanation.remainingKm >= 0
                        ? `Restan ${maintenanceExplanation.remainingKm.toLocaleString('es-AR')} km`
                        : `Vencido por ${Math.abs(maintenanceExplanation.remainingKm).toLocaleString('es-AR')} km`
                      : 'Faltan datos de base'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Fecha Proyectada</span>
                  <span className="text-sm font-bold text-white">
                    {maintenanceExplanation.nextDueDate ?? 'Sin fecha'}
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    Calculado por tasa de uso mensual
                  </span>
                </div>
              </div>

              {/* Explicación textual */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 leading-relaxed text-slate-200">
                {maintenanceExplanation.explanation}
              </div>

              {/* Fundamentos Técnicos */}
              {maintenanceExplanation.basis.length > 0 && (
                <div className="space-y-1">
                  <span className="text-slate-300 font-bold block">Fundamentos del Cálculo</span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-400 text-[11px]">
                    {maintenanceExplanation.basis.map((b, idx) => (
                      <li key={idx}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Nivel de Incertidumbre */}
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Nivel de Confianza:</span>
                <span className="font-bold text-slate-200">{maintenanceExplanation.uncertainty}</span>
              </div>

              {/* Descargo Técnico Obligatorio */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-amber-300 text-[11px]">
                <Info className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <p className="leading-relaxed">{maintenanceExplanation.disclaimer}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsExplanationModalOpen(false)}
            >
              Entendido
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
