import {
  MOCK_VEHICLES,
  MOCK_WORK_ORDERS,
  MOCK_VOICE_PROPOSAL,
} from './mock-backend.ts';
import type {
  Vehicle,
  WorkOrder,
  AIProposal,
} from './contracts.ts';

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export interface ApiClientConfig {
  baseUrl?: string;
  getAuthToken?: () => string | null;
  getActiveTenantId?: () => string | null;
  onUnauthorized?: () => void;
}

export interface LoginResponse {
  token: string;
  session: {
    id: string;
    expiresAt: string;
    activeTenantId: string;
  };
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    workshops: Array<{ id: string; name: string; role: string }>;
  };
}

export interface CurrentUserResponse {
  user: {
    id: string;
    email: string;
    fullName?: string;
  };
  activeTenantId: string;
  workshops: Array<{
    workshopId: string;
    workshopName: string;
    role: string;
    permissions?: string[];
  }>;
}

export class ApiClient {
  private static instance: ApiClient;
  private readonly baseUrl: string;
  private token: string | null = null;
  private activeTenantId: string | null = null;
  private readonly getAuthToken?: () => string | null;
  private readonly getActiveTenantId?: () => string | null;
  private readonly onUnauthorized?: () => void;
  private useOfflineMockFallback: boolean = false;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl ?? (typeof window !== 'undefined' ? '/api/v1' : 'http://localhost:4000/api/v1');
    this.getAuthToken = config.getAuthToken;
    this.getActiveTenantId = config.getActiveTenantId;
    this.onUnauthorized = config.onUnauthorized;
  }

  public static getInstance(config?: ApiClientConfig): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient(config);
    }
    return ApiClient.instance;
  }

  public setOfflineMockMode(enabled: boolean): void {
    this.useOfflineMockFallback = enabled;
  }

  public setAuthSession(token: string, tenantId: string): void {
    this.token = token;
    this.activeTenantId = tenantId;
  }

  public clearAuthSession(): void {
    this.token = null;
    this.activeTenantId = null;
  }

  public getSession(): { token: string | null; activeTenantId: string | null } {
    return {
      token: this.token ?? (this.getAuthToken ? this.getAuthToken() : null),
      activeTenantId: this.activeTenantId ?? (this.getActiveTenantId ? this.getActiveTenantId() : null),
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (this.useOfflineMockFallback) {
      return this.handleOfflineMock<T>(endpoint, options);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const token = this.token ?? (this.getAuthToken ? this.getAuthToken() : null);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const tenantId = this.activeTenantId ?? (this.getActiveTenantId ? this.getActiveTenantId() : null);
    if (tenantId) {
      headers['x-tenant-id'] = tenantId;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        credentials: 'same-origin',
        ...options,
        headers: { ...headers, ...(options.headers as Record<string, string>) },
      });

      if (response.status === 401) {
        if (this.onUnauthorized) this.onUnauthorized();
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          401,
          errorData.error ?? 'Session has expired or credentials are invalid.',
          errorData
        );
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.error ?? errorData.detail ?? errorData.message ?? `HTTP error ${response.status}`;
        throw new ApiError(response.status, message, errorData);
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw err;
      }
      if ((err as Error).name === 'AbortError') {
        throw err;
      }
      if (this.useOfflineMockFallback) {
        return this.handleOfflineMock<T>(endpoint, options);
      }
      throw new ApiError(500, `API communication failure on ${endpoint}: ${(err as Error).message}`);
    }
  }

  private async handleOfflineMock<T>(endpoint: string, options: RequestInit): Promise<T> {
    await new Promise((resolve) => setTimeout(resolve, 40));

    if (endpoint.startsWith('/vehicles') && options.method === 'GET') {
      return MOCK_VEHICLES as unknown as T;
    }

    if (endpoint.startsWith('/work-orders') && options.method === 'GET') {
      return MOCK_WORK_ORDERS as unknown as T;
    }

    if (endpoint.includes('/voice-notes/process')) {
      return MOCK_VOICE_PROPOSAL as unknown as T;
    }

    return {} as T;
  }

  // Authentication
  public async login(
    email: string,
    password: string,
    workshopId?: string,
    signal?: AbortSignal
  ): Promise<LoginResponse> {
    const res = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, workshopId }),
      signal,
    });
    this.setAuthSession(res.token, res.session.activeTenantId);
    return res;
  }

  public async selectWorkshop(
    workshopId: string,
    signal?: AbortSignal
  ): Promise<{ token: string; activeTenantId: string }> {
    const res = await this.request<{ token: string; activeTenantId: string }>('/auth/select-workshop', {
      method: 'POST',
      body: JSON.stringify({ workshopId }),
      signal,
    });
    this.setAuthSession(res.token, res.activeTenantId);
    return res;
  }

  public async getCurrentUser(signal?: AbortSignal): Promise<CurrentUserResponse> {
    return this.request<CurrentUserResponse>('/auth/me', {
      method: 'GET',
      signal,
    });
  }

  public async revokeSession(sessionId: string, signal?: AbortSignal): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/auth/sessions/${sessionId}`, {
      method: 'DELETE',
      signal,
    });
  }

  public async logout(sessionId?: string): Promise<void> {
    if (sessionId) {
      try {
        await this.revokeSession(sessionId);
      } catch {
        // Continue clearing client-side state even if backend session revocation failed
      }
    }
    this.clearAuthSession();
  }

  public async getWorkshops(
    signal?: AbortSignal
  ): Promise<Array<{ workshopId: string; workshopName: string; role: string; permissions?: string[] }>> {
    return this.request<Array<{ workshopId: string; workshopName: string; role: string; permissions?: string[] }>>(
      '/workshops',
      { method: 'GET', signal }
    );
  }

  // Domain API Methods: Vehicles
  public async getVehicles(searchQuery?: string, signal?: AbortSignal): Promise<readonly Vehicle[]> {
    const query = searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : '';
    const vehicles = await this.request<Vehicle[]>(`/vehicles${query}`, { method: 'GET', signal });

    if (searchQuery) {
      const term = searchQuery.toLowerCase().replace(/[^a-z0-9]/g, '');
      return vehicles.filter(
        (v) =>
          (v.plate && v.plate.toLowerCase().replace(/[^a-z0-9]/g, '').includes(term)) ||
          (v.vin && v.vin.toLowerCase().replace(/[^a-z0-9]/g, '').includes(term)) ||
          v.make.toLowerCase().includes(term) ||
          v.model.toLowerCase().includes(term)
      );
    }

    return vehicles;
  }

  public async getVehicleById(id: string, signal?: AbortSignal): Promise<Vehicle | null> {
    try {
      return await this.request<Vehicle>(`/vehicles/${id}`, { method: 'GET', signal });
    } catch {
      return null;
    }
  }

  public async getVehiclePassport(vehicleId: string, isPublic = false, signal?: AbortSignal): Promise<any> {
    const query = isPublic ? '?public=true' : '';
    return this.request(`/vehicles/${vehicleId}/passport${query}`, { method: 'GET', signal });
  }

  public async createVehicle(vehicleData: Partial<Vehicle>, signal?: AbortSignal): Promise<Vehicle> {
    return this.request<Vehicle>('/vehicles', {
      method: 'POST',
      body: JSON.stringify(vehicleData),
      signal,
    });
  }

  public async getCustomers(
    signal?: AbortSignal
  ): Promise<Array<{ id: string; fullName: string; phone: string; email?: string }>> {
    return this.request<Array<{ id: string; fullName: string; phone: string; email?: string }>>('/customers', {
      method: 'GET',
      signal,
    });
  }

  public async getWorkOrders(statusFilter?: string, signal?: AbortSignal): Promise<readonly WorkOrder[]> {
    const query = statusFilter && statusFilter !== 'ALL' ? `?status=${encodeURIComponent(statusFilter)}` : '';
    return this.request<WorkOrder[]>(`/work-orders${query}`, { method: 'GET', signal });
  }

  public async createWorkOrder(
    orderData: {
      vehicleId: string;
      customerId: string;
      reportedMileage: number;
      reportedIssue: string;
      initialCondition?: string;
    },
    signal?: AbortSignal
  ): Promise<{ id: string }> {
    return this.request<{ id: string }>('/work-orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
      signal,
    });
  }

  public async closeWorkOrder(
    workOrderId: string,
    payload: { idempotencyKey: string; internalNotes?: string; partsCost?: number; laborCost?: number },
    signal?: AbortSignal
  ): Promise<any> {
    return this.request(`/work-orders/${workOrderId}/close`, {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
    });
  }

  public async processVoiceNote(audioBlob: Blob, signal?: AbortSignal): Promise<AIProposal> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1] ?? '';
          const res = await this.request<AIProposal>('/ai/voice-notes/process', {
            method: 'POST',
            body: JSON.stringify({ audioBase64: base64, mimeType: audioBlob.type || 'audio/wav' }),
            signal,
          });
          resolve(res);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
  }

  public async submitQuickService(
    entry: {
      vehicleId: string;
      odometerKm: number;
      interventions: string[];
      observations?: string;
      idempotencyKey?: string;
    },
    signal?: AbortSignal
  ): Promise<{ workOrderId: string; status: string; odometerKm: number }> {
    return this.request<{ workOrderId: string; status: string; odometerKm: number }>('/work-orders/quick-service', {
      method: 'POST',
      body: JSON.stringify({
        ...entry,
        idempotencyKey: entry.idempotencyKey ?? `qs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      }),
      signal,
    });
  }

  public async calculatePreventive(
    payload: {
      vehicleId: string;
      currentMileage: number;
      currentDate: string;
      history: any[];
      intervals: any[];
    },
    signal?: AbortSignal
  ): Promise<any> {
    return this.request('/maintenance/calculate-preventive', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
    });
  }

  public async interpretObd2(
    payload: { dtcCodes: string[]; vehicleSpecs: Record<string, any> },
    signal?: AbortSignal
  ): Promise<any> {
    return this.request('/ai/obd2/interpret', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
    });
  }

  public async seedDemoData(signal?: AbortSignal): Promise<any> {
    return this.request('/demo/seed', { method: 'POST', signal });
  }
}
