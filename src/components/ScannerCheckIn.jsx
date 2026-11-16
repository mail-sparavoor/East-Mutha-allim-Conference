import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ArrowLeft,
  Zap,
  Flashlight,
  FlashlightOff,
  Keyboard,
  Check
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
      // Pleasant high double chime (success chime)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc1.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain1.gain.setValueAtTime(0.2, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.3);
    } else if (type === 'duplicate') {
      // Warning double warble
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(293.66, ctx.currentTime);
      osc.frequency.setValueAtTime(261.63, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else {
      // Error low double buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.setValueAtTime(110, ctx.currentTime + 0.1);
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

// Trigger haptic vibration on mobile devices
function triggerVibration(type) {
  try {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      if (type === 'success') {
        navigator.vibrate(70);
      } else if (type === 'duplicate') {
        navigator.vibrate([90, 50, 90]);
      } else {
        navigator.vibrate([120, 60, 120]);
      }
    }
  } catch (_) {}
}

export default function ScannerCheckIn({ adminUser, onBack }) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [rapidContinuousMode, setRapidContinuousMode] = useState(true);
  const [sessionScanCount, setSessionScanCount] = useState(0);

  const [manualQuery, setManualQuery] = useState('');
  const [manualResults, setManualResults] = useState([]);
  const [manualSearching, setManualSearching] = useState(false);

  const [stats, setStats] = useState({ total: 0, admitted: 0, pending: 0, rate: 0 });
  const [recentAdmissions, setRecentAdmissions] = useState([]);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraFacing, setCameraFacing] = useState('environment'); // environment (back) or user (front)
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [scannerError, setScannerError] = useState(null);
  const [verifierName, setVerifierName] = useState(adminUser?.username || 'Main Gate');

  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const lastScannedCodeRef = useRef('');
  const lastScannedTimeRef = useRef(0);
  const autoDismissTimerRef = useRef(null);

  // Background barcode gun / hardware keyboard scanner buffer
  const keyBufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  // Fetch gate statistics and recent stream
  const refreshStats = useCallback(async () => {
    try {
      const data = await api.getRecentCheckIns();
      if (data?.stats) setStats(data.stats);
      if (data?.recent) setRecentAdmissions(data.recent);
    } catch (err) {
      console.error('Failed to fetch checkin stats:', err);
    }
  }, []);

  useEffect(() => {
    refreshStats();
    const interval = setInterval(refreshStats, 8000);
    return () => clearInterval(interval);
  }, [refreshStats]);

  // Handle scanned QR code with sub-second turnaround
  const handleQrDetected = useCallback(async (rawCode) => {
    if (!rawCode) return;
    const cleanRaw = String(rawCode).trim();
    const now = Date.now();

    // Prevent immediate re-trigger on the exact same QR code held in front of the lens (< 3s)
    if (lastScannedCodeRef.current === cleanRaw && now - lastScannedTimeRef.current < 3000) {
      return;
    }

    lastScannedCodeRef.current = cleanRaw;
    lastScannedTimeRef.current = now;
    isProcessingRef.current = true;

    try {
      const response = await api.scanCheckIn(cleanRaw, verifierName);

      if (response.status === 'ADMITTED_NOW') {
        if (soundEnabled) playBeep('success');
        triggerVibration('success');

        setScanResult({
          type: 'success',
          message: response.message,
          attendee: response.attendee,
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        });
        setSessionScanCount(prev => prev + 1);

        // Prepend to recent list immediately for live usher feedback
        if (response.attendee) {
          setRecentAdmissions(prev => [response.attendee, ...prev.filter(a => a.id !== response.attendee.id)].slice(0, 15));
        }

        // Apply updated stats bundled in the response (zero extra network calls!)
        if (response.stats) {
          setStats(response.stats);
        } else {
          setStats(prev => ({
            ...prev,
            admitted: prev.admitted + 1,
            pending: Math.max(0, prev.pending - 1),
            rate: prev.total > 0 ? Math.round(((prev.admitted + 1) / prev.total) * 100) : prev.rate
          }));
        }
      } else if (response.status === 'ALREADY_ADMITTED') {
        if (soundEnabled) playBeep('duplicate');
        triggerVibration('duplicate');

        setScanResult({
          type: 'duplicate',
          message: response.message,
          attendee: response.attendee,
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        });
        if (response.stats) setStats(response.stats);
      } else {
        if (soundEnabled) playBeep('error');
        triggerVibration('error');

        setScanResult({
          type: 'error',
          message: response.message || 'Invalid or unrecognized QR code.',
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        });
      }
    } catch (err) {
      if (soundEnabled) playBeep('error');
      triggerVibration('error');
      setScanResult({
        type: 'error',
        message: err.message || 'Verification error'
      });
    } finally {
      // Cooldown is zero for DIFFERENT QR codes, allowing rapid continuous scanning
      isProcessingRef.current = false;
    }
  }, [verifierName, soundEnabled]);

  // Auto-dismiss result card in Rapid Continuous Mode (after 2.5s)
  useEffect(() => {
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }

    if (scanResult && rapidContinuousMode) {
      autoDismissTimerRef.current = setTimeout(() => {
        setScanResult(null);
      }, 2500);
    }

    return () => {
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
      }
    };
  }, [scanResult, rapidContinuousMode]);

  // Hardware Barcode Scanner listener (USB / Bluetooth 2D scanner gun)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Ignore if user is actively typing in a form input
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) {
        return;
      }

      const now = Date.now();
      // Most hardware barcode scanners type all characters within ~30ms of each other and end with 'Enter'
      if (now - lastKeyTimeRef.current > 250) {
        keyBufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        const buffered = keyBufferRef.current.trim();
        keyBufferRef.current = '';
        if (buffered.length >= 3) {
          e.preventDefault();
          handleQrDetected(buffered);
        }
      } else if (e.key && e.key.length === 1) {
        keyBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleQrDetected]);

  // Check camera track capabilities for Flashlight / Torch
  const checkTorchSupport = () => {
    try {
      const videoElement = document.querySelector('#qr-reader-container video');
      const track = videoElement?.srcObject?.getVideoTracks?.()[0];
      const capabilities = track?.getCapabilities?.();
      if (capabilities && 'torch' in capabilities) {
        setTorchAvailable(true);
      } else {
        setTorchAvailable(false);
      }
    } catch (_) {
      setTorchAvailable(false);
    }
  };

  const toggleTorch = async () => {
    try {
      const videoElement = document.querySelector('#qr-reader-container video');
      const track = videoElement?.srcObject?.getVideoTracks?.()[0];
      if (track && 'applyConstraints' in track) {
        const nextTorch = !torchEnabled;
        await track.applyConstraints({
          advanced: [{ torch: nextTorch }]
        });
        setTorchEnabled(nextTorch);
      }
    } catch (err) {
      console.warn('Torch toggle not supported:', err);
    }
  };

  // Initialize html5-qrcode scanner with performance enhancements
  const startScanner = async () => {
    try {
      setScannerError(null);
      if (scannerRef.current) {
        await stopScanner();
      }

      const html5QrCode = new Html5Qrcode('qr-reader-container', {
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true // Native hardware acceleration on mobile GPUs
        },
        verbose: false
      });
      scannerRef.current = html5QrCode;

      // Dynamic viewport sizing: 80% of viewfinder
      const config = {
        fps: 20, // Doubled from 10 to 20 fps for instant detection
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const boxSize = Math.max(200, Math.floor(minEdge * 0.78));
          return { width: boxSize, height: boxSize };
        },
        aspectRatio: 1.0,
        disableFlip: false
      };

      await html5QrCode.start(
        { facingMode: cameraFacing },
        config,
        async (decodedText) => {
          if (isProcessingRef.current) return;
          await handleQrDetected(decodedText);
        },
        () => {
          // Ignore frame decode misses
        }
      );

      setIsScanning(true);
      setTimeout(checkTorchSupport, 800);
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
        setTorchEnabled(false);
        setTorchAvailable(false);
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
      }, 250);
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  // Manual search fallback
  const handleManualSearch = async (e) => {
    e.preventDefault();
    if (!manualQuery.trim()) return;

    setManualSearching(true);
    try {
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
      triggerVibration('success');

      setScanResult({
        type: 'success',
        message: `Manually Admitted: ${res.attendee.full_name}`,
        attendee: res.attendee,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });
      setSessionScanCount(prev => prev + 1);

      setManualResults(prev => prev.map(a => a.id === attendeeId ? res.attendee : a));
      setRecentAdmissions(prev => [res.attendee, ...prev.filter(a => a.id !== res.attendee.id)].slice(0, 15));
      setStats(prev => ({
        ...prev,
        admitted: prev.admitted + 1,
        pending: Math.max(0, prev.pending - 1),
        rate: prev.total > 0 ? Math.round(((prev.admitted + 1) / prev.total) * 100) : prev.rate
      }));
    } catch (err) {
      if (soundEnabled) playBeep('error');
      alert(err.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Top Header & Verifier Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {onBack && (
            <button
              onClick={onBack}
              className="mb-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Conference Portal</span>
            </button>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Zap className="w-3 h-3 text-emerald-700" />
              <span>High-Speed Check-In Engine</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              Session Scans: <strong className="text-slate-900">{sessionScanCount}</strong>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-heading font-black text-slate-900 tracking-tight mt-1">
            Gate Admission &amp; Attendance Verification
          </h1>
        </div>

        {/* Verifier Identity, Mode & Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Gate name input */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
            <span className="text-slate-400 font-medium">Gate:</span>
            <input
              type="text"
              value={verifierName}
              onChange={(e) => setVerifierName(e.target.value)}
              className="font-bold text-slate-800 focus:outline-none w-24 sm:w-28 bg-transparent text-xs"
              title="Click to rename gate / usher name"
            />
          </div>

          {/* Rapid Continuous Mode Toggle */}
          <button
            type="button"
            onClick={() => setRapidContinuousMode(!rapidContinuousMode)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              rapidContinuousMode
                ? 'bg-emerald-600 text-white border-emerald-700'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="When active, camera keeps scanning continuously and auto-advances to the next attendee"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rapid Auto-Advance:</span>
            <span>{rapidContinuousMode ? 'ON' : 'OFF'}</span>
          </button>

          {/* Sound toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border transition shadow-2xs cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}
            title={soundEnabled ? 'Audio alerts active' : 'Audio alerts muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Live Venue Admission Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Total Registered
          </span>
          <span className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 mt-0.5 block">
            {stats.total}
          </span>
        </div>
        <div className="bg-emerald-600 text-white p-3.5 sm:p-4 rounded-2xl shadow-sm shadow-emerald-600/20">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-100 block">
            Admitted at Venue
          </span>
          <span className="text-xl sm:text-2xl font-heading font-extrabold text-white mt-0.5 block">
            {stats.admitted}
          </span>
        </div>
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Pending Check-In
          </span>
          <span className="text-xl sm:text-2xl font-heading font-extrabold text-amber-600 mt-0.5 block">
            {stats.pending}
          </span>
        </div>
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Admission Rate
          </span>
          <span className="text-xl sm:text-2xl font-heading font-extrabold text-teal-700 mt-0.5 block">
            {stats.rate}%
          </span>
        </div>
      </div>

      {/* Main Scanner Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Camera Feed (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 shadow-lg overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Live High-Speed Scanner
              </span>
              {isScanning && (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Active
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {torchAvailable && isScanning && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition flex items-center gap-1 cursor-pointer ${
                    torchEnabled
                      ? 'bg-amber-400 text-slate-900 border-amber-500 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                  title="Toggle Flashlight / Torch"
                >
                  {torchEnabled ? <Flashlight className="w-3.5 h-3.5" /> : <FlashlightOff className="w-3.5 h-3.5" />}
                  <span>{torchEnabled ? 'Torch ON' : 'Torch'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={toggleCameraFacing}
                className="text-xs font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                title="Switch between front and back camera"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{cameraFacing === 'environment' ? 'Back' : 'Front'}</span>
              </button>
            </div>
          </div>

          <div className="p-4 flex-1 flex flex-col items-center justify-center bg-slate-950 min-h-[320px] sm:min-h-[360px] relative">
            {/* html5-qrcode element */}
            <div 
              id="qr-reader-container" 
              className="w-full max-w-[340px] rounded-2xl overflow-hidden"
            />

            {!isScanning && (
              <div className="text-center p-6 text-white space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-slate-800/90 flex items-center justify-center mx-auto text-emerald-400 border border-slate-700/80 shadow-md">
                  <QrCode className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-slate-200">
                    Camera Scanner Standby
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                    Click below to open your camera. Scans process in under 0.5 seconds per attendee.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={startScanner}
                  className="px-6 py-2.5 rounded-xl font-heading font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 transition transform active:scale-95 inline-flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Camera Scanner</span>
                </button>
              </div>
            )}

            {isScanning && (
              <div className="mt-3 flex items-center justify-between w-full max-w-[340px] px-1 text-xs">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Keyboard className="w-3 h-3 text-slate-500" />
                  <span>Barcode Gun Ready</span>
                </span>
                <button
                  type="button"
                  onClick={stopScanner}
                  className="px-3 py-1 rounded-lg text-[11px] font-semibold text-rose-300 bg-rose-950/60 border border-rose-800 hover:bg-rose-900 transition flex items-center gap-1 cursor-pointer"
                >
                  <CameraOff className="w-3 h-3" />
                  <span>Stop</span>
                </button>
              </div>
            )}

            {scannerError && (
              <div className="absolute inset-x-4 bottom-4 p-3 rounded-xl bg-rose-900/95 border border-rose-700 text-rose-100 text-xs text-center shadow-lg">
                {scannerError}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Instant Result Card & Fallback (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active Scan Result Flash Banner */}
          {scanResult ? (
            <div
              className={`rounded-3xl p-5 border shadow-xl transition-all duration-150 relative overflow-hidden ${
                scanResult.type === 'success'
                  ? 'bg-emerald-50/95 border-emerald-400 text-emerald-950 shadow-emerald-500/10'
                  : scanResult.type === 'duplicate'
                  ? 'bg-amber-50/95 border-amber-400 text-amber-950 shadow-amber-500/10'
                  : 'bg-rose-50/95 border-rose-400 text-rose-950 shadow-rose-500/10'
              }`}
            >
              {/* Countdown line for rapid auto-advance */}
              {rapidContinuousMode && (
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-black/10 overflow-hidden">
                  <div className="h-full bg-current opacity-60 animate-progress" />
                </div>
              )}

              <div className="flex items-start gap-3 mt-1">
                {scanResult.type === 'success' && (
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                )}
                {scanResult.type === 'duplicate' && (
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm animate-bounce">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                )}
                {scanResult.type === 'error' && (
                  <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    <XCircle className="w-6 h-6" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest">
                      {scanResult.type === 'success' && '✓ ADMISSION GRANTED'}
                      {scanResult.type === 'duplicate' && '⚠️ ALREADY ADMITTED'}
                      {scanResult.type === 'error' && '✕ INVALID PASS'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {scanResult.timestamp}
                    </span>
                  </div>
                  <h3 className="font-heading font-black text-xl leading-snug truncate mt-0.5">
                    {scanResult.attendee ? scanResult.attendee.full_name : 'Pass Verification Failed'}
                  </h3>
                </div>
              </div>

              {/* Attendee details snapshot */}
              {scanResult.attendee && (
                <div className="mt-3.5 pt-3 border-t border-slate-200/80 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-500 font-medium">Registration ID:</span>
                    <span className="font-mono font-extrabold text-sm text-slate-900 bg-white/70 px-2 py-0.5 rounded border border-slate-200/60">
                      {scanResult.attendee.registration_id}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-500 font-medium">Mobile:</span>
                    <span className="font-mono text-slate-700">+91 {scanResult.attendee.mobile}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-500 font-medium">Division &amp; Unit:</span>
                    <span className="font-bold text-slate-800 truncate max-w-[200px]">
                      {scanResult.attendee.division_name || 'N/A'} &bull; {scanResult.attendee.unit_name || ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-500 font-medium">Dars / College:</span>
                    <span className="font-semibold text-right max-w-[210px] truncate text-slate-800">
                      {scanResult.attendee.college}
                    </span>
                  </div>

                  {scanResult.type === 'duplicate' && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-amber-100 text-amber-900 font-medium text-[11px] border border-amber-300 space-y-0.5">
                      <p className="font-bold flex items-center gap-1 text-amber-950">
                        <Clock className="w-3.5 h-3.5 text-amber-700" /> Ticket Already Checked-In
                      </p>
                      <p>Time: <strong className="font-mono">{scanResult.attendee.check_in_time || 'Earlier'}</strong></p>
                      <p>Gate: <strong>{scanResult.attendee.check_in_by || 'Staff'}</strong></p>
                    </div>
                  )}

                  {scanResult.type === 'success' && (
                    <div className="mt-2 p-2 rounded-xl bg-emerald-600 text-white text-center text-xs font-bold shadow-xs">
                      ✓ Status Admitted &bull; Pass Accepted
                    </div>
                  )}
                </div>
              )}

              {!scanResult.attendee && (
                <p className="mt-2 text-xs text-rose-800 font-medium">
                  {scanResult.message}
                </p>
              )}

              <button
                type="button"
                onClick={() => setScanResult(null)}
                className="mt-3.5 w-full py-1.5 rounded-xl bg-white/90 hover:bg-white text-xs font-bold border border-slate-300 shadow-2xs transition cursor-pointer"
              >
                Dismiss &bull; Ready for Next
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs text-center py-10 text-slate-400 space-y-2">
              <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="font-heading font-bold text-slate-700 text-base">
                Ready to Scan Next Pass
              </h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Hold attendee QR code in front of the camera, or scan using a handheld barcode gun.
              </p>
            </div>
          )}

          {/* Manual Search Fallback Card */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span>Manual Lookup Fallback</span>
            </h4>
            <p className="text-[11px] text-slate-500 mb-2.5">
              If phone screen is cracked or dead, search attendee by mobile number or name:
            </p>

            <form onSubmit={handleManualSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Mobile (10 digits) or Reg ID or Name..."
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={manualSearching}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
              >
                {manualSearching ? '...' : 'Search'}
              </button>
            </form>

            {/* Manual Search Results */}
            {manualResults.length > 0 && (
              <div className="mt-3 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {manualResults.map((att) => (
                  <div key={att.id} className="py-2.5 flex items-center justify-between text-xs gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{att.full_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{att.registration_id} &bull; +91 {att.mobile}</p>
                      <p className="text-[10px] text-slate-500 truncate">{att.college}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {att.status === 'Admitted' ? (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-1 rounded-md border border-emerald-200">
                          Admitted
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleManualAdmit(att.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                          Admit
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
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h3 className="font-heading font-bold text-base text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Live Gate Admission Log</span>
            </h3>
            <p className="text-xs text-slate-500">Stream of recently verified admissions across gates</p>
          </div>
          <button
            type="button"
            onClick={refreshStats}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200 transition cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
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
                  <th className="py-2.5">Delegate Name</th>
                  <th className="py-2.5">Division &bull; Dars / College</th>
                  <th className="py-2.5">Admitted Time</th>
                  <th className="py-2.5">Gate / Usher</th>
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
                      <span className="font-semibold text-slate-800 block truncate max-w-[240px]">{att.college}</span>
                      <span className="text-[10px] text-slate-400">{att.division_name}</span>
                    </td>
                    <td className="py-2.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">{att.check_in_time || 'N/A'}</td>
                    <td className="py-2.5 text-slate-600 font-medium whitespace-nowrap">{att.check_in_by || 'Staff'}</td>
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
