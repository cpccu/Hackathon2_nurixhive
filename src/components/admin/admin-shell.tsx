"use client";

import {
  AlertTriangle,
  Bell,
  BookOpen,
  Calendar,
  ChevronsLeft,
  ClipboardList,
  ExternalLink,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ComponentType, type ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Sheet } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toastPromise } from "@/lib/toast";
import { cn } from "@/lib/utils";

type StaffRole = "MODERATOR" | "CLUB_ADMIN" | "ADMIN" | "SUPER_ADMIN";

interface AdminNavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  roles?: StaffRole[];
}

const NAV: AdminNavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/events", label: "Events", icon: Calendar, roles: ["SUPER_ADMIN", "ADMIN", "CLUB_ADMIN"] },
  { href: "/admin/resources", label: "Resources", icon: BookOpen, roles: ["SUPER_ADMIN", "ADMIN", "MODERATOR"] },
  { href: "/admin/helpdesk", label: "Helpdesk / KB", icon: HelpCircle, roles: ["SUPER_ADMIN", "ADMIN"] },
  { href: "/admin/notices", label: "Notices & forms", icon: Bell, roles: ["SUPER_ADMIN", "ADMIN"] },
  { href: "/admin/complaints", label: "Complaints", icon: AlertTriangle, roles: ["SUPER_ADMIN", "ADMIN", "MODERATOR"] },
  { href: "/admin/users", label: "Users", icon: Users, roles: ["SUPER_ADMIN", "ADMIN"] },
  { href: "/admin/audit-log", label: "Audit log", icon: ClipboardList, roles: ["SUPER_ADMIN", "ADMIN"] },
];

function NavList({ collapsed, role, onNavigate }: { collapsed: boolean; role: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = NAV.filter((item) => !item.roles || item.roles.includes(role as StaffRole));
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4" aria-label="Admin sections">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400" : "border-transparent text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100",
              collapsed && "justify-center px-0",
            )}
          >
            <item.icon className={cn("size-4 shrink-0", active ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300")} />
            <span className={cn(collapsed && "sr-only")}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link href="/admin/dashboard" className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-lg border border-emerald-500/30 bg-emerald-500/20">
        <Shield className="size-4 text-emerald-400" />
      </span>
      <span className={cn(collapsed && "sr-only")}>
        <span className="block text-sm font-bold tracking-tight text-white">CampusOS</span>
        <span className="block text-[10px] font-medium uppercase tracking-widest text-zinc-500">Admin portal</span>
      </span>
    </Link>
  );
}

/** Staff-only console chrome: collapsible role-aware sidebar, topbar, mobile drawer. Redirects non-staff. */
export function AdminShell({ children }: { children: ReactNode }) {
  const { user, status, isStaff, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (status === "guest") router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
    else if (status === "authenticated" && !isStaff) router.replace("/dashboard");
  }, [status, isStaff, pathname, router]);

  const ready = status === "authenticated" && isStaff && user;
  const role = user?.role ?? "";

  const signOut = async () => {
    await toastPromise(logout(), { loading: "Signing out…", success: "Signed out." });
    router.push("/admin/login");
  };

  return (
    <div className="flex min-h-dvh bg-zinc-950 text-zinc-100">
      <aside
        className={cn("sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 transition-[width] duration-200 lg:flex", collapsed ? "w-[4.5rem]" : "w-64")}
        aria-label="Admin"
      >
        <div className={cn("flex h-16 items-center border-b border-zinc-800 px-4", collapsed && "justify-center")}>
          <Brand collapsed={collapsed} />
        </div>
        {ready && <NavList collapsed={collapsed} role={role} />}
        <div className="space-y-1 border-t border-zinc-800 p-3">
          <Link
            href="/"
            target="_blank"
            rel="noopener"
            className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-500 transition hover:bg-zinc-800/70 hover:text-zinc-200", collapsed && "justify-center px-0")}
          >
            <ExternalLink className="size-4" />
            <span className={cn(collapsed && "sr-only")}>View public site</span>
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-pressed={collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-500 transition hover:bg-zinc-800/70 hover:text-zinc-200", collapsed && "justify-center px-0")}
          >
            <ChevronsLeft className={cn("size-4 transition-transform", collapsed && "rotate-180")} />
            <span className={cn(collapsed && "sr-only")}>Collapse</span>
          </button>
        </div>
      </aside>

      <Sheet open={drawer} onClose={() => setDrawer(false)} side="left" title="Admin menu">
        {ready ? <NavList collapsed={false} role={role} onNavigate={() => setDrawer(false)} /> : null}
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950/85 px-4 backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setDrawer(true)} aria-label="Open admin menu" className="grid size-10 place-items-center rounded-lg text-zinc-300 hover:bg-zinc-800 lg:hidden">
              <Menu className="size-5" />
            </button>
            <span className="hidden text-xs text-zinc-500 lg:block">
              CampusOS <span aria-hidden>/</span> <span className="text-zinc-300">Admin</span>
            </span>
          </div>
          {ready && (
            <div className="flex items-center gap-3">
              <span className="hidden max-w-40 truncate text-sm text-zinc-400 sm:block">{user.name}</span>
              <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400">{role.replace("_", " ")}</span>
              <button type="button" onClick={() => void signOut()} aria-label="Sign out" className="grid size-10 place-items-center rounded-lg text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400">
                <LogOut className="size-4" />
              </button>
            </div>
          )}
        </header>
        <main id="main" tabIndex={-1} className="min-w-0 flex-1">
          {ready ? children : <ConsoleSkeleton />}
        </main>
      </div>
    </div>
  );
}

function ConsoleSkeleton() {
  return (
    <div className="space-y-4 p-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-9 w-56 bg-zinc-800" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl bg-zinc-800" />
        ))}
      </div>
    </div>
  );
}
