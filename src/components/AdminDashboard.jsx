import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  FolderTree, 
  Settings, 
  RefreshCw, 
  LogOut, 
  ShieldCheck, 
  Save, 
  Check, 
  Sparkles, 
  Lock, 
  Unlock,
  ArrowLeft,
  Menu,
  X,
  ChevronRight,
  TrendingUp,
  UserCheck,
  ExternalLink,
  Shield,
  AlertCircle,
  Zap
} from 'lucide-react';
import AnalyticsCharts from './AnalyticsCharts';
import AttendeeTable from './AttendeeTable';
import HierarchyManager from './HierarchyManager';
import RegistrationStatusModal from './RegistrationStatusModal';
import { api } from '../utils/api';

export default function AdminDashboard({
  adminUser,
  eventSettings,
  onSettingsUpdated,
  onLogout,
  onViewTicket,
  onBack,
  onSwitchToSubAdmin
}) {
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'attendees' | 'hierarchy' | 'settings'
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

  // Settings form state
  const [settingsData, setSettingsData] = useState({
    event_title: '',
    event_subtitle: '',
    event_date: '',
    event_venue: '',
    registration_open: 'true',
    registration_closed_message: '',
    spot_registration_open: 'true',
    spot_registration_closed_message: '',
    contact_phone: '',
    contact_email: '',
    ...(eventSettings || {})
  });
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [regModalConfig, setRegModalConfig] = useState({
    isOpen: false,
    targetType: 'normal' // 'normal' | 'spot'
  });
  const [togglingRegistration, setTogglingRegistration] = useState(false);
  const [regStatusFeedback, setRegStatusFeedback] = useState(null); // { type: 'success' | 'error', text: string }

  const isRegistrationOpen =
    String(settingsData.registration_open ?? 'true').toLowerCase() !== 'false';
  const isSpotRegistrationOpen =
    String(settingsData.spot_registration_open ?? 'true').toLowerCase() !== 'false';

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

  const fetchSettings = async () => {
    try {
      const s = await api.getSettings();
      setSettingsData((prev) => ({ ...prev, ...s }));
      if (onSettingsUpdated) onSettingsUpdated(s);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e?.preventDefault?.();
    setSavingSettings(true);
    setSettingsSaved(false);
    try {
      const res = await api.updateSettings(settingsData);
      const updated = res?.settings || settingsData;
      setSettingsData((prev) => ({ ...prev, ...updated }));
      if (onSettingsUpdated) onSettingsUpdated(updated);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (err) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleRegistrationConfirm = async ({ type, nextOpen, closedMessage }) => {
    setTogglingRegistration(true);
    setRegStatusFeedback(null);
    try {
      const isSpot = type === 'spot';
      const keyOpen = isSpot ? 'spot_registration_open' : 'registration_open';
      const keyMsg = isSpot ? 'spot_registration_closed_message' : 'registration_closed_message';

      const payload = {
        [keyOpen]: nextOpen ? 'true' : 'false'
      };
      if (!nextOpen) {
        payload[keyMsg] = closedMessage;
      }
      const res = await api.updateSettings(payload);
      const updated = res?.settings || { ...settingsData, ...payload };
      setSettingsData((prev) => ({ ...prev, ...updated }));
      if (onSettingsUpdated) onSettingsUpdated(updated);
      setRegModalConfig((prev) => ({ ...prev, isOpen: false }));
      setRegStatusFeedback({
        type: 'success',
        text: isSpot
          ? (nextOpen
              ? 'Spot Registration has been reopened. On-site candidates can now register.'
              : 'Spot Registration has been closed. On-site candidate submissions are now paused.')
          : (nextOpen
              ? 'Normal Registration has been reopened. Delegates can now register online.'
              : 'Normal Registration has been closed. New online registrations are now paused.')
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

  const navItems = [
    {
      id: 'analytics',
      label: 'Overview & Analytics',
      icon: BarChart3,
      badge: null,
      description: 'Live statistics & division breakdown'
    },
    {
      id: 'attendees',
      label: 'Normal Registrations',
      icon: Users,
      badge: analyticsData?.overview?.total_normal_registrations ?? analyticsData?.overview?.total_registrations ?? 0,
      description: 'Online registered candidates & passes'
    },
    {
      id: 'spot-attendees',
      label: 'Spot Registrations',
      icon: Zap,
      badge: analyticsData?.overview?.total_spot_registrations ?? 0,
      description: 'On-site spot admissions & passes'
    },
    {
      id: 'hierarchy',
      label: 'Hierarchy Management',
      icon: FolderTree,
      badge: null,
      description: 'Divisions, sectors & units'
    },
    {
      id: 'settings',
      label: 'Event Settings',
      icon: Settings,
      badge: null,
      description: 'Dates, venue & admin config'
    }
  ];

  const totalReg = analyticsData?.overview?.total_registrations || 0;
  const totalAdm = analyticsData?.overview?.total_admitted || 0;
  const admRate = analyticsData?.overview?.admission_rate || 0;

  // Reusable Sidebar Inner Content
  const renderSidebarContent = () => (
    <div className="flex flex-col h-full justify-between">
      {/* Top Branding & Admin Profile */}
      <div>
        {/* Header Branding */}
        <div className="p-5 border-b border-slate-800">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Administrative Console</span>
          </div>
          <h1 className="text-base font-heading font-black tracking-tight text-white leading-tight">
            Muthaallim Conference
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Command Center
          </p>

          {/* Admin User Badge */}
          <div className="mt-3.5 flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs uppercase">
                {adminUser?.username?.[0] || 'A'}
              </div>
              <div className="leading-tight">
                <span className="block text-xs font-bold text-slate-200 truncate max-w-[120px]">
                  {adminUser?.username || 'admin'}
                </span>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  {adminUser?.role || 'Administrator'}
                </span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </span>
          </div>
        </div>

        {/* Quick Glance Stats Widget in Sidebar */}
        <div className="p-4 mx-3 my-3 rounded-2xl bg-slate-800/50 border border-slate-800/80 space-y-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Conference Pulse
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Total</span>
              <span className="font-heading font-extrabold text-base text-white">{totalReg}</span>
            </div>
            <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-emerald-400 block">Admitted</span>
              <span className="font-heading font-extrabold text-base text-emerald-400">{totalAdm}</span>
            </div>
          </div>

          {/* Normal Registration Open/Closed Status & Quick Action */}
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
                  Normal Reg
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
                setRegModalConfig({ isOpen: true, targetType: 'normal' });
              }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 flex-shrink-0 ${
                isRegistrationOpen
                  ? 'bg-rose-500/20 hover:bg-rose-500/35 text-rose-200 border border-rose-500/40'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-200 border border-emerald-500/40'
              }`}
              title={isRegistrationOpen ? 'Close Normal Registration' : 'Reopen Normal Registration'}
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

          {/* Spot Registration Open/Closed Status & Quick Action */}
          <div
            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
              isSpotRegistrationOpen
                ? 'bg-amber-950/50 border-amber-800/60'
                : 'bg-rose-950/60 border-rose-800/60'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  isSpotRegistrationOpen ? 'bg-amber-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              <div className="leading-tight truncate">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">
                  Spot Reg
                </span>
                <span
                  className={`text-[11px] font-bold ${
                    isSpotRegistrationOpen ? 'text-amber-300' : 'text-rose-300'
                  }`}
                >
                  {isSpotRegistrationOpen ? 'Open' : 'Closed'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setRegModalConfig({ isOpen: true, targetType: 'spot' });
              }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 flex-shrink-0 ${
                isSpotRegistrationOpen
                  ? 'bg-rose-500/20 hover:bg-rose-500/35 text-rose-200 border border-rose-500/40'
                  : 'bg-amber-500/20 hover:bg-amber-500/35 text-amber-200 border border-amber-500/40'
              }`}
              title={isSpotRegistrationOpen ? 'Close Spot Registration' : 'Reopen Spot Registration'}
            >
              {isSpotRegistrationOpen ? (
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

        {/* Navigation Items */}
        <div className="px-3 py-2 space-y-1">
          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Menu Navigation
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
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 font-extrabold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'}`} />
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

      {/* Bottom Actions & Copyright */}
      <div className="p-4 border-t border-slate-800/90 space-y-2">
        {onSwitchToSubAdmin && (
          <button
            onClick={onSwitchToSubAdmin}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-teal-950/60 hover:bg-teal-900/80 text-teal-300 text-xs font-semibold border border-teal-800/60 transition cursor-pointer"
            title="Switch to Sub-Admin Operations Portal"
          >
            <Shield className="w-3.5 h-3.5 text-teal-400" />
            <span>Sub-Admin Portal</span>
          </button>
        )}

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
            title="Refresh Conference Records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold border border-rose-500/30 transition cursor-pointer"
            title="Sign Out of Session"
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
            aria-label="Toggle Navigation Sidebar"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-rose-400" /> : <Menu className="w-5 h-5 text-emerald-400" />}
          </button>
          <div>
            <span className="text-xs font-heading font-black text-white block leading-tight">
              Muthaallim Console
            </span>
            <span className="text-[10px] text-emerald-400 block font-semibold">
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
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
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
            <h1 className="text-xl font-heading font-black text-slate-900 tracking-tight flex items-center gap-2">
              {activeTab === 'analytics' && <BarChart3 className="w-5 h-5 text-emerald-600" />}
              {activeTab === 'attendees' && <Users className="w-5 h-5 text-emerald-600" />}
              {activeTab === 'spot-attendees' && <Zap className="w-5 h-5 text-amber-500" />}
              {activeTab === 'hierarchy' && <FolderTree className="w-5 h-5 text-emerald-600" />}
              {activeTab === 'settings' && <Settings className="w-5 h-5 text-emerald-600" />}
              <span>{navItems.find(n => n.id === activeTab)?.label}</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {navItems.find(n => n.id === activeTab)?.description}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Normal Registration Open/Closed Quick Toggle */}
            <button
              type="button"
              onClick={() => setRegModalConfig({ isOpen: true, targetType: 'normal' })}
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
              <span>{isRegistrationOpen ? 'Normal Reg Open' : 'Normal Reg Closed'}</span>
              {isRegistrationOpen ? (
                <Lock className="w-3.5 h-3.5 opacity-70" />
              ) : (
                <Unlock className="w-3.5 h-3.5 opacity-70" />
              )}
            </button>

            {/* Spot Registration Open/Closed Quick Toggle */}
            <button
              type="button"
              onClick={() => setRegModalConfig({ isOpen: true, targetType: 'spot' })}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                isSpotRegistrationOpen
                  ? 'bg-amber-50 hover:bg-rose-50 text-amber-800 hover:text-rose-700 border-amber-200 hover:border-rose-200'
                  : 'bg-rose-50 hover:bg-amber-50 text-rose-700 hover:text-amber-800 border-rose-200 hover:border-amber-200'
              }`}
              title={isSpotRegistrationOpen ? 'Click to close spot registration' : 'Click to reopen spot registration'}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isSpotRegistrationOpen ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span>{isSpotRegistrationOpen ? 'Spot Reg Open' : 'Spot Reg Closed'}</span>
              {isSpotRegistrationOpen ? (
                <Lock className="w-3.5 h-3.5 opacity-70" />
              ) : (
                <Unlock className="w-3.5 h-3.5 opacity-70" />
              )}
            </button>

            {onSwitchToSubAdmin && (
              <button
                onClick={onSwitchToSubAdmin}
                className="px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold border border-teal-200 transition flex items-center gap-1.5 cursor-pointer"
                title="Open Sub-Admin Portal (Overview & Attendees Only)"
              >
                <Shield className="w-3.5 h-3.5 text-teal-600" />
                <span>Sub-Admin Portal</span>
              </button>
            )}

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
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
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
          {/* Live Feedback Banner for Registration Status Toggle */}
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

          {/* Persistent Warning Strip when Normal Registration is Closed */}
          {!isRegistrationOpen && (
            <div className="p-3.5 sm:px-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold block text-rose-950">Normal Online Registration is Currently Closed</span>
                  <span className="text-rose-700">
                    New normal delegate sign-ups are paused. Already-registered attendees can still access their passes.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRegModalConfig({ isOpen: true, targetType: 'normal' })}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Reopen Normal Registration</span>
              </button>
            </div>
          )}

          {/* Persistent Warning Strip when Spot Registration is Closed */}
          {!isSpotRegistrationOpen && (
            <div className="p-3.5 sm:px-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 border border-amber-300 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold block text-amber-950">Spot Registration is Currently Closed</span>
                  <span className="text-amber-800">
                    On-site spot admissions at /spot-registration are paused.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRegModalConfig({ isOpen: true, targetType: 'spot' })}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Reopen Spot Registration</span>
              </button>
            </div>
          )}
          {activeTab === 'analytics' && (
            analyticsError ? (
              <div className="bg-white p-8 rounded-3xl border border-rose-200 text-center space-y-3">
                <p className="text-rose-600 font-semibold text-sm">{analyticsError}</p>
                <button 
                  onClick={fetchAnalytics}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition"
                >
                  Retry Loading Analytics
                </button>
              </div>
            ) : (
              <AnalyticsCharts
                analyticsData={analyticsData}
                onFilterByDivision={() => setActiveTab('attendees')}
                canCustomizeSlug={true}
                onDivisionUpdated={fetchAnalytics}
              />
            )
          )}

          {activeTab === 'attendees' && (
            <AttendeeTable
              registrationType="normal"
              onViewTicket={onViewTicket}
              onDataChanged={fetchAnalytics}
            />
          )}

          {activeTab === 'spot-attendees' && (
            <AttendeeTable
              registrationType="spot"
              onViewTicket={onViewTicket}
              onDataChanged={fetchAnalytics}
            />
          )}

          {activeTab === 'hierarchy' && (
            <HierarchyManager
              onHierarchyChanged={fetchAnalytics}
            />
          )}

          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Normal Registration Status Control Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border ${
                        isRegistrationOpen
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          : 'bg-rose-50 text-rose-600 border-rose-200'
                      }`}
                    >
                      {isRegistrationOpen ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-heading font-bold text-base text-slate-900">
                          Normal Registration Control
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            isRegistrationOpen
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isRegistrationOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                            }`}
                          />
                          {isRegistrationOpen ? 'OPEN' : 'CLOSED'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {isRegistrationOpen
                          ? 'Online public registration is active. New delegates can register online.'
                          : 'Online registration is closed. New public sign-ups are paused.'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setRegModalConfig({ isOpen: true, targetType: 'normal' })}
                    className={`px-4 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer flex-shrink-0 ${
                      isRegistrationOpen
                        ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    }`}
                  >
                    {isRegistrationOpen ? (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Close Normal</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4" />
                        <span>Reopen Normal</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Custom Closed Notice Message Editor */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Normal Reg Closed Notice <span className="text-slate-400 font-normal">(Shown when closed)</span>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      value={settingsData.registration_closed_message || ''}
                      onChange={(e) =>
                        setSettingsData({ ...settingsData, registration_closed_message: e.target.value })
                      }
                      placeholder="Leave empty for default message, or enter a custom announcement..."
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveSettings}
                      disabled={savingSettings}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70 whitespace-nowrap"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Notice</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Spot Registration Status Control Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border ${
                        isSpotRegistrationOpen
                          ? 'bg-amber-50 text-amber-600 border-amber-200'
                          : 'bg-rose-50 text-rose-600 border-rose-200'
                      }`}
                    >
                      {isSpotRegistrationOpen ? <Zap className="w-5 h-5 text-amber-600" /> : <Lock className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-heading font-bold text-base text-slate-900">
                          Spot Registration Control
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            isSpotRegistrationOpen
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSpotRegistrationOpen ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
                            }`}
                          />
                          {isSpotRegistrationOpen ? 'OPEN' : 'CLOSED'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {isSpotRegistrationOpen
                          ? 'Spot counter active at /spot-registration. Immediate admission enabled.'
                          : 'Spot registration closed. On-site candidate submissions are paused.'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setRegModalConfig({ isOpen: true, targetType: 'spot' })}
                    className={`px-4 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer flex-shrink-0 ${
                      isSpotRegistrationOpen
                        ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                        : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                    }`}
                  >
                    {isSpotRegistrationOpen ? (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Close Spot</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4" />
                        <span>Reopen Spot</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Custom Spot Closed Notice Message Editor */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Spot Reg Closed Notice <span className="text-slate-400 font-normal">(Shown on /spot-registration when closed)</span>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      value={settingsData.spot_registration_closed_message || ''}
                      onChange={(e) =>
                        setSettingsData({ ...settingsData, spot_registration_closed_message: e.target.value })
                      }
                      placeholder="Leave empty for default message, or enter a custom announcement..."
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveSettings}
                      disabled={savingSettings}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70 whitespace-nowrap"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Notice</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Conference General Settings */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
                <div>
                  <h3 className="font-heading font-bold text-base text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Conference Public Branding
                  </h3>
                  <p className="text-xs text-slate-500">
                    Updates reflect instantly on delegate registration forms and digital ticket passes.
                  </p>
                </div>

                {settingsSaved && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Settings updated successfully!</span>
                  </div>
                )}

                <form onSubmit={handleSaveSettings} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Event Title</label>
                    <input
                      type="text"
                      value={settingsData.event_title || ''}
                      onChange={(e) => setSettingsData({ ...settingsData, event_title: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Theme / Subtitle</label>
                    <input
                      type="text"
                      value={settingsData.event_subtitle || ''}
                      onChange={(e) => setSettingsData({ ...settingsData, event_subtitle: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Event Date</label>
                      <input
                        type="text"
                        value={settingsData.event_date || ''}
                        onChange={(e) => setSettingsData({ ...settingsData, event_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Venue / Location</label>
                      <input
                        type="text"
                        value={settingsData.event_venue || ''}
                        onChange={(e) => setSettingsData({ ...settingsData, event_venue: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-75 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Event Settings</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Admin Credentials / Quick Access info */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
                <div>
                  <h3 className="font-heading font-bold text-base text-slate-900 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-600" />
                    Admin Account Details
                  </h3>
                  <p className="text-xs text-slate-500">
                    Signed in administrator role and security settings.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Logged in user:</span>
                    <strong className="text-slate-800">{adminUser?.username || 'admin'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Permission Role:</span>
                    <strong className="text-emerald-700 uppercase">{adminUser?.role || 'superadmin'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Authentication:</span>
                    <span className="text-slate-700 font-mono">JWT Bearer (7-day validity)</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 text-xs text-emerald-900 space-y-1.5">
                  <p className="font-bold">Pro Tip for Venue Coordinators:</p>
                  <p className="text-emerald-800 leading-relaxed">
                    Gate volunteers can open the <strong>Gate Scanner</strong> page on their smartphones without full admin credentials to scan attendee QR passes at entrance gates.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Registration Open/Close Confirmation Modal */}
      <RegistrationStatusModal
        isOpen={regModalConfig.isOpen}
        targetType={regModalConfig.targetType}
        currentlyOpen={regModalConfig.targetType === 'spot' ? isSpotRegistrationOpen : isRegistrationOpen}
        initialClosedMessage={
          regModalConfig.targetType === 'spot'
            ? settingsData.spot_registration_closed_message || ''
            : settingsData.registration_closed_message || ''
        }
        onClose={() => !togglingRegistration && setRegModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleToggleRegistrationConfirm}
        loading={togglingRegistration}
      />
    </div>
  );
}
