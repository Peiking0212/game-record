import type { Metadata } from "next";
import { AchievementsClient } from "@/components/achievements/achievements-client";

export const metadata: Metadata = { title: "成就系统" };

export default function AchievementsPage() {
  return <AchievementsClient />;
}
