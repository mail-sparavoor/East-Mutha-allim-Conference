const API_BASE = '/api';

function getAuthHeader() {
  const token = localStorage.getItem('muthaallim_admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  // Settings
  async getSettings() {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },
  async updateSettings(data) {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to update settings');
    return res.json();
  },

  // Hierarchy
  async getDivisions() {
    const res = await fetch(`${API_BASE}/hierarchy/divisions`);
    if (!res.ok) throw new Error('Failed to fetch divisions');
    return res.json();
  },
  async getSectors(divisionId) {
    const url = divisionId ? `${API_BASE}/hierarchy/sectors?division_id=${divisionId}` : `${API_BASE}/hierarchy/sectors`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch sectors');
    return res.json();
  },
  async getUnits(sectorId) {
    const url = sectorId ? `${API_BASE}/hierarchy/units?sector_id=${sectorId}` : `${API_BASE}/hierarchy/units`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch units');
    return res.json();
  },
  async getHierarchyTree() {
    const res = await fetch(`${API_BASE}/hierarchy/tree`);
    if (!res.ok) throw new Error('Failed to fetch hierarchy tree');
    return res.json();
  },
  async getColleges() {
    const res = await fetch(`${API_BASE}/hierarchy/colleges`);
    if (!res.ok) throw new Error('Failed to fetch colleges');
    return res.json();
  },
  async createCollege(data) {
    const res = await fetch(`${API_BASE}/hierarchy/college`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to add institution');
    return res.json();
  },

  // Hierarchy Admin CRUD
  async createDivision(data) {
    const res = await fetch(`${API_BASE}/hierarchy/division`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to create division');
    return res.json();
  },
  async updateDivision(id, data) {
    const res = await fetch(`${API_BASE}/hierarchy/division/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to update division');
    return res.json();
  },
  async deleteDivision(id) {
    const res = await fetch(`${API_BASE}/hierarchy/division/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete division');
    return res.json();
  },
  async createSector(data) {
    const res = await fetch(`${API_BASE}/hierarchy/sector`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to create sector');
    return res.json();
  },
  async updateSector(id, data) {
    const res = await fetch(`${API_BASE}/hierarchy/sector/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to update sector');
    return res.json();
  },
  async deleteSector(id) {
    const res = await fetch(`${API_BASE}/hierarchy/sector/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete sector');
    return res.json();
  },
  async createUnit(data) {
    const res = await fetch(`${API_BASE}/hierarchy/unit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to create unit');
    return res.json();
  },
  async updateUnit(id, data) {
    const res = await fetch(`${API_BASE}/hierarchy/unit/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to update unit');
    return res.json();
  },
  async deleteUnit(id) {
    const res = await fetch(`${API_BASE}/hierarchy/unit/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete unit');
    return res.json();
  },
  async bulkImportHierarchy(rows) {
    const res = await fetch(`${API_BASE}/hierarchy/bulk-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ rows })
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to import hierarchy');
    return res.json();
  },

  // Attendees
  async checkAttendee(mobile, full_name) {
    const res = await fetch(`${API_BASE}/attendees/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, full_name })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Check failed');
    return result;
  },
  async registerAttendee(data) {
    const res = await fetch(`${API_BASE}/attendees/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Registration failed');
    return result;
  },
  async getTicket(identifier) {
    const res = await fetch(`${API_BASE}/attendees/ticket/${encodeURIComponent(identifier)}`);
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Ticket not found');
    return result.attendee;
  },
  async getAttendees(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/attendees?${qs}`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch attendees');
    return res.json();
  },
  async updateAttendee(id, data) {
    const res = await fetch(`${API_BASE}/attendees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to update attendee');
    return res.json();
  },
  async deleteAttendee(id) {
    const res = await fetch(`${API_BASE}/attendees/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete attendee');
    return res.json();
  },
  getExportUrl(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return `${API_BASE}/attendees/export/csv?${qs}`;
  },

  // Check-in Scanner
  async scanCheckIn(qrData, verifier) {
    const res = await fetch(`${API_BASE}/checkin/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrData, verifier })
    });
    return res.json();
  },
  async manualCheckIn(attendeeId, action = 'admit', verifier) {
    const res = await fetch(`${API_BASE}/checkin/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attendee_id: attendeeId, action, verifier })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Manual check-in failed');
    return result;
  },
  async getRecentCheckIns() {
    const res = await fetch(`${API_BASE}/checkin/recent`);
    if (!res.ok) throw new Error('Failed to fetch recent check-ins');
    return res.json();
  },

  // Admin
  async adminLogin(username, password) {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Login failed');
    return result;
  },
  async getAdminMe() {
    const res = await fetch(`${API_BASE}/admin/me`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to verify admin');
    return res.json();
  },
  async getAnalytics() {
    const res = await fetch(`${API_BASE}/admin/analytics`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to load analytics');
    return res.json();
  }
};
