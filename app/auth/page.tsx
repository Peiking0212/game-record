import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = {
  title: "鐧诲綍",
};

export default function AuthPage() {
  return (
    <Suspense fallback={<p className="text-center py-16">鍔犺浇涓€?/p>}>
      <AuthForm />
    </Suspense>
  );
}
