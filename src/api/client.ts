const API_BASE = '/api';

export interface UserInfo {
  username: string;
  authenticated: boolean;
}

export interface ServerPrinterStatus {
  connected: boolean;
  name: string;
  address: string;
  batteryLevel?: number;
  isSimulation?: boolean;
}

export interface DiscoveredBleDevice {
  address: string;
  name: string;
  rssi: number;
  is_p15: boolean;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('pristar_token');
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('pristar_token', token);
    } else {
      localStorage.removeItem('pristar_token');
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public isAuthenticated(): boolean {
    return !!this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.setToken(null);
      window.dispatchEvent(new CustomEvent('pristar:unauthorized'));
      throw new Error('Session expirée. Veuillez vous reconnecter.');
    }

    if (!response.ok) {
      let errorDetail = 'Une erreur est survenue';
      try {
        const errorJson = await response.json();
        errorDetail = errorJson.detail || errorDetail;
      } catch {}
      throw new Error(errorDetail);
    }

    return response.json();
  }

  // --- Authentification & Initialisation ---

  async getAuthStatus(): Promise<{ initialized: boolean }> {
    return this.request<{ initialized: boolean }>('/auth/status');
  }

  async setupAdmin(data: {
    username: string;
    password: string;
    confirm_password?: string;
  }): Promise<{ token: string; username: string }> {
    const res = await this.request<{ token: string; username: string }>('/auth/setup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(res.token);
    return res;
  }

  async login(username: string, password: string): Promise<{ token: string; username: string }> {
    const data = await this.request<{ token: string; username: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async getMe(): Promise<UserInfo> {
    return this.request<UserInfo>('/auth/me');
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<any> {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    });
  }

  logout() {
    this.setToken(null);
  }

  // --- Modèles personnalisés (Templates) ---

  async getTemplates(category?: string): Promise<any[]> {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.request(`/templates${query}`);
  }

  async createTemplate(templateData: {
    name: string;
    category: string;
    description?: string;
    dimensions: any;
    elements: any[];
    preview?: string;
  }): Promise<any> {
    return this.request('/templates', {
      method: 'POST',
      body: JSON.stringify(templateData),
    });
  }

  async updateTemplate(id: string, templateData: any): Promise<any> {
    return this.request(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(templateData),
    });
  }

  async deleteTemplate(id: string): Promise<any> {
    return this.request(`/templates/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Imprimante Docker BLE ---

  async getPrinterStatus(): Promise<ServerPrinterStatus> {
    return this.request('/printer/status');
  }

  async scanPrinters(timeout: number = 5): Promise<{ devices: DiscoveredBleDevice[] }> {
    return this.request(`/printer/scan?timeout=${timeout}`, {
      method: 'POST',
    });
  }

  async connectPrinter(address: string): Promise<any> {
    return this.request('/printer/connect', {
      method: 'POST',
      body: JSON.stringify({ address }),
    });
  }

  async disconnectPrinter(): Promise<any> {
    return this.request('/printer/disconnect', {
      method: 'POST',
    });
  }

  async printJob(payload: {
    title?: string;
    packed_bitmap_base64: string;
    bytes_per_row: number;
    height: number;
    density?: number;
    paper_type?: string;
    copies?: number;
    dimensions?: any;
    preview_base64?: string;
  }): Promise<{ status: string; message: string }> {
    return this.request('/printer/print', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getHistory(): Promise<any[]> {
    return this.request('/history');
  }
}

export const api = new ApiClient();
