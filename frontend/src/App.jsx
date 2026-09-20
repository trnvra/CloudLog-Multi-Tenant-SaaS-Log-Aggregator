import React, { useState, useEffect, useMemo, useRef } from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import MetricsCards from "./components/MetricsCards";
import LogChart from "./components/LogChart";
import FilterToolbar from "./components/FilterToolbar";
import LogTerminal from "./components/LogTerminal";
import AlertManager from "./components/AlertManager";
import MockLogGenerator from "./components/MockLogGenerator";
import AuthModal from "./components/AuthModal";
import BillingPage from "./pages/BillingPage";
import socket from "./socket";
import client from "./api/client";
import { AlertCircle, X } from "lucide-react";

export default function App() {
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  // User & Auth State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("userInfo");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Filters
  const [selectedService, setSelectedService] = useState("ALL");
  const [selectedLevel, setSelectedLevel] = useState("ALL");
  const [searchKeyword, setSearchKeyword] = useState("");

  // Date Range & Pagination State
  const [dateRangeOption, setDateRangeOption] = useState("ALL");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [isMockModalOpen, setIsMockModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState("login");

  const handleOpenAuthModal = (tab = "login") => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  // Stats & Notifications
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);
  const [alertToast, setAlertToast] = useState(null);
  const [triggeredHistory, setTriggeredHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Throughput Calculation
  const [logsSecCounter, setLogsSecCounter] = useState(0);
  const [ingestRate, setIngestRate] = useState(0);
  const isPausedRef = useRef(isPaused);
  const currentUserRef = useRef(currentUser);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Socket Connection & Event Listeners
  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onNewLog(newLog) {
      const activeUser = currentUserRef.current;
      // Filter incoming real-time socket logs by tenantId if user is logged in
      if (activeUser?.tenantId && newLog.tenantId && newLog.tenantId !== activeUser.tenantId) {
        return;
      }

      setLogsSecCounter((prev) => prev + 1);

      if (!isPausedRef.current) {
        setLogs((prevLogs) => {
          if (newLog._id && prevLogs.some((l) => l._id === newLog._id)) return prevLogs;
          const updated = [newLog, ...prevLogs];
          return updated.slice(0, 500); // cap terminal memory buffer at 500 logs
        });
        setTotalCount((prev) => prev + 1);
      }
    }

    function onAlertTriggered(alertData) {
      const activeUser = currentUserRef.current;
      if (activeUser?.tenantId && alertData.tenantId && alertData.tenantId !== activeUser.tenantId) {
        return;
      }
      setAlertToast(alertData);
      setTimeout(() => setAlertToast(null), 6000);
      setTriggeredHistory((prev) => [alertData, ...prev]);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("new-log", onNewLog);
    socket.on("alert-triggered", onAlertTriggered);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("new-log", onNewLog);
      socket.off("alert-triggered", onAlertTriggered);
    };
  }, []);

  // Fetch tenant-scoped active alert rules count & fired alerts history
  const fetchAlertSummary = () => {
    client
      .get("/alerts")
      .then((res) => {
        const active = res.data.rules?.filter((r) => r.isActive || r.enabled)?.length || 0;
        setActiveAlertsCount(active);
      })
      .catch(() => {});

    client
      .get("/alerts/history")
      .then((res) => {
        if (res.data.history) {
          setTriggeredHistory(res.data.history);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchAlertSummary();
  }, [currentUser]);

  // Rate calculator timer
  useEffect(() => {
    const timer = setInterval(() => {
      setIngestRate(logsSecCounter);
      setLogsSecCounter(0);
    }, 1000);
    return () => clearInterval(timer);
  }, [logsSecCounter]);

  // Fetch initial / history logs from backend MongoDB with Date Range, Search & Pagination
  const fetchLogHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const params = {
        page,
        limit: 100,
      };

      if (selectedService !== "ALL" && selectedService !== "CUSTOM") params.serviceName = selectedService;
      if (selectedLevel !== "ALL") params.level = selectedLevel;
      if (searchKeyword.trim()) params.search = searchKeyword.trim();

      // Date range calculation
      const now = new Date();
      if (dateRangeOption === "15M") {
        params.startDate = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
      } else if (dateRangeOption === "1H") {
        params.startDate = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      } else if (dateRangeOption === "24H") {
        params.startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      } else if (dateRangeOption === "7D") {
        params.startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (dateRangeOption === "CUSTOM") {
        if (customStartDate) params.startDate = new Date(customStartDate).toISOString();
        if (customEndDate) params.endDate = new Date(customEndDate).toISOString();
      }

      const res = await client.get("/logs", { params });
      if (res.data.logs) {
        setLogs(res.data.logs);
        setTotalPages(res.data.pages || 1);
        setTotalCount(res.data.total !== undefined ? res.data.total : res.data.logs.length);
      }
    } catch (err) {
      console.warn("Log history fetch error:", err.message);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Re-fetch when date range option, pagination page, or user changes
  useEffect(() => {
    fetchLogHistory();
  }, [currentUser, dateRangeOption, page, selectedService, selectedLevel, searchKeyword]);

  // Service list extracted dynamically from received logs
  const servicesList = useMemo(() => {
    const set = new Set(logs.map((l) => l.serviceName).filter(Boolean));
    return Array.from(set);
  }, [logs]);

  // Filtered Logs for terminal display
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedService !== "ALL" && selectedService !== "CUSTOM" && log.serviceName !== selectedService) {
        return false;
      }
      if (selectedLevel !== "ALL" && log.level !== selectedLevel) {
        return false;
      }
      if (searchKeyword.trim() !== "") {
        const query = searchKeyword.toLowerCase();
        const msgMatch = log.message && log.message.toLowerCase().includes(query);
        const serviceMatch = log.serviceName && log.serviceName.toLowerCase().includes(query);
        const metaMatch = log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(query);
        if (!msgMatch && !serviceMatch && !metaMatch) return false;
      }
      return true;
    });
  }, [logs, selectedService, selectedLevel, searchKeyword]);

  // Dynamic Stats Breakdown from logs & totalCount
  const fatalCount = useMemo(() => {
    return logs.filter((l) => l.level === "FATAL").length;
  }, [logs]);

  const errorOnlyCount = useMemo(() => {
    return logs.filter((l) => l.level === "ERROR").length;
  }, [logs]);

  const warnCount = useMemo(() => {
    return logs.filter((l) => l.level === "WARN").length;
  }, [logs]);

  const infoCount = useMemo(() => {
    return logs.filter((l) => l.level === "INFO").length;
  }, [logs]);

  const sampleCount = logs.length || 1;
  const ratio = totalCount > logs.length ? totalCount / sampleCount : 1;

  const scaledFatalCount = Math.round(fatalCount * ratio);
  const scaledErrorOnlyCount = Math.round(errorOnlyCount * ratio);
  const scaledWarnCount = Math.round(warnCount * ratio);
  const scaledInfoCount = Math.round(infoCount * ratio);
  const scaledTotalErrors = scaledFatalCount + scaledErrorOnlyCount;

  return (
    <Routes>
      <Route
        path="/billing"
        element={
          <BillingPage
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
          />
        }
      />
      <Route
        path="/pricing"
        element={
          <BillingPage
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
          />
        }
      />
      <Route
        path="*"
        element={
          <div className="min-h-screen bg-[#05080E] text-slate-100 flex flex-col font-sans">
            {/* Real-time Alert Toast Popup */}
            {alertToast && (
              <div className="fixed top-20 right-6 z-50 bg-rose-950/90 border border-rose-500/50 text-rose-200 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-start space-x-3 max-w-md animate-in slide-in-from-right duration-200">
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-xs space-y-1">
                  <div className="font-bold text-white flex items-center justify-between">
                    <span>🚨 ALERT MATCHED & FIRED!</span>
                    <button
                      onClick={() => setAlertToast(null)}
                      className="text-rose-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="font-mono text-[11px] text-amber-300">
                    Rule: "{alertToast.rule?.name || alertToast.rule?.keyword}"
                  </p>
                  <p className="text-slate-300 line-clamp-2 font-mono text-[11px]">
                    [{alertToast.log?.serviceName}] {alertToast.log?.message}
                  </p>
                </div>
              </div>
            )}

            {/* Header */}
            <Header
              isConnected={isConnected}
              isPaused={isPaused}
              setIsPaused={setIsPaused}
              onOpenAlerts={() => setIsAlertModalOpen(true)}
              onOpenMockGenerator={() => setIsMockModalOpen(true)}
              onOpenAuthModal={handleOpenAuthModal}
              currentUser={currentUser}
              firedAlertsCount={triggeredHistory.length}
            />

            {/* Main Content Area */}
            <main className="flex-1 px-4 lg:px-6 py-4 max-w-[1550px] mx-auto w-full">
              {/* Metrics Summary Cards */}
              <MetricsCards
                totalCount={totalCount}
                errorCount={scaledTotalErrors}
                fatalCount={scaledFatalCount}
                warnCount={scaledWarnCount}
                infoCount={scaledInfoCount}
                logsBufferCount={logs.length}
                activeAlertsCount={activeAlertsCount || 1}
                ingestRate={ingestRate}
              />

              {/* Log Event Frequency & Severity Distribution Chart */}
              <LogChart logs={filteredLogs} />

              {/* Filter Toolbar */}
              <FilterToolbar
                logs={logs}
                selectedService={selectedService}
                setSelectedService={setSelectedService}
                selectedLevel={selectedLevel}
                setSelectedLevel={setSelectedLevel}
                searchKeyword={searchKeyword}
                setSearchKeyword={setSearchKeyword}
                servicesList={servicesList}
                onClearLogs={() => {
                  setLogs([]);
                  setTotalCount(0);
                }}
                autoScroll={autoScroll}
                setAutoScroll={setAutoScroll}
                onFetchHistory={fetchLogHistory}
                isLoadingHistory={isLoadingHistory}
                dateRangeOption={dateRangeOption}
                setDateRangeOption={setDateRangeOption}
                customStartDate={customStartDate}
                setCustomStartDate={setCustomStartDate}
                customEndDate={customEndDate}
                setCustomEndDate={setCustomEndDate}
                page={page}
                setPage={setPage}
                totalPages={totalPages}
                totalCount={totalCount}
              />

              {/* Log Terminal Window */}
              <LogTerminal
                logs={filteredLogs}
                autoScroll={autoScroll}
                setAutoScroll={setAutoScroll}
                searchKeyword={searchKeyword}
                totalCount={totalCount}
              />
            </main>


            {/* Bottom Dashboard Status Bar */}
            <footer className="border-t border-slate-800/80 bg-[#070B12] px-6 py-2.5 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 gap-3">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                <span className="font-bold text-slate-300">Cluster Status: All Systems Operational</span>
                <span className="text-slate-700">|</span>
                <span className="text-slate-400">Redis Ingestion Queue: 0 dropped packets</span>
              </div>

              <div className="flex items-center space-x-4 text-[11px] text-slate-500">
                <a href="#docs" className="hover:text-cyan-400 transition">API Documentation</a>
                <span>•</span>
                <a href="#rules" className="hover:text-cyan-400 transition">Observability Rules</a>
                <span>•</span>
                <span>CloudLog Inc. © 2025</span>
              </div>
            </footer>

            {/* Auth & API Key Modal */}
            <AuthModal
              isOpen={isAuthModalOpen}
              onClose={() => setIsAuthModalOpen(false)}
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              initialTab={authModalTab}
              onAuthSuccess={() => {
                fetchLogHistory();
                fetchAlertSummary();
              }}
            />

            {/* Alert Manager & History Modal */}
            <AlertManager
              isOpen={isAlertModalOpen}
              onClose={() => setIsAlertModalOpen(false)}
              triggeredHistory={triggeredHistory}
              onClearHistory={() => setTriggeredHistory([])}
              servicesList={servicesList}
            />

            {/* Mock Log Simulator Modal */}
            <MockLogGenerator
              isOpen={isMockModalOpen}
              onClose={() => setIsMockModalOpen(false)}
            />
          </div>
        }
      />
    </Routes>
  );
}

