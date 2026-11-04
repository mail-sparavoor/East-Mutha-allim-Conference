const API_BASE = '/api';

function getAuthHeader() {
  const token = localStorage.getItem('muthaallim_admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Resilient API request wrapper: handles JSON, HTML error fallbacks, and connection drops
async function fetchApi(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  let res;

  try {
    res = await fetch(url, options);
  } catch (netErr) {
    throw new Error('Network error: Unable to reach conference server. Please ensure the backend is running.');
  }

  const contentType = res.headers.get('content-type') || '';
  let data = null;

  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }
  } else {
    // Non-JSON response (e.g. 404 HTML, 500 HTML error page from proxy or unrouted server)
    const rawText = await res.text();
    let cleanMessage = '';

    // Extract title or heading if available
    const titleMatch = rawText.match(/<title>(.*?)<\/title>/i);
    const h1Match = rawText.match(/<h1>(.*?)<\/h1>/i);
    cleanMessage = (titleMatch && titleMatch[1]) || (h1Match && h1Match[1]) || '';

    if (!cleanMessage && rawText.length < 120 && rawText.trim()) {
      cleanMessage = rawText.trim();
    }
    if (!cleanMessage) {
      cleanMessage = `Server returned HTTP ${res.status} (${res.statusText || 'Error'})`;
    }
    throw new Error(cleanMessage);
  }

  if (!res.ok) {
    const errorMsg = data?.error || data?.message || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Settings
  async getSettings() {
    return fetchApi('/settings');
  },
  async updateSettings(data) {
    return fetchApi('/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
  },

  // Hierarchy
  async getDivisions() {
    return fetchApi('/hierarchy/divisions');
  },
  async getSectors(divisionId) {
    const url = divisionId ? `/hierarchy/sectors?division_id=${divisionId}` : `/hierarchy/sectors`;
    return fetchApi(url);
  },
  async getUnits(sectorId) {
    const url = sectorId ? `/hierarchy/units?sector_id=${sectorId}` : `/hierarchy/units`;
    return fetchApi(url);
  },
  async getHierarchyTree() {
    return fetchApi('/hierarchy/tree');
  },
  async getColleges() {
    return fetchApi('/hierarchy/colleges');
  },
  async createCollege(data) {
    return fetchApi('/hierarchy/college', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  // Hierarchy Admin CRUD
  async createDivision(data) {
    return fetchApi('/hierarchy/division', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
  },
  async updateDivision(id, data) {
    return fetchApi(`/hierarchy/division/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
  },
  async deleteDivision(id) {
    return fetchApi(`/hierarchy/division/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
  },
  async createSector(data) {
    return fetchApi('/hierarchy/sector', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
  },
  async updateSector(id, data) {
    return fetchApi(`/hierarchy/sector/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
  },
  async deleteSector(id) {
    return fetchApi(`/hierarchy/sector/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
  },
  async createUnit(data) {
    return fetchApi('/hierarchy/unit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
  },
  async updateUnit(id, data) {
    return fetchApi(`/hierarchy/unit/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
  },
  async deleteUnit(id) {
    return fetchApi(`/hierarchy/unit/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
  },
  async bulkImportHierarchy(rows) {
    return fetchApi('/hierarchy/bulk-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ rows })
    });
  },

  // Attendees
  async checkAttendee(mobile, full_name) {
    return fetchApi('/attendees/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, full_name })
    });
  },
  async registerAttendee(data) {
    return fetchApi('/attendees/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },
  async getTicket(identifier) {
    const res = await fetchApi(`/attendees/ticket/${encodeURIComponent(identifier)}`);
    return res.attendee;
  },
  async lookupTicket(identifier) {
    const res = await fetchApi(`/attendees/lookup/${encodeURIComponent(identifier)}`);
    return res.attendee;
  },
  async getAttendees(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return fetchApi(`/attendees?${qs}`, {
      headers: { ...getAuthHeader() }
    });
  },
  async updateAttendee(id, data) {
    return fetchApi(`/attendees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
  },
  async deleteAttendee(id) {
    return fetchApi(`/attendees/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
  },
  getExportUrl(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return `${API_BASE}/attendees/export/csv?${qs}`;
  },

  // Check-in Scanner
  async scanCheckIn(qrData, verifier) {
    return fetchApi('/checkin/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrData, verifier })
    });
  },
  async manualCheckIn(attendeeId, action = 'admit', verifier) {
    return fetchApi('/checkin/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attendee_id: attendeeId, action, verifier })
    });
  },
  async getRecentCheckIns() {
    return fetchApi('/checkin/recent');
  },

  // Admin
  async adminLogin(username, password) {
    return fetchApi('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
  },
  async getAdminMe() {
    return fetchApi('/admin/me', {
      headers: { ...getAuthHeader() }
    });
  },
  async getAnalytics() {
    return fetchApi('/admin/analytics', {
      headers: { ...getAuthHeader() }
    });
  }
};
