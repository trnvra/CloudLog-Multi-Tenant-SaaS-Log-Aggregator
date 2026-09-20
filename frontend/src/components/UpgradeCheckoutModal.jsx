import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  CreditCard,
  Lock,
  X,
  CheckCircle2,
  Zap,
  Mail,
  RefreshCw,
  Sparkles,
  Building,
  Calendar,
  UserCheck,
  Receipt,
} from "lucide-react";
import client from "../api/client";

export default function UpgradeCheckoutModal({
  isOpen,
  onClose,
  targetPlan,
  currentUser,
  onUpgradeSuccess,
}) {
  const [billingEmail, setBillingEmail] = useState("");
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("123");
  const [cardHolder, setCardHolder] = useState(currentUser?.name || "Tarun Verma");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setBillingEmail(currentUser?.email || "developer@company.com");
      setCardHolder(currentUser?.name || "Tarun Verma");
      setCardNumber("4242 4242 4242 4242");
      setCardExpiry("12/28");
      setCardCvv("123");
      setError(null);
      setSuccessMsg(null);
      setInvoice(null);
      setProcessingStatus("");
    }
  }, [isOpen, currentUser]);

  if (!isOpen || !targetPlan) return null;

  const isPaidPlan =
    targetPlan.code !== "FREE" &&
    targetPlan.price !== "$0" &&
    targetPlan.price !== "$0/mo";

  const handleConfirmUpgrade = async (e) => {
    e.preventDefault();

    if (!billingEmail.trim()) {
      setError("Please enter a valid billing email address.");
      return;
    }

    if (isPaidPlan) {
      const cleanCard = cardNumber.replace(/\s+/g, "");
      if (cleanCard.length < 15) {
        setError("Please enter a valid 16-digit credit card number.");
        return;
      }
      if (!cardExpiry.includes("/")) {
        setError("Please enter card expiry date format MM/YY.");
        return;
      }
      if (cardCvv.length < 3) {
        setError("Please enter a valid 3-digit CVV code.");
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // Step 1 Simulation: Card Validation
      setProcessingStatus("Validating Payment Card & Billing Info...");
      await new Promise((resolve) => setTimeout(resolve, 600));

      if (isPaidPlan) {
        // Step 2 Simulation: Processing Charge
        setProcessingStatus(`Processing Payment Charge of ${targetPlan.price}/mo...`);
        await new Promise((resolve) => setTimeout(resolve, 700));
      }

      // Step 3 Simulation: Backend Quota Activation
      setProcessingStatus("Activating Subscription Log Quota...");
      const res = await client.post("/auth/upgrade-plan", {
        planTier: targetPlan.code,
        tier: targetPlan.code,
        monthlyLogLimit: targetPlan.limit,
        limit: targetPlan.limit,
        billingEmail: billingEmail.trim(),
        email: billingEmail.trim(),
      });

      if (res.data?.invoice) {
        setInvoice(res.data.invoice);
      }

      setSuccessMsg(
        res.data?.message ||
          `Successfully upgraded to ${targetPlan.name} (${targetPlan.limit.toLocaleString()} logs quota active)!`
      );

      const updatedUser = res.data?.user
        ? { ...currentUser, ...res.data.user }
        : { ...currentUser, monthlyLogLimit: targetPlan.limit };

      if (onUpgradeSuccess) {
        onUpgradeSuccess(updatedUser);
      }

      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 2500);
    } catch (err) {
      console.error("[Checkout API Error]", err);
      const serverErrMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to process upgrade checkout.";
      setError(serverErrMsg);
    } finally {
      setIsSubmitting(false);
      setProcessingStatus("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-cyan-500/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#0B0F17]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 text-cyan-400 border border-cyan-500/30">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                Subscription Checkout
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  {isPaidPlan ? "Paid Plan" : "Free Plan"}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isPaidPlan
                  ? "Enter payment card details & confirm subscription"
                  : "Confirm email to activate Free Developer Tier"}
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
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-400 flex items-center gap-2">
              <X className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-semibold space-y-1.5 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
              {invoice && (
                <div className="font-mono text-[10px] text-slate-400 pl-7 flex items-center gap-2">
                  <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Invoice ID: {invoice.invoiceId} ({invoice.amount} Paid)</span>
                </div>
              )}
            </div>
          )}

          {/* Target Plan Summary Box */}
          <div className="bg-[#0B0F17] p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Target Plan Tier
                </span>
                <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                  {targetPlan.name}
                  {targetPlan.code === "PRO" && (
                    <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
                  )}
                  {targetPlan.code === "ENTERPRISE" && (
                    <Building className="w-4 h-4 text-purple-400" />
                  )}
                </h3>
              </div>
              <div className="text-right font-mono">
                <span className="text-xl font-extrabold text-cyan-400">
                  {targetPlan.price}
                </span>
                <span className="text-xs text-slate-400">/mo</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                <span className="text-slate-400 text-[10px] block">Monthly Quota</span>
                <span className="text-white font-bold">
                  {targetPlan.limit.toLocaleString()} logs
                </span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                <span className="text-slate-400 text-[10px] block">Log Retention</span>
                <span className="text-emerald-400 font-bold">
                  {targetPlan.retention || "30 Days Retention"}
                </span>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleConfirmUpgrade} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Billing Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  placeholder="billing@company.com"
                  className="w-full bg-[#0B0F17] text-xs text-white border border-slate-700 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            {/* Conditional Payment Card Section */}
            {isPaidPlan ? (
              <div className="bg-[#0B0F17] p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    Payment Card Details
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 font-mono text-[10px] border border-cyan-800 font-bold">
                    Demo Interactive Card
                  </span>
                </div>

                {/* Cardholder Name */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Cardholder Name
                  </label>
                  <div className="relative">
                    <UserCheck className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="TARUN VERMA"
                      className="w-full bg-[#111827] text-xs text-white border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 font-mono focus:outline-none focus:border-cyan-500 uppercase"
                    />
                  </div>
                </div>

                {/* Card Number */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Card Number
                  </label>
                  <div className="relative">
                    <CreditCard className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4242 4242 4242 4242"
                      className="w-full bg-[#111827] text-xs text-cyan-300 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Expiry & CVV */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Expires (MM/YY)
                    </label>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="text"
                        required
                        maxLength={5}
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="12/28"
                        className="w-full bg-[#111827] text-xs text-white border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      CVV Code
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="password"
                        required
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="123"
                        className="w-full bg-[#111827] text-xs text-white border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Free Plan ($0/mo) selected — No payment card required.</span>
              </div>
            )}

            {/* Processing Status Banner */}
            {processingStatus && (
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-xs text-cyan-300 font-mono flex items-center space-x-2 animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>{processingStatus}</span>
              </div>
            )}

            {/* Submit Action Buttons */}
            <div className="pt-2 flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-2/3 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold rounded-xl text-xs transition shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {isPaidPlan
                        ? `Confirm & Pay (${targetPlan.price}/mo)`
                        : "Activate Free Developer Tier"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
