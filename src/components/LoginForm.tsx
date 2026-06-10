"use client";

import { useState } from "react";

export default function LoginForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    });
    setLoading(false);
    if (!response.ok) {
      setError("Invalid email or password");
      return;
    }
    window.location.href = "/dashboard";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-950">Sign in</h1>
        <p className="mt-1 text-sm text-slate-600">Access the standalone Cold Calling system.</p>
        <label className="mt-5 block text-sm font-medium text-slate-700">Email</label>
        <input name="email" type="email" required className="mt-1 w-full rounded border border-slate-300 px-3 py-2 outline-none focus:border-blue-600" />
        <label className="mt-4 block text-sm font-medium text-slate-700">Password</label>
        <input name="password" type="password" minLength={8} required className="mt-1 w-full rounded border border-slate-300 px-3 py-2 outline-none focus:border-blue-600" />
        {error && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button disabled={loading} className="mt-5 w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60">
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
