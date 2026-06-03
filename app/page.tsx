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
            欢迎来到我的游戏世界
          </h1>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            记录每一次冒险，分享每一份喜悦，让游戏时光成为永恒的回忆
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/games" className="btn-primary inline-flex items-center">
              <Gamepad2 className="w-5 h-5 mr-2" />
              浏览游戏收藏
            </Link>
            <Link href="/profile" className="btn-secondary inline-flex items-center">
              <User className="w-5 h-5 mr-2" />
              了解更多关于我
            </Link>
          </div>
        </div>
      </section>
      <HomeStats />
    </>
  );
}
