import React from 'react';
import { GraduationCap } from 'lucide-react';

export default function CollegeProgressCard({ col, showDivisionName = true }) {
  const quota = Number(col.allocated_quota) || 0;
  const count = Number(col.total_attendees) || 0;
  const pct = quota > 0 ? Math.round((count / quota) * 100) : 0;
  const isFull = quota > 0 && count >= quota;

  return (
    <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-emerald-300 transition space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <GraduationCap
            className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isFull ? 'text-emerald-600' : 'text-amber-500'}`}
          />
          <div className="min-w-0">
            <span
              className="font-semibold text-xs text-slate-800 leading-snug block truncate"
              title={col.college}
            >
              {col.college}
            </span>
            {showDivisionName && col.division_name && (
              <span className="text-[10px] text-slate-400 block truncate">
                {col.division_name}
              </span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="font-bold text-xs text-slate-900">
            {count}{quota > 0 ? ` / ${quota}` : ''}
          </span>
          {quota > 0 ? (
            <span
              className={`text-[11px] font-bold ml-1 ${
                isFull ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              ({pct}%)
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 ml-1">(No quota)</span>
          )}
        </div>
      </div>

      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${
            isFull ? 'bg-emerald-600' : 'bg-amber-500'
          }`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-slate-400">
        <span>
          Admitted: <strong className="text-slate-600">{col.admitted_count}</strong>
        </span>
        <span>
          {quota > 0
            ? `${pct}% of quota (${count}/${quota})`
            : `${count} registered`}
        </span>
      </div>
    </div>
  );
}
