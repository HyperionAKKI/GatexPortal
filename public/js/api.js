// public/js/api.js
import { CLIENTS_DB, MOCK_SUBMISSIONS } from './utils/constants.js';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:4000/api'
  : `${window.location.origin}/api`;
const DEMO_PIN = 'gatex@admin';
const DEMO_ADMIN_PASSWORD = 'gatex-demo';
const DEMO_ADMIN_EMAIL = 'admin@gatex.demo';

function isHostedDemo() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('demo') === 'true') {
    localStorage.setItem('gatex_demo_mode', 'true');
    return true;
  }

  // Auto-enable demo mode if hosted on common static hosting domains
  const host = window.location.hostname;
  if (host.includes('vercel.app') || host.includes('netlify.app') || host.includes('github.io')) {
    localStorage.setItem('gatex_demo_mode', 'true');
    return true;
  }

  const token = localStorage.getItem('gatex_token');
  const othersToken = localStorage.getItem('gatex_others_token');
  if (token === 'demo-admin-token' || othersToken === 'demo-others-token') {
    localStorage.setItem('gatex_demo_mode', 'true');
    return true;
  }

  return localStorage.getItem('gatex_demo_mode') === 'true';
}

function buildDemoStats(submissions) {
  return {
    total: submissions.length,
    pending: submissions.filter(item => item.status === 'pending').length,
    approved: submissions.filter(item => item.status === 'approved').length,
    rejected: submissions.filter(item => item.status === 'rejected').length,
    duplicates: submissions.filter(item => item.dup || item.hasDuplicateWarning).length
  };
}

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('gatex_token') || null;
    this.othersToken = localStorage.getItem('gatex_others_token') || null;
    this.isDemoMode = isHostedDemo();
    this.demoSubmissions = MOCK_SUBMISSIONS.map(item => ({ ...item }));
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('gatex_token', token);
    } else {
      localStorage.removeItem('gatex_token');
    }
  }

  setOthersToken(token) {
    this.othersToken = token;
    if (token) {
      localStorage.setItem('gatex_others_token', token);
    } else {
      localStorage.removeItem('gatex_others_token');
    }
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    } else if (this.othersToken) {
      headers['Authorization'] = `Bearer ${this.othersToken}`;
    }
    return headers;
  }

  clearAuth() {
    this.setToken(null);
    this.setOthersToken(null);
    localStorage.removeItem('gatex_demo_mode');
    this.isDemoMode = isHostedDemo();
  }

  async request(endpoint, options = {}) {
    if (this.isDemoMode) {
      throw new Error(`Demo mode is enabled. Network request skipped for ${endpoint}.`);
    }

    const url = `${API_BASE}${endpoint}`;
    const headers = { ...this.getHeaders(), ...options.headers };

    try {
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.warn(`API Request to ${endpoint} failed. Using frontend fallback/mock if available.`, err);
      throw err;
    }
  }

  // Auth
  async loginAdmin(email, password) {
    if (this.isDemoMode) {
      if (email !== DEMO_ADMIN_EMAIL || password !== DEMO_ADMIN_PASSWORD) {
        throw new Error('Invalid admin password');
      }
      const token = 'demo-admin-token';
      this.setToken(token);
      return { token, mode: 'demo', role: 'admin', email };
    }

    try {
      const res = await this.request('/auth/admin', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (res.token) {
        this.setToken(res.token);
      }
      return res;
    } catch (err) {
      console.warn('Backend login failed, attempting local demo fallback login...', err);
      if (email === DEMO_ADMIN_EMAIL && password === DEMO_ADMIN_PASSWORD) {
        const token = 'demo-admin-token';
        this.setToken(token);
        this.isDemoMode = true;
        localStorage.setItem('gatex_demo_mode', 'true');
        return { token, mode: 'demo', role: 'admin', email };
      }
      throw err;
    }
  }

  async verifyOthersPin(pin) {
    if (this.isDemoMode) {
      if (pin !== DEMO_PIN) {
        throw new Error('Invalid PIN');
      }
      const token = 'demo-others-token';
      this.setOthersToken(token);
      return { token, mode: 'demo' };
    }

    try {
      const res = await this.request('/auth/others-pin', {
        method: 'POST',
        body: JSON.stringify({ pin })
      });
      if (res.token) {
        this.setOthersToken(res.token);
      }
      return res;
    } catch (err) {
      console.warn('Backend PIN verification failed, attempting local demo fallback...', err);
      if (pin === DEMO_PIN) {
        const token = 'demo-others-token';
        this.setOthersToken(token);
        this.isDemoMode = true;
        localStorage.setItem('gatex_demo_mode', 'true');
        return { token, mode: 'demo' };
      }
      throw err;
    }
  }

  // Clients
  async getClients(sector = '', search = '') {
    if (this.isDemoMode) {
      const query = search.trim().toLowerCase();
      return CLIENTS_DB.filter(client => {
        const matchesSector = !sector || client.sector === sector;
        const matchesSearch = !query ||
          client.name.toLowerCase().includes(query) ||
          client.gateId.toLowerCase().includes(query);
        return matchesSector && matchesSearch;
      });
    }

    const params = new URLSearchParams();
    if (sector) params.append('sector', sector);
    if (search) params.append('search', search);
    return this.request(`/clients?${params.toString()}`);
  }

  async getClientById(id) {
    if (this.isDemoMode) {
      return CLIENTS_DB.find(client => client.id === id) || null;
    }

    return this.request(`/clients/${id}`);
  }

  // Registrations
  async checkDuplicate(clientId, category, fields) {
    if (this.isDemoMode) {
      const name = fields?.name?.trim().toLowerCase();
      const hasDuplicateWarning = name === 'aryan sharma' || name === 'priya singh';
      return {
        hasDuplicateWarning,
        matches: hasDuplicateWarning ? [{ name: fields.name, confidence: 0.88 }] : [],
        clientId,
        category
      };
    }

    return this.request('/registrations/check-duplicate', {
      method: 'POST',
      body: JSON.stringify({ clientId, category, fields })
    });
  }

  async createRegistration(registrationData) {
    if (this.isDemoMode) {
      const submissionId = `GATEX-REG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const client = CLIENTS_DB.find(item => item.id === registrationData.clientId);
      this.demoSubmissions.unshift({
        id: submissionId,
        clientId: registrationData.clientId,
        sector: registrationData.sector,
        client: client?.name || 'Demo Client',
        cat: registrationData.category,
        name: registrationData.fields?.name || 'Demo Record',
        status: 'pending',
        dup: false,
        date: new Date().toISOString().slice(0, 10)
      });
      return { submissionId, mode: 'demo' };
    }

    // registrationData: { clientId, sector, category, fields, mode }
    return this.request('/registrations', {
      method: 'POST',
      body: JSON.stringify(registrationData)
    });
  }

  async uploadImages(registrationId, formData) {
    if (this.isDemoMode) {
      return {
        registrationId,
        uploaded: Array.from(formData.keys()).length,
        mode: 'demo'
      };
    }

    // Note: Multipart upload needs boundary, so we don't set Content-Type header manually
    const headers = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    } else if (this.othersToken) {
      headers['Authorization'] = `Bearer ${this.othersToken}`;
    }

    const url = `${API_BASE}/registrations/${registrationId}/images`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  async getRegistrationDetails(id) {
    if (this.isDemoMode) {
      return this.demoSubmissions.find(item => item.id === id || item.submissionId === id) || null;
    }

    return this.request(`/registrations/${id}`);
  }

  // Admin
  async getSubmissions(filters = {}) {
    if (this.isDemoMode) {
      const { sector = '', clientId = '', category = '', status = '' } = filters;
      return this.demoSubmissions.filter(item => {
        const itemClient = item.client.name || item.client;
        const itemCategory = (item.category || item.cat).toLowerCase();
        const itemClientId = item.clientId || '';
        const itemSector = item.sector || item.client?.sector || '';
        return (
          (!sector || itemSector === sector) &&
          (!clientId || itemClientId === clientId) &&
          itemCategory.includes(category.toLowerCase()) &&
          (!status || item.status === status)
        );
      });
    }

    const params = new URLSearchParams(filters);
    return this.request(`/admin/submissions?${params.toString()}`);
  }

  async updateSubmissionStatus(id, status) {
    if (this.isDemoMode) {
      const record = this.demoSubmissions.find(item => (item.id || item.submissionId) === id);
      if (record) {
        record.status = status;
      }
      return { id, status, mode: 'demo' };
    }

    return this.request(`/admin/submissions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  async uploadImport(formData) {
    if (this.isDemoMode) {
      return {
        imported: true,
        filename: formData.get('file')?.name || 'demo.csv',
        mode: 'demo'
      };
    }

    const headers = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    const url = `${API_BASE}/admin/upload-import`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  async getAdminStats() {
    if (this.isDemoMode) {
      return buildDemoStats(this.demoSubmissions);
    }

    return this.request('/admin/stats');
  }

  async updateOthersPin(newPassword) {
    if (this.isDemoMode) {
      return { success: true, mode: 'demo', updated: Boolean(newPassword) };
    }

    return this.request('/admin/others-pin', {
      method: 'POST',
      body: JSON.stringify({ newPassword })
    });
  }
}

export const api = new ApiClient();
