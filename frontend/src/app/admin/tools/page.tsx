"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { getStoredUser, getToken } from "@/lib/auth-storage";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { authJsonHeaders, unwrapApiData } from "@/lib/tools-helpers";
import type { ApprovalStatus, Metadata, Tool } from "@/lib/tools-types";
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

export default function AdminToolsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [tools, setTools] = useState<Tool[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);

  const [filterStatus, setFilterStatus] = useState<"" | ApprovalStatus>("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterRoleId, setFilterRoleId] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const isLg = useMediaQuery("(min-width: 1024px)");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersPanelOpen = isLg || filtersOpen;

  useEffect(() => {
    const u = getStoredUser();
    if (!getToken() || !u) {
      router.replace("/login");
      return;
    }
    if (u.role !== "owner") {
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

  const fetchTools = useCallback(async () => {
    if (!getToken()) return;
    setListLoading(true);
    setListError(null);
    try {
      const params = new URLSearchParams();
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
      const raw = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          (raw as { message?: string })?.message ??
          `Failed to load (${res.status})`;
        setListError(typeof msg === "string" ? msg : "Failed to load tools.");
        setTools([]);
        return;
      }
      const unwrapped = unwrapApiData<Tool[]>(raw);
      setTools(Array.isArray(unwrapped) ? unwrapped : []);
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

  async function handleFilters(e: FormEvent) {
    e.preventDefault();
    await fetchTools();
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
      await fetchTools();
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
      await fetchTools();
    } catch {
      showToast("Network error.", "error");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-8">
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
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
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
                        href={`/tools/${t.id}/edit`}
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
      ) : null}
    </div>
  );
}
