import type { Metadata } from "next";
import { Suspense } from "react";
import { GameDetailClient } from "@/components/games/game-detail-client";

type Props = {
  params: Promise<{ id: string }>;
};

/** GitHub Pages static export: placeholder route; client reads real id from the URL. */
export function generateStaticParams() {
  return [{ id: "_" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: decodeURIComponent(id) };
}

export default async function GameDetailPage({ params }: Props) {
  const { id } = await params;

  return (
    <Suspense fallback={<p className="p-8 text-center text-gray-500">加载中…</p>}>
      <GameDetailClient gameId={decodeURIComponent(id)} />
    </Suspense>
  );
}
