import React, { useState } from 'react';
import { Search, Loader2, AlertCircle, Ticket, Phone, Hash } from 'lucide-react';
import { api } from '../utils/api';

export default function TicketLookup({ onTicketFound, onGoToRegister }) {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');

    const clean = identifier.trim();
    if (!clean) {
      setError('Please enter a Mobile Number or Registration ID');
      return;
    }

    setLoading(true);
    try {
      const attendee = await api.getTicket(clean);
      onTicketFound(attendee);
    } catch (err) {
      setError(err.message || 'No attendee found matching this identifier. Please verify and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-3 sm:px-4 py-8 sm:py-12">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-sm">
          <Search className="w-6 h-6" />
        </div>
        <h2 className="text-xl sm:text-2xl font-heading font-bold text-slate-900">
          Find Your Conference Pass
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Enter your registered 10-digit mobile number or unique Registration ID.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xl border border-slate-200">
        <form onSubmit={handleSearch} className="space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mobile Number or Registration ID
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. 9847123456 or MC2026-PVE-1001"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (error) setError('');
                }}
                className="w-full pl-3.5 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl font-heading font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 disabled:opacity-75"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Searching Records...</span>
              </>
            ) : (
              <>
                <Ticket className="w-4 h-4" />
                <span>Retrieve Ticket Pass</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Haven't registered yet?{' '}
            <button
              onClick={onGoToRegister}
              className="font-semibold text-emerald-700 hover:underline"
            >
              Register Now
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
