"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  clearStoredAuth,
  getToken,
  getStoredUser,
  type AuthUser,
} from "@/lib/auth-storage";
import { API_BASE } from "@/lib/api";
import { navItemsForRole } from "@/lib/nav-config";

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      className="h-6 w-6 text-slate-700"
      aria-hidden
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      {open ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      )}
    </svg>
  );
}

function matchesPath(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/admin/tools") {
    return pathname === "/admin/tools" || pathname.startsWith("/admin/");
  }
  if (href === "/tools") {
    return pathname === "/tools" || pathname.startsWith("/tools/");
  }
  if (href === "/settings/security") {
    return pathname === "/settings/security" || pathname.startsWith("/settings/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const mobileNavId = useId();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingAdminToolsCount, setPendingAdminToolsCount] = useState(0);
  const accountMenuRef = useRef<HTMLDetailsElement>(null);

  function closeAccountMenu() {
    const el = accountMenuRef.current;
    if (el) el.open = false;
  }

  useEffect(() => {
    const el = accountMenuRef.current;
    if (el) el.open = false;
  }, [pathname]);

  useEffect(() => {
    setUser(getStoredUser());
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | null = null;
    const isAdminReviewer = user?.role === "owner" || user?.role === "pm";

    async function loadPendingCount() {
      if (!isAdminReviewer) {
        setPendingAdminToolsCount(0);
        return;
      }
      const token = getToken();
      if (!token) {
        setPendingAdminToolsCount(0);
        return;
      }

      try {
        const params = new URLSearchParams({
          approval_status: "pending",
          per_page: "1",
          page: "1",
        });
        const res = await fetch(`${API_BASE}/api/admin/tools?${params.toString()}`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const raw = (await res.json().catch(() => null)) as {
          pagination?: { total?: number };
          data?: unknown[];
          tools?: unknown[];
        } | null;
        if (!cancelled) {
          const total =
            typeof raw?.pagination?.total === "number"
              ? raw.pagination.total
              : Array.isArray(raw?.tools)
                ? raw.tools.length
                : Array.isArray(raw?.data)
                  ? raw.data.length
                  : 0;
          setPendingAdminToolsCount(total);
        }
      } catch {
        if (!cancelled) {
          setPendingAdminToolsCount(0);
        }
      }
    }

    function handleWindowFocus() {
      void loadPendingCount();
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        void loadPendingCount();
      }
    }

    function handlePendingChanged() {
      void loadPendingCount();
    }

    void loadPendingCount();
    if (isAdminReviewer) {
      intervalId = window.setInterval(() => {
        void loadPendingCount();
      }, 10000);
      window.addEventListener("focus", handleWindowFocus);
      document.addEventListener("visibilitychange", handleVisibility);
      window.addEventListener("admin-pending-tools-changed", handlePendingChanged);
    }

    return () => {
      cancelled = true;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("admin-pending-tools-changed", handlePendingChanged);
    };
  }, [pathname, user]);

  useEffect(() => {
    function onResize() {
      if (window.matchMedia("(min-width: 768px)").matches) {
        setMenuOpen(false);
      }
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function logout() {
    closeAccountMenu();
    clearStoredAuth();
    setUser(null);
    setMenuOpen(false);
    router.push("/login");
  }

  const navLinks = user ? navItemsForRole(user.role) : [];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/90">
      <div className="mx-auto flex h-14 max-w-7xl w-full items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 sm:gap-4 lg:px-8">
        <Link
          href={user ? "/dashboard" : "/login"}
          className="shrink-0 text-lg font-semibold tracking-tight text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          AI Tools Platform
        </Link>

        {user ? (
          <>
            <nav
              className="mx-auto hidden min-w-0 flex-1 justify-center md:flex"
              aria-label="Main navigation"
            >
              {navLinks.map((item) => {
                const active = matchesPath(pathname, item.href);
                const showPendingBadge =
                  item.href === "/admin/tools" && pendingAdminToolsCount > 0;
                const badgeLabel =
                  pendingAdminToolsCount > 99
                    ? "99+"
                    : String(pendingAdminToolsCount);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${
                      active
                        ? "bg-sky-50 text-sky-800"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                    {showPendingBadge ? (
                      <span
                        className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white"
                        aria-label={`${pendingAdminToolsCount} pending admin tools`}
                      >
                        {badgeLabel}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <details ref={accountMenuRef} className="group relative">
                <summary className="flex max-w-[min(12rem,40vw)] cursor-pointer list-none items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 sm:max-w-none sm:gap-2 sm:px-3 [&::-webkit-details-marker]:hidden">
                  <span className="truncate">{user.name}</span>
                  <span className="hidden shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal capitalize text-slate-600 sm:inline">
                    {user.role}
                  </span>
                  <svg
                    className="h-4 w-4 shrink-0 text-slate-500 group-open:rotate-180"
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
                <div
                  className="absolute right-0 z-50 mt-1 w-56 origin-top-right rounded-lg border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-slate-900/5"
                  role="menu"
                >
                  <Link
                    href="/profile"
                    className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
                    role="menuitem"
                    onClick={closeAccountMenu}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/settings/security"
                    className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
                    role="menuitem"
                    onClick={closeAccountMenu}
                  >
                    Security settings
                  </Link>
                  <button
                    type="button"
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
                    role="menuitem"
                    onClick={logout}
                  >
                    Log out
                  </button>
                </div>
              </details>

              <button
                type="button"
                className="-mr-2 inline-flex items-center justify-center rounded-lg p-2 text-slate-700 hover:bg-slate-100 md:hidden"
                aria-expanded={menuOpen}
                aria-controls={mobileNavId}
                onClick={() => setMenuOpen((o) => !o)}
              >
                <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
                <MenuIcon open={menuOpen} />
              </button>
            </div>
          </>
        ) : (
          <Link
            href="/login"
            className={`ml-auto rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${
              pathname === "/login"
                ? "bg-sky-50 text-sky-800"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            Sign in
          </Link>
        )}
      </div>

      {user && menuOpen ? (
        <div
          id={mobileNavId}
          className="border-t border-slate-100 bg-white px-4 py-4 md:hidden"
        >
          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            {navLinks.map((item) => {
              const active = matchesPath(pathname, item.href);
              const showPendingBadge =
                item.href === "/admin/tools" && pendingAdminToolsCount > 0;
              const badgeLabel =
                pendingAdminToolsCount > 99
                  ? "99+"
                  : String(pendingAdminToolsCount);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative rounded-lg px-3 py-3 text-base font-medium ${
                    active ? "bg-sky-50 text-sky-900" : "text-slate-800"
                  }`}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                  {showPendingBadge ? (
                    <span
                      className="absolute right-1.5 top-1.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white"
                      aria-label={`${pendingAdminToolsCount} pending admin tools`}
                    >
                      {badgeLabel}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
