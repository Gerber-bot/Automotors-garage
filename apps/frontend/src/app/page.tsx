'use client';

import * as React from 'react';
import { AppShell } from '../components/layout/AppShell.tsx';
import { DashboardView } from '../components/domain/DashboardView.tsx';
import { VehiclesView } from '../components/domain/VehiclesView.tsx';
import { ServiceQuickEntry } from '../components/domain/ServiceQuickEntry.tsx';
import { DiagnosticsView } from '../components/domain/DiagnosticsView.tsx';
import { MiAutomotorsView } from '../components/domain/MiAutomotorsView.tsx';
import { LoginView } from '../components/domain/LoginView.tsx';
import { EmptyState, Button, LoadingState } from '../components/ui/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { Wrench, ArrowLeft, ShieldCheck, CarFront } from 'lucide-react';

export default function HomePage() {
  const {
    user,
    isAuthenticated,
    isLoading,
    activeWorkshop,
    workshops,
    activePortal,
    setActivePortal,
    selectWorkshop,
    logout,
  } = useAuth();

  const [currentScreen, setCurrentScreen] = React.useState<string>('dashboard');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const screenParam = params.get('screen');
      if (screenParam) {
        setCurrentScreen(screenParam);
      }
      const portalParam = params.get('portal');
      if (portalParam === 'owner') {
        setActivePortal('OWNER');
      } else if (portalParam === 'workshop' && workshops.length > 0) {
        setActivePortal('WORKSHOP');
      }
    }
  }, [setActivePortal, workshops.length]);

  // Loading Session Recovery
  if (isLoading && !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white shadow-xl shadow-emerald-950 mb-4 animate-pulse">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <LoadingState label="Iniciando Automotors Garage..." />
      </div>
    );
  }

  // Unauthenticated State: Show Login / Owner Registration
  if (!isAuthenticated || !user) {
    return <LoginView />;
  }

  // Mi Automotors Portal (Vehicle Owner Experience)
  if (activePortal === 'OWNER' || workshops.length === 0) {
    return <MiAutomotorsView />;
  }

  // Authenticated Workshop State: Show AppShell (Automotors Pro)
  return (
    <AppShell
      currentScreen={currentScreen}
      onNavigate={(screenId: string) => {
        if (screenId === 'mi-automotors') {
          setActivePortal('OWNER');
          return;
        }
        setCurrentScreen(screenId);
      }}
      workshopName={activeWorkshop?.name || 'Taller Central'}
      operatorName={user.fullName || user.email}
      roleName={user.role || 'Mecánico'}
      workshops={workshops}
      activeWorkshopId={activeWorkshop?.id}
      onSelectWorkshop={selectWorkshop}
      onLogout={logout}
    >
      <div className="mb-3 flex items-center justify-end">
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<CarFront className="h-3.5 w-3.5 text-sky-400" />}
          onClick={() => setActivePortal('OWNER')}
        >
          Ir a Mi Automotors (Portal Propietario)
        </Button>
      </div>

      {currentScreen === 'dashboard' ? (
        <DashboardView
          onQuickServiceClick={() => setCurrentScreen('quick-service')}
          onVehicleClick={() => setCurrentScreen('vehicles')}
          onViewAllOrders={() => setCurrentScreen('orders')}
          onDiagnosticsClick={() => setCurrentScreen('diagnostics')}
        />
      ) : currentScreen === 'vehicles' ? (
        <VehiclesView
          onQuickServiceForVehicle={() => setCurrentScreen('quick-service')}
        />
      ) : currentScreen === 'diagnostics' || currentScreen === 'ai-obd' ? (
        <div className="space-y-4">
          <DiagnosticsView
            onNavigateToHistory={() => setCurrentScreen('vehicles')}
          />
        </div>
      ) : currentScreen === 'quick-service' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => setCurrentScreen('dashboard')}
            >
              Volver al Panel
            </Button>
          </div>
          <ServiceQuickEntry
            onServiceSaved={() => {
              setCurrentScreen('dashboard');
            }}
          />
        </div>
      ) : (
        <div className="py-8">
          <EmptyState
            icon={<Wrench className="h-8 w-8 text-emerald-400" />}
            title={`Módulo: ${currentScreen.toUpperCase().replace('-', ' ')}`}
            description="Este módulo operativo se sincronizará con las capacidades de backend correspondientes en los próximos hitos."
            action={
              <Button
                variant="primary"
                size="md"
                leftIcon={<ArrowLeft className="h-4 w-4" />}
                onClick={() => setCurrentScreen('dashboard')}
              >
                Volver al Panel de Control
              </Button>
            }
          />
        </div>
      )}
    </AppShell>
  );
}
