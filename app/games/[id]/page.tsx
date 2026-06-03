import type { Metadata } from "next";
import { GameDetailClient } from "@/components/games/game-detail-client";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ name?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: decodeURIComponent(id) };
}

export default async function GameDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { name } = await searchParams;

  return (
    <GameDetailClient
      gameId={decodeURIComponent(id)}
      gameNameQuery={name ? decodeURIComponent(name) : undefined}
    />
  );
}
