import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Zap,
  ShieldCheck,
  Sparkles,
  HardDrive,
  CreditCard,
  Building,
  RefreshCw,
  AlertCircle,
  Activity,
} from "lucide-react";
import client from "../api/client";
import UpgradeCheckoutModal from "../components/UpgradeCheckoutModal";

export default function BillingPage({ currentUser, setCurrentUser }) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [error, setError] = useState(null);

  // Upgrade Checkout Modal State
  const [selectedCheckoutPlan, setSelectedCheckoutPlan] = useState(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const [usageData, setUsageData] = useState({
    currentMonthUsage: currentUser?.currentMonthUsage || 0,
    monthlyLogLimit: currentUser?.monthlyLogLimit || 10000,
  });

  const fetchUsage = async () => {
    try {
      const res = await client.get("/auth/usage");
      if (res.data) {
        setUsageData({
          currentMonthUsage: res.data.currentMonthUsage || 0,
          monthlyLogLimit: res.data.monthlyLogLimit || 10000,
        });
      }
    } catch {
      /* fallback */
    }
  };

  useEffect(() => {
    fetchUsage();
  }, [currentUser]);

  const currentLimit = currentUser?.monthlyLogLimit || usageData.monthlyLogLimit;
  const currentUsage = currentUser?.currentMonthUsage || usageData.currentMonthUsage;
  const usagePercentage = Math.min(100, Math.round((currentUsage / currentLimit) * 100));

  const handleOpenCheckout = (planName, planCode, priceStr, targetLimit, retentionStr) => {
    setSelectedCheckoutPlan({
      name: planName,
      code: planCode,
      price: priceStr,
      limit: targetLimit,
      retention: retentionStr,
    });
    setIsCheckoutOpen(true);
  };

  const handleUpgradeSuccess = (updatedUser) => {
    if (setCurrentUser) setCurrentUser(updatedUser);
    setUsageData((prev) => ({
      ...prev,
      monthlyLogLimit: updatedUser.monthlyLogLimit,
    }));
    setSuccessMsg(
      `Plan Tier updated to ${updatedUser.monthlyLogLimit >= 500000 ? "Pro Production" : "Custom"} (${updatedUser.monthlyLogLimit.toLocaleString()} monthly log quota active)!`
    );
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  return (
    <div className="min-h-screen bg-[#090D14] text-slate-100 font-sans flex flex-col">
      {/* Top Header Navigation */}
      <header className="border-b border-slate-800 bg-[#0B0F17]/90 backdrop-blur sticky top-0 z-40 px-4 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center space-x-2 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <h1 className="text-base font-bold text-white tracking-tight">
              CloudLog <span className="text-cyan-400 font-normal">Pricing & Billing</span>
            </h1>
          </div>
        </div>

        {/* Current Plan Badge */}
        <div className="flex items-center space-x-3">
          <span className="text-xs text-slate-400 hidden sm:inline">Active Subscription:</span>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 fill-cyan-400" />
            {currentLimit >= 10000000
              ? "ENTERPRISE TIER"
              : currentLimit >= 500000
              ? "PRO TIER"
              : "FREE TRIAL"}
          </span>
        </div>
      </header>

      {/* Main Billing Content */}
      <main className="flex-1 px-4 lg:px-8 py-10 max-w-6xl mx-auto w-full space-y-8">
        {/* Banner Alert Messages */}
        {successMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-sm text-emerald-300 font-medium flex items-center space-x-2 animate-in fade-in duration-200">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-sm text-rose-300 font-medium flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Current Usage Card Header */}
        <div className="bg-[#0B0F17] p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-cyan-400" />
                Current Monthly Log Usage
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Logs ingested for the current billing cycle across all services.
              </p>
            </div>
            <div className="font-mono text-right">
              <span className="text-xl font-extrabold text-white">
                {currentUsage.toLocaleString()}
              </span>
              <span className="text-sm text-slate-400 font-normal">
                {" "}
                / {currentLimit.toLocaleString()} Logs Used
              </span>
              <span className="ml-3 px-2.5 py-0.5 rounded text-xs font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
                {usagePercentage}%
              </span>
            </div>
          </div>

          {/* Usage Progress Bar */}
          <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-500 ${
                usagePercentage >= 90
                  ? "bg-gradient-to-r from-rose-500 to-red-600"
                  : usagePercentage >= 70
                  ? "bg-gradient-to-r from-amber-500 to-orange-500"
                  : "bg-gradient-to-r from-cyan-500 to-blue-500"
              }`}
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
        </div>

        {/* Tier Cards Grid */}
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Flexible Plans for Every Scale
            </h2>
            <p className="text-xs text-slate-400">
              Upgrade your log limit instantly without restarting any server services or containers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            {/* 1. Free Developer Tier */}
            <div className="bg-[#0B0F17] rounded-2xl border border-slate-800 p-6 flex flex-col justify-between relative overflow-hidden transition hover:border-slate-700">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-white">Free Developer</h3>
                    <p className="text-xs text-slate-400">For side projects & testing</p>
                  </div>
                  {currentLimit <= 10000 && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      CURRENT PLAN
                    </span>
                  )}
                </div>

                <div className="font-mono">
                  <span className="text-3xl font-extrabold text-white">$0</span>
                  <span className="text-xs text-slate-400"> / month</span>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span><strong>10,000</strong> logs / month limit</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span>7-day log data retention</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span>Basic Discord / Slack webhooks</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span>Socket.io Real-time log stream</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                <button
                  disabled={currentLimit <= 10000}
                  onClick={() => handleOpenCheckout("Free Developer", "FREE", "$0", 10000, "7 Days Retention")}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {currentLimit <= 10000 ? "Active Plan" : "Downgrade to Free"}
                </button>
              </div>
            </div>

            {/* 2. Pro Tier (POPULAR) */}
            <div className="bg-gradient-to-b from-[#111C2E] to-[#0B0F17] rounded-2xl border-2 border-cyan-500/80 p-6 flex flex-col justify-between relative shadow-2xl shadow-cyan-500/10 transform md:-translate-y-2">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-extrabold text-[10px] uppercase px-3 py-0.5 rounded-full tracking-wider flex items-center gap-1 shadow-md">
                <Sparkles className="w-3 h-3 fill-slate-950" />
                Most Popular
              </div>

              <div className="space-y-4 pt-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                      Pro Production
                      <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                    </h3>
                    <p className="text-xs text-cyan-300/80">For high-traffic apps & teams</p>
                  </div>
                  {currentLimit === 500000 && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      CURRENT PLAN
                    </span>
                  )}
                </div>

                <div className="font-mono">
                  <span className="text-3xl font-extrabold text-white">$29</span>
                  <span className="text-xs text-slate-400"> / month</span>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-200 pt-2 border-t border-slate-800">
                  <li className="flex items-center space-x-2 font-semibold text-cyan-300">
                    <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span><strong>500,000</strong> logs / month limit</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span>30-day log data retention</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span>Keyword match threshold alerts (5x)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span>Unlimited Discord / Slack Webhooks</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span>Advanced Date-Range & Regex Search</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                <button
                  disabled={currentLimit === 500000}
                  onClick={() => handleOpenCheckout("Pro Production", "PRO", "$29", 500000, "30 Days Retention")}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold rounded-xl text-xs transition shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  {currentLimit === 500000 ? (
                    "Active Pro Plan"
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>Upgrade to Pro ($29/mo)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 3. Enterprise Tier */}
            <div className="bg-[#0B0F17] rounded-2xl border border-slate-800 p-6 flex flex-col justify-between relative overflow-hidden transition hover:border-slate-700">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                      Enterprise
                      <Building className="w-4 h-4 text-purple-400" />
                    </h3>
                    <p className="text-xs text-slate-400">For large scale enterprise clusters</p>
                  </div>
                  {currentLimit >= 10000000 && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
                      CURRENT PLAN
                    </span>
                  )}
                </div>

                <div className="font-mono">
                  <span className="text-3xl font-extrabold text-white">$199</span>
                  <span className="text-xs text-slate-400"> / month</span>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <li className="flex items-center space-x-2 font-semibold text-purple-300">
                    <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span><strong>10,000,000</strong> logs / month limit</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span>90-day long-term archive retention</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span>Dedicated BullMQ + Redis Workers</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span>99.99% SLA Uptime & Priority Support</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                <button
                  disabled={currentLimit >= 10000000}
                  onClick={() => handleOpenCheckout("Enterprise Tier", "ENTERPRISE", "$199", 10000000, "90 Days Retention")}
                  className="w-full py-2.5 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 hover:from-purple-600/30 hover:to-indigo-600/30 text-purple-300 border border-purple-500/30 font-semibold rounded-xl text-xs transition disabled:opacity-50"
                >
                  {currentLimit >= 10000000 ? "Active Enterprise Plan" : "Upgrade to Enterprise ($199/mo)"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Upgrade Checkout Modal */}
      <UpgradeCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        targetPlan={selectedCheckoutPlan}
        currentUser={currentUser}
        onUpgradeSuccess={handleUpgradeSuccess}
      />
    </div>
  );
}
