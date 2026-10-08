"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, Shield, UserX, UserCheck } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  studentId: string | null;
  createdAt: string;
  department: { code: string } | null;
};

const ROLE_COLORS: Record<string, string> = {
  USER: "text-zinc-400 bg-zinc-800 border-zinc-700",
  MODERATOR: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  CLUB_ADMIN: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  ADMIN: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  SUPER_ADMIN: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

const ROLES = ["USER", "MODERATOR", "CLUB_ADMIN", "ADMIN", "SUPER_ADMIN"];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [roleTarget, setRoleTarget] = useState<User | null>(null);
  const [newRole, setNewRole] = useState("");

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.set("q", search);
      if (roleFilter) params.set("role", roleFilter);
      const res = await apiClient.get<User[]>(`/api/admin/users?${params}`, { showToastOnError: false });
      setUsers(res || []);
    } catch { toast.error("Failed to load users"); }
    finally { setIsLoading(false); }
  }, [search, roleFilter]);

  useEffect(() => { const t = setTimeout(fetch, 300); return () => clearTimeout(t); }, [fetch]);

  const toggleActive = async (user: User) => {
    const action = user.isActive ? "deactivate" : "activate";
    await toast.promise(
      apiClient.post(`/api/admin/users/${user.id}/${action}`, {}),
      {
        loading: `${user.isActive ? "Deactivating" : "Activating"} account...`,
        success: `Account ${action}d`,
        error: `Failed to ${action}`,
      }
    );
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
  };

  const changeRole = async () => {
    if (!roleTarget || !newRole) return;
    await toast.promise(
      apiClient.patch(`/api/admin/users/${roleTarget.id}/role`, { role: newRole }),
      {
        loading: "Changing role...",
        success: `Role changed to ${newRole}`,
        error: "Failed to change role",
      }
    );
    setUsers((prev) => prev.map((u) => u.id === roleTarget.id ? { ...u, role: newRole } : u));
    setRoleTarget(null);
  };

  const forceLogout = async (userId: string) => {
    await toast.promise(
      apiClient.post(`/api/admin/users/${userId}/force-logout`, {}),
      {
        loading: "Revoking sessions...",
        success: "All sessions revoked",
        error: "Failed to revoke sessions",
      }
    );
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage accounts, roles, and access control.</p>
        </div>
        <Button variant="ghost" size="sm" className="border border-zinc-800 text-zinc-400 hover:text-white gap-2" onClick={fetch}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input placeholder="Search name or email..." className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-emerald-500"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
        </select>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900">
              <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden md:table-cell">Student ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Joined</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4"><div className="h-4 bg-zinc-800 rounded w-40" /></td>
                    <td className="px-4 py-4 hidden md:table-cell"><div className="h-4 bg-zinc-800 rounded w-24" /></td>
                    <td className="px-4 py-4"><div className="h-5 bg-zinc-800 rounded w-20" /></td>
                    <td className="px-4 py-4 hidden lg:table-cell"><div className="h-4 bg-zinc-800 rounded w-16" /></td>
                    <td className="px-4 py-4 hidden lg:table-cell"><div className="h-4 bg-zinc-800 rounded w-24" /></td>
                    <td className="px-4 py-4"><div className="h-8 bg-zinc-800 rounded w-24 ml-auto" /></td>
                  </tr>
                ))
              : users.length === 0
              ? <tr><td colSpan={6} className="py-12 text-center text-zinc-500 text-sm">No users found.</td></tr>
              : users.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {user.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <div className="font-medium text-zinc-100">{user.name}</div>
                          <div className="text-xs text-zinc-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-zinc-400 text-sm font-mono hidden md:table-cell">
                      {user.studentId || "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${ROLE_COLORS[user.role] || "text-zinc-400"}`}>
                        {user.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <span className={`text-xs font-medium ${user.isActive ? "text-emerald-400" : "text-red-400"}`}>
                        {user.isActive ? "Active" : "Deactivated"}
                      </span>
                      {!user.isEmailVerified && (
                        <span className="ml-2 text-xs text-amber-400">Unverified</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-zinc-500 text-xs hidden lg:table-cell">
                      {format(new Date(user.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost"
                          className={`h-8 w-8 ${user.isActive ? "text-zinc-400 hover:text-red-400" : "text-zinc-400 hover:text-emerald-400"}`}
                          title={user.isActive ? "Deactivate" : "Activate"}
                          onClick={() => toggleActive(user)}>
                          {user.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                        </Button>
                        <Button size="sm" variant="ghost"
                          className="h-8 text-zinc-400 hover:text-white border border-zinc-800 gap-1 text-xs"
                          onClick={() => { setRoleTarget(user); setNewRole(user.role); }}>
                          <Shield className="h-3 w-3" /> Role
                        </Button>
                        <Button size="sm" variant="ghost"
                          className="h-8 text-zinc-400 hover:text-amber-400 text-xs"
                          title="Force logout all devices"
                          onClick={() => forceLogout(user.id)}>
                          Logout All
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Role Change Modal */}
      {roleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Change Role</h3>
            <p className="text-zinc-400 text-sm mb-5">{roleTarget.name} ({roleTarget.email})</p>
            <select value={newRole} onChange={(e) => setNewRole(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-md bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-5">
              {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
            </select>
            {(newRole === "ADMIN" || newRole === "SUPER_ADMIN") && (
              <p className="text-amber-400 text-xs mb-4 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                ⚠ Granting elevated roles gives full admin access. Proceed only for verified staff.
              </p>
            )}
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                onClick={() => setRoleTarget(null)}>Cancel</Button>
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-0" onClick={changeRole}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
