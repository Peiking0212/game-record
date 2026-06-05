import type { Metadata } from "next";
import { AchievementsClient } from "@/components/achievements/achievements-client";

export const metadata: Metadata = { title: "鎴愬氨绯荤粺" };

export default function AchievementsPage() {
  return <AchievementsClient />;
}
