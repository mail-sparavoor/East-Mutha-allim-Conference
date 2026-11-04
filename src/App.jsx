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

  // Routing helper
  const handleHashRouting = async (hash) => {
    if (hash.startsWith('#ticket=')) {
      const ticketId = hash.replace('#ticket=', '');
      if (ticketId) {
        try {
          const att = await api.getTicket(ticketId);
          setCurrentAttendee(att);
          setActiveTab('ticket');
        } catch (e) {
          console.error('Failed to load linked ticket:', e);
        }
      }
    } else if (hash === '#checkin') {
      setActiveTab('checkin');
    } else if (hash === '#admin') {
      setActiveTab('admin');
    } else if (hash === '#subadmin') {
      setActiveTab('subadmin');
    } else if (hash === '' || hash === '#register') {
      setActiveTab('register');
    }
  };

  // Load public settings and verify existing admin token
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

      handleHashRouting(window.location.hash);
    }
    init();

    // Listen to hash navigation changes
    const onHashChange = () => {
      handleHashRouting(window.location.hash);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
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
    window.location.hash = `#ticket=${attendee.registration_id}`;
  };

  // Handle ticket found from lookup
  const handleTicketFound = (attendee) => {
    setCurrentAttendee(attendee);
    setActiveTab('ticket');
    window.location.hash = `#ticket=${attendee.registration_id}`;
  };

  const handleAdminLoginSuccess = (admin) => {
    setAdminUser(admin);
    if (admin.role === 'subadmin') {
      setActiveTab('subadmin');
      window.location.hash = '#subadmin';
    } else {
      if (window.location.hash === '#subadmin') {
        setActiveTab('subadmin');
      } else {
        setActiveTab('admin');
        window.location.hash = '#admin';
      }
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('muthaallim_admin_token');
    setAdminUser(null);
    if (activeTab === 'admin' || activeTab === 'subadmin') {
      setActiveTab('register');
      window.location.hash = '';
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
            onOpenLookup={() => setActiveTab('ticket-lookup')}
          />
        )}

        {activeTab === 'ticket' && (
          <TicketPass
            attendee={currentAttendee}
            eventSettings={eventSettings}
            onBack={() => {
              setActiveTab('register');
              window.location.hash = '';
            }}
          />
        )}

        {activeTab === 'ticket-lookup' && (
          <TicketLookup
            onTicketFound={handleTicketFound}
            onGoToRegister={() => {
              setActiveTab('register');
              window.location.hash = '';
            }}
          />
        )}

        {activeTab === 'checkin' && (
          <ScannerCheckIn
            adminUser={adminUser}
            onBack={() => {
              setActiveTab('register');
              window.location.hash = '';
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
                window.location.hash = '';
              }}
              onSwitchToSubAdmin={() => {
                setActiveTab('subadmin');
                window.location.hash = '#subadmin';
              }}
              onViewTicket={(att) => {
                setCurrentAttendee(att);
                setActiveTab('ticket');
                window.location.hash = `#ticket=${att.registration_id}`;
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
                window.location.hash = '';
              }}
              onViewTicket={(att) => {
                setCurrentAttendee(att);
                setActiveTab('ticket');
                window.location.hash = `#ticket=${att.registration_id}`;
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
            window.location.hash = '';
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
