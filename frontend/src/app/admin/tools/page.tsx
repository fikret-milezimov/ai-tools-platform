"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { getStoredUser, getToken } from "@/lib/auth-storage";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { authJsonHeaders, unwrapApiData } from "@/lib/tools-helpers";
import type { ApprovalStatus, AuditLogRow, Metadata, PaginationMeta, Tool } from "@/lib/tools-types";
import { useToast } from "@/components/ToastProvider";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { SelectField } from "@/components/ui/SelectField";

function statusBadge(status: ApprovalStatus | undefined) {
  const s = status ?? "approved";
  const styles: Record<ApprovalStatus, string> = {
    pending: "bg-amber-100 text-amber-900 ring-amber-200",
    approved: "bg-emerald-100 text-emerald-900 ring-emerald-200",
    rejected: "bg-red-100 text-red-900 ring-red-200",
  };
  const labels: Record<ApprovalStatus, string> = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles[s]}`}
    >
      {labels[s]}
    </span>
  );
}

function formatWhen(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function prettyAction(action: string): string {
  return action.replaceAll(".", " ");
}

function formatLogTarget(row: AuditLogRow): string {
  if (row.tool) {
    return `${row.tool.name} (#${row.tool.id})`;
  }

  const meta = row.meta ?? {};
  const toolName = typeof meta.tool_name === "string" ? meta.tool_name : null;
  const targetEmail = typeof meta.target_user_email === "string" ? meta.target_user_email : null;
  const createdEmail = typeof meta.created_user_email === "string" ? meta.created_user_email : null;
  const targetUserId =
    typeof meta.target_user_id === "number"
      ? meta.target_user_id
      : typeof meta.target_user_id === "string" && meta.target_user_id.trim() !== ""
        ? Number(meta.target_user_id)
        : null;
  const createdUserId =
    typeof meta.created_user_id === "number"
      ? meta.created_user_id
      : typeof meta.created_user_id === "string" && meta.created_user_id.trim() !== ""
        ? Number(meta.created_user_id)
        : null;

  if (targetEmail && targetUserId && Number.isFinite(targetUserId)) {
    return `${targetEmail} (#${targetUserId})`;
  }
  if (targetEmail) {
    return targetEmail;
  }
  if (targetUserId && Number.isFinite(targetUserId)) {
    return `User #${targetUserId}`;
  }
  if (createdEmail && createdUserId && Number.isFinite(createdUserId)) {
    return `${createdEmail} (#${createdUserId})`;
  }
  if (createdEmail) {
    return createdEmail;
  }
  if (createdUserId && Number.isFinite(createdUserId)) {
    return `User #${createdUserId}`;
  }
  if (toolName) {
    return toolName;
  }

  return "—";
}

export default function AdminToolsPage() {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [tools, setTools] = useState<Tool[]>([]);
  const [toolsPagination, setToolsPagination] = useState<PaginationMeta>({
    current_page: 1,
    per_page: 10,
    total: 0,
    last_page: 1,
    from: null,
    to: null,
  });
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [users, setUsers] = useState<
    { id: number; name: string; email: string; role: string; is_active: boolean; created_at?: string | null }[]
  >([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [usersPagination, setUsersPagination] = useState<PaginationMeta>({
    current_page: 1,
    per_page: 10,
    total: 0,
    last_page: 1,
    from: null,
    to: null,
  });
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("backend");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserSubmitting, setNewUserSubmitting] = useState(false);
  const [filterUserRole, setFilterUserRole] = useState("");
  const [filterUserSearch, setFilterUserSearch] = useState("");
  const [rowActionId, setRowActionId] = useState<number | null>(null);
  const [userDeleteTarget, setUserDeleteTarget] = useState<{
    id: number;
    name: string;
    email: string;
  } | null>(null);
  const [roleDraftByUserId, setRoleDraftByUserId] = useState<Record<number, string>>({});

  type ToolsResponse = {
    tools?: Tool[];
    pagination?: PaginationMeta;
    data?: Tool[];
  };

  type LogsResponse = {
    logs?: AuditLogRow[];
    pagination?: PaginationMeta;
    filters?: { actions?: string[] };
  };
  type UsersResponse = {
    users?: { id: number; name: string; email: string; role: string; is_active: boolean; created_at?: string | null }[];
    pagination?: PaginationMeta;
    user?: { id: number; role?: string; is_active?: boolean };
    message?: string;
    errors?: Record<string, string[]>;
  };

  const [filterStatus, setFilterStatus] = useState<"" | ApprovalStatus>("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterRoleId, setFilterRoleId] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [logsPagination, setLogsPagination] = useState<PaginationMeta>({
    current_page: 1,
    per_page: 10,
    total: 0,
    last_page: 1,
    from: null,
    to: null,
  });
  const [logActions, setLogActions] = useState<string[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  const [filterLogAction, setFilterLogAction] = useState("");
  const [filterLogUserId, setFilterLogUserId] = useState("");
  const [filterLogToolId, setFilterLogToolId] = useState("");
  const [filterLogFrom, setFilterLogFrom] = useState("");
  const [filterLogTo, setFilterLogTo] = useState("");
  const [filterLogSearch, setFilterLogSearch] = useState("");

  const debouncedFilterSearch = useDebouncedValue(filterSearch, 350);
  const debouncedFilterLogSearch = useDebouncedValue(filterLogSearch, 350);
  const debouncedFilterUserSearch = useDebouncedValue(filterUserSearch, 350);

  const toolsFetchGen = useRef(0);
  const logsFetchGen = useRef(0);
  const usersFetchGen = useRef(0);

  const isLg = useMediaQuery("(min-width: 1024px)");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersPanelOpen = isLg || filtersOpen;
  const returnTo = pathname;
  const currentUser = getStoredUser();
  const currentUserRole = currentUser?.role ?? null;
  const currentUserId = currentUser?.id ?? null;

  useEffect(() => {
    const u = getStoredUser();
    if (!getToken() || !u) {
      router.replace("/login");
      return;
    }
    if (u.role !== "owner" && u.role !== "pm") {
      router.replace("/dashboard");
    }
  }, [router]);

  const loadMetadata = useCallback(async () => {
    setMetadataLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/tool-metadata`, {
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        setMetadata(data as Metadata);
      }
    } catch {
      /* ignore */
    } finally {
      setMetadataLoading(false);
    }
  }, []);

  const fetchTools = useCallback(
    async (page = 1, signal?: AbortSignal) => {
      if (!getToken()) return;
      const gen = ++toolsFetchGen.current;
      setListLoading(true);
      setListError(null);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("per_page", "10");
        if (filterStatus) params.set("approval_status", filterStatus);
        if (filterCategoryId) params.set("category_id", filterCategoryId);
        if (filterRoleId) params.set("role_id", filterRoleId);
        const q = debouncedFilterSearch.trim();
        if (q) params.set("search", q);

        const qs = params.toString();
        const res = await fetch(`${API_BASE}/api/admin/tools${qs ? `?${qs}` : ""}`, {
          headers: authJsonHeaders(),
          signal,
        });
        const raw = (await res.json().catch(() => null)) as ToolsResponse | null;
        if (gen !== toolsFetchGen.current) return;
        if (!res.ok) {
          const msg =
            (raw as { message?: string } | null)?.message ??
            `Failed to load (${res.status})`;
          setListError(typeof msg === "string" ? msg : "Failed to load tools.");
          setTools([]);
          return;
        }
        const list =
          Array.isArray(raw?.tools) ? raw.tools : Array.isArray(raw?.data) ? raw.data : [];
        const unwrapped = unwrapApiData<Tool[]>(list);
        setTools(Array.isArray(unwrapped) ? unwrapped : []);
        if (raw?.pagination) {
          setToolsPagination(raw.pagination);
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (gen !== toolsFetchGen.current) return;
        setListError("Network error.");
        setTools([]);
      } finally {
        if (gen === toolsFetchGen.current) {
          setListLoading(false);
        }
      }
    },
    [debouncedFilterSearch, filterCategoryId, filterRoleId, filterStatus],
  );

  useEffect(() => {
    void loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    const ac = new AbortController();
    void fetchTools(1, ac.signal);
    return () => ac.abort();
  }, [fetchTools]);

  const fetchLogs = useCallback(
    async (page = 1, signal?: AbortSignal) => {
      if (!getToken()) return;
      const gen = ++logsFetchGen.current;
      setLogsLoading(true);
      setLogsError(null);

      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("per_page", "10");
        if (filterLogAction) params.set("action", filterLogAction);
        if (filterLogUserId) params.set("user_id", filterLogUserId);
        if (filterLogToolId) params.set("tool_id", filterLogToolId);
        if (filterLogFrom) params.set("from", filterLogFrom);
        if (filterLogTo) params.set("to", filterLogTo);
        const q = debouncedFilterLogSearch.trim();
        if (q) params.set("search", q);

        const res = await fetch(`${API_BASE}/api/admin/logs?${params.toString()}`, {
          headers: authJsonHeaders(),
          signal,
        });
        const raw = (await res.json().catch(() => null)) as LogsResponse | null;
        if (gen !== logsFetchGen.current) return;
        if (!res.ok || !raw) {
          const message =
            (raw as { message?: string } | null)?.message ??
            `Failed to load logs (${res.status}).`;
          setLogsError(message);
          setLogs([]);
          return;
        }

        setLogs(Array.isArray(raw.logs) ? raw.logs : []);
        setLogActions(
          Array.isArray(raw.filters?.actions)
            ? raw.filters.actions.filter((a): a is string => typeof a === "string")
            : [],
        );
        if (raw.pagination) {
          setLogsPagination(raw.pagination);
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (gen !== logsFetchGen.current) return;
        setLogsError("Network error while loading admin logs.");
        setLogs([]);
      } finally {
        if (gen === logsFetchGen.current) {
          setLogsLoading(false);
        }
      }
    },
    [
      debouncedFilterLogSearch,
      filterLogAction,
      filterLogFrom,
      filterLogTo,
      filterLogToolId,
      filterLogUserId,
    ],
  );

  useEffect(() => {
    const u = getStoredUser();
    if (!getToken() || !u) return;
    if (u.role !== "owner" && u.role !== "pm") return;
    const ac = new AbortController();
    void fetchLogs(1, ac.signal);
    return () => ac.abort();
  }, [fetchLogs]);

  const fetchUsers = useCallback(
    async (page = 1, signal?: AbortSignal) => {
      if (currentUserRole !== "owner" || !getToken()) {
        return;
      }
      const gen = ++usersFetchGen.current;
      setUsersLoading(true);
      setUsersError(null);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("per_page", "10");
        if (filterUserRole) params.set("role", filterUserRole);
        const userQuery = debouncedFilterUserSearch.trim();
        if (userQuery) params.set("search", userQuery);
        const res = await fetch(`${API_BASE}/api/admin/users?${params.toString()}`, {
          headers: authJsonHeaders(),
          signal,
        });
        const raw = (await res.json().catch(() => null)) as UsersResponse | null;
        if (gen !== usersFetchGen.current) return;
        if (!res.ok) {
          setUsersError(raw?.message ?? `Failed to load users (${res.status}).`);
          setUsers([]);
          return;
        }
        setUsers(Array.isArray(raw?.users) ? raw.users : []);
        const drafts: Record<number, string> = {};
        for (const user of Array.isArray(raw?.users) ? raw.users : []) {
          drafts[user.id] = user.role;
        }
        setRoleDraftByUserId(drafts);
        if (raw?.pagination) {
          setUsersPagination(raw.pagination);
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (gen !== usersFetchGen.current) return;
        setUsersError("Network error while loading users.");
        setUsers([]);
      } finally {
        if (gen === usersFetchGen.current) {
          setUsersLoading(false);
        }
      }
    },
    [currentUserRole, debouncedFilterUserSearch, filterUserRole],
  );

  useEffect(() => {
    if (currentUserRole !== "owner") return;
    const ac = new AbortController();
    void fetchUsers(1, ac.signal);
    return () => ac.abort();
  }, [currentUserRole, fetchUsers]);

  async function submitUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (currentUserRole !== "owner") {
      return;
    }
    if (!getToken()) {
      router.push("/login");
      return;
    }

    setNewUserSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        method: "POST",
        headers: authJsonHeaders(),
        body: JSON.stringify({
          name: newUserName.trim(),
          email: newUserEmail.trim(),
          role: newUserRole,
          password: newUserPassword,
        }),
      });
      const raw = (await res.json().catch(() => null)) as UsersResponse | null;
      if (!res.ok) {
        const fieldErrors = raw?.errors
          ? Object.entries(raw.errors)
              .map(([k, v]) => `${k}: ${v.join(", ")}`)
              .join("; ")
          : "";
        showToast(fieldErrors || raw?.message || `Could not add user (${res.status}).`, "error");
        return;
      }
      showToast("User added successfully.", "success");
      setNewUserName("");
      setNewUserEmail("");
      setNewUserRole("backend");
      setNewUserPassword("");
      await fetchUsers(1);
    } catch {
      showToast("Network error while adding user.", "error");
    } finally {
      setNewUserSubmitting(false);
    }
  }

  async function saveUserRole(userId: number) {
    const draftRole = roleDraftByUserId[userId];
    const current = users.find((u) => u.id === userId);
    if (!current || !draftRole || draftRole === current.role) {
      return;
    }
    setRowActionId(userId);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: authJsonHeaders(),
        body: JSON.stringify({ role: draftRole }),
      });
      const raw = (await res.json().catch(() => null)) as UsersResponse | null;
      if (!res.ok) {
        showToast(raw?.message || `Could not update role (${res.status}).`, "error");
        return;
      }
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: draftRole } : u)));
      showToast("User role updated.", "success");
    } catch {
      showToast("Network error while updating role.", "error");
    } finally {
      setRowActionId(null);
    }
  }

  async function toggleUserStatus(userId: number, nextStatus: boolean) {
    setRowActionId(userId);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/status`, {
        method: "PUT",
        headers: authJsonHeaders(),
        body: JSON.stringify({ is_active: nextStatus }),
      });
      const raw = (await res.json().catch(() => null)) as UsersResponse | null;
      if (!res.ok) {
        showToast(raw?.message || `Could not update status (${res.status}).`, "error");
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: nextStatus } : u)),
      );
      showToast(nextStatus ? "User reactivated." : "User deactivated.", "success");
    } catch {
      showToast("Network error while updating status.", "error");
    } finally {
      setRowActionId(null);
    }
  }

  async function confirmDeleteUser() {
    if (!userDeleteTarget) {
      return;
    }
    const { id: deleteId } = userDeleteTarget;
    setRowActionId(deleteId);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${deleteId}`, {
        method: "DELETE",
        headers: authJsonHeaders(),
      });
      const raw = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) {
        showToast(
          typeof raw?.message === "string" ? raw.message : `Could not delete user (${res.status}).`,
          "error",
        );
        return;
      }
      showToast(typeof raw?.message === "string" ? raw.message : "User deleted.", "success");
      setUserDeleteTarget(null);
      setRoleDraftByUserId((prev) => {
        const next = { ...prev };
        delete next[deleteId];
        return next;
      });
      await fetchUsers(usersPagination.current_page);
    } catch {
      showToast("Network error while deleting user.", "error");
    } finally {
      setRowActionId(null);
    }
  }

  async function approveTool(id: number) {
    setActionId(id);
    try {
      const res = await fetch(`${API_BASE}/api/admin/tools/${id}/approve`, {
        method: "POST",
        headers: authJsonHeaders(),
        body: "{}",
      });
      if (!res.ok) {
        let msg = `Error (${res.status})`;
        try {
          const j = (await res.json()) as { message?: string };
          if (typeof j.message === "string") msg = j.message;
        } catch {
          /* ignore */
        }
        showToast(msg, "error");
        return;
      }
      showToast("Tool approved.", "success");
      await fetchTools(toolsPagination.current_page);
      window.dispatchEvent(new CustomEvent("admin-pending-tools-changed"));
    } catch {
      showToast("Network error.", "error");
    } finally {
      setActionId(null);
    }
  }

  async function rejectTool(id: number) {
    setActionId(id);
    try {
      const res = await fetch(`${API_BASE}/api/admin/tools/${id}/reject`, {
        method: "POST",
        headers: authJsonHeaders(),
        body: "{}",
      });
      if (!res.ok) {
        let msg = `Error (${res.status})`;
        try {
          const j = (await res.json()) as { message?: string };
          if (typeof j.message === "string") msg = j.message;
        } catch {
          /* ignore */
        }
        showToast(msg, "error");
        return;
      }
      showToast("Tool rejected.", "success");
      await fetchTools(toolsPagination.current_page);
      window.dispatchEvent(new CustomEvent("admin-pending-tools-changed"));
    } catch {
      showToast("Network error.", "error");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <PageHeader
          title="Admin — users"
          description="Create and review user accounts."
        />
        {currentUserRole !== "owner" ? (
          <Card className="text-sm text-slate-600">
            Owner access only.
          </Card>
        ) : (
          <>
            <Card className="space-y-4">
              <h3 className="text-base font-semibold text-slate-900">Add user</h3>
              <form onSubmit={submitUser} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Name"
                  name="name"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  required
                  disabled={newUserSubmitting}
                />
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  required
                  disabled={newUserSubmitting}
                />
                <SelectField
                  label="Role"
                  name="role"
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  disabled={newUserSubmitting}
                >
                  <option value="backend">backend</option>
                  <option value="frontend">frontend</option>
                  <option value="designer">designer</option>
                  <option value="qa">qa</option>
                  <option value="pm">pm</option>
                  <option value="owner">owner</option>
                </SelectField>
                <Input
                  label="Password"
                  name="password"
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  required
                  disabled={newUserSubmitting}
                />
                <div className="md:col-span-2">
                  <Button type="submit" variant="primary" disabled={newUserSubmitting}>
                    {newUserSubmitting ? "Adding…" : "Add user"}
                  </Button>
                </div>
              </form>
            </Card>

            <Card className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-slate-900">Users</h3>
                <p className="text-xs text-slate-500">
                  Showing {usersPagination.from ?? 0}-{usersPagination.to ?? 0} of {usersPagination.total}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SelectField
                  label="Role"
                  name="user_role"
                  value={filterUserRole}
                  onChange={(e) => setFilterUserRole(e.target.value)}
                  disabled={usersLoading}
                >
                  <option value="">All roles</option>
                  <option value="owner">owner</option>
                  <option value="backend">backend</option>
                  <option value="frontend">frontend</option>
                  <option value="designer">designer</option>
                  <option value="qa">qa</option>
                  <option value="pm">pm</option>
                </SelectField>

                <Input
                  label="Name / Email"
                  name="user_search"
                  value={filterUserSearch}
                  onChange={(e) => setFilterUserSearch(e.target.value)}
                  placeholder="Search users"
                  autoComplete="off"
                  disabled={usersLoading}
                />

              </div>

              {usersError ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{usersError}</p>
              ) : null}

              {usersLoading && users.length === 0 ? (
                <p className="text-sm text-slate-600">Loading users…</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Role</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Created</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map((u) => (
                        <tr key={u.id} className="bg-white">
                          <td className="px-3 py-2 text-slate-900">{u.name}</td>
                          <td className="px-3 py-2 text-slate-700">{u.email}</td>
                          <td className="px-3 py-2">
                            <select
                              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800"
                              value={roleDraftByUserId[u.id] ?? u.role}
                              onChange={(e) =>
                                setRoleDraftByUserId((prev) => ({
                                  ...prev,
                                  [u.id]: e.target.value,
                                }))
                              }
                              disabled={rowActionId === u.id || u.id === currentUserId}
                            >
                              <option value="owner">owner</option>
                              <option value="backend">backend</option>
                              <option value="frontend">frontend</option>
                              <option value="designer">designer</option>
                              <option value="qa">qa</option>
                              <option value="pm">pm</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                u.is_active
                                  ? "bg-emerald-100 text-emerald-900"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {u.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {u.created_at ? new Date(u.created_at).toLocaleString() : "—"}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                className="!px-2.5 !py-1.5 !text-xs"
                                disabled={
                                  rowActionId === u.id ||
                                  u.id === currentUserId ||
                                  (roleDraftByUserId[u.id] ?? u.role) === u.role
                                }
                                onClick={() => void saveUserRole(u.id)}
                              >
                                Save role
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                className={`!px-2.5 !py-1.5 !text-xs ${
                                  u.is_active
                                    ? "!border-red-200 !text-red-800"
                                    : "!border-emerald-200 !text-emerald-800"
                                }`}
                                disabled={rowActionId === u.id || u.id === currentUserId}
                                onClick={() => void toggleUserStatus(u.id, !u.is_active)}
                              >
                                {u.is_active ? "Deactivate" : "Reactivate"}
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                className="!border-red-200 !px-2.5 !py-1.5 !text-xs !text-red-800"
                                disabled={rowActionId === u.id || u.id === currentUserId}
                                onClick={() =>
                                  setUserDeleteTarget({
                                    id: u.id,
                                    name: u.name,
                                    email: u.email,
                                  })
                                }
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={usersLoading || usersPagination.current_page <= 1}
                  onClick={() => void fetchUsers(usersPagination.current_page - 1)}
                >
                  Prev
                </Button>
                <span className="text-sm text-slate-600">
                  Page {usersPagination.current_page} / {usersPagination.last_page}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={usersLoading || usersPagination.current_page >= usersPagination.last_page}
                  onClick={() => void fetchUsers(usersPagination.current_page + 1)}
                >
                  Next
                </Button>
              </div>

              <ConfirmDialog
                open={userDeleteTarget !== null}
                title="Delete user?"
                description={
                  userDeleteTarget
                    ? `Permanently remove ${userDeleteTarget.email}? Tools they created remain in the catalog; ownership is reassigned. Their ratings and comments are removed. This cannot be undone.`
                    : undefined
                }
                confirmLabel="Delete user"
                loading={
                  userDeleteTarget !== null && rowActionId !== null && rowActionId === userDeleteTarget.id
                }
                onClose={() => {
                  if (rowActionId !== null) {
                    return;
                  }
                  setUserDeleteTarget(null);
                }}
                onConfirm={() => void confirmDeleteUser()}
              />
            </Card>
          </>
        )}
      </div>

      <PageHeader
        title="Admin — tools"
        description="Review submissions and manage approval status. Public catalog only lists approved tools."
      />

      <Card className="space-y-4">
        <details
          className="group"
          open={filtersPanelOpen}
          onToggle={(e) => {
            if (!isLg) setFiltersOpen(e.currentTarget.open);
          }}
        >
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 py-1 text-base font-semibold text-slate-900 lg:hidden [&::-webkit-details-marker]:hidden">
            <span>Tools</span>
            <svg
              className="h-5 w-5 text-slate-500 group-open:rotate-180"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0L5.25 8.27a.75.75 0 0 1 .02-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </summary>
          <div className="pt-2 lg:pt-0">
            <h2 className="mb-4 hidden text-lg font-semibold text-slate-900 lg:block">
              Tools
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SelectField label="Status" name="approval_status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as "" | ApprovalStatus)} disabled={metadataLoading}>
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </SelectField>
              <SelectField label="Category" name="category_id" value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)} disabled={metadataLoading}>
                <option value="">All categories</option>
                {(metadata?.categories ?? []).map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Role" name="role_id" value={filterRoleId} onChange={(e) => setFilterRoleId(e.target.value)} disabled={metadataLoading}>
                <option value="">All roles</option>
                {(metadata?.roles ?? []).map((r) => (
                  <option key={r.id} value={String(r.id)}>
                    {r.name}
                  </option>
                ))}
              </SelectField>
              <Input label="Name (search)" name="search" value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} placeholder="Search by name" autoComplete="off" />
            </div>
          </div>
        </details>

        {listError ? (
          <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
            {listError}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <p className="text-xs text-slate-500">
            Showing {toolsPagination.from ?? 0}-{toolsPagination.to ?? 0} of {toolsPagination.total}
          </p>
        </div>

        {listLoading && tools.length === 0 ? (
          <p className="text-center text-slate-600">Loading…</p>
        ) : !listLoading && tools.length === 0 ? (
          <p className="text-center text-slate-600">No tools match filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Tool</th>
                  <th className="hidden px-4 py-3 sm:table-cell">Status</th>
                  <th className="hidden px-4 py-3 md:table-cell">Categories</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Roles</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tools.map((t) => (
                  <tr key={t.id} className="bg-white hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{t.name}</div>
                      <div className="mt-1 sm:hidden">
                        {statusBadge(t.approval_status)}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      {statusBadge(t.approval_status)}
                    </td>
                    <td className="hidden max-w-[12rem] px-4 py-3 text-slate-600 md:table-cell">
                      {t.categories?.map((c) => c.name).join(", ") || "—"}
                    </td>
                    <td className="hidden max-w-[12rem] px-4 py-3 text-slate-600 lg:table-cell">
                      {t.roles?.map((r) => r.name).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {t.approval_status === "pending" ||
                        t.approval_status === "rejected" ? (
                          <Button
                            type="button"
                            variant="primary"
                            className="!py-1.5 !text-xs"
                            disabled={actionId === t.id}
                            onClick={() => void approveTool(t.id)}
                          >
                            {actionId === t.id ? "…" : "Approve"}
                          </Button>
                        ) : null}
                        {t.approval_status === "pending" ||
                        t.approval_status === "approved" ? (
                          <Button
                            type="button"
                            variant="secondary"
                            className="!border-red-200 !py-1.5 !text-xs !text-red-800"
                            disabled={actionId === t.id}
                            onClick={() => void rejectTool(t.id)}
                          >
                            Reject
                          </Button>
                        ) : null}
                        <Link
                          href={`/tools/${t.id}/edit?returnTo=${encodeURIComponent(returnTo)}`}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            disabled={listLoading || toolsPagination.current_page <= 1}
            onClick={() => void fetchTools(toolsPagination.current_page - 1)}
          >
            Prev
          </Button>
          <span className="text-sm text-slate-600">
            Page {toolsPagination.current_page} / {toolsPagination.last_page}
          </span>
          <Button
            type="button"
            variant="secondary"
            disabled={listLoading || toolsPagination.current_page >= toolsPagination.last_page}
            onClick={() => void fetchTools(toolsPagination.current_page + 1)}
          >
            Next
          </Button>
        </div>
      </Card>

      <div className="space-y-6">
        <PageHeader
          title="Admin — logs"
          description="Audit activity by user, tool and action."
        />

        <Card className="space-y-4">
          <h3 className="text-base font-semibold text-slate-900">Audit logs</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField label="Action" name="action" value={filterLogAction} onChange={(e) => setFilterLogAction(e.target.value)}>
              <option value="">All actions</option>
              {logActions.map((action) => (
                <option key={action} value={action}>
                  {prettyAction(action)}
                </option>
              ))}
            </SelectField>
            <Input label="User ID" name="user_id" value={filterLogUserId} onChange={(e) => setFilterLogUserId(e.target.value)} placeholder="e.g. 4" />
            <Input label="Tool ID" name="tool_id" value={filterLogToolId} onChange={(e) => setFilterLogToolId(e.target.value)} placeholder="e.g. 12" />
            <Input label="From" name="from" type="datetime-local" value={filterLogFrom} onChange={(e) => setFilterLogFrom(e.target.value)} />
            <Input label="To" name="to" type="datetime-local" value={filterLogTo} onChange={(e) => setFilterLogTo(e.target.value)} />
            <Input label="Search" name="search" value={filterLogSearch} onChange={(e) => setFilterLogSearch(e.target.value)} placeholder="action, user, email, tool..." />
          </div>

          {logsError ? (
            <p className="text-sm text-red-700">{logsError}</p>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <p className="text-xs text-slate-500">
              Showing {logsPagination.from ?? 0}-{logsPagination.to ?? 0} of {logsPagination.total}
            </p>
          </div>

          {logs.length === 0 ? (
            <p className="text-sm text-slate-600">No logs match the filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-3 py-2">When</th>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">Tool/User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((row) => (
                    <tr key={row.id} className="bg-white">
                      <td className="px-3 py-2 text-slate-600">
                        {formatWhen(row.created_at)}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {prettyAction(row.action)}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {row.user ? `${row.user.name} (${row.user.role})` : "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {formatLogTarget(row)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              disabled={logsLoading || logsPagination.current_page <= 1}
              onClick={() => void fetchLogs(logsPagination.current_page - 1)}
            >
              Prev
            </Button>
            <span className="text-sm text-slate-600">
              Page {logsPagination.current_page} / {logsPagination.last_page}
            </span>
            <Button
              type="button"
              variant="secondary"
              disabled={logsLoading || logsPagination.current_page >= logsPagination.last_page}
              onClick={() => void fetchLogs(logsPagination.current_page + 1)}
            >
              Next
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
