"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getStoredUser,
  type AuthUser,
} from "@/lib/auth-storage";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

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
        description="Your account details."
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

      </Card>
    </div>
  );
}
