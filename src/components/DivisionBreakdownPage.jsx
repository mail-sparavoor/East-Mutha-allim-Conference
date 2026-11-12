import React, { useState, useEffect, useCallback } from 'react';
import {
  Building,
  Users,
  UserCheck,
  Clock,
  Percent,
  RefreshCw,
  Search,
  Copy,
  Check,
  AlertCircle,
  ArrowLeft,
  X
} from 'lucide-react';
import CollegeProgressCard from './CollegeProgressCard';
import { api } from '../utils/api';

export default function DivisionBreakdownPage({ slug, eventSettings, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | registered | zero | full
  const [copiedSummary, setCopiedSummary] = useState(false);

  const loadDivisionBreakdown = useCallback(
    async (isManualRefresh = false) => {
      if (!slug) {
        setError('Invalid division breakdown link.');
        setLoading(false);
        return;
      }
      try {
        if (isManualRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);
        const result = await api.getDivisionBreakdownBySlug(slug);
        setData(result);
      } catch (err) {
        setError(err.message || 'Division breakdown not found or link expired.');
        setData(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [slug]
  );

  useEffect(() => {
    loadDivisionBreakdown(false);
  }, [loadDivisionBreakdown]);

  const division = data?.division;
  const overview = data?.overview || {
    total_attendees: 0,
    admitted_count: 0,
    pending_count: 0,
    allocated_quota: 0,
    remaining_quota: 0,
    quota_percentage: 0,
    admission_rate: 0,
    total_institutions: 0,
    active_institutions: 0
  };
  const byCollege = data?.byCollege || [];

  const generateWhatsAppSummary = () => {
    if (!division) return '';
    const quotaText =
      overview.allocated_quota > 0
        ? `${overview.total_attendees}/${overview.allocated_quota} (${overview.quota_percentage}%)`
        : `${overview.total_attendees}`;
    let text = `*${division.name} Division — Delegate Breakdown*\n`;
    text += `_*Muthaallim Conference 2026*_\n\n`;
    text += `*Total Registered:* ${quotaText}\n`;
    text += `*Admitted:* ${overview.admitted_count}\n`;
    text += `*Active Dars / Colleges:* ${overview.active_institutions} / ${overview.total_institutions}\n\n`;
    text += `*Dars / College Breakdown:*\n`;

    byCollege.forEach((col, i) => {
      const q = Number(col.allocated_quota) || 0;
      const c = Number(col.total_attendees) || 0;
      const pct = q > 0 ? Math.round((c / q) * 100) : 0;
      const qStr = q > 0 ? `${c}/${q} (${pct}%)` : `${c}`;
      text += `${i + 1}. ${col.college} — *${qStr}*\n`;
    });
    return text.trim();
  };

  const handleShareWhatsApp = () => {
    const text = generateWhatsAppSummary();
    if (!text) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopySummary = () => {
    const text = generateWhatsAppSummary();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-pulse">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
          <div className="h-5 w-48 bg-slate-200 rounded" />
          <div className="h-8 w-72 bg-slate-200 rounded" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 h-28" />
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !division) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-heading font-bold text-slate-900">
            Division Link Not Found
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            {error || 'This division breakdown link is invalid or has been updated.'}
          </p>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go to Registration Portal</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const activeCount = byCollege.filter((c) => Number(c.total_attendees) > 0).length;
  const zeroCount = byCollege.filter((c) => Number(c.total_attendees) === 0).length;
  const fullCount = byCollege.filter(
    (c) => Number(c.allocated_quota) > 0 && Number(c.total_attendees) >= Number(c.allocated_quota)
  ).length;

  const qLower = searchTerm.trim().toLowerCase();
  const filteredColleges = byCollege.filter((col) => {
    const matchesSearch = !qLower || (col.college || '').toLowerCase().includes(qLower);
    const count = Number(col.total_attendees) || 0;
    const quota = Number(col.allocated_quota) || 0;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'registered' && count > 0) ||
      (statusFilter === 'zero' && count === 0) ||
      (statusFilter === 'full' && quota > 0 && count >= quota);
    return matchesSearch && matchesStatus;
  });

  const statCards = [
    {
      label: 'Total Registered',
      value:
        overview.allocated_quota > 0
          ? `${overview.total_attendees} / ${overview.allocated_quota}`
          : overview.total_attendees,
      icon: Users,
      accent: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      sub:
        overview.allocated_quota > 0
          ? `${overview.remaining_quota} seats remaining`
          : 'Allocated quota not set'
    },
    {
      label: 'Quota Completion',
      value: `${overview.quota_percentage}%`,
      icon: Percent,
      accent: 'text-teal-600 bg-teal-50 border-teal-200',
      sub: `${overview.active_institutions} of ${overview.total_institutions} institutions active`
    },
    {
      label: 'Admitted',
      value: overview.admitted_count,
      icon: UserCheck,
      accent: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      sub: `${overview.admission_rate}% admission rate`
    },
    {
      label: 'Pending Check-In',
      value: overview.pending_count,
      icon: Clock,
      accent: 'text-amber-600 bg-amber-50 border-amber-200',
      sub: 'Registered delegates awaiting gate admission'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-3.5 sm:px-6 py-5 sm:py-8 space-y-6">
      {/* Top Division Header */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-5 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 text-[11px] font-semibold">
              <Building className="w-3.5 h-3.5 text-amber-300" />
              <span>Division Attendee Breakdown</span>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight">
                {division.name} Division
              </h1>
              {division.code && (
                <span className="text-xs font-mono bg-white/15 px-2 py-0.5 rounded-lg border border-white/20">
                  {division.code}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-emerald-100/90">
              {eventSettings?.event_subtitle || 'Malappuram East District Muthaallim Conference'}
              {eventSettings?.event_date ? ` • ${eventSettings.event_date}` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => loadDivisionBreakdown(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-bold transition cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Registration Portal</span>
              </button>
            )}
          </div>
        </div>

        {/* Overall Quota Progress Bar */}
        <div className="px-4 sm:px-6 py-4 bg-slate-50/70 border-t border-slate-100 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-700">
              Overall Division Quota Progress
            </span>
            <span className="font-bold text-slate-900">
              {overview.total_attendees}
              {overview.allocated_quota > 0 ? ` / ${overview.allocated_quota} seats` : ' registered'}
              {overview.allocated_quota > 0 && (
                <span className="text-emerald-700 ml-1.5">({overview.quota_percentage}%)</span>
              )}
            </span>
          </div>
          <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, overview.quota_percentage)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between gap-2 sm:gap-3"
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                  {card.label}
                </span>
                <div className={`p-1.5 sm:p-2 rounded-xl border ${card.accent}`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
                  {card.value}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5">
                  {card.sub}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dars / College Breakdown Section */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="font-heading font-bold text-base sm:text-lg text-slate-900">
              Dars / College Breakdown ({division.name})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live registration counts &amp; quota utilization for institutions in {division.name}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
            >
              <span>Share via WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition active:scale-95 cursor-pointer"
            >
              {copiedSummary ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Summary</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Search & Status Filters */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search Dars / College in ${division.name}...`}
              className="w-full pl-8 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1 bg-slate-200/70 p-0.5 rounded-xl text-[11px] font-semibold">
            {[
              { id: 'all', label: `All (${byCollege.length})` },
              { id: 'registered', label: `Active (${activeCount})` },
              { id: 'zero', label: `0 Reg (${zeroCount})` },
              { id: 'full', label: `Full (${fullCount})` }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Institutions Grid */}
        <div className="p-4 sm:p-6">
          {filteredColleges.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
              No institutions match your current filter in {division.name}.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredColleges.map((col, idx) => (
                <CollegeProgressCard
                  key={col.institution_id || `${col.college}-${idx}`}
                  col={col}
                  showDivisionName={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
