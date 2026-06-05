import type { Metadata } from "next";
import { ReviewsClient } from "@/components/reviews/reviews-client";

export const metadata: Metadata = { title: "娓告垙璇勬祴" };

export default function ReviewsPage() {
  return <ReviewsClient />;
}
