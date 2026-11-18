import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  RefreshCw, 
  LogOut, 
  ArrowLeft,
  Menu,
  X,
  Shield,
  Lock,
  Unlock,
  Check,
  AlertCircle
} from 'lucide-react';
import AnalyticsCharts from './AnalyticsCharts';
import AttendeeTable from './AttendeeTable';
import RegistrationStatusModal from './RegistrationStatusModal';
import { api } from '../utils/api';

export default function SubAdminDashboard({
  adminUser,
  eventSettings,
  onSettingsUpdated,
  onLogout,
  onViewTicket,
  onBack
}) {
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'attendees'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(() => {
    try {
      const cached = sessionStorage.getItem('muthaallim_analytics_cache');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [analyticsError, setAnalyticsError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Registration Open/Closed Settings State
  const [settingsData, setSettingsData] = useState({
    registration_open: 'true',
    registration_closed_message: '',
    ...(eventSettings || {})
  });
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [togglingRegistration, setTogglingRegistration] = useState(false);
  const [regStatusFeedback, setRegStatusFeedback] = useState(null);

  const isRegistrationOpen =
    String(settingsData.registration_open ?? 'true').toLowerCase() !== 'false';

  const fetchSettings = async () => {
    try {
      const s = await api.getSettings();
      setSettingsData((prev) => ({ ...prev, ...s }));
      if (onSettingsUpdated) onSettingsUpdated(s);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const handleToggleRegistrationConfirm = async ({ nextOpen, closedMessage }) => {
    setTogglingRegistration(true);
    setRegStatusFeedback(null);
    try {
      const payload = {
        registration_open: nextOpen ? 'true' : 'false'
      };
      if (!nextOpen) {
        payload.registration_closed_message = closedMessage;
      }
      const res = await api.updateSettings(payload);
      const updated = res?.settings || { ...settingsData, ...payload };
      setSettingsData((prev) => ({ ...prev, ...updated }));
      if (onSettingsUpdated) onSettingsUpdated(updated);
      setRegModalOpen(false);
      setRegStatusFeedback({
        type: 'success',
        text: nextOpen
          ? 'Registration has been reopened. Delegates can now register online.'
          : 'Registration has been closed. New online registrations are now blocked.'
      });
      setTimeout(() => setRegStatusFeedback(null), 5000);
    } catch (err) {
      setRegStatusFeedback({
        type: 'error',
        text: err.message || 'Failed to update registration status.'
      });
    } finally {
      setTogglingRegistration(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setAnalyticsError(null);
      const data = await api.getAnalytics();
      setAnalyticsData(data);
      try {
        sessionStorage.setItem('muthaallim_analytics_cache', JSON.stringify(data));
      } catch {}
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setAnalyticsError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchSettings();
  }, []);

  const navItems = [
    {
      id: 'analytics',
      label: 'Overview & Analytics',
      icon: BarChart3,
      badge: null,
      description: 'Live statistics, regional distribution & WhatsApp breakdown'
    },
    {
      id: 'attendees',
      label: 'Attendee Directory',
      icon: Users,
      badge: analyticsData?.overview?.total_registrations || 0,
      description: 'Search delegates, toggle admission status & access passes'
    }
  ];

  const totalReg = analyticsData?.overview?.total_registrations || 0;
  const totalAdm = analyticsData?.overview?.total_admitted || 0;

  // Reusable Sidebar Inner Content
  const renderSidebarContent = () => (
    <div className="flex flex-col h-full justify-between">
      {/* Top Branding & Sub-Admin Profile */}
      <div>
        {/* Header Branding */}
        <div className="p-5 border-b border-slate-800">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30 mb-2">
            <Shield className="w-3.5 h-3.5 text-teal-400" />
            <span>Sub-Admin Portal</span>
          </div>
          <h1 className="text-base font-heading font-black tracking-tight text-white leading-tight">
            Muthaallim Conference
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Operations &amp; Attendee Desk
          </p>

          {/* User Badge */}
          <div className="mt-3.5 flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center font-bold text-xs uppercase">
                {adminUser?.username?.[0] || 'S'}
              </div>
              <div className="leading-tight">
                <span className="block text-xs font-bold text-slate-200 truncate max-w-[120px]">
                  {adminUser?.username || 'subadmin'}
                </span>
                <span className="text-[10px] text-teal-400 uppercase font-semibold">
                  Sub-Admin
                </span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </span>
          </div>
        </div>

        {/* Pulse stats in sidebar */}
        <div className="p-4 mx-3 my-3 rounded-2xl bg-slate-800/50 border border-slate-800/80 space-y-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Operations Pulse
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Registered</span>
              <span className="font-heading font-extrabold text-base text-white">{totalReg}</span>
            </div>
            <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-emerald-400 block">Admitted</span>
              <span className="font-heading font-extrabold text-base text-emerald-400">{totalAdm}</span>
            </div>
          </div>

          {/* Registration Open/Closed Status & Quick Action */}
          <div
            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
              isRegistrationOpen
                ? 'bg-emerald-950/50 border-emerald-800/60'
                : 'bg-rose-950/60 border-rose-800/60'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  isRegistrationOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              <div className="leading-tight truncate">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">
                  Registration
                </span>
                <span
                  className={`text-[11px] font-bold ${
                    isRegistrationOpen ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {isRegistrationOpen ? 'Open' : 'Closed'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setRegModalOpen(true);
              }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 flex-shrink-0 ${
                isRegistrationOpen
                  ? 'bg-rose-500/20 hover:bg-rose-500/35 text-rose-200 border border-rose-500/40'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-200 border border-emerald-500/40'
              }`}
              title={isRegistrationOpen ? 'Close Registration' : 'Reopen Registration'}
            >
              {isRegistrationOpen ? (
                <>
                  <Lock className="w-3 h-3" />
                  <span>Close</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3 h-3" />
                  <span>Reopen</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Navigation Items (Exclusively Overview & Analytics + Attendee Directory) */}
        <div className="px-3 py-2 space-y-1">
          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Desk Views
          </span>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer group ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30 font-extrabold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-teal-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && item.badge > 0 && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Actions & District Branding */}
      <div className="p-4 border-t border-slate-800/90 space-y-2">
        {onBack && (
          <button
            onClick={onBack}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/70 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Public Website</span>
          </button>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/70 transition cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-400' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold border border-rose-500/30 transition cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="pt-2 text-center">
          <span className="text-[10px] text-slate-400 font-medium block">
            &copy; SSF Malappuram East District
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row">
      {/* ================= DESKTOP FIXED SIDEBAR ================= */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 bg-slate-900 border-r border-slate-800 text-white z-30 shadow-2xl">
        {renderSidebarContent()}
      </aside>

      {/* ================= MOBILE TOP HEADER BAR (< lg) ================= */}
      <div className="lg:hidden bg-slate-900 text-white px-4 py-3 border-b border-slate-800 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition cursor-pointer"
            aria-label="Toggle Sub-Admin Navigation Sidebar"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-rose-400" /> : <Menu className="w-5 h-5 text-teal-400" />}
          </button>
          <div>
            <span className="text-xs font-heading font-black text-white block leading-tight">
              Sub-Admin Portal
            </span>
            <span className="text-[10px] text-teal-400 block font-semibold">
              {navItems.find(n => n.id === activeTab)?.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setRegModalOpen(true)}
            className={`px-2.5 py-2 rounded-xl text-[11px] font-bold border flex items-center gap-1 transition cursor-pointer ${
              isRegistrationOpen
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35 hover:bg-emerald-500/25'
                : 'bg-rose-500/20 text-rose-200 border-rose-500/40 hover:bg-rose-500/30'
            }`}
            title={isRegistrationOpen ? 'Registration Open — Tap to Close' : 'Registration Closed — Tap to Reopen'}
          >
            {isRegistrationOpen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{isRegistrationOpen ? 'Open' : 'Closed'}</span>
          </button>
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
              title="Public Website"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-400' : ''}`} />
          </button>
          <button
            onClick={onLogout}
            className="p-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ================= MOBILE SLIDE-OVER DRAWER ================= */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer container */}
          <div className="relative w-72 max-w-[80vw] bg-slate-900 border-r border-slate-800 text-white z-50 h-full shadow-2xl flex flex-col animate-slideRight">
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* ================= MAIN CONTENT AREA ================= */}
      <div className="lg:pl-72 flex-1 flex flex-col min-w-0">
        {/* Desktop Sticky Header Bar */}
        <header className="hidden lg:flex bg-white border-b border-slate-200/90 px-8 py-4 items-center justify-between sticky top-0 z-20 shadow-2xs">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200 mb-1">
              <Shield className="w-3 h-3 text-teal-600" />
              <span>Sub-Admin Workspace</span>
            </div>
            <h1 className="text-xl font-heading font-black text-slate-900 tracking-tight flex items-center gap-2">
              {activeTab === 'analytics' && <BarChart3 className="w-5 h-5 text-teal-600" />}
              {activeTab === 'attendees' && <Users className="w-5 h-5 text-teal-600" />}
              <span>{navItems.find(n => n.id === activeTab)?.label}</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {navItems.find(n => n.id === activeTab)?.description}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Registration Open/Closed Quick Toggle */}
            <button
              type="button"
              onClick={() => setRegModalOpen(true)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                isRegistrationOpen
                  ? 'bg-emerald-50 hover:bg-rose-50 text-emerald-800 hover:text-rose-700 border-emerald-200 hover:border-rose-200'
                  : 'bg-rose-50 hover:bg-emerald-50 text-rose-700 hover:text-emerald-800 border-rose-200 hover:border-emerald-200'
              }`}
              title={isRegistrationOpen ? 'Click to close online registration' : 'Click to reopen online registration'}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isRegistrationOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span>{isRegistrationOpen ? 'Registration Open' : 'Registration Closed'}</span>
              {isRegistrationOpen ? (
                <Lock className="w-3.5 h-3.5 opacity-70" />
              ) : (
                <Unlock className="w-3.5 h-3.5 opacity-70" />
              )}
            </button>

            {onBack && (
              <button
                onClick={onBack}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                title="Return to Public Conference Page"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Public Website</span>
              </button>
            )}

            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition shadow-2xs cursor-pointer"
              title="Refresh Live Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
            </button>

            <button
              onClick={onLogout}
              className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition flex items-center gap-1.5 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="p-3.5 sm:p-6 lg:p-8 space-y-6 flex-1">
          {regStatusFeedback && (
            <div
              className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 animate-fadeIn ${
                regStatusFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {regStatusFeedback.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                )}
                <span>{regStatusFeedback.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setRegStatusFeedback(null)}
                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {!isRegistrationOpen && (
            <div className="p-3.5 sm:px-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold block text-rose-950">Online Registration is Currently Closed</span>
                  <span className="text-rose-700">
                    New delegate sign-ups are paused. Already-registered attendees can still access their passes.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRegModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Reopen Registration</span>
              </button>
            </div>
          )}
          {activeTab === 'analytics' && (
            analyticsError ? (
              <div className="bg-white p-8 rounded-3xl border border-rose-200 text-center space-y-3">
                <p className="text-rose-600 font-semibold text-sm">{analyticsError}</p>
                <button 
                  onClick={fetchAnalytics}
                  className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition"
                >
                  Retry Loading Analytics
                </button>
              </div>
            ) : (
              <AnalyticsCharts
                analyticsData={analyticsData}
                onFilterByDivision={() => setActiveTab('attendees')}
              />
            )
          )}

          {activeTab === 'attendees' && (
            <AttendeeTable
              onViewTicket={onViewTicket}
              onDataChanged={fetchAnalytics}
            />
          )}
        </main>
      </div>

      {/* Registration Open/Close Confirmation Modal */}
      <RegistrationStatusModal
        isOpen={regModalOpen}
        currentlyOpen={isRegistrationOpen}
        initialClosedMessage={settingsData.registration_closed_message || ''}
        onClose={() => !togglingRegistration && setRegModalOpen(false)}
        onConfirm={handleToggleRegistrationConfirm}
        loading={togglingRegistration}
      />
    </div>
  );
}
