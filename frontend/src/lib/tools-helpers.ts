import { getToken } from "@/lib/auth-storage";
import { API_BASE } from "@/lib/api";

export function toggleId(ids: number[], id: number): number[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

export function authJsonHeaders(): HeadersInit {
  const token = getToken();
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** For FormData: omit Content-Type so the browser sets the multipart boundary. */
export function authMultipartHeaders(): HeadersInit {
  const token = getToken();
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function buildToolFormData(params: {
  name: string;
  link: string;
  documentation_url: string;
  description: string;
  how_to_use: string;
  real_examples: string;
  image_url: string;
  category_ids: number[];
  tag_ids: number[];
  role_ids: number[];
  screenshot: File | null;
}): FormData {
  const fd = new FormData();
  fd.append("name", params.name);
  fd.append("link", params.link);
  if (params.documentation_url.trim()) {
    fd.append("documentation_url", params.documentation_url);
  }
  fd.append("description", params.description);
  if (params.how_to_use.trim()) {
    fd.append("how_to_use", params.how_to_use);
  }
  if (params.real_examples.trim()) {
    fd.append("real_examples", params.real_examples);
  }
  if (params.image_url.trim() && !params.screenshot) {
    fd.append("image_url", params.image_url);
  }
  params.category_ids.forEach((id) => {
    fd.append("category_ids[]", String(id));
  });
  params.tag_ids.forEach((id) => {
    fd.append("tag_ids[]", String(id));
  });
  params.role_ids.forEach((id) => {
    fd.append("role_ids[]", String(id));
  });
  if (params.screenshot) {
    fd.append("screenshot", params.screenshot);
  }
  return fd;
}

/** Creator, owner, and product manager may edit or delete a tool; others are read-only. */
export function canManageTool(
  role: string | null | undefined,
  userId: number | null | undefined,
  createdBy: number | null | undefined,
): boolean {
  if (role === "owner" || role === "pm") {
    return true;
  }
  if (userId != null && createdBy != null && userId === createdBy) {
    return true;
  }
  return false;
}

/** Laravel JsonResource often returns `{ data: { ... } }`. */
export function unwrapApiData<T>(json: unknown): T | null {
  if (!json || typeof json !== "object") {
    return null;
  }
  const o = json as Record<string, unknown>;
  if ("data" in o && o.data !== null && typeof o.data === "object") {
    return o.data as T;
  }
  return json as T;
}

export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) {
    return url;
  }
  if (url.startsWith("/")) {
    return `${API_BASE}${url}`;
  }
  if (url.startsWith("storage/")) {
    return `${API_BASE}/${url}`;
  }
  return `${API_BASE}/storage/${url}`;
}
