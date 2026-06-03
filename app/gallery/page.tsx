import type { Metadata } from "next";
import { GalleryClient } from "@/components/gallery/gallery-client";

export const metadata: Metadata = { title: "媒体库" };

export default function GalleryPage() {
  return <GalleryClient />;
}
