"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api";
import {
  getStoredUser,
  setStoredAuth,
  type AuthUser,
} from "@/lib/auth-storage";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getStoredUser()) {
      router.replace("/dashboard");
    }
  }, [router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      let data: unknown;
      try {
        data = await res.json();
      } catch {
        setError(`Login failed (${res.status})`);
        return;
      }

      if (!res.ok) {
        const body = data as {
          message?: string;
          errors?: { email?: string[] };
        };
        const msg =
          body.errors?.email?.[0] ??
          body.message ??
          `Login failed (${res.status})`;
        setError(typeof msg === "string" ? msg : "Login failed");
        return;
      }

      const success = data as { token?: string; user?: AuthUser };
      if (!success.token || !success.user) {
        setError("Unexpected response from server");
        return;
      }

      setStoredAuth(success.token, success.user);
      router.push("/dashboard");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md items-center justify-center px-4 py-12">
      <Card className="w-full border-slate-200/90 shadow-lg ring-1 ring-slate-900/5">
        <h1 className="mb-1 text-center text-2xl font-bold tracking-tight text-slate-900">
          Sign in
        </h1>
        <p className="mb-8 text-center text-sm text-slate-600">
          Use your account to access the platform.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error ? (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          ) : null}

          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
