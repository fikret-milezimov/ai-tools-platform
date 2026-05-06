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

type LoginPhase = "password" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<LoginPhase>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendHint, setResendHint] = useState<string | null>(null);

  useEffect(() => {
    if (getStoredUser()) {
      router.replace("/dashboard");
    }
  }, [router]);

  function resetToPassword() {
    setPhase("password");
    setPendingToken(null);
    setOtpCode("");
    setError(null);
    setResendHint(null);
  }

  async function handlePasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResendHint(null);
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

      const body = data as {
        requires_2fa?: boolean;
        pending_token?: string;
        message?: string;
        token?: string;
        user?: AuthUser;
      };

      if (body.requires_2fa && typeof body.pending_token === "string") {
        setPendingToken(body.pending_token);
        setPhase("otp");
        setResendHint(
          typeof body.message === "string"
            ? body.message
            : "Enter the 6-digit code from your email.",
        );
        return;
      }

      if (!body.token || !body.user) {
        setError("Unexpected response from server");
        return;
      }

      setStoredAuth(body.token, body.user);
      router.push("/dashboard");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pendingToken) {
      setError("Session expired. Please sign in again.");
      return;
    }
    setError(null);
    setResendHint(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/login/verify-2fa`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pending_token: pendingToken,
          code: otpCode.replace(/\D/g, "").slice(0, 6),
        }),
      });

      let data: unknown;
      try {
        data = await res.json();
      } catch {
        setError(`Verification failed (${res.status})`);
        return;
      }

      if (!res.ok) {
        const body = data as {
          message?: string;
          errors?: { code?: string[] };
        };
        const msg =
          body.errors?.code?.[0] ??
          body.message ??
          `Verification failed (${res.status})`;
        setError(typeof msg === "string" ? msg : "Invalid code");
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

  async function handleResend() {
    if (!pendingToken) return;
    setError(null);
    setResendHint(null);
    setResendLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/login/resend-2fa`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pending_token: pendingToken }),
      });

      let data: unknown;
      try {
        data = await res.json();
      } catch {
        setError(`Resend failed (${res.status})`);
        return;
      }

      if (!res.ok) {
        const body = data as {
          message?: string;
          errors?: { pending_token?: string[] };
        };
        const msg =
          body.errors?.pending_token?.[0] ??
          body.message ??
          "Could not resend code";
        setError(typeof msg === "string" ? msg : "Could not resend code");
        return;
      }

      const body = data as { message?: string };
      setResendHint(
        typeof body.message === "string"
          ? body.message
          : "A new code has been sent.",
      );
    } catch {
      setError("Network error");
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md items-center justify-center px-4 py-12">
      <Card className="w-full border-slate-200/90 shadow-lg ring-1 ring-slate-900/5">
        {phase === "password" ? (
          <>
            <h1 className="mb-1 text-center text-2xl font-bold tracking-tight text-slate-900">
              Sign in
            </h1>
            <p className="mb-8 text-center text-sm text-slate-600">
              Use your account to access the platform.
            </p>

            <form onSubmit={handlePasswordSubmit} className="space-y-5">
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
          </>
        ) : (
          <>
            <h1 className="mb-1 text-center text-2xl font-bold tracking-tight text-slate-900">
              Check your email
            </h1>
            <p className="mb-6 text-center text-sm text-slate-600">
              Enter the 6-digit code we sent to <strong>{email}</strong>.
            </p>

            {resendHint ? (
              <p
                role="status"
                className="mb-4 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900"
              >
                {resendHint}
              </p>
            ) : null}

            <form onSubmit={handleOtpSubmit} className="space-y-5">
              {error ? (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {error}
                </p>
              ) : null}

              <Input
                label="Verification code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                value={otpCode}
                onChange={(e) =>
                  setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                required
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={loading || otpCode.length !== 6}
              >
                {loading ? "Verifying…" : "Verify and sign in"}
              </Button>
            </form>

            <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-6">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={resendLoading}
                onClick={() => void handleResend()}
              >
                {resendLoading ? "Sending…" : "Resend code"}
              </Button>
              <button
                type="button"
                className="text-center text-sm font-medium text-sky-700 hover:text-sky-900"
                onClick={resetToPassword}
              >
                ← Back to sign in
              </button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
