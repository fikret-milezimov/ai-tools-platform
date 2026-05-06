"use client";

import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { ToastProvider } from "@/components/ToastProvider";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/90">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-sky-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
        >
          Skip to main content
        </a>
        <Navbar />
        <main
          id="main-content"
          className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-10 lg:px-8"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
