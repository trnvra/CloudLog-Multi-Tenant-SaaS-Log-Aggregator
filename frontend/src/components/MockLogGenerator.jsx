import React, { useState } from "react";
import { Zap, Play, Square, CheckCircle, X, RefreshCw, ChevronDown } from "lucide-react";
import client from "../api/client";

const SAMPLE_SERVICES = [
  "auth-service",
  "payment-gateway",
  "order-processor",
  "notification-svc",
  "database-cluster",
];

const SAMPLE_MESSAGES = {
  INFO: [
    "User authentication token refreshed successfully",
    "Database connection pool health check passed (latency 2ms)",
    "Payment processing queue initialized",
    "GET /api/v1/orders HTTP 200 OK - 45ms",
    "Scheduled backup job completed successfully",
  ],
  WARN: [
    "High memory usage detected (84% capacity reached)",
    "Redis cache miss rate increased to 12.4%",
    "Slow query warning: SELECT * FROM audit_logs took 1.4s",
    "API Rate limit warning: Client IP approaching 90% quota",
  ],
  ERROR: [
    "Failed to send email notification: SMTP connection timeout",
    "Database transaction aborted due to lock deadlock",
    "Stripe API request failed: HTTP 502 Bad Gateway",
    "JWT signature validation error: expired token",
  ],
  FATAL: [
    "OutOfMemoryError: Java heap space exhausted",
    "Fatal database disconnection: primary node unreachable",
    "Kernel panic - not syncing: VFS: Unable to mount root fs",
    "SECURITY ALERT: Multiple failed root login attempts detected",
  ],
};

export default function MockLogGenerator({ isOpen, onClose }) {
  const [isRunning, setIsRunning] = useState(false);
  const [intervalId, setIntervalId] = useState(null);
  const [generatedCount, setGeneratedCount] = useState(0);

  const [selectedLevelOption, setSelectedLevelOption] = useState("RANDOM");
  const [customLevelName, setCustomLevelName] = useState("");
  const [selectedServiceOption, setSelectedServiceOption] = useState("RANDOM");
  const [customServiceName, setCustomServiceName] = useState("");
  const [customMsg, setCustomMsg] = useState("");

  const sendSingleLog = async (overrideMsg = null, overrideLevel = null) => {
    const level =
      overrideLevel ||
      (selectedLevelOption === "CUSTOM"
        ? customLevelName.trim().toUpperCase() || "INFO"
        : selectedLevelOption === "RANDOM"
        ? ["INFO", "INFO", "INFO", "WARN", "ERROR", "FATAL"][
            Math.floor(Math.random() * 6)
          ]
        : selectedLevelOption);

    const serviceName =
      selectedServiceOption === "CUSTOM"
        ? customServiceName.trim() || "custom-service"
        : selectedServiceOption === "RANDOM"
        ? SAMPLE_SERVICES[Math.floor(Math.random() * SAMPLE_SERVICES.length)]
        : selectedServiceOption;

    const msgs = SAMPLE_MESSAGES[level] || SAMPLE_MESSAGES.INFO;
    const message =
      overrideMsg ||
      customMsg ||
      msgs[Math.floor(Math.random() * msgs.length)];

    try {
      await client.post("/logs", {
        serviceName,
        level,
        message,
        metadata: {
          requestId: `req_${Math.random().toString(36).substring(2, 9)}`,
          host: "node-k8s-pod-7f",
          cpuLoad: (Math.random() * 80 + 10).toFixed(1) + "%",
        },
      });
      setGeneratedCount((prev) => prev + 1);
    } catch (err) {
      console.error("Failed to post mock log:", err.message);
    }
  };

  const sendBatchLogs = async () => {
    const logsBatch = Array.from({ length: 25 }, () => {
      const level =
        selectedLevelOption === "CUSTOM" && customLevelName.trim()
          ? customLevelName.trim().toUpperCase()
          : ["INFO", "INFO", "WARN", "ERROR", "FATAL"][
              Math.floor(Math.random() * 5)
            ];
      const serviceName =
        selectedServiceOption === "CUSTOM" && customServiceName.trim()
          ? customServiceName.trim()
          : SAMPLE_SERVICES[Math.floor(Math.random() * SAMPLE_SERVICES.length)];
      const msgs = SAMPLE_MESSAGES[level] || SAMPLE_MESSAGES.INFO;
      return {
        serviceName,
        level,
        message: msgs[Math.floor(Math.random() * msgs.length)],
        metadata: { batchId: Date.now(), simulated: true },
      };
    });

    try {
      await client.post("/logs/batch", { logs: logsBatch });
      setGeneratedCount((prev) => prev + logsBatch.length);
    } catch (err) {
      console.error("Failed to post mock batch:", err.message);
    }
  };

  const toggleAutoSimulator = () => {
    if (isRunning) {
      clearInterval(intervalId);
      setIntervalId(null);
      setIsRunning(false);
    } else {
      setIsRunning(true);
      const id = setInterval(() => {
        sendSingleLog();
      }, 500); // 2 logs per sec
      setIntervalId(id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Zap className="w-5 h-5 fill-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Log Traffic Simulator</h2>
              <p className="text-xs text-slate-400">
                Generate real log events directly into BullMQ queue.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Preset options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Target Service */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Target Service</label>
              <div className="relative">
                <select
                  value={selectedServiceOption}
                  onChange={(e) => setSelectedServiceOption(e.target.value)}
                  className="w-full bg-[#111827] text-xs text-white border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 appearance-none font-mono cursor-pointer"
                >
                  <option value="RANDOM">Random Services</option>
                  {SAMPLE_SERVICES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="CUSTOM">+ Enter Custom Service...</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>

              {selectedServiceOption === "CUSTOM" && (
                <input
                  type="text"
                  value={customServiceName}
                  onChange={(e) => setCustomServiceName(e.target.value)}
                  placeholder="Type custom service name..."
                  className="w-full bg-[#111827] text-xs text-white border border-cyan-500/60 rounded-lg px-3 py-2 font-mono mt-1.5 focus:outline-none"
                  required
                />
              )}
            </div>

            {/* Log Severity */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Log Severity</label>
              <div className="relative">
                <select
                  value={selectedLevelOption}
                  onChange={(e) => setSelectedLevelOption(e.target.value)}
                  className="w-full bg-[#111827] text-xs text-white border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 appearance-none font-mono cursor-pointer"
                >
                  <option value="RANDOM">Random Levels</option>
                  <option value="INFO">INFO</option>
                  <option value="WARN">WARN</option>
                  <option value="ERROR">ERROR</option>
                  <option value="FATAL">FATAL</option>
                  <option value="CUSTOM">+ Enter Custom Severity...</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>

              {selectedLevelOption === "CUSTOM" && (
                <input
                  type="text"
                  value={customLevelName}
                  onChange={(e) => setCustomLevelName(e.target.value)}
                  placeholder="Type custom severity (e.g. TRACE)..."
                  className="w-full bg-[#111827] text-xs text-white border border-cyan-500/60 rounded-lg px-3 py-2 font-mono mt-1.5 focus:outline-none"
                  required
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Custom Message (Optional)</label>
            <input
              type="text"
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              placeholder="e.g. Critical security breach attempt!"
              className="w-full bg-[#0B0F17] text-xs text-white border border-slate-700 rounded-lg px-3 py-2 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Generator Actions */}
          <div className="space-y-2">
            <button
              onClick={() => sendSingleLog()}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs transition border border-slate-700 flex items-center justify-center space-x-2"
            >
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Emit Single Log Event</span>
            </button>

            <button
              onClick={sendBatchLogs}
              className="w-full py-2.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 font-semibold rounded-lg text-xs transition border border-purple-500/30 flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4 text-purple-400" />
              <span>Emit Bulk Batch (25 Logs)</span>
            </button>

            <button
              onClick={toggleAutoSimulator}
              className={`w-full py-2.5 font-semibold rounded-lg text-xs transition flex items-center justify-center space-x-2 border ${
                isRunning
                  ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40"
                  : "bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/40"
              }`}
            >
              {isRunning ? (
                <>
                  <Square className="w-4 h-4 text-rose-400 fill-rose-400" />
                  <span>Stop Continuous Streamer (2 msgs/sec)</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                  <span>Start Continuous Streamer (2 msgs/sec)</span>
                </>
              )}
            </button>
          </div>

          <div className="text-center pt-2 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            Total Simulated: <span className="font-mono text-white font-bold">{generatedCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
