import type { Metadata } from "next";
import { ProfileClient } from "@/components/profile/profile-client";

export const metadata: Metadata = { title: "个人简介" };

export default function ProfilePage() {
  return <ProfileClient />;
}