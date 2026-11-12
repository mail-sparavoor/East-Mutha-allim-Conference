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
  ArrowLeft,
  Menu,
  X,
  ChevronRight,
  TrendingUp,
  UserCheck,
  ExternalLink,
  Shield
} from 'lucide-react';
import AnalyticsCharts from './AnalyticsCharts';
import AttendeeTable from './AttendeeTable';
import HierarchyManager from './HierarchyManager';
import { api } from '../utils/api';

export default function AdminDashboard({ adminUser, onLogout, onViewTicket, onBack, onSwitchToSubAdmin }) {
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
    contact_phone: '',
    contact_email: ''
  });
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

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
      setSettingsData(s);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSaved(false);
    try {
      await api.updateSettings(settingsData);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (err) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
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
      label: 'Attendee Directory',
      icon: Users,
      badge: analyticsData?.overview?.total_registrations || 0,
      description: 'Delegate list, check-in & passes'
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
        <div className="p-4 mx-3 my-3 rounded-2xl bg-slate-800/50 border border-slate-800/80 space-y-2">
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
              {activeTab === 'hierarchy' && <FolderTree className="w-5 h-5 text-emerald-600" />}
              {activeTab === 'settings' && <Settings className="w-5 h-5 text-emerald-600" />}
              <span>{navItems.find(n => n.id === activeTab)?.label}</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {navItems.find(n => n.id === activeTab)?.description}
            </p>
          </div>

          <div className="flex items-center gap-2">
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
    </div>
  );
}
