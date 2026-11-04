import React, { useState, useEffect, useRef } from 'react';
import { 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Camera, 
  CameraOff, 
  RefreshCw, 
  Search, 
  UserCheck, 
  Clock, 
  ShieldCheck, 
  Volume2, 
  VolumeX,
  Sparkles,
  Users,
  Building,
  GraduationCap,
  ArrowLeft
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../utils/api';

// Web Audio sound synthesizer for instant audio feedback without external audio files
function playBeep(type) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'success') {
      // Pleasant high double beep (success chime)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc1.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain1.gain.setValueAtTime(0.2, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.35);
    } else if (type === 'duplicate') {
      // Warning double buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(196, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else {
      // Error low buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    // Audio context not allowed until user interaction
  }
}

export default function ScannerCheckIn({ adminUser, onBack }) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [manualQuery, setManualQuery] = useState('');
  const [manualResults, setManualResults] = useState([]);
  const [manualSearching, setManualSearching] = useState(false);
  const [stats, setStats] = useState({ total: 0, admitted: 0, pending: 0, rate: 0 });
  const [recentAdmissions, setRecentAdmissions] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraFacing, setCameraFacing] = useState('environment'); // environment (back) or user (front)
  const [scannerError, setScannerError] = useState(null);
  const [verifierName, setVerifierName] = useState(adminUser?.username || 'Main Gate');

  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);

  // Fetch gate statistics and recent stream
  const refreshStats = async () => {
    try {
      const data = await api.getRecentCheckIns();
      setStats(data.stats);
      setRecentAdmissions(data.recent);
    } catch (err) {
      console.error('Failed to fetch checkin stats:', err);
    }
  };

  useEffect(() => {
    refreshStats();
    const interval = setInterval(refreshStats, 10000);
    return () => clearInterval(interval);
  }, []);

  // Initialize html5-qrcode scanner
  const startScanner = async () => {
    try {
      setScannerError(null);
      if (scannerRef.current) {
        await stopScanner();
      }

      const html5QrCode = new Html5Qrcode("qr-reader-container");
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      await html5QrCode.start(
        { facingMode: cameraFacing },
        config,
        async (decodedText) => {
          if (isProcessingRef.current) return;
          isProcessingRef.current = true;

          await handleQrDetected(decodedText);

          // Cooldown before scanning next code
          setTimeout(() => {
            isProcessingRef.current = false;
          }, 2000);
        },
        (errorMessage) => {
          // ignore frame errors
        }
      );

      setIsScanning(true);
    } catch (err) {
      console.error('Failed to start camera:', err);
      setScannerError(err.message || 'Camera permission denied or camera not found.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.error('Failed to stop camera:', err);
      } finally {
        scannerRef.current = null;
        setIsScanning(false);
      }
    }
  };

  // Toggle camera front / back
  const toggleCameraFacing = async () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    if (isScanning) {
      await stopScanner();
      setTimeout(() => {
        setCameraFacing(nextFacing);
        startScanner();
      }, 300);
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  // Handle scanned QR code
  const handleQrDetected = async (rawCode) => {
    try {
      const response = await api.scanCheckIn(rawCode, verifierName);

      if (response.status === 'ADMITTED_NOW') {
        if (soundEnabled) playBeep('success');
        setScanResult({
          type: 'success',
          message: response.message,
          attendee: response.attendee
        });
      } else if (response.status === 'ALREADY_ADMITTED') {
        if (soundEnabled) playBeep('duplicate');
        setScanResult({
          type: 'duplicate',
          message: response.message,
          attendee: response.attendee
        });
      } else {
        if (soundEnabled) playBeep('error');
        setScanResult({
          type: 'error',
          message: response.message || 'Invalid or unrecognized QR code.'
        });
      }

      refreshStats();
    } catch (err) {
      if (soundEnabled) playBeep('error');
      setScanResult({
        type: 'error',
        message: err.message || 'Verification error'
      });
    }
  };

  // Manual search fallback
  const handleManualSearch = async (e) => {
    e.preventDefault();
    if (!manualQuery.trim()) return;

    setManualSearching(true);
    try {
      // Find single or multiple attendees matching search
      const data = await api.getAttendees({ search: manualQuery.trim(), limit: 5 });
      setManualResults(data.attendees || []);
    } catch (err) {
      console.error('Manual search error:', err);
    } finally {
      setManualSearching(false);
    }
  };

  // Manual admit button click
  const handleManualAdmit = async (attendeeId) => {
    try {
      const res = await api.manualCheckIn(attendeeId, 'admit', verifierName);
      if (soundEnabled) playBeep('success');
      setScanResult({
        type: 'success',
        message: `Manually Admitted: ${res.attendee.full_name}`,
        attendee: res.attendee
      });
      // update item in search results
      setManualResults(prev => prev.map(a => a.id === attendeeId ? res.attendee : a));
      refreshStats();
    } catch (err) {
      if (soundEnabled) playBeep('error');
      alert(err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* Header and Gate Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {onBack && (
            <button
              onClick={onBack}
              className="mb-2 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Conference Page</span>
            </button>
          )}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 mb-2">
            <QrCode className="w-3.5 h-3.5 text-emerald-700" />
            <span>Venue Gate Admission Scanner</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-heading font-black text-slate-900 tracking-tight">
            Check-In & Attendance Verification
          </h1>
        </div>

        {/* Verifier identity & sound toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs shadow-sm">
            <span className="text-slate-400 font-medium">Gate:</span>
            <input
              type="text"
              value={verifierName}
              onChange={(e) => setVerifierName(e.target.value)}
              className="font-semibold text-slate-800 focus:outline-none w-28 bg-transparent"
              title="Click to rename gate / verifier"
            />
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border transition shadow-sm ${
              soundEnabled
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}
            title={soundEnabled ? 'Sound alerts enabled' : 'Sound alerts muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Live Venue Admission Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Registered</span>
          <span className="text-2xl font-heading font-extrabold text-slate-900 mt-1 block">
            {stats.total}
          </span>
        </div>
        <div className="bg-emerald-500 text-white p-4 rounded-2xl shadow-md shadow-emerald-500/20">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100 block">Admitted at Venue</span>
          <span className="text-2xl font-heading font-extrabold text-white mt-1 block">
            {stats.admitted}
          </span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Pending Check-in</span>
          <span className="text-2xl font-heading font-extrabold text-amber-600 mt-1 block">
            {stats.pending}
          </span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Admission Rate</span>
          <span className="text-2xl font-heading font-extrabold text-teal-700 mt-1 block">
            {stats.rate}%
          </span>
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Camera Feed Container (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Live Camera Scanner
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleCameraFacing}
                className="text-xs font-medium text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition flex items-center gap-1"
                title="Switch between front and back camera"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{cameraFacing === 'environment' ? 'Back Cam' : 'Front Cam'}</span>
              </button>
            </div>
          </div>

          <div className="p-4 flex-1 flex flex-col items-center justify-center bg-slate-950 min-h-[320px] relative">
            {/* The html5-qrcode element */}
            <div 
              id="qr-reader-container" 
              className="w-full max-w-[320px] rounded-2xl overflow-hidden"
            />

            {!isScanning && (
              <div className="text-center p-6 text-white space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-emerald-400">
                  <QrCode className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-slate-200">
                    Camera Scanner Paused
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                    Click 'Start Scanner' to activate your camera and scan tickets at the gate.
                  </p>
                </div>
                <button
                  onClick={startScanner}
                  className="px-6 py-2.5 rounded-xl font-heading font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 transition transform active:scale-95 inline-flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Camera Scanner</span>
                </button>
              </div>
            )}

            {isScanning && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={stopScanner}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-rose-300 bg-rose-950/60 border border-rose-800 hover:bg-rose-900 transition flex items-center gap-1.5"
                >
                  <CameraOff className="w-3.5 h-3.5" /> Stop Camera
                </button>
              </div>
            )}

            {scannerError && (
              <div className="absolute inset-x-4 bottom-4 p-3 rounded-xl bg-rose-900/90 border border-rose-700 text-rose-200 text-xs text-center">
                {scannerError}
              </div>
            )}
          </div>
        </div>

        {/* Right: Verification Status Result & Feedback (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Scan result display card */}
          {scanResult ? (
            <div className={`rounded-3xl p-6 border shadow-xl transition-all duration-200 ${
              scanResult.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-emerald-500/10'
                : scanResult.type === 'duplicate'
                ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-amber-500/10'
                : 'bg-rose-50 border-rose-300 text-rose-950 shadow-rose-500/10'
            }`}>
              <div className="flex items-start gap-3">
                {scanResult.type === 'success' && (
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0" />
                )}
                {scanResult.type === 'duplicate' && (
                  <AlertTriangle className="w-8 h-8 text-amber-600 flex-shrink-0 animate-bounce" />
                )}
                {scanResult.type === 'error' && (
                  <XCircle className="w-8 h-8 text-rose-600 flex-shrink-0" />
                )}

                <div className="flex-1">
                  <div className="text-[11px] font-extrabold uppercase tracking-widest mb-0.5">
                    {scanResult.type === 'success' && 'ADMISSION GRANTED'}
                    {scanResult.type === 'duplicate' && 'DUPLICATE PASS DETECTED'}
                    {scanResult.type === 'error' && 'INVALID ENTRY PASS'}
                  </div>
                  <h3 className="font-heading font-extrabold text-xl leading-tight">
                    {scanResult.attendee ? scanResult.attendee.full_name : 'Verification Failed'}
                  </h3>
                </div>
              </div>

              {/* Attendee details snapshot */}
              {scanResult.attendee && (
                <div className="mt-4 pt-3 border-t border-slate-200/60 space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40">
                    <span className="text-slate-500 font-medium">Reg ID:</span>
                    <span className="font-mono font-bold">{scanResult.attendee.registration_id}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40">
                    <span className="text-slate-500 font-medium">Mobile:</span>
                    <span className="font-mono">{scanResult.attendee.mobile}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40">
                    <span className="text-slate-500 font-medium">Unit:</span>
                    <span className="font-bold">{scanResult.attendee.unit_name} ({scanResult.attendee.sector_name})</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 font-medium">College:</span>
                    <span className="font-semibold text-right max-w-[200px] truncate">{scanResult.attendee.college}</span>
                  </div>

                  {scanResult.type === 'duplicate' && (
                    <div className="mt-2 p-3 rounded-xl bg-amber-100/80 border border-amber-300 text-amber-900 font-medium text-[11px] space-y-1">
                      <p className="font-bold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Already Admitted
                      </p>
                      <p>Time: {scanResult.attendee.check_in_time || 'Earlier'}</p>
                      <p>Gate: {scanResult.attendee.check_in_by || 'Staff'}</p>
                    </div>
                  )}

                  {scanResult.type === 'success' && (
                    <div className="mt-2 p-2 rounded-xl bg-emerald-100/80 text-emerald-900 text-center text-[11px] font-bold">
                      ✓ Status updated to Admitted. Pass accepted!
                    </div>
                  )}
                </div>
              )}

              {!scanResult.attendee && (
                <p className="mt-2 text-xs text-rose-700">
                  {scanResult.message}
                </p>
              )}

              <button
                onClick={() => setScanResult(null)}
                className="mt-4 w-full py-2 rounded-xl bg-white/80 hover:bg-white text-xs font-bold border border-slate-300 shadow-sm transition"
              >
                Dismiss / Ready for Next Pass
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm text-center py-12 text-slate-400">
              <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h4 className="font-heading font-bold text-slate-700">Awaiting Ticket Scan</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                Point camera at the attendee's QR code or use the manual search below.
              </p>
            </div>
          )}

          {/* Manual Search Fallback Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              Manual Lookup Fallback
            </h4>
            <p className="text-[11px] text-slate-500 mb-3">
              If phone screen is dim or damaged, lookup attendee by mobile number or ID:
            </p>

            <form onSubmit={handleManualSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Mobile or Name or Reg ID..."
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={manualSearching}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition disabled:opacity-50"
              >
                {manualSearching ? '...' : 'Search'}
              </button>
            </form>

            {/* Manual Search Results */}
            {manualResults.length > 0 && (
              <div className="mt-3 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {manualResults.map((att) => (
                  <div key={att.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{att.full_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{att.registration_id} • +91 {att.mobile}</p>
                      <p className="text-[10px] text-slate-500">{att.unit_name} ({att.division_name})</p>
                    </div>
                    <div>
                      {att.status === 'Admitted' ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md">
                          Admitted
                        </span>
                      ) : (
                        <button
                          onClick={() => handleManualAdmit(att.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                        >
                          Check In
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Stream: Recent Admissions at Venue */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-heading font-bold text-base text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              Live Admission Stream
            </h3>
            <p className="text-xs text-slate-500">Real-time log of verified entries</p>
          </div>
          <button
            onClick={refreshStats}
            className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>

        {recentAdmissions.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No attendees admitted yet today.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2.5">Reg ID</th>
                  <th className="py-2.5">Delegate</th>
                  <th className="py-2.5">Hierarchy (Div &gt; Unit)</th>
                  <th className="py-2.5">Admitted Time</th>
                  <th className="py-2.5">Verifier Gate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {recentAdmissions.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 font-mono font-bold text-emerald-700">{att.registration_id}</td>
                    <td className="py-2.5">
                      <span className="font-bold text-slate-900 block">{att.full_name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">+91 {att.mobile}</span>
                    </td>
                    <td className="py-2.5 text-slate-600">
                      {att.division_name} &rarr; <span className="font-semibold text-slate-800">{att.unit_name}</span>
                    </td>
                    <td className="py-2.5 text-slate-500 font-mono text-[11px]">{att.check_in_time || 'N/A'}</td>
                    <td className="py-2.5 text-slate-600 font-medium">{att.check_in_by || 'Staff'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
