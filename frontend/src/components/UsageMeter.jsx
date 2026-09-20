import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { HardDrive, AlertCircle, RefreshCw, Zap } from "lucide-react";
import client from "../api/client";

export default function UsageMeter({ currentUser, compact = false }) {
  const [usage, setUsage] = useState({
    currentMonthUsage: currentUser?.currentMonthUsage || 0,
    monthlyLogLimit: currentUser?.monthlyLogLimit || 10000,
    percentage: Math.min(
      100,
      Math.round(
        ((currentUser?.currentMonthUsage || 0) /
          (currentUser?.monthlyLogLimit || 10000)) *
          100
      )
    ),
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchUsage = async () => {
    setIsLoading(true);
    try {
      const res = await client.get("/auth/usage");
      if (res.data) {
        setUsage({
          currentMonthUsage: res.data.currentMonthUsage || 0,
          monthlyLogLimit: res.data.monthlyLogLimit || 10000,
          percentage: res.data.percentage || 0,
        });
      }
    } catch {
      /* quiet fallback */
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
    // Poll usage every 10 seconds to keep meter real-time
    const interval = setInterval(fetchUsage, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const current = usage.currentMonthUsage;
  const limit = usage.monthlyLogLimit;
  const pct = Math.min(100, Math.round((current / limit) * 100));

  // Determine indicator color
  const isHigh = pct >= 90;
  const isMed = pct >= 70 && pct < 90;

  const barColor = isHigh
    ? "bg-gradient-to-r from-rose-500 to-red-600"
    : isMed
    ? "bg-gradient-to-r from-amber-500 to-orange-500"
    : "bg-gradient-to-r from-cyan-500 to-blue-500";

  const badgeBorder = isHigh
    ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
    : isMed
    ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
    : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300";

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <div
          className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center space-x-2.5 shadow-sm transition ${badgeBorder}`}
          title={`Monthly Tier Limit: ${current.toLocaleString()} / ${limit.toLocaleString()} logs used (${pct}%)`}
        >
          <HardDrive className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <div className="flex flex-col space-y-1 min-w-[110px]">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span>{current.toLocaleString()} / {limit.toLocaleString()}</span>
              <span className="ml-1 text-[10px] text-slate-400">({pct}%)</span>
            </div>
            {/* Mini Progress Bar */}
            <div className="w-full bg-slate-900/80 rounded-full h-1 overflow-hidden border border-slate-800">
              <div
                className={`h-full ${barColor} transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Dedicated Plan Upgrade Badge (Navigates to /billing without opening modal) */}
        <Link
          to="/billing"
          className="px-2.5 py-1.5 rounded-lg text-xs font-extrabold bg-gradient-to-r from-cyan-500/20 to-blue-600/20 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 transition flex items-center space-x-1 shadow-sm"
          title="Manage plan & billing settings (Redirects to /billing)"
        >
          <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
          <span className="hidden md:inline">
            {limit >= 10000000 ? "Enterprise" : limit >= 500000 ? "Pro Tier" : "Free Plan"}
          </span>
          <span className="text-[10px] text-cyan-400 underline ml-0.5">Manage</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0F17] p-4 rounded-xl border border-slate-800 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <HardDrive className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            Monthly Log Usage Meter
          </h4>
        </div>
        <button
          onClick={fetchUsage}
          className="text-slate-400 hover:text-cyan-400 transition text-[11px] flex items-center gap-1"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="flex items-center justify-between font-mono text-xs">
        <span className="text-white font-bold text-sm">
          {current.toLocaleString()}{" "}
          <span className="text-slate-400 text-xs font-normal">
            / {limit.toLocaleString()} Logs Used
          </span>
        </span>
        <span
          className={`font-bold px-2 py-0.5 rounded text-[10px] ${
            isHigh
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              : isMed
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
          }`}
        >
          {pct}% Quota
        </span>
      </div>

      {/* Main Progress Bar */}
      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
        <div
          className={`h-full ${barColor} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {isHigh && (
        <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded-lg text-[11px] text-rose-400 flex items-center space-x-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Quota near limit! Log ingestion will be blocked at {limit.toLocaleString()} logs.</span>
        </div>
      )}
    </div>
  );
}
