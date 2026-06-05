import Link from "next/link";
import { Construction } from "lucide-react";

type Props = {
  title: string;
  description?: string;
};

export function MigrationPlaceholder({ title, description }: Props) {
  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
      <Construction
        className="w-16 h-16 mx-auto mb-6"
        style={{ color: "var(--primary)" }}
      />
      <h1 className="text-3xl font-bold mb-4 gradient-text">{title}</h1>
      <p className="mb-6" style={{ color: "var(--text-gray)" }}>
        {description ??
          "该页面已从旧版HTML迁移至Next.js，功能正在逐步对接。可参考 legacy/ 目录内的原有实现。"}
      </p>
      <Link href="/" className="btn-primary inline-flex items-center">
        返回首页
      </Link>
    </div>
  );
}