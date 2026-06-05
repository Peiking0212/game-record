import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MascotProvider } from "@/components/providers/mascot-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "娓告垙璁板綍",
    template: "%s 路 娓告垙璁板綍",
  },
  description:
    "璁板綍娓告垙鏃跺厜锛氭父鎴忔敹钘忋€佹垚灏便€佹暟鎹粺璁′笌濯掍綋搴撱€?,
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
      <body className="min-h-screen flex flex-col">
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
