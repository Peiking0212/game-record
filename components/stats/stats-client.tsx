"use client";

import {
  BarChart3,
  Camera,
  CheckCircle,
  Clock,
  Gamepad2,
  Image as ImageIcon,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useMemo, useRef, useState } from "react";
import { GameIcon } from "@/components/games/game-icon";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { getStatusClass, getStatusText } from "@/lib/game-utils";
import {
  buildOverview,
  filterGames,
  getAllAchievements,
  getAllGames,
  getGameTypes,
  getYearsFromGames,
  yearlySummary,
  type StatsFilters,
} from "@/lib/stats";

const STATUS_OPTIONS = [
  { value: "playing", label: "游玩中" },
  { value: "completed", label: "已通关" },
  { value: "planned", label: "计划中" },
  { value: "dropped", label: "已弃坑" },
] as const;

export function StatsClient() {
  const { showToast } = useToast();
  const chartsSectionRef = useRef<HTMLElement | null>(null);
  const summaryContentRef = useRef<HTMLDivElement | null>(null);
  const [games, setGames] = useState<ReturnType<typeof getAllGames>>([]);
  const [achievements, setAchievements] = useState<
    ReturnType<typeof getAllAchievements>
  >([]);

  const [formFilters, setFormFilters] = useState<StatsFilters>({
    year: String(new Date().getFullYear()),
    type: "all",
    status: "all",
  });
  const [activeFilters, setActiveFilters] = useState<StatsFilters>(formFilters);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryYear, setSummaryYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    setGames(getAllGames());
    setAchievements(getAllAchievements());
  }, []);

  const years = useMemo(() => getYearsFromGames(games), [games]);
  const gameTypes = useMemo(() => getGameTypes(games), [games]);

  const filteredGames = useMemo(
    () => filterGames(games, activeFilters),
    [games, activeFilters],
  );
  const overview = useMemo(
    () => buildOverview(filteredGames, achievements),
    [filteredGames, achievements],
  );
  const summary = useMemo(
    () => yearlySummary(summaryYear, games, achievements),
    [summaryYear, games, achievements],
  );

  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    const colorMap: Record<string, string> = {
      playing: "#3b82f6",
      completed: "#10b981",
      planned: "#f59e0b",
      dropped: "#ef4444",
    };
    filteredGames.forEach((g) => {
      const s = g.status || "playing";
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([key, value]) => ({
      name: getStatusText(key),
      value,
      color: colorMap[key] || "#9ca3af",
    }));
  }, [filteredGames]);

  const typeData = useMemo(() => {
    const map: Record<string, number> = {};
    const colors = ["#6366f1", "#ec4899", "#3b82f6", "#14b8a6", "#f97316"];
    filteredGames.forEach((g) => {
      const t = g.type || "其他";
      map[t] = (map[t] || 0) + 1;
    });
    return Object.entries(map).map(([name, value], idx) => ({
      name,
      value,
      color: colors[idx % colors.length],
    }));
  }, [filteredGames]);

  const monthlySpending = useMemo(() => {
    return [
      { month: "1月", amount: 68 },
      { month: "2月", amount: 120 },
      { month: "3月", amount: 45 },
      { month: "4月", amount: 199 },
      { month: "5月", amount: 88 },
      { month: "6月", amount: 156 },
    ];
  }, []);

  const topGames = useMemo(() => {
    return [...filteredGames]
      .sort((a, b) => (Number(b.playtime) || 0) - (Number(a.playtime) || 0))
      .slice(0, 10);
  }, [filteredGames]);

  const exportElementAsImage = async (
    el: HTMLElement | null,
    filename: string,
  ) => {
    if (!el) {
      showToast("找不到需要导出的内容", "error");
      return;
    }
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(el, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL("image/png");
      link.click();
      showToast("已保存为图片", "success");
    } catch (e) {
      console.error("[stats] export failed", e);
      showToast("导出图片失败，请重试", "error");
    }
  };

  return (
    <>
      <section data-hero className="relative py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="glass-card-strong inline-block px-8 py-8 rounded-2xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 gradient-text">
              游戏统计
            </h1>
            <p className="text-xl mb-8 max-w-2xl mx-auto text-white/90">
              全方位分析你的游戏数据，了解游戏习惯与消费趋势
            </p>
          </div>
        </div>
      </section>

      <section className="py-4 bg-white border-b sticky top-16 z-40">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-gray-600">筛选：</span>
              <select
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                value={formFilters.year}
                onChange={(e) =>
                  setFormFilters((f) => ({ ...f, year: e.target.value }))
                }
              >
                <option value="all">全部年份</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}年
                  </option>
                ))}
              </select>
              <select
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                value={formFilters.type}
                onChange={(e) =>
                  setFormFilters((f) => ({ ...f, type: e.target.value }))
                }
              >
                <option value="all">全部类型</option>
                {gameTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                value={formFilters.status}
                onChange={(e) =>
                  setFormFilters((f) => ({ ...f, status: e.target.value }))
                }
              >
                <option value="all">全部状态</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button
                className="btn-secondary text-sm py-1.5"
                onClick={() => setActiveFilters(formFilters)}
              >
                应用
              </button>
              <button
                className="text-gray-500 hover:text-gray-700 text-sm"
                onClick={() => {
                  const reset = {
                    year: "all",
                    type: "all",
                    status: "all",
                  };
                  setFormFilters(reset);
                  setActiveFilters(reset);
                }}
              >
                清空
              </button>
            </div>

            <div className="flex gap-2">
              <button
                className="export-btn export-btn-secondary"
                onClick={() =>
                  exportElementAsImage(
                    chartsSectionRef.current,
                    `游戏统计_${new Date().toISOString().slice(0, 10)}.png`,
                  )
                }
              >
                <ImageIcon className="w-4 h-4" />
                保存图片
              </button>
              <button
                className="export-btn export-btn-primary"
                onClick={() => {
                  const y =
                    activeFilters.year === "all"
                      ? new Date().getFullYear()
                      : parseInt(activeFilters.year, 10);
                  setSummaryYear(y);
                  setSummaryOpen(true);
                }}
              >
                <Sparkles className="w-4 h-4" />
                年度总结
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="stats-overview">
            <StatCard
              icon={<Gamepad2 className="w-8 h-8" />}
              iconClass="bg-blue-100 text-blue-500"
              value={String(overview.totalGames)}
              label="游戏总数"
            />
            <StatCard
              icon={<Clock className="w-8 h-8" />}
              iconClass="bg-cyan-50 text-cyan-500"
              value={String(overview.totalPlaytime)}
              label="总游玩时长(小时)"
            />
            <StatCard
              icon={<CheckCircle className="w-8 h-8" />}
              iconClass="bg-green-100 text-green-500"
              value={String(overview.completed)}
              label="已通关游戏"
            />
            <StatCard
              icon={<Trophy className="w-8 h-8" />}
              iconClass="bg-blue-100 text-blue-500"
              value={String(overview.achievements)}
              label="获得成就"
            />
          </div>
        </div>
      </section>

      <section ref={chartsSectionRef} className="py-8 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <div className="glass-card-strong p-6">
              <h3 className="text-xl font-bold mb-6" style={{ color: "var(--text-dark)" }}>游戏状态分布</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card-strong p-6">
              <h3 className="text-xl font-bold mb-6" style={{ color: "var(--text-dark)" }}>游戏类型分布</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="glass-card-strong p-6 mb-12">
            <h3 className="text-xl font-bold mb-6" style={{ color: "var(--text-dark)" }}>月度消费趋势</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlySpending}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    name="消费金额"
                    stroke="#ec4899"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card-strong p-6">
            <h3 className="text-xl font-bold mb-6" style={{ color: "var(--text-dark)" }}>游戏时长排行</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-glass)" }}>
                    <th className="text-left py-3 px-4" style={{ color: "var(--text-gray)" }}>游戏名称</th>
                    <th className="text-left py-3 px-4" style={{ color: "var(--text-gray)" }}>类型</th>
                    <th className="text-left py-3 px-4" style={{ color: "var(--text-gray)" }}>游戏时长</th>
                    <th className="text-left py-3 px-4" style={{ color: "var(--text-gray)" }}>完成度</th>
                  </tr>
                </thead>
                <tbody>
                  {topGames.map((game) => (
                    <tr key={String(game.id)} style={{ borderBottom: "1px solid var(--border-glass)" }}>
                      <td className="py-3 px-4 font-medium" style={{ color: "var(--text-dark)" }}>{game.name}</td>
                      <td className="py-3 px-4" style={{ color: "var(--text-gray)" }}>{game.type || "其他"}</td>
                      <td className="py-3 px-4" style={{ color: "var(--text-gray)" }}>{game.playtime || 0}h</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-glass)" }}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${game.progress || 0}%`, background: "var(--primary)" }}
                            />
                          </div>
                          <span className="text-sm" style={{ color: "var(--text-gray)" }}>{game.progress || 0}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">游戏明细数据</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-700">游戏名称</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">类型</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">状态</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">游玩时长</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">进度</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredGames.map((game) => {
                  const progress = Math.min(
                    100,
                    Math.max(0, parseInt(String(game.progress), 10) || 0),
                  );
                  return (
                    <tr key={String(game.id)} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <GameIcon
                            src={game.icon}
                            name={game.name}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                          <span className="font-medium text-gray-800">{game.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">
                          {game.type || "其他"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded text-sm ${getStatusClass(game.status)}`}
                        >
                          {getStatusText(game.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {parseInt(String(game.playtime), 10) || 0} 小时
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">{progress}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <Modal open={summaryOpen} onClose={() => setSummaryOpen(false)} maxWidth="xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-800">{summary.year}年度游戏总结</h3>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600"
            onClick={() => setSummaryOpen(false)}
            aria-label="关闭"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div ref={summaryContentRef} className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold mb-2">{summary.year}</h2>
            <p className="text-lg opacity-90">年度游戏图鉴</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <SummaryStat value={String(summary.games)} label="款游戏" />
            <SummaryStat value={String(summary.hours)} label="游玩小时" />
            <SummaryStat value={String(summary.completed)} label="款通关" />
            <SummaryStat value={String(summary.achievements)} label="个成就" />
          </div>

          <div>
            <h4 className="font-semibold mb-3">年度最爱游戏</h4>
            <div className="space-y-2">
              {summary.topGames.length === 0 ? (
                <p className="text-sm text-gray-500">暂无数据</p>
              ) : (
                summary.topGames.map((g, i) => (
                  <div key={String(g.id)} className="flex items-center gap-3">
                    <span className="text-2xl">{["🥇", "🥈", "🥉"][i] ?? "🏅"}</span>
                    <div>
                      <div className="font-medium">{g.name}</div>
                      <div className="text-sm opacity-80">
                        {parseInt(String(g.playtime), 10) || 0} 小时
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">游戏类型偏好</h4>
            <div className="space-y-2">
              {summary.typeCounts.length === 0 ? (
                <p className="text-sm text-gray-500">暂无数据</p>
              ) : (
                summary.typeCounts.map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-gray-700">{type}</span>
                    <div className="flex items-center gap-2 flex-1 max-w-xs">
                      <div className="h-2 rounded-full bg-gray-100 flex-1 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: `${Math.round((count / Math.max(1, summary.games)) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-3 mt-6 pt-4 border-t">
          <button
            type="button"
            className="btn-primary"
            onClick={() =>
              exportElementAsImage(
                summaryContentRef.current,
                `年度总结_${summary.year}.png`,
              )
            }
          >
            <Camera className="w-4 h-4 inline mr-2" />
            保存为图片
          </button>
        </div>
      </Modal>
    </>
  );
}

function StatCard({
  icon,
  iconClass,
  value,
  label,
}: {
  icon: React.ReactNode;
  iconClass: string;
  value: string;
  label: string;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${iconClass}`}>{icon}</div>
      <div className="stat-number">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function SimplePanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="chart-card">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-[#52B6FF]" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function TypeDistribution({ games }: { games: Array<{ type?: string }> }) {
  const rows = useMemo(() => {
    const map = games.reduce<Record<string, number>>((acc, g) => {
      const key = g.type || "其他";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [games]);

  if (!rows.length) return <p className="text-sm text-gray-500">暂无数据</p>;
  const total = rows.reduce((s, x) => s + x[1], 0);
  return (
    <div className="space-y-2">
      {rows.map(([type, count]) => {
        const pct = Math.round((count / total) * 100);
        return (
          <div key={type} className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-700">{type}</span>
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <div className="h-2 rounded-full bg-gray-100 flex-1 overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-gray-500 w-14 text-right">{count} ({pct}%)</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TypePlaytime({ games }: { games: Array<{ type?: string; playtime?: number | string }> }) {
  const rows = useMemo(() => {
    const map = games.reduce<Record<string, number>>((acc, g) => {
      const key = g.type || "其他";
      acc[key] = (acc[key] || 0) + (parseInt(String(g.playtime), 10) || 0);
      return acc;
    }, {});
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [games]);
  if (!rows.length) return <p className="text-sm text-gray-500">暂无数据</p>;
  const max = rows[0][1] || 1;
  return (
    <div className="space-y-2">
      {rows.map(([type, hours]) => (
        <div key={type} className="flex items-center justify-between gap-3">
          <span className="text-sm text-gray-700">{type}</span>
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <div className="h-2 rounded-full bg-gray-100 flex-1 overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full"
                style={{ width: `${Math.round((hours / max) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 w-16 text-right">{hours}h</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProgressDistribution({
  games,
}: {
  games: Array<{ name: string; progress?: number | string }>;
}) {
  const top = useMemo(
    () =>
      [...games]
        .sort(
          (a, b) =>
            (parseInt(String(b.progress), 10) || 0) -
            (parseInt(String(a.progress), 10) || 0),
        )
        .slice(0, 8),
    [games],
  );
  if (!top.length) return <p className="text-sm text-gray-500">暂无数据</p>;
  return (
    <div className="space-y-2">
      {top.map((g) => {
        const p = Math.min(100, Math.max(0, parseInt(String(g.progress), 10) || 0));
        return (
          <div key={g.name} className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-700 truncate max-w-36">{g.name}</span>
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <div className="h-2 rounded-full bg-gray-100 flex-1 overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: `${p}%` }} />
              </div>
              <span className="text-xs text-gray-500 w-10 text-right">{p}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TopPlaytimeList({
  games,
}: {
  games: Array<{ id: number | string; name: string; playtime?: number | string }>;
}) {
  const top = useMemo(
    () =>
      [...games]
        .sort(
          (a, b) =>
            (parseInt(String(b.playtime), 10) || 0) -
            (parseInt(String(a.playtime), 10) || 0),
        )
        .slice(0, 8),
    [games],
  );
  if (!top.length) return <p className="text-sm text-gray-500">暂无数据</p>;
  const max = parseInt(String(top[0]?.playtime), 10) || 1;
  return (
    <div className="space-y-2">
      {top.map((g) => {
        const hours = parseInt(String(g.playtime), 10) || 0;
        return (
          <div key={String(g.id)} className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-700 truncate max-w-36">{g.name}</span>
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <div className="h-2 rounded-full bg-gray-100 flex-1 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${Math.round((hours / max) * 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-14 text-right">{hours}h</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SummaryStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center p-4 rounded-lg" style={{ background: "var(--bg-card)" }}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}
