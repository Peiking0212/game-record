export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="py-8 mt-auto" style={{ background: "var(--bg-card)" }}>
      <div className="container mx-auto px-4 text-center text-sm" style={{ color: "var(--text-gray)" }}>
        <p>© {year} 我的游戏收藏 | 记录每一段游戏时光</p>
      </div>
    </footer>
  );
}