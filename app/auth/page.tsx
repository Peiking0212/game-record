import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = {
  title: "登录",
};

export default function AuthPage() {
  return (
    <Suspense fallback={<p className="text-center py-16">加载中…</p>}>
      <AuthForm />
    </Suspense>
  );
}
