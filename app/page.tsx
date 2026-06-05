import Link from "next/link";
import { Gamepad2, User } from "lucide-react";
import { HomeStats } from "@/components/home/home-stats";

export default function HomePage() {
  return (
    <>
      <section className="py-20" style={{ background: "var(--primary-light)" }} data-hero>
        <div className="container mx-auto px-4 text-center">
          <h1
            className="text-4xl md:text-5xl font-bold mb-6"
            style={{ color: "var(--text-dark)" }}
          >
            娆㈣繋鏉ュ埌鎴戠殑娓告垙涓栫晫
          </h1>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            璁板綍姣忎竴娆″啋闄╋紝鍒嗕韩姣忎竴浠藉枩鎮︼紝璁╂父鎴忔椂鍏夋垚涓烘案鎭掔殑鍥炲繂
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/games" className="btn-primary inline-flex items-center">
              <Gamepad2 className="w-5 h-5 mr-2" />
              娴忚娓告垙鏀惰棌
            </Link>
            <Link href="/profile" className="btn-secondary inline-flex items-center">
              <User className="w-5 h-5 mr-2" />
              浜嗚В鏇村鍏充簬鎴?
            </Link>
          </div>
        </div>
      </section>
      <HomeStats />
    </>
  );
}
