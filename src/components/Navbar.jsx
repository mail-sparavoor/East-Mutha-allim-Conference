import React, { useState } from 'react';
import { 
  Compass, 
  QrCode, 
  UserCheck, 
  ShieldCheck, 
  LogOut, 
  Menu, 
  X, 
  Search, 
  Calendar,
  MapPin,
  Sparkles
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  adminUser, 
  onLogout, 
  onOpenLogin,
  eventSettings 
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'register', label: 'Home / Register', icon: Compass },
    { id: 'ticket-lookup', label: 'Find Ticket', icon: Search },
    { id: 'checkin', label: 'Gate Scanner', icon: QrCode, badge: 'Venue' },
    { id: 'admin', label: 'Admin Dashboard', icon: ShieldCheck, adminOnly: true }
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-emerald-900/50 text-white shadow-xl">
      {/* Top micro banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 px-4 py-1 text-xs text-emerald-200 border-b border-emerald-700/30">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-medium text-emerald-100">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              {eventSettings?.event_title || 'മലപ്പുറം ഈസ്റ്റ് ജില്ല മുതഅല്ലിം സമ്മേളനം'}
            </span>
            <span className="hidden sm:inline text-emerald-400/50">•</span>
            <span className="hidden sm:inline-flex items-center gap-1 text-emerald-200">
              <Calendar className="w-3 h-3 text-emerald-300" />
              {eventSettings?.event_date || '19 November 2026, വ്യാഴം'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-emerald-300/90">
              <MapPin className="w-3 h-3 text-amber-400" />
              {eventSettings?.event_venue || 'പുളിക്കൽ, ഐക്കരപ്പടി'}
            </span>
          </div>
        </div>
      </div>

      {/* Main navigation bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div 
            onClick={() => handleNavClick('register')} 
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 p-0.5 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <span className="text-xl font-bold bg-gradient-to-br from-emerald-300 to-teal-100 bg-clip-text text-transparent">
                  MC
                </span>
              </div>
            </div>
            <div>
              <div className="font-heading font-extrabold text-lg tracking-tight text-white flex items-center gap-2">
                <span>Muthaallim</span>
                <span className="text-emerald-400 font-light">Conference</span>
              </div>
              <div className="text-[11px] font-medium text-emerald-400 tracking-wider uppercase">
                Malappuram East • 2026
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center gap-2 ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-emerald-500/30 text-emerald-300 border border-emerald-500/30">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action: Admin Profile / Login Button */}
          <div className="hidden md:flex items-center gap-3">
            {adminUser ? (
              <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-xs font-medium text-slate-200">
                  {adminUser.username}
                </span>
                <button
                  onClick={onLogout}
                  title="Sign out of Admin"
                  className="ml-2 text-slate-400 hover:text-rose-400 transition-colors p-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="text-xs font-medium text-slate-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-emerald-700/50 hover:bg-slate-800/60 transition-all flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Admin Login</span>
              </button>
            )}
          </div>

          {/* Mobile hamburger button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-3 pb-5 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-emerald-400" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-500/30 text-emerald-300">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
            {adminUser ? (
              <div className="flex items-center justify-between w-full px-2">
                <span className="text-xs text-slate-300">Logged in: <strong>{adminUser.username}</strong></span>
                <button
                  onClick={onLogout}
                  className="text-xs text-rose-400 flex items-center gap-1 py-1 px-2 rounded hover:bg-rose-950/40"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenLogin();
                }}
                className="w-full text-center py-2 text-xs font-semibold text-emerald-300 bg-slate-800/80 rounded-lg hover:bg-slate-800"
              >
                Admin Sign In
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
