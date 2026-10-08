"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, AlertTriangle, QrCode, Keyboard, Users, Loader2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import dynamic from "next/dynamic";

// Lazy-load the heavy QR scanner
const QrScanner = dynamic(() => import("@/components/admin/qr-scanner"), { ssr: false, loading: () => (
  <div className="flex items-center justify-center h-64 bg-zinc-900 rounded-xl border border-zinc-800">
    <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
  </div>
) });

type CheckInResult = { status: "success" | "duplicate" | "invalid" | "wrong_event" | "cancelled" | "not_open"; message: string; name?: string };

export default function LiveCheckInPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const [mode, setMode] = useState<"scanner" | "manual">("scanner");
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [counters, setCounters] = useState({ checkedIn: 0, total: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch live counters
  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get<{ checkedIn: number; total: number }>(`/api/admin/events/${eventId}/checkin-stats`, { showToastOnError: false });
        if (res) setCounters(res);
      } catch { /* silent */ }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [eventId]);

  const processToken = async (token: string) => {
    if (!token.trim() || isProcessing) return;
    setIsProcessing(true);
    setResult(null);

    try {
      const res = await apiClient.post<{ message: string; name?: string }>(
        `/api/admin/events/${eventId}/checkin`,
        { qrToken: token.trim() },
        { showToastOnError: false }
      );
      const checkResult: CheckInResult = { status: "success", message: res?.message || "Checked in!", name: res?.name };
      setResult(checkResult);
      setCounters((prev) => ({ ...prev, checkedIn: prev.checkedIn + 1 }));
      // Vibrate on success
      if ("vibrate" in navigator) navigator.vibrate([50, 30, 50]);
      toast.success(`✓ ${res?.name || "Student"} checked in`);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || "UNKNOWN";
      const msg = (err as Error).message || "Check-in failed";
      const STATUS_MAP: Record<string, CheckInResult["status"]> = {
        ALREADY_CHECKED_IN: "duplicate",
        TICKET_NOT_FOUND: "invalid",
        WRONG_EVENT: "wrong_event",
        REGISTRATION_CANCELLED: "cancelled",
        CHECKIN_NOT_OPEN: "not_open",
        CHECKIN_CLOSED: "not_open",
      };
      const status = STATUS_MAP[code] || "invalid";
      setResult({ status, message: msg });
      if ("vibrate" in navigator) navigator.vibrate([100, 50, 100, 50, 100]);
    } finally {
      setIsProcessing(false);
      setManualCode("");
      setTimeout(() => setResult(null), 4000);
      if (mode === "manual") inputRef.current?.focus();
    }
  };

  const RESULT_CONFIG = {
    success: { bg: "bg-emerald-500/10 border-emerald-500/30", icon: CheckCircle2, iconColor: "text-emerald-400", title: "Checked In!" },
    duplicate: { bg: "bg-amber-500/10 border-amber-500/30", icon: AlertTriangle, iconColor: "text-amber-400", title: "Already Checked In" },
    invalid: { bg: "bg-red-500/10 border-red-500/30", icon: XCircle, iconColor: "text-red-400", title: "Invalid Ticket" },
    wrong_event: { bg: "bg-red-500/10 border-red-500/30", icon: XCircle, iconColor: "text-red-400", title: "Wrong Event" },
    cancelled: { bg: "bg-zinc-700/30 border-zinc-700", icon: XCircle, iconColor: "text-zinc-400", title: "Registration Cancelled" },
    not_open: { bg: "bg-blue-500/10 border-blue-500/30", icon: AlertTriangle, iconColor: "text-blue-400", title: "Check-In Not Open" },
  };

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Check-In</h1>
          <p className="text-zinc-400 text-sm mt-1">Scan QR codes or enter ticket codes manually.</p>
        </div>
        <Link href={`/admin/events/${eventId}/registrations`}>
          <Button variant="ghost" className="border border-zinc-800 text-zinc-400 hover:text-white gap-2">
            <Users className="h-4 w-4" /> View All
          </Button>
        </Link>
      </div>

      {/* Live counter */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-1">Checked In</p>
          <p className="text-4xl font-bold text-white">
            {counters.checkedIn}
            <span className="text-zinc-600 text-2xl font-normal"> / {counters.total}</span>
          </p>
        </div>
        {counters.total > 0 && (
          <div className="relative h-16 w-16">
            <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#27272a" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="3"
                strokeDasharray={`${(counters.checkedIn / counters.total) * 100} 100`}
                strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-emerald-400">
              {Math.round((counters.checkedIn / counters.total) * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Mode Toggle */}
      <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl mb-6 gap-1">
        <Button variant="ghost" onClick={() => setMode("scanner")}
          className={`flex-1 gap-2 rounded-lg transition-colors ${mode === "scanner" ? "bg-emerald-600 text-white hover:bg-emerald-600" : "text-zinc-400 hover:text-white"}`}>
          <QrCode className="h-4 w-4" /> Camera Scanner
        </Button>
        <Button variant="ghost" onClick={() => setMode("manual")}
          className={`flex-1 gap-2 rounded-lg transition-colors ${mode === "manual" ? "bg-zinc-700 text-white hover:bg-zinc-700" : "text-zinc-400 hover:text-white"}`}>
          <Keyboard className="h-4 w-4" /> Manual Entry
        </Button>
      </div>

      {/* Scanner / Manual */}
      {mode === "scanner" ? (
        <QrScanner onScan={processToken} isProcessing={isProcessing} />
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-sm text-zinc-400 mb-4">Enter or paste the QR token from the ticket:</p>
          <form onSubmit={(e) => { e.preventDefault(); processToken(manualCode); }} className="flex gap-3">
            <Input ref={inputRef} value={manualCode} onChange={(e) => setManualCode(e.target.value)}
              placeholder="Paste token here..." autoFocus
              className="flex-1 font-mono bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500" />
            <Button type="submit" disabled={isProcessing || !manualCode.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 min-w-[100px]">
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check In"}
            </Button>
          </form>
        </div>
      )}

      {/* Result feedback */}
      {result && (() => {
        const cfg = RESULT_CONFIG[result.status];
        return (
          <div className={`mt-6 rounded-xl border p-5 ${cfg.bg} flex items-start gap-4 animate-in slide-in-from-bottom-4 duration-300`}>
            <cfg.icon className={`h-6 w-6 ${cfg.iconColor} shrink-0 mt-0.5`} />
            <div>
              <p className={`font-bold text-lg ${cfg.iconColor}`}>{cfg.title}</p>
              {result.name && <p className="text-white font-semibold mt-0.5">{result.name}</p>}
              <p className="text-zinc-300 text-sm mt-1">{result.message}</p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
