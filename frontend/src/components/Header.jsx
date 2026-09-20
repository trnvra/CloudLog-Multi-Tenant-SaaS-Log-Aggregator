import React from "react";
import {
  Bell,
  Zap,
  Key,
  ChevronDown,
  Cloud,
} from "lucide-react";
import UsageMeter from "./UsageMeter";

export default function Header({
  isConnected,
  isPaused,
  setIsPaused,
  onOpenAlerts,
  onOpenMockGenerator,
  onOpenAuthModal,
  currentUser,
  firedAlertsCount = 14,
}) {
  return (
    <header className="border-b border-slate-800/80 bg-[#090D15]/95 backdrop-blur sticky top-0 z-40 px-4 lg:px-6 py-2.5 space-y-2.5 font-mono text-xs">
      {/* Top Row: Brand & Status on Left, User Email Pill on Far Right Corner */}
      <div className="flex items-center justify-between gap-3">
        {/* Brand & Connection Status */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          <div className="p-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 shadow-md shadow-cyan-500/10 flex items-center justify-center">
            <Cloud className="w-5 h-5 fill-cyan-400/20 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                CloudLog
                <span className="px-1.5 py-0.5 rounded bg-cyan-950/90 text-cyan-300 font-mono text-[10px] font-extrabold border border-cyan-700/80 uppercase">
                  v2.4 PRO
                </span>
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 font-sans">
              <span className="text-slate-400 font-medium">Multi-Tenant Aggregator</span>
              <span className="text-slate-600">•</span>
              <span className="px-2 py-0.5 rounded-full bg-[#0D131F] border border-slate-800 text-[10px] text-emerald-400 flex items-center gap-1.5 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                BullMQ • Redis Pipeline • {isConnected ? "Connected (14ms)" : "Disconnected"}
              </span>
            </p>
          </div>
        </div>

        {/* Far Right Corner User Login Email Pill */}
        <button
          onClick={() => onOpenAuthModal(currentUser ? "profile" : "login")}
          className="px-2.5 py-1.5 rounded-lg text-xs bg-[#0E1420] hover:bg-slate-800 text-slate-200 border border-slate-800 flex items-center space-x-2 transition shadow-sm"
        >
          <div className="w-5 h-5 rounded-full bg-cyan-900 border border-cyan-500/50 text-cyan-300 font-bold text-[10px] flex items-center justify-center">
            {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : "TA"}
          </div>
          <span className="max-w-[170px] truncate text-[11px] font-mono text-slate-300">
            {currentUser ? currentUser.email || currentUser.name : "tarunv281@gmail..."}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </div>

      {/* Action Buttons Line Row (as requested) */}
      <div className="flex items-center space-x-2 flex-wrap gap-y-2 pt-1 border-t border-slate-800/40">
        {/* Usage Meter Gauge Pill */}
        <UsageMeter currentUser={currentUser} compact={true} />

        {/* API Keys */}
        <button
          onClick={() => onOpenAuthModal("profile")}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-[#0E1420] hover:bg-slate-800 border border-slate-800 transition flex items-center space-x-1.5"
          title="View API Keys"
        >
          <Key className="w-3.5 h-3.5 text-cyan-400" />
          <span>API Keys</span>
        </button>

        {/* LIVE STREAM Button */}
        <button
          onClick={() => setIsPaused(!isPaused)}
          className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center space-x-1.5 transition border ${
            isPaused
              ? "bg-amber-500/10 text-amber-300 border-amber-500/40 hover:bg-amber-500/20"
              : "bg-emerald-950/40 text-emerald-400 border-emerald-500/50 hover:bg-emerald-950/60"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full inline-block ${
              isPaused ? "bg-amber-400" : "bg-emerald-400 animate-pulse"
            }`}
          />
          <span>{isPaused ? "STREAM PAUSED" : "LIVE STREAM"}</span>
        </button>

        {/* Simulate Logs Button */}
        <button
          onClick={onOpenMockGenerator}
          className="px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-[#1A122A] hover:bg-[#251A3B] text-purple-300 border border-purple-500/50 flex items-center space-x-1.5 transition shadow-sm"
        >
          <Zap className="w-3.5 h-3.5 text-purple-400 fill-purple-400" />
          <span>Simulate Logs</span>
        </button>

        {/* Fired Alerts Button */}
        <button
          onClick={onOpenAlerts}
          className="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-[#2B0E17] hover:bg-[#3D1421] text-rose-300 border border-rose-500/50 flex items-center space-x-1.5 transition"
        >
          <Bell className="w-3.5 h-3.5 text-rose-400" />
          <span>Fired Alerts</span>
          <span className="bg-rose-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full text-[10px]">
            {firedAlertsCount}
          </span>
        </button>
      </div>
    </header>
  );
}



