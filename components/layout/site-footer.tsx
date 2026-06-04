export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer
      className="py-8 mt-auto border-t"
      style={{
        background: "var(--bg-white)",
        borderColor: "var(--border-ui)",
      }}
    >
      <div className="container mx-auto px-4 text-center">
        <p className="font-mono text-sm" style={{ color: "var(--text-gray)" }}>
          © {year} 游戏记录 · 记录你的游戏时光
        </p>
      </div>
    </footer>
  );
}
