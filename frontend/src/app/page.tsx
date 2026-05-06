"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser } from "@/lib/auth-storage";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (getStoredUser()) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center text-gray-500">
      <p>Redirecting…</p>
    </div>
  );
}
