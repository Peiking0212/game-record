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
            游戏时光记录平台
          </h1>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            帮你记录游戏收藏、游玩时长、年度总结、数据统计与个人图鉴
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/games" className="btn-primary inline-flex items-center">
              <Gamepad2 className="w-5 h-5 mr-2" />
              进入游戏库
            </Link>
            <Link href="/profile" className="btn-secondary inline-flex items-center">
              <User className="w-5 h-5 mr-2" />
              个人中心
            </Link>
          </div>
        </div>
      </section>
      <HomeStats />
    </>
  );
}