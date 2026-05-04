"use client";

import { FormEvent, useEffect, useState } from "react";

const API_BASE = "http://localhost:8201";
const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  email_verified_at?: string | null;
};

export default function Home() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const raw = localStorage.getItem(USER_KEY);
      if (token && raw) {
        setUser(JSON.parse(raw) as AuthUser);
      } else {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
    setReady(true);
  }, []);

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

      localStorage.setItem(TOKEN_KEY, success.token);
      localStorage.setItem(USER_KEY, JSON.stringify(success.user));
      setUser(success.user);
      setPassword("");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return null;
  }

  if (user) {
    return (
      <div>
        <p>
          Welcome {user.name}, role: {user.role}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {error ? <p role="alert">{error}</p> : null}
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button type="submit" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
