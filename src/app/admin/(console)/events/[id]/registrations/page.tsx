"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, QrCode, CheckCircle2, XCircle, Clock } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import toast from "react-hot-toast";

type Registration = {
  id: string;
  status: string;
  checkedInAt: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; studentId: string | null };
};

const STATUS_STYLE: Record<string, string> = {
  REGISTERED: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  CHECKED_IN: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  CANCELLED: "text-zinc-500 bg-zinc-800 border-zinc-700",
};

export default function EventRegistrationsPage() {
  const { id } = useParams<{ id: string }>();
  const [regs, setRegs] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (search) params.set("q", search);
      const res = await apiClient.get<Registration[]>(`/api/admin/events/${id}/registrations?${params}`, { showToastOnError: false });
      setRegs(res || []);
    } catch { toast.error("Failed to load registrations"); }
    finally { setIsLoading(false); }
  }, [id, search]);

  useEffect(() => { const t = setTimeout(fetch, 300); return () => clearTimeout(t); }, [fetch]);

  const exportCsv = () => {
    const rows = [
      ["Name", "Email", "Student ID", "Status", "Registered At", "Checked In At"],
      ...regs.map((r) => [r.user.name, r.user.email, r.user.studentId ?? "", r.status, r.createdAt, r.checkedInAt ?? ""]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `event-${id}-registrations.csv`;
    a.click();
    toast.success("CSV downloaded");
  };

  const checked = regs.filter((r) => r.status === "CHECKED_IN").length;
  const total = regs.filter((r) => r.status !== "CANCELLED").length;

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Registrations</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {checked} / {total} checked in
            {total > 0 && <span className="ml-2 text-emerald-400 font-medium">{Math.round((checked / total) * 100)}%</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/events/${id}/checkin`}>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 gap-2">
              <QrCode className="h-4 w-4" /> Live Check-In
            </Button>
          </Link>
          <Button variant="ghost" className="border border-zinc-800 text-zinc-400 hover:text-white gap-2" onClick={exportCsv}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mb-6 h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${(checked / total) * 100}%` }} />
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input placeholder="Search by name or email..." className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-emerald-500"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900">
              <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Student</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden md:table-cell">Student ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Registered</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Checked In</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4"><div className="h-4 bg-zinc-800 rounded w-36" /></td>
                    <td className="px-4 py-4 hidden md:table-cell"><div className="h-4 bg-zinc-800 rounded w-20" /></td>
                    <td className="px-4 py-4"><div className="h-5 bg-zinc-800 rounded w-16" /></td>
                    <td className="px-4 py-4 hidden lg:table-cell"><div className="h-4 bg-zinc-800 rounded w-24" /></td>
                    <td className="px-4 py-4 hidden lg:table-cell"><div className="h-4 bg-zinc-800 rounded w-24" /></td>
                  </tr>
                ))
              : regs.length === 0
              ? <tr><td colSpan={5} className="py-12 text-center text-zinc-500 text-sm">No registrations yet.</td></tr>
              : regs.map((reg) => (
                  <tr key={reg.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-medium text-zinc-100">{reg.user.name}</div>
                      <div className="text-xs text-zinc-500">{reg.user.email}</div>
                    </td>
                    <td className="px-4 py-4 text-zinc-400 text-sm hidden md:table-cell font-mono">{reg.user.studentId || "—"}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${STATUS_STYLE[reg.status] || ""}`}>
                        {reg.status === "CHECKED_IN" ? <CheckCircle2 className="inline h-3 w-3 mr-1" /> : reg.status === "CANCELLED" ? <XCircle className="inline h-3 w-3 mr-1" /> : <Clock className="inline h-3 w-3 mr-1" />}
                        {reg.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-zinc-500 text-xs hidden lg:table-cell">{format(new Date(reg.createdAt), "MMM d, h:mm a")}</td>
                    <td className="px-4 py-4 text-emerald-400 text-xs hidden lg:table-cell">
                      {reg.checkedInAt ? format(new Date(reg.checkedInAt), "MMM d, h:mm a") : "—"}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
