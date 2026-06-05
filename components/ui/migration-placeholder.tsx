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
          "姝ら〉闈㈠凡浠庢棫鐗?HTML 杩佸埌 Next.js锛屽姛鑳芥鍦ㄩ€愭瀵规帴銆傚彲鍙傝€?legacy/ 鐩綍涓殑鍘熷疄鐜般€?}
      </p>
      <Link href="/" className="btn-primary inline-flex items-center">
        杩斿洖棣栭〉
      </Link>
    </div>
  );
}
