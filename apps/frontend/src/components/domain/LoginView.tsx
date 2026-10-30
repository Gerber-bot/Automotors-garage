'use client';

import * as React from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  User,
  Phone,
  CarFront,
  Wrench,
} from 'lucide-react';
import { Card, Button, Input, Badge } from '../ui/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';

export function LoginView() {
  const { login, registerOwner, isLoading, error, clearError } = useAuth();
  const [authMode, setAuthMode] = React.useState<'LOGIN' | 'REGISTER_OWNER'>('LOGIN');

  // Login state
  const [email, setEmail] = React.useState('mario@alphamotors.com');
  const [password, setPassword] = React.useState('Password123!');

  // Owner Registration state
  const [regFullName, setRegFullName] = React.useState('');
  const [regEmail, setRegEmail] = React.useState('');
  const [regPhone, setRegPhone] = React.useState('');
  const [regPassword, setRegPassword] = React.useState('');

  const [clientValidation, setClientValidation] = React.useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setClientValidation(null);

    if (!email.trim()) {
      setClientValidation('Ingresá tu correo electrónico.');
      return;
    }
    if (!password) {
      setClientValidation('Ingresá tu contraseña de acceso.');
      return;
    }

    await login(email.trim(), password);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setClientValidation(null);

    if (!regFullName.trim() || regFullName.trim().length < 2) {
      setClientValidation('Ingresá tu nombre y apellido completo.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setClientValidation('Ingresá un correo electrónico válido.');
      return;
    }
    if (!regPassword || regPassword.length < 8) {
      setClientValidation('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    await registerOwner(regFullName.trim(), regEmail.trim(), regPassword, regPhone.trim() || undefined);
  };

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
    setAuthMode('LOGIN');
    setEmail(demoEmail);
    setPassword(demoPass);
    clearError();
    setClientValidation(null);
  };

  const displayError = clientValidation || error;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-8 sm:px-6 lg:px-8 selection:bg-emerald-500 selection:text-slate-950">
      {/* BACKGROUND GLOW */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-1/4 left-1/3 -translate-x-1/2 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl opacity-30" />
      </div>

      <div className="w-full max-w-md space-y-5">
        {/* BRANDING HEADER */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white shadow-xl shadow-emerald-950/60 ring-1 ring-emerald-400/30 mb-1">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            AUTOMOTORS
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            {authMode === 'REGISTER_OWNER'
              ? 'Mi Automotors — Portal Personal del Propietario'
              : 'Automotors Pro & Mi Automotors — Plataforma Integral'}
          </p>
          <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
            <Badge variant="success" size="sm" dot>
              Conexión Segura
            </Badge>
            <Badge variant="info" size="sm">
              Mi Automotors Activo
            </Badge>
          </div>
        </div>

        {/* MODE SWITCHER TABS */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setAuthMode('LOGIN');
              clearError();
              setClientValidation(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'LOGIN'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wrench className="h-3.5 w-3.5" />
            <span>Iniciar Sesión</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('REGISTER_OWNER');
              clearError();
              setClientValidation(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'REGISTER_OWNER'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CarFront className="h-3.5 w-3.5" />
            <span>Crear Cuenta Propietario</span>
          </button>
        </div>

        {/* AUTH CARD */}
        <Card className="bg-slate-900/90 border-slate-800 backdrop-blur-xl shadow-2xl p-6 sm:p-8">
          {authMode === 'LOGIN' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Iniciar Sesión</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ingresá a tu cuenta de propietario (Mi Automotors) o taller (Automotors Pro).
                </p>
              </div>

              {displayError && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                  <span className="font-medium leading-relaxed">{displayError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
                >
                  Correo Electrónico
                </label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="ej. valeria@miautomotors.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="h-4 w-4 text-slate-400" />}
                  className="bg-slate-950/70 border-slate-800 focus:border-emerald-500 text-sm"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
                >
                  Contraseña
                </label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="h-4 w-4 text-slate-400" />}
                  className="bg-slate-950/70 border-slate-800 focus:border-emerald-500 text-sm"
                  disabled={isLoading}
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  isLoading={isLoading}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  className="font-semibold shadow-lg shadow-emerald-950/50"
                >
                  {isLoading ? 'Verificando credenciales...' : 'Ingresar al Sistema'}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5" noValidate>
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Crear Cuenta en Mi Automotors
                  </h2>
                  <Badge variant="info" size="sm">
                    Propietario
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Registrá tu vehículo, conservá su historial y recibí estimaciones preventivas sin pertenecer a un taller.
                </p>
              </div>

              {displayError && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                  <span className="font-medium leading-relaxed">{displayError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label
                  htmlFor="reg-fullname"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
                >
                  Nombre y Apellido
                </label>
                <Input
                  id="reg-fullname"
                  type="text"
                  required
                  placeholder="ej. Martín Pereyra"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  leftIcon={<User className="h-4 w-4 text-slate-400" />}
                  className="bg-slate-950/70 border-slate-800 focus:border-sky-500 text-sm"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="reg-email"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
                >
                  Correo Electrónico
                </label>
                <Input
                  id="reg-email"
                  type="email"
                  required
                  placeholder="ej. martin@propietario.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  leftIcon={<Mail className="h-4 w-4 text-slate-400" />}
                  className="bg-slate-950/70 border-slate-800 focus:border-sky-500 text-sm"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="reg-phone"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
                >
                  Teléfono (Opcional)
                </label>
                <Input
                  id="reg-phone"
                  type="tel"
                  placeholder="ej. +54 9 11 5555-8888"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  leftIcon={<Phone className="h-4 w-4 text-slate-400" />}
                  className="bg-slate-950/70 border-slate-800 focus:border-sky-500 text-sm"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="reg-password"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
                >
                  Contraseña (mínimo 8 caracteres)
                </label>
                <Input
                  id="reg-password"
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  leftIcon={<Lock className="h-4 w-4 text-slate-400" />}
                  className="bg-slate-950/70 border-slate-800 focus:border-sky-500 text-sm"
                  disabled={isLoading}
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  isLoading={isLoading}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  className="font-semibold shadow-lg shadow-emerald-950/50"
                >
                  {isLoading ? 'Creando cuenta...' : 'Registrarme en Mi Automotors'}
                </Button>
              </div>
            </form>
          )}

          {/* DEMO ACCOUNTS HELPER (Gated to non-production environments or explicit demo flag) */}
          {(process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ENABLE_DEMO_CREDENTIALS === 'true') && (
            <div className="mt-6 pt-5 border-t border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Credenciales de Demostración:
              </span>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => handleFillDemo('valeria@miautomotors.com', 'Password123!')}
                  className="w-full text-left p-2.5 rounded-lg bg-sky-950/30 hover:bg-sky-900/40 border border-sky-500/30 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-sky-300 group-hover:text-sky-200">
                        Valeria Méndez (Mi Automotors — Logan 2020)
                      </span>
                      <Badge variant="info" size="sm">
                        Propietario
                      </Badge>
                    </div>
                    <span className="text-[11px] text-slate-400 block font-mono">
                      valeria@miautomotors.com
                    </span>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-sky-400 group-hover:text-sky-300 transition-colors" />
                </button>

                <button
                  type="button"
                  onClick={() => handleFillDemo('mario@alphamotors.com', 'Password123!')}
                  className="w-full text-left p-2.5 rounded-lg bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-emerald-400 group-hover:text-emerald-300">
                        Mario Rossi (Jefe Multi-Taller)
                      </span>
                      <Badge variant="success" size="sm">
                        Taller + Propietario
                      </Badge>
                    </div>
                    <span className="text-[11px] text-slate-400 block font-mono">
                      mario@alphamotors.com
                    </span>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                </button>

                <button
                  type="button"
                  onClick={() => handleFillDemo('lucas@alphamotors.com', 'Password123!')}
                  className="w-full text-left p-2.5 rounded-lg bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300">
                        Lucas Gómez (Mecánico Alpha)
                      </span>
                      <Badge variant="secondary" size="sm">
                        Mecánico
                      </Badge>
                    </div>
                    <span className="text-[11px] text-slate-400 block font-mono">
                      lucas@alphamotors.com
                    </span>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* SECURITY FOOTER NOTE */}
        <p className="text-center text-[11px] text-slate-500">
          Protegido con aislamiento criptográfico Argon2id, tokens JWT efímeros y control de acceso por recurso.
        </p>
      </div>
    </div>
  );
}
