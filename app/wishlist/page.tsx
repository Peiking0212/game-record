import type { Metadata } from "next";
import { WishlistClient } from "@/components/wishlist/wishlist-client";

export const metadata: Metadata = { title: "娓告垙鎰挎湜鍗? };

export default function WishlistPage() {
  return <WishlistClient />;
}
