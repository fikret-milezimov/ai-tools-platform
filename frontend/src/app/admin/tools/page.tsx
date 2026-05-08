"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { getStoredUser, getToken } from "@/lib/auth-storage";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { authJsonHeaders, unwrapApiData } from "@/lib/tools-helpers";
import type { ApprovalStatus, AuditLogRow, Metadata, PaginationMeta, Tool } from "@/lib/tools-types";
import { useToast } from "@/components/ToastProvider";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
    { id: number; name: string; email: string; role: string; created_at?: string | null }[]
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
    users?: { id: number; name: string; email: string; role: string; created_at?: string | null }[];
    pagination?: PaginationMeta;
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

  const isLg = useMediaQuery("(min-width: 1024px)");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersPanelOpen = isLg || filtersOpen;
  const returnTo = pathname;
  const currentUserRole = getStoredUser()?.role ?? null;

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

  const fetchTools = useCallback(async (page = 1) => {
    if (!getToken()) return;
    setListLoading(true);
    setListError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("per_page", "10");
      if (filterStatus) params.set("approval_status", filterStatus);
      if (filterCategoryId) params.set("category_id", filterCategoryId);
      if (filterRoleId) params.set("role_id", filterRoleId);
      const q = filterSearch.trim();
      if (q) params.set("search", q);

      const qs = params.toString();
      const res = await fetch(
        `${API_BASE}/api/admin/tools${qs ? `?${qs}` : ""}`,
        { headers: authJsonHeaders() },
      );
      const raw = (await res.json().catch(() => null)) as ToolsResponse | null;
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
    } catch {
      setListError("Network error.");
      setTools([]);
    } finally {
      setListLoading(false);
    }
  }, [
    filterCategoryId,
    filterRoleId,
    filterSearch,
    filterStatus,
  ]);

  useEffect(() => {
    void loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    void fetchTools();
  }, [fetchTools]);

  const fetchLogs = useCallback(
    async (page = 1) => {
      if (!getToken()) return;
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
        const q = filterLogSearch.trim();
        if (q) params.set("search", q);

        const res = await fetch(
          `${API_BASE}/api/admin/logs?${params.toString()}`,
          { headers: authJsonHeaders() },
        );
        const raw = (await res.json().catch(() => null)) as LogsResponse | null;
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
      } catch {
        setLogsError("Network error while loading admin logs.");
        setLogs([]);
      } finally {
        setLogsLoading(false);
      }
    },
    [
      filterLogAction,
      filterLogFrom,
      filterLogSearch,
      filterLogTo,
      filterLogToolId,
      filterLogUserId,
    ],
  );

  useEffect(() => {
    const u = getStoredUser();
    if (!getToken() || !u) return;
    if (u.role !== "owner" && u.role !== "pm") return;
    void fetchLogs(1);
  }, [fetchLogs]);

  const fetchUsers = useCallback(async (page = 1) => {
    if (currentUserRole !== "owner" || !getToken()) {
      return;
    }
    setUsersLoading(true);
    setUsersError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("per_page", "10");
      const res = await fetch(`${API_BASE}/api/admin/users?${params.toString()}`, {
        headers: authJsonHeaders(),
      });
      const raw = (await res.json().catch(() => null)) as UsersResponse | null;
      if (!res.ok) {
        setUsersError(raw?.message ?? `Failed to load users (${res.status}).`);
        setUsers([]);
        return;
      }
      setUsers(Array.isArray(raw?.users) ? raw.users : []);
      if (raw?.pagination) {
        setUsersPagination(raw.pagination);
      }
    } catch {
      setUsersError("Network error while loading users.");
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [currentUserRole]);

  useEffect(() => {
    if (currentUserRole === "owner") {
      void fetchUsers(1);
    }
  }, [currentUserRole, fetchUsers]);

  async function handleFilters(e: FormEvent) {
    e.preventDefault();
    await fetchTools(1);
  }

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
                        <th className="px-3 py-2">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map((u) => (
                        <tr key={u.id} className="bg-white">
                          <td className="px-3 py-2 text-slate-900">{u.name}</td>
                          <td className="px-3 py-2 text-slate-700">{u.email}</td>
                          <td className="px-3 py-2 capitalize text-slate-700">{u.role}</td>
                          <td className="px-3 py-2 text-slate-600">
                            {u.created_at ? new Date(u.created_at).toLocaleString() : "—"}
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
            </Card>
          </>
        )}
      </div>

      <PageHeader
        title="Admin — tools"
        description="Review submissions and manage approval status. Public catalog only lists approved tools."
        actions={
          <Link
            href="/tools"
            className="text-sm font-medium text-sky-700 hover:text-sky-900"
          >
            ← Public catalog
          </Link>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <details
          className="group"
          open={filtersPanelOpen}
          onToggle={(e) => {
            if (!isLg) setFiltersOpen(e.currentTarget.open);
          }}
        >
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-base font-semibold text-slate-900 lg:hidden [&::-webkit-details-marker]:hidden">
            <span>Filters</span>
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
          <div className="border-t border-slate-100 px-4 pb-6 pt-2 lg:border-0 lg:px-6 lg:pb-6 lg:pt-6">
            <h2 className="mb-4 hidden text-lg font-semibold text-slate-900 lg:block">
              Filters
            </h2>
            <form
              onSubmit={handleFilters}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <SelectField
                label="Status"
                name="approval_status"
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as "" | ApprovalStatus)
                }
                disabled={metadataLoading}
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </SelectField>

              <SelectField
                label="Category"
                name="category_id"
                value={filterCategoryId}
                onChange={(e) => setFilterCategoryId(e.target.value)}
                disabled={metadataLoading}
              >
                <option value="">All categories</option>
                {(metadata?.categories ?? []).map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="Role"
                name="role_id"
                value={filterRoleId}
                onChange={(e) => setFilterRoleId(e.target.value)}
                disabled={metadataLoading}
              >
                <option value="">All roles</option>
                {(metadata?.roles ?? []).map((r) => (
                  <option key={r.id} value={String(r.id)}>
                    {r.name}
                  </option>
                ))}
              </SelectField>

              <Input
                label="Name (search)"
                name="search"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="Search by name"
                autoComplete="off"
              />

              <div className="flex items-end sm:col-span-2 lg:col-span-4">
                <Button type="submit" variant="primary" disabled={listLoading}>
                  {listLoading ? "Loading…" : "Apply filters"}
                </Button>
              </div>
            </form>
          </div>
        </details>
      </div>

      {listError ? (
        <div
          role="alert"
          className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {listError}
        </div>
      ) : null}

      {listLoading && tools.length === 0 ? (
        <p className="text-center text-slate-600">Loading…</p>
      ) : null}

      {!listLoading && tools.length === 0 ? (
        <Card className="text-center text-slate-600">No tools match filters.</Card>
      ) : null}

      {tools.length > 0 ? (
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-slate-900">Tools</h3>
            <p className="text-xs text-slate-500">
              Showing {toolsPagination.from ?? 0}-{toolsPagination.to ?? 0} of {toolsPagination.total}
            </p>
          </div>
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
      ) : null}

      <div className="space-y-6">
        <PageHeader
          title="Admin — logs"
          description="Audit activity by user, tool and action."
        />

        <Card className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void fetchLogs(1);
            }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <SelectField
              label="Action"
              name="action"
              value={filterLogAction}
              onChange={(e) => setFilterLogAction(e.target.value)}
            >
              <option value="">All actions</option>
              {logActions.map((action) => (
                <option key={action} value={action}>
                  {prettyAction(action)}
                </option>
              ))}
            </SelectField>

            <Input
              label="User ID"
              name="user_id"
              value={filterLogUserId}
              onChange={(e) => setFilterLogUserId(e.target.value)}
              placeholder="e.g. 4"
            />

            <Input
              label="Tool ID"
              name="tool_id"
              value={filterLogToolId}
              onChange={(e) => setFilterLogToolId(e.target.value)}
              placeholder="e.g. 12"
            />

            <Input
              label="From"
              name="from"
              type="datetime-local"
              value={filterLogFrom}
              onChange={(e) => setFilterLogFrom(e.target.value)}
            />

            <Input
              label="To"
              name="to"
              type="datetime-local"
              value={filterLogTo}
              onChange={(e) => setFilterLogTo(e.target.value)}
            />

            <Input
              label="Search"
              name="search"
              value={filterLogSearch}
              onChange={(e) => setFilterLogSearch(e.target.value)}
              placeholder="action, user, email, tool..."
            />

            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
              <Button
                type="submit"
                variant="primary"
                disabled={logsLoading}
              >
                {logsLoading ? "Loading…" : "Apply filters"}
              </Button>
            </div>
          </form>

          {logsError ? (
            <p className="text-sm text-red-700">{logsError}</p>
          ) : null}
        </Card>

        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-slate-900">Audit logs</h3>
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
                    <th className="px-3 py-2">Tool</th>
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
                        {row.tool ? `${row.tool.name} (#${row.tool.id})` : "—"}
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
