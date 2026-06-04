"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, Settings, UserCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { PROFILE_SETTINGS_HASH } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/client";

function utilityNavClass(active: boolean) {
  return `nav-link utility-nav-link${active ? " active" : ""}`;
}

export function SiteAccountLinks() {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const sync = () => {
      void supabase.auth.getSession().then(({ data }) => {
        setSignedIn(!!data.session);
      });
    };
    sync();
    const { data: sub } = supabase.auth.onAuthStateChange(() => sync());
    return () => sub.subscription.unsubscribe();
  }, []);

  const authActive = pathname.startsWith("/auth");
  const settingsActive = pathname.startsWith("/profile");

  return (
    <div className="header-utilities shrink-0" aria-label="账号与设置">
      <Link
        href={signedIn ? "/profile" : "/auth"}
        className={utilityNavClass(authActive && !signedIn)}
        title={signedIn ? "查看个人简介" : "登录或注册"}
      >
        {signedIn ? (
          <UserCircle className="w-5 h-5 inline mr-1.5" />
        ) : (
          <LogIn className="w-5 h-5 inline mr-1.5" />
        )}
        {signedIn ? "账号" : "登录"}
      </Link>
      <Link
        href={`/profile#${PROFILE_SETTINGS_HASH}`}
        className={utilityNavClass(settingsActive)}
        title="个人设置"
      >
        <Settings className="w-5 h-5 inline mr-1.5" />
        设置
      </Link>
    </div>
  );
}
