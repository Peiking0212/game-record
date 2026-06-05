import type { Metadata } from "next";
import { StatsClient } from "@/components/stats/stats-client";

export const metadata: Metadata = { title: "鏁版嵁缁熻" };

export default function StatsPage() {
  return <StatsClient />;
}
