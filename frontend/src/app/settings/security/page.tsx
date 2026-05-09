"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { getStoredUser, getToken } from "@/lib/auth-storage";
import { authJsonHeaders } from "@/lib/tools-helpers";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ToastProvider";

type SecurityState = {
  email: { enabled: boolean; address: string; can_disable: boolean };
  totp: { enabled: boolean; enabled_at: string | null; can_disable: boolean };
};

export default function SecuritySettingsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [state, setState] = useState<SecurityState | null>(null);
  const [loading, setLoading] = useState(true);
  const [totpSetup, setTotpSetup] = useState<{
    setup_token: string;
    qr_url: string;
    otpauth_url: string;
  } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [busy, setBusy] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!getToken()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings/security`, {
        headers: authJsonHeaders(),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        const msg = (data as { message?: string })?.message ?? `Error (${res.status})`;
        showToast(msg, "error");
        setState(null);
        return;
      }
      setState(data as SecurityState);
    } catch {
      showToast("Network error while loading security settings.", "error");
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!getToken() || !getStoredUser()) {
      router.replace("/login");
      return;
    }
    void loadSettings();
  }, [loadSettings, router]);

  async function toggleEmail(enabled: boolean) {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings/security/email/toggle`, {
        method: "POST",
        headers: authJsonHeaders(),
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          (data as { errors?: { enabled?: string[] }; message?: string })?.errors?.enabled?.[0] ??
          (data as { message?: string })?.message ??
          `Error (${res.status})`;
        showToast(msg, "error");
        return;
      }
      showToast((data as { message?: string })?.message ?? "Saved.", "success");
      await loadSettings();
    } finally {
      setBusy(false);
    }
  }

  async function startTotpSetup() {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings/security/totp/setup-start`, {
        method: "POST",
        headers: authJsonHeaders(),
        body: "{}",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        showToast((data as { message?: string })?.message ?? `Error (${res.status})`, "error");
        return;
      }
      setTotpSetup({
        setup_token: (data as { setup_token: string }).setup_token,
        qr_url: (data as { qr_url: string }).qr_url,
        otpauth_url: (data as { otpauth_url: string }).otpauth_url,
      });
      showToast("Scan the QR code with your authenticator app, then confirm with a 6-digit code.", "info");
    } finally {
      setBusy(false);
    }
  }

  async function confirmTotp() {
    if (!totpSetup) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings/security/totp/setup-confirm`, {
        method: "POST",
        headers: authJsonHeaders(),
        body: JSON.stringify({
          setup_token: totpSetup.setup_token,
          code: totpCode.replace(/\D/g, "").slice(0, 6),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          (data as { errors?: { code?: string[]; setup_token?: string[] }; message?: string })?.errors?.code?.[0] ??
          (data as { errors?: { setup_token?: string[] } })?.errors?.setup_token?.[0] ??
          (data as { message?: string })?.message ??
          `Error (${res.status})`;
        showToast(msg, "error");
        return;
      }
      showToast((data as { message?: string })?.message ?? "Enabled.", "success");
      setTotpSetup(null);
      setTotpCode("");
      await loadSettings();
    } finally {
      setBusy(false);
    }
  }

  async function disableTotp() {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings/security/totp/disable`, {
        method: "POST",
        headers: authJsonHeaders(),
        body: "{}",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          (data as { errors?: { totp?: string[] }; message?: string })?.errors?.totp?.[0] ??
          (data as { message?: string })?.message ??
          `Error (${res.status})`;
        showToast(msg, "error");
        return;
      }
      showToast((data as { message?: string })?.message ?? "Disabled.", "success");
      setTotpSetup(null);
      setTotpCode("");
      await loadSettings();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Security settings"
        description="Manage email codes and Google Authenticator (TOTP) for sign-in. You can turn methods off; if none are enabled, you sign in with password only."
      />

      {loading ? <p className="text-slate-600">Loading settings…</p> : null}

      {!loading && state ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Email 2FA</h2>
            <p className="text-sm text-slate-600">
              One-time codes are sent to <strong>{state.email.address}</strong>. For production, configure SMTP in the
              backend <code className="text-xs">.env</code> (<code className="text-xs">MAIL_*</code>).
            </p>
            <p className="text-sm">
              Status:{" "}
              <span className={state.email.enabled ? "text-emerald-700" : "text-slate-600"}>
                {state.email.enabled ? "Enabled" : "Disabled"}
              </span>
            </p>
            <Button
              type="button"
              variant={state.email.enabled ? "secondary" : "primary"}
              disabled={busy}
              onClick={() => void toggleEmail(!state.email.enabled)}
            >
              {state.email.enabled ? "Disable Email 2FA" : "Enable Email 2FA"}
            </Button>
          </Card>

          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Google Authenticator</h2>
            <p className="text-sm text-slate-600">
              Time-based one-time passwords (TOTP). Works offline once configured—same flow as production apps.
            </p>
            <p className="text-sm">
              Status:{" "}
              <span className={state.totp.enabled ? "text-emerald-700" : "text-slate-600"}>
                {state.totp.enabled ? "Enabled" : "Disabled"}
              </span>
            </p>
            {state.totp.enabled ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void disableTotp()}
                >
                  Disable
                </Button>
              </>
            ) : (
              <Button type="button" variant="primary" disabled={busy} onClick={() => void startTotpSetup()}>
                Set up Google Authenticator
              </Button>
            )}

            {totpSetup ? (
              <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={totpSetup.qr_url}
                  alt="Scan this QR code with Google Authenticator"
                  className="h-44 w-44 rounded border border-slate-200"
                />
                <a
                  href={totpSetup.otpauth_url}
                  className="text-xs text-sky-700 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open otpauth link
                </a>
                <Input
                  label="Confirm 6-digit code"
                  name="totp_code"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  maxLength={6}
                />
                <Button
                  type="button"
                  variant="primary"
                  disabled={busy || totpCode.length !== 6}
                  onClick={() => void confirmTotp()}
                >
                  Confirm and enable
                </Button>
              </div>
            ) : null}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
