import type { Metadata } from "next";
import { StatsClient } from "@/components/stats/stats-client";

export const metadata: Metadata = { title: "数据统计" };

export default function StatsPage() {
  return <StatsClient />;
}
