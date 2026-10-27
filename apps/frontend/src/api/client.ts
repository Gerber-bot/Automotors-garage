import {
  MOCK_VEHICLES,
  MOCK_WORK_ORDERS,
  MOCK_VOICE_PROPOSAL,
} from './mock-backend.ts';
import type {
  Vehicle,
  WorkOrder,
  AIProposal,
  CreateVehicleDto,
} from './contracts.ts';

export interface ApiClientConfig {
  baseUrl?: string;
  getAuthToken?: () => string | null;
  getActiveTenantId?: () => string | null;
  onUnauthorized?: () => void;
}

export class ApiClient {
  private static instance: ApiClient;
  private readonly baseUrl: string;
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

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (this.useOfflineMockFallback) {
      return this.handleOfflineMock<T>(endpoint, options);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const token = this.getAuthToken ? this.getAuthToken() : null;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const tenantId = this.getActiveTenantId ? this.getActiveTenantId() : null;
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
        throw new Error(errorData.detail ?? errorData.message ?? `HTTP error ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      if ((err as Error).message?.includes('Session has expired')) {
        throw err;
      }
      // In local development or isolated frontend mode, fallback to mock data
      return this.handleOfflineMock<T>(endpoint, options);
    }
  }

  private async handleOfflineMock<T>(endpoint: string, options: RequestInit): Promise<T> {
    // Artificial realistic UI network latency (40ms)
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
    const list = await this.getVehicles();
    return list.find((v) => v.id === id) ?? null;
  }

  public async getWorkOrders(statusFilter?: string): Promise<readonly WorkOrder[]> {
    const orders = await this.request<WorkOrder[]>('/work-orders', { method: 'GET' });
    if (statusFilter && statusFilter !== 'ALL') {
      return orders.filter((o) => o.status === statusFilter);
    }
    return orders;
  }

  public async processVoiceNote(audioBlob: Blob): Promise<AIProposal> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'mechanic_dictation.wav');

    return this.request<AIProposal>('/ai/voice-notes/process', {
      method: 'POST',
      body: formData,
    });
  }

  public async submitQuickService(entry: {
    vehicleId: string;
    odometerKm: number;
    interventions: string[];
    observations?: string;
  }): Promise<{ workOrderId: string; status: string }> {
    return this.request<{ workOrderId: string; status: string }>('/work-orders/quick-service', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  }
}
