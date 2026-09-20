import React, { useState } from "react";
import {
  User,
  Key,
  LogOut,
  X,
  Copy,
  Check,
  RefreshCw,
  Shield,
  Building,
  Mail,
  Lock,
} from "lucide-react";
import client from "../api/client";

import UsageMeter from "./UsageMeter";

export default function AuthModal({
  isOpen,
  onClose,
  currentUser,
  setCurrentUser,
  onAuthSuccess,
  initialTab = "login",
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // "login" | "register"
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || "login");
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialTab]);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await client.post("/auth/login", { email, password });
      const { token, user } = res.data;

      localStorage.setItem("authToken", token);
      localStorage.setItem("activeApiKey", user.apiKey);
      localStorage.setItem("userInfo", JSON.stringify(user));

      setCurrentUser(user);
      setSuccessMsg("Logged in successfully!");
      if (onAuthSuccess) onAuthSuccess(user);
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1200);
    } catch (err) {
      const serverErrMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Login failed. Check email and password.";
      setError(serverErrMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await client.post("/auth/signup", {
        name,
        email,
        password,
        companyName,
      });

      const { token, user } = res.data;

      localStorage.setItem("authToken", token);
      localStorage.setItem("activeApiKey", user.apiKey);
      localStorage.setItem("userInfo", JSON.stringify(user));

      setCurrentUser(user);
      setSuccessMsg("Account registered and API Key generated!");
      if (onAuthSuccess) onAuthSuccess(user);
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1500);
    } catch (err) {
      const serverErrMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Registration failed. Try another email.";
      setError(serverErrMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegenerateKey = async () => {
    if (!window.confirm("Are you sure you want to generate a new API Key? Older keys will stop working.")) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await client.post("/auth/regenerate-api-key");
      const newApiKey = res.data.apiKey;

      const updatedUser = { ...currentUser, apiKey: newApiKey };
      localStorage.setItem("activeApiKey", newApiKey);
      localStorage.setItem("userInfo", JSON.stringify(updatedUser));

      setCurrentUser(updatedUser);
      setSuccessMsg("New API Key generated successfully!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError("Failed to regenerate API Key.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("activeApiKey");
    localStorage.removeItem("userInfo");
    setCurrentUser(null);
    onClose();
    window.location.reload();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {currentUser ? "Tenant & API Key Account" : "Multi-Tenant Security"}
              </h2>
              <p className="text-xs text-slate-400">
                {currentUser
                  ? `Logged in as ${currentUser.name}`
                  : "Sign up to isolate your logs with a unique x-api-key"}
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

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-400">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 font-medium">
              {successMsg}
            </div>
          )}

          {currentUser ? (
            /* Logged In View: API Key & Tenant Details */
            <div className="space-y-4">
              <div className="bg-[#0B0F17] p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Tenant Account
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 font-mono text-[10px] border border-cyan-800">
                    {currentUser.tenantId}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <p className="font-bold text-white text-sm">{currentUser.name}</p>
                  <p className="text-slate-400 flex items-center gap-1.5 font-mono">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    {currentUser.email}
                  </p>
                  {currentUser.companyName && (
                    <p className="text-slate-400 flex items-center gap-1.5 font-mono">
                      <Building className="w-3.5 h-3.5 text-slate-500" />
                      {currentUser.companyName}
                    </p>
                  )}
                </div>
              </div>

              {/* Monthly Usage & Tier Quota Meter */}
              <UsageMeter currentUser={currentUser} compact={false} />

              {/* API Key Box */}
              <div className="bg-[#0B0F17] p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-cyan-400" />
                    Your Tenant x-api-key Header
                  </label>
                  <button
                    onClick={handleRegenerateKey}
                    disabled={isSubmitting}
                    className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSubmitting ? "animate-spin" : ""}`} />
                    Regenerate
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={currentUser.apiKey || ""}
                    className="flex-1 bg-[#111827] text-cyan-300 font-mono text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none select-all"
                  />
                  <button
                    onClick={() => copyToClipboard(currentUser.apiKey)}
                    className="px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-medium transition flex items-center space-x-1"
                  >
                    {copiedKey ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Include <code className="text-slate-300">x-api-key: {currentUser.apiKey}</code> in your HTTP headers to isolate your logs.
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-2"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>Log Out of Account</span>
              </button>
            </div>
          ) : (
            /* Logged Out View: Login / Signup Form */
            <>
              {/* Tab Selector */}
              <div className="flex border-b border-slate-800">
                <button
                  onClick={() => setActiveTab("login")}
                  className={`flex-1 py-2 text-xs font-semibold border-b-2 transition ${
                    activeTab === "login"
                      ? "border-cyan-500 text-cyan-400"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setActiveTab("register")}
                  className={`flex-1 py-2 text-xs font-semibold border-b-2 transition ${
                    activeTab === "register"
                      ? "border-cyan-500 text-cyan-400"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Create Account (Signup)
                </button>
              </div>

              {activeTab === "login" ? (
                <form onSubmit={handleLogin} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="developer@company.com"
                        className="w-full bg-[#0B0F17] text-xs text-white border border-slate-700 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#0B0F17] text-xs text-white border border-slate-700 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 mt-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-lg text-xs transition shadow-lg shadow-cyan-500/10 flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>Sign In to Dashboard</span>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Tarun Verma"
                        className="w-full bg-[#0B0F17] text-xs text-white border border-slate-700 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Company / Organization (Optional)
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Acme Corp"
                        className="w-full bg-[#0B0F17] text-xs text-white border border-slate-700 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="developer@company.com"
                        className="w-full bg-[#0B0F17] text-xs text-white border border-slate-700 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Password (min 6 chars)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#0B0F17] text-xs text-white border border-slate-700 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 mt-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-lg text-xs transition shadow-lg shadow-cyan-500/10 flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>Register & Generate API Key</span>
                    )}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
