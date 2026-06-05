import type { Metadata } from "next";
import { WishlistClient } from "@/components/wishlist/wishlist-client";

export const metadata: Metadata = { title: "游戏愿望帖" };

export default function WishlistPage() {
  return <WishlistClient />;
}
