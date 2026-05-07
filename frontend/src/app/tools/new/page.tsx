"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { getToken } from "@/lib/auth-storage";
import type { Metadata } from "@/lib/tools-types";
import {
  authMultipartHeaders,
  buildToolFormData,
  toggleId,
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

export default function NewToolPage() {
  const router = useRouter();
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [metadataError, setMetadataError] = useState<string | null>(null);

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
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

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

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    void loadMetadata();
  }, [loadMetadata, router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
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
        image_url: imageUrl,
        category_ids: categoryIds,
        tag_ids: tagIds,
        role_ids: roleIds,
        screenshot: screenshotFile,
      });

      const res = await fetch(`${API_BASE}/api/tools`, {
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
              : `Could not create tool (${res.status}).`,
          );
        }
        return;
      }

      flashToast(
        "Tool submitted. It will appear in the catalog after an admin approves it.",
        "success",
      );
      router.push("/tools");
    } catch {
      setFormError("Network error.");
    } finally {
      setFormLoading(false);
    }
  }

  const metaBlocked = metadataLoading || Boolean(metadataError);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-6">
        <Link
          href="/tools"
          className="text-sm font-medium text-sky-700 hover:text-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          ← Back to tools
        </Link>
        <PageHeader
          title="Add a tool"
          description="Fill in the details and attach categories, tags, and roles. Upload an optional screenshot or link example URLs."
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
            disabled={formLoading}
          />

          <Input
            label="Link"
            name="link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            required
            disabled={formLoading}
          />

          <Input
            label="Documentation URL"
            name="documentation_url"
            value={documentationUrl}
            onChange={(e) => setDocumentationUrl(e.target.value)}
            disabled={formLoading}
          />

          <Textarea
            label="Description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            disabled={formLoading}
          />

          <Textarea
            label="How to use"
            name="how_to_use"
            value={howToUse}
            onChange={(e) => setHowToUse(e.target.value)}
            disabled={formLoading}
          />

          <Textarea
            label="Example links"
            name="real_examples"
            value={realExamples}
            onChange={(e) => setRealExamples(e.target.value)}
            disabled={formLoading}
            placeholder="One URL per line (or free text with links)"
          />

          <Input
            label="Image URL (optional)"
            name="image_url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            disabled={formLoading}
            hint="If you upload a file below, it takes precedence over this field."
          />

          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-gray-800">
              Screenshot (upload)
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={formLoading}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-sky-800 hover:file:bg-sky-100"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setScreenshotFile(f);
              }}
            />
            <p className="text-xs text-gray-500">
              JPEG, PNG, WebP, or GIF, up to ~4 MB. Run{" "}
              <code className="rounded bg-gray-100 px-1">php artisan storage:link</code>{" "}
              on the server so public URLs work.
            </p>
          </div>

          <fieldset
            disabled={metaBlocked || formLoading}
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
            disabled={metaBlocked || formLoading}
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
              metaBlocked || formLoading ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <RoleMultiSelect
              label="Roles for this tool"
              roles={metadata?.roles ?? []}
              value={roleIds}
              onChange={setRoleIds}
              disabled={metaBlocked || formLoading}
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={formLoading || metaBlocked}
            >
              {formLoading ? "Saving…" : "Create tool"}
            </Button>
            <Link
              href="/tools"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
