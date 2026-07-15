"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { tryCreateClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export function AuthForm() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return") || "/";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const target = returnTo.startsWith("/") ? returnTo : "/";

  useEffect(() => {
    let active = true;
    const supabase = tryCreateClient();
    if (!supabase) {
      setChecking(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const user = data.session?.user ?? null;
      setCurrentUser(user);
      setChecking(false);
      if (user) {
        window.setTimeout(() => {
          window.location.replace(target);
        }, 800);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setCurrentUser(session?.user ?? null);
      if (session?.user) {
        window.setTimeout(() => {
          window.location.replace(target);
        }, 250);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [target]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = tryCreateClient();
    if (!supabase) {
      setError("无法读取Supabase配置，请在.env.local配置NEXT_PUBLIC_SUPABASE_相关环境变量");
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
      window.location.replace(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录请求异常");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <h1 className="text-3xl font-bold text-center mb-8 gradient-text">账号登录</h1>
      {checking && (
        <div className="glass-card-strong p-4 mb-4 text-center">
          <p className="text-sm" style={{ color: "var(--text-gray)" }}>正在检查登录状态…</p>
        </div>
      )}
      {currentUser && (
        <div className="glass-card-strong p-4 mb-4 text-center">
          <p className="text-sm font-semibold" style={{ color: "var(--text-dark)" }}>
            已登录：{currentUser.email ?? "当前账号"}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-gray)" }}>
            即将进入首页。
          </p>
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4 glass-card-strong p-6">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="email" style={{ color: "var(--text-gray)" }}>
            邮箱
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
          <label className="block text-sm font-medium mb-1" htmlFor="password" style={{ color: "var(--text-gray)" }}>
            密码
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
          {loading ? "提交中…" : mode === "signup" ? "注册账号" : "登录"}
        </button>
        <button
          type="button"
          className="text-sm w-full"
          style={{ color: "var(--primary)" }}
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "没有账号？去注册" : "已有账号？去登录"}
        </button>
      </form>
      <p className="text-center mt-6">
        <Link
          href="/"
          className="text-sm hover:underline"
          style={{ color: "var(--text-gray)" }}
        >
          返回首页
        </Link>
      </p>
    </div>
  );
}
