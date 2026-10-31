'use client';

import * as React from 'react';
import {
  ShieldCheck,
  CarFront,
  Wrench,
  Clock,
  CheckCircle2,
  FileText,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  ArrowRight,
  Lock,
  Database,
  Cpu,
  Activity,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

interface LandingViewProps {
  onGoToAuth: () => void;
  onGoToDemoOwner?: () => void;
  onGoToDemoWorkshop?: () => void;
}

export function LandingView({ onGoToAuth }: LandingViewProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [activePreviewTab, setActivePreviewTab] = React.useState<'owner' | 'workshop' | 'obd'>('owner');
  const [openFaqIndex, setOpenFaqIndex] = React.useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* ==================================================================== */}
      {/* 1. HEADER & NAVBAR                                                   */}
      {/* ==================================================================== */}
      <header className="sticky top-0 z-40 w-full bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* LOGO */}
          <a
            href="#inicio"
            className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-lg p-1"
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-emerald-950 ring-1 ring-emerald-400/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-white leading-tight">
                AUTOMOTORS<span className="text-emerald-400">.</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold leading-none">
                Garage Platform
              </span>
            </div>
          </a>

          {/* DESKTOP NAVIGATION */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <a href="#inicio" className="hover:text-emerald-400 transition-colors">
              Inicio
            </a>
            <a href="#mi-automotors" className="hover:text-emerald-400 transition-colors">
              Mi Automotors
            </a>
            <a href="#automotors-pro" className="hover:text-emerald-400 transition-colors">
              Automotors Pro
            </a>
            <a href="#como-funciona" className="hover:text-emerald-400 transition-colors">
              Cómo Funciona
            </a>
            <a href="#vistas-previas" className="hover:text-emerald-400 transition-colors">
              Vistas Previas
            </a>
            <a href="#seguridad" className="hover:text-emerald-400 transition-colors">
              Seguridad
            </a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">
              FAQ
            </a>
          </nav>

          {/* RIGHT ACTION */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={onGoToAuth}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-md shadow-emerald-950/40 hover:shadow-emerald-500/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              Acceder a la Plataforma
            </button>
          </div>

          {/* MOBILE MENU TOGGLE */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-expanded={mobileMenuOpen}
              aria-label="Menú principal de navegación"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* MOBILE NAVIGATION DRAWER */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-800 bg-slate-950 px-4 pt-2 pb-6 space-y-3">
            <a
              href="#inicio"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-900 hover:text-emerald-400"
            >
              Inicio
            </a>
            <a
              href="#mi-automotors"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-900 hover:text-emerald-400"
            >
              Mi Automotors (Propietarios)
            </a>
            <a
              href="#automotors-pro"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-900 hover:text-emerald-400"
            >
              Automotors Pro (Talleres)
            </a>
            <a
              href="#como-funciona"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-900 hover:text-emerald-400"
            >
              Cómo Funciona
            </a>
            <a
              href="#vistas-previas"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-900 hover:text-emerald-400"
            >
              Vistas Previas
            </a>
            <a
              href="#seguridad"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-900 hover:text-emerald-400"
            >
              Seguridad y Privacidad
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-900 hover:text-emerald-400"
            >
              Preguntas Frecuentes
            </a>
            <div className="pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onGoToAuth();
                }}
                className="w-full py-2.5 px-4 text-center text-sm font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-md"
              >
                Acceder a la Plataforma
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ==================================================================== */}
      {/* 2. HERO SECTION                                                      */}
      {/* ==================================================================== */}
      <section id="inicio" className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[300px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-slate-300 text-xs font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>PLATAFORMA INTEGRAL DE GESTIÓN VEHICULAR Y DE TALLER</span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            El historial de tu vehículo.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
              La gestión de tu taller.
            </span>{' '}
            Una misma plataforma.
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Automotors Garage reúne herramientas para organizar vehículos, registrar mantenimientos y
            gestionar servicios, con experiencias adaptadas a propietarios y talleres.
          </p>

          {/* Two Core Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            {/* CTA 1: Probar Mi Automotors */}
            <div className="w-full sm:w-auto relative group">
              <a
                href="/demo/propietario"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 hover:shadow-emerald-500/20 active:scale-95 transition-all"
              >
                <CarFront className="h-4 w-4" />
                <span>Probar Mi Automotors</span>
              </a>
              <div className="mt-1 text-center">
                <span className="text-[11px] font-medium text-emerald-400/90 bg-emerald-950/50 border border-emerald-800/40 px-2 py-0.5 rounded-full inline-block">
                  Demo interactiva disponible
                </span>
              </div>
            </div>

            {/* CTA 2: Probar Automotors Pro */}
            <div className="w-full sm:w-auto relative group">
              <a
                href="/demo/taller"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-700/80 hover:border-emerald-500/50 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-slate-950/60 active:scale-95 transition-all"
              >
                <Wrench className="h-4 w-4 text-emerald-400" />
                <span>Probar Automotors Pro</span>
              </a>
              <div className="mt-1 text-center">
                <span className="text-[11px] font-medium text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full inline-block">
                  Demo interactiva disponible
                </span>
              </div>
            </div>
          </div>

          {/* Direct link for existing accounts */}
          <p className="text-xs text-slate-400 pt-2">
            ¿Ya tenés una cuenta registrada?{' '}
            <button
              onClick={onGoToAuth}
              className="text-emerald-400 hover:underline font-semibold inline-flex items-center gap-1"
            >
              Iniciar sesión en la plataforma <ArrowRight className="h-3 w-3" />
            </button>
          </p>

          {/* Interactive Split Card in Hero */}
          <div className="pt-8 max-w-5xl mx-auto">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-2 sm:p-4 backdrop-blur shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                {/* Left Card: Mi Automotors Preview */}
                <div className="p-4 sm:p-5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
                        <CarFront className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-200">MI AUTOMOTORS</span>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                      AF123CD
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Toyota Corolla Hybrid 2021</h4>
                    <p className="text-xs font-mono text-slate-400">38.500 km · Odómetro verificado</p>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-200 font-medium">Service de 30.000 km</span>
                        <span className="block text-[10px] text-slate-400">Aceite 0W-20 sintético + filtros</span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                        Taller Certificado
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-200 font-medium">Rotación de Neumáticos</span>
                        <span className="block text-[10px] text-slate-400">35.000 km · Lubricentro amigo</span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/60 border border-slate-700/40 px-1.5 py-0.5 rounded">
                        Declarado por Dueño
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Card: Automotors Pro Preview */}
                <div className="p-4 sm:p-5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        <Wrench className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-200">AUTOMOTORS PRO</span>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                      Taller Central Activo
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Recepción y Órdenes de Trabajo</h4>
                    <p className="text-xs text-slate-400">4 órdenes activas · Quick Service disponible</p>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-200 font-medium font-mono">OT-2026-089</span>
                        <span className="block text-[10px] text-slate-400">Ford Ranger 4x4 · Tren delantero</span>
                      </div>
                      <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/40 px-1.5 py-0.5 rounded">
                        EN PROGRESO
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-200 font-medium">Registro Ágil de Servicios</span>
                        <span className="block text-[10px] text-slate-400">Carga express con confirmación humana</span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                        Listo p/ Cierre
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 3. SECCIÓN MI AUTOMOTORS                                             */}
      {/* ==================================================================== */}
      <section id="mi-automotors" className="py-16 sm:py-24 border-t border-slate-800/80 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
                <CarFront className="h-3.5 w-3.5" />
                <span>PARA PROPIETARIOS PARTICULARES</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Mi Automotors: Tu Garaje Digital y Pasaporte de Mantenimiento
              </h2>
              <p className="text-sm sm:text-base text-slate-400">
                Mantené el control total del historial de tu auto. Sin carpetas con papeles extraviados,
                con trazabilidad digital, correcciones auditables y alertas basadas en especificaciones reales.
              </p>
            </div>
            <div>
              <a
                href="/demo/propietario"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 flex items-center gap-1.5 transition-colors"
              >
                <span>Conocer experiencia de propietario</span>
                <ArrowRight className="h-3.5 w-3.5 text-sky-400" />
              </a>
            </div>
          </div>

          {/* Grid de 6 funcionalidades verificadas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/90 hover:border-sky-500/40 transition-colors space-y-3">
              <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <CarFront className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Gestión de Vehículos Propios</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Registrá tus vehículos particulares con validación de patente oficial (Mercosur o anterior)
                y código VIN opcional con garantía de unicidad.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/90 hover:border-sky-500/40 transition-colors space-y-3">
              <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Historial Digital con Trazabilidad</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Visualizá la línea de tiempo completa de cada servicio realizado, ordenada temporalmente y
                con registro transparente de correcciones auditables.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/90 hover:border-sky-500/40 transition-colors space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Procedencia de Registros</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Distinción clara y transparente entre servicios certificados por taller profesional
                (<span className="text-emerald-400 font-mono text-[11px]">WORKSHOP_CERTIFIED</span>) y los
                declarados por vos (<span className="text-slate-300 font-mono text-[11px]">OWNER_DECLARED</span>).
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/90 hover:border-sky-500/40 transition-colors space-y-3">
              <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <Activity className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Carga Autónoma de Servicios</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Registrá tus propios cambios de aceite o intervenciones periódicas, con validación de
                odómetro no decreciente y fecha real no futura.
              </p>
            </div>

            {/* Card 5 */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/90 hover:border-sky-500/40 transition-colors space-y-3">
              <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Correcciones Auditables</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Si detectás un error en un registro, el sistema permite enmendarlo guardando el motivo y
                autor, sin borrar destructivamente el registro previo.
              </p>
            </div>

            {/* Card 6 */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/90 hover:border-sky-500/40 transition-colors space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Orientación Preventiva Asistida</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Proyecciones calculadas por kilometraje y tiempo según manuales de fábrica verificados. Si
                los datos no son concluyentes, el sistema advierte honestamente información insuficiente.
              </p>
            </div>
          </div>

          {/* Mandatory Disclaimer Box */}
          <div className="mt-8 p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
            <Info className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p>
              <strong className="text-emerald-400">Descargo técnico obligatorio:</strong> Orientación técnica
              preventiva. La decisión de recambio o reparación siempre debe validarse mediante inspección física en
              taller mecánico calificado. Automotors Garage no reemplaza el criterio del profesional.
            </p>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 4. SECCIÓN AUTOMOTORS PRO                                            */}
      {/* ==================================================================== */}
      <section id="automotors-pro" className="py-16 sm:py-24 border-t border-slate-800/80 bg-slate-950/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <Wrench className="h-3.5 w-3.5" />
                <span>PARA TALLERES Y BOXES MECÁNICOS</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Automotors Pro: Eficiencia Operativa y Trazabilidad en Taller
              </h2>
              <p className="text-sm sm:text-base text-slate-400">
                Diseñado para la agilidad del taller mecánico moderno, lubricentros y boxes rápidos. Menos
                tiempo administrativo, mayor control técnico y certificación genuina para tus clientes.
              </p>
            </div>
            <div>
              <a
                href="/demo/taller"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 flex items-center gap-1.5 transition-colors"
              >
                <span>Conocer experiencia de taller</span>
                <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
              </a>
            </div>
          </div>

          {/* Grid de 6 funcionalidades verificadas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/90 hover:border-emerald-500/40 transition-colors space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Registro Ágil de Servicios</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Recepción y registro ágil de servicios rutinarios (aceite, filtros, pastillas) con confirmación humana
                técnica obligatoria en contrato para garantizar rigor operativo.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/90 hover:border-emerald-500/40 transition-colors space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Órdenes de Trabajo Completas</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Ciclo de vida claro: borrador, diagnóstico, presupuesto, espera de aprobación, en progreso y
                listo para entrega, con control estricto de estados.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/90 hover:border-emerald-500/40 transition-colors space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Database className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Cierre Atómico Transaccional</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Al cerrar una orden, el odómetro del vehículo y el historial certificado se asientan en una
                única transacción de base de datos sin riesgo de inconsistencias.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/90 hover:border-emerald-500/40 transition-colors space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <CarFront className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Directorio de Clientes y Flota</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Ficha completa de clientes con DNI/CUIT, teléfonos, vehículos asociados e historial histórico
                de visitas para brindar una atención personalizada.
              </p>
            </div>

            {/* Card 5 */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/90 hover:border-emerald-500/40 transition-colors space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Cpu className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Diagnóstico OBD-II (SAE J2012)</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Decodificación de códigos DTC universales (P0xxx, C0xxx, B0xxx, U0xxx), lectura de parámetros
                freeze frame y checklist de verificación mecánica asistida.
              </p>
            </div>

            {/* Card 6 */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/90 hover:border-emerald-500/40 transition-colors space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Roles y Permisos de Taller</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Perfiles diferenciados para Administradores de Taller, Técnicos Mecánicos y Observadores, con
                aislamiento total de datos frente a otros talleres.
              </p>
            </div>
          </div>

          {/* Honest Technical Scope Box */}
          <div className="mt-8 p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p>
              <strong className="text-slate-200">Alcance honesto de ingeniería:</strong> Automotors Pro se
              concentra estrictamente en la excelencia técnica, trazabilidad y control de órdenes en taller. No
              incluye facturación electrónica AFIP, pasarela de cobros con tarjeta ni turnos automáticos en esta versión.
            </p>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 5. CÓMO FUNCIONA                                                     */}
      {/* ==================================================================== */}
      <section id="como-funciona" className="py-16 sm:py-24 border-t border-slate-800/80 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-16">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              FLUJO CLARO Y TRANSPARENTE
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              ¿Cómo Funciona Automotors Garage?
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
              Dos experiencias especializadas, diseñadas con propósitos distintos y una misma base de rigor técnico.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            {/* Step for Owner */}
            <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
                <div className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
                  <CarFront className="h-4 w-4" />
                </div>
                <h3 className="text-lg font-bold text-white">Flujo para el Propietario (Mi Automotors)</h3>
              </div>

              <div className="space-y-5">
                <div className="flex gap-4">
                  <span className="h-7 w-7 rounded-full bg-slate-800 text-sky-400 font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                    1
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200">Creá tu cuenta de propietario</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Accedé con tu email y contraseña. No se te exige vincular ningún taller para gestionar tu vehículo.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="h-7 w-7 rounded-full bg-slate-800 text-sky-400 font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                    2
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200">Cargá tus autos con patente y odómetro</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Ingresá la patente y los kilómetros actuales. El sistema valida el formato de dominio automáticamente.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="h-7 w-7 rounded-full bg-slate-800 text-sky-400 font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                    3
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200">Llevá el historial y recibí certificaciones</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Registrá tus intervenciones o recibí las órdenes cerradas por talleres cuando atiendan tu unidad.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step for Workshop */}
            <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Wrench className="h-4 w-4" />
                </div>
                <h3 className="text-lg font-bold text-white">Flujo para el Taller (Automotors Pro)</h3>
              </div>

              <div className="space-y-5">
                <div className="flex gap-4">
                  <span className="h-7 w-7 rounded-full bg-slate-800 text-emerald-400 font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                    1
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200">Ingresá al espacio de tu taller</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Tu equipo accede con roles definidos (Administrador o Mecánico) en un entorno multi-tenant aislado.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="h-7 w-7 rounded-full bg-slate-800 text-emerald-400 font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                    2
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200">Recibí vehículos por registro ágil o diagnóstico</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Cargá servicios rutinarios de forma ágil o abrí órdenes de trabajo con reporte técnico de fallas OBD.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="h-7 w-7 rounded-full bg-slate-800 text-emerald-400 font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                    3
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200">Cierre transaccional con trazabilidad real</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Cerrá la orden sellando el odómetro del cliente en base de datos con respaldo formal y auditable.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 6. VISTAS PREVIAS REALES (UI SHOWCASE)                              */}
      {/* ==================================================================== */}
      <section id="vistas-previas" className="py-16 sm:py-24 border-t border-slate-800/80 bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-10">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
              VISTAS ILUSTRATIVAS DEL SISTEMA
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Vistas Ilustrativas de la Interfaz
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
              Muestras ilustrativas construidas con los mismos componentes React 19 y estilos Tailwind del sistema, utilizando datos sintéticos sin información sensible.
            </p>

            {/* Tab switchers */}
            <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800 mt-4">
              <button
                type="button"
                onClick={() => setActivePreviewTab('owner')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activePreviewTab === 'owner'
                    ? 'bg-slate-800 text-sky-400 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mi Automotors (Garaje)
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('workshop')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activePreviewTab === 'workshop'
                    ? 'bg-slate-800 text-emerald-400 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Automotors Pro (Órdenes)
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('obd')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activePreviewTab === 'obd'
                    ? 'bg-slate-800 text-amber-400 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Diagnóstico OBD-II
              </button>
            </div>
          </div>

          {/* Interactive Mockup Container */}
          <div className="max-w-4xl mx-auto rounded-2xl bg-slate-900 border border-slate-800 p-4 sm:p-6 shadow-2xl">
            {activePreviewTab === 'owner' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300">Vehículo Activo</span>
                    <span className="text-[11px] font-mono bg-sky-500/10 border border-sky-500/30 text-sky-400 px-2 py-0.5 rounded font-bold">
                      AF123CD
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">VIN: 9BRBL41B5M0123456</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Modelo</span>
                    <p className="text-sm font-bold text-white mt-0.5">Toyota Corolla Hybrid</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Kilometraje Actual</span>
                    <p className="text-sm font-mono font-bold text-emerald-400 mt-0.5">38.500 km</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Próximo Service</span>
                    <p className="text-sm font-mono font-bold text-sky-400 mt-0.5">40.000 km</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <span className="text-xs font-semibold text-slate-300">Línea de Tiempo de Mantenimiento</span>
                  <div className="space-y-2">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-200">Service 30.000 km</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                            WORKSHOP_CERTIFIED
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">Aceite 0W-20 sintético, filtro de aire y polen</p>
                      </div>
                      <span className="text-xs font-mono text-slate-400">14/08/2026</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-200">Reemplazo de Escobillas Limpiaparabrisas</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-semibold">
                            OWNER_DECLARED
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">Escobillas Bosch Aerotwin cargadas por titular</p>
                      </div>
                      <span className="text-xs font-mono text-slate-400">02/10/2026</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === 'workshop' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300">Taller Central — Boxes Activos</span>
                  </div>
                  <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded font-semibold">
                    Quick Service Disponible
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-200">OT-2026-104</span>
                        <span className="text-[10px] font-mono font-bold text-sky-400">AD456EF</span>
                        <span className="text-xs text-slate-300">Ford Ranger 4x4</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">Cambio de pastillas delanteras y líquido DOT4</p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400">
                      EN PROGRESO
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-200">OT-2026-103</span>
                        <span className="text-[10px] font-mono font-bold text-sky-400">AE789GH</span>
                        <span className="text-xs text-slate-300">Chevrolet Cruze 1.4T</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">Quick Service: Aceite 5W-30 dexos1 + Filtro Mann</p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      LISTO P/ ENTREGA
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === 'obd' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300">Reporte de Falla OBD-II (Protocolo SAE J2012)</span>
                  </div>
                  <span className="text-xs font-mono text-rose-400 bg-rose-950/60 border border-rose-800/40 px-2 py-0.5 rounded font-bold">
                    DTC: P0300
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Falla de Encendido Múltiple / Aleatoria Detectada</span>
                    <span className="text-[10px] font-semibold text-rose-400 uppercase">Severidad Alta</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Se detectaron saltos en la combustión que afectan catalizador y balance de emisiones.
                  </p>
                  <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-300 font-mono space-y-1">
                    <div>RPM al momento del fallo: 2.340 RPM</div>
                    <div>Temperatura de refrigerante: 89 °C</div>
                    <div>Presión absoluta colector (MAP): 42 kPa</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-1">
                  <span className="font-semibold text-slate-200">Checklist para el Técnico:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                    <li>Verificar resistencia de bobinas individuales y bujías.</li>
                    <li>Medir presión de combustible en rampa de inyección.</li>
                    <li>Inspeccionar tomas de vacío en múltiple de admisión.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 7. SEGURIDAD Y PRIVACIDAD                                             */}
      {/* ==================================================================== */}
      <section id="seguridad" className="py-16 sm:py-24 border-t border-slate-800/80 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-12">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              ARQUITECTURA DE DATOS SÓLIDA
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Seguridad, Aislamiento y Privacidad de Datos
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
              Controles técnicos y autorización por recurso implementados y auditados en el código fuente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Aislamiento Multi-Tenant</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cada taller opera en un espacio cerrado. Es imposible que un taller consulte o modifique órdenes, clientes o facturación de otro.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Sesiones Seguras HttpOnly</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tokens de sesión protegidos contra ataques de robo de credenciales en navegador. Contraseñas hasheadas con Argon2id.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Autorización por Titular</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Los vehículos particulares solo son accesibles por su propietario verificado. Conocer una patente no autoriza a ver el historial ajeno.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Database className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Integridad Relacional</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                26 tablas con restricciones de claves foráneas, auditoría en append-only y soporte arquitectónico dual (PGlite / PostgreSQL).
              </p>
            </div>
          </div>

          <div className="mt-8 text-center text-xs text-slate-400 max-w-xl mx-auto">
            <p>
              Compromiso de honestidad: No hacemos promesas infundadas de &quot;seguridad absoluta&quot;.
              Aplicamos rigurosamente validación de esquemas Zod, principios de menor privilegio y pruebas
              automatizadas continuas.
            </p>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 8. DEMOS INTERACTIVAS                                                */}
      {/* ==================================================================== */}
      <section id="demos" className="py-16 sm:py-24 border-t border-slate-800/80 bg-slate-950/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            EXPERIMENTÁ LA PLATAFORMA
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Demos Interactivas de Autoservicio
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            Conocé el flujo real de trabajo sin fricción. Diseñadas para operar en memoria efímera sin afectar datos de producción.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto pt-8 text-left">
            {/* Demo Card Owner */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-9 w-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                    <CarFront className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold text-sky-400 bg-sky-950/60 border border-sky-800/40 px-2.5 py-0.5 rounded-full">
                    Acceso Inmediato
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">Demo Mi Automotors</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Experiencia completa de propietario: 2 vehículos precargados (Toyota Corolla y Ford Ranger),
                  carga de mantenimientos, historial cronológico y alertas.
                </p>
              </div>
              <a
                href="/demo/propietario"
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Explorar Demo de Propietario</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>

            {/* Demo Card Workshop */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-0.5 rounded-full">
                    Acceso Inmediato
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">Demo Automotors Pro</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Experiencia de taller: Taller modelo con 4 órdenes activas, Quick Service express y módulo de diagnóstico con falla OBD-II P0300.
                </p>
              </div>
              <a
                href="/demo/taller"
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Explorar Demo de Taller</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 9. PREGUNTAS FRECUENTES (FAQ)                                        */}
      {/* ==================================================================== */}
      <section id="faq" className="py-16 sm:py-24 border-t border-slate-800/80 bg-slate-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-12">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              RESOLUCIÓN DE DUDAS
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Preguntas Frecuentes
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              Respuestas directas y transparentes sobre el alcance y capacidades del software.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: '¿Qué es Automotors Garage y a quién está dirigido?',
                a: 'Es una plataforma de software automotriz que reúne dos soluciones: Mi Automotors (para propietarios que desean llevar el registro fidedigno de sus vehículos) y Automotors Pro (para talleres mecánicos independientes, lubricentros y boxes de servicio rápido que gestionan órdenes de trabajo con rigor técnico).',
              },
              {
                q: '¿Puedo usar Mi Automotors si mi taller de confianza aún no usa Automotors Pro?',
                a: 'Totalmente. Podés registrar tus vehículos y cargar de forma autónoma tus intervenciones de mantenimiento (aceite, pastillas, cubiertas, etc.). Esos registros se catalogan como declarados por el propietario y forman tu pasaporte digital.',
              },
              {
                q: '¿Cuál es la diferencia entre un servicio certificado y uno declarado?',
                a: "Un servicio certificado (WORKSHOP_CERTIFIED) es emitido por un taller registrado en Automotors Pro al completar formalmente una orden de trabajo, validando fecha, taller emisor y kilometraje real. Un servicio declarado (OWNER_DECLARED) es asentado por el titular por cuenta propia. Ambos conviven en el historial con total transparencia.",
              },
              {
                q: '¿Cómo funcionan las proyecciones preventivas y qué limitaciones tienen?',
                a: 'Se basan en un motor determinístico fundado en especificaciones oficiales de fábrica por tiempo y kilometraje. Si el sistema no cuenta con la ficha técnica homologada para tu modelo (como ocurre con vehículos en proceso de verificación técnica), devolverá información insuficiente en lugar de inventar estimaciones.',
              },
              {
                q: '¿Qué se necesita para utilizar el módulo de diagnóstico OBD-II?',
                a: 'Actualmente, el módulo procesa códigos de falla estándar SAE J2012 y parámetros freeze frame ingresados a través del sistema o provistos por escáneres automotrices estándar. No requiere suscripción a marcas cerradas para códigos genéricos universales (P0, C0, B0, U0).',
              },
              {
                q: '¿Tiene costo o planes comerciales activos en esta etapa?',
                a: 'Actualmente Automotors Garage se encuentra en fase de validación de arquitectura y pruebas de ingeniería pre-lanzamiento. No hay pasarelas de cobro ni cobros activos en esta versión.',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 focus:outline-none focus:bg-slate-900"
                  aria-expanded={openFaqIndex === idx}
                >
                  <span className="text-sm sm:text-base font-semibold text-white">{item.q}</span>
                  {openFaqIndex === idx ? (
                    <ChevronUp className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  )}
                </button>
                {openFaqIndex === idx && (
                  <div className="px-4 pb-5 sm:px-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 10. FOOTER                                                           */}
      {/* ==================================================================== */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-950 py-12 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <span className="text-sm font-extrabold tracking-tight text-white">
                  AUTOMOTORS<span className="text-emerald-400">.</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Plataforma de ingeniería para la gestión vehicular y operativa de talleres mecánicos.
              </p>
              <div className="pt-1">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-slate-900 border border-slate-800 text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Milestone 15.1 Auditado
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">Soluciones</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#mi-automotors" className="hover:text-emerald-400 transition-colors">
                    Mi Automotors (Propietarios)
                  </a>
                </li>
                <li>
                  <a href="#automotors-pro" className="hover:text-emerald-400 transition-colors">
                    Automotors Pro (Talleres)
                  </a>
                </li>
                <li>
                  <a href="#vistas-previas" className="hover:text-emerald-400 transition-colors">
                    Registro Ágil de Servicios
                  </a>
                </li>
                <li>
                  <a href="#vistas-previas" className="hover:text-emerald-400 transition-colors">
                    Diagnóstico OBD-II (SAE)
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">Arquitectura</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#seguridad" className="hover:text-emerald-400 transition-colors">
                    Aislamiento Multi-Tenant
                  </a>
                </li>
                <li>
                  <a href="#seguridad" className="hover:text-emerald-400 transition-colors">
                    Base de Datos Relacional
                  </a>
                </li>
                <li>
                  <a href="#seguridad" className="hover:text-emerald-400 transition-colors">
                    Sesiones Seguras HttpOnly
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-emerald-400 transition-colors">
                    Política de Honestidad Técnica
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">Acceso</h4>
              <p className="text-xs text-slate-400 mb-3">
                Ingresá con tu cuenta de taller o registrate como propietario particular.
              </p>
              <button
                type="button"
                onClick={onGoToAuth}
                className="w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
              >
                Acceder a la Plataforma
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
            <p>© 2026 Automotors Garage. Rigor de ingeniería y honestidad técnica.</p>
            <div className="flex items-center gap-4">
              <span>Next.js 15 · React 19 · TypeScript · Base Relacional</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
