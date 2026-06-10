import type { Metadata } from "next";
import { GameDetailClient } from "@/components/games/game-detail-client";

export const metadata: Metadata = { title: "游戏详情" };

export default function GameDetailPage() {
  return <GameDetailClient />;
}