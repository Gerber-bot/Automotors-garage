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
        ...options,
        headers: { ...headers, ...(options.headers as Record<string, string>) },
      });

      if (response.status === 401) {
        if (this.onUnauthorized) this.onUnauthorized();
        throw new Error('Session has expired or credentials are invalid.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error ?? errorData.detail ?? errorData.message ?? `HTTP error ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      if ((err as Error).message?.includes('Session has expired')) {
        throw err;
      }
      // Explicit offline mock mode only when explicitly enabled (never automatic fallback)
      if (this.useOfflineMockFallback) {
        return this.handleOfflineMock<T>(endpoint, options);
      }
      throw new Error(`API communication failure on ${endpoint}: ${(err as Error).message}`);
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
  public async login(email: string, password: string, workshopId?: string): Promise<LoginResponse> {
    const res = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, workshopId }),
    });
    this.setAuthSession(res.token, res.session.activeTenantId);
    return res;
  }

  public async selectWorkshop(workshopId: string): Promise<{ token: string; activeTenantId: string }> {
    const res = await this.request<{ token: string; activeTenantId: string }>('/auth/select-workshop', {
      method: 'POST',
      body: JSON.stringify({ workshopId }),
    });
    this.setAuthSession(res.token, res.activeTenantId);
    return res;
  }

  public async getWorkshops(): Promise<Array<{ workshopId: string; workshopName: string; role: string }>> {
    return this.request<Array<{ workshopId: string; workshopName: string; role: string }>>('/workshops', {
      method: 'GET',
    });
  }

  // Domain API Methods
  public async getVehicles(searchQuery?: string): Promise<readonly Vehicle[]> {
    const query = searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : '';
    const vehicles = await this.request<Vehicle[]>(`/vehicles${query}`, { method: 'GET' });

    if (searchQuery) {
      const term = searchQuery.toLowerCase().replace(/[^a-z0-9]/g, '');
      return vehicles.filter(
        (v) =>
          (v.plate && v.plate.toLowerCase().includes(term)) ||
          (v.vin && v.vin.toLowerCase().includes(term)) ||
          v.make.toLowerCase().includes(term) ||
          v.model.toLowerCase().includes(term)
      );
    }

    return vehicles;
  }

  public async getVehicleById(id: string): Promise<Vehicle | null> {
    try {
      return await this.request<Vehicle>(`/vehicles/${id}`, { method: 'GET' });
    } catch {
      return null;
    }
  }

  public async getVehiclePassport(vehicleId: string, isPublic = false): Promise<any> {
    const query = isPublic ? '?public=true' : '';
    return this.request(`/vehicles/${vehicleId}/passport${query}`, { method: 'GET' });
  }

  public async createVehicle(vehicleData: Partial<Vehicle>): Promise<Vehicle> {
    return this.request<Vehicle>('/vehicles', {
      method: 'POST',
      body: JSON.stringify(vehicleData),
    });
  }

  public async getCustomers(): Promise<Array<{ id: string; fullName: string; phone: string; email?: string }>> {
    return this.request<Array<{ id: string; fullName: string; phone: string; email?: string }>>('/customers', {
      method: 'GET',
    });
  }

  public async getWorkOrders(statusFilter?: string): Promise<readonly WorkOrder[]> {
    const query = statusFilter && statusFilter !== 'ALL' ? `?status=${encodeURIComponent(statusFilter)}` : '';
    return this.request<WorkOrder[]>(`/work-orders${query}`, { method: 'GET' });
  }

  public async createWorkOrder(orderData: {
    vehicleId: string;
    customerId: string;
    reportedMileage: number;
    reportedIssue: string;
    initialCondition?: string;
  }): Promise<{ id: string }> {
    return this.request<{ id: string }>('/work-orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  public async closeWorkOrder(
    workOrderId: string,
    payload: { idempotencyKey: string; internalNotes?: string; partsCost?: number; laborCost?: number }
  ): Promise<any> {
    return this.request(`/work-orders/${workOrderId}/close`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async processVoiceNote(audioBlob: Blob): Promise<AIProposal> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1] ?? '';
          const res = await this.request<AIProposal>('/ai/voice-notes/process', {
            method: 'POST',
            body: JSON.stringify({ audioBase64: base64, mimeType: audioBlob.type || 'audio/wav' }),
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

  public async submitQuickService(entry: {
    vehicleId: string;
    odometerKm: number;
    interventions: string[];
    observations?: string;
    idempotencyKey?: string;
  }): Promise<{ workOrderId: string; status: string; odometerKm: number }> {
    return this.request<{ workOrderId: string; status: string; odometerKm: number }>('/work-orders/quick-service', {
      method: 'POST',
      body: JSON.stringify({
        ...entry,
        idempotencyKey: entry.idempotencyKey ?? `qs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      }),
    });
  }

  public async calculatePreventive(payload: {
    vehicleId: string;
    currentMileage: number;
    currentDate: string;
    history: any[];
    intervals: any[];
  }): Promise<any> {
    return this.request('/maintenance/calculate-preventive', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async interpretObd2(payload: { dtcCodes: string[]; vehicleSpecs: Record<string, any> }): Promise<any> {
    return this.request('/ai/obd2/interpret', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async seedDemoData(): Promise<any> {
    return this.request('/demo/seed', { method: 'POST' });
  }
}
