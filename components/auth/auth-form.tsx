"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { tryCreateClient } from "@/lib/supabase/client";

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return") || "/";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = tryCreateClient();
    if (!supabase) {
      setError("Supabase 鏈厤缃紝璇峰湪 .env.local 涓缃?NEXT_PUBLIC_SUPABASE_*");
      setLoading(false);
      return;
    }

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
      router.push(returnTo.startsWith("/") ? returnTo : "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "鐧诲綍澶辫触");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <h1 className="text-3xl font-bold text-center mb-8 gradient-text">璐﹀彿</h1>
      <form onSubmit={onSubmit} className="space-y-4 card p-6">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="email">
            閭
          </label>
          <input
            id="email"
            data-testid="auth-email"
            type="email"
            required
            className="w-full px-3 py-2 rounded-lg border"
            style={{
              background: "var(--input-bg)",
              borderColor: "var(--input-border)",
            }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="password">
            瀵嗙爜
          </label>
          <input
            id="password"
            data-testid="auth-password"
            type="password"
            required
            minLength={6}
            className="w-full px-3 py-2 rounded-lg border"
            style={{
              background: "var(--input-bg)",
              borderColor: "var(--input-border)",
            }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p className="text-sm" role="alert" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          data-testid="auth-submit"
          className="btn-primary w-full"
          disabled={loading}
        >
          {loading ? "澶勭悊涓€? : mode === "signup" ? "娉ㄥ唽" : "鐧诲綍"}
        </button>
        <button
          type="button"
          className="text-sm w-full"
          style={{ color: "var(--primary)" }}
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "娌℃湁璐﹀彿锛熸敞鍐? : "宸叉湁璐﹀彿锛熺櫥褰?}
        </button>
      </form>
      <p className="text-center mt-6">
        <Link
          href="/"
          className="text-sm hover:underline"
          style={{ color: "var(--text-gray)" }}
        >
          杩斿洖棣栭〉
        </Link>
      </p>
    </div>
  );
}
