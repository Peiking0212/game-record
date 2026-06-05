import type { Metadata } from "next";
import { GamesClient } from "@/components/games/games-client";

export const metadata: Metadata = { title: "娓告垙鏀惰棌" };

export default function GamesPage() {
  return <GamesClient />;
}
