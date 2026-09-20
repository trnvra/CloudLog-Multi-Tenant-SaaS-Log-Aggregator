import React, { useState, useRef, useEffect } from "react";
import { Terminal, Copy, Check } from "lucide-react";

export default function LogTerminal({ logs = [], autoScroll, setAutoScroll, totalCount = 0 }) {
  const containerRef = useRef(null);
  const terminalEndRef = useRef(null);
  const [copiedId, setCopiedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(5);
  const [totalPages] = useState(5);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [logs, autoScroll]);

  const handleScroll = () => {
    if (!containerRef.current || !setAutoScroll) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight <= 40;

    if (isAtBottom) {
      if (!autoScroll) setAutoScroll(true);
    } else {
      if (autoScroll) setAutoScroll(false);
    }
  };

  const copyToClipboard = (log, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopiedId(log._id || log.id || Math.random());
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getLevelBadge = (level) => {
    switch (level) {
      case "FATAL":
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-[#E11D48] text-white font-mono uppercase tracking-wider">
            FATAL
          </span>
        );
      case "ERROR":
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-[#991B1B] text-rose-200 font-mono uppercase tracking-wider">
            ERROR
          </span>
        );
      case "WARN":
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-[#EAB308] text-slate-950 font-mono uppercase tracking-wider">
            WARN
          </span>
        );
      case "INFO":
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-[#10B981] text-slate-950 font-mono uppercase tracking-wider">
            INFO
          </span>
        );
    }
  };

  const getServiceBadge = (serviceName = "") => {
    const lower = serviceName.toLowerCase();
    if (lower.includes("database") || lower.includes("cluster")) {
      return "text-cyan-300 border-cyan-500/50 bg-[#06242B]";
    }
    if (lower.includes("order")) {
      return "text-emerald-300 border-emerald-500/50 bg-[#06291E]";
    }
    if (lower.includes("auth")) {
      return "text-emerald-300 border-emerald-500/50 bg-[#06291E]";
    }
    if (lower.includes("notification")) {
      return "text-slate-300 border-slate-700 bg-[#161F2E]";
    }
    return "text-cyan-300 border-cyan-700 bg-cyan-950/60";
  };

  const getRowBg = (level) => {
    switch (level) {
      case "FATAL":
        return "bg-[#1E0911] hover:bg-[#2A0C18] border-l-4 border-l-rose-500";
      case "ERROR":
        return "bg-[#18090E] hover:bg-[#240D14] border-l-2 border-l-red-500/60";
      case "WARN":
        return "bg-[#161208] hover:bg-[#201B0B] border-l-2 border-l-amber-500/60";
      case "INFO":
      default:
        return "bg-[#06090F] hover:bg-[#0E1420] border-l-2 border-l-transparent";
    }
  };

  // Preset log items to match user's exact mockup screenshot
  const defaultMockLogs = [
    {
      _id: "log_1",
      timestamp: "13:39:12.226",
      level: "WARN",
      serviceName: "database-cluster",
      message: "Redis cache miss rate increased to 12.4% (threshold: 10.0%) [pool: main-redis-02]",
      highlightMessage: (
        <span>
          Redis cache miss rate increased to <strong className="text-amber-300">12.4%</strong> (threshold: 10.0%) [pool: main-redis-02]
        </span>
      ),
    },
    {
      _id: "log_2",
      timestamp: "13:39:11.727",
      level: "INFO",
      serviceName: "order-processor",
      message: "GET /api/v1/orders HTTP 200 OK - Latency: 45ms bytes: 4,128",
      highlightMessage: (
        <span>
          GET /api/v1/orders HTTP <strong className="text-emerald-400">200 OK</strong> - Latency: 45ms bytes: 4,128
        </span>
      ),
    },
    {
      _id: "log_3",
      timestamp: "13:39:11.228",
      level: "FATAL",
      serviceName: "auth-service",
      message: "OutOfMemoryError: Java heap space exhausted in thread pool 'auth-jwt-verifier-04'",
      highlightMessage: (
        <span className="text-rose-200 font-bold">
          OutOfMemoryError: Java heap space exhausted in thread pool 'auth-jwt-verifier-04'
        </span>
      ),
    },
    {
      _id: "log_4",
      timestamp: "13:39:10.729",
      level: "INFO",
      serviceName: "order-processor",
      message: "Scheduled backup job completed successfully. Uploaded snapshot s3://cloudlog-backups/daily-20250220.db.gz",
    },
    {
      _id: "log_5",
      timestamp: "13:39:10.229",
      level: "ERROR",
      serviceName: "order-processor",
      message: "Stripe API request failed: HTTP 502 Bad Gateway after 3 retries (timeout: 5000ms)",
      highlightMessage: (
        <span>
          Stripe API request failed: <strong className="text-red-400 underline">HTTP 502 Bad Gateway</strong> after 3 retries (timeout: 5000ms)
        </span>
      ),
    },
    {
      _id: "log_6",
      timestamp: "13:39:09.727",
      level: "INFO",
      serviceName: "auth-service",
      message: "User authentication token refreshed successfully for subject: usr_99214718a",
    },
    {
      _id: "log_7",
      timestamp: "13:39:09.227",
      level: "ERROR",
      serviceName: "notification-svc",
      message: "Stripe API request failed: HTTP 502 Bad Gateway during receipt push webhook",
      highlightMessage: (
        <span>
          Stripe API request failed: <strong className="text-red-400 underline">HTTP 502 Bad Gateway</strong> during receipt push webhook
        </span>
      ),
    },
    {
      _id: "log_8",
      timestamp: "13:39:08.728",
      level: "INFO",
      serviceName: "auth-service",
      message: "GET /api/v1/orders HTTP 200 OK - Latency: 45ms ip: 192.168.1.104",
      highlightMessage: (
        <span>
          GET /api/v1/orders HTTP <strong className="text-emerald-400">200 OK</strong> - Latency: 45ms ip: 192.168.1.104
        </span>
      ),
    },
  ];

  const displayLogs = logs.length > 0 ? logs : defaultMockLogs;

  return (
    <div className="bg-[#090D14] border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col font-mono text-xs relative">
      {/* Mac Window Title Bar */}
      <div className="bg-[#0B0F17] px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block cursor-pointer" />
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block cursor-pointer" />
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block cursor-pointer" />
          </div>
          <span className="text-slate-200 font-sans text-xs font-extrabold flex items-center gap-1.5 ml-1">
            <Terminal className="w-4 h-4 text-cyan-400" />
            Live Ingestion Console
            <span className="text-slate-500 font-normal text-[11px] hidden sm:inline">
              (Staging & Production Stream)
            </span>
          </span>
        </div>

        <div className="flex items-center space-x-3 text-[11px] font-sans text-slate-400">
          <span>
            Buffer Load: <strong className="text-emerald-400 font-mono">12.4% (Normal)</strong>
          </span>
          <span className="text-slate-700">|</span>
          <span>
            Showing <strong className="text-cyan-400 font-mono">{displayLogs.length}</strong> of {totalCount || 463} logs
          </span>
        </div>
      </div>

      {/* Terminal Rows Area */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="p-2 sm:p-2.5 min-h-[360px] max-h-[520px] overflow-y-auto custom-scrollbar space-y-1 bg-[#04060A]"
      >
        {displayLogs.map((log, index) => {
          const logId = log._id || log.id || `log-${index}`;
          const formattedTs = typeof log.timestamp === "string" && log.timestamp.includes(":")
            ? log.timestamp
            : new Date(log.timestamp || Date.now()).toTimeString().split(" ")[0] + "." + String(new Date(log.timestamp || Date.now()).getMilliseconds()).padStart(3, "0");

          return (
            <div
              key={logId}
              className={`rounded px-3 py-1.5 font-mono text-[11px] sm:text-xs transition-colors flex items-center justify-between gap-3 ${getRowBg(
                log.level
              )}`}
            >
              <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                {/* Prompt Arrow */}
                <span className="text-slate-500 font-bold">&gt;</span>

                {/* Timestamp */}
                <span className="text-slate-400 text-[11px] whitespace-nowrap font-mono select-all">
                  {formattedTs}
                </span>

                {/* Level Badge */}
                <div>{getLevelBadge(log.level)}</div>

                {/* Service Name Badge */}
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold border whitespace-nowrap font-mono ${getServiceBadge(
                    log.serviceName
                  )}`}
                >
                  {log.serviceName}
                </span>

                {/* Message Content */}
                <span className="text-xs break-all font-mono font-medium text-slate-200">
                  {log.highlightMessage || log.message}
                </span>
              </div>

              {/* Copy Icon */}
              <button
                onClick={(e) => copyToClipboard(log, e)}
                className="p-1 text-slate-500 hover:text-slate-200 rounded transition opacity-60 hover:opacity-100 flex-shrink-0"
                title="Copy JSON Payload"
              >
                {copiedId === logId ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          );
        })}
        <div ref={terminalEndRef} />
      </div>

      {/* Pagination & Status Footer */}
      <div className="bg-[#0B0F17] px-4 py-2 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 gap-2">
        <div className="text-[11px]">
          Showing page <span className="text-white font-bold">{currentPage}</span> of{" "}
          <span className="text-white font-bold">{totalPages}</span>
          <span className="mx-2 text-slate-700">•</span>
          Total Database Logs: <span className="text-cyan-400 font-bold">{totalCount}</span>
          <span className="mx-2 text-slate-700">•</span>
          Latency: <span className="text-emerald-400 font-bold">14ms</span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 bg-[#0E1420] hover:bg-slate-800 disabled:opacity-40 rounded text-slate-300 border border-slate-800 flex items-center gap-1 transition text-xs font-extrabold"
          >
            &lt; Prev
          </button>

          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1 bg-[#0E1420] hover:bg-slate-800 disabled:opacity-40 rounded text-slate-300 border border-slate-800 flex items-center gap-1 transition text-xs font-extrabold"
          >
            Next &gt;
          </button>
        </div>
      </div>
    </div>
  );
}

