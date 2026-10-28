'use client';

import * as React from 'react';
import { AppShell } from '../components/layout/AppShell.tsx';
import { DashboardView } from '../components/domain/DashboardView.tsx';
import { EmptyState, Button } from '../components/ui/index.ts';
import { Wrench, ArrowLeft } from 'lucide-react';

export default function HomePage() {
  const [currentScreen, setCurrentScreen] = React.useState<string>('dashboard');

  return (
    <AppShell
      currentScreen={currentScreen}
      onNavigate={(screenId: string) => setCurrentScreen(screenId)}
      workshopName="Taller Central Belgrano"
      operatorName="Carlos Méndez"
      roleName="Jefe de Taller"
    >
      {currentScreen === 'dashboard' ? (
        <DashboardView
          onQuickServiceClick={() => setCurrentScreen('quick-service')}
          onVehicleClick={() => setCurrentScreen('vehicles')}
        />
      ) : (
        <div className="py-8">
          <EmptyState
            icon={<Wrench className="h-8 w-8 text-emerald-400" />}
            title={`Módulo: ${currentScreen.toUpperCase().replace('-', ' ')}`}
            description="Este módulo se encuentra en proceso de estandarización visual. En esta fase (Milestone 10.1), el prototipo activo para evaluación de diseño está enfocado en el App Shell, la navegación adaptativa y el Panel Operativo (Dashboard)."
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
