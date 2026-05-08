"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_BASE } from "@/lib/api";
import {
  getStoredUser,
  type AuthUser,
} from "@/lib/auth-storage";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import type { Tool } from "@/lib/tools-types";

function ActionCard({
  href,
  title,
  subtitle,
  icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/5 transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
    >
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700 ring-1 ring-sky-100 transition group-hover:bg-sky-100">
        {icon}
      </div>
      <span className="font-semibold text-slate-900">{title}</span>
      <span className="mt-1 text-sm leading-relaxed text-slate-600">
        {subtitle}
      </span>
    </Link>
  );
}

function ComingSoonCard({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <div
      className="flex flex-col rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-5 text-left opacity-95"
      aria-disabled="true"
    >
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 ring-1 ring-slate-200/80">
        {icon}
      </div>
      <span className="font-semibold text-slate-700">{title}</span>
      <span className="mt-1 text-sm leading-relaxed text-slate-500">
        {subtitle}
      </span>
    </div>
  );
}

function IconGrid() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75a2.25 2.25 0 0 1 2.25-2.25h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}

function IconFlag() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208-.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.166-5.994l-3.114.732a9 9 0 0 1-6.086-.71 9 9 0 0 0-6.208.682L3 15.5V9m9-6 3.75 3.75M12 3v9" />
    </svg>
  );
}

function roleActionCards(role: string) {
  const owner = (
    <>
      <ActionCard
        href="/admin/tools"
        title="Admin panel"
        subtitle="Review pending tools, approve or reject submissions, and manage user accounts."
        icon={<IconGrid />}
      />
      <ActionCard
        href="/tools"
        title="View all tools"
        subtitle="Browse the public catalog and filters."
        icon={<IconEye />}
      />
      <ActionCard
        href="/tools/new"
        title="Add a tool"
        subtitle="Create a new catalog entry."
        icon={<IconPlus />}
      />
    </>
  );

  const backend = (
    <>
      <ActionCard
        href="/tools/new"
        title="Add API tool"
        subtitle="Register a backend or API-focused tool."
        icon={<IconPlus />}
      />
      <ActionCard
        href="/tools"
        title="Backend tools"
        subtitle="Review tools tagged for backend work."
        icon={<IconGrid />}
      />
    </>
  );

  const frontend = (
    <>
      <ActionCard
        href="/tools/new"
        title="Add UI tool"
        subtitle="Share a UI or design workflow tool."
        icon={<IconPlus />}
      />
      <ActionCard
        href="/tools"
        title="Frontend tools"
        subtitle="Browse tools for product UI work."
        icon={<IconGrid />}
      />
    </>
  );

  const qa = (
    <>
      <ActionCard
        href="/tools"
        title="Explore catalog"
        subtitle="Use filters to focus testing scenarios."
        icon={<IconEye />}
      />
      <ComingSoonCard
        title="Report issues"
        subtitle="Structured QA workflows — coming soon."
        icon={<IconFlag />}
      />
    </>
  );

  const pm = (
    <>
      <ActionCard
        href="/tools"
        title="Tool overview"
        subtitle="Scan the catalog for planning and demos."
        icon={<IconEye />}
      />
      <ComingSoonCard
        title="Assignments"
        subtitle="Team assignments — coming soon."
        icon={<IconUsers />}
      />
    </>
  );

  const designer = (
    <>
      <ActionCard
        href="/tools"
        title="Design tools"
        subtitle="Discover tools for visuals and UX."
        icon={<IconGrid />}
      />
      <ComingSoonCard
        title="UI library"
        subtitle="Shared references — coming soon."
        icon={<IconEye />}
      />
    </>
  );

  const defaultCards = (
    <>
      <ActionCard
        href="/tools"
        title="Browse tools"
        subtitle="Search and filter the shared catalog."
        icon={<IconEye />}
      />
      <ActionCard
        href="/tools/new"
        title="Add a tool"
        subtitle="Contribute a new entry for your team."
        icon={<IconPlus />}
      />
    </>
  );

  switch (role) {
    case "owner":
      return owner;
    case "backend":
      return backend;
    case "frontend":
      return frontend;
    case "qa":
      return qa;
    case "pm":
      return pm;
    case "designer":
      return designer;
    default:
      return defaultCards;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [recentTools, setRecentTools] = useState<Tool[]>([]);
  const [mostRatedTools, setMostRatedTools] = useState<Tool[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  useEffect(() => {
    const u = getStoredUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    setUser(u);
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | null = null;

    async function loadDashboardTools(showLoader = false) {
      if (showLoader) {
        setRecentLoading(true);
      }
      try {
        const res = await fetch(`${API_BASE}/api/tools`, {
          headers: { Accept: "application/json" },
        });
        const raw = (await res.json().catch(() => null)) as { data?: Tool[] } | null;
        if (!cancelled && res.ok && Array.isArray(raw?.data)) {
          const allTools = raw.data;
          setRecentTools(allTools.slice(0, 3));
          const topRated = [...allTools]
            .filter((t) => (t.average_rating ?? 0) > 0)
            .sort((a, b) => {
              const ratingDiff = (b.average_rating ?? 0) - (a.average_rating ?? 0);
              if (ratingDiff !== 0) return ratingDiff;
              return (b.comments_count ?? 0) - (a.comments_count ?? 0);
            })
            .slice(0, 3);
          setMostRatedTools(topRated);
        } else if (!cancelled) {
          setRecentTools([]);
          setMostRatedTools([]);
        }
      } catch {
        if (!cancelled) {
          setRecentTools([]);
          setMostRatedTools([]);
        }
      } finally {
        if (!cancelled) {
          setRecentLoading(false);
        }
      }
    }

    function handleWindowFocus() {
      void loadDashboardTools();
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        void loadDashboardTools();
      }
    }

    function handleDashboardToolsChanged() {
      void loadDashboardTools();
    }

    void loadDashboardTools(true);
    intervalId = window.setInterval(() => {
      void loadDashboardTools();
    }, 10000);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("dashboard-tools-changed", handleDashboardToolsChanged);

    return () => {
      cancelled = true;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("dashboard-tools-changed", handleDashboardToolsChanged);
    };
  }, []);

  if (!user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-600">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <PageHeader
        align="center"
        title={`Welcome, ${user.name}`}
        description="Your dashboard surfaces shortcuts that match your role. Use the header navigation to move between sections."
      />

      <Card className="border-slate-100 shadow-sm">
        <div className="flex flex-wrap items-center justify-center gap-2 text-center">
          <span className="text-sm font-medium text-slate-500">Signed in as</span>
          <span className="text-base font-semibold text-slate-900">{user.email}</span>
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-medium capitalize text-slate-800 ring-1 ring-slate-200/80">
            Role: {user.role}
          </span>
        </div>
      </Card>

      <section aria-labelledby="quick-actions-heading">
        <h2
          id="quick-actions-heading"
          className="mb-4 text-lg font-semibold text-slate-900"
        >
          Quick actions
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roleActionCards(user.role)}
        </div>
      </section>

      <section aria-labelledby="recent-tools-heading">
        <h2
          id="recent-tools-heading"
          className="mb-4 text-lg font-semibold text-slate-900"
        >
          Latest tools
        </h2>
        {recentLoading ? (
          <p className="text-sm text-slate-600">Loading latest tools…</p>
        ) : recentTools.length === 0 ? (
          <Card className="border-slate-100 text-sm text-slate-600 shadow-sm">
            No tools yet.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentTools.map((tool) => (
              <Card key={tool.id} className="border-slate-100 shadow-sm">
                <p className="text-base font-semibold text-slate-900">{tool.name}</p>
                <p className="mt-2 line-clamp-3 text-sm text-slate-600">
                  {tool.description}
                </p>
                <div className="mt-4">
                  <Link
                    href={`/tools/${tool.id}/edit?mode=view&returnTo=/dashboard`}
                    className="text-sm font-medium text-sky-700 hover:text-sky-900"
                  >
                    View details
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="most-rated-tools-heading">
        <h2
          id="most-rated-tools-heading"
          className="mb-4 text-lg font-semibold text-slate-900"
        >
          Most rated
        </h2>
        {recentLoading ? (
          <p className="text-sm text-slate-600">Loading most rated tools…</p>
        ) : mostRatedTools.length === 0 ? (
          <Card className="border-slate-100 text-sm text-slate-600 shadow-sm">
            No ratings yet.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mostRatedTools.map((tool) => (
              <Card key={tool.id} className="border-slate-100 shadow-sm">
                <p className="text-base font-semibold text-slate-900">{tool.name}</p>
                <p className="mt-2 text-sm text-slate-600">
                  Rating: {(tool.average_rating ?? 0).toFixed(1).replace(/\.0$/, "")} / 5
                </p>
                <p className="text-xs text-slate-500">
                  Reviews: {tool.comments_count ?? 0}
                </p>
                <div className="mt-4">
                  <Link
                    href={`/tools/${tool.id}/edit?mode=view&returnTo=/dashboard`}
                    className="text-sm font-medium text-sky-700 hover:text-sky-900"
                  >
                    View details
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
