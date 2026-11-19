import React, { useState, useEffect } from 'react';
import { Lock, Unlock, X, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

export default function RegistrationStatusModal({
  isOpen,
  currentlyOpen,
  targetType = 'normal', // 'normal' | 'spot'
  initialClosedMessage = '',
  onClose,
  onConfirm,
  loading = false
}) {
  const [closedMessage, setClosedMessage] = useState(initialClosedMessage || '');

  useEffect(() => {
    if (isOpen) {
      setClosedMessage(initialClosedMessage || '');
    }
  }, [isOpen, initialClosedMessage]);

  if (!isOpen) return null;

  const isClosing = currentlyOpen;
  const isSpot = targetType === 'spot';
  const labelType = isSpot ? 'Spot Registration' : 'Normal Registration';

  const handleConfirm = () => {
    onConfirm({
      type: targetType,
      nextOpen: !currentlyOpen,
      closedMessage: closedMessage.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative space-y-5">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer disabled:opacity-50"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Heading */}
        <div className="flex items-start gap-3.5 pr-6">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border shadow-xs ${
              isClosing
                ? 'bg-rose-50 text-rose-600 border-rose-200'
                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
            }`}
          >
            {isClosing ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-heading font-extrabold text-lg text-slate-900 leading-tight">
              {isClosing ? `Close ${labelType}?` : `Reopen ${labelType}?`}
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {isClosing
                ? (isSpot
                    ? 'New spot delegate registrations will be blocked immediately on /spot-registration.'
                    : 'New online delegate registrations will be blocked immediately on both the website and API.')
                : (isSpot
                    ? 'The Spot Registration desk will immediately be opened for on-site delegate admission.'
                    : 'Delegates from eligible institutions with available quota will immediately be able to register again.')}
            </p>
          </div>
        </div>

        {/* Impact Notice */}
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
            isClosing
              ? 'bg-amber-50/80 border-amber-200 text-amber-900'
              : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
          }`}
        >
          {isClosing ? (
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="leading-relaxed">
            {isClosing ? (
              <span>
                Already-registered delegates will <strong>still be able to retrieve and download</strong> their digital passes, and gate check-in scanning will remain active.
              </span>
            ) : (
              <span>
                {isSpot
                  ? <>The spot registration page (<strong>/spot-registration</strong>) will be active and open for immediate delegate submissions.</>
                  : <>The public registration form and <strong>Register Now</strong> actions will be restored right away across the conference portal.</>}
              </span>
            )}
          </div>
        </div>

        {/* Optional Custom Closed Message (when closing) */}
        {isClosing && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Public Closed Notice Message <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={closedMessage}
              onChange={(e) => setClosedMessage(e.target.value)}
              disabled={loading}
              placeholder={
                isSpot
                  ? 'e.g. Spot registration for Muthaallim Conference 2026 is currently closed.'
                  : 'e.g. Online registration for Muthaallim Conference 2026 is now closed. Please contact your division coordinator for assistance.'
              }
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 resize-none"
            />
            <p className="text-[11px] text-slate-400">
              Leave blank to display the standard {isSpot ? 'spot registration' : 'registration'} closed notice.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-70 ${
              isClosing
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isClosing ? 'Closing...' : 'Reopening...'}</span>
              </>
            ) : isClosing ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Close {labelType}</span>
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5" />
                <span>Reopen {labelType}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
