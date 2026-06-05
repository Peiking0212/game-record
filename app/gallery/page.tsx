import type { Metadata } from "next";
import { GalleryClient } from "@/components/gallery/gallery-client";

export const metadata: Metadata = { title: "图库页面" };

export default function GalleryPage() {
  return <GalleryClient />;
}