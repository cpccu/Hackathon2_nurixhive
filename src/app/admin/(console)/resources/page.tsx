"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle2, XCircle, Eye, RefreshCw, FileText } from "lucide-react";
import toast from "react-hot-toast";

type Resource = {
  id: string;
  title: string;
  status: string;
  type: string;
  fileUrl: string;
  uploader: { name: string; email: string } | null;
  course: { code: string; name: string } | null;
  createdAt: string;
};

const STATUS_STYLE: Record<string, string> = {
  APPROVED: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  PENDING: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  REJECTED: "text-red-400 bg-red-500/10 border-red-500/20",
};

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");
  const [search, setSearch] = useState("");
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchResources = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (filter) params.set("status", filter);
      if (search) params.set("q", search);
      const res = await apiClient.get<Resource[]>(`/api/admin/resources?${params}`, { showToastOnError: false });
      setResources(res || []);
    } catch { toast.error("Failed to load resources"); }
    finally { setIsLoading(false); }
  }, [filter, search]);

  useEffect(() => { const t = setTimeout(fetchResources, 300); return () => clearTimeout(t); }, [fetchResources]);

  const moderate = async (id: string, action: "approve" | "reject", reason?: string) => {
    await toast.promise(
      apiClient.post(`/api/admin/resources/${id}/${action}`, action === "reject" ? { reason } : {}),
      {
        loading: `${action === "approve" ? "Approving" : "Rejecting"}...`,
        success: `Resource ${action}d. Public site updated ✓`,
        error: `Failed to ${action} resource`,
      }
    );
    setResources((prev) => prev.filter((r) => r.id !== id));
    setRejectTarget(null);
    setRejectReason("");
  };

  const pendingCount = resources.filter((r) => r.status === "PENDING").length;

  return (
    <div className="p-6 md:p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Resources</h1>
          <p className="text-zinc-400 text-sm mt-1">Moderate uploads and manage the academic resource hub.</p>
        </div>
        <Button variant="ghost" size="sm" className="border border-zinc-800 text-zinc-400 hover:text-white gap-2" onClick={fetchResources}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {["PENDING", "APPROVED", "REJECTED", ""].map((s) => (
          <button key={s || "all"} onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${filter === s
              ? "bg-emerald-600 border-emerald-600 text-white"
              : "border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
            }`}>
            {s || "All"}
            {s === "PENDING" && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">{pendingCount}</span>
            )}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input placeholder="Search..." className="pl-9 h-9 w-48 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-emerald-500 text-sm"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900">
              <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Title</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden md:table-cell">Uploader</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Course</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4"><div className="h-4 bg-zinc-800 rounded w-48" /></td>
                    <td className="px-4 py-4 hidden md:table-cell"><div className="h-4 bg-zinc-800 rounded w-28" /></td>
                    <td className="px-4 py-4 hidden lg:table-cell"><div className="h-4 bg-zinc-800 rounded w-16" /></td>
                    <td className="px-4 py-4"><div className="h-5 bg-zinc-800 rounded w-16" /></td>
                    <td className="px-4 py-4"><div className="h-8 bg-zinc-800 rounded w-32 ml-auto" /></td>
                  </tr>
                ))
              : resources.length === 0
              ? <tr><td colSpan={5} className="py-12 text-center text-zinc-500 text-sm">No resources matching this filter.</td></tr>
              : resources.map((res) => (
                  <tr key={res.id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-zinc-600 shrink-0" />
                        <div>
                          <div className="font-medium text-zinc-100 line-clamp-1 max-w-xs">{res.title}</div>
                          <div className="text-xs text-zinc-500 font-mono uppercase">{res.type}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="text-zinc-300 text-sm">{res.uploader?.name || "—"}</div>
                      <div className="text-xs text-zinc-500">{res.uploader?.email}</div>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell text-zinc-400 text-sm font-mono">{res.course?.code || "—"}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${STATUS_STYLE[res.status] || ""}`}>
                        {res.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <a href={res.fileUrl} target="_blank" rel="noopener noreferrer">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white" title="Preview PDF">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                        {res.status === "PENDING" && (
                          <>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-emerald-400" title="Approve"
                              onClick={() => moderate(res.id, "approve")}>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-red-400" title="Reject"
                              onClick={() => setRejectTarget(res.id)}>
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Reject reason modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Reject Resource</h3>
            <p className="text-zinc-400 text-sm mb-4">Provide a reason (optional but helpful for the student):</p>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              rows={3} placeholder="e.g. Duplicate resource, incorrect course..."
              className="w-full px-3 py-2.5 rounded-md text-sm bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none mb-4" />
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                onClick={() => { setRejectTarget(null); setRejectReason(""); }}>Cancel</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white border-0"
                onClick={() => moderate(rejectTarget, "reject", rejectReason)}>Reject</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
