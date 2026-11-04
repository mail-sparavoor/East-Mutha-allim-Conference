import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import RegistrationForm from './components/RegistrationForm';
import TicketPass from './components/TicketPass';
import TicketLookup from './components/TicketLookup';
import ScannerCheckIn from './components/ScannerCheckIn';
import AdminDashboard from './components/AdminDashboard';
import SubAdminDashboard from './components/SubAdminDashboard';
import AdminLoginModal from './components/AdminLoginModal';
import { api } from './utils/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('register'); // 'register' | 'ticket' | 'ticket-lookup' | 'checkin' | 'admin' | 'subadmin'
  const [currentAttendee, setCurrentAttendee] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [eventSettings, setEventSettings] = useState(null);

  // Clean URL navigation helper (uses HTML5 History API without '#')
  const navigate = (path, replace = false) => {
    if (replace) {
      window.history.replaceState({}, '', path);
    } else {
      window.history.pushState({}, '', path);
    }
    handlePathRouting();
  };

  // Resolve routing from pathname (clean URLs) with backward-compatibility fallback for hash links
  const handlePathRouting = async () => {
    const pathname = window.location.pathname;
    const hash = window.location.hash;

    // Check direct clean path /ticket/:id
    if (pathname.startsWith('/ticket/')) {
      const ticketId = pathname.replace('/ticket/', '').replace(/\/$/, '');
      if (ticketId) {
        try {
          const att = await api.getTicket(ticketId);
          setCurrentAttendee(att);
          setActiveTab('ticket');
          return;
        } catch (e) {
          console.error('Failed to load linked ticket:', e);
        }
      }
    }

    // Check legacy hash fallback #ticket=... and migrate to clean URL
    if (hash.startsWith('#ticket=')) {
      const ticketId = hash.replace('#ticket=', '');
      if (ticketId) {
        navigate(`/ticket/${ticketId}`, true);
        return;
      }
    }

    // Check /admin or #admin
    if (pathname === '/admin' || pathname.startsWith('/admin/') || hash === '#admin') {
      if (hash === '#admin') navigate('/admin', true);
      setActiveTab('admin');
      return;
    }

    // Check /subadmin or #subadmin
    if (pathname === '/subadmin' || pathname.startsWith('/subadmin/') || hash === '#subadmin') {
      if (hash === '#subadmin') navigate('/subadmin', true);
      setActiveTab('subadmin');
      return;
    }

    // Check /checkin or #checkin
    if (pathname === '/checkin' || pathname.startsWith('/checkin/') || hash === '#checkin') {
      if (hash === '#checkin') navigate('/checkin', true);
      setActiveTab('checkin');
      return;
    }

    // Check /lookup
    if (pathname === '/lookup') {
      setActiveTab('ticket-lookup');
      return;
    }

    // Default: Main registration & landing view
    setActiveTab('register');
  };

  // Load public settings, verify existing admin session, and initialize clean routing
  useEffect(() => {
    async function init() {
      try {
        const settings = await api.getSettings();
        setEventSettings(settings);
      } catch (err) {
        console.error('Failed to load settings:', err);
      }

      const token = localStorage.getItem('muthaallim_admin_token');
      if (token) {
        try {
          const user = await api.getAdminMe();
          setAdminUser(user);
        } catch (err) {
          localStorage.removeItem('muthaallim_admin_token');
          setAdminUser(null);
        }
      }

      handlePathRouting();
    }
    init();

    // Listen for browser Back/Forward navigation
    const onPopState = () => {
      handlePathRouting();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // When activeTab is admin or subadmin and user is not signed in, prompt login modal
  useEffect(() => {
    if ((activeTab === 'admin' || activeTab === 'subadmin') && !adminUser) {
      setLoginModalOpen(true);
    }
  }, [activeTab, adminUser]);

  // Handle successful registration
  const handleRegistrationSuccess = (attendee) => {
    setCurrentAttendee(attendee);
    setActiveTab('ticket');
    navigate(`/ticket/${attendee.registration_id}`);
  };

  // Handle ticket found from lookup
  const handleTicketFound = (attendee) => {
    setCurrentAttendee(attendee);
    setActiveTab('ticket');
    navigate(`/ticket/${attendee.registration_id}`);
  };

  const handleAdminLoginSuccess = (admin) => {
    setAdminUser(admin);
    if (admin.role === 'subadmin') {
      setActiveTab('subadmin');
      navigate('/subadmin');
    } else {
      if (window.location.pathname === '/subadmin' || window.location.hash === '#subadmin') {
        setActiveTab('subadmin');
        navigate('/subadmin');
      } else {
        setActiveTab('admin');
        navigate('/admin');
      }
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('muthaallim_admin_token');
    setAdminUser(null);
    if (activeTab === 'admin' || activeTab === 'subadmin') {
      setActiveTab('register');
      navigate('/');
    }
  };

  const isFullLayout = activeTab === 'admin' || activeTab === 'subadmin';

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-slate-100/50 to-slate-100">
      {/* Main Content View */}
      <main className={`flex-1 ${isFullLayout ? '' : 'pb-16'}`}>
        {activeTab === 'register' && (
          <LandingPage
            onRegistrationSuccess={handleRegistrationSuccess}
            eventSettings={eventSettings}
            onOpenLookup={() => {
              setActiveTab('ticket-lookup');
              navigate('/lookup');
            }}
          />
        )}

        {activeTab === 'ticket' && (
          <TicketPass
            attendee={currentAttendee}
            eventSettings={eventSettings}
            onBack={() => {
              setActiveTab('register');
              navigate('/');
            }}
          />
        )}

        {activeTab === 'ticket-lookup' && (
          <TicketLookup
            onTicketFound={handleTicketFound}
            onGoToRegister={() => {
              setActiveTab('register');
              navigate('/');
            }}
          />
        )}

        {activeTab === 'checkin' && (
          <ScannerCheckIn
            adminUser={adminUser}
            onBack={() => {
              setActiveTab('register');
              navigate('/');
            }}
          />
        )}

        {/* Super Admin Command Center (Full Access) */}
        {activeTab === 'admin' && (
          adminUser ? (
            <AdminDashboard
              adminUser={adminUser}
              onLogout={handleAdminLogout}
              onBack={() => {
                setActiveTab('register');
                navigate('/');
              }}
              onSwitchToSubAdmin={() => {
                setActiveTab('subadmin');
                navigate('/subadmin');
              }}
              onViewTicket={(att) => {
                setCurrentAttendee(att);
                setActiveTab('ticket');
                navigate(`/ticket/${att.registration_id}`);
              }}
            />
          ) : (
            <div className="py-24 text-center space-y-4">
              <h2 className="text-xl font-heading font-bold text-slate-800">
                Super Admin Access Required
              </h2>
              <button
                onClick={() => setLoginModalOpen(true)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md cursor-pointer transition"
              >
                Sign In to Admin Console
              </button>
            </div>
          )
        )}

        {/* Dedicated Sub-Admin Portal (Overview & Analytics + Attendee Directory Exclusively) */}
        {activeTab === 'subadmin' && (
          adminUser ? (
            <SubAdminDashboard
              adminUser={adminUser}
              onLogout={handleAdminLogout}
              onBack={() => {
                setActiveTab('register');
                navigate('/');
              }}
              onViewTicket={(att) => {
                setCurrentAttendee(att);
                setActiveTab('ticket');
                navigate(`/ticket/${att.registration_id}`);
              }}
            />
          ) : (
            <div className="py-24 text-center space-y-4">
              <h2 className="text-xl font-heading font-bold text-slate-800">
                Sub-Admin Portal Authentication Required
              </h2>
              <button
                onClick={() => setLoginModalOpen(true)}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold shadow-md cursor-pointer transition"
              >
                Sign In to Sub-Admin Portal
              </button>
            </div>
          )
        )}
      </main>

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={loginModalOpen}
        onClose={() => {
          setLoginModalOpen(false);
          if ((activeTab === 'admin' || activeTab === 'subadmin') && !adminUser) {
            setActiveTab('register');
            navigate('/');
          }
        }}
        onLoginSuccess={handleAdminLoginSuccess}
      />

      {/* Footer (Public site only; Admin & Sub-Admin dashboards have integrated branding sidebars) */}
      {!isFullLayout && (
        <footer className="bg-slate-950 border-t border-slate-900 py-8 text-center text-xs text-slate-500 no-print">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-center">
            <span className="font-semibold text-slate-400">
              SSF Malappuram East District Committee
            </span>
          </div>
        </footer>
      )}
    </div>
  );
}
