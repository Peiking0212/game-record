"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Gamepad2,
  LogIn,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  Settings,
  Sun,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { MAIN_NAV, MORE_NAV } from "@/lib/navigation";
import { useTheme } from "@/components/providers/theme-provider";
import { tryCreateClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

function navClass(active: boolean) {
  return `nav-link${active ? " active" : ""}`;
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    const supabase = tryCreateClient();
    if (!supabase) { setAuthLoaded(true); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSupabaseUser(data.session?.user ?? null);
      setAuthLoaded(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null);
    });
    return () => listener?.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = tryCreateClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    setSupabaseUser(null);
    router.push("/");
    router.refresh();
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="bg-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between py-4">
          <Link href="/" className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center"
              style={{ background: "var(--primary)" }}
            >
              <Gamepad2 className="text-white w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--primary)" }}>
              游戏记录
            </h1>
          </Link>

          <div className="desktop-nav items-center space-x-3">
            {MAIN_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={navClass(isActive(item.href))}
                >
                  <Icon className="w-5 h-5 inline mr-2" />
                  {item.label}
                </Link>
              );
            })}
            <div className="relative" id="nav-more-wrap">
              <button
                type="button"
                className="nav-link"
                onClick={() => setMoreOpen((v) => !v)}
                aria-expanded={moreOpen}
              >
                <MoreHorizontal className="w-5 h-5 inline mr-2" />
                更多
              </button>
              {moreOpen && (
                <div
                  id="nav-more-menu"
                  className="absolute top-full right-0 rounded-xl p-2 min-w-[160px] z-60"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-light)",
                    boxShadow: "0 8px 24px var(--shadow-color)",
                  }}
                >
                  {MORE_NAV.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={navClass(isActive(item.href))}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "0.5rem 1rem",
                          borderRadius: "0.5rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <Icon className="w-4 h-4 inline mr-2" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
            <button
              type="button"
              className="nav-link"
              onClick={toggleTheme}
              title={theme === "dark" ? "浅色模式" : "深色模式"}
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
            {authLoaded && (
              <>
                {supabaseUser ? (
                  <>
                    <Link
                      href="/profile"
                      className="nav-link"
                      title={supabaseUser.email || "个人主页"}
                    >
                      <User className="w-5 h-5" />
                    </Link>
                    <Link href="/settings" className="nav-link" title="设置">
                      <Settings className="w-5 h-5" />
                    </Link>
                    <button
                      type="button"
                      className="nav-link"
                      onClick={handleLogout}
                      title="退出登录"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <Link href="/auth" className="nav-link" title="登录">
                    <LogIn className="w-5 h-5" />
                  </Link>
                )}
              </>
            )}
          </div>

          <button
            type="button"
            className="mobile-nav text-gray-700 hover:text-blue-500"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="菜单"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>

        {mobileOpen && (
          <div className="mobile-menu is-open pb-2">
            <div className="flex flex-col space-y-2">
              {[...MAIN_NAV, ...MORE_NAV].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-link py-2 px-4 rounded-lg${isActive(item.href) ? " active" : ""}`}
                  >
                    <Icon className="w-4 h-4 inline mr-2" />
                    {item.label}
                  </Link>
                );
              })}
              <button
                type="button"
                className="nav-link py-2 px-4 rounded-lg text-left"
                onClick={toggleTheme}
              >
                {theme === "dark" ? "浅色模式" : "深色模式"}
              </button>
              {authLoaded && (
                <div className="border-t border-gray-100 pt-2 mt-2">
                  {supabaseUser ? (
                    <>
                      <Link
                        href="/profile"
                        className="nav-link py-2 px-4 rounded-lg flex items-center"
                      >
                        <User className="w-4 h-4 mr-2" />
                        个人主页
                      </Link>
                      <Link
                        href="/settings"
                        className="nav-link py-2 px-4 rounded-lg flex items-center"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        设置
                      </Link>
                      <button
                        type="button"
                        className="nav-link py-2 px-4 rounded-lg text-left w-full flex items-center"
                        onClick={handleLogout}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        退出登录
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/auth"
                      className="nav-link py-2 px-4 rounded-lg flex items-center"
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      登录
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}