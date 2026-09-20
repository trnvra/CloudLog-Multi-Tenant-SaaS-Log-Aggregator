import React, { useState, useEffect } from "react";
import {
  Bell,
  Plus,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Globe,
  ToggleLeft,
  ToggleRight,
  X,
  RefreshCw,
  Zap,
  History,
  AlertTriangle,
  ChevronDown,
  Tag,
} from "lucide-react";
import client from "../api/client";

const PRESET_SERVICES = [
  "* (All Services)",
  "auth-service",
  "payment-gateway",
  "order-processor",
  "notification-svc",
  "database-cluster",
];

const PRESET_KEYWORDS = [
  "FATAL",
  "ERROR",
  "WARN",
  "OutOfMemory",
  "Kernel panic",
  "SECURITY ALERT",
  "SMTP connection timeout",
  "lock deadlock",
  "502 Bad Gateway",
];

export default function AlertManager({
  isOpen,
  onClose,
  servicesList = [],
}) {
  const [activeTab, setActiveTab] = useState("rules"); // "rules" | "history"
  const [rules, setRules] = useState([]);
  const [history, setHistory] = useState([]);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form State
  const [ruleName, setRuleName] = useState("Discord Production Alert");
  const [selectedServiceOption, setSelectedServiceOption] = useState("*");
  const [customServiceName, setCustomServiceName] = useState("");

  const [selectedLevelOption, setSelectedLevelOption] = useState("ERROR");

  const [selectedKeywordOption, setSelectedKeywordOption] = useState("FATAL");
  const [customKeyword, setCustomKeyword] = useState("");
  const [thresholdCount, setThresholdCount] = useState(5);

  const [webhookUrl, setWebhookUrl] = useState("https://httpbin.org/post");

  // Dynamic merged service list
  const allServices = Array.from(
    new Set([...PRESET_SERVICES, ...servicesList])
  );

  const fetchAlertRules = async () => {
    setIsLoadingRules(true);
    setError(null);
    try {
      const res = await client.get("/alerts");
      setRules(res.data.rules || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load alert rules");
    } finally {
      setIsLoadingRules(false);
    }
  };

  const fetchAlertHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await client.get("/alerts/history");
      setHistory(res.data.history || []);
    } catch (err) {
      console.warn("Failed to fetch alert history");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAlertRules();
      fetchAlertHistory();
    }
  }, [isOpen]);

  const handleCreateRule = async (e) => {
    e.preventDefault();

    // Determine final Service Name value
    const finalServiceName =
      selectedServiceOption === "CUSTOM"
        ? customServiceName.trim()
        : selectedServiceOption.replace(" * (All Services)", "*").replace(" (All Services)", "").trim();

    // Determine final Keyword value
    const finalKeyword =
      selectedKeywordOption === "CUSTOM"
        ? customKeyword.trim()
        : selectedKeywordOption.trim();

    if (!webhookUrl.trim()) {
      setError("Webhook URL is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await client.post("/alerts", {
        name: ruleName.trim() || "Alert Rule",
        service: finalServiceName === "* (All Services)" ? "*" : finalServiceName,
        level: selectedLevelOption,
        keyword: finalKeyword,
        thresholdCount: Math.max(1, Number(thresholdCount) || 5),
        webhookUrl: webhookUrl.trim(),
        isActive: true,
      });

      setSuccessMsg("Alert rule created & webhook handler activated!");
      if (selectedKeywordOption === "CUSTOM") setCustomKeyword("");
      if (selectedServiceOption === "CUSTOM") setCustomServiceName("");
      fetchAlertRules();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.details?.[0] ||
          "Failed to create rule"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleRule = async (id, currentStatus) => {
    try {
      await client.patch(`/alerts/${id}`, { isActive: !currentStatus });
      fetchAlertRules();
    } catch (err) {
      setError("Failed to update rule status");
    }
  };

  const handleDeleteRule = async (id) => {
    try {
      await client.delete(`/alerts/${id}`);
      fetchAlertRules();
    } catch (err) {
      setError("Failed to delete rule");
    }
  };

  const handleClearHistory = async () => {
    try {
      await client.delete("/alerts/history");
      setHistory([]);
    } catch (err) {
      console.warn("Failed to clear alert history");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Alert Rules & Webhooks Engine</h2>
              <p className="text-xs text-slate-400">
                Configure Discord / Slack / HTTP webhooks and live triggers.
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-[#0B0F17]">
          <button
            onClick={() => {
              setActiveTab("rules");
              fetchAlertRules();
            }}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center space-x-2 ${
              activeTab === "rules"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Configured Rules ({rules.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("history");
              fetchAlertHistory();
            }}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center space-x-2 relative ${
              activeTab === "history"
                ? "border-rose-500 text-rose-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Fired Alerts History ({history.length})</span>
            {history.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute top-3 right-2" />
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {activeTab === "rules" ? (
            <>
              {/* Create Rule Form */}
              <form
                onSubmit={handleCreateRule}
                className="bg-[#0B0F17] p-4 rounded-xl border border-slate-800 space-y-4"
              >
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-cyan-400" />
                  Add New Webhook Alert Trigger
                </h3>

                {error && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-400 flex items-center gap-2">
                    <XCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Rule Name Field */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Rule Name
                  </label>
                  <div className="relative">
                    <Tag className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={ruleName}
                      onChange={(e) => setRuleName(e.target.value)}
                      placeholder="e.g. Discord Critical Error Webhook"
                      className="w-full bg-[#111827] text-xs text-white border border-slate-700 rounded-lg pl-9 pr-3 py-2 font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Target Service Dropdown */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Target Service
                    </label>
                    <div className="relative mb-1">
                      <select
                        value={selectedServiceOption}
                        onChange={(e) => setSelectedServiceOption(e.target.value)}
                        className="w-full bg-[#111827] text-xs text-white border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 appearance-none font-mono cursor-pointer"
                      >
                        {allServices.map((s) => (
                          <option key={s} value={s === "* (All Services)" ? "*" : s}>
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
                        placeholder="Type custom service..."
                        className="w-full bg-[#111827] text-xs text-white border border-cyan-500/60 rounded-lg px-3 py-2 font-mono mt-1.5 focus:outline-none"
                        required
                      />
                    )}
                  </div>

                  {/* Target Log Severity Dropdown */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Log Severity
                    </label>
                    <div className="relative">
                      <select
                        value={selectedLevelOption}
                        onChange={(e) => setSelectedLevelOption(e.target.value)}
                        className="w-full bg-[#111827] text-xs text-white border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 appearance-none font-mono cursor-pointer"
                      >
                        <option value="ALL">ALL (Any Level)</option>
                        <option value="INFO">INFO</option>
                        <option value="WARN">WARN</option>
                        <option value="ERROR">ERROR</option>
                        <option value="FATAL">FATAL</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                    </div>
                  </div>

                  {/* Trigger Keyword Dropdown + Custom Entry */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Keyword Match (Optional)
                    </label>
                    <div className="relative mb-1">
                      <select
                        value={selectedKeywordOption}
                        onChange={(e) => setSelectedKeywordOption(e.target.value)}
                        className="w-full bg-[#111827] text-xs text-white border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 appearance-none font-mono cursor-pointer"
                      >
                        {PRESET_KEYWORDS.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                        <option value="CUSTOM">+ Enter Custom Keyword...</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                    </div>

                    {selectedKeywordOption === "CUSTOM" && (
                      <input
                        type="text"
                        value={customKeyword}
                        onChange={(e) => setCustomKeyword(e.target.value)}
                        placeholder="Type custom keyword..."
                        className="w-full bg-[#111827] text-xs text-white border border-cyan-500/60 rounded-lg px-3 py-2 font-mono mt-1.5 focus:outline-none"
                      />
                    )}
                  </div>

                  {/* Threshold Count Field (Default: 5) */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1" title="Alert error fires after keyword/rule matches N times">
                      Threshold Count (Default: 5)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={thresholdCount}
                        onChange={(e) => setThresholdCount(e.target.value)}
                        placeholder="5"
                        className="w-full bg-[#111827] text-xs text-white border border-slate-700 rounded-lg px-3 py-2 font-mono focus:outline-none focus:border-cyan-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Webhook Dispatch URL (Discord / Slack / Generic HTTP POST)
                  </label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://discord.com/api/webhooks/... or https://hooks.slack.com/services/..."
                    className="w-full bg-[#111827] text-xs text-white border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold rounded-lg text-xs transition shadow-lg shadow-cyan-500/10 flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4" />
                      <span>Create & Activate Webhook Rule</span>
                    </>
                  )}
                </button>
              </form>

              {/* Rules List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Configured Webhook Rules ({rules.length})
                  </h3>
                  <button
                    onClick={fetchAlertRules}
                    className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingRules ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>

                {rules.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs bg-[#0B0F17] rounded-xl border border-slate-800">
                    No alert rules configured yet. Create one above to trigger real-time Discord/Slack webhooks!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {rules.map((rule) => {
                      const isRuleActive = rule.isActive !== undefined ? rule.isActive : rule.enabled;
                      const targetThreshold = rule.thresholdCount || 5;
                      const currentTriggers = rule.triggerCount || 0;
                      const isThresholdHit = currentTriggers >= targetThreshold;

                      return (
                        <div
                          key={rule._id}
                          className="p-3 bg-[#0B0F17] rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                              <span className="font-bold text-white text-xs mr-1">
                                {rule.name || "Alert Rule"}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 font-mono text-[10px] font-bold border border-cyan-800/50">
                                service: {rule.service || rule.serviceName || "ALL"}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 font-mono text-[10px] font-bold border border-purple-800/50">
                                level: {rule.level || "ALL"}
                              </span>
                              {rule.keyword && (
                                <span className="font-mono text-amber-300 font-semibold text-[11px]">
                                  match: "{rule.keyword}"
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 font-mono text-[10px] font-bold border border-amber-800/50">
                                threshold: {targetThreshold}x
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border flex items-center gap-1 ${
                                  isThresholdHit
                                    ? "bg-rose-500/30 text-rose-300 border-rose-500/50 animate-pulse"
                                    : "bg-slate-800 text-slate-300 border-slate-700"
                                }`}
                              >
                                <Zap className={`w-3 h-3 ${isThresholdHit ? "text-rose-400 fill-rose-400" : "text-amber-400"}`} />
                                Match Count: {currentTriggers} / {targetThreshold}
                              </span>
                            </div>
                            <p className="text-slate-400 font-mono text-[11px] truncate flex items-center gap-1">
                              <Globe className="w-3 h-3 text-slate-500" />
                              {rule.webhookUrl}
                            </p>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleToggleRule(rule._id, isRuleActive)}
                              className={`text-sm ${isRuleActive ? "text-emerald-400" : "text-slate-500"}`}
                              title={isRuleActive ? "Rule Active" : "Rule Silenced"}
                            >
                              {isRuleActive ? (
                                <ToggleRight className="w-6 h-6 text-emerald-400" />
                              ) : (
                                <ToggleLeft className="w-6 h-6 text-slate-600" />
                              )}
                            </button>

                            <button
                              onClick={() => handleDeleteRule(rule._id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
                              title="Delete Rule"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Fired Alerts History Tab */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Persisted Fired Alerts Log ({history.length})
                </h3>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={fetchAlertHistory}
                    className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingHistory ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                  {history.length > 0 && (
                    <button
                      onClick={handleClearHistory}
                      className="text-xs text-rose-400 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear History
                    </button>
                  )}
                </div>
              </div>

              {history.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs bg-[#0B0F17] rounded-xl border border-slate-800 space-y-2">
                  <ShieldAlert className="w-8 h-8 text-slate-700 mx-auto" />
                  <p className="font-medium text-slate-400">No alert conditions matched yet.</p>
                  <p className="text-[11px] text-slate-600">
                    When an incoming log message matches an active rule condition, it will be saved to MongoDB and dispatched to webhooks in real-time.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((item) => (
                    <div
                      key={item._id}
                      className="p-3.5 bg-[#0B0F17] rounded-xl border border-rose-900/40 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 font-mono">
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40 text-[10px] flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            ALERT MATCH
                          </span>
                          <span className="text-white font-bold">
                            {item.ruleName || "Alert Rule"}
                          </span>
                          {item.keyword && (
                            <span className="text-amber-300 font-bold">
                              Keyword: "{item.keyword}"
                            </span>
                          )}
                        </div>
                        <span className="text-slate-500 font-mono text-[10px]">
                          {item.firedAt ? new Date(item.firedAt).toLocaleTimeString() : ""}
                        </span>
                      </div>

                      <div className="font-mono text-slate-300 text-xs break-all bg-slate-950/60 p-2 rounded border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <span className="text-cyan-400 mr-2">[{item.serviceName}]</span>
                          <span className="text-purple-300 mr-2">[{item.level}]</span>
                          {item.message}
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-500 font-mono truncate">
                        Webhook: {item.webhookUrl}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
