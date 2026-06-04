import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MascotProvider } from "@/components/providers/mascot-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "游戏记录",
    template: "%s · 游戏记录",
  },
  description:
    "记录游戏时光：游戏收藏、成就、数据统计与媒体库。",
  icons: {
    icon: "/assets/favicon.svg",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col font-display antialiased">
        <ThemeProvider>
          <ToastProvider>
            <MascotProvider>
              <SiteHeader />
              <main className="flex-1">{children}</main>
              <SiteFooter />
            </MascotProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
