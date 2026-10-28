'use client';

import * as React from 'react';
import { cn } from '../../lib/utils.ts';
import {
  Gauge,
  Zap,
  Wrench,
  Car,
  ShieldCheck,
  Sparkles,
  Settings,
  Menu,
  ChevronRight,
  Building2,
  Clock,
  Layers,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { Sheet } from '../ui/sheet.tsx';
import { Badge } from '../ui/badge.tsx';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeVariant?: 'default' | 'warning' | 'info' | 'secondary';
}

export interface WorkshopItem {
  id: string;
  name: string;
  role: string;
}

export interface AppShellProps {
  children: React.ReactNode;
  currentScreen?: string;
  onNavigate?: (screenId: string) => void;
  workshopName?: string;
  operatorName?: string;
  roleName?: string;
  workshops?: WorkshopItem[];
  activeWorkshopId?: string;
  onSelectWorkshop?: (workshopId: string) => void;
  onLogout?: () => void;
  vehicleCount?: number;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  currentScreen = 'dashboard',
  onNavigate,
  workshopName = 'Taller Central Belgrano',
  operatorName = 'Carlos Méndez',
  roleName = 'Jefe de Taller',
  workshops = [],
  activeWorkshopId,
  onSelectWorkshop,
  onLogout,
  vehicleCount,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const mainNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Panel Operativo', icon: <Gauge className="h-4 w-4" /> },
    {
      id: 'quick-service',
      label: 'Quick Service',
      icon: <Zap className="h-4 w-4" />,
      badge: '<60s',
      badgeVariant: 'default',
    },
    {
      id: 'orders',
      label: 'Órdenes de Trabajo',
      icon: <Wrench className="h-4 w-4" />,
      badge: '4',
      badgeVariant: 'secondary',
    },
    {
      id: 'vehicles',
      label: 'Vehículos & Flota',
      icon: <Car className="h-4 w-4" />,
      badge: vehicleCount !== undefined ? String(vehicleCount) : undefined,
      badgeVariant: 'info',
    },
    {
      id: 'maintenance',
      label: 'Mantenimiento OEM',
      icon: <Clock className="h-4 w-4" />,
      badge: '3',
      badgeVariant: 'warning',
    },
    { id: 'ai-obd', label: 'Diagnóstico & OBD-2', icon: <Sparkles className="h-4 w-4" /> },
    { id: 'settings', label: 'Ajustes del Sistema', icon: <Settings className="h-4 w-4" /> },
  ];

  const handleNavClick = (id: string) => {
    onNavigate?.(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row antialiased">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-64 lg:w-72 flex-col shrink-0 border-r border-slate-800 bg-slate-900/60 backdrop-blur-md min-h-screen sticky top-0 h-screen">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-emerald-950">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block">
                AUTOMOTORS
              </span>
              <span className="text-[10px] text-emerald-400 font-mono tracking-wider uppercase block">
                Garage SaaS OS
              </span>
            </div>
          </div>
          <Badge variant="success" size="sm" dot>
            v1.0
          </Badge>
        </div>

        {/* WORKSHOP SELECTOR */}
        <div className="px-3 my-3">
          <div className="px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-emerald-400" />
                Taller Activo
              </span>
              {workshops.length > 1 && (
                <Badge variant="secondary" size="sm">
                  {workshops.length} talleres
                </Badge>
              )}
            </div>

            {workshops.length > 1 && onSelectWorkshop ? (
              <div className="relative mt-1">
                <select
                  value={activeWorkshopId || ''}
                  onChange={(e) => onSelectWorkshop(e.target.value)}
                  className="w-full appearance-none bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 pr-7 text-xs font-semibold text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  aria-label="Seleccionar taller activo"
                >
                  {workshops.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.role})
                    </option>
                  ))}
                </select>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            ) : (
              <span className="text-xs font-semibold text-slate-100 truncate block mt-0.5">
                {workshopName}
              </span>
            )}
          </div>
        </div>

        <nav className="flex-1 px-3 py-1 space-y-1 overflow-y-auto no-scrollbar">
          <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Operaciones
          </div>
          {mainNavItems.slice(0, 4).map((item) => {
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150',
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/25 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-emerald-400' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <Badge variant={item.badgeVariant || 'secondary'} size="sm">
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}

          <div className="pt-3 px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Ingeniería & Diagnóstico
          </div>
          {mainNavItems.slice(4).map((item) => {
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150',
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/25 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-emerald-400' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <Badge variant={item.badgeVariant || 'secondary'} size="sm">
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>

        {/* OPERATOR & LOGOUT FOOTER */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="h-8 w-8 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-200 font-medium text-xs shrink-0">
              {operatorName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold text-slate-100 truncate block">
                {operatorName}
              </span>
              <span className="text-[11px] text-slate-400 truncate block">{roleName}</span>
            </div>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              title="Cerrar Sesión"
              aria-label="Cerrar Sesión"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <header className="md:hidden sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-bold tracking-tight text-white block">
              AUTOMOTORS
            </span>
            <span className="text-[10px] text-emerald-400 font-mono block truncate max-w-[170px]">
              {workshopName}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onLogout && (
            <button
              onClick={onLogout}
              aria-label="Cerrar sesión"
              className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Abrir menú"
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 pb-24 md:pb-8">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">{children}</div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 flex items-center justify-around pb-[calc(env(safe-area-inset-bottom)+0.375rem)]">
        <button
          onClick={() => handleNavClick('dashboard')}
          className={cn(
            'flex flex-col items-center justify-center min-w-[64px] min-h-[44px] rounded-lg transition-colors',
            currentScreen === 'dashboard' ? 'text-emerald-400' : 'text-slate-400'
          )}
        >
          <Gauge className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] font-medium">Panel</span>
        </button>

        <button
          onClick={() => handleNavClick('orders')}
          className={cn(
            'flex flex-col items-center justify-center min-w-[64px] min-h-[44px] rounded-lg transition-colors',
            currentScreen === 'orders' ? 'text-emerald-400' : 'text-slate-400'
          )}
        >
          <Wrench className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] font-medium">Órdenes</span>
        </button>

        <button
          onClick={() => handleNavClick('quick-service')}
          className="flex flex-col items-center justify-center -mt-5"
          aria-label="Carga Rápida de Servicio"
        >
          <div className="h-12 w-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-transform active:scale-95">
            <Zap className="h-6 w-6 stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-bold text-emerald-400 mt-1">Express</span>
        </button>

        <button
          onClick={() => handleNavClick('vehicles')}
          className={cn(
            'flex flex-col items-center justify-center min-w-[64px] min-h-[44px] rounded-lg transition-colors',
            currentScreen === 'vehicles' ? 'text-emerald-400' : 'text-slate-400'
          )}
        >
          <Car className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] font-medium">Vehículos</span>
        </button>

        <button
          onClick={() => setMobileMenuOpen(true)}
          className={cn(
            'flex flex-col items-center justify-center min-w-[64px] min-h-[44px] rounded-lg transition-colors',
            mobileMenuOpen ? 'text-emerald-400' : 'text-slate-400'
          )}
        >
          <Layers className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] font-medium">Más</span>
        </button>
      </nav>

      {/* MOBILE SLIDE-UP SHEET */}
      <Sheet
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        title="Navegación & Módulos"
        description="Acceso a servicios adicionales y configuración"
      >
        <div className="space-y-4">
          {/* WORKSHOP SELECTOR IN MOBILE SHEET */}
          {workshops.length > 1 && onSelectWorkshop && (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                Cambiar Taller Activo
              </span>
              <select
                value={activeWorkshopId || ''}
                onChange={(e) => {
                  onSelectWorkshop(e.target.value);
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-medium text-slate-100"
              >
                {workshops.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            {mainNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  'flex w-full items-center justify-between p-3 rounded-xl text-sm font-medium transition-colors',
                  currentScreen === item.id
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-200 hover:bg-slate-800'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </button>
            ))}
          </div>

          {onLogout && (
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="flex w-full items-center justify-center gap-2 p-3 rounded-xl text-sm font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          )}
        </div>
      </Sheet>
    </div>
  );
};
