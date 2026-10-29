'use client';

import * as React from 'react';
import { cn } from '../../lib/utils.ts';
import {
  LayoutDashboard,
  Zap,
  Wrench,
  Car,
  ShieldCheck,
  Clock,
  Settings,
  Menu,
  ChevronRight,
  Building2,
  LogOut,
  ChevronDown,
  History,
  Layers,
  Activity,
} from 'lucide-react';
import { Sheet } from '../ui/sheet.tsx';
import { Badge } from '../ui/badge.tsx';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeVariant?: 'default' | 'warning' | 'info' | 'secondary' | 'success';
  isDevelopment?: boolean;
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

const SCREEN_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Panel Operativo',
    subtitle: 'Resumen en tiempo real del taller, vehículos e intervenciones activas',
  },
  vehicles: {
    title: 'Vehículos & Flota',
    subtitle: 'Padrón oficial de unidades registradas, fichas técnicas y odómetros',
  },
  orders: {
    title: 'Órdenes de Trabajo',
    subtitle: 'Gestión y seguimiento de servicios en proceso y completados',
  },
  'quick-service': {
    title: 'Quick Service Express',
    subtitle: 'Registro de intervenciones de rutina en menos de 60 segundos',
  },
  history: {
    title: 'Historial Vehicular',
    subtitle: 'Trazabilidad oficial inmutable y pasaporte técnico digital',
  },
  maintenance: {
    title: 'Mantenimiento OEM',
    subtitle: 'Planes preventivos oficiales por kilometraje e intervalos de fábrica',
  },
  diagnostics: {
    title: 'Diagnóstico OBD-II',
    subtitle: 'Telemetría en tiempo real, códigos DTC SAE J2012 y análisis asistido por IA',
  },
  settings: {
    title: 'Configuración',
    subtitle: 'Ajustes del taller, membresías de equipo y preferencias del sistema',
  },
};

export const AppShell: React.FC<AppShellProps> = ({
  children,
  currentScreen = 'dashboard',
  onNavigate,
  workshopName = 'Taller Central',
  operatorName = 'Operador',
  roleName = 'Mecánico',
  workshops = [],
  activeWorkshopId,
  onSelectWorkshop,
  onLogout,
  vehicleCount,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [mobileWorkshopOpen, setMobileWorkshopOpen] = React.useState(false);

  // Desktop & mobile navigation items
  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Inicio',
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      id: 'vehicles',
      label: 'Vehículos',
      icon: <Car className="h-4 w-4" />,
      badge: vehicleCount !== undefined ? String(vehicleCount) : undefined,
      badgeVariant: 'info',
    },
    {
      id: 'orders',
      label: 'Órdenes',
      icon: <Wrench className="h-4 w-4" />,
    },
    {
      id: 'quick-service',
      label: 'Quick Service',
      icon: <Zap className="h-4 w-4" />,
      badge: 'Express',
      badgeVariant: 'default',
    },
    {
      id: 'history',
      label: 'Historial',
      icon: <History className="h-4 w-4" />,
      badge: 'Próximamente',
      badgeVariant: 'secondary',
      isDevelopment: true,
    },
    {
      id: 'maintenance',
      label: 'Mantenimiento',
      icon: <Clock className="h-4 w-4" />,
      badge: 'OEM',
      badgeVariant: 'warning',
    },
    {
      id: 'diagnostics',
      label: 'Diagnóstico OBD',
      icon: <Activity className="h-4 w-4" />,
      badge: 'En vivo',
      badgeVariant: 'success',
    },
    {
      id: 'settings',
      label: 'Configuración',
      icon: <Settings className="h-4 w-4" />,
    },
  ];

  const handleNavClick = (id: string) => {
    onNavigate?.(id);
    setMobileMenuOpen(false);
    setMobileWorkshopOpen(false);
  };

  const currentInfo = SCREEN_TITLES[currentScreen] || {
    title: currentScreen.toUpperCase().replace('-', ' '),
    subtitle: 'Módulo del sistema Automotors Garage',
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row antialiased overflow-x-hidden w-full selection:bg-emerald-500 selection:text-slate-950">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-60 lg:w-64 flex-col shrink-0 border-r border-slate-800/80 bg-slate-900/70 backdrop-blur-md min-h-screen sticky top-0 h-screen z-30">
        {/* BRANDING HEADER */}
        <div className="h-16 px-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-emerald-950/80">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <span className="font-extrabold text-xs tracking-tight text-white block">
                AUTOMOTORS
              </span>
              <span className="text-[10px] text-emerald-400 font-mono tracking-wider uppercase block">
                Garage SaaS
              </span>
            </div>
          </div>
          <Badge variant="success" size="sm" dot>
            v1.0
          </Badge>
        </div>

        {/* NAVIGATION LIST */}
        <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 text-left min-h-[40px]',
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/25 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                )}
              >
                <div className="flex items-center gap-2.5">
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

        {/* SIDEBAR FOOTER */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Automotors © 2026</span>
          <span className="font-mono text-emerald-500/70">Online</span>
        </div>
      </aside>

      {/* RIGHT SIDE MAIN WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* DESKTOP TOP HEADER */}
        <header className="hidden md:flex h-16 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md px-6 items-center justify-between sticky top-0 z-20">
          {/* LEFT: SECTION TITLE */}
          <div>
            <h1 className="text-sm lg:text-base font-bold text-white tracking-tight">
              {currentInfo.title}
            </h1>
            <p className="text-[11px] text-slate-400 truncate max-w-lg">
              {currentInfo.subtitle}
            </p>
          </div>

          {/* RIGHT: WORKSHOP SELECTOR & USER PROFILE & LOGOUT */}
          <div className="flex items-center gap-3">
            {/* WORKSHOP SELECTOR PILL */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
              <Building2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              {workshops.length > 1 && onSelectWorkshop ? (
                <div className="relative">
                  <select
                    value={activeWorkshopId || ''}
                    onChange={(e) => onSelectWorkshop(e.target.value)}
                    className="appearance-none bg-transparent pr-5 font-semibold text-slate-200 focus:outline-none cursor-pointer text-xs"
                    aria-label="Seleccionar taller activo"
                  >
                    {workshops.map((w) => (
                      <option key={w.id} value={w.id} className="bg-slate-900 text-white">
                        {w.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="h-3 w-3 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              ) : (
                <span className="font-semibold text-slate-200 truncate max-w-[180px]">
                  {workshopName}
                </span>
              )}
            </div>

            {/* USER PROFILE */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-semibold text-xs shrink-0">
                {operatorName.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden lg:block">
                <span className="text-xs font-semibold text-slate-200 block truncate max-w-[120px]">
                  {operatorName}
                </span>
                <span className="text-[10px] text-emerald-400 block font-mono">
                  {roleName}
                </span>
              </div>
            </div>

            {/* LOGOUT BUTTON */}
            {onLogout && (
              <button
                onClick={onLogout}
                title="Cerrar Sesión"
                aria-label="Cerrar Sesión"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </header>

        {/* MOBILE TOP BAR (COMPACT, 52PX, NO HORIZONTAL OVERFLOW) */}
        <header className="md:hidden sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 py-2 flex items-center justify-between pt-[max(0.5rem,env(safe-area-inset-top))] min-h-[52px]">
          {/* BRAND */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-white tracking-tight leading-tight block">
                AUTOMOTORS
              </span>
              <button
                onClick={() => setMobileWorkshopOpen(true)}
                className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 hover:underline truncate max-w-[150px] text-left"
                aria-label="Taller activo"
              >
                <Building2 className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{workshopName}</span>
                {workshops.length > 1 && <ChevronDown className="h-2.5 w-2.5 shrink-0" />}
              </button>
            </div>
          </div>

          {/* USER & MENU TRIGGER */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onLogout && (
              <button
                onClick={onLogout}
                aria-label="Cerrar sesión"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-rose-400 transition-colors rounded-lg active:bg-slate-800"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menú de opciones"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-200 bg-slate-800/80 hover:bg-slate-700 transition-colors rounded-lg active:scale-95"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 min-w-0 pb-24 md:pb-8">
          <div className="p-3 sm:p-5 lg:p-6 max-w-6xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION (MOBILE-FIRST, TOUCH TARGETS >= 44X44, NO TRUNCATION) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-1 py-1 flex items-center justify-around pb-[max(0.25rem,env(safe-area-inset-bottom))] shadow-2xl">
        {/* 1. INICIO */}
        <button
          onClick={() => handleNavClick('dashboard')}
          className={cn(
            'flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors active:scale-95',
            currentScreen === 'dashboard'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          )}
          aria-label="Ir al Inicio"
        >
          <LayoutDashboard className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Inicio</span>
        </button>

        {/* 2. VEHÍCULOS */}
        <button
          onClick={() => handleNavClick('vehicles')}
          className={cn(
            'flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors active:scale-95',
            currentScreen === 'vehicles'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          )}
          aria-label="Ir a Vehículos"
        >
          <Car className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Vehículos</span>
        </button>

        {/* 3. QUICK SERVICE (FAB ACCION PRINCIPAL) */}
        <button
          onClick={() => handleNavClick('quick-service')}
          className="flex flex-col items-center justify-center -mt-5 px-1 min-h-[48px]"
          aria-label="Iniciar Quick Service Express"
        >
          <div className="h-12 w-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/40 transition-transform active:scale-90">
            <Zap className="h-6 w-6 stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-bold text-emerald-400 mt-1">Express</span>
        </button>

        {/* 4. ÓRDENES */}
        <button
          onClick={() => handleNavClick('orders')}
          className={cn(
            'flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors active:scale-95',
            currentScreen === 'orders'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          )}
          aria-label="Ir a Órdenes"
        >
          <Wrench className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Órdenes</span>
        </button>

        {/* 5. MENÚ MÁS */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className={cn(
            'flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors active:scale-95',
            mobileMenuOpen
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          )}
          aria-label="Más opciones"
        >
          <Layers className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Más</span>
        </button>
      </nav>

      {/* MOBILE WORKSHOP SELECTOR SHEET */}
      <Sheet
        isOpen={mobileWorkshopOpen}
        onClose={() => setMobileWorkshopOpen(false)}
        title="Talleres Asignados"
        description="Seleccioná el taller en el que estás operando actualmente"
      >
        <div className="space-y-3 p-1">
          {workshops.map((w) => {
            const isCurrent = (activeWorkshopId || '') === w.id;
            return (
              <button
                key={w.id}
                onClick={() => {
                  onSelectWorkshop?.(w.id);
                  setMobileWorkshopOpen(false);
                }}
                className={cn(
                  'w-full p-3.5 rounded-xl border text-left transition-colors flex items-center justify-between min-h-[48px]',
                  isCurrent
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
                )}
              >
                <div className="flex items-center gap-3">
                  <Building2 className={cn('h-5 w-5', isCurrent ? 'text-emerald-400' : 'text-slate-400')} />
                  <div>
                    <span className="text-sm font-semibold block">{w.name}</span>
                    <span className="text-xs text-slate-400 block font-mono">Rol: {w.role}</span>
                  </div>
                </div>
                {isCurrent && (
                  <Badge variant="success" size="sm">
                    Activo
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </Sheet>

      {/* MOBILE SLIDE-UP NAVIGATION & MENU SHEET */}
      <Sheet
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        title="Menú & Opciones"
        description="Acceso rápido a todos los módulos del taller"
      >
        <div className="space-y-4">
          {/* USER INFO CARD */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-bold text-sm">
                {operatorName.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-100 block">
                  {operatorName}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono block">
                  {roleName} • {workshopName}
                </span>
              </div>
            </div>
            {workshops.length > 1 && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setMobileWorkshopOpen(true);
                }}
                className="text-[11px] font-semibold text-emerald-400 hover:underline px-2 py-1"
              >
                Cambiar
              </button>
            )}
          </div>

          {/* ALL NAV ITEMS */}
          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  'flex w-full items-center justify-between p-3 rounded-xl text-sm font-medium transition-colors min-h-[44px]',
                  currentScreen === item.id
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold'
                    : 'text-slate-200 hover:bg-slate-800'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={currentScreen === item.id ? 'text-emerald-400' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.badge && (
                    <Badge variant={item.badgeVariant || 'secondary'} size="sm">
                      {item.badge}
                    </Badge>
                  )}
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                </div>
              </button>
            ))}
          </div>

          {/* LOGOUT BUTTON */}
          {onLogout && (
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="flex w-full items-center justify-center gap-2 p-3 rounded-xl text-sm font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-colors min-h-[44px]"
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
