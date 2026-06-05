import type { Metadata } from "next";
import { ReportClient } from "@/components/report/report-client";

export const metadata: Metadata = { title: "骞村害鎶ュ憡" };

export default function ReportPage() {
  return <ReportClient />;
}
