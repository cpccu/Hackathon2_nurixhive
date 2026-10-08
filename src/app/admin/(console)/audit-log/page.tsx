"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, Eye } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

type AuditLog = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  createdAt: string;
  actor: { name: string; email: string; role: string } | null;
  metadata?: Record<string, unknown>;
};

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (search) params.set("q", search);
      const res = await apiClient.get<AuditLog[]>(`/api/admin/audit-logs?${params}`, { showToastOnError: false });
      setLogs(res || []);
    } catch { toast.error("Failed to load audit log"); }
    finally { setIsLoading(false); }
  }, [search]);

  useEffect(() => { const t = setTimeout(fetch, 300); return () => clearTimeout(t); }, [fetch]);

  const ACTION_COLORS: Record<string, string> = {
    "auth.admin_login": "text-emerald-400",
    "resource.approve": "text-blue-400",
    "resource.reject": "text-red-400",
    "event.create": "text-purple-400",
    "event.cancel": "text-amber-400",
    "user.deactivate": "text-red-400",
    "complaint.update_status": "text-amber-400",
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Log</h1>
          <p className="text-zinc-400 text-sm mt-1">Immutable record of all admin actions.</p>
        </div>
        <Button variant="ghost" size="sm" className="border border-zinc-800 text-zinc-400 hover:text-white gap-2" onClick={fetch}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input placeholder="Search actions..." className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-emerald-500"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900">
              <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Action</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden md:table-cell">Actor</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Resource</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Time</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-3"><div className="h-4 bg-zinc-800 rounded w-40" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 bg-zinc-800 rounded w-28" /></td>
                    <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 bg-zinc-800 rounded w-20" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-zinc-800 rounded w-24" /></td>
                    <td className="px-4 py-3"><div className="h-7 bg-zinc-800 rounded w-16 ml-auto" /></td>
                  </tr>
                ))
              : logs.length === 0
              ? <tr><td colSpan={5} className="py-12 text-center text-zinc-500 text-sm">No audit events.</td></tr>
              : logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-5 py-3">
                      <span className={`font-mono text-xs font-semibold ${ACTION_COLORS[log.action] || "text-zinc-300"}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-zinc-300 text-sm">{log.actor?.name || "System"}</div>
                      <div className="text-zinc-600 text-xs">{log.actor?.role?.replace("_", " ")}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs font-mono hidden lg:table-cell">
                      {log.resourceType}{log.resourceId ? `/${log.resourceId.slice(-8)}` : ""}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                      {format(new Date(log.createdAt), "MMM d, HH:mm:ss")}
                    </td>
                    <td className="px-4 py-3">
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <Button size="sm" variant="ghost"
                          className="ml-auto flex h-7 text-zinc-500 hover:text-zinc-200 border border-zinc-800 text-xs gap-1"
                          onClick={() => setSelectedLog(log)}>
                          <Eye className="h-3 w-3" /> View
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-emerald-400 font-semibold">{selectedLog.action}</h3>
              <Button size="icon" variant="ghost" className="text-zinc-500 hover:text-white" onClick={() => setSelectedLog(null)}>✕</Button>
            </div>
            <pre className="text-xs text-zinc-300 bg-zinc-800/50 rounded-lg p-4 overflow-auto max-h-64">
              {JSON.stringify(selectedLog.metadata, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
