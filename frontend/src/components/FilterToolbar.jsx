import React, { useState, useEffect } from "react";
import {
  Search,
  ChevronDown,
  Trash2,
  RefreshCw,
  Clock,
  Plus,
} from "lucide-react";

export default function FilterToolbar({
  logs = [],
  selectedService,
  setSelectedService,
  selectedLevel,
  setSelectedLevel,
  searchKeyword,
  setSearchKeyword,
  servicesList = [],
  onClearLogs,
  autoScroll,
  setAutoScroll,
  onFetchHistory,
  isLoadingHistory,
  dateRangeOption,
  setDateRangeOption,
  totalCount = 0,
}) {
  const [searchInput, setSearchInput] = useState(searchKeyword);
  const [isRegex, setIsRegex] = useState(false);
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [wrapText, setWrapText] = useState(true);
  const [customServices, setCustomServices] = useState([]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchKeyword(searchInput);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchInput, setSearchKeyword]);

  const allServices = Array.from(new Set([...servicesList, ...customServices]));

  const handleServiceChange = (e) => {
    const val = e.target.value;
    if (val === "CUSTOM_PROMPT") {
      const input = window.prompt("Enter custom target service name (e.g. payment-service, analytics-api):");
      if (input && input.trim()) {
        const cleanName = input.trim();
        if (!customServices.includes(cleanName)) {
          setCustomServices((prev) => [...prev, cleanName]);
        }
        setSelectedService(cleanName);
      } else {
        setSelectedService("ALL");
      }
    } else {
      setSelectedService(val);
    }
  };

  const levelCounts = React.useMemo(() => {
    let fatal = 0, error = 0, warn = 0, info = 0, debug = 0;
    logs.forEach((l) => {
      const lvl = (l.level || "INFO").toUpperCase();
      if (lvl === "FATAL") fatal++;
      else if (lvl === "ERROR") error++;
      else if (lvl === "WARN") warn++;
      else if (lvl === "DEBUG") debug++;
      else info++;
    });

    const len = logs.length || 1;
    const ratio = totalCount > logs.length ? totalCount / len : 1;

    return {
      ALL: totalCount || logs.length,
      FATAL: Math.round(fatal * ratio),
      ERROR: Math.round(error * ratio),
      WARN: Math.round(warn * ratio),
      INFO: Math.round(info * ratio),
      DEBUG: Math.round(debug * ratio),
    };
  }, [logs, totalCount]);

  return (
    <div className="bg-[#0B0F17] border border-slate-800 rounded-xl p-3 mb-4 space-y-2.5 font-mono text-xs shadow-xl">
      {/* Upper Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Left Control Group */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Target Service Dropdown */}
          <div className="relative min-w-[210px]">
            <select
              value={selectedService}
              onChange={handleServiceChange}
              className="w-full bg-[#06090F] text-xs text-white border border-slate-800 rounded-lg pl-8 pr-8 py-2 focus:outline-none focus:border-cyan-500 appearance-none font-mono cursor-pointer"
            >
              <option value="ALL">🎯 Target Services ({allServices.length || 8})</option>
              <option value="CUSTOM_PROMPT">➕ Enter custom target service...</option>
              {allServices.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Time Range Dropdown */}
          <div className="relative min-w-[140px]">
            <select
              value={dateRangeOption}
              onChange={(e) => setDateRangeOption(e.target.value)}
              className="w-full bg-[#06090F] text-xs text-white border border-slate-800 rounded-lg pl-8 pr-8 py-2 focus:outline-none focus:border-cyan-500 appearance-none font-mono cursor-pointer"
            >
              <option value="1H">Last 1 hour</option>
              <option value="15M">Last 15 minutes</option>
              <option value="24H">Last 24 hours</option>
              <option value="7D">Last 7 days</option>
              <option value="ALL">All Time</option>
            </select>
            <Clock className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Search Input Field */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search payload, trace_id, status: >= 500, service:order-processor, 'h..."
              className="w-full bg-[#06090F] text-xs text-slate-200 placeholder-slate-500 border border-slate-800 rounded-lg pl-9 pr-24 py-2 focus:outline-none focus:border-cyan-500 font-mono"
            />
            
            {/* Inline Search Modifiers */}
            <div className="absolute right-2 top-1.5 flex items-center space-x-1">
              <button
                onClick={() => setIsRegex(!isRegex)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                  isRegex
                    ? "bg-cyan-950 text-cyan-300 border-cyan-700"
                    : "bg-[#0E1420] text-slate-500 border-slate-800 hover:text-slate-300"
                }`}
                title="Regular Expression Search"
              >
                .*
              </button>
              <button
                onClick={() => setIsCaseSensitive(!isCaseSensitive)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                  isCaseSensitive
                    ? "bg-cyan-950 text-cyan-300 border-cyan-700"
                    : "bg-[#0E1420] text-slate-500 border-slate-800 hover:text-slate-300"
                }`}
                title="Match Case"
              >
                Aa
              </button>
            </div>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Fetch DB Button */}
          <button
            onClick={onFetchHistory}
            disabled={isLoadingHistory}
            className="px-3 py-1.5 bg-[#0E1420] hover:bg-slate-800 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border border-slate-800 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoadingHistory ? "animate-spin" : ""}`} />
            <span>Fetch DB</span>
          </button>

          {/* Clear Button */}
          <button
            onClick={onClearLogs}
            className="px-3 py-1.5 bg-[#2B0E17] hover:bg-[#3D1421] text-rose-300 border border-rose-500/40 rounded-lg text-xs font-extrabold flex items-center space-x-1.5 transition"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Lower Severity Pills & Toggle Checks Row */}
      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Severity Level Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500 text-[11px] font-semibold mr-1">Levels:</span>

          {/* ALL Pill */}
          <button
            onClick={() => setSelectedLevel("ALL")}
            className={`px-2.5 py-0.5 rounded text-[11px] font-extrabold border transition ${
              selectedLevel === "ALL"
                ? "bg-cyan-950 text-cyan-300 border-cyan-600"
                : "bg-[#06090F] text-slate-400 border-slate-800 hover:text-white"
            }`}
          >
            ALL ({levelCounts.ALL})
          </button>

          {/* FATAL Pill */}
          <button
            onClick={() => setSelectedLevel("FATAL")}
            className={`px-2.5 py-0.5 rounded text-[11px] font-extrabold border transition flex items-center gap-1.5 ${
              selectedLevel === "FATAL"
                ? "bg-rose-950 text-rose-200 border-rose-600"
                : "bg-[#1C0A10] text-rose-400 border-rose-950 hover:border-rose-800"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            FATAL {levelCounts.FATAL}
          </button>

          {/* ERROR Pill */}
          <button
            onClick={() => setSelectedLevel("ERROR")}
            className={`px-2.5 py-0.5 rounded text-[11px] font-extrabold border transition flex items-center gap-1.5 ${
              selectedLevel === "ERROR"
                ? "bg-red-950 text-red-200 border-red-600"
                : "bg-[#1C0A10] text-red-400 border-red-950 hover:border-red-800"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            ERROR {levelCounts.ERROR}
          </button>

          {/* WARN Pill */}
          <button
            onClick={() => setSelectedLevel("WARN")}
            className={`px-2.5 py-0.5 rounded text-[11px] font-extrabold border transition flex items-center gap-1.5 ${
              selectedLevel === "WARN"
                ? "bg-amber-950 text-amber-200 border-amber-600"
                : "bg-[#1C160A] text-amber-300 border-amber-950 hover:border-amber-800"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            WARN {levelCounts.WARN}
          </button>

          {/* INFO Pill */}
          <button
            onClick={() => setSelectedLevel("INFO")}
            className={`px-2.5 py-0.5 rounded text-[11px] font-extrabold border transition flex items-center gap-1.5 ${
              selectedLevel === "INFO"
                ? "bg-emerald-950 text-emerald-200 border-emerald-600"
                : "bg-[#0A1C14] text-emerald-400 border-emerald-950 hover:border-emerald-800"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            INFO {levelCounts.INFO}
          </button>

          {/* DEBUG Pill */}
          <button
            onClick={() => setSelectedLevel("DEBUG")}
            className={`px-2.5 py-0.5 rounded text-[11px] font-extrabold border transition flex items-center gap-1.5 ${
              selectedLevel === "DEBUG"
                ? "bg-cyan-950 text-cyan-200 border-cyan-600"
                : "bg-[#0A1822] text-cyan-400 border-cyan-950 hover:border-cyan-800"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            DEBUG {levelCounts.DEBUG}
          </button>
        </div>

        {/* Right Console Toggles */}
        <div className="flex items-center space-x-3.5 text-[11px] text-slate-300">
          <label className="flex items-center space-x-1.5 cursor-pointer font-bold">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="accent-cyan-400 rounded cursor-pointer"
            />
            <span>Auto-Scroll</span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer font-bold">
            <input
              type="checkbox"
              checked={wrapText}
              onChange={(e) => setWrapText(e.target.checked)}
              className="accent-cyan-400 rounded cursor-pointer"
            />
            <span>Wrap Text</span>
          </label>
        </div>
      </div>
    </div>
  );
}


