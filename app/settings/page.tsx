"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { getDealWatchRules, saveDealWatchRules } from "@/lib/wishlist";
import { getGames, saveGames } from "@/lib/game-data";
import { tryCreateClient } from "@/lib/supabase/client";
import { refreshBackground, useTheme } from "@/components/providers/theme-provider";

type Tab = "appearance" | "background" | "mascot" | "wishlist" | "data" | "account";

const TABS: { id: Tab; label: string }[] = [
  { id: "appearance", label: "外观" },
  { id: "background", label: "背景" },
  { id: "mascot", label: "看板娘" },
  { id: "wishlist", label: "愿望单" },
  { id: "data", label: "数据" },
  { id: "account", label: "账户" },
];

// 外观设置
function AppearanceTab() {
  const { showToast } = useToast();
  const { theme, setTheme } = useTheme();
  const [cardStyle, setCardStyle] = useState(() => {
    try {
      const stored = localStorage.getItem("game_record_theme");
      return stored ? JSON.parse(stored).cardStyle || "default" : "default";
    } catch { return "default"; }
  });
  const [animSpeed, setAnimSpeed] = useState(() => {
    try {
      const stored = localStorage.getItem("game_record_theme");
      return stored ? JSON.parse(stored).animSpeed || "normal" : "normal";
    } catch { return "normal"; }
  });
  const [hoverEffect, setHoverEffect] = useState(() => {
    try {
      const stored = localStorage.getItem("game_record_theme");
      return stored ? JSON.parse(stored).hoverEffect || "lift" : "lift";
    } catch { return "lift"; }
  });

  function saveSettings(s: Record<string, string>) {
    try {
      const stored = localStorage.getItem("game_record_theme");
      const current = stored ? JSON.parse(stored) : {};
      const updated = { ...current, ...s };
      localStorage.setItem("game_record_theme", JSON.stringify(updated));
      showToast("设置已保存", "success");
    } catch {
      showToast("保存失败", "error");
    }
  }

  return (
    <div className="space-y-6">
      {/* 主题模式 */}
      <section className="glass-card-strong p-5">
        <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text-dark)" }}>主题模式</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: "light", label: "浅色", desc: "明亮清爽" },
            { value: "dark", label: "深色", desc: "护眼舒适" },
            { value: "system", label: "跟随系统", desc: "自动切换" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setTheme(opt.value === "system"
                  ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
                  : (opt.value as "light" | "dark"));
                showToast("主题已切换", "success");
              }}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                theme === opt.value
                  ? "border-purple-400 bg-purple-50/30 text-purple-700"
                  : "border-gray-200/30 hover:border-gray-300/50 text-gray-600"
              }`}
              style={theme === opt.value ? { color: "var(--primary)", borderColor: "var(--primary)" } : { color: "var(--text-gray)" }}
            >
              <div className="font-medium text-sm">{opt.label}</div>
              <div className="text-xs mt-1 opacity-70">{opt.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* 卡片样式 */}
      <section className="glass-card-strong p-5">
        <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text-dark)" }}>卡片样式</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: "default", label: "默认" },
            { value: "minimal", label: "简约" },
            { value: "rounded", label: "圆角" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setCardStyle(opt.value); saveSettings({ cardStyle: opt.value }); }}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                cardStyle === opt.value
                  ? "border-purple-400 bg-purple-50/30"
                  : "border-gray-200/30 hover:border-gray-300/50"
              }`}
              style={cardStyle === opt.value ? { color: "var(--primary)", borderColor: "var(--primary)" } : { color: "var(--text-gray)" }}
            >
              <div className="font-medium text-sm">{opt.label}</div>
            </button>
          ))}
        </div>
      </section>

      {/* 动画速度 */}
      <section className="glass-card-strong p-5">
        <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text-dark)" }}>动画速度</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: "slow", label: "缓慢" },
            { value: "normal", label: "正常" },
            { value: "fast", label: "快速" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setAnimSpeed(opt.value); saveSettings({ animSpeed: opt.value }); }}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                animSpeed === opt.value
                  ? "border-purple-400 bg-purple-50/30"
                  : "border-gray-200/30 hover:border-gray-300/50"
              }`}
              style={animSpeed === opt.value ? { color: "var(--primary)", borderColor: "var(--primary)" } : { color: "var(--text-gray)" }}
            >
              <div className="font-medium text-sm">{opt.label}</div>
            </button>
          ))}
        </div>
      </section>

      {/* 悬浮动效 */}
      <section className="glass-card-strong p-5">
        <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text-dark)" }}>悬浮动效</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: "subtle", label: "细微" },
            { value: "lift", label: "抬起" },
            { value: "glow", label: "发光" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setHoverEffect(opt.value); saveSettings({ hoverEffect: opt.value }); }}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                hoverEffect === opt.value
                  ? "border-purple-400 bg-purple-50/30"
                  : "border-gray-200/30 hover:border-gray-300/50"
              }`}
              style={hoverEffect === opt.value ? { color: "var(--primary)", borderColor: "var(--primary)" } : { color: "var(--text-gray)" }}
            >
              <div className="font-medium text-sm">{opt.label}</div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

// 背景设置
function BackgroundTab() {
  const { showToast } = useToast();
  const [heroBg, setHeroBg] = useState(() => {
    try {
      const s = localStorage.getItem("game_record_theme");
      return s ? JSON.parse(s).heroBg || "" : "";
    } catch { return ""; }
  });
  const [autoTimeBg, setAutoTimeBg] = useState(() =>
    localStorage.getItem("auto_time_bg") === "true"
  );
  const [videoBg, setVideoBg] = useState(() =>
    localStorage.getItem("site_video_bg") || ""
  );

  function handleHeroBgChange(val: string) {
    setHeroBg(val);
    try {
      const s = localStorage.getItem("game_record_theme");
      const cur = s ? JSON.parse(s) : {};
      localStorage.setItem("game_record_theme", JSON.stringify({ ...cur, heroBg: val }));
      refreshBackground();
      showToast("Hero 背景已保存", "success");
    } catch { showToast("保存失败", "error"); }
  }

  function handleAutoTimeBg(val: boolean) {
    setAutoTimeBg(val);
    localStorage.setItem("auto_time_bg", String(val));
    refreshBackground();
    showToast(`自动时间背景已${val ? "开启" : "关闭"}`, "success");
  }

  function handleVideoBg(val: string) {
    setVideoBg(val);
    localStorage.setItem("site_video_bg", val);
    refreshBackground();
    showToast("视频背景已保存", "success");
  }

  // 预设背景：支持纯色、渐变色、图片 URL
  const presets: { label: string; bg: string }[] = [
    { label: "深邃太空", bg: "#1e1b4b" },
    { label: "午夜蓝调", bg: "#1e3a5f" },
    { label: "森林之夜", bg: "#14532d" },
    { label: "优雅深紫", bg: "#4c1d95" },
    { label: "暖阳日落", bg: "linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)" },
    { label: "极光之舞", bg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
    { label: "海洋之风", bg: "linear-gradient(135deg, #0077b6 0%, #00b4d8 100%)" },
    { label: "清新薄荷", bg: "linear-gradient(135deg, #c7f9cc 0%, #a8e6cf 100%)" },
  ];

  function handleImageUpload(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("图片过大，请上传 5MB 以内的图片", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setHeroBg(dataUrl);
      handleHeroBgChange(dataUrl);
      showToast("背景图片已上传", "success");
    };
    reader.onerror = () => showToast("图片读取失败", "error");
    reader.readAsDataURL(file);
  }

  function clearBackground() {
    setHeroBg("");
    handleHeroBgChange("");
  }

  return (
    <div className="space-y-6">
      {/* Hero 背景 */}
      <section className="glass-card-strong p-5">
        <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text-dark)" }}>Hero 区域背景</h3>
        <p className="text-xs mb-3" style={{ color: "var(--text-light)" }}>
          支持：纯色、渐变、图片 URL，或上传本地图片
        </p>

        {/* 本地上传 */}
        <div className="mb-3">
          <label className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed cursor-pointer transition-all hover:border-purple-400 hover:bg-purple-50/10"
            style={{ borderColor: "var(--border-glass)" }}
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageUpload(e.target.files?.[0])}
            />
            <svg className="w-5 h-5" style={{ color: "var(--primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm" style={{ color: "var(--text-gray)" }}>点击上传本地图片（最大 5MB）</span>
          </label>
        </div>

        {/* 图片预览 */}
        {heroBg && heroBg.startsWith("data:image") && (
          <div className="mb-3 relative rounded-lg overflow-hidden" style={{ height: "120px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroBg} alt="背景预览" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <span className="absolute bottom-2 left-2 text-xs text-white/80">本地图片预览</span>
          </div>
        )}

        <input
          type="text"
          value={heroBg.startsWith("data:image") ? "[本地图片已上传]" : heroBg}
          onChange={(e) => setHeroBg(e.target.value)}
          placeholder="例如：#1e1b4b 或 linear-gradient(...) 或 https://..."
          className="w-full px-3 py-2 rounded-lg text-sm mb-3 focus:ring-2 focus:border-transparent"
          style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleHeroBgChange(heroBg)}
            className="btn-primary px-4 py-1.5 rounded-lg text-sm"
          >
            保存
          </button>
          <button
            type="button"
            onClick={clearBackground}
            className="btn-secondary px-4 py-1.5 rounded-lg text-sm"
          >
            恢复默认
          </button>
        </div>
        <div className="mt-4">
          <p className="text-xs mb-2" style={{ color: "var(--text-light)" }}>快速预设（点击即生效）</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {presets.map((p) => {
              const isSelected = heroBg === p.bg;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => { setHeroBg(p.bg); handleHeroBgChange(p.bg); }}
                  className={`h-16 rounded-lg overflow-hidden transition-all flex items-center justify-center text-white text-sm font-semibold shadow-sm hover:shadow-md ${
                    isSelected
                      ? "ring-2 ring-purple-400 ring-offset-2"
                      : "border-2 border-transparent hover:border-gray-300"
                  }`}
                  style={{ background: p.bg, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 自动时间背景 */}
      <section className="glass-card-strong p-5">
        <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text-dark)" }}>自动时间背景</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={autoTimeBg}
            onChange={(e) => handleAutoTimeBg(e.target.checked)}
            className="w-4 h-4 accent-purple-500"
          />
          <span className="text-sm" style={{ color: "var(--text-gray)" }}>根据时间和季节自动切换背景</span>
        </label>
        <p className="text-xs mt-2" style={{ color: "var(--text-light)" }}>
          开启后，背景会根据早晨、上午、下午、黄昏、夜间及春夏秋冬自动变化
        </p>
      </section>

      {/* 视频背景 */}
      <section className="glass-card-strong p-5">
        <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text-dark)" }}>视频背景</h3>
        <input
          type="text"
          value={videoBg}
          onChange={(e) => setVideoBg(e.target.value)}
          placeholder="输入视频 URL（mp4/webm，需支持 CORS）"
          className="w-full px-3 py-2 rounded-lg text-sm mb-3 focus:ring-2 focus:border-transparent"
          style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
        />
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => handleVideoBg(videoBg)}
            className="btn-primary px-4 py-1.5 rounded-lg text-sm"
          >
            保存
          </button>
          <button
            type="button"
            onClick={() => handleVideoBg("")}
            className="btn-secondary px-4 py-1.5 rounded-lg text-sm"
          >
            清除
          </button>
        </div>
        <p className="text-xs mb-2" style={{ color: "var(--text-light)" }}>快速测试视频（点击即生效）：</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          {[
            { label: "🎬 海洋波浪", url: "https://cdn.pixabay.com/video/2023/09/04/179922-859609392_tiny.mp4" },
            { label: "🌊 海浪浪花", url: "https://cdn.pixabay.com/video/2020/05/25/39721-422954217_tiny.mp4" },
            { label: "📺 B站示例视频", url: "https://www.bilibili.com/video/BV1x7oNBvEZs/" },
          ].map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => { setVideoBg(p.url); handleVideoBg(p.url); }}
              className={`text-left px-3 py-2 rounded-lg text-xs transition-colors border ${
                videoBg === p.url
                  ? "border-purple-400"
                  : "border-gray-200/30 hover:border-gray-300/50"
              }`}
              style={videoBg === p.url ? { color: "var(--primary)", background: "var(--primary-light)" } : { color: "var(--text-gray)", background: "var(--bg-glass)" }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="text-xs" style={{ color: "var(--text-light)" }}>
          💡 支持 MP4/WebM 视频链接，或 B站视频链接（如 https://www.bilibili.com/video/BV1x7oNBvEZs/）
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--text-light)" }}>
          视频背景显示在页面顶部 Hero 区域，自动循环静音播放
        </p>
      </section>
    </div>
  );
}

// 看板娘设置
function MascotTab() {
  const { showToast } = useToast();
  const [enabled, setEnabled] = useState(() =>
    localStorage.getItem("mascot_enabled") !== "false"
  );
  const [quotes, setQuotes] = useState(() => {
    try {
      const raw = localStorage.getItem("mascot_quotes");
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) && parsed.length > 0
        ? parsed.join("\n")
        : "欢迎回来，今天玩什么游戏呀~\n记得休息一下眼睛哦~\n新游戏发售啦，快来看看！";
    } catch {
      return "欢迎回来，今天玩什么游戏呀~\n记得休息一下眼睛哦~\n新游戏发售啦，快来看看！";
    }
  });
  const [customImage, setCustomImage] = useState(
    localStorage.getItem("mascot_image") || ""
  );

  function handleEnabled(val: boolean) {
    setEnabled(val);
    localStorage.setItem("mascot_enabled", String(val));
    showToast(`看板娘已${val ? "开启" : "关闭"}`, "success");
  }

  function handleQuotes(val: string) {
    setQuotes(val);
  }

  function handleSaveQuotes() {
    const arr = quotes.split("\n").filter((q) => q.trim());
    localStorage.setItem("mascot_quotes", JSON.stringify(arr));
    showToast("看板娘台词已保存", "success");
  }

  function handleCustomImage(val: string) {
    setCustomImage(val);
    localStorage.setItem("mascot_image", val);
    showToast("看板娘图片已保存", "success");
  }

  return (
    <div className="space-y-6">
      <section className="glass-card-strong p-5">
        <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text-dark)" }}>看板娘开关</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => handleEnabled(e.target.checked)}
            className="w-4 h-4 accent-purple-500"
          />
          <span className="text-sm" style={{ color: "var(--text-gray)" }}>在页面右下角显示看板娘</span>
        </label>
      </section>

      <section className="glass-card-strong p-5">
        <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text-dark)" }}>自定义台词</h3>
        <p className="text-xs mb-2" style={{ color: "var(--text-light)" }}>每行一句，随机显示</p>
        <textarea
          value={quotes}
          onChange={(e) => handleQuotes(e.target.value)}
          className="w-full h-32 p-3 rounded-lg text-sm font-mono resize-y focus:ring-2 focus:border-transparent"
          style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
          placeholder="欢迎回来，今天玩什么游戏呀~"
        />
        <button
          type="button"
          onClick={handleSaveQuotes}
          className="mt-2 btn-primary px-4 py-1.5 rounded-lg text-sm"
        >
          保存台词
        </button>
      </section>

      <section className="glass-card-strong p-5">
        <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text-dark)" }}>自定义图片</h3>
        <input
          type="text"
          value={customImage}
          onChange={(e) => setCustomImage(e.target.value)}
          placeholder="输入图片 URL（留空使用默认）"
          className="w-full px-3 py-2 rounded-lg text-sm mb-3 focus:ring-2 focus:border-transparent"
          style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
        />
        <button
          type="button"
          onClick={() => handleCustomImage(customImage)}
          className="btn-primary px-4 py-1.5 rounded-lg text-sm"
        >
          保存
        </button>
      </section>
    </div>
  );
}

// 愿望单设置
function WishlistTab() {
  const { showToast } = useToast();
  const [rules, setRules] = useState(getDealWatchRules);
  const [appIdMap, setAppIdMap] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem("game_alias_map");
      return raw ? (JSON.parse(raw) as Record<string, number>) : {};
    } catch { return {}; }
  });
  const [appIdInput, setAppIdInput] = useState("");

  function updateRules(s: Record<string, unknown>) {
    const updated = { ...rules, ...s };
    saveDealWatchRules(updated);
    setRules(updated);
    showToast("愿望单设置已保存", "success");
  }

  function handleAddMapping() {
    const parts = appIdInput.split("->").map((s) => s.trim());
    if (parts.length === 2 && parts[1] && !isNaN(Number(parts[1]))) {
      const updated = { ...appIdMap, [parts[0]]: Number(parts[1]) };
      setAppIdMap(updated);
      localStorage.setItem("game_alias_map", JSON.stringify(updated));
      setAppIdInput("");
      showToast(`已添加：${parts[0]} → Steam App ID ${parts[1]}`, "success");
    } else {
      showToast("格式错误，正确格式：游戏名 -> Steam App ID", "error");
    }
  }

  return (
    <div className="space-y-6">
      {/* 价格提醒总开关 */}
      <section className="glass-card-strong p-5">
        <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text-dark)" }}>价格提醒</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={rules.enabled !== false}
            onChange={(e) => updateRules({ enabled: e.target.checked })}
            className="w-4 h-4 accent-purple-500"
          />
          <span className="text-sm" style={{ color: "var(--text-gray)" }}>开启愿望单价格监控提醒</span>
        </label>
      </section>

      {/* 折扣规则 */}
      <section className="glass-card-strong p-5">
        <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text-dark)" }}>折扣规则</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: "var(--text-gray)" }}>最低折扣百分比（1-95%）</label>
            <input
              type="number"
              min={1}
              max={95}
              value={rules.minDiscountPercent || 30}
              onChange={(e) => updateRules({ minDiscountPercent: Number(e.target.value) })}
              className="w-32 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:border-transparent"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: "var(--text-gray)" }}>偏好平台（逗号分隔）</label>
            <input
              type="text"
              value={(rules.preferredPlatforms as string[])?.join(", ") || ""}
              onChange={(e) => updateRules({
                preferredPlatforms: e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
              })}
              placeholder="Steam, GOG, Epic"
              className="w-full px-3 py-2 rounded-lg text-sm focus:ring-2 focus:border-transparent"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={rules.notifyOnlyNewLows === true}
              onChange={(e) => updateRules({ notifyOnlyNewLows: e.target.checked })}
              className="w-4 h-4 accent-purple-500"
            />
            <span className="text-sm" style={{ color: "var(--text-gray)" }}>仅通知新史低价格</span>
          </label>
        </div>
      </section>

      {/* 游戏别名映射 */}
      <section className="glass-card-strong p-5">
        <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text-dark)" }}>游戏别名 → Steam App ID</h3>
        <p className="text-xs mb-2" style={{ color: "var(--text-light)" }}>格式：游戏名 → Steam App ID</p>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={appIdInput}
            onChange={(e) => setAppIdInput(e.target.value)}
            placeholder="星露谷物语 -> 413150"
            className="flex-1 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:border-transparent"
            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
            onKeyDown={(e) => e.key === "Enter" && handleAddMapping()}
          />
          <button
            type="button"
            onClick={handleAddMapping}
            className="btn-primary px-4 py-2 rounded-lg text-sm"
          >
            添加
          </button>
        </div>
        {Object.keys(appIdMap).length > 0 && (
          <div className="space-y-1">
            {Object.entries(appIdMap).map(([name, id]) => (
              <div key={name} className="flex items-center justify-between text-sm px-3 py-1.5 rounded" style={{ color: "var(--text-gray)", background: "var(--bg-glass)" }}>
                <span>{name}</span>
                <span className="font-mono text-xs">Steam ID: {id}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// 数据管理
function DataTab() {
  const { showToast } = useToast();
  const [gameData, setGameData] = useState(() => {
    try { return JSON.stringify(getGames(), null, 2); } catch { return "[]"; }
  });
  const [achievementsData, setAchievementsData] = useState(() => {
    try {
      const raw = localStorage.getItem("achievements");
      return raw ? JSON.stringify(JSON.parse(raw), null, 2) : "[]";
    } catch { return "[]"; }
  });
  const [wishlistData, setWishlistData] = useState(() => {
    try {
      const raw = localStorage.getItem("game_record_wishlist");
      return raw ? JSON.stringify(JSON.parse(raw), null, 2) : "[]";
    } catch { return "[]"; }
  });
  const [dataError, setDataError] = useState("");

  function handleDataChange(setter: (v: string) => void, validator?: (v: string) => boolean) {
    return (val: string) => {
      setter(val);
      if (validator && !validator(val)) setDataError("JSON 格式错误");
      else setDataError("");
    };
  }

  function handleSave(key: string, data: string, label: string) {
    if (dataError) { showToast("请先修正 JSON 格式", "error"); return; }
    try {
      const parsed = JSON.parse(data);
      if (key === "games") saveGames(parsed);
      else localStorage.setItem(key, JSON.stringify(parsed));
      showToast(`${label}已保存`, "success");
    } catch {
      showToast("保存失败，数据格式有误", "error");
    }
  }

  function handleExport() {
    const allData = {
      games: getGames(),
      achievements: JSON.parse(localStorage.getItem("achievements") || "[]"),
      wishlist: JSON.parse(localStorage.getItem("game_record_wishlist") || "[]"),
      theme: JSON.parse(localStorage.getItem("game_record_theme") || "{}"),
      profile: JSON.parse(localStorage.getItem("profile") || "{}"),
    };
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `game-record-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("数据已导出", "success");
  }

  function handleImport(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.games) { saveGames(data.games); setGameData(JSON.stringify(data.games, null, 2)); }
        if (data.achievements) { localStorage.setItem("achievements", JSON.stringify(data.achievements)); setAchievementsData(JSON.stringify(data.achievements, null, 2)); }
        if (data.wishlist) { localStorage.setItem("game_record_wishlist", JSON.stringify(data.wishlist)); setWishlistData(JSON.stringify(data.wishlist, null, 2)); }
        if (data.theme) localStorage.setItem("game_record_theme", JSON.stringify(data.theme));
        if (data.profile) localStorage.setItem("profile", JSON.stringify(data.profile));
        showToast("数据已导入，请刷新页面", "success");
      } catch {
        showToast("导入失败，文件格式错误", "error");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-6">
      {/* 导入导出 */}
      <section className="glass-card-strong p-5">
        <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text-dark)" }}>数据备份</h3>
        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleExport}
            className="btn-primary px-4 py-2 rounded-lg text-sm"
          >
            导出全部数据
          </button>
          <label className="btn-secondary px-4 py-2 rounded-lg text-sm cursor-pointer">
            导入数据
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
            />
          </label>
        </div>
      </section>

      {/* 游戏数据 */}
      <section className="glass-card-strong p-5">
        <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text-dark)" }}>游戏收藏</h3>
        <textarea
          value={gameData}
          onChange={(e) => handleDataChange(setGameData, (v) => { try { JSON.parse(v); return true; } catch { return false; } })(e.target.value)}
          className="w-full h-48 p-3 rounded-lg text-sm font-mono resize-y focus:ring-2 focus:border-transparent"
          style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
          spellCheck={false}
        />
        {dataError && <p className="text-red-500 text-xs mt-1">{dataError}</p>}
        <button
          type="button"
          onClick={() => handleSave("games", gameData, "游戏数据")}
          className="mt-2 btn-primary px-4 py-1.5 rounded-lg text-sm"
        >
          保存
        </button>
      </section>

      {/* 成就数据 */}
      <section className="glass-card-strong p-5">
        <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text-dark)" }}>成就系统</h3>
        <textarea
          value={achievementsData}
          onChange={(e) => handleDataChange(setAchievementsData, (v) => { try { JSON.parse(v); return true; } catch { return false; } })(e.target.value)}
          className="w-full h-40 p-3 rounded-lg text-sm font-mono resize-y focus:ring-2 focus:border-transparent"
          style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
          spellCheck={false}
        />
        <button
          type="button"
          onClick={() => handleSave("achievements", achievementsData, "成就数据")}
          className="mt-2 btn-primary px-4 py-1.5 rounded-lg text-sm"
        >
          保存
        </button>
      </section>

      {/* 愿望单数据 */}
      <section className="glass-card-strong p-5">
        <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text-dark)" }}>愿望单</h3>
        <textarea
          value={wishlistData}
          onChange={(e) => handleDataChange(setWishlistData, (v) => { try { JSON.parse(v); return true; } catch { return false; } })(e.target.value)}
          className="w-full h-40 p-3 rounded-lg text-sm font-mono resize-y focus:ring-2 focus:border-transparent"
          style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
          spellCheck={false}
        />
        <button
          type="button"
          onClick={() => handleSave("game_record_wishlist", wishlistData, "愿望单数据")}
          className="mt-2 btn-primary px-4 py-1.5 rounded-lg text-sm"
        >
          保存
        </button>
      </section>
    </div>
  );
}

// 账户设置
function AccountTab() {
  const { showToast } = useToast();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [steamId, setSteamId] = useState(() => localStorage.getItem("steam_id") || "");

  useEffect(() => {
    const supabase = tryCreateClient();
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        setUserEmail(data.session?.user?.email ?? null);
      });
    }
  }, []);

  function handleSteamIdSave() {
    localStorage.setItem("steam_id", steamId);
    showToast("Steam ID 已保存", "success");
  }

  async function handleLogout() {
    const supabase = tryCreateClient();
    if (supabase) {
      await supabase.auth.signOut();
      window.location.href = "/";
    }
  }

  return (
    <div className="space-y-6">
      <section className="glass-card-strong p-5">
        <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text-dark)" }}>当前账户</h3>
        {userEmail ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm" style={{ color: "var(--text-gray)" }}>
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              已登录：{userEmail}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg text-sm transition-colors"
              style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              退出登录
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: "var(--text-gray)" }}>未登录</p>
            <a
              href="/auth"
              className="inline-block btn-primary px-4 py-2 rounded-lg text-sm"
            >
              去登录
            </a>
          </div>
        )}
      </section>

      <section className="glass-card-strong p-5">
        <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text-dark)" }}>Steam 账号</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={steamId}
            onChange={(e) => setSteamId(e.target.value)}
            placeholder="输入你的 Steam ID 或自定义 URL"
            className="flex-1 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:border-transparent"
            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
          />
          <button
            type="button"
            onClick={handleSteamIdSave}
            className="btn-primary px-4 py-2 rounded-lg text-sm"
          >
            保存
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--text-light)" }}>用于 Steam 同步你的游戏库</p>
      </section>

      <section className="glass-card-strong p-5">
        <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text-dark)" }}>云端同步</h3>
        <p className="text-sm mb-2" style={{ color: "var(--text-gray)" }}>登录后数据会自动同步到 Supabase 云端</p>
        <div className="space-y-1 text-xs font-mono" style={{ color: "var(--text-light)" }}>
          <p>Supabase: oxbyshstrvzshxpaztzg.supabase.co</p>
        </div>
      </section>
    </div>
  );
}

// 主页面
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("appearance");

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8 gradient-text">设置</h1>

      {/* 标签栏 */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "text-white shadow-sm"
                : "hover:bg-gray-200/30"
            }`}
            style={activeTab === tab.id ? { background: "linear-gradient(135deg, var(--primary) 0%, var(--accent-pink) 100%)" } : { color: "var(--text-gray)", background: "var(--bg-glass)" }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      {activeTab === "appearance" && <AppearanceTab />}
      {activeTab === "background" && <BackgroundTab />}
      {activeTab === "mascot" && <MascotTab />}
      {activeTab === "wishlist" && <WishlistTab />}
      {activeTab === "data" && <DataTab />}
      {activeTab === "account" && <AccountTab />}

      {/* 关于 */}
      <div className="mt-8 pt-6 border-t text-center text-xs" style={{ borderColor: "var(--border-glass)", color: "var(--text-light)" }}>
        游戏记录 v2.0 · Next.js 15 + Supabase
      </div>
    </div>
  );
}
