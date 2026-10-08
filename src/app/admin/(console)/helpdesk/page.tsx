"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, Plus, Edit2, Trash2, Globe, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type KbEntry = {
  id: string;
  question: string;
  category: string;
  isPublished: boolean;
  isSample: boolean;
  updatedAt: string;
};

export default function AdminHelpdeskPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<KbEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.set("q", search);
      const res = await apiClient.get<KbEntry[]>(`/api/admin/helpdesk/entries?${params}`, { showToastOnError: false });
      setEntries(res || []);
    } catch { toast.error("Failed to load knowledge base"); }
    finally { setIsLoading(false); }
  }, [search]);

  useEffect(() => { const t = setTimeout(fetch, 300); return () => clearTimeout(t); }, [fetch]);

  const togglePublish = async (entry: KbEntry) => {
    const action = entry.isPublished ? "unpublish" : "publish";
    await toast.promise(
      apiClient.post(`/api/admin/helpdesk/entries/${entry.id}/${action}`, {}),
      {
        loading: `${entry.isPublished ? "Unpublishing" : "Publishing"}...`,
        success: `Entry ${action}ed. Public site updated ✓`,
        error: "Failed",
      }
    );
    setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, isPublished: !e.isPublished } : e));
  };

  const deleteEntry = async (id: string) => {
    setDeleteTarget(null);
    await toast.promise(
      apiClient.delete(`/api/admin/helpdesk/entries/${id}`),
      { loading: "Deleting...", success: "Entry deleted. Public site updated ✓", error: "Failed" }
    );
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Helpdesk / Knowledge Base</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage FAQ entries, chatbot training data, and unanswered questions.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="border border-zinc-800 text-zinc-400 hover:text-white gap-2" onClick={fetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 gap-2"
            onClick={() => router.push("/admin/helpdesk/entries/new")}>
            <Plus className="h-4 w-4" /> New Entry
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input placeholder="Search entries..." className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-emerald-500"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900">
              <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Question</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden md:table-cell">Category</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Published</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4"><div className="h-4 bg-zinc-800 rounded w-64" /></td>
                    <td className="px-4 py-4 hidden md:table-cell"><div className="h-4 bg-zinc-800 rounded w-20" /></td>
                    <td className="px-4 py-4"><div className="h-5 bg-zinc-800 rounded w-14" /></td>
                    <td className="px-4 py-4"><div className="h-8 bg-zinc-800 rounded w-24 ml-auto" /></td>
                  </tr>
                ))
              : entries.length === 0
              ? <tr><td colSpan={4} className="py-12 text-center text-zinc-500 text-sm">No KB entries found.</td></tr>
              : entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="font-medium text-zinc-100 line-clamp-1 max-w-sm">{entry.question}</div>
                      {entry.isSample && <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded mt-1 inline-block">Sample — verify before publishing</span>}
                    </td>
                    <td className="px-4 py-4 text-zinc-400 text-sm hidden md:table-cell">{entry.category}</td>
                    <td className="px-4 py-4">
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${entry.isPublished ? "text-emerald-400" : "text-zinc-500"}`}>
                        {entry.isPublished ? <Globe className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        {entry.isPublished ? "Live" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost"
                          className={`h-8 w-8 ${entry.isPublished ? "text-zinc-400 hover:text-amber-400" : "text-zinc-400 hover:text-emerald-400"}`}
                          title={entry.isPublished ? "Unpublish" : "Publish"}
                          onClick={() => togglePublish(entry)}>
                          {entry.isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-blue-400"
                          onClick={() => router.push(`/admin/helpdesk/entries/${entry.id}/edit`)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-red-400"
                          onClick={() => setDeleteTarget(entry.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-3">Delete KB Entry?</h3>
            <p className="text-zinc-400 text-sm mb-6">This will remove it from the knowledge base and may affect chatbot answers.</p>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 border border-zinc-700 text-zinc-300 hover:bg-zinc-800" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white border-0" onClick={() => deleteEntry(deleteTarget)}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
