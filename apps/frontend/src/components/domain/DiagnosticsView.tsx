'use client';

import * as React from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Gauge,
  Info,
  Layers,
  Play,
  RotateCw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Square,
  Thermometer,
  Usb,
  Zap,
} from 'lucide-react';
import {
  Button,
  Card,
  Badge,
  Dialog,
  Sheet,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  PageHeader,
} from '../ui/index.ts';
import { ApiClient } from '../../api/client.ts';
import type {
  Vehicle,
  SerialPortInfo,
  ObdTelemetrySnapshot,
  ObdAiAnalysis,
} from '../../api/contracts.ts';

export interface DiagnosticsViewProps {
  initialVehicleId?: string;
  onNavigateToHistory?: (vehicleId: string) => void;
}

export function DiagnosticsView({
  initialVehicleId,
  onNavigateToHistory,
}: DiagnosticsViewProps) {
  const [vehicles, setVehicles] = React.useState<readonly Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = React.useState<string>(
    initialVehicleId || ''
  );
  const [availablePorts, setAvailablePorts] = React.useState<SerialPortInfo[]>([]);
  const [selectedPort, setSelectedPort] = React.useState<string>('');
  const [transportMode, setTransportMode] = React.useState<'SIMULATED' | 'WINDOWS_USB_SERIAL'>('SIMULATED');

  // Connection and live telemetry state
  const [isConnected, setIsConnected] = React.useState<boolean>(false);
  const [isConnecting, setIsConnecting] = React.useState<boolean>(false);
  const [telemetry, setTelemetry] = React.useState<ObdTelemetrySnapshot | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // AI Interpretation state
  const [isAiLoading, setIsAiLoading] = React.useState<boolean>(false);
  const [aiAnalysis, setAiAnalysis] = React.useState<ObdAiAnalysis | null>(null);
  const [isAiSheetOpen, setIsAiSheetOpen] = React.useState<boolean>(false);

  // Snapshot Saving state
  const [isSavingSnapshot, setIsSavingSnapshot] = React.useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = React.useState<string | null>(null);
  const [technicianNotes, setTechnicianNotes] = React.useState<string>('');
  const [isSaveModalOpen, setIsSaveModalOpen] = React.useState<boolean>(false);

  // Simulator Fault Injection Configuration (Simulated Mode only)
  const [simFault, setSimFault] = React.useState<'NONE' | 'NO_DATA' | 'UNABLE_TO_CONNECT' | 'BUS_BUSY' | 'TIMEOUT'>('NONE');
  const [simMilActive, setSimMilActive] = React.useState<boolean>(true);

  const client = React.useMemo(() => new ApiClient(), []);

  // Fetch initial vehicles & ports
  React.useEffect(() => {
    let isMounted = true;
    async function loadInitialData() {
      try {
        const [vehiclesList, portsResponse] = await Promise.all([
          client.getVehicles(),
          client.getDiagnosticsPorts().catch(() => ({ ports: [] })),
        ]);
        if (isMounted) {
          setVehicles(vehiclesList);
          if (vehiclesList.length > 0 && !selectedVehicleId) {
            setSelectedVehicleId(vehiclesList[0]?.id ?? '');
          }
          setAvailablePorts(portsResponse.ports);
          if (portsResponse.ports.length > 0) {
            setSelectedPort(portsResponse.ports[0]?.path ?? '');
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setErrorMessage(err instanceof Error ? err.message : 'Error al cargar datos iniciales de diagnóstico.');
        }
      }
    }
    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, [client, selectedVehicleId]);

  // Live Telemetry Polling Loop
  React.useEffect(() => {
    if (!isConnected || !selectedVehicleId) {
      return;
    }

    let isPolling = true;
    const interval = setInterval(async () => {
      try {
        const live = await client.getDiagnosticsLive(selectedVehicleId);
        if (isPolling) {
          setTelemetry(live);
          setErrorMessage(null);
        }
      } catch (err: unknown) {
        if (isPolling) {
          setErrorMessage(err instanceof Error ? err.message : 'Error en comunicación con el adaptador OBD-II');
        }
      }
    }, 1200);

    return () => {
      isPolling = false;
      clearInterval(interval);
    };
  }, [isConnected, selectedVehicleId, client]);

  // Handle Connect
  const handleConnect = async () => {
    if (!selectedVehicleId) {
      setErrorMessage('Seleccioná un vehículo antes de iniciar la sesión de diagnóstico.');
      return;
    }

    setIsConnecting(true);
    setErrorMessage(null);
    setSaveSuccessMessage(null);

    try {
      await client.startDiagnosticsSession({
        vehicleId: selectedVehicleId,
        transportType: transportMode,
        comPort: transportMode === 'WINDOWS_USB_SERIAL' ? selectedPort : undefined,
        simulatorConfig:
          transportMode === 'SIMULATED'
            ? {
                milActive: simMilActive,
                faultInjection: simFault,
                storedDtcs: simMilActive ? ['P0300', 'P0115'] : [],
              }
            : undefined,
      });

      // Fetch first snapshot immediately
      const initialSnapshot = await client.getDiagnosticsLive(selectedVehicleId);
      setTelemetry(initialSnapshot);
      setIsConnected(true);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'No se pudo establecer la conexión OBD-II.');
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle Disconnect
  const handleDisconnect = async () => {
    if (!selectedVehicleId) return;
    try {
      await client.stopDiagnosticsSession(selectedVehicleId);
    } catch {
      // Best-effort stop
    } finally {
      setIsConnected(false);
    }
  };

  // Handle AI Diagnostics Interpretation
  const handleInterpretWithAi = async () => {
    if (!telemetry || telemetry.dtcCodes.length === 0) return;

    setIsAiLoading(true);
    setErrorMessage(null);

    const vehicle = vehicles.find((v) => v.id === selectedVehicleId);
    const dtcList = telemetry.dtcCodes.map((d) => d.code);

    try {
      const response = await client.interpretObd2({
        dtcCodes: dtcList,
        vehicleSpecs: {
          make: vehicle?.make || 'Renault',
          model: vehicle?.model || 'Logan',
          year: vehicle?.year || 2020,
          engine: vehicle?.engine || 'H4M 1.6 16v (Estimado)',
          fuel: vehicle?.fuelType || 'Nafta',
        },
      });

      setAiAnalysis({
        codesAnalyzed: response.codesAnalyzed || response.analysis?.codesAnalyzed || dtcList,
        systemicImpact: response.systemicImpact || response.analysis?.systemicImpact || 'Sin impacto crítico detectado.',
        urgencyLevel: response.urgencyLevel || response.analysis?.urgencyLevel || 'ATTENTION_NEEDED',
        mechanicChecklist: response.mechanicChecklist || response.analysis?.mechanicChecklist || [
          'Verificar estado de conectores y cableado del sensor.',
          'Medir resistencia de bobina de encendido según especificación OEM.',
          'Comprobar nivel y estado del líquido refrigerante.',
        ],
        disclaimer:
          response.disclaimer ||
          'Aviso de seguridad técnica: Este diagnóstico asistido por IA tiene carácter orientativo y no vinculante. Toda intervención debe ser validada por un mecánico profesional mediante instrumental certificado antes de proceder al reemplazo de piezas.',
      });
      setIsAiSheetOpen(true);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al ejecutar la interpretación asistida por IA.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Handle Save Snapshot
  const handleSaveSnapshot = async () => {
    if (!selectedVehicleId || !telemetry) return;

    setIsSavingSnapshot(true);
    try {
      await client.saveDiagnosticsSnapshot({
        vehicleId: selectedVehicleId,
        telemetry,
        technicianNotes: technicianNotes.trim() || undefined,
      });

      setSaveSuccessMessage('Diagnóstico guardado exitosamente en el historial del vehículo.');
      setIsSaveModalOpen(false);
      setTechnicianNotes('');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al guardar el diagnóstico en el historial.');
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  return (
    <div className="space-y-6">
      {/* HEADER & CONTEXT */}
      <PageHeader
        title="Automotors Diagnostics"
        subtitle="Diagnóstico electrónico OBD-II bajo protocolo estándar SAE J1979 / ISO 15031 con garantía de lectura segura."
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5" />
              Guardia Read-Only Activa
            </span>
          </div>
        }
      />

      {/* ERROR / SUCCESS ALERTS */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setErrorMessage(null)}>
            Descartar
          </Button>
        </div>
      )}

      {saveSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
          <div className="flex items-center gap-2">
            {onNavigateToHistory && selectedVehicleId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateToHistory(selectedVehicleId)}
              >
                Ver en Historial
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setSaveSuccessMessage(null)}>
              Cerrar
            </Button>
          </div>
        </div>
      )}

      {/* CONNECTION CONTROL PANEL */}
      <Card className="p-5 border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">
          {/* VEHICLE SELECTION */}
          <div className="lg:col-span-4 space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-emerald-400" />
              Vehículo en Bahía de Diagnóstico
            </label>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              disabled={isConnected || isConnecting}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate || 'S/P'} — {v.make} {v.model} ({v.year})
                </option>
              ))}
            </select>
          </div>

          {/* TRANSPORT MODE TOGGLE */}
          <div className="lg:col-span-4 space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Usb className="h-3.5 w-3.5 text-emerald-400" />
              Tipo de Enlace OBD-II
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isConnected || isConnecting}
                onClick={() => setTransportMode('SIMULATED')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                  transportMode === 'SIMULATED'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900'
                }`}
              >
                Simulador Logan 1.6
              </button>
              <button
                type="button"
                disabled={isConnected || isConnecting}
                onClick={() => setTransportMode('WINDOWS_USB_SERIAL')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                  transportMode === 'WINDOWS_USB_SERIAL'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900'
                }`}
              >
                USB Serial Windows (COM)
              </button>
            </div>
          </div>

          {/* COM PORT SELECTOR OR SIMULATOR CONTROLS */}
          <div className="lg:col-span-2 space-y-1.5">
            {transportMode === 'WINDOWS_USB_SERIAL' ? (
              <>
                <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                  <span>Puerto COM</span>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await client.getDiagnosticsPorts().catch(() => ({ ports: [] }));
                      setAvailablePorts(res.ports);
                    }}
                    className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <RotateCw className="h-2.5 w-2.5" /> Detectar
                  </button>
                </label>
                <select
                  value={selectedPort}
                  onChange={(e) => setSelectedPort(e.target.value)}
                  disabled={isConnected || isConnecting}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                >
                  {availablePorts.length === 0 ? (
                    <option value="">No hay puertos COM</option>
                  ) : (
                    availablePorts.map((p) => (
                      <option key={p.path} value={p.path}>
                        {p.path} {p.friendlyName ? `(${p.friendlyName})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </>
            ) : (
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Fallas / MIL Simulado</label>
                <div className="flex items-center gap-2">
                  <select
                    value={simFault}
                    onChange={(e) => setSimFault(e.target.value as any)}
                    disabled={isConnected || isConnecting}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  >
                    <option value="NONE">Sin fallas (Normal)</option>
                    <option value="NO_DATA">NO DATA</option>
                    <option value="UNABLE_TO_CONNECT">UNABLE TO CONNECT</option>
                    <option value="BUS_BUSY">BUS BUSY</option>
                    <option value="TIMEOUT">TIMEOUT</option>
                  </select>
                  <label className="flex items-center gap-1 text-[11px] text-slate-300 whitespace-nowrap cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simMilActive}
                      onChange={(e) => setSimMilActive(e.target.checked)}
                      disabled={isConnected || isConnecting}
                      className="rounded bg-slate-950 border-slate-700 text-emerald-500"
                    />
                    MIL
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* ACTION BUTTON: CONNECT / DISCONNECT */}
          <div className="lg:col-span-2">
            {!isConnected ? (
              <Button
                variant="primary"
                className="w-full justify-center"
                onClick={handleConnect}
                isLoading={isConnecting}
                leftIcon={<Play className="h-4 w-4" />}
              >
                Conectar
              </Button>
            ) : (
              <Button
                variant="danger"
                className="w-full justify-center"
                onClick={handleDisconnect}
                leftIcon={<Square className="h-4 w-4" />}
              >
                Desconectar
              </Button>
            )}
          </div>
        </div>

        {/* CONNECTION STATUS BANNER */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
              }`}
            />
            <span className="font-medium text-slate-200">
              {isConnected
                ? 'Conexión activa — Transmisión de telemetría a 1.2s'
                : 'Desconectado — Seleccioná el puerto e iniciá el escaneo'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {transportMode === 'SIMULATED' && (
              <Badge variant="warning" size="sm">
                Modo Simulación Activo (Renault Logan 1.6)
              </Badge>
            )}
            {telemetry && (
              <span className="text-[11px] font-mono text-slate-400">
                Protocolo: {telemetry.protocol} | Adaptador: {telemetry.adapterIdentifier}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* READ-ONLY SAFETY GUARD NOTICE */}
      <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <strong className="text-white">Garantía de Seguridad Automotors:</strong> El sistema
          opera bajo una lista blanca restringida de comandos (Modos 01, 03, 07, 09 y comandos de configuración AT).
          Quedan estrictamente bloqueados los modos de borrado de fallas (Modo 04), prueba de actuadores
          (Modo 08) y cualquier reescritura de memoria en la ECU para proteger la integridad del vehículo.
        </div>
      </div>

      {/* TELEMETRY GAUGES GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* RPM CARD */}
        <Card className="p-4 border-slate-800 bg-slate-900/70">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">RPM Motor</span>
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {telemetry ? telemetry.sensors.rpm.toLocaleString() : '---'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Límite 6.500 RPM</div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                (telemetry?.sensors.rpm || 0) > 4500 ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{
                width: `${Math.min(100, ((telemetry?.sensors.rpm || 0) / 6500) * 100)}%`,
              }}
            />
          </div>
        </Card>

        {/* SPEED CARD */}
        <Card className="p-4 border-slate-800 bg-slate-900/70">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Velocidad</span>
            <Gauge className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {telemetry ? telemetry.sensors.speed : '---'}{' '}
            <span className="text-xs font-normal text-slate-400">km/h</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Sensor de salida caja</div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-500"
              style={{
                width: `${Math.min(100, ((telemetry?.sensors.speed || 0) / 200) * 100)}%`,
              }}
            />
          </div>
        </Card>

        {/* COOLANT TEMP CARD */}
        <Card className="p-4 border-slate-800 bg-slate-900/70">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Refrigerante</span>
            <Thermometer className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {telemetry ? telemetry.sensors.coolantTemp : '---'}{' '}
            <span className="text-xs font-normal text-slate-400">°C</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Normal: 85°C — 102°C</div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                (telemetry?.sensors.coolantTemp || 0) > 105 ? 'bg-rose-500' : 'bg-amber-400'
              }`}
              style={{
                width: `${Math.min(100, Math.max(0, (((telemetry?.sensors.coolantTemp || 0) + 40) / 160) * 100))}%`,
              }}
            />
          </div>
        </Card>

        {/* ENGINE LOAD */}
        <Card className="p-4 border-slate-800 bg-slate-900/70">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Carga Motor</span>
            <Cpu className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {telemetry ? telemetry.sensors.engineLoad : '---'}{' '}
            <span className="text-xs font-normal text-slate-400">%</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">PID 0104 Calculada</div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all duration-500"
              style={{
                width: `${Math.min(100, telemetry?.sensors.engineLoad || 0)}%`,
              }}
            />
          </div>
        </Card>

        {/* VOLTAGE CARD */}
        <Card className="p-4 border-slate-800 bg-slate-900/70" title="Tensión de barra analógica leída por adaptador. No certifica estado de salud de batería (SOH/CCA).">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tensión Barra</span>
            <Zap className="h-4 w-4 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {telemetry ? telemetry.sensors.adapterVoltage.toFixed(1) : '---'}{' '}
            <span className="text-xs font-normal text-slate-400">V (ATRV)</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Carga barra / No certifica SOH</div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                (telemetry?.sensors.adapterVoltage || 0) < 12.2 ? 'bg-rose-500' : 'bg-emerald-400'
              }`}
              style={{
                width: `${Math.min(100, (((telemetry?.sensors.adapterVoltage || 0) - 10) / 6) * 100)}%`,
              }}
            />
          </div>
        </Card>

        {/* MIL / CHECK ENGINE CARD */}
        <Card className="p-4 border-slate-800 bg-slate-900/70">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Check Engine</span>
            <AlertTriangle
              className={`h-4 w-4 ${
                telemetry?.sensors.milStatus ? 'text-amber-400 animate-bounce' : 'text-slate-600'
              }`}
            />
          </div>
          <div className="text-xl font-bold font-mono">
            {telemetry ? (
              telemetry.sensors.milStatus ? (
                <span className="text-amber-400">ACTIVA (MIL)</span>
              ) : (
                <span className="text-emerald-400">APAGADA</span>
              )
            ) : (
              <span className="text-slate-500">---</span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {telemetry ? `${telemetry.dtcCodes.length} DTCs detectados` : 'Sin enlace'}
          </div>
        </Card>
      </div>

      {/* DTC TROUBLE CODES & ACTION BAR */}
      <Card className="border-slate-800 bg-slate-900/70 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Códigos de Falla Diagnosticados (DTC)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Lectura directa de Modo 03 (Confirmados) y Modo 07 (Pendientes) según SAE J2012 / ISO 15031-6.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!telemetry || telemetry.dtcCodes.length === 0}
              onClick={handleInterpretWithAi}
              isLoading={isAiLoading}
              leftIcon={<Sparkles className="h-4 w-4 text-emerald-400" />}
            >
              Interpretar con IA Asistida
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!telemetry}
              onClick={() => setIsSaveModalOpen(true)}
              leftIcon={<Save className="h-4 w-4" />}
            >
              Guardar en Historial
            </Button>
          </div>
        </div>

        {/* DTC TABLE */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="w-24 text-slate-400">Código</TableHead>
                <TableHead className="w-32 text-slate-400">Subsistema</TableHead>
                <TableHead className="text-slate-400">Descripción Técnica</TableHead>
                <TableHead className="w-28 text-slate-400">Severidad</TableHead>
                <TableHead className="w-28 text-slate-400">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!telemetry || telemetry.dtcCodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <CheckCircle2 className="h-8 w-8 text-emerald-400/50 mb-2" />
                      <p className="text-sm font-medium text-slate-300">
                        {telemetry
                          ? 'No se detectaron códigos de falla almacenados en la ECU.'
                          : 'Iniciá la sesión de diagnóstico para consultar los códigos de falla.'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Lectura pasiva sin afectación a la memoria del vehículo.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                telemetry.dtcCodes.map((dtc) => (
                  <TableRow key={dtc.code} className="border-slate-800/80 hover:bg-slate-800/50">
                    <TableCell className="font-mono font-bold text-amber-400">{dtc.code}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" size="sm">
                        {dtc.system}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-200">
                      <div className="font-medium">{dtc.description}</div>
                      {dtc.possibleCauses.length > 0 && (
                        <div className="text-xs text-slate-400 mt-1">
                          <span className="text-slate-500 font-medium">Causas probables: </span>
                          {dtc.possibleCauses.slice(0, 2).join(', ')}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          dtc.severity === 'CRITICAL'
                            ? 'danger'
                            : dtc.severity === 'HIGH'
                            ? 'warning'
                            : 'secondary'
                        }
                        size="sm"
                      >
                        {dtc.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={dtc.isPending ? 'secondary' : 'default'} size="sm">
                        {dtc.isPending ? 'Pendiente' : 'Confirmado'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* AI ANALYSIS DRAWER / SHEET */}
      <Sheet
        isOpen={isAiSheetOpen}
        onClose={() => setIsAiSheetOpen(false)}
        title="Interpretación Asistida de Diagnóstico (IA)"
        description="Análisis correlacionado de telemetría y códigos DTC para asistencia al mecánico."
      >
        {aiAnalysis && (
          <div className="space-y-5 p-1">
            {/* URGENCY BADGE */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Nivel de Urgencia Operativa</span>
                <span className="text-sm font-semibold text-white">
                  {aiAnalysis.urgencyLevel === 'IMMEDIATE_ACTION'
                    ? 'Acción Inmediata Requerida'
                    : aiAnalysis.urgencyLevel === 'ATTENTION_NEEDED'
                    ? 'Atención en Próximo Servicio'
                    : 'Monitoreo Periódico'}
                </span>
              </div>
              <Badge
                variant={
                  aiAnalysis.urgencyLevel === 'IMMEDIATE_ACTION'
                    ? 'danger'
                    : aiAnalysis.urgencyLevel === 'ATTENTION_NEEDED'
                    ? 'warning'
                    : 'secondary'
                }
              >
                {aiAnalysis.urgencyLevel}
              </Badge>
            </div>

            {/* SYSTEMIC IMPACT */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Impacto en el Vehículo
              </h4>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                {aiAnalysis.systemicImpact}
              </div>
            </div>

            {/* MECHANIC CHECKLIST */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Procedimiento Sugerido para el Mecánico
              </h4>
              <div className="space-y-2">
                {aiAnalysis.mechanicChecklist.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-200"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[11px] border border-emerald-500/20">
                      {idx + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* MANDATORY LEGAL & SAFETY DISCLAIMER */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
              <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-300 leading-relaxed">
                {aiAnalysis.disclaimer}
              </p>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                className="w-full justify-center"
                onClick={() => setIsAiSheetOpen(false)}
              >
                Entendido y Cerrar
              </Button>
            </div>
          </div>
        )}
      </Sheet>

      {/* SAVE SNAPSHOT MODAL */}
      <Dialog
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        title="Registrar Diagnóstico en Historial Vehicular"
        description="Esta acción creará un registro de diagnóstico no destructivo en el pasaporte técnico de la unidad."
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
            <div>
              <span className="text-slate-300 font-medium">Vehículo:</span>{' '}
              {selectedVehicle?.make} {selectedVehicle?.model} ({selectedVehicle?.plate || 'S/P'})
            </div>
            <div>
              <span className="text-slate-300 font-medium">Códigos DTC a registrar:</span>{' '}
              {telemetry?.dtcCodes.length || 0} fallas activas
            </div>
            <div>
              <span className="text-slate-300 font-medium">Protocolo:</span>{' '}
              {telemetry?.protocol} ({telemetry?.isSimulated ? 'Simulador' : 'Hardware Físico'})
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Observaciones del Técnico (Opcional)
            </label>
            <textarea
              rows={3}
              value={technicianNotes}
              onChange={(e) => setTechnicianNotes(e.target.value)}
              placeholder="Ej: Cliente reporta tironeos en baja. Escaneo confirma falla de encendido intermitente en cilindro 1."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSaveModalOpen(false)}
              disabled={isSavingSnapshot}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveSnapshot}
              isLoading={isSavingSnapshot}
              leftIcon={<Save className="h-4 w-4" />}
            >
              Confirmar y Guardar
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
