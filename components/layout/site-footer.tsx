export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="py-8 mt-auto" style={{ background: "var(--bg-card)" }}>
      <div className="container mx-auto px-4 text-center text-sm" style={{ color: "var(--text-gray)" }}>
        <p>漏 {year} 娓告垙璁板綍 路 璁板綍浣犵殑娓告垙鏃跺厜</p>
      </div>
    </footer>
  );
}
