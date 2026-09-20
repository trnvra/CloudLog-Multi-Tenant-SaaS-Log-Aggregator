import React from "react";
import { BarChart2, AlertTriangle, ShieldCheck, Zap, ArrowUpRight } from "lucide-react";

export default function MetricsCards({
  totalCount = 0,
  errorCount = 0,
  fatalCount = 0,
  warnCount = 0,
  infoCount = 0,
  logsBufferCount = 0,
  activeAlertsCount = 1,
  ingestRate = 0,
}) {
  const errRatePct = totalCount > 0 ? ((errorCount / totalCount) * 100).toFixed(2) : "0.00";

  const totalBreakdown = (infoCount + warnCount + errorCount) || 1;
  const infoBarPct = Math.min(90, Math.max(10, Math.round((infoCount / totalBreakdown) * 100)));
  const warnBarPct = Math.min(80, Math.max(5, Math.round((warnCount / totalBreakdown) * 100)));
  const errBarPct = Math.max(0, 100 - infoBarPct - warnBarPct);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4 font-mono">
      {/* 1. LOGS INGESTED (24H) */}
      <div className="bg-[#0B0F17] border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-xl relative overflow-hidden transition hover:border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
            LOGS INGESTED (24H)
          </span>
          <div className="p-1.5 rounded-lg bg-cyan-950/60 text-cyan-400 border border-cyan-500/30">
            <BarChart2 className="w-4 h-4" />
          </div>
        </div>

        <div className="my-2.5 flex items-baseline justify-between">
          <h3 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
            {totalCount.toLocaleString()}
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" />
            +12.4%
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
          <span>
            Live buffer: <strong className="text-white font-bold">{logsBufferCount.toLocaleString()} events</strong>
          </span>
          <span className="text-slate-500">vs 1.63M prev</span>
        </div>
      </div>

      {/* 2. ERRORS & FATAL RATE */}
      <div className="bg-[#0B0F17] border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-xl relative overflow-hidden transition hover:border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
            ERRORS & FATAL RATE
          </span>
          <div className="p-1.5 rounded-lg bg-rose-950/60 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <div className="my-2.5 flex items-baseline justify-between">
          <div className="flex items-baseline space-x-2">
            <h3 className="text-2xl lg:text-3xl font-black text-rose-400 tracking-tight">
              {errorCount.toLocaleString()}
            </h3>
            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[11px] font-bold border border-rose-500/30">
              {errRatePct}%
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-sans">
            {fatalCount > 0 ? `${fatalCount} fatal` : "0 unhandled"}
          </span>
        </div>

        {/* Severity Color Bar */}
        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden flex border border-slate-800/80">
          <div className="bg-emerald-500 transition-all" style={{ width: `${infoBarPct}%` }} />
          <div className="bg-amber-400 transition-all" style={{ width: `${warnBarPct}%` }} />
          <div className="bg-rose-500 transition-all" style={{ width: `${errBarPct}%` }} />
        </div>
      </div>

      {/* 3. ACTIVE ALERT RULES */}
      <div className="bg-[#0B0F17] border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-xl relative overflow-hidden transition hover:border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
            ACTIVE ALERT RULES
          </span>
          <div className="p-1.5 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="my-2.5 flex items-baseline justify-between">
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
              {activeAlertsCount}
            </h3>
            <span className="text-sm text-slate-500 font-bold"> / 29</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            All Healthy
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
          <span>Slack & PagerDuty Webhooks</span>
          <span className="text-slate-500">2 muting</span>
        </div>
      </div>

      {/* 4. THROUGHPUT & QUEUE */}
      <div className="bg-[#0B0F17] border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-xl relative overflow-hidden transition hover:border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
            THROUGHPUT & QUEUE
          </span>
          <div className="p-1.5 rounded-lg bg-purple-950/60 text-purple-400 border border-purple-500/30">
            <Zap className="w-4 h-4" />
          </div>
        </div>

        <div className="my-2.5 flex items-baseline justify-between">
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
              {ingestRate.toLocaleString()}
            </h3>
            <span className="text-xs text-purple-400 font-extrabold">msg/sec</span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/40">
            99.98% SLA
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
          <span>
            BullMQ Lag: <strong className="text-emerald-400 font-bold">3.2 ms</strong>
          </span>
          <span className="text-slate-500">Cap: 15k/s</span>
        </div>
      </div>
    </div>
  );
}


