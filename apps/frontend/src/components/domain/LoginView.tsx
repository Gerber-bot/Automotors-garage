'use client';

import * as React from 'react';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card, Button, Input, Badge } from '../ui/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';

export function LoginView() {
  const { login, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = React.useState('mario@alphamotors.com');
  const [password, setPassword] = React.useState('Password123!');
  const [clientValidation, setClientValidation] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
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

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
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

      <div className="w-full max-w-md space-y-6">
        {/* BRANDING HEADER */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white shadow-xl shadow-emerald-950/60 ring-1 ring-emerald-400/30 mb-2">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            AUTOMOTORS
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Sistema Operativo Multi-Taller de Mantenimiento & Flota
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <Badge variant="success" size="sm" dot>
              Conexión Segura
            </Badge>
            <Badge variant="secondary" size="sm">
              v1.0 Producción
            </Badge>
          </div>
        </div>

        {/* LOGIN CARD */}
        <Card className="bg-slate-900/90 border-slate-800 backdrop-blur-xl shadow-2xl p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Iniciar Sesión</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Accedé con tus credenciales de taller autorizadas.
              </p>
            </div>

            {/* ERROR ALERT */}
            {displayError && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <span className="font-medium leading-relaxed">{displayError}</span>
              </div>
            )}

            {/* EMAIL INPUT */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
              >
                Correo Electrónico
              </label>
              <div className="relative">
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="ej. mecanico@alphamotors.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="h-4 w-4 text-slate-400" />}
                  className="bg-slate-950/70 border-slate-800 focus:border-emerald-500 text-sm"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* PASSWORD INPUT */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
                >
                  Contraseña
                </label>
              </div>
              <div className="relative">
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
            </div>

            {/* SUBMIT BUTTON */}
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

          {/* DEMO ACCOUNTS HELPER (Gated to non-production environments or explicit demo flag) */}
          {(process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ENABLE_DEMO_CREDENTIALS === 'true') && (
            <div className="mt-6 pt-5 border-t border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Credenciales de Demostración:
              </span>
              <div className="space-y-1.5">
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
                        Admin
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
          Protegido con aislamiento criptográfico Argon2id, tokens JWT efímeros y control de acceso RBAC.
        </p>
      </div>
    </div>
  );
}
