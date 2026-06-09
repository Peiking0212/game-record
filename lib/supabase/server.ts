import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options?: CookieOptions };
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

// 全局 Cookie 默认配置（统一全站 Supabase Cookie 策略）
const DEFAULT_COOKIE_OPTIONS: CookieOptions = {
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
};

/**
 * 创建 Next.js 服务端 Supabase 客户端（App Router）
 * 适用于：服务组件 / 服务端 Action / Route Handler
 */
export async function createClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 严格校验环境变量
  if (!supabaseUrl) throw new Error("缺少环境变量 NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseAnonKey) throw new Error("缺少环境变量 NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            // 合并默认配置 + 动态配置
            cookieStore.set(name, value, { ...DEFAULT_COOKIE_OPTIONS, ...options });
          });
        } catch {
          /**
           * Next.js 限制：Server Component 无法执行 cookie.set
           * 会话刷新、Token 续期统一交由 middleware.ts 处理
           */
        }
      },
    },
  });
}