import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Phone,
  Building2,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Ticket,
  ArrowRight,
  ArrowLeft,
  Check,
  Edit2,
  Zap,
  MapPin,
  Calendar,
  Search,
  Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../utils/api';

export default function SpotRegistrationPage({
  onRegistrationSuccess,
  eventSettings,
  onOpenLookup,
  onBack
}) {
  // Step 1: Name & Mobile verification; Step 2: Division & Academic institution
  const [step, setStep] = useState(1);
  const [checkingMobile, setCheckingMobile] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    mobile: '',
    division_id: '',
    institution_id: '',
    college: '',
    notes: ''
  });

  // Hierarchy Data
  const [divisions, setDivisions] = useState([]);
  const [institutions, setInstitutions] = useState([]);

  // Loading States
  const [loadingDivisions, setLoadingDivisions] = useState(false);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);

  // Validation & alerts
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);
  const [closedByServer, setClosedByServer] = useState(false);
  const [closedNoticeOverride, setClosedNoticeOverride] = useState('');

  const isSpotRegistrationOpen =
    !closedByServer &&
    (!eventSettings || String(eventSettings.spot_registration_open).toLowerCase() !== 'false');

  const closedMessage =
    closedNoticeOverride ||
    (eventSettings?.spot_registration_closed_message || '').trim() ||
    'Spot registration for Muthaallim Conference 2026 is currently closed. On-site delegate admissions are not being accepted at this time.';

  const step2Ref = useRef(null);
  const nameInputRef = useRef(null);
  const mobileInputRef = useRef(null);
  const lastCheckedKeyRef = useRef('');

  // Load divisions on mount
  useEffect(() => {
    async function loadDivisions() {
      try {
        setLoadingDivisions(true);
        const divs = await api.getDivisions();
        setDivisions(divs || []);
      } catch (err) {
        console.error('Failed to load divisions:', err);
      } finally {
        setLoadingDivisions(false);
      }
    }
    loadDivisions();
  }, []);

  // Automatic Check when Name (>=3 chars, English only) and Mobile (10 digits) are entered
  useEffect(() => {
    const cleanMobile = formData.mobile.replace(/\D/g, '');
    const trimmedName = formData.full_name.trim();

    if (cleanMobile.length < 10) {
      lastCheckedKeyRef.current = '';
      return;
    }

    // English name validation
    const isEnglishName = /^[a-zA-Z\s.'-]+$/.test(trimmedName);
    if (!isEnglishName && trimmedName.length >= 3) {
      setErrors((prev) => ({ ...prev, full_name: 'Name must be in English text only (A-Z)' }));
      return;
    }

    if (trimmedName.length >= 3 && isEnglishName && cleanMobile.length === 10) {
      const checkKey = `${cleanMobile}_${trimmedName.toLowerCase()}`;
      if (lastCheckedKeyRef.current === checkKey) return;

      const timer = setTimeout(async () => {
        lastCheckedKeyRef.current = checkKey;
        setCheckingMobile(true);
        setServerError('');
        setStatusMessage(null);

        try {
          const result = await api.checkAttendee(cleanMobile, trimmedName, 'spot');
          if (result.exists) {
            // Already registered -> Reveal existing ticket pass!
            confetti({ particleCount: 60, spread: 65, origin: { y: 0.6 } });
            onRegistrationSuccess(result.attendee);
          } else {
            // New spot registrant -> Proceed to Step 2
            setStep(2);
            setStatusMessage({
              type: 'success',
              text: '✓ Mobile verified. Please choose your Division and Institution below.'
            });
            setTimeout(() => {
              if (step2Ref.current) {
                step2Ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }
            }, 150);
          }
        } catch (err) {
          if (err.registrationClosed || err.status === 403) {
            setClosedByServer(true);
            setClosedNoticeOverride(err.message || '');
          } else {
            setServerError(err.message || 'Error verifying registration status.');
          }
        } finally {
          setCheckingMobile(false);
        }
      }, 350);

      return () => clearTimeout(timer);
    }
  }, [formData.full_name, formData.mobile]);

  // Handle Division Selection & load its child institutions
  const handleDivisionChange = async (e) => {
    const divId = e.target.value;
    setFormData((prev) => ({
      ...prev,
      division_id: divId,
      institution_id: '',
      college: ''
    }));
    if (errors.division_id) setErrors((prev) => ({ ...prev, division_id: null }));
    if (errors.college) setErrors((prev) => ({ ...prev, college: null }));

    if (!divId) {
      setInstitutions([]);
      return;
    }

    try {
      setLoadingInstitutions(true);
      const insts = await api.getInstitutions(divId);
      setInstitutions(insts || []);
    } catch (err) {
      console.error('Failed to load institutions for division:', err);
      setInstitutions([]);
    } finally {
      setLoadingInstitutions(false);
    }
  };

  // Handle Institution Selection
  const handleInstitutionChange = (e) => {
    const instId = e.target.value;
    const selected = institutions.find((i) => String(i.id) === String(instId));
    if (!selected) {
      setFormData((prev) => ({ ...prev, institution_id: '', college: '' }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      institution_id: instId,
      college: selected.name
    }));
    if (errors.college) setErrors((prev) => ({ ...prev, college: null }));
  };

  // Submit Spot Registration
  const handleSubmitFinal = async (e) => {
    e.preventDefault();
    setServerError('');

    const errs = {};
    if (!formData.division_id) errs.division_id = 'Please select your Division';
    if (!formData.institution_id || !formData.college) {
      errs.college = 'Please select your Academic Institution / Dars';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.spotRegisterAttendee({
        ...formData
      });

      confetti({
        particleCount: 100,
        spread: 75,
        origin: { y: 0.6 }
      });

      if (response.attendee) {
        onRegistrationSuccess(response.attendee);
      }
    } catch (err) {
      if (err.registrationClosed || err.status === 403) {
        setClosedByServer(true);
        setClosedNoticeOverride(err.message || '');
      } else {
        setServerError(err.message || 'Spot registration failed. Please check your inputs.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isSpotRegistrationOpen) {
    return (
      <div className="w-full min-h-screen pb-16 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 text-slate-100">
        {/* Top Navigation */}
        <div className="max-w-4xl mx-auto px-4 pt-6 pb-4 flex items-center justify-between">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Public Home</span>
            </button>
          )}

          {onOpenLookup && (
            <button
              type="button"
              onClick={onOpenLookup}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold border border-amber-500/30 transition cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Find Existing Ticket</span>
            </button>
          )}
        </div>

        <div className="max-w-2xl mx-auto px-3.5 sm:px-4 py-6">
          <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden">
            {/* Closed Top Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white p-5 sm:p-8 relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(#fb7185_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-200 border border-rose-400/35 mb-2.5">
                  <Lock className="w-3.5 h-3.5 text-rose-300" />
                  <span>Spot Registration Closed</span>
                </div>
                <h1 className="text-xl sm:text-3xl font-heading font-black tracking-tight text-white">
                  Spot Registration Is Closed
                </h1>
                <p className="text-xs sm:text-sm text-rose-100/85 mt-1.5 max-w-lg leading-relaxed">
                  {eventSettings?.event_subtitle || 'Muthaallim Conference 2026'}
                </p>
              </div>
            </div>

            {/* Closed Body */}
            <div className="p-5 sm:p-8 space-y-5">
              <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/70 border border-rose-200/80 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-heading font-bold text-sm sm:text-base text-slate-900">
                    On-Site Submissions Paused
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {closedMessage}
                  </p>
                </div>
              </div>

              {/* Already Registered Box */}
              {onOpenLookup && (
                <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                      <Ticket className="w-4 h-4 text-emerald-600" />
                      <span>Already Registered?</span>
                    </div>
                    <p className="text-xs text-emerald-900/85 leading-relaxed">
                      You can retrieve and download your conference entry pass using your mobile number or registration ID.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenLookup}
                    className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-heading font-bold shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer flex-shrink-0"
                  >
                    <Search className="w-4 h-4" />
                    <span>Find Your Ticket Pass</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedDivision = divisions.find((d) => String(d.id) === String(formData.division_id));
  const selectedInstitution = institutions.find((i) => String(i.id) === String(formData.institution_id));

  return (
    <div className="w-full min-h-screen pb-16 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 text-slate-100">
      {/* Top Banner & Navigation */}
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-4 flex items-center justify-between">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Public Home</span>
          </button>
        )}

        {onOpenLookup && (
          <button
            type="button"
            onClick={onOpenLookup}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold border border-amber-500/30 transition cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Find Existing Ticket</span>
          </button>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-3.5 sm:px-4 py-2">
        {/* Main Card */}
        <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden transition-all duration-300">
          {/* Card Top Header Banner */}
          <div className="bg-gradient-to-r from-amber-700 via-amber-600 to-orange-700 text-white p-5 sm:p-8 relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30 mb-2.5 backdrop-blur-xs">
                <Zap className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
                <span>Spot Registration Counter • Active</span>
              </div>
              <h1 className="text-xl sm:text-3xl font-heading font-black tracking-tight text-white">
                Spot Delegate Registration
              </h1>
              <p className="text-xs sm:text-sm text-amber-100/90 mt-1 max-w-lg leading-relaxed">
                {eventSettings?.event_subtitle || 'Muthaallim Conference 2026'} — Immediate On-Site Admission &amp; Digital Pass Issuance
              </p>
            </div>
          </div>

          {/* Quick Notice Banner */}
          <div className="bg-amber-50/90 border-b border-amber-200/80 px-4 sm:px-6 py-2.5 text-xs text-amber-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span className="font-semibold">
              This spot registration desk is open for immediate candidate admission and pass generation.
            </span>
          </div>

          {/* Progress Step Indicator */}
          <div className="bg-slate-50 px-4 sm:px-6 py-3 border-b border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step >= 1 ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}
              >
                1
              </span>
              <span className={step === 1 ? 'text-slate-900 font-bold' : 'text-slate-500'}>
                Delegate Verification
              </span>
            </div>

            <div className="w-12 h-0.5 bg-slate-200 rounded">
              <div
                className={`h-full bg-amber-600 transition-all duration-300 ${
                  step === 2 ? 'w-full' : 'w-0'
                }`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === 2 ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}
              >
                2
              </span>
              <span className={step === 2 ? 'text-slate-900 font-bold' : 'text-slate-400'}>
                Division &amp; Institution
              </span>
            </div>
          </div>

          {/* Form Body */}
          <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
            {serverError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3 animate-fadeIn">
                <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Notice</p>
                  <p className="text-rose-700">{serverError}</p>
                </div>
              </div>
            )}

            {statusMessage && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-medium">{statusMessage.text}</span>
              </div>
            )}

            {/* STEP 1: Name & Mobile */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-600" />
                  <span>Spot Candidate Details</span>
                </h3>
                {step === 2 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        nameInputRef.current?.focus();
                        nameInputRef.current?.select();
                      }}
                      className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 transition cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3 text-amber-600" />
                      <span>Edit Name</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        mobileInputRef.current?.focus();
                        mobileInputRef.current?.select();
                      }}
                      className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 transition cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3 text-amber-600" />
                      <span>Edit Mobile</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      ref={nameInputRef}
                      type="text"
                      placeholder="Enter name (English text only)"
                      disabled={checkingMobile}
                      value={formData.full_name}
                      onChange={(e) => {
                        const val = e.target.value;
                        const hasNonEnglish =
                          /[^\x20-\x7E]/.test(val) || (/[^a-zA-Z\s.'-]/.test(val) && val.length > 0);
                        if (hasNonEnglish) {
                          setErrors((prev) => ({
                            ...prev,
                            full_name: 'Please enter name in English text only (A-Z)'
                          }));
                        } else {
                          if (errors.full_name) setErrors((prev) => ({ ...prev, full_name: null }));
                        }
                        setFormData((prev) => ({ ...prev, full_name: val }));
                        if (val.trim().length < 3) {
                          lastCheckedKeyRef.current = '';
                          if (step === 2) setStep(1);
                        }
                      }}
                      className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${
                        errors.full_name
                          ? 'border-rose-300 bg-rose-50/30 focus:ring-rose-400'
                          : 'border-slate-300 bg-slate-50/50 hover:border-slate-400 focus:bg-white focus:border-amber-500 focus:ring-amber-500/20'
                      }`}
                    />
                    {formData.full_name.trim().length >= 3 && !errors.full_name && (
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-emerald-500 pointer-events-none">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  {errors.full_name && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">{errors.full_name}</p>
                  )}
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Mobile Number <span className="text-rose-500">*</span></span>
                    {formData.mobile.length === 10 && !checkingMobile && (
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> 10 digits
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="absolute inset-y-0 left-9 flex items-center pointer-events-none text-slate-400 text-xs font-medium tracking-wide select-none">
                      +91
                    </div>
                    <input
                      ref={mobileInputRef}
                      type="tel"
                      maxLength={10}
                      placeholder="98470 12345"
                      disabled={checkingMobile}
                      value={formData.mobile}
                      onChange={(e) => {
                        const num = e.target.value.replace(/\D/g, '');
                        setFormData((prev) => ({ ...prev, mobile: num }));
                        if (errors.mobile) setErrors((prev) => ({ ...prev, mobile: null }));
                        if (num.length < 10) {
                          lastCheckedKeyRef.current = '';
                          if (step === 2) setStep(1);
                        }
                      }}
                      className={`w-full pl-[68px] pr-9 py-2.5 rounded-xl border text-sm font-mono tracking-wide transition-all focus:outline-none focus:ring-2 ${
                        errors.mobile
                          ? 'border-rose-300 bg-rose-50/30 focus:ring-rose-400'
                          : 'border-slate-300 bg-slate-50/50 hover:border-slate-400 focus:bg-white focus:border-amber-500 focus:ring-amber-500/20'
                      }`}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                      {checkingMobile ? (
                        <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                      ) : formData.mobile.length === 10 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : null}
                    </div>
                  </div>

                  {errors.mobile ? (
                    <p className="mt-1 text-xs text-rose-600 font-medium">{errors.mobile}</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>10-digit mobile number</span>
                      <span className="font-mono">{formData.mobile.length}/10 digits</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Real-time verification notice */}
              {step === 1 && (
                <div className="pt-1">
                  {checkingMobile ? (
                    <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5 animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-600 flex-shrink-0" />
                      <span className="font-semibold">
                        Verifying registration for {formData.full_name} (+91 {formData.mobile})...
                      </span>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-500 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <span>
                        {formData.full_name.trim().length >= 3 && formData.mobile.length === 10
                          ? 'Checking registration status...'
                          : 'Enter your Name and 10-digit Mobile number to automatically check for existing passes.'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="pt-1">
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span>
                      Spot delegate verified: <strong>{formData.full_name}</strong> (+91 {formData.mobile})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* STEP 2: Division & Institution Hierarchy */}
            {step === 2 && (
              <div ref={step2Ref} className="pt-4 border-t border-slate-200/80 space-y-5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-600" />
                    <span>Division &amp; Academic Institution</span>
                  </h3>
                </div>

                {/* Division Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Division <span className="text-rose-500">*</span></span>
                    {loadingDivisions && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />}
                  </label>
                  <select
                    value={formData.division_id}
                    onChange={handleDivisionChange}
                    disabled={loadingDivisions}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${
                      errors.division_id
                        ? 'border-rose-300 bg-rose-50/30 focus:ring-rose-400'
                        : 'border-slate-300 bg-slate-50/50 hover:border-slate-400 focus:bg-white focus:border-amber-500 focus:ring-amber-500/20'
                    }`}
                  >
                    <option value="">-- Select Division --</option>
                    {divisions.map((div) => (
                      <option key={div.id} value={div.id}>
                        {div.name} {div.code ? `(${div.code})` : ''}
                      </option>
                    ))}
                  </select>
                  {errors.division_id && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">{errors.division_id}</p>
                  )}
                </div>

                {/* Academic Institution / Dars Dropdown */}
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-amber-600" />
                      <span>Academic Institution</span>
                    </h3>
                    {formData.division_id && (
                      <span className="text-[11px] text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        {institutions.length} institutions in {selectedDivision?.name || 'division'}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Dars / Dawa College <span className="text-rose-500">*</span></span>
                      {loadingInstitutions && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />}
                    </label>
                    <select
                      value={formData.institution_id}
                      onChange={handleInstitutionChange}
                      disabled={!formData.division_id || loadingInstitutions}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${
                        !formData.division_id
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed font-medium'
                          : errors.college
                          ? 'border-rose-300 bg-rose-50/30 focus:ring-rose-400'
                          : 'border-slate-300 bg-slate-50/50 hover:border-slate-400 focus:bg-white focus:border-amber-500 focus:ring-amber-500/20'
                      }`}
                    >
                      {!formData.division_id ? (
                        <option value="">-- Please Select Division Above First --</option>
                      ) : loadingInstitutions ? (
                        <option value="">Loading institutions for {selectedDivision?.name || 'division'}...</option>
                      ) : institutions.length === 0 ? (
                        <option value="">No institutions configured for this division</option>
                      ) : (
                        <>
                          <option value="">-- Select Academic Institution / Dars --</option>
                          {institutions.map((inst) => (
                            <option key={inst.id} value={inst.id}>
                              {inst.name} {inst.code ? `(${inst.code})` : ''}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    {errors.college && (
                      <p className="mt-1 text-xs text-rose-600 font-medium">{errors.college}</p>
                    )}
                  </div>
                </div>

                {/* Complete Spot Registration Button */}
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={handleSubmitFinal}
                    disabled={submitting}
                    className="w-full py-3.5 sm:py-4 px-4 sm:px-6 rounded-2xl font-heading font-extrabold text-sm sm:text-base text-white bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-700 shadow-xl shadow-amber-600/25 transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Issuing Spot Entry Pass...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 text-amber-200" />
                        <span>Generate Spot Admission Pass</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
