import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Phone,
  Building2,
  MapPin,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Ticket,
  ArrowRight,
  ArrowLeft,
  Search,
  Check,
  Plus
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../utils/api';

export default function RegistrationForm({
  onRegistrationSuccess,
  initialMobile = '',
  eventSettings
}) {
  // Step 1: Name & Mobile verification; Step 2: Location hierarchy & college
  const [step, setStep] = useState(1);
  const [checkingMobile, setCheckingMobile] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    mobile: initialMobile,
    division_id: '',
    sector_id: '',
    unit_id: '',
    college: '',
    custom_college: '',
    notes: ''
  });

  // Hierarchy Data
  const [divisions, setDivisions] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [units, setUnits] = useState([]);
  const [colleges, setColleges] = useState([]);

  // College Addition State
  const [addingCollege, setAddingCollege] = useState(false);
  const [newCollegeName, setNewCollegeName] = useState('');
  const [savingNewCollege, setSavingNewCollege] = useState(false);
  const [collegeAddedSuccess, setCollegeAddedSuccess] = useState('');

  // Dynamic Loading States
  const [loadingDivisions, setLoadingDivisions] = useState(false);
  const [loadingSectors, setLoadingSectors] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Validation & alerts
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);

  const step2Ref = useRef(null);
  const lastCheckedKeyRef = useRef('');

  // Handle adding new custom Dars or College (English text only, persists to DB)
  const handleAddNewCollege = async () => {
    const trimmed = newCollegeName.trim();
    if (!trimmed) {
      setErrors(prev => ({ ...prev, custom_college: 'Please enter institution or Dars name' }));
      return;
    }
    // English text only validation
    if (!/^[a-zA-Z0-9\s.,'()&/-]+$/.test(trimmed)) {
      setErrors(prev => ({ ...prev, custom_college: 'Institution name must be in English text only (A-Z)' }));
      return;
    }
    try {
      setSavingNewCollege(true);
      setErrors(prev => ({ ...prev, custom_college: null }));
      const result = await api.createCollege({ name: trimmed });
      const addedName = result.name || trimmed;

      // Update colleges list if not present, sorted
      setColleges(prev => {
        if (prev.some(c => c.name.toLowerCase() === addedName.toLowerCase())) return prev;
        return [...prev, { id: result.id || Date.now(), name: addedName }].sort((a, b) => a.name.localeCompare(b.name));
      });

      // Select the newly added institution
      setFormData(prev => ({
        ...prev,
        college: addedName,
        custom_college: ''
      }));
      setNewCollegeName('');
      setAddingCollege(false);
      setCollegeAddedSuccess(`✓ "${addedName}" added to directory and selected!`);
      setTimeout(() => setCollegeAddedSuccess(''), 4000);
    } catch (err) {
      setErrors(prev => ({ ...prev, custom_college: err.message || 'Failed to add institution' }));
    } finally {
      setSavingNewCollege(false);
    }
  };

  // Automatic Check when Name (>=3 chars, English only) and Mobile (10 digits) are entered
  useEffect(() => {
    if (step !== 1) return;

    const cleanMobile = formData.mobile.replace(/\D/g, '');
    const trimmedName = formData.full_name.trim();

    // Check if name contains non-English characters
    const isEnglishName = /^[a-zA-Z\s.'-]+$/.test(trimmedName);
    if (!isEnglishName && trimmedName.length >= 3) {
      setErrors(prev => ({ ...prev, full_name: 'Name must be filled in English text only (A-Z)' }));
      return;
    }

    // Check if both Name and 10-digit Mobile are entered
    if (trimmedName.length >= 3 && isEnglishName && cleanMobile.length === 10) {
      const checkKey = `${cleanMobile}_${trimmedName.toLowerCase()}`;
      if (lastCheckedKeyRef.current === checkKey) return;

      const timer = setTimeout(async () => {
        lastCheckedKeyRef.current = checkKey;
        setCheckingMobile(true);
        setServerError('');
        setStatusMessage(null);

        try {
          const result = await api.checkAttendee(cleanMobile, trimmedName);
          if (result.exists) {
            // Attendee already registered -> Automatically reveal ticket pass!
            confetti({ particleCount: 60, spread: 65, origin: { y: 0.6 } });
            onRegistrationSuccess(result.attendee);
          } else {
            // Not registered -> Automatically advance to Step 2!
            setStep(2);
            setStatusMessage({
              type: 'success',
              text: '✓ Mobile verified. Please select your Division and College below.'
            });
            setTimeout(() => {
              if (step2Ref.current) {
                step2Ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }
            }, 150);
          }
        } catch (err) {
          setServerError(err.message || 'Error checking registration status.');
        } finally {
          setCheckingMobile(false);
        }
      }, 350);

      return () => clearTimeout(timer);
    }
  }, [formData.full_name, formData.mobile, step]);

  // Load initial divisions and colleges
  useEffect(() => {
    async function loadData() {
      try {
        setLoadingDivisions(true);
        const [divs, clgs] = await Promise.all([
          api.getDivisions(),
          api.getColleges()
        ]);
        setDivisions(divs);
        setColleges(clgs);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        setLoadingDivisions(false);
      }
    }
    loadData();
  }, []);

  // Handle Division Selection
  const handleDivisionChange = (e) => {
    const divId = e.target.value;
    setFormData(prev => ({
      ...prev,
      division_id: divId,
      sector_id: '',
      unit_id: ''
    }));
    if (errors.division_id) setErrors(prev => ({ ...prev, division_id: null }));
  };

  // Step 1: Validate & Check if user is already registered
  const handleCheckStep1 = async (e) => {
    if (e) e.preventDefault();
    setServerError('');
    setStatusMessage(null);

    const errs = {};
    if (!formData.full_name.trim()) {
      errs.full_name = 'Please enter your full name';
    } else if (formData.full_name.trim().length < 3) {
      errs.full_name = 'Name should be at least 3 characters';
    } else if (!/^[a-zA-Z\s.'-]+$/.test(formData.full_name.trim())) {
      errs.full_name = 'Please enter your name in English text only (A-Z)';
    }

    const cleanMobile = formData.mobile.replace(/\D/g, '');
    if (!cleanMobile) {
      errs.mobile = 'Mobile number is required';
    } else if (cleanMobile.length !== 10) {
      errs.mobile = 'Please enter a valid 10-digit mobile number';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setCheckingMobile(true);
    try {
      const result = await api.checkAttendee(cleanMobile, formData.full_name.trim());
      if (result.exists) {
        // Attendee already registered -> Show their ticket immediately!
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        onRegistrationSuccess(result.attendee);
      } else {
        // Not registered -> Advance to Step 2 to enter hierarchy and college
        setStep(2);
        setStatusMessage({
          type: 'success',
          text: '✓ Mobile verified. Please select your Division and College below.'
        });
        setTimeout(() => {
          if (step2Ref.current) {
            step2Ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 150);
      }
    } catch (err) {
      setServerError(err.message || 'Error checking registration status.');
    } finally {
      setCheckingMobile(false);
    }
  };

  // Step 2: Submit Full Registration
  const handleSubmitFinal = async (e) => {
    e.preventDefault();
    setServerError('');

    const errs = {};
    if (!formData.division_id) errs.division_id = 'Please select your Division';

    let collegeToSubmit = formData.college;
    if (addingCollege || formData.college === 'Other') {
      const customVal = (newCollegeName || formData.custom_college || '').trim();
      if (!customVal) {
        errs.custom_college = 'Please enter your Dars / College name (English text only)';
      } else if (!/^[a-zA-Z0-9\s.,'()&/-]+$/.test(customVal)) {
        errs.custom_college = 'Institution name must be in English text only (A-Z)';
      } else {
        collegeToSubmit = customVal;
      }
    } else if (!formData.college) {
      errs.college = 'Please select your Dars / Dawa College';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      // If custom institution was entered, ensure it is added to colleges directory in DB
      if ((addingCollege || formData.college === 'Other') && collegeToSubmit) {
        try {
          await api.createCollege({ name: collegeToSubmit });
        } catch (ignored) { }
      }

      const response = await api.registerAttendee({
        ...formData,
        college: collegeToSubmit,
        custom_college: ''
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
      setServerError(err.message || 'Registration failed. Please check inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDivision = divisions.find(d => String(d.id) === String(formData.division_id));
  const selectedSector = sectors.find(s => String(s.id) === String(formData.sector_id));

  return (
    <div id="registration-section" className="w-full max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      {/* Registration Card */}
      <div className="bg-white rounded-3xl shadow-2xl shadow-slate-300/60 border border-slate-200/90 overflow-hidden transition-all duration-300">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white p-4 sm:p-8 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(#34d399_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Official Delegate Pass</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-heading font-black tracking-tight text-white">
              Get Your Ticket
            </h2>
            <p className="text-xs sm:text-sm text-emerald-200/90 mt-1 max-w-lg">
              Let’s meet at the Mutha'allim Conference! Register now.
            </p>
          </div>
        </div>

        {/* Progress Step Indicator */}
        <div className="bg-slate-50 px-3.5 sm:px-6 py-3 border-b border-slate-200/80 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
              1
            </span>
            <span className={step === 1 ? 'text-slate-900 font-bold' : 'text-slate-500'}>
              Basic Verification
            </span>
          </div>

          <div className="w-12 h-0.5 bg-slate-200 rounded">
            <div className={`h-full bg-emerald-600 transition-all duration-300 ${step === 2 ? 'w-full' : 'w-0'}`} />
          </div>

          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step === 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
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

          {/* ================= STEP 1: Name & Mobile ================= */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                <span>Delegate Credentials</span>
              </h3>
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => {
                    lastCheckedKeyRef.current = '';
                    setStep(1);
                  }}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition"
                >
                  <ArrowLeft className="w-3 h-3" /> Change Name/Mobile
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Full Name <span className="text-rose-500">*</span></span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Enter your name (in English only)"
                    disabled={step === 2 || checkingMobile}
                    value={formData.full_name}
                    onChange={(e) => {
                      const val = e.target.value;
                      // English text check (A-Z, a-z, spaces, dots, hyphens, apostrophes)
                      const hasNonEnglish = /[^\x20-\x7E]/.test(val) || (/[^a-zA-Z\s.'-]/.test(val) && val.length > 0);
                      if (hasNonEnglish) {
                        setErrors(prev => ({ ...prev, full_name: 'Please enter your name in English text only (A-Z)' }));
                      } else {
                        if (errors.full_name) setErrors(prev => ({ ...prev, full_name: null }));
                      }
                      setFormData({ ...formData, full_name: val });
                    }}
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${step === 2
                      ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed font-medium'
                      : errors.full_name
                        ? 'border-rose-300 bg-rose-50/30 focus:ring-rose-400'
                        : 'border-slate-300 bg-slate-50/50 hover:border-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20'
                      }`}
                  />
                  {formData.full_name.trim().length >= 3 && !errors.full_name && step === 1 && (
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="absolute inset-y-0 left-9 flex items-center pointer-events-none text-slate-400 text-xs font-medium tracking-wide select-none">
                    +91
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="98470 12345"
                    disabled={step === 2 || checkingMobile}
                    value={formData.mobile}
                    onChange={(e) => {
                      const num = e.target.value.replace(/\D/g, '');
                      setFormData({ ...formData, mobile: num });
                      if (errors.mobile) setErrors({ ...errors, mobile: null });
                    }}
                    className={`w-full pl-[68px] pr-9 py-2.5 rounded-xl border text-sm font-mono tracking-wide transition-all focus:outline-none focus:ring-2 ${step === 2
                      ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed font-medium'
                      : errors.mobile
                        ? 'border-rose-300 bg-rose-50/30 focus:ring-rose-400'
                        : 'border-slate-300 bg-slate-50/50 hover:border-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20'
                      }`}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                    {checkingMobile ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    ) : formData.mobile.length === 10 && step === 1 ? (
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

            {/* Real-time feedback status banner */}
            {step === 1 && (
              <div className="pt-1">
                {checkingMobile ? (
                  <div className="p-3 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5 animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600 flex-shrink-0" />
                    <span className="font-semibold">
                      Checking registration status for {formData.full_name} (+91 {formData.mobile})...
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-500 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    <span>
                      {formData.full_name.trim().length >= 3 && formData.mobile.length === 10
                        ? 'Verifying registration automatically...'
                        : 'Enter your Name and 10-digit Mobile number to automatically check your registration status.'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ================= STEP 2: Remaining Fields (Division & College) ================= */}
          {step === 2 && (
            <div ref={step2Ref} className="pt-4 border-t border-slate-200/80 space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>Division &amp; Academic Details</span>
                </h3>
              </div>

              {/* Division Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Division <span className="text-rose-500">*</span></span>
                  {loadingDivisions && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />}
                </label>
                <select
                  value={formData.division_id}
                  onChange={handleDivisionChange}
                  disabled={loadingDivisions}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${errors.division_id
                    ? 'border-rose-300 bg-rose-50/30 focus:ring-rose-400'
                    : 'border-slate-300 bg-slate-50/50 hover:border-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20'
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

              {/* Dars / Dawa College */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-amber-500" />
                    <span>Academic Institution</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingCollege(!addingCollege);
                      setNewCollegeName('');
                      if (errors.custom_college) setErrors(prev => ({ ...prev, custom_college: null }));
                    }}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{addingCollege ? 'Cancel & choose from list' : 'Not in list? Add yours'}</span>
                  </button>
                </div>

                {collegeAddedSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{collegeAddedSuccess}</span>
                  </div>
                )}

                {!addingCollege ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Dars / Dawa College <span className="text-rose-500">*</span></span>
                      <span className="text-[10px] text-slate-400 font-normal">Select from verified directory</span>
                    </label>
                    <select
                      value={formData.college}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'ADD_NEW') {
                          setAddingCollege(true);
                          setNewCollegeName('');
                          setFormData(prev => ({ ...prev, college: '' }));
                        } else {
                          setFormData(prev => ({ ...prev, college: val, custom_college: '' }));
                        }
                        if (errors.college) setErrors(prev => ({ ...prev, college: null }));
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${errors.college
                        ? 'border-rose-300 bg-rose-50/30 focus:ring-rose-400'
                        : 'border-slate-300 bg-slate-50/50 hover:border-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20'
                        }`}
                    >
                      <option value="">-- Select Institution or Dars --</option>
                      {colleges.map((c) => (
                        <option key={c.id || c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                      <option value="ADD_NEW" className="font-bold text-emerald-700 bg-emerald-50">
                        + Add New Dars / College (Type custom name)
                      </option>
                    </select>
                    {errors.college && (
                      <p className="mt-1 text-xs text-rose-600 font-medium">{errors.college}</p>
                    )}
                  </div>
                ) : (
                  <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-emerald-950">
                        Add New Dars / College to Directory <span className="text-rose-500">*</span>
                      </label>
                    </div>
                    <p className="text-[11px] text-emerald-800/80">
                      Type the name of your Dars or Islamic institution. Once added, it will be saved to the database and visible for other delegates to select.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Busthanul Uloom Mahallu Dars, Kondotty"
                        value={newCollegeName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewCollegeName(val);
                          if (errors.custom_college) setErrors(prev => ({ ...prev, custom_college: null }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddNewCollege();
                          }
                        }}
                        className={`flex-1 px-3.5 py-2.5 rounded-xl border bg-white text-sm transition-all focus:outline-none focus:ring-2 ${errors.custom_college
                          ? 'border-rose-300 focus:ring-rose-400'
                          : 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/20'
                          }`}
                      />
                      <button
                        type="button"
                        onClick={handleAddNewCollege}
                        disabled={savingNewCollege || !newCollegeName.trim()}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        {savingNewCollege ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        <span>Add &amp; Select</span>
                      </button>
                    </div>
                    {errors.custom_college && (
                      <p className="text-xs text-rose-600 font-medium">{errors.custom_college}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Complete Registration Button */}
              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleSubmitFinal}
                  disabled={submitting}
                  className="w-full py-3.5 sm:py-4 px-4 sm:px-6 rounded-2xl font-heading font-extrabold text-sm sm:text-base text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 shadow-xl shadow-emerald-700/25 transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-75"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Issuing Digital Ticket Pass...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Registration</span>
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
  );
}
