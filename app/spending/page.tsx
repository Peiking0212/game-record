import type { Metadata } from "next";
import { SpendingClient } from "@/components/spending/spending-client";

export const metadata: Metadata = { title: "消费记录" };

export default function SpendingPage() {
  return <SpendingClient />;
}
