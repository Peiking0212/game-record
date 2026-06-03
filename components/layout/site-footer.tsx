export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="py-8 mt-auto" style={{ background: "var(--bg-card)" }}>
      <div className="container mx-auto px-4 text-center text-sm" style={{ color: "var(--text-gray)" }}>
        <p>© {year} 游戏记录 · 记录你的游戏时光</p>
      </div>
    </footer>
  );
}
