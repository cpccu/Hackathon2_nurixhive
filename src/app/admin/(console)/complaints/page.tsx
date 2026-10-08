"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, User, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";

type Complaint = {
  id: string;
  ticketNo: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  isAnonymous: boolean;
  createdAt: string;
  user: { name: string; email: string } | null;
  assignee: { name: string } | null;
};

const STATUS_STYLE: Record<string, string> = {
  OPEN: "text-red-400 bg-red-500/10 border-red-500/20",
  IN_PROGRESS: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  RESOLVED: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  CLOSED: "text-zinc-500 bg-zinc-800 border-zinc-700",
};

const PRIORITY_STYLE: Record<string, string> = {
  LOW: "text-zinc-400",
  MEDIUM: "text-amber-400",
  HIGH: "text-red-400",
};

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [note, setNote] = useState("");
  const [isPublicNote, setIsPublicNote] = useState(false);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("q", search);
      const res = await apiClient.get<Complaint[]>(`/api/admin/complaints?${params}`, { showToastOnError: false });
      setComplaints(res || []);
    } catch { toast.error("Failed to load complaints"); }
    finally { setIsLoading(false); }
  }, [statusFilter, search]);

  useEffect(() => { const t = setTimeout(fetch, 300); return () => clearTimeout(t); }, [fetch]);

  const updateStatus = async () => {
    if (!selected || !newStatus) return;
    await toast.promise(
      apiClient.patch(`/api/admin/complaints/${selected.id}/status`, {
        status: newStatus,
        note: note || undefined,
        isPublic: isPublicNote,
      }),
      {
        loading: "Updating complaint...",
        success: "Complaint updated. Ticket holder notified ✓",
        error: "Failed to update",
      }
    );
    setComplaints((prev) => prev.map((c) => c.id === selected.id ? { ...c, status: newStatus } : c));
    setSelected(null);
    setNote("");
    setNewStatus("");
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Complaints</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage student complaints and update ticket timelines.</p>
        </div>
        <Button variant="ghost" size="sm" className="border border-zinc-800 text-zinc-400 hover:text-white gap-2" onClick={fetch}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          {["", ...STATUSES].map((s) => (
            <button key={s || "all"} onClick={() => setStatusFilter(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${statusFilter === s
                ? "bg-emerald-600 border-emerald-600 text-white" : "border-zinc-800 text-zinc-400 hover:text-white"}`}>
              {s || "All"}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input placeholder="Search ticket or keyword..." className="pl-9 h-9 w-56 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-emerald-500 text-sm"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900">
              <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Ticket</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden md:table-cell">Category</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Submitter</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden md:table-cell">Priority</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Filed</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4"><div className="h-4 bg-zinc-800 rounded w-32" /></td>
                    <td className="px-4 py-4 hidden md:table-cell"><div className="h-4 bg-zinc-800 rounded w-20" /></td>
                    <td className="px-4 py-4 hidden lg:table-cell"><div className="h-4 bg-zinc-800 rounded w-28" /></td>
                    <td className="px-4 py-4"><div className="h-5 bg-zinc-800 rounded w-20" /></td>
                    <td className="px-4 py-4 hidden md:table-cell"><div className="h-4 bg-zinc-800 rounded w-12" /></td>
                    <td className="px-4 py-4 hidden lg:table-cell"><div className="h-4 bg-zinc-800 rounded w-20" /></td>
                    <td className="px-4 py-4"><div className="h-8 bg-zinc-800 rounded w-20 ml-auto" /></td>
                  </tr>
                ))
              : complaints.length === 0
              ? <tr><td colSpan={7} className="py-12 text-center text-zinc-500 text-sm">No complaints in this category.</td></tr>
              : complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="font-mono text-emerald-400 font-semibold text-sm">{c.ticketNo}</div>
                      <div className="text-zinc-400 text-xs mt-0.5 line-clamp-1 max-w-xs">{c.description}</div>
                    </td>
                    <td className="px-4 py-4 text-zinc-300 text-sm hidden md:table-cell">{c.category}</td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      {c.isAnonymous ? (
                        <span className="text-zinc-500 text-sm flex items-center gap-1"><User className="h-3.5 w-3.5" /> Anonymous</span>
                      ) : (
                        <div>
                          <div className="text-zinc-300 text-sm">{c.user?.name || "—"}</div>
                          <div className="text-zinc-500 text-xs">{c.user?.email}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${STATUS_STYLE[c.status] || ""}`}>
                        {c.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span className={`text-sm font-semibold ${PRIORITY_STYLE[c.priority] || "text-zinc-400"}`}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-zinc-500 text-xs hidden lg:table-cell">
                      {format(new Date(c.createdAt), "MMM d, h:mm a")}
                    </td>
                    <td className="px-4 py-4">
                      <Button size="sm" variant="ghost"
                        className="ml-auto flex h-8 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 gap-1"
                        onClick={() => { setSelected(c); setNewStatus(c.status); }}>
                        Update <ChevronDown className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Update Status Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-white">Update Complaint</h3>
                <p className="font-mono text-emerald-400 text-sm">{selected.ticketNo}</p>
              </div>
              <Button size="icon" variant="ghost" className="text-zinc-500 hover:text-white -mt-1"
                onClick={() => setSelected(null)}>✕</Button>
            </div>

            <p className="text-sm text-zinc-400 bg-zinc-800/50 p-3 rounded-lg mb-5 line-clamp-3">{selected.description}</p>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">New Status</label>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-md bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Note (Timeline Update)</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
                  placeholder="Add a progress note or resolution details..."
                  className="w-full px-3 py-2.5 rounded-md text-sm bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={isPublicNote} onChange={(e) => setIsPublicNote(e.target.checked)}
                  className="w-4 h-4 rounded accent-emerald-500" />
                <span className="text-sm text-zinc-300">Visible to complainant (public note)</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="ghost" className="flex-1 border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                onClick={() => setSelected(null)}>Cancel</Button>
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-0" onClick={updateStatus}>
                Update Complaint
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
