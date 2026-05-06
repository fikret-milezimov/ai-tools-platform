"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api";
import {
  getStoredUser,
  setStoredAuth,
  getToken,
  type AuthUser,
} from "@/lib/auth-storage";
import { authJsonHeaders } from "@/lib/tools-helpers";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const u = getStoredUser();
    if (!u) {
      router.replace("/login");
      setLoading(false);
      return;
    }
    setUser(u);
    setLoading(false);
  }, [router]);

  async function refreshFromApi() {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/user`, {
        headers: authJsonHeaders(),
      });
      let data: unknown;
      try {
        data = await res.json();
      } catch {
        setError("Invalid response from server.");
        return;
      }
      if (!res.ok) {
        const body = data as { message?: string };
        setError(
          typeof body.message === "string"
            ? body.message
            : `Could not load profile (${res.status}).`,
        );
        return;
      }
      const next = data as AuthUser;
      setStoredAuth(token, next);
      setUser(next);
    } catch {
      setError("Network error.");
    } finally {
      setRefreshing(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-600">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        title="Profile"
        description="Your account details from the catalog application."
      />

      <Card className="border-slate-100 shadow-sm">
        <dl className="divide-y divide-slate-100">
          <div className="grid gap-1 py-4 sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-slate-500">Name</dt>
            <dd className="text-base text-slate-900 sm:col-span-2">{user.name}</dd>
          </div>
          <div className="grid gap-1 py-4 sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-slate-500">Email</dt>
            <dd className="text-base text-slate-900 sm:col-span-2">{user.email}</dd>
          </div>
          <div className="grid gap-1 py-4 sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-slate-500">Role</dt>
            <dd className="sm:col-span-2">
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-medium capitalize text-slate-800 ring-1 ring-slate-200/80">
                {user.role}
              </span>
            </dd>
          </div>
        </dl>

        {error ? (
          <p
            role="alert"
            className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={refreshing}
            onClick={() => void refreshFromApi()}
          >
            {refreshing ? "Refreshing…" : "Refresh from server"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
