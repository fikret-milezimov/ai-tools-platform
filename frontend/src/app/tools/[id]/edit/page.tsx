"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { getStoredUser, getToken } from "@/lib/auth-storage";
import type {
  Metadata,
  PaginationMeta,
  ToolDetail,
  ToolFeedbackComment,
  ToolFeedbackSummary,
} from "@/lib/tools-types";
import {
  authJsonHeaders,
  authMultipartHeaders,
  buildToolFormData,
  canManageTool,
  resolveImageUrl,
  toggleId,
  unwrapApiData,
} from "@/lib/tools-helpers";
import { flashToast } from "@/components/ToastProvider";
import { PageHeader } from "@/components/PageHeader";
import { RoleMultiSelect } from "@/components/RoleMultiSelect";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

function CheckboxRow({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2.5 transition hover:bg-gray-100/80 ${
        disabled ? "pointer-events-none opacity-50" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
      />
      <span className="text-sm text-gray-800">{label}</span>
    </label>
  );
}

export default function EditToolPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const idParam = params.id;
  const toolId = typeof idParam === "string" ? idParam : idParam?.[0] ?? "";
  const returnToParam = searchParams.get("returnTo");
  const viewMode = searchParams.get("mode") === "view";
  const safeReturnTo =
    returnToParam && returnToParam.startsWith("/") ? returnToParam : "/tools";
  const toolsBackHref = safeReturnTo === "/dashboard" ? "/tools" : safeReturnTo;

  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  const [toolLoading, setToolLoading] = useState(true);
  const [toolError, setToolError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [documentationUrl, setDocumentationUrl] = useState("");
  const [description, setDescription] = useState("");
  const [howToUse, setHowToUse] = useState("");
  const [realExamples, setRealExamples] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [roleIds, setRoleIds] = useState<number[]>([]);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreviewUrl, setScreenshotPreviewUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [feedbackSummary, setFeedbackSummary] = useState<ToolFeedbackSummary>({
    average_rating: null,
    ratings_count: 0,
    my_rating: null,
  });
  const [comments, setComments] = useState<ToolFeedbackComment[]>([]);
  const [commentsPage, setCommentsPage] = useState<PaginationMeta>({
    current_page: 1,
    per_page: 10,
    total: 0,
    last_page: 1,
    from: null,
    to: null,
  });
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [feedbackActionLoading, setFeedbackActionLoading] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");

  function notifyDashboardToolsChanged() {
    window.dispatchEvent(new CustomEvent("dashboard-tools-changed"));
  }

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
        setMetadataError("Invalid response from server.");
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
      setMetadataError("Network error.");
      setMetadata(null);
    } finally {
      setMetadataLoading(false);
    }
  }, []);

  const loadTool = useCallback(async () => {
    if (!toolId) return;
    setToolLoading(true);
    setToolError(null);
    setCanEdit(false);
    try {
      const res = await fetch(`${API_BASE}/api/tools/${toolId}`, {
        headers: { Accept: "application/json" },
      });
      let raw: unknown;
      try {
        raw = await res.json();
      } catch {
        setToolError("Invalid JSON from server.");
        return;
      }
      if (!res.ok) {
        const body = raw as { message?: string };
        setToolError(
          typeof body.message === "string"
            ? body.message
            : `Tool not found (${res.status}).`,
        );
        return;
      }
      const tool = unwrapApiData<ToolDetail>(raw);
      if (!tool) {
        setToolError("Missing tool data in response.");
        return;
      }
      setName(tool.name);
      setLink(tool.link);
      setDocumentationUrl(tool.documentation_url ?? "");
      setDescription(tool.description);
      setHowToUse(tool.how_to_use ?? "");
      setRealExamples(tool.real_examples ?? "");
      setImageUrl(tool.image_url ?? "");
      setCategoryIds(tool.categories?.map((c) => c.id) ?? []);
      setTagIds(tool.tags?.map((t) => t.id) ?? []);
      setRoleIds(tool.roles?.map((r) => r.id) ?? []);
      const u = getStoredUser();
      setCanEdit(canManageTool(u?.role, u?.id, tool.created_by));
    } catch {
      setToolError("Network error while loading tool.");
    } finally {
      setToolLoading(false);
    }
  }, [toolId]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    void loadMetadata();
  }, [loadMetadata, router]);

  useEffect(() => {
    if (!toolId) {
      setToolError("Invalid tool id.");
      setToolLoading(false);
      return;
    }
    void loadTool();
  }, [loadTool, toolId]);

  useEffect(() => {
    if (!screenshotFile) {
      setScreenshotPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(screenshotFile);
    setScreenshotPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [screenshotFile]);

  const loadFeedback = useCallback(
    async (page = 1) => {
      if (!toolId) {
        return;
      }
      setFeedbackLoading(true);
      setFeedbackError(null);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("per_page", "10");
        const headers: HeadersInit = { Accept: "application/json" };
        const token = getToken();
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const res = await fetch(
          `${API_BASE}/api/tools/${toolId}/feedback?${params.toString()}`,
          { headers },
        );
        const raw = (await res.json().catch(() => null)) as {
          summary?: ToolFeedbackSummary;
          comments?: ToolFeedbackComment[];
          pagination?: PaginationMeta;
          message?: string;
        } | null;

        if (!res.ok || !raw) {
          setFeedbackError(raw?.message ?? `Failed to load feedback (${res.status}).`);
          setComments([]);
          return;
        }

        setFeedbackSummary(
          raw.summary ?? { average_rating: null, ratings_count: 0, my_rating: null },
        );
        setSelectedRating(raw.summary?.my_rating ?? null);
        setComments(Array.isArray(raw.comments) ? raw.comments : []);
        if (raw.pagination) {
          setCommentsPage(raw.pagination);
        }
      } catch {
        setFeedbackError("Network error while loading feedback.");
        setComments([]);
      } finally {
        setFeedbackLoading(false);
      }
    },
    [toolId],
  );

  useEffect(() => {
    void loadFeedback(1);
  }, [loadFeedback]);

  useEffect(() => {
    if (toolLoading) {
      return;
    }
    if (typeof window === "undefined" || window.location.hash !== "#feedback") {
      return;
    }
    const target = document.getElementById("feedback");
    if (!target) {
      return;
    }
    // Delay one frame so layout settles before scrolling.
    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [toolLoading, metadataLoading]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    if (!canEdit || viewMode) {
      return;
    }
    if (!getToken()) {
      router.push("/login");
      return;
    }

    setFormLoading(true);
    try {
      const fd = buildToolFormData({
        name,
        link,
        documentation_url: documentationUrl,
        description,
        how_to_use: howToUse,
        real_examples: realExamples,
        // Keep existing image unless user uploads a new screenshot.
        image_url: "",
        category_ids: categoryIds,
        tag_ids: tagIds,
        role_ids: roleIds,
        screenshot: screenshotFile,
      });
      // Laravel handles multipart updates reliably via method spoofing.
      fd.append("_method", "PUT");

      const res = await fetch(`${API_BASE}/api/tools/${toolId}`, {
        method: "POST",
        headers: authMultipartHeaders(),
        body: fd,
      });

      let data: unknown;
      try {
        data = await res.json();
      } catch {
        setFormError(`Could not read response (${res.status}).`);
        return;
      }

      if (!res.ok) {
        if (data && typeof data === "object" && "errors" in data) {
          const errors = (data as { errors: Record<string, string[]> }).errors;
          const parts = Object.entries(errors)
            .map(([k, v]) => `${k}: ${v.join(", ")}`)
            .join("; ");
          setFormError(parts || (data as { message?: string }).message || "Validation failed");
        } else {
          setFormError(
            typeof (data as { message?: string }).message === "string"
              ? (data as { message: string }).message
              : `Could not save tool (${res.status}).`,
          );
        }
        return;
      }

      flashToast("Tool updated successfully.", "success");
      notifyDashboardToolsChanged();
      router.push(safeReturnTo);
    } catch {
      setFormError("Network error.");
    } finally {
      setFormLoading(false);
    }
  }

  async function saveRating() {
    if (selectedRating == null) {
      setFeedbackError("Select a rating first.");
      return;
    }
    if (!getToken()) {
      router.push("/login");
      return;
    }
    setFeedbackActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/tools/${toolId}/rating`, {
        method: "PUT",
        headers: authJsonHeaders(),
        body: JSON.stringify({ rating: selectedRating }),
      });
      const raw = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) {
        setFeedbackError(raw?.message ?? `Could not save rating (${res.status}).`);
        return;
      }
      await loadFeedback(commentsPage.current_page);
      flashToast("Rating saved.", "success");
      notifyDashboardToolsChanged();
    } catch {
      setFeedbackError("Network error while saving rating.");
    } finally {
      setFeedbackActionLoading(false);
    }
  }

  async function submitComment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = commentBody.trim();
    if (!body) {
      return;
    }
    if (!getToken()) {
      router.push("/login");
      return;
    }
    setFeedbackActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/tools/${toolId}/comments`, {
        method: "POST",
        headers: authJsonHeaders(),
        body: JSON.stringify({ body }),
      });
      const raw = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) {
        setFeedbackError(raw?.message ?? `Could not add comment (${res.status}).`);
        return;
      }
      setCommentBody("");
      await loadFeedback(1);
      flashToast("Comment added.", "success");
      notifyDashboardToolsChanged();
    } catch {
      setFeedbackError("Network error while posting comment.");
    } finally {
      setFeedbackActionLoading(false);
    }
  }

  function canManageComment(commentUserId?: number | null): boolean {
    const user = getStoredUser();
    if (!user || commentUserId == null) {
      return false;
    }
    if (user.role === "owner" || user.role === "pm") {
      return true;
    }
    return user.id === commentUserId;
  }

  function startEditComment(comment: ToolFeedbackComment) {
    setEditingCommentId(comment.id);
    setEditingCommentBody(comment.body);
  }

  function cancelEditComment() {
    setEditingCommentId(null);
    setEditingCommentBody("");
  }

  async function saveEditedComment(commentId: number) {
    const body = editingCommentBody.trim();
    if (!body) {
      setFeedbackError("Comment cannot be empty.");
      return;
    }
    if (!getToken()) {
      router.push("/login");
      return;
    }
    setFeedbackActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/comments/${commentId}`, {
        method: "PUT",
        headers: authJsonHeaders(),
        body: JSON.stringify({ body }),
      });
      const raw = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) {
        setFeedbackError(raw?.message ?? `Could not update comment (${res.status}).`);
        return;
      }
      cancelEditComment();
      await loadFeedback(commentsPage.current_page);
      flashToast("Comment updated.", "success");
      notifyDashboardToolsChanged();
    } catch {
      setFeedbackError("Network error while updating comment.");
    } finally {
      setFeedbackActionLoading(false);
    }
  }

  async function deleteComment(commentId: number) {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    setFeedbackActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/comments/${commentId}`, {
        method: "DELETE",
        headers: authJsonHeaders(),
      });
      if (!res.ok) {
        const raw = (await res.json().catch(() => null)) as { message?: string } | null;
        setFeedbackError(raw?.message ?? `Could not delete comment (${res.status}).`);
        return;
      }
      if (editingCommentId === commentId) {
        cancelEditComment();
      }
      await loadFeedback(commentsPage.current_page);
      flashToast("Comment deleted.", "success");
      notifyDashboardToolsChanged();
    } catch {
      setFeedbackError("Network error while deleting comment.");
    } finally {
      setFeedbackActionLoading(false);
    }
  }

  const metaBlocked = metadataLoading || Boolean(metadataError);
  const isReadOnly = !canEdit || viewMode;
  const fieldsDisabled = formLoading || metaBlocked || isReadOnly;

  if (toolLoading) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center text-gray-600">
        Loading tool…
      </div>
    );
  }

  if (toolError) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-12">
        <p className="rounded-lg bg-red-50 px-4 py-3 text-red-700" role="alert">
          {toolError}
        </p>
        <Link
          href={toolsBackHref}
          className="text-sm font-medium text-sky-700 hover:text-sky-900"
        >
          ← Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-6">
        <Link
          href={toolsBackHref}
          className="text-sm font-medium text-sky-700 hover:text-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          ← Back to tools
        </Link>
        <PageHeader
          title={isReadOnly ? "View tool" : "Edit tool"}
          description="Update fields and links to categories, tags, and roles. Replace the screenshot by uploading a new image."
        />
      </div>

      {metadataLoading ? (
        <p className="text-sm text-gray-500">Loading form options…</p>
      ) : null}
      {metadataError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
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

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {formError ? (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {formError}
            </p>
          ) : null}

          <Input
            label="Name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={fieldsDisabled}
          />

          <Input
            label="Link"
            name="link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            required
            disabled={fieldsDisabled}
          />

          <Input
            label="Documentation URL"
            name="documentation_url"
            value={documentationUrl}
            onChange={(e) => setDocumentationUrl(e.target.value)}
            disabled={fieldsDisabled}
          />

          <Textarea
            label="Description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            disabled={fieldsDisabled}
          />

          <Textarea
            label="How to use"
            name="how_to_use"
            value={howToUse}
            onChange={(e) => setHowToUse(e.target.value)}
            disabled={fieldsDisabled}
          />

          <Textarea
            label="Example links"
            name="real_examples"
            value={realExamples}
            onChange={(e) => setRealExamples(e.target.value)}
            disabled={fieldsDisabled}
            placeholder="One URL per line (or free text)"
          />

          {(screenshotPreviewUrl || imageUrl.trim()) ? (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={screenshotPreviewUrl ?? resolveImageUrl(imageUrl) ?? imageUrl}
                alt=""
                className="max-h-48 w-full object-contain bg-gray-50"
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-gray-800">
              New screenshot (upload)
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={fieldsDisabled}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-sky-800 hover:file:bg-sky-100"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setScreenshotFile(f);
              }}
            />
          </div>

          <fieldset
            disabled={fieldsDisabled}
            className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4"
          >
            <legend className="px-1 text-sm font-semibold text-gray-900">
              Categories
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {metadata?.categories.map((c) => (
                <CheckboxRow
                  key={c.id}
                  checked={categoryIds.includes(c.id)}
                  onChange={() =>
                    setCategoryIds((prev) => toggleId(prev, c.id))
                  }
                  label={c.name}
                />
              ))}
            </div>
          </fieldset>

          <fieldset
            disabled={fieldsDisabled}
            className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4"
          >
            <legend className="px-1 text-sm font-semibold text-gray-900">
              Tags
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {metadata?.tags.map((t) => (
                <CheckboxRow
                  key={t.id}
                  checked={tagIds.includes(t.id)}
                  onChange={() => setTagIds((prev) => toggleId(prev, t.id))}
                  label={t.name}
                />
              ))}
            </div>
          </fieldset>

          <div
            className={`rounded-xl border border-gray-200 bg-gray-50/50 p-4 ${
              fieldsDisabled ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <RoleMultiSelect
              label="Roles for this tool"
              roles={metadata?.roles ?? []}
              value={roleIds}
              onChange={setRoleIds}
              disabled={fieldsDisabled}
            />
          </div>

          {canEdit ? (
            <div className="flex flex-wrap gap-3 pt-2">
              {viewMode ? (
                <Link
                  href={`/tools/${toolId}/edit?returnTo=${encodeURIComponent(safeReturnTo)}`}
                  className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700"
                >
                  Edit
                </Link>
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  disabled={formLoading || metaBlocked}
                >
                  {formLoading ? "Saving…" : "Save changes"}
                </Button>
              )}
              <Link
                href={toolsBackHref}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50"
              >
                Cancel
              </Link>
            </div>
          ) : null}
        </form>
      </Card>

      <Card id="feedback" className="space-y-5">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">Ratings and comments</h2>
          <p className="text-sm font-semibold text-slate-700">
            Community rating:{" "}
            {feedbackSummary.average_rating == null
              ? "—"
              : (Math.round(feedbackSummary.average_rating * 10) / 10)
                  .toFixed(1)
                  .replace(/\.0$/, "")} / 5 from {feedbackSummary.ratings_count} reviews
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <Button
              key={star}
              type="button"
              variant={selectedRating === star ? "primary" : "secondary"}
              className="!px-3 !py-1.5 !text-xs"
              onClick={() => setSelectedRating(star)}
              disabled={feedbackActionLoading}
            >
              {star}★
            </Button>
          ))}
          <Button
            type="button"
            variant="primary"
            className="!px-3 !py-1.5 !text-xs"
            onClick={() => void saveRating()}
            disabled={feedbackActionLoading || selectedRating == null}
          >
            Submit rating
          </Button>
        </div>

        <form onSubmit={submitComment} className="space-y-3">
          <Textarea
            label="Add comment"
            name="comment"
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            disabled={feedbackActionLoading}
          />
          <Button type="submit" variant="primary" disabled={feedbackActionLoading || !commentBody.trim()}>
            Post comment
          </Button>
        </form>

        {feedbackError ? (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {feedbackError}
          </p>
        ) : null}

        {feedbackLoading ? (
          <p className="text-sm text-slate-500">Loading feedback…</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-slate-500">No comments yet.</p>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                {editingCommentId === comment.id ? (
                  <div className="space-y-2">
                    <Textarea
                      label="Edit comment"
                      name={`edit_comment_${comment.id}`}
                      value={editingCommentBody}
                      onChange={(e) => setEditingCommentBody(e.target.value)}
                      disabled={feedbackActionLoading}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        className="!px-3 !py-1.5 !text-xs"
                        onClick={() => void saveEditedComment(comment.id)}
                        disabled={feedbackActionLoading || !editingCommentBody.trim()}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="!px-3 !py-1.5 !text-xs"
                        onClick={cancelEditComment}
                        disabled={feedbackActionLoading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-900">{comment.body}</p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  {comment.user?.name ?? "Unknown"} · {comment.created_at ? new Date(comment.created_at).toLocaleString() : "—"}
                </p>
                {canManageComment(comment.user?.id) ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {editingCommentId !== comment.id ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="!px-3 !py-1.5 !text-xs"
                        onClick={() => startEditComment(comment)}
                        disabled={feedbackActionLoading}
                      >
                        Edit
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="secondary"
                      className="!border-red-200 !px-3 !py-1.5 !text-xs !text-red-800 hover:!bg-red-50"
                      onClick={() => void deleteComment(comment.id)}
                      disabled={feedbackActionLoading}
                    >
                      Delete
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <Link
            href={safeReturnTo}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50"
          >
            Back
          </Link>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={feedbackLoading || commentsPage.current_page <= 1}
              onClick={() => void loadFeedback(commentsPage.current_page - 1)}
            >
              Prev
            </Button>
            <span className="text-sm text-slate-600">
              Page {commentsPage.current_page} / {commentsPage.last_page}
            </span>
            <Button
              type="button"
              variant="secondary"
              disabled={feedbackLoading || commentsPage.current_page >= commentsPage.last_page}
              onClick={() => void loadFeedback(commentsPage.current_page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
