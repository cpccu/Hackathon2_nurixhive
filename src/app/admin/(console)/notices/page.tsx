"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, Bell, Pin, AlertTriangle, Plus, Trash2, Edit2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import toast from "react-hot-toast";

type Notice = {
  id: string;
  title: string;
  category: string;
  isPinned: boolean;
  isUrgent: boolean;
  createdAt: string;
  department: { code: string } | null;
};

export default function AdminNoticesPage() {
  const router = useRouter();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.set("q", search);
      const res = await apiClient.get<Notice[]>(`/api/admin/notices?${params}`, { showToastOnError: false });
      setNotices(res || []);
    } catch { toast.error("Failed to load notices"); }
    finally { setIsLoading(false); }
  }, [search]);

  useEffect(() => { const t = setTimeout(fetch, 300); return () => clearTimeout(t); }, [fetch]);

  const deleteNotice = async (id: string) => {
    await toast.promise(
      apiClient.delete(`/api/admin/notices/${id}`),
      { loading: "Deleting...", success: "Notice deleted. Public site updated ✓", error: "Failed" }
    );
    setNotices((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Notices & Forms</h1>
          <p className="text-zinc-400 text-sm mt-1">Post campus announcements, class cancellations, and Google Forms.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="border border-zinc-800 text-zinc-400 hover:text-white" onClick={fetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 gap-2"
            onClick={() => router.push("/admin/notices/new")}>
            <Plus className="h-4 w-4" /> New Notice
          </Button>
        </div>
      </div>

      {/* Quick Templates */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <Button variant="ghost" className="border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 gap-2 text-sm"
          onClick={() => router.push("/admin/notices/new?template=class_cancellation")}>
          <AlertTriangle className="h-4 w-4" /> Class Cancellation
        </Button>
        <Button variant="ghost" className="border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 gap-2 text-sm"
          onClick={() => router.push("/admin/notices/new?template=exam")}>
          <Bell className="h-4 w-4" /> Exam Notice
        </Button>
      </div>

      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input placeholder="Search notices..." className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-emerald-500"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />)
          : notices.length === 0
          ? (
              <div className="py-16 text-center text-zinc-500 text-sm border border-zinc-800 rounded-xl">
                No notices yet.{" "}
                <button className="text-emerald-400 hover:underline" onClick={() => router.push("/admin/notices/new")}>Post one →</button>
              </div>
            )
          : notices.map((notice) => (
              <div key={notice.id} className="flex items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors group">
                <div className={`p-2 rounded-lg shrink-0 ${notice.isUrgent ? "bg-red-500/15" : notice.isPinned ? "bg-amber-500/15" : "bg-zinc-800"}`}>
                  {notice.isUrgent
                    ? <AlertTriangle className="h-4 w-4 text-red-400" />
                    : notice.isPinned
                    ? <Pin className="h-4 w-4 text-amber-400" />
                    : <Bell className="h-4 w-4 text-zinc-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-zinc-100 truncate">{notice.title}</span>
                    {notice.isUrgent && <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 rounded">URGENT</span>}
                    {notice.isPinned && <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 rounded">PINNED</span>}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {notice.category}{notice.department ? ` · ${notice.department.code}` : ""} · {format(new Date(notice.createdAt), "MMM d, yyyy")}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-blue-400"
                    onClick={() => router.push(`/admin/notices/${notice.id}/edit`)}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-red-400"
                    onClick={() => deleteNotice(notice.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
