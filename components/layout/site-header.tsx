"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gamepad2,
  Menu,
  Moon,
  MoreHorizontal,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { SiteAccountLinks } from "@/components/layout/site-account-links";
import { MAIN_NAV, MORE_NAV } from "@/lib/navigation";
import { useTheme } from "@/components/providers/theme-provider";

function navClass(active: boolean) {
  return `nav-link${active ? " active" : ""}`;
}

export function SiteHeader() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="site-header sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between gap-3 py-3">
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div
              className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center border transition-transform group-hover:-translate-y-0.5"
              style={{
                background: "var(--primary)",
                borderColor: "var(--border-ui-emphasis)",
                boxShadow: "var(--shadow-brutal)",
              }}
            >
              <Gamepad2 className="w-5 h-5" style={{ color: "var(--text-dark)" }} />
            </div>
            <span
              className="text-xl font-bold tracking-tight hidden sm:inline"
              style={{ color: "var(--text-dark)" }}
            >
              游戏记录
            </span>
          </Link>

          <div className="desktop-nav items-center gap-1 min-w-0 flex-1 justify-end">
            <div className="flex items-center gap-0.5 overflow-x-auto max-w-[min(100%,52rem)] nav-scroll-hide">
              {MAIN_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${navClass(isActive(item.href))} whitespace-nowrap`}
                  >
                    <Icon className="w-4 h-4 inline mr-1.5" />
                    {item.label}
                  </Link>
                );
              })}
              <div className="relative shrink-0" id="nav-more-wrap">
                <button
                  type="button"
                  className={`nav-link whitespace-nowrap${moreOpen ? " active" : ""}`}
                  onClick={() => setMoreOpen((v) => !v)}
                  aria-expanded={moreOpen}
                >
                  <MoreHorizontal className="w-4 h-4 inline mr-1.5" />
                  更多
                </button>
                {moreOpen && (
                  <div
                    id="nav-more-menu"
                    className="absolute top-full right-0 mt-2 rounded-[var(--radius-card)] p-2 min-w-[180px] z-60 game-surface"
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
                            borderRadius: "var(--radius-pill)",
                            whiteSpace: "nowrap",
                            width: "100%",
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
            </div>

            <div
              className="header-utilities-wrap flex items-center gap-1 shrink-0 pl-2 ml-1"
              style={{ borderLeft: "1px solid var(--border-ui)" }}
            >
              <SiteAccountLinks />
              <button
                type="button"
                className="nav-link"
                onClick={toggleTheme}
                title={theme === "dark" ? "浅色模式" : "深色模式"}
                aria-label={theme === "dark" ? "浅色模式" : "深色模式"}
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="button"
            className="mobile-nav nav-link !px-3 shrink-0"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="菜单"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>

        {mobileOpen && (
          <div className="mobile-menu is-open pb-3">
            <div className="flex flex-col gap-2 game-surface p-3">
              {[...MAIN_NAV, ...MORE_NAV].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-link w-full${isActive(item.href) ? " active" : ""}`}
                  >
                    <Icon className="w-4 h-4 inline mr-2" />
                    {item.label}
                  </Link>
                );
              })}
              <div
                className="pt-2 mt-1 flex flex-col gap-2"
                style={{ borderTop: "1px solid var(--border-ui)" }}
              >
                <SiteAccountLinks />
              </div>
              <button
                type="button"
                className="nav-link w-full text-left"
                onClick={toggleTheme}
              >
                {theme === "dark" ? "浅色模式" : "深色模式"}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
