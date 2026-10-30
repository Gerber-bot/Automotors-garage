'use client';

import * as React from 'react';
import { ApiClient } from '../api/client.ts';

export interface UserWorkshop {
  id: string;
  name: string;
  role: string;
  permissions?: string[];
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: string;
  accountType: 'WORKSHOP_USER' | 'VEHICLE_OWNER';
  profiles: string[];
}

export interface AuthContextValue {
  user: AuthUser | null;
  activeTenantId: string | null;
  activeWorkshop: UserWorkshop | null;
  workshops: UserWorkshop[];
  activePortal: 'WORKSHOP' | 'OWNER';
  setActivePortal: (portal: 'WORKSHOP' | 'OWNER') => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionId: string | null;
  login: (email: string, password: string, workshopId?: string) => Promise<boolean>;
  registerOwner: (fullName: string, email: string, password: string, phone?: string) => Promise<boolean>;
  selectWorkshop: (workshopId: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [activeTenantId, setActiveTenantId] = React.useState<string | null>(null);
  const [workshops, setWorkshops] = React.useState<UserWorkshop[]>([]);
  const [activePortal, setActivePortal] = React.useState<'WORKSHOP' | 'OWNER'>('WORKSHOP');
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const apiClient = React.useMemo(() => ApiClient.getInstance(), []);

  const handleUnauthorized = React.useCallback(() => {
    setUser(null);
    setActiveTenantId(null);
    setWorkshops([]);
    setSessionId(null);
    apiClient.clearAuthSession();
    setError('Tu sesión ha expirado o las credenciales no son válidas.');
  }, [apiClient]);

  const refreshSession = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (res.status === 401) {
        setUser(null);
        setActiveTenantId(null);
        setWorkshops([]);
        apiClient.clearAuthSession();
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to refresh session');
      }

      const data = await res.json();
      const mappedWorkshops: UserWorkshop[] = (data.workshops || []).map((w: any) => ({
        id: w.workshopId || w.id,
        name: w.workshopName || w.name,
        role: w.role || 'MECHANIC',
        permissions: w.permissions || [],
      }));

      const hasWorkshops = mappedWorkshops.length > 0;
      const activeTenant = hasWorkshops
        ? (data.activeTenantId || mappedWorkshops[0]?.id || null)
        : null;
      const primaryRole = hasWorkshops
        ? (mappedWorkshops.find((w) => w.id === activeTenant)?.role || data.user?.role || 'MECHANIC')
        : 'VEHICLE_OWNER';
      const accountType = hasWorkshops ? 'WORKSHOP_USER' : 'VEHICLE_OWNER';
      const profiles = data.user?.profiles || (hasWorkshops ? ['WORKSHOP_USER', 'VEHICLE_OWNER'] : ['VEHICLE_OWNER']);

      setUser({
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.fullName || data.user.email.split('@')[0],
        phone: data.user.phone ?? null,
        role: primaryRole,
        accountType,
        profiles,
      });
      setActiveTenantId(activeTenant);
      setWorkshops(mappedWorkshops);
      setActivePortal(hasWorkshops ? 'WORKSHOP' : 'OWNER');
      setSessionId(data.sessionId || null);
      apiClient.setAuthSession(data.token || '', activeTenant);
    } catch {
      setUser(null);
      setActiveTenantId(null);
      setWorkshops([]);
      apiClient.clearAuthSession();
    } finally {
      setIsLoading(false);
    }
  }, [apiClient]);

  React.useEffect(() => {
    (apiClient as any).onUnauthorized = handleUnauthorized;
    void refreshSession();
  }, [apiClient, handleUnauthorized, refreshSession]);

  const login = async (email: string, password: string, workshopId?: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email, password, workshopId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Credenciales inválidas.');
      }

      const mappedWorkshops: UserWorkshop[] = (data.user?.workshops || []).map((w: any) => ({
        id: w.id || w.workshopId,
        name: w.name || w.workshopName,
        role: w.role || 'MECHANIC',
      }));

      const hasWorkshops = mappedWorkshops.length > 0;
      const activeTenant = hasWorkshops
        ? (data.session?.activeTenantId || mappedWorkshops[0]?.id || null)
        : null;
      const role = hasWorkshops
        ? (data.user?.role || mappedWorkshops.find((w) => w.id === activeTenant)?.role || 'MECHANIC')
        : 'VEHICLE_OWNER';
      const accountType = hasWorkshops ? 'WORKSHOP_USER' : 'VEHICLE_OWNER';
      const profiles = data.user?.profiles || (hasWorkshops ? ['WORKSHOP_USER', 'VEHICLE_OWNER'] : ['VEHICLE_OWNER']);

      setUser({
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.fullName,
        phone: data.user.phone ?? null,
        role,
        accountType,
        profiles,
      });
      setActiveTenantId(activeTenant);
      setWorkshops(mappedWorkshops);
      setActivePortal(hasWorkshops ? 'WORKSHOP' : 'OWNER');
      setSessionId(data.session?.id || null);

      apiClient.setAuthSession(data.token || '', activeTenant);

      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado durante el inicio de sesión.';
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const registerOwner = async (
    fullName: string,
    email: string,
    password: string,
    phone?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ fullName, email, password, phone }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo completar el registro en Mi Automotors.');
      }

      setUser({
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.fullName,
        phone: data.user.phone ?? null,
        role: 'VEHICLE_OWNER',
        accountType: 'VEHICLE_OWNER',
        profiles: ['VEHICLE_OWNER'],
      });
      setActiveTenantId(null);
      setWorkshops([]);
      setActivePortal('OWNER');
      setSessionId(data.session?.id || null);

      apiClient.setAuthSession(data.token || '', null);

      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado durante el registro.';
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const selectWorkshop = async (targetWorkshopId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/select-workshop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ workshopId: targetWorkshopId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'No fue posible cambiar al taller seleccionado.');
      }

      setActiveTenantId(targetWorkshopId);
      setActivePortal('WORKSHOP');

      const updatedWorkshop = workshops.find((w) => w.id === targetWorkshopId);
      if (updatedWorkshop && user) {
        setUser({
          ...user,
          role: updatedWorkshop.role,
        });
      }

      if (data.token) {
        apiClient.setAuthSession(data.token, targetWorkshopId);
      }

      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cambiar de taller.';
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setActiveTenantId(null);
      setWorkshops([]);
      setActivePortal('WORKSHOP');
      setSessionId(null);
      setError(null);
      apiClient.clearAuthSession();
      setIsLoading(false);
    }
  };

  const activeWorkshop = React.useMemo(() => {
    return workshops.find((w) => w.id === activeTenantId) || null;
  }, [workshops, activeTenantId]);

  const value: AuthContextValue = {
    user,
    activeTenantId,
    activeWorkshop,
    workshops,
    activePortal,
    setActivePortal,
    isAuthenticated: Boolean(user),
    isLoading,
    error,
    sessionId,
    login,
    registerOwner,
    selectWorkshop,
    logout,
    refreshSession,
    clearError: () => setError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
