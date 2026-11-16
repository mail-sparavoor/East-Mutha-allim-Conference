import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Download, 
  Filter, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  RotateCcw, 
  Ticket, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  X, 
  Save, 
  AlertCircle,
  Eye,
  FileSpreadsheet,
  Check
} from 'lucide-react';
import { api } from '../utils/api';

export default function AttendeeTable({ onViewTicket, onDataChanged }) {
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Dropdown options
  const [divisions, setDivisions] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);

  // Edit Modal State
  const [editingAttendee, setEditingAttendee] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editSectors, setEditSectors] = useState([]);
  const [editUnits, setEditUnits] = useState([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete State
  const [deletingId, setDeletingId] = useState(null);

  // Load divisions
  useEffect(() => {
    api.getDivisions().then(setDivisions).catch(console.error);
  }, []);

  // Load institutions based on selected division (or all if none selected)
  useEffect(() => {
    let active = true;
    setLoadingInstitutions(true);
    const fetchPromise = divisionFilter ? api.getInstitutions(divisionFilter) : api.getInstitutions();
    fetchPromise
      .then((data) => {
        if (active) setInstitutions(data || []);
      })
      .catch((err) => {
        console.error('Failed to load institutions:', err);
        if (active) setInstitutions([]);
      })
      .finally(() => {
        if (active) setLoadingInstitutions(false);
      });

    return () => {
      active = false;
    };
  }, [divisionFilter]);

  // Fetch attendees list
  const loadAttendees = async (page = 1) => {
    try {
      setLoading(true);
      const res = await api.getAttendees({
        search,
        division_id: divisionFilter,
        institution_id: institutionFilter,
        status: statusFilter,
        page,
        limit: pagination.limit
      });
      setAttendees(res.attendees || []);
      setPagination(res.pagination || { total: 0, page: 1, limit: 15, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load attendees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendees(1);
  }, [search, divisionFilter, institutionFilter, statusFilter]);

  // Handle Quick Toggle Check-in
  const handleToggleCheckin = async (attendee) => {
    try {
      if (attendee.status === 'Admitted') {
        if (!window.confirm(`Undo admission check-in for ${attendee.full_name}?`)) return;
        await api.manualCheckIn(attendee.id, 'undo');
      } else {
        await api.manualCheckIn(attendee.id, 'admit', 'Admin Table');
      }
      loadAttendees(pagination.page);
      if (onDataChanged) onDataChanged();
    } catch (err) {
      alert(err.message);
    }
  };

  // Open Edit Modal
  const openEditModal = async (att) => {
    setEditingAttendee(att);
    setEditFormData({
      full_name: att.full_name,
      mobile: att.mobile,
      division_id: att.division_id,
      sector_id: att.sector_id,
      unit_id: att.unit_id,
      college: att.college,
      status: att.status,
      notes: att.notes || ''
    });
    setEditError('');

    try {
      if (att.division_id) {
        const secs = await api.getSectors(att.division_id);
        setEditSectors(secs);
      }
      if (att.sector_id) {
        const uns = await api.getUnits(att.sector_id);
        setEditUnits(uns);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditDivisionChange = async (e) => {
    const divId = e.target.value;
    setEditFormData(prev => ({ ...prev, division_id: divId, sector_id: '', unit_id: '' }));
    setEditUnits([]);
    if (divId) {
      const secs = await api.getSectors(divId);
      setEditSectors(secs);
    } else {
      setEditSectors([]);
    }
  };

  const handleEditSectorChange = async (e) => {
    const secId = e.target.value;
    setEditFormData(prev => ({ ...prev, sector_id: secId, unit_id: '' }));
    if (secId) {
      const uns = await api.getUnits(secId);
      setEditUnits(uns);
    } else {
      setEditUnits([]);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editFormData.full_name || !editFormData.mobile) {
      setEditError('Name and mobile number are required');
      return;
    }
    setSavingEdit(true);
    try {
      await api.updateAttendee(editingAttendee.id, editFormData);
      setEditingAttendee(null);
      loadAttendees(pagination.page);
      if (onDataChanged) onDataChanged();
    } catch (err) {
      setEditError(err.message || 'Failed to update attendee');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete attendee
  const handleDeleteAttendee = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete attendee "${name}"?`)) return;
    setDeletingId(id);
    try {
      await api.deleteAttendee(id);
      loadAttendees(pagination.page);
      if (onDataChanged) onDataChanged();
    } catch (err) {
      alert(err.message || 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const params = {};
    if (divisionFilter) params.division_id = divisionFilter;
    if (institutionFilter) params.institution_id = institutionFilter;
    if (statusFilter) params.status = statusFilter;
    const exportUrl = api.getExportUrl(params);
    window.open(exportUrl, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar: Search, Filters, CSV Export */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by name, mobile, registration ID, unit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Division filter */}
          <select
            value={divisionFilter}
            onChange={(e) => {
              setDivisionFilter(e.target.value);
              setInstitutionFilter('');
            }}
            className={`px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white font-medium ${
              divisionFilter ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950 font-semibold ring-1 ring-emerald-500/30' : 'text-slate-800'
            }`}
          >
            <option value="">All Divisions</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {/* Dars / College filter (dependent on Division) */}
          <select
            value={institutionFilter}
            onChange={(e) => setInstitutionFilter(e.target.value)}
            disabled={loadingInstitutions}
            aria-label="Filter by Dars or College"
            className={`px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white font-medium max-w-[240px] sm:max-w-[280px] truncate ${
              institutionFilter ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950 font-semibold ring-1 ring-emerald-500/30' : 'text-slate-800'
            }`}
          >
            <option value="">
              {loadingInstitutions
                ? 'Loading Dars / Colleges...'
                : divisionFilter
                ? `All in ${divisions.find(d => String(d.id) === String(divisionFilter))?.name || 'Division'} (${institutions.length})`
                : `All Dars / Colleges (${institutions.length})`}
            </option>
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name} {inst.registered_count !== undefined ? `(${inst.registered_count} reg)` : ''}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white font-medium ${
              statusFilter ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950 font-semibold ring-1 ring-emerald-500/30' : 'text-slate-800'
            }`}
          >
            <option value="">All Statuses</option>
            <option value="Registered">Registered Only</option>
            <option value="Admitted">Admitted Only</option>
          </select>

          {/* Reset Filters button if any filter is active */}
          {(divisionFilter || institutionFilter || statusFilter || search) && (
            <button
              onClick={() => {
                setDivisionFilter('');
                setInstitutionFilter('');
                setStatusFilter('');
                setSearch('');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 shadow-sm transition"
            title="Download attendee records in CSV spreadsheet format"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Active Filter Badges */}
      {(divisionFilter || institutionFilter || statusFilter || search) && (
        <div className="flex flex-wrap items-center gap-2 px-1 text-xs">
          <span className="text-slate-500 font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Active Filters:
          </span>
          {divisionFilter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-medium">
              <span>Division: {divisions.find(d => String(d.id) === String(divisionFilter))?.name || divisionFilter}</span>
              <button
                onClick={() => {
                  setDivisionFilter('');
                  setInstitutionFilter('');
                }}
                className="hover:text-emerald-950 p-0.5"
                title="Remove division filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {institutionFilter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-medium">
              <span>Dars/College: {institutions.find(i => String(i.id) === String(institutionFilter))?.name || institutionFilter}</span>
              <button
                onClick={() => setInstitutionFilter('')}
                className="hover:text-emerald-950 p-0.5"
                title="Remove college filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {statusFilter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-medium">
              <span>Status: {statusFilter}</span>
              <button
                onClick={() => setStatusFilter('')}
                className="hover:text-emerald-950 p-0.5"
                title="Remove status filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {search && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-medium">
              <span>Search: &quot;{search}&quot;</span>
              <button
                onClick={() => setSearch('')}
                className="hover:text-emerald-950 p-0.5"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button
            onClick={() => {
              setDivisionFilter('');
              setInstitutionFilter('');
              setStatusFilter('');
              setSearch('');
            }}
            className="text-slate-500 hover:text-rose-600 underline text-[11px] ml-1 font-semibold"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[720px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Reg ID</th>
                <th className="py-3 px-4">Attendee Details</th>
                <th className="py-3 px-4">Division</th>
                <th className="py-3 px-4">Dars / College</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Check-in Details</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
                    <span>Loading attendee records...</span>
                  </td>
                </tr>
              ) : attendees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No attendees found matching current criteria.
                  </td>
                </tr>
              ) : (
                attendees.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/80 transition">
                    {/* Reg ID */}
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        {att.registration_id}
                      </span>
                    </td>

                    {/* Attendee Name & Phone */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{att.full_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">+91 {att.mobile}</div>
                    </td>

                    {/* Division */}
                    <td className="py-3 px-4 text-slate-700">
                      <span className="font-semibold text-slate-800">{att.division_name}</span>
                    </td>

                    {/* College */}
                    <td className="py-3 px-4 max-w-[180px] truncate text-slate-700" title={att.college}>
                      {att.college}
                    </td>

                    {/* Admission Status */}
                    <td className="py-3 px-4 text-center">
                      {att.status === 'Admitted' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Admitted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          Registered
                        </span>
                      )}
                    </td>

                    {/* Checkin Time */}
                    <td className="py-3 px-4 text-[11px] text-slate-500 font-mono">
                      {att.check_in_time ? (
                        <div>
                          <span className="text-slate-800 font-semibold block">{att.check_in_time}</span>
                          <span className="text-[10px] text-slate-400">{att.check_in_by || 'Gate'}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not checked in</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        {/* View Pass */}
                        <button
                          onClick={() => onViewTicket(att)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                          title="View & Download Ticket Pass"
                        >
                          <Ticket className="w-4 h-4" />
                        </button>

                        {/* Toggle Admission */}
                        <button
                          onClick={() => handleToggleCheckin(att)}
                          className={`p-1.5 rounded-lg transition ${
                            att.status === 'Admitted'
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={att.status === 'Admitted' ? 'Undo Check-in' : 'Admit Attendee'}
                        >
                          {att.status === 'Admitted' ? (
                            <RotateCcw className="w-4 h-4" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => openEditModal(att)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit Attendee Details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteAttendee(att.id, att.full_name)}
                          disabled={deletingId === att.id}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            Showing <strong className="text-slate-800">{attendees.length}</strong> of{' '}
            <strong className="text-slate-800">{pagination.total}</strong> total attendees
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadAttendees(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold px-2">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => loadAttendees(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Attendee Modal */}
      {editingAttendee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-heading font-bold text-lg text-slate-900">
                Edit Attendee Information
              </h3>
              <button
                onClick={() => setEditingAttendee(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Number</label>
                <input
                  type="text"
                  maxLength={10}
                  value={editFormData.mobile}
                  onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
                />
              </div>

              {/* Hierarchy */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Division</label>
                  <select
                    value={editFormData.division_id}
                    onChange={handleEditDivisionChange}
                    className="w-full px-2 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="">Select Division</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sector</label>
                  <select
                    value={editFormData.sector_id}
                    onChange={handleEditSectorChange}
                    className="w-full px-2 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="">Select Sector</option>
                    {editSectors.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit</label>
                  <select
                    value={editFormData.unit_id}
                    onChange={(e) => setEditFormData({ ...editFormData, unit_id: e.target.value })}
                    className="w-full px-2 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="">Select Unit</option>
                    {editUnits.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dars / Dawa College</label>
                <input
                  type="text"
                  value={editFormData.college}
                  onChange={(e) => setEditFormData({ ...editFormData, college: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Admission Status</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="Registered">Registered</option>
                  <option value="Admitted">Admitted</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAttendee(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-75"
                >
                  {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
