import type { Metadata } from "next";
import { GamesClient } from "@/components/games/games-client";

export const metadata: Metadata = { title: "游戏收藏" };

export default function GamesPage() {
  return <GamesClient />;
}
