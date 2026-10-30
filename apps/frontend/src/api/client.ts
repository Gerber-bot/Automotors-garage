import {
  MOCK_VEHICLES,
  MOCK_WORK_ORDERS,
} from './mock-backend.ts';
import type {
  Vehicle,
  WorkOrder,
  SerialPortInfo,
  ObdTelemetrySnapshot,
  AIStatus,
  HistorySummary,
  MaintenanceExplanation,
  KbManufacturer,
  KbModel,
  KbGeneration,
  KbConfiguration,
  KbTechnicalSpec,
  KbMaintenanceRule,
  TechnicalIdentificationResult,
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
    activeTenantId: string | null;
  };
  user: {
    id: string;
    email: string;
    fullName: string;
    phone?: string | null;
    role: string;
    accountType?: 'WORKSHOP_USER' | 'VEHICLE_OWNER';
    profiles?: string[];
    workshops: Array<{ id: string; name: string; role: string }>;
  };
}

export interface CurrentUserResponse {
  user: {
    id: string;
    email: string;
    fullName?: string;
    phone?: string | null;
    role?: string;
    accountType?: 'WORKSHOP_USER' | 'VEHICLE_OWNER';
    profiles?: string[];
  };
  activeTenantId: string | null;
  workshops: Array<{
    workshopId: string;
    workshopName: string;
    role: string;
    permissions?: string[];
  }>;
}

export interface OwnerVehicle {
  id: string;
  vin: string | null;
  plate: string | null;
  make: string;
  model: string;
  year: number;
  engine: string | null;
  fuelType: string;
  currentMileage: number;
  ownerUserId: string;
  configurationId?: string | null;
  transmission?: string;
  distributionType?: string;
  exactEngineCode?: string;
  technicalProfile?: {
    profileId: string;
    exactEngineCodeStatus: 'CONFIRMED' | 'PENDING_CONFIRMATION';
    exactEngineCodeNote: string;
    transmission: string;
    distributionType: string;
    distributionNote: string;
    isProfileComplete: boolean;
  } | null;
}

export interface OwnerTimelineEntry {
  id: string;
  vehicleId: string;
  serviceDate: string;
  createdAt?: string;
  recordedMileage: number;
  recordedByUserId?: string | null;
  category: string;
  title: string;
  description: string;
  interventions: Array<{ title: string; category: string; description: string }>;
  workshopName: string;
  recordOrigin: 'WORKSHOP_CERTIFIED' | 'OWNER_DECLARED';
  verificationLevel: string;
  isCertified: boolean;
  observations: string | null;
  cost: number | null;
  corrections: Array<{
    id: string;
    actorName: string;
    reason: string;
    previousData: Record<string, unknown>;
    correctedData: Record<string, unknown>;
    createdAt: string;
  }>;
}

export interface OwnerPredictionItem {
  category: string;
  label: string;
  shortDescription: string;
  status: 'INSUFFICIENT_DATA' | 'OK' | 'UPCOMING_SOON' | 'DUE_NOW' | 'OVERDUE';
  nextDueMileage: number | null;
  remainingKm: number | null;
  nextDueDate: string | null;
  estimatedDaysRemaining: number | null;
  dueReason: string;
  confidence: string;
  sourceCitation: string | null;
  lastServiceDate: string | null;
  lastServiceMileage: number | null;
  message: string | null;
  technicalNote: string | null;
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

  public setAuthSession(token: string, tenantId: string | null): void {
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

    return {} as T;
  }

  // Authentication
  public async registerOwner(
    payload: {
      fullName: string;
      email: string;
      password: string;
      phone?: string;
    },
    signal?: AbortSignal
  ): Promise<LoginResponse> {
    const res = await this.request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
    });
    this.setAuthSession(res.token, res.session.activeTenantId ?? null);
    return res;
  }

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
    this.setAuthSession(res.token, res.session.activeTenantId ?? null);
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

  // Domain API Methods: Diagnostics (OBD-II)
  public async getDiagnosticsPorts(signal?: AbortSignal): Promise<{ ports: SerialPortInfo[] }> {
    return this.request<{ ports: SerialPortInfo[] }>('/diagnostics/ports', {
      method: 'GET',
      signal,
    });
  }

  public async startDiagnosticsSession(
    params: {
      vehicleId: string;
      transportType?: 'SIMULATED' | 'WINDOWS_USB_SERIAL';
      comPort?: string;
      simulatorConfig?: {
        engineRpm?: number;
        vehicleSpeed?: number;
        coolantTemp?: number;
        milActive?: boolean;
        storedDtcs?: string[];
        faultInjection?: 'NONE' | 'NO_DATA' | 'UNABLE_TO_CONNECT' | 'BUS_BUSY' | 'TIMEOUT';
      };
    },
    signal?: AbortSignal
  ): Promise<{ status: string; transportId: string; isSimulated: boolean }> {
    return this.request<{ status: string; transportId: string; isSimulated: boolean }>(
      '/diagnostics/session/start',
      {
        method: 'POST',
        body: JSON.stringify(params),
        signal,
      }
    );
  }

  public async getDiagnosticsLive(
    vehicleId: string,
    signal?: AbortSignal
  ): Promise<ObdTelemetrySnapshot> {
    return this.request<ObdTelemetrySnapshot>(
      `/diagnostics/session/live?vehicleId=${encodeURIComponent(vehicleId)}`,
      {
        method: 'GET',
        signal,
      }
    );
  }

  public async stopDiagnosticsSession(
    vehicleId: string,
    signal?: AbortSignal
  ): Promise<{ status: string }> {
    return this.request<{ status: string }>('/diagnostics/session/stop', {
      method: 'POST',
      body: JSON.stringify({ vehicleId }),
      signal,
    });
  }

  public async saveDiagnosticsSnapshot(
    params: {
      vehicleId: string;
      telemetry: ObdTelemetrySnapshot;
      technicianNotes?: string;
    },
    signal?: AbortSignal
  ): Promise<{ record: any }> {
    return this.request<{ record: any }>('/diagnostics/session/snapshot', {
      method: 'POST',
      body: JSON.stringify(params),
      signal,
    });
  }

  // Domain API Methods: Mi Automotors (Owner Portal)
  public async getOwnerProfile(signal?: AbortSignal): Promise<{
    id: string;
    email: string;
    fullName: string;
    phone: string | null;
    createdAt: string | null;
    accountType: 'WORKSHOP_USER' | 'VEHICLE_OWNER';
    profiles: string[];
    vehiclesCount: number;
  }> {
    return this.request('/owner/profile', { method: 'GET', signal });
  }

  public async updateOwnerProfile(
    payload: { fullName?: string; phone?: string },
    signal?: AbortSignal
  ): Promise<{ id: string; email: string; fullName: string; phone: string | null }> {
    return this.request('/owner/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
      signal,
    });
  }

  public async getOwnerVehicles(signal?: AbortSignal): Promise<OwnerVehicle[]> {
    return this.request<OwnerVehicle[]>('/owner/vehicles', { method: 'GET', signal });
  }

  public async createOwnerVehicle(
    payload: {
      make: string;
      model: string;
      year: number;
      plate: string;
      currentMileage: number;
      engine?: string;
      fuelType?: string;
      vin?: string;
      transmission?: string;
      distributionType?: string;
      exactEngineCode?: string;
    },
    signal?: AbortSignal
  ): Promise<OwnerVehicle> {
    return this.request<OwnerVehicle>('/owner/vehicles', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
    });
  }

  public async getOwnerVehicleById(vehicleId: string, signal?: AbortSignal): Promise<OwnerVehicle> {
    return this.request<OwnerVehicle>(`/owner/vehicles/${vehicleId}`, { method: 'GET', signal });
  }

  public async updateOwnerVehicle(
    vehicleId: string,
    payload: Partial<OwnerVehicle>,
    signal?: AbortSignal
  ): Promise<OwnerVehicle> {
    return this.request<OwnerVehicle>(`/owner/vehicles/${vehicleId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      signal,
    });
  }

  public async getOwnerVehicleHistory(
    vehicleId: string,
    signal?: AbortSignal
  ): Promise<{
    vehicle: OwnerVehicle;
    totalRecords: number;
    certifiedCount: number;
    declaredCount: number;
    timeline: OwnerTimelineEntry[];
  }> {
    return this.request(`/owner/vehicles/${vehicleId}/history`, { method: 'GET', signal });
  }

  public async createOwnerMaintenanceRecord(
    vehicleId: string,
    payload: {
      category: string;
      title?: string;
      description: string;
      recordedMileage: number;
      serviceDate?: string;
      workshopName?: string;
      cost?: number;
      observations?: string;
    },
    signal?: AbortSignal
  ): Promise<OwnerTimelineEntry> {
    return this.request<OwnerTimelineEntry>(`/owner/vehicles/${vehicleId}/maintenance`, {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
    });
  }

  public async createOwnerMaintenanceCorrection(
    recordId: string,
    payload: {
      reason: string;
      correctedData: Record<string, unknown>;
    },
    signal?: AbortSignal
  ): Promise<{ correction: any }> {
    return this.request(`/owner/maintenance/${recordId}/corrections`, {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
    });
  }

  public async getOwnerVehiclePredictions(
    vehicleId: string,
    signal?: AbortSignal
  ): Promise<{
    vehicle: OwnerVehicle;
    estimatedMonthlyKm: number;
    insufficientDataMessage: string;
    predictions: OwnerPredictionItem[];
  }> {
    return this.request(`/owner/vehicles/${vehicleId}/predictions`, { method: 'GET', signal });
  }

  public async getAiStatus(signal?: AbortSignal): Promise<AIStatus> {
    try {
      return await this.request<AIStatus>('/ai/status', { method: 'GET', signal });
    } catch {
      return {
        isConfigured: false,
        providerName: 'OfflineMode',
        model: 'none',
        message: 'No se pudo verificar el estado del servicio de IA.',
      };
    }
  }

  public async getOwnerHistorySummary(vehicleId: string, signal?: AbortSignal): Promise<HistorySummary> {
    return this.request<HistorySummary>(`/owner/vehicles/${vehicleId}/history/summary`, {
      method: 'POST',
      signal,
    });
  }

  public async getWorkshopHistorySummary(vehicleId: string, signal?: AbortSignal): Promise<HistorySummary> {
    return this.request<HistorySummary>(`/vehicles/${vehicleId}/history/summary`, {
      method: 'POST',
      signal,
    });
  }

  public async explainOwnerMaintenance(
    vehicleId: string,
    category: string,
    signal?: AbortSignal
  ): Promise<MaintenanceExplanation> {
    return this.request<MaintenanceExplanation>(
      `/owner/vehicles/${vehicleId}/predictions/${encodeURIComponent(category)}/explain`,
      {
        method: 'POST',
        signal,
      }
    );
  }

  public async explainWorkshopMaintenance(
    vehicleId: string,
    category: string,
    signal?: AbortSignal
  ): Promise<MaintenanceExplanation> {
    return this.request<MaintenanceExplanation>(
      `/vehicles/${vehicleId}/predictions/${encodeURIComponent(category)}/explain`,
      {
        method: 'POST',
        signal,
      }
    );
  }

  // ============================================================================
  // VEHICLE KNOWLEDGE BASE METHODS
  // ============================================================================

  public async listKbManufacturers(signal?: AbortSignal): Promise<KbManufacturer[]> {
    return this.request<KbManufacturer[]>('/kb/manufacturers', { method: 'GET', signal });
  }

  public async listKbModels(manufacturerId?: string, signal?: AbortSignal): Promise<KbModel[]> {
    const qs = manufacturerId ? `?manufacturerId=${encodeURIComponent(manufacturerId)}` : '';
    return this.request<KbModel[]>(`/kb/models${qs}`, { method: 'GET', signal });
  }

  public async listKbGenerations(modelId: string, signal?: AbortSignal): Promise<KbGeneration[]> {
    return this.request<KbGeneration[]>(`/kb/generations?modelId=${encodeURIComponent(modelId)}`, {
      method: 'GET',
      signal,
    });
  }

  public async searchKbConfigurations(
    params: { make?: string; model?: string; year?: number; market?: string },
    signal?: AbortSignal
  ): Promise<KbConfiguration[]> {
    const sp = new URLSearchParams();
    if (params.make) sp.set('make', params.make);
    if (params.model) sp.set('model', params.model);
    if (params.year) sp.set('year', String(params.year));
    if (params.market) sp.set('market', params.market);
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return this.request<KbConfiguration[]>(`/kb/configurations${qs}`, { method: 'GET', signal });
  }

  public async getKbConfiguration(
    id: string,
    signal?: AbortSignal
  ): Promise<KbConfiguration & { specs: KbTechnicalSpec[]; rules: KbMaintenanceRule[] }> {
    return this.request(`/kb/configurations/${encodeURIComponent(id)}`, { method: 'GET', signal });
  }

  public async identifyVehicleTechnicalProfile(
    params: {
      make: string;
      model: string;
      year: number;
      engine?: string;
      fuelType?: string;
      transmission?: string;
      userDeclaredDistribution?: string;
      userDeclaredEngineCode?: string;
    },
    signal?: AbortSignal
  ): Promise<TechnicalIdentificationResult> {
    return this.request<TechnicalIdentificationResult>('/kb/identify', {
      method: 'POST',
      body: JSON.stringify(params),
      signal,
    });
  }

  public async bindOwnerVehicleConfiguration(
    vehicleId: string,
    configurationId: string,
    signal?: AbortSignal
  ): Promise<OwnerVehicle> {
    return this.request<OwnerVehicle>(`/owner/vehicles/${encodeURIComponent(vehicleId)}/configuration`, {
      method: 'POST',
      body: JSON.stringify({ configurationId }),
      signal,
    });
  }

  public async bindWorkshopVehicleConfiguration(
    vehicleId: string,
    configurationId: string,
    signal?: AbortSignal
  ): Promise<any> {
    return this.request(`/vehicles/${encodeURIComponent(vehicleId)}/configuration`, {
      method: 'POST',
      body: JSON.stringify({ configurationId }),
      signal,
    });
  }

  public async verifyKbRule(
    ruleId: string,
    notes?: string,
    signal?: AbortSignal
  ): Promise<KbMaintenanceRule> {
    return this.request<KbMaintenanceRule>(`/kb/rules/${encodeURIComponent(ruleId)}/verify`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
      signal,
    });
  }

  public async createKbRuleRevision(
    ruleId: string,
    changes: Partial<KbMaintenanceRule>,
    autoVerify?: boolean,
    signal?: AbortSignal
  ): Promise<KbMaintenanceRule> {
    return this.request<KbMaintenanceRule>(`/kb/rules/${encodeURIComponent(ruleId)}/revision`, {
      method: 'POST',
      body: JSON.stringify({ changes, autoVerify }),
      signal,
    });
  }
}
