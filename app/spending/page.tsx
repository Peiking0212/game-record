import type { Metadata } from "next";
import { SpendingClient } from "@/components/spending/spending-client";

export const metadata: Metadata = { title: "娑堣垂璁板綍" };

export default function SpendingPage() {
  return <SpendingClient />;
}
