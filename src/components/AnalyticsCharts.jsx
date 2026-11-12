import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  Clock, 
  Percent, 
  Building, 
  MapPin, 
  Layers, 
  ChevronRight,
  TrendingUp,
  BarChart3,
  Loader2,
  Copy,
  Check,
  X,
  Search,
  Filter,
  Link2,
  Edit2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import CollegeProgressCard from './CollegeProgressCard';
import { api, normalizeSlug } from '../utils/api';

export default function AnalyticsCharts({
  analyticsData,
  onFilterByDivision,
  canCustomizeSlug = false,
  onDivisionUpdated
}) {
  const [selectedHierarchyTab, setSelectedHierarchyTab] = useState('division'); // division | sector | unit | college
  const [copiedBreakdown, setCopiedBreakdown] = useState(false);
  const [copiedDivisionSlug, setCopiedDivisionSlug] = useState(false);
  const [selectedDivisionModal, setSelectedDivisionModal] = useState(null);
  const [editingModalSlug, setEditingModalSlug] = useState(false);
  const [customSlugInput, setCustomSlugInput] = useState('');
  const [savingModalSlug, setSavingModalSlug] = useState(false);
  const [modalSlugError, setModalSlugError] = useState('');
  const [modalSearch, setModalSearch] = useState('');
  const [modalRegFilter, setModalRegFilter] = useState('all'); // all | registered | zero
  const [selectedCollegeDivisionFilter, setSelectedCollegeDivisionFilter] = useState('all');
  const [collegeSearch, setCollegeSearch] = useState('');

  useEffect(() => {
    if (!selectedDivisionModal) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedDivisionModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDivisionModal]);

  if (!analyticsData) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 bg-slate-200 rounded" />
                <div className="w-8 h-8 rounded-xl bg-slate-100" />
              </div>
              <div className="h-7 w-16 bg-slate-200 rounded" />
              <div className="h-3 w-28 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
          <div className="h-4 w-40 bg-slate-200 rounded" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-slate-50 rounded-xl border border-slate-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const overview = analyticsData?.overview || {
    total_registrations: 0,
    total_admitted: 0,
    pending_admissions: 0,
    admission_rate: 0
  };
  const breakdown = analyticsData?.breakdown || {
    byDivision: [],
    bySector: [],
    byUnit: [],
    byCollege: []
  };
  const total = overview.total_registrations || 0;
  const allColleges = breakdown.byCollege || [];

  const filteredColleges = allColleges.filter((col) => {
    const matchesDivision =
      selectedCollegeDivisionFilter === 'all' ||
      String(col.division_id) === String(selectedCollegeDivisionFilter);
    const q = collegeSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (col.college || '').toLowerCase().includes(q) ||
      (col.division_name || '').toLowerCase().includes(q);
    return matchesDivision && matchesSearch;
  });

  const openDivisionModal = (div) => {
    setSelectedDivisionModal(div);
    setModalSearch('');
    setModalRegFilter('all');
    setCopiedDivisionSlug(false);
    setEditingModalSlug(false);
    setCustomSlugInput(div?.slug || '');
    setModalSlugError('');
  };

  const handleSaveModalSlug = async (e) => {
    e.preventDefault();
    if (!selectedDivisionModal?.id) return;
    const normalized = normalizeSlug(customSlugInput);
    if (!normalized || normalized.length < 3) {
      setModalSlugError('Slug must be at least 3 letters or numbers (a-z, 0-9, -).');
      return;
    }
    setSavingModalSlug(true);
    setModalSlugError('');
    try {
      const res = await api.updateDivisionSlug(selectedDivisionModal.id, normalized);
      const updatedSlug = res?.slug || normalized;
      setSelectedDivisionModal((prev) => (prev ? { ...prev, slug: updatedSlug } : null));
      setCustomSlugInput(updatedSlug);
      setEditingModalSlug(false);
      if (onDivisionUpdated) onDivisionUpdated();
    } catch (err) {
      setModalSlugError(err.message || 'Failed to update custom slug');
    } finally {
      setSavingModalSlug(false);
    }
  };

  const handleRegenerateModalSlug = async () => {
    if (!selectedDivisionModal?.id) return;
    setSavingModalSlug(true);
    setModalSlugError('');
    try {
      const res = await api.regenerateDivisionSlug(selectedDivisionModal.id);
      if (res?.slug) {
        setSelectedDivisionModal((prev) => (prev ? { ...prev, slug: res.slug } : null));
        setCustomSlugInput(res.slug);
        setEditingModalSlug(false);
        if (onDivisionUpdated) onDivisionUpdated();
      }
    } catch (err) {
      setModalSlugError(err.message || 'Failed to regenerate share link');
    } finally {
      setSavingModalSlug(false);
    }
  };

  const handleCopyDivisionShareLink = (slug) => {
    if (!slug) return;
    const shareUrl = `${window.location.origin}/division/${slug}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedDivisionSlug(true);
    setTimeout(() => setCopiedDivisionSlug(false), 2500);
  };

  // Generate WhatsApp formatted text: Highest Count First by default
  const generateWhatsAppBreakdown = () => {
    const divisionsOrder = [
      'Pulikkal',
      'Areekode',
      'Kondoty',
      'Wandoor',
      'Manjeri West',
      'Manjeri East',
      'Nilambur',
      'Malappuram',
      'Edavannappra',
      'Edakkara',
      'Kolathur',
      'Perinthalmanna'
    ];

    const norm = (s) => (s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/t+/g, 't');

    const byDiv = breakdown?.byDivision || [];

    // Map each standard division with its count, allocated quota, and percentage
    const list = divisionsOrder.map((divName, idx) => {
      const targetKey = norm(divName);
      const found = byDiv.find((d) => norm(d.name) === targetKey);
      const count = found ? (Number(found.total_attendees) || 0) : 0;
      const quota = found ? (Number(found.allocated_quota) || 0) : 0;
      const pct = quota > 0 ? Math.round((count / quota) * 100) : 0;
      return {
        name: divName,
        count,
        quota,
        pct,
        originalIndex: idx
      };
    });

    // Also include any extra custom divisions if present
    const handledKeys = new Set(divisionsOrder.map(norm));
    const extraDivs = byDiv.filter(d => !handledKeys.has(norm(d.name)));
    extraDivs.forEach((extra, i) => {
      const count = Number(extra.total_attendees) || 0;
      const quota = Number(extra.allocated_quota) || 0;
      const pct = quota > 0 ? Math.round((count / quota) * 100) : 0;
      list.push({
        name: extra.name,
        count,
        quota,
        pct,
        originalIndex: divisionsOrder.length + i
      });
    });

    // Highest Count First (descending order)
    list.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.originalIndex - b.originalIndex;
    });

    const lines = [
      'Malappuram East District',
      "Mutha'allim Conference",
      '',
      '*Attendee Breakdown (Quota & Progress)*',
      ''
    ];

    list.forEach((item, idx) => {
      if (item.quota > 0) {
        lines.push(`${idx + 1}. ${item.name}: ${item.count}/${item.quota} (${item.pct}%)`);
      } else {
        lines.push(`${idx + 1}. ${item.name}: ${item.count}`);
      }
    });

    lines.push('');
    lines.push('©️ SSF Malappuram East District');

    return lines.join('\n');
  };

  const handleShareWhatsApp = () => {
    const text = generateWhatsAppBreakdown();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopyBreakdown = async () => {
    try {
      const text = generateWhatsAppBreakdown();
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedBreakdown(true);
      setTimeout(() => setCopiedBreakdown(false), 2500);
    } catch (e) {
      console.error('Failed to copy breakdown:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Registrations */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Registrations
            </span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-3xl font-heading font-black text-slate-900 tracking-tight">
              {overview.total_registrations}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Delegates</span>
          </div>
          <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-slate-500 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 flex-shrink-0" />
            <span className="truncate">Across all units</span>
          </div>
        </div>

        {/* Total Admitted / Checked-in */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-3.5 sm:p-5 rounded-2xl text-white shadow-lg shadow-emerald-600/20 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-100">
              Total Check-Ins
            </span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/40 text-emerald-100 flex items-center justify-center backdrop-blur-sm">
              <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-3xl font-heading font-black text-white tracking-tight">
              {overview.total_admitted}
            </span>
            <span className="text-[10px] sm:text-xs text-emerald-100 font-medium">Admitted</span>
          </div>
          <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-emerald-100/90 flex items-center gap-1">
            <span className="truncate">Verified at gates</span>
          </div>
        </div>

        {/* Pending Check-ins */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
              Pending Admission
            </span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-3xl font-heading font-black text-amber-600 tracking-tight">
              {overview.pending_admissions}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Pending</span>
          </div>
          <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-slate-500">
            <span className="truncate">Awaiting arrival</span>
          </div>
        </div>

        {/* Attendance Percentage */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
              Attendance Rate
            </span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Percent className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-3xl font-heading font-black text-teal-700 tracking-tight">
              {overview.admission_rate}%
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 sm:h-2 mt-2 sm:mt-3 overflow-hidden">
            <div 
              className="bg-emerald-500 h-1.5 sm:h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, overview.admission_rate)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Breakdown Analytics Card with Sub-tabs */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-heading font-bold text-base sm:text-lg text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              <span>Attendee Breakdown & Distribution</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live statistics categorized by geographical hierarchy and educational background
            </p>
          </div>

          {/* Action buttons & Sub-tab pills */}
          <div className="flex flex-wrap items-center gap-2">
            {/* WhatsApp Share Button */}
            <button
              onClick={handleShareWhatsApp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
              title="Share Attendee Breakdown via WhatsApp (Highest Count First)"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
              <span>Share via WhatsApp</span>
            </button>

            {/* Copy Breakdown Button */}
            <button
              onClick={handleCopyBreakdown}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition active:scale-95 cursor-pointer"
              title="Copy Breakdown Text"
            >
              {copiedBreakdown ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {/* Sub-tab pills */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setSelectedHierarchyTab('division')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  selectedHierarchyTab === 'division'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                By Division
              </button>
              {breakdown.bySector && breakdown.bySector.length > 0 && (
                <button
                  onClick={() => setSelectedHierarchyTab('sector')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    selectedHierarchyTab === 'sector'
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  By Sector
                </button>
              )}
              {breakdown.byUnit && breakdown.byUnit.length > 0 && (
                <button
                  onClick={() => setSelectedHierarchyTab('unit')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    selectedHierarchyTab === 'unit'
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  By Unit
                </button>
              )}
              <button
                onClick={() => setSelectedHierarchyTab('college')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  selectedHierarchyTab === 'college'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                By Dars / College
              </button>
            </div>
          </div>
        </div>

        <div className="p-3.5 sm:p-6">
          {/* DIVISION BREAKDOWN */}
          {selectedHierarchyTab === 'division' && (
            <div className="space-y-4">
              {/* WhatsApp Share Banner */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-emerald-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                  <span className="font-semibold">
                    Live 12-Division breakdown formatted for WhatsApp broadcast
                    <span className="ml-1 text-emerald-800 font-bold">
                      (Highest Count First).
                    </span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                  <button
                    onClick={handleShareWhatsApp}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                    </svg>
                    <span>WhatsApp</span>
                  </button>
                  <button
                    onClick={handleCopyBreakdown}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-emerald-300 transition active:scale-95 cursor-pointer shadow-2xs"
                  >
                    {copiedBreakdown ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy Text</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {breakdown.byDivision.map((div) => {
                  const quota = Number(div.allocated_quota) || 0;
                  const pct = quota > 0 
                    ? Math.round((div.total_attendees / quota) * 100) 
                    : 0;
                  const admittedPct = div.total_attendees > 0 
                    ? Math.round((div.admitted_count / div.total_attendees) * 100) 
                    : 0;
                  const divInstitutionsCount = allColleges.filter(
                    (c) => String(c.division_id) === String(div.id)
                  ).length;

                  return (
                    <div 
                      key={div.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openDivisionModal(div)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openDivisionModal(div);
                        }
                      }}
                      title={`Click to view Dars / Colleges in ${div.name}`}
                      className="p-4 rounded-2xl border border-slate-200/80 hover:border-emerald-400 hover:shadow-md transition bg-slate-50/50 hover:bg-white space-y-2 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-emerald-600" />
                          <span className="font-heading font-bold text-sm text-slate-800">
                            {div.name}
                          </span>
                          {div.code && (
                            <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                              {div.code}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-sm text-slate-900">
                            {div.total_attendees}{quota > 0 ? ` / ${quota}` : ''}
                          </span>
                          <span className="text-xs text-emerald-700 font-bold ml-1.5">
                            ({pct}%)
                          </span>
                        </div>
                      </div>

                      {/* Quota progress bar */}
                      <div className="w-full bg-slate-200/70 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] text-slate-500 pt-1">
                        <span>
                          Quota: <strong className="text-slate-800">{quota > 0 ? `${quota} seats` : 'Not set'}</strong>
                          {quota > 0 && (
                            <span className="ml-1 text-slate-400">({Math.max(0, quota - div.total_attendees)} left)</span>
                          )}
                        </span>
                        <div className="flex items-center gap-3">
                          <span>
                            Admitted: <strong className="text-emerald-700">{div.admitted_count}</strong> ({admittedPct}%)
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-emerald-700 font-semibold group-hover:translate-x-0.5 transition-transform">
                            {divInstitutionsCount} Dars / Colleges
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTOR BREAKDOWN */}
          {selectedHierarchyTab === 'sector' && (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-2.5">Sector</th>
                      <th className="py-2.5">Parent Division</th>
                      <th className="py-2.5">Registered</th>
                      <th className="py-2.5">Admitted</th>
                      <th className="py-2.5">Admission Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {breakdown.bySector.map((sec) => {
                      const admRate = sec.total_attendees > 0 
                        ? Math.round((sec.admitted_count / sec.total_attendees) * 100) 
                        : 0;
                      return (
                        <tr key={sec.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 font-bold text-slate-800">{sec.name}</td>
                          <td className="py-3 text-slate-500">{sec.division_name}</td>
                          <td className="py-3 font-semibold text-slate-900">{sec.total_attendees}</td>
                          <td className="py-3 font-bold text-emerald-600">{sec.admitted_count}</td>
                          <td className="py-3">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {admRate}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* UNIT BREAKDOWN */}
          {selectedHierarchyTab === 'unit' && (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-2.5">Unit Name</th>
                      <th className="py-2.5">Sector &amp; Division</th>
                      <th className="py-2.5">Registered</th>
                      <th className="py-2.5">Admitted</th>
                      <th className="py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {breakdown.byUnit.map((unit) => (
                      <tr key={unit.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 font-bold text-emerald-800">{unit.name}</td>
                        <td className="py-3 text-slate-500">
                          {unit.sector_name} &bull; {unit.division_name}
                        </td>
                        <td className="py-3 font-semibold text-slate-900">{unit.total_attendees}</td>
                        <td className="py-3 font-bold text-emerald-600">{unit.admitted_count}</td>
                        <td className="py-3">
                          {unit.total_attendees > 0 ? (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              Active
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">0 delegates</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DARS / DAWA COLLEGE BREAKDOWN */}
          {selectedHierarchyTab === 'college' && (
            <div className="space-y-4">
              {/* Division Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
                  <div className="relative sm:w-56">
                    <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={selectedCollegeDivisionFilter}
                      onChange={(e) => setSelectedCollegeDivisionFilter(e.target.value)}
                      aria-label="Filter Dars / College by Division"
                      className="w-full pl-8 pr-7 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    >
                      <option value="all">All Divisions ({allColleges.length})</option>
                      {(breakdown.byDivision || []).map((div) => {
                        const divInstCount = allColleges.filter(
                          (c) => String(c.division_id) === String(div.id)
                        ).length;
                        return (
                          <option key={div.id} value={String(div.id)}>
                            {div.name} ({divInstCount})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="relative flex-1 max-w-md">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={collegeSearch}
                      onChange={(e) => setCollegeSearch(e.target.value)}
                      placeholder="Search Dars / College name..."
                      className="w-full pl-8 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    />
                    {collegeSearch && (
                      <button
                        type="button"
                        onClick={() => setCollegeSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 text-[11px] text-slate-500 font-medium">
                  <span>
                    Showing <strong className="text-slate-800">{filteredColleges.length}</strong> of {allColleges.length}
                  </span>
                  {(selectedCollegeDivisionFilter !== 'all' || collegeSearch) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCollegeDivisionFilter('all');
                        setCollegeSearch('');
                      }}
                      className="text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {filteredColleges.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-500 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                  No Dars / Colleges match the current filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredColleges.map((col, idx) => (
                    <CollegeProgressCard
                      key={col.institution_id || `${col.college}-${idx}`}
                      col={col}
                      showDivisionName={true}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* DIVISION DARS / COLLEGE POP-UP MODAL */}
      {selectedDivisionModal && (() => {
        const divColleges = allColleges.filter(
          (c) => String(c.division_id) === String(selectedDivisionModal.id)
        );
        const activeCount = divColleges.filter((c) => Number(c.total_attendees) > 0).length;
        const zeroCount = divColleges.length - activeCount;
        const mq = modalSearch.trim().toLowerCase();
        const modalFiltered = divColleges.filter((c) => {
          const matchesQuery = !mq || (c.college || '').toLowerCase().includes(mq);
          const count = Number(c.total_attendees) || 0;
          const matchesReg =
            modalRegFilter === 'all' ||
            (modalRegFilter === 'registered' && count > 0) ||
            (modalRegFilter === 'zero' && count === 0);
          return matchesQuery && matchesReg;
        });
        const divQuota = Number(selectedDivisionModal.allocated_quota) || 0;
        const divPct = divQuota > 0
          ? Math.round((selectedDivisionModal.total_attendees / divQuota) * 100)
          : 0;

        return (
          <div
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
            onClick={() => setSelectedDivisionModal(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="division-modal-title"
          >
            <div
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50/80 via-white to-white space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                      <Building className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 id="division-modal-title" className="font-heading font-bold text-base text-slate-900 truncate">
                          {selectedDivisionModal.name}
                        </h4>
                        {selectedDivisionModal.code && (
                          <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                            {selectedDivisionModal.code}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        Dars / College Breakdown &bull; {divColleges.length} Institutions
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <span className="font-bold text-sm text-slate-900">
                        {selectedDivisionModal.total_attendees}{divQuota > 0 ? ` / ${divQuota}` : ''}
                      </span>
                      <span className="text-xs font-bold text-emerald-700 ml-1">
                        ({divPct}%)
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        Admitted: {selectedDivisionModal.admitted_count}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedDivisionModal(null)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                      aria-label="Close modal"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Division Quota Progress Bar */}
                <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, divPct)}%` }}
                  />
                </div>

                {/* Private Division Share Link & Custom Slug Bar */}
                {selectedDivisionModal.slug && (
                  <div className="pt-1">
                    {!editingModalSlug ? (
                      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/90 border border-emerald-200/80 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <Link2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                          <span className="font-mono text-[11px] text-slate-700 truncate">
                            /division/{selectedDivisionModal.slug}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyDivisionShareLink(selectedDivisionModal.slug)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[11px] font-bold transition cursor-pointer"
                          >
                            {copiedDivisionSlug ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>
                          <a
                            href={`/division/${selectedDivisionModal.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition"
                            title="Open Division Breakdown in New Tab"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Open</span>
                          </a>
                          {canCustomizeSlug && (
                            <button
                              type="button"
                              onClick={() => {
                                setCustomSlugInput(selectedDivisionModal.slug || '');
                                setModalSlugError('');
                                setEditingModalSlug(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold transition cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Customize Slug</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleSaveModalSlug} className="p-2.5 rounded-xl bg-white border border-emerald-300 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="flex items-center flex-1 rounded-lg border border-slate-300 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 overflow-hidden bg-slate-50">
                            <span className="px-2 py-1.5 text-[11px] font-mono text-slate-400 border-r border-slate-200 select-none">
                              /division/
                            </span>
                            <input
                              type="text"
                              value={customSlugInput}
                              onChange={(e) => {
                                setCustomSlugInput(e.target.value);
                                if (modalSlugError) setModalSlugError('');
                              }}
                              placeholder="e.g. pulikkal-2026"
                              className="w-full px-2 py-1.5 bg-white font-mono text-xs text-slate-800 focus:outline-none"
                              autoFocus
                            />
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              type="submit"
                              disabled={savingModalSlug}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition cursor-pointer disabled:opacity-60"
                            >
                              {savingModalSlug ? 'Saving...' : 'Save Slug'}
                            </button>
                            <button
                              type="button"
                              onClick={handleRegenerateModalSlug}
                              disabled={savingModalSlug}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[11px] font-bold transition cursor-pointer disabled:opacity-60"
                              title="Generate a new random secure slug"
                            >
                              <RefreshCw className={`w-3 h-3 ${savingModalSlug ? 'animate-spin' : ''}`} />
                              <span>Random Key</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingModalSlug(false);
                                setModalSlugError('');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                          <span className="text-slate-500 font-mono truncate">
                            Preview: {window.location.origin}/division/{normalizeSlug(customSlugInput) || '...'}
                          </span>
                          {modalSlugError && (
                            <span className="text-rose-600 font-semibold">{modalSlugError}</span>
                          )}
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Search & Status Filters */}
              <div className="px-4 sm:px-6 py-3 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    placeholder={`Search institutions in ${selectedDivisionModal.name}...`}
                    className="w-full pl-8 pr-8 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                  {modalSearch && (
                    <button
                      type="button"
                      onClick={() => setModalSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-xl text-[11px] font-semibold">
                  {[
                    { id: 'all', label: `All (${divColleges.length})` },
                    { id: 'registered', label: `Active (${activeCount})` },
                    { id: 'zero', label: `0 Reg (${zeroCount})` }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setModalRegFilter(tab.id)}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        modalRegFilter === tab.id
                          ? 'bg-white text-emerald-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                {modalFiltered.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    No institutions found matching your filter in {selectedDivisionModal.name}.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {modalFiltered.map((col, idx) => (
                      <CollegeProgressCard
                        key={col.institution_id || `${col.college}-${idx}`}
                        col={col}
                        showDivisionName={false}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-4 sm:px-6 py-3 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">
                  Showing <strong className="text-slate-800">{modalFiltered.length}</strong> of {divColleges.length} in {selectedDivisionModal.name}
                  <span className="sm:hidden ml-2">
                    &bull; Total: <strong>{selectedDivisionModal.total_attendees}{divQuota > 0 ? `/${divQuota}` : ''}</strong> ({divPct}%)
                  </span>
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedDivisionModal.slug && (
                    <button
                      type="button"
                      onClick={() => handleCopyDivisionShareLink(selectedDivisionModal.slug)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition cursor-pointer"
                      title={`Copy private link (/division/${selectedDivisionModal.slug})`}
                    >
                      {copiedDivisionSlug ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Link Copied!</span>
                        </>
                      ) : (
                        <>
                          <Link2 className="w-3.5 h-3.5" />
                          <span>Copy Share Link</span>
                        </>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCollegeDivisionFilter(String(selectedDivisionModal.id));
                      setCollegeSearch('');
                      setSelectedHierarchyTab('college');
                      setSelectedDivisionModal(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition cursor-pointer"
                  >
                    Open in Dars / College Tab
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDivisionModal(null)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
