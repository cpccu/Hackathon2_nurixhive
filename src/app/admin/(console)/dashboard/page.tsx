import type { Metadata } from "next";
import Link from "next/link";
import { Users, Calendar, BookOpen, AlertTriangle, BarChart3, Activity, Clock, ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/prisma";



export const metadata: Metadata = { title: "Admin Dashboard — CampusOS" };

async function getDashboardStats() {
  try {
    const [
      userCount, eventCount, resourceCount, complaintCount,
      pendingResources, openComplaints, recentAuditLogs
    ] = await Promise.all([
      prisma.user.count(),
      prisma.event.count({ where: { status: "PUBLISHED" } }),
      prisma.resource.count({ where: { status: "APPROVED" } }),
      prisma.complaint.count(),
      prisma.resource.count({ where: { status: "PENDING" } }),
      prisma.complaint.count({ where: { status: { in: ["RECEIVED", "IN_REVIEW"] } } }),
      prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, action: true, createdAt: true,
          actor: { select: { name: true, role: true } },
        },
      }),
    ]);

    return { userCount, eventCount, resourceCount, complaintCount, pendingResources, openComplaints, recentAuditLogs };
  } catch {
    return {
      userCount: 0, eventCount: 0, resourceCount: 0, complaintCount: 0,
      pendingResources: 0, openComplaints: 0, recentAuditLogs: [],
    };
  }
}

const STAT_CARDS = [
  { label: "Total Users", key: "userCount", icon: Users, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", href: "/admin/users" },
  { label: "Published Events", key: "eventCount", icon: Calendar, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", href: "/admin/events" },
  { label: "Approved Resources", key: "resourceCount", icon: BookOpen, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", href: "/admin/resources" },
  { label: "Total Complaints", key: "complaintCount", icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", href: "/admin/complaints" },
];

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-zinc-400 mt-1 text-sm">Overview of CampusOS platform activity.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map((card) => {
          const value = stats[card.key as keyof typeof stats] as number;
          return (
            <Link key={card.key} href={card.href}>
              <div className={`group rounded-xl border ${card.border} ${card.bg} p-5 hover:scale-[1.02] transition-transform cursor-pointer`}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2.5 rounded-lg ${card.bg} border ${card.border}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <ArrowUpRight className={`h-4 w-4 ${card.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                </div>
                <div className="text-3xl font-bold text-white mb-1">{value.toLocaleString()}</div>
                <div className="text-sm text-zinc-400">{card.label}</div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Alert banners */}
      <div className="grid gap-4 sm:grid-cols-2">
        {stats.pendingResources > 0 && (
          <Link href="/admin/resources?filter=pending">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-colors">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-300 text-sm">{stats.pendingResources} resources awaiting moderation</p>
                <p className="text-xs text-amber-400/70">Click to review queue</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-amber-400" />
            </div>
          </Link>
        )}
        {stats.openComplaints > 0 && (
          <Link href="/admin/complaints?status=open">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 transition-colors">
              <div className="p-2 rounded-lg bg-red-500/20">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-red-300 text-sm">{stats.openComplaints} open complaints</p>
                <p className="text-xs text-red-400/70">Click to manage</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-red-400" />
            </div>
          </Link>
        )}
      </div>

      {/* Quick actions grid */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-4">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Create Event", href: "/admin/events/new", icon: Calendar, color: "text-emerald-400" },
            { label: "Post Notice", href: "/admin/notices/new", icon: Activity, color: "text-blue-400" },
            { label: "Moderate Resources", href: "/admin/resources?filter=pending", icon: BookOpen, color: "text-purple-400" },
            { label: "View Audit Log", href: "/admin/audit-log", icon: BarChart3, color: "text-amber-400" },
          ].map((action) => (
            <Link key={action.href} href={action.href}>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/70 transition-colors cursor-pointer group">
                <action.icon className={`h-4 w-4 ${action.color}`} />
                <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">{action.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Audit Log */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">Recent Activity</h2>
          <Link href="/admin/audit-log" className="text-xs text-emerald-400 hover:text-emerald-300">View all →</Link>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          {stats.recentAuditLogs.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-sm">No audit activity yet.</div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {(stats.recentAuditLogs as Array<{ id: string; action: string; createdAt: Date; actor: { name: string; role: string } | null }>).map((log) => (
                <div key={log.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">
                    {log.actor?.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300 truncate">
                      <span className="font-medium text-white">{log.actor?.name || "System"}</span>
                      {" "}
                      <span className="font-mono text-emerald-400 text-xs">{log.action}</span>
                    </p>
                    <p className="text-xs text-zinc-500">{log.actor?.role?.replace("_", " ")}</p>
                  </div>
                  <div className="text-xs text-zinc-500 shrink-0">
                    {new Date(log.createdAt).toLocaleDateString("en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
