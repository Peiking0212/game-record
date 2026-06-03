"use client";

import { MascotWidget } from "@/components/mascot/mascot-widget";
import { isMascotEnabled } from "@/lib/mascot-storage";
import { useEffect, useState } from "react";

export function MascotProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setEnabled(isMascotEnabled());
    setMounted(true);
  }, []);

  return (
    <>
      {children}
      {mounted && (
        <MascotWidget enabled={enabled} onEnabledChange={setEnabled} />
      )}
    </>
  );
}
