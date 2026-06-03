import type { Metadata } from "next";
import { ReportClient } from "@/components/report/report-client";

export const metadata: Metadata = { title: "年度报告" };

export default function ReportPage() {
  return <ReportClient />;
}
