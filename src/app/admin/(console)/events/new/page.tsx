"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api-client";
import { ArrowLeft, Calendar, Image as ImageIcon, Save } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const EVENT_TYPES = ["WORKSHOP", "CONTEST", "SEMINAR", "CULTURAL", "SPORTS", "MEETUP", "OTHER"];
const STATUSES = ["DRAFT", "PUBLISHED"];

export default function NewEventPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "WORKSHOP",
    status: "DRAFT",
    venue: "",
    startAt: "",
    endAt: "",
    capacity: "",
    registrationDeadline: "",
    clubId: "",
    bannerUrl: "",
  });

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.startAt) return toast.error("Title and start time are required.");
    setIsSubmitting(true);

    const body: Record<string, unknown> = {
      title: form.title,
      description: form.description || undefined,
      type: form.type,
      status: form.status,
      venue: form.venue || undefined,
      startAt: new Date(form.startAt).toISOString(),
      endAt: form.endAt ? new Date(form.endAt).toISOString() : undefined,
      capacity: form.capacity ? parseInt(form.capacity) : undefined,
      registrationDeadline: form.registrationDeadline ? new Date(form.registrationDeadline).toISOString() : undefined,
      clubId: form.clubId || undefined,
      bannerUrl: form.bannerUrl || undefined,
    };

    await toast.promise(
      apiClient.post("/api/admin/events", body),
      {
        loading: "Creating event...",
        success: "Event created! Public site updated ✓",
        error: (e) => `Failed: ${e.message}`,
      }
    ).then(() => {
      router.push("/admin/events");
    }).catch(() => {}).finally(() => setIsSubmitting(false));
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/events">
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white border border-zinc-800 h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Create Event</h1>
          <p className="text-zinc-400 text-sm mt-0.5">Fill in the details below.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core details */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Event Details
          </h2>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Title <span className="text-red-400">*</span></label>
            <Input value={form.title} onChange={update("title")} placeholder="e.g. Git & GitHub Workshop" required
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Description</label>
            <textarea
              value={form.description} onChange={update("description")}
              placeholder="Describe the event in detail..."
              rows={4}
              className="w-full px-3 py-2.5 rounded-md text-sm bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Type</label>
              <select value={form.type} onChange={update("type")}
                className="w-full px-3 py-2.5 text-sm rounded-md bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Status</label>
              <select value={form.status} onChange={update("status")}
                className="w-full px-3 py-2.5 text-sm rounded-md bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Venue</label>
            <Input value={form.venue} onChange={update("venue")} placeholder="e.g. Room 305, Academic Building 1"
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500" />
          </div>
        </section>

        {/* Scheduling */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Scheduling</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Start Time <span className="text-red-400">*</span></label>
              <Input type="datetime-local" value={form.startAt} onChange={update("startAt")} required
                className="bg-zinc-800 border-zinc-700 text-white focus-visible:ring-emerald-500" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">End Time</label>
              <Input type="datetime-local" value={form.endAt} onChange={update("endAt")}
                className="bg-zinc-800 border-zinc-700 text-white focus-visible:ring-emerald-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Capacity</label>
              <Input type="number" min="1" value={form.capacity} onChange={update("capacity")} placeholder="Leave blank for unlimited"
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Registration Deadline</label>
              <Input type="datetime-local" value={form.registrationDeadline} onChange={update("registrationDeadline")}
                className="bg-zinc-800 border-zinc-700 text-white focus-visible:ring-emerald-500" />
            </div>
          </div>
        </section>

        {/* Banner */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <ImageIcon className="h-4 w-4" /> Banner Image
          </h2>
          <p className="text-xs text-zinc-500">Upload a banner first via the image upload endpoint, then paste the URL here.</p>
          <Input value={form.bannerUrl} onChange={update("bannerUrl")} placeholder="https://wqsc48wcpm.ufs.sh/f/..."
            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500" />
        </section>

        <div className="flex gap-4">
          <Link href="/admin/events" className="flex-1">
            <Button type="button" variant="ghost" className="w-full border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-0 gap-2">
            <Save className="h-4 w-4" />
            {isSubmitting ? "Saving..." : "Create Event"}
          </Button>
        </div>
      </form>
    </div>
  );
}
