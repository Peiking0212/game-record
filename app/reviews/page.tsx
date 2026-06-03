import type { Metadata } from "next";
import { ReviewsClient } from "@/components/reviews/reviews-client";

export const metadata: Metadata = { title: "游戏评测" };

export default function ReviewsPage() {
  return <ReviewsClient />;
}
