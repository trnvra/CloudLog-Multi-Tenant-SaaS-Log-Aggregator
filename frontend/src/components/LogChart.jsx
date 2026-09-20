import React, { useMemo } from "react";

export default function LogChart({ logs = [] }) {
  // Generate 45 time bucket bars (simulating 60 min window)
  const buckets = useMemo(() => {
    const totalBars = 45;
    const result = [];
    const now = Date.now();
    const intervalMs = (60 * 60 * 1000) / totalBars;

    const hasRealLogs = logs && logs.length > 0;

    for (let i = 0; i < totalBars; i++) {
      const bucketTime = new Date(now - (totalBars - 1 - i) * intervalMs);
      
      let infoCount = 0;
      let warnCount = 0;
      let errorCount = 0;

      if (hasRealLogs) {
        logs.forEach((log) => {
          const logTime = new Date(log.timestamp || log.createdAt || now).getTime();
          const bucketStart = bucketTime.getTime() - intervalMs / 2;
          const bucketEnd = bucketTime.getTime() + intervalMs / 2;

          if (logTime >= bucketStart && logTime <= bucketEnd) {
            if (log.level === "FATAL" || log.level === "ERROR") errorCount++;
            else if (log.level === "WARN") warnCount++;
            else infoCount++;
          }
        });
      }

      const finalInfo = infoCount;
      const finalWarn = warnCount;
      const finalErr = errorCount;
      const total = finalInfo + finalWarn + finalErr;

      result.push({
        id: i,
        timeLabel: bucketTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        info: finalInfo,
        warn: finalWarn,
        error: finalErr,
        total,
      });
    }

    return result;
  }, [logs]);

  const maxBucketTotal = useMemo(() => {
    const maxVal = Math.max(...buckets.map((b) => b.total), 0);
    return maxVal > 0 ? maxVal : 10;
  }, [buckets]);

  const hasLogs = logs && logs.length > 0;

  return (
    <div className="bg-[#0B0F17] border border-slate-800 rounded-xl p-4 mb-4 shadow-xl font-mono text-xs">
      {/* Chart Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800/80">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 bg-cyan-400 rounded-xs inline-block" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
            LOG EVENT FREQUENCY & SEVERITY DISTRIBUTION
          </h3>
          <span className="text-[11px] text-slate-500 font-sans font-medium">
            | Last 60 minutes (1 min buckets)
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-4 text-[11px] font-bold">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            INFO
          </span>
          <span className="flex items-center gap-1.5 text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            WARN
          </span>
          <span className="flex items-center gap-1.5 text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            FATAL/ERR
          </span>
        </div>
      </div>

      {/* Stacked Bar Chart Display */}
      <div className="h-20 sm:h-24 flex items-end justify-between gap-1 pt-2 pb-1 px-1 bg-[#06090F] rounded-lg border border-slate-800/60 overflow-hidden relative">
        {!hasLogs && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 text-slate-500 text-xs font-mono pointer-events-none">
            No log events ingested yet for this tenant. Use "Simulate Logs" to generate traffic.
          </div>
        )}

        {buckets.map((b) => {
          const heightPct = b.total > 0 ? Math.max(10, Math.min(100, (b.total / maxBucketTotal) * 100)) : 4;
          const infoPct = b.total > 0 ? (b.info / b.total) * 100 : 100;
          const warnPct = b.total > 0 ? (b.warn / b.total) * 100 : 0;
          const errPct = b.total > 0 ? (b.error / b.total) * 100 : 0;

          return (
            <div
              key={b.id}
              className={`flex-1 flex flex-col justify-end group relative cursor-pointer rounded-t-xs overflow-hidden transition-all ${
                b.total > 0 ? "hover:opacity-80" : "opacity-30"
              }`}
              style={{ height: `${heightPct}%` }}
              title={`Time: ${b.timeLabel}\nINFO: ${b.info} | WARN: ${b.warn} | FATAL/ERR: ${b.error}`}
            >
              {/* Stacked Segments */}
              {b.error > 0 && (
                <div
                  className="w-full bg-rose-500 transition-all"
                  style={{ height: `${errPct}%` }}
                />
              )}
              {b.warn > 0 && (
                <div
                  className="w-full bg-amber-400 transition-all"
                  style={{ height: `${warnPct}%` }}
                />
              )}
              <div
                className={`w-full transition-all ${b.total > 0 ? "bg-emerald-500" : "bg-slate-800"}`}
                style={{ height: `${infoPct}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* X-Axis Timestamps */}
      <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-2 px-1">
        <span>60m ago</span>
        <span>45m ago</span>
        <span>30m ago</span>
        <span>15m ago</span>
        <span className="text-slate-400 font-bold">Now</span>
      </div>
    </div>
  );
}
