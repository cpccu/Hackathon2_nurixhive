"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit2, Trash2, Eye, Users, AlertTriangle, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";

type Event = {
  id: string;
  title: string;
  slug: string;
  status: string;
  type: string;
  startAt: string;
  registrationCount: number;
  capacity: number | null;
  club: { name: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  DRAFT: "text-zinc-400 bg-zinc-700/30 border-zinc-700",
  CANCELLED: "text-red-400 bg-red-500/10 border-red-500/20",
  COMPLETED: "text-blue-400 bg-blue-500/10 border-blue-500/20",
};

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("q", search);
      const res = await apiClient.get<Event[]>(`/api/admin/events?${params}`, { showToastOnError: false });
      setEvents(res || []);
    } catch {
      toast.error("Failed to load events");
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(fetchEvents, 300);
    return () => clearTimeout(t);
  }, [fetchEvents]);

  const handleDelete = async (id: string) => {
    setConfirmDelete(null);
    await toast.promise(
      apiClient.delete(`/api/admin/events/${id}`),
      {
        loading: "Deleting event...",
        success: "Event deleted. Public site updated ✓",
        error: "Failed to delete event",
      }
    );
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Events</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage events, registrations, and check-in.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-white border border-zinc-800"
            onClick={fetchEvents}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Link href="/admin/events/new">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 gap-2">
              <Plus className="h-4 w-4" /> New Event
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search events..."
            className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-emerald-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Event</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden md:table-cell">Club</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden md:table-cell">Registrations</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-5 py-4"><div className="h-4 bg-zinc-800 rounded w-48" /></td>
                      <td className="px-4 py-4 hidden md:table-cell"><div className="h-4 bg-zinc-800 rounded w-24" /></td>
                      <td className="px-4 py-4 hidden lg:table-cell"><div className="h-4 bg-zinc-800 rounded w-20" /></td>
                      <td className="px-4 py-4"><div className="h-5 bg-zinc-800 rounded w-16" /></td>
                      <td className="px-4 py-4 hidden md:table-cell"><div className="h-4 bg-zinc-800 rounded w-12" /></td>
                      <td className="px-4 py-4"><div className="h-8 bg-zinc-800 rounded w-24 ml-auto" /></td>
                    </tr>
                  ))
                : events.length === 0
                ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-zinc-500 text-sm">
                        No events found.{" "}
                        <Link href="/admin/events/new" className="text-emerald-400 hover:underline">Create one →</Link>
                      </td>
                    </tr>
                  )
                : events.map((event) => (
                    <tr key={event.id} className="hover:bg-zinc-800/30 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="font-medium text-zinc-100 line-clamp-1 max-w-xs">{event.title}</div>
                        <div className="text-xs text-zinc-500 mt-0.5 font-mono">{event.type}</div>
                      </td>
                      <td className="px-4 py-4 text-zinc-400 text-sm hidden md:table-cell">
                        {event.club?.name || "—"}
                      </td>
                      <td className="px-4 py-4 text-zinc-400 text-sm hidden lg:table-cell">
                        {format(new Date(event.startAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${STATUS_COLORS[event.status] || "text-zinc-400"}`}>
                          {event.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-zinc-400 text-sm hidden md:table-cell">
                        {event.registrationCount}{event.capacity ? ` / ${event.capacity}` : ""}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <Link href={`/events/${event.slug}`} target="_blank">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white" title="View public">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Link href={`/admin/events/${event.id}/registrations`}>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-emerald-400" title="Registrations">
                              <Users className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Link href={`/admin/events/${event.id}/edit`}>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-blue-400" title="Edit">
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-zinc-400 hover:text-red-400"
                            title="Delete"
                            onClick={() => setConfirmDelete(event.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/20">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Delete Event?</h3>
            </div>
            <p className="text-zinc-400 text-sm mb-6">
              This will permanently delete the event and cancel all registrations. Registered students will be notified. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1 border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white border-0"
                onClick={() => handleDelete(confirmDelete)}
              >
                Delete Event
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
