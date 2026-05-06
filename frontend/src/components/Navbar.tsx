"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import {
  clearStoredAuth,
  getStoredUser,
  type AuthUser,
} from "@/lib/auth-storage";
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
  if (href === "/tools/new") {
    return pathname === "/tools/new";
  }
  if (href === "/tools") {
    return pathname === "/tools" || pathname.startsWith("/tools/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const mobileNavId = useId();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    setUser(getStoredUser());
  }, [pathname]);

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
    clearStoredAuth();
    setUser(null);
    setMenuOpen(false);
    router.push("/login");
  }

  const navLinks = user ? navItemsForRole(user.role) : [];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/90">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link
          href={user ? "/dashboard" : "/login"}
          className="text-lg font-semibold tracking-tight text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          AI Tools Platform
        </Link>

        {user ? (
          <>
            <nav
              className="hidden items-center gap-1 md:flex"
              aria-label="Main navigation"
            >
              {navLinks.map((item) => {
                const active = matchesPath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${
                      active
                        ? "bg-sky-50 text-sky-800"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="hidden items-center gap-3 md:flex">
              <details className="group relative">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                  <span className="max-w-[10rem] truncate">{user.name}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal capitalize text-slate-600">
                    {user.role}
                  </span>
                  <svg
                    className="h-4 w-4 text-slate-500 group-open:rotate-180"
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
                  >
                    Profile
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
            </div>

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
          </>
        ) : (
          <Link
            href="/login"
            className={`rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${
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
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-3 text-base font-medium ${
                    active ? "bg-sky-50 text-sky-900" : "text-slate-800"
                  }`}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              className="rounded-lg px-3 py-3 text-left text-base font-medium text-red-700"
              onClick={logout}
            >
              Log out
            </button>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
