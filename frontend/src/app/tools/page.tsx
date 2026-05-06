"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { API_BASE } from "@/lib/api";
import { getToken, getStoredUser } from "@/lib/auth-storage";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { canAccessAddToolNav } from "@/lib/nav-config";
import { authJsonHeaders } from "@/lib/tools-helpers";
import type { Metadata, Tool } from "@/lib/tools-types";
import {
  consumeStoredToast,
  useToast,
} from "@/components/ToastProvider";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { SelectField } from "@/components/ui/SelectField";

function Badge({
  children,
  tone = "blue",
}: {
  children: ReactNode;
  tone?: "blue" | "gray" | "emerald";
}) {
  const tones = {
    blue: "bg-sky-100 text-sky-900",
    gray: "bg-slate-100 text-slate-800",
    emerald: "bg-emerald-100 text-emerald-900",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function shortDescription(text: string, max = 120) {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

export default function ToolsPage() {
  const { showToast } = useToast();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  const [tools, setTools] = useState<Tool[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);

  const [filterRoleId, setFilterRoleId] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterTagId, setFilterTagId] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const isLg = useMediaQuery("(min-width: 1024px)");
  const filtersPanelOpen = isLg || mobileFiltersOpen;

  useEffect(() => {
    const u = getStoredUser();
    setUserRole(u?.role ?? null);
  }, []);

  useEffect(() => {
    consumeStoredToast(showToast);
  }, [showToast]);

  const loadMetadata = useCallback(async () => {
    setMetadataLoading(true);
    setMetadataError(null);
    try {
      const res = await fetch(`${API_BASE}/api/tool-metadata`, {
        headers: { Accept: "application/json" },
      });
      let data: unknown;
      try {
        data = await res.json();
      } catch {
        setMetadataError("Invalid response from server (metadata).");
        setMetadata(null);
        return;
      }
      if (!res.ok) {
        const body = data as { message?: string };
        setMetadataError(
          typeof body.message === "string"
            ? body.message
            : `Could not load metadata (${res.status}).`,
        );
        setMetadata(null);
        return;
      }
      setMetadata(data as Metadata);
    } catch {
      setMetadataError("Network error while loading metadata.");
      setMetadata(null);
    } finally {
      setMetadataLoading(false);
    }
  }, []);

  async function fetchToolsList() {
    setListLoading(true);
    setListError(null);
    try {
      const params = new URLSearchParams();
      if (filterRoleId) params.set("role_id", filterRoleId);
      if (filterCategoryId) params.set("category_id", filterCategoryId);
      if (filterTagId) params.set("tag_id", filterTagId);
      const q = filterSearch.trim();
      if (q) params.set("search", q);

      const qs = params.toString();
      const url = `${API_BASE}/api/tools${qs ? `?${qs}` : ""}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      let data: unknown;
      try {
        data = await res.json();
      } catch {
        setListError("Invalid JSON from server.");
        setTools([]);
        return;
      }
      if (!res.ok) {
        const body = data as { message?: string };
        setListError(
          typeof body.message === "string"
            ? body.message
            : `Failed to load tools (${res.status}).`,
        );
        setTools([]);
        return;
      }
      const body = data as { data?: Tool[] };
      setTools(Array.isArray(body.data) ? body.data : []);
    } catch {
      setListError("Network error while loading tools.");
      setTools([]);
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    void loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    void fetchToolsList();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleApplyFilters(e: FormEvent) {
    e.preventDefault();
    await fetchToolsList();
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { id, name } = pendingDelete;
    if (!getToken()) {
      showToast("Sign in to delete tools.", "error");
      setPendingDelete(null);
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/tools/${id}`, {
        method: "DELETE",
        headers: authJsonHeaders(),
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
      showToast(`Deleted “${name}”.`, "success");
      await fetchToolsList();
    } catch {
      showToast("Network error while deleting.", "error");
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  }

  const filtersDisabled = metadataLoading;
  const showAddLink =
    userRole !== null && canAccessAddToolNav(userRole);

  return (
    <div className="space-y-8 md:space-y-10">
      <PageHeader
        title="Tools catalog"
        description="Browse and filter AI tools shared by your team. Use filters to narrow by role, category, tags, or name."
        actions={
          showAddLink ? (
            <Link
              href="/tools/new"
              className="inline-flex w-full min-h-[44px] items-center justify-center rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 sm:w-auto"
            >
              Add tool
            </Link>
          ) : null
        }
      />

      {metadataLoading ? (
        <p className="text-sm text-slate-500">Loading filters…</p>
      ) : null}
      {metadataError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {metadataError}
          <Button
            variant="secondary"
            className="!py-1.5 !text-xs"
            onClick={() => void loadMetadata()}
          >
            Retry
          </Button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <details
          className="group"
          open={filtersPanelOpen}
          onToggle={(e) => {
            const el = e.currentTarget;
            if (!isLg) setMobileFiltersOpen(el.open);
          }}
        >
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-base font-semibold text-slate-900 lg:hidden [&::-webkit-details-marker]:hidden">
            <span>Filters</span>
            <svg
              className="h-5 w-5 shrink-0 text-slate-500 transition group-open:rotate-180"
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
              onSubmit={handleApplyFilters}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <SelectField
                label="Role"
                name="filter_role"
                value={filterRoleId}
                onChange={(e) => setFilterRoleId(e.target.value)}
                disabled={filtersDisabled}
              >
                <option value="">All roles</option>
                {(metadata?.roles ?? []).map((r) => (
                  <option key={r.id} value={String(r.id)}>
                    {r.name} ({r.slug})
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="Category"
                name="filter_category"
                value={filterCategoryId}
                onChange={(e) => setFilterCategoryId(e.target.value)}
                disabled={filtersDisabled}
              >
                <option value="">All categories</option>
                {(metadata?.categories ?? []).map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="Tag"
                name="filter_tag"
                value={filterTagId}
                onChange={(e) => setFilterTagId(e.target.value)}
                disabled={filtersDisabled}
              >
                <option value="">All tags</option>
                {(metadata?.tags ?? []).map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.name}
                  </option>
                ))}
              </SelectField>

              <Input
                label="Name (search)"
                name="search"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="e.g. ChatGPT"
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
          className="flex flex-wrap items-center gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {listError}
          <Button
            variant="secondary"
            className="!py-1.5 !text-xs"
            onClick={() => void fetchToolsList()}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {listLoading ? (
        <p className="text-center text-slate-600">Loading tools…</p>
      ) : null}

      {!listLoading && !listError && tools.length === 0 ? (
        <Card className="border-slate-100 text-center text-slate-600 shadow-sm">
          No tools match your filters. Try adjusting search or filters.
        </Card>
      ) : null}

      {!listLoading && tools.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {tools.map((t) => (
            <Card
              key={t.id}
              hover
              className="flex flex-col border-slate-100 shadow-md"
            >
              {t.image_url ? (
                <div className="-mx-6 -mt-6 mb-4 overflow-hidden rounded-t-xl border-b border-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.image_url}
                    alt={`Screenshot: ${t.name}`}
                    className="h-36 w-full object-cover"
                  />
                </div>
              ) : null}
              <h3 className="text-lg font-bold text-slate-900">{t.name}</h3>
              <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">
                {shortDescription(t.description)}
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {t.categories?.map((c) => (
                  <Badge key={`c-${c.id}`} tone="blue">
                    {c.name}
                  </Badge>
                ))}
                {t.tags?.map((tag) => (
                  <Badge key={`t-${tag.id}`} tone="gray">
                    {tag.name}
                  </Badge>
                ))}
                {t.roles?.map((r) => (
                  <Badge key={`r-${r.id}`} tone="emerald">
                    {r.name}
                  </Badge>
                ))}
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <a
                  href={t.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                >
                  Open link
                </a>
                <Link
                  href={`/tools/${t.id}/edit`}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                >
                  Edit
                </Link>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-[44px] flex-1 !border-red-200 !text-red-800 hover:!bg-red-50 focus-visible:!ring-red-600"
                  disabled={deletingId === t.id || !getToken()}
                  onClick={() =>
                    setPendingDelete({ id: t.id, name: t.name })
                  }
                >
                  {deletingId === t.id ? "…" : "Delete"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete tool?"
        description={
          pendingDelete
            ? `“${pendingDelete.name}” will be removed permanently.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deletingId !== null}
        onConfirm={() => void confirmDelete()}
        onClose={() => {
          if (deletingId === null) setPendingDelete(null);
        }}
      />
    </div>
  );
}
