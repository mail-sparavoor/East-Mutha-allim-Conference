import React, { useState } from 'react';
import { 
  Users, 
  UserCheck, 
  Clock, 
  Percent, 
  Building, 
  GraduationCap, 
  MapPin, 
  Layers, 
  ChevronRight,
  TrendingUp,
  BarChart3,
  Loader2,
  Copy,
  Check
} from 'lucide-react';

export default function AnalyticsCharts({ analyticsData, onFilterByDivision }) {
  const [selectedHierarchyTab, setSelectedHierarchyTab] = useState('division'); // division | sector | unit | college
  const [copiedBreakdown, setCopiedBreakdown] = useState(false);

  if (!analyticsData) {
    return (
      <div className="py-16 text-center bg-white rounded-3xl border border-slate-200/90 shadow-sm p-8 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
        <p className="text-slate-500 font-medium text-sm">Loading conference analytics...</p>
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

    // Map each standard division with its count and original index
    const list = divisionsOrder.map((divName, idx) => {
      const targetKey = norm(divName);
      const found = byDiv.find((d) => norm(d.name) === targetKey);
      const count = found ? (Number(found.total_attendees) || 0) : 0;
      return {
        name: divName,
        count,
        originalIndex: idx
      };
    });

    // Also include any extra custom divisions if present
    const handledKeys = new Set(divisionsOrder.map(norm));
    const extraDivs = byDiv.filter(d => !handledKeys.has(norm(d.name)));
    extraDivs.forEach((extra, i) => {
      list.push({
        name: extra.name,
        count: Number(extra.total_attendees) || 0,
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
      '*Attendee Breakdown*',
      ''
    ];

    list.forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item.name}: ${item.count}`);
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
                  const pct = total > 0 ? Math.round((div.total_attendees / total) * 100) : 0;
                  const admittedPct = div.total_attendees > 0 
                    ? Math.round((div.admitted_count / div.total_attendees) * 100) 
                    : 0;

                  return (
                    <div 
                      key={div.id} 
                      className="p-4 rounded-2xl border border-slate-200/80 hover:border-emerald-300 transition bg-slate-50/50 hover:bg-white space-y-2"
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
                          <span className="font-bold text-sm text-slate-900">{div.total_attendees}</span>
                          <span className="text-xs text-slate-400 ml-1">({pct}%)</span>
                        </div>
                      </div>

                      {/* Percentage share bar */}
                      <div className="w-full bg-slate-200/70 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-emerald-600 h-2 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>Admitted: <strong className="text-emerald-700">{div.admitted_count}</strong></span>
                        <span>Admission Rate: <strong className="text-slate-700">{admittedPct}%</strong></span>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {breakdown.byCollege.map((col, idx) => {
                  const pct = total > 0 ? Math.round((col.total_attendees / total) * 100) : 0;
                  return (
                    <div 
                      key={idx} 
                      className="p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-emerald-300 transition space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <GraduationCap className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <span className="font-semibold text-xs text-slate-800 leading-snug">
                            {col.college}
                          </span>
                        </div>
                        <span className="font-bold text-xs text-slate-900 flex-shrink-0">
                          {col.total_attendees}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-amber-500 h-1.5 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Admitted: {col.admitted_count}</span>
                        <span>{pct}% of delegates</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
