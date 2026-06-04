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
import { useEffect, useMemo, useRef, useState } from "react";
import { GameIcon } from "@/components/games/game-icon";
import { Modal } from "@/components/ui/modal";
import { PageHero } from "@/components/ui/page-hero";
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
  { value: "completed", label: "已完成" },
  { value: "planned", label: "计划中" },
  { value: "dropped", label: "已放弃" },
] as const;

export function StatsClient() {
  const { showToast } = useToast();
  const chartsSectionRef = useRef<HTMLElement | null>(null);
  const summaryContentRef = useRef<HTMLDivElement | null>(null);
  const [games, setGames] = useState(() => getAllGames());
  const [achievements, setAchievements] = useState(() => getAllAchievements());

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

  const exportElementAsImage = async (
    el: HTMLElement | null,
    filename: string,
  ) => {
    if (!el) {
      showToast("找不到要导出的内容", "error");
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
      <PageHero
        eyebrow="/// game_library.analytics"
        title="数据统计分析"
        description="从主库存档读取类型、时长与进度，分色图表面板像 HUD 模块依次展开。"
      />

      <section className="py-4 section-game-alt border-b sticky top-16 z-40" style={{ borderColor: "var(--border-ui)" }}>
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium" style={{ color: "var(--text-gray)" }}>筛选：</span>
              <select
                className="px-3 py-1.5 border text-sm rounded-lg"
                style={{
                  borderColor: "var(--border-ui)",
                  background: "var(--bg-white)",
                  color: "var(--text-dark)"
                }}
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
                className="px-3 py-1.5 border text-sm rounded-lg"
                style={{
                  borderColor: "var(--border-ui)",
                  background: "var(--bg-white)",
                  color: "var(--text-dark)"
                }}
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
                className="px-3 py-1.5 border text-sm rounded-lg"
                style={{
                  borderColor: "var(--border-ui)",
                  background: "var(--bg-white)",
                  color: "var(--text-dark)"
                }}
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
                className="text-sm"
                style={{ color: "var(--text-gray)" }}
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
                清除
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

      <section className="py-8 section-game-alt">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="stats-overview">
            <StatCard
              icon={<Gamepad2 className="w-8 h-8" />}
              iconStyle="types"
              value={String(overview.totalGames)}
              label="游戏总数"
            />
            <StatCard
              icon={<Clock className="w-8 h-8" />}
              iconStyle="hours"
              value={String(overview.totalPlaytime)}
              label="总游戏时长(小时)"
            />
            <StatCard
              icon={<CheckCircle className="w-8 h-8" />}
              iconStyle="progress"
              value={String(overview.completed)}
              label="已完成游戏"
            />
            <StatCard
              icon={<Trophy className="w-8 h-8" />}
              iconStyle="rank"
              value={String(overview.achievements)}
              label="获得成就"
            />
          </div>
        </div>
      </section>

      <section ref={chartsSectionRef} className="py-8 section-game">
        <div className="container mx-auto px-4">
          <p
            className="text-center font-mono text-sm mb-8 lowercase"
            style={{ color: "var(--text-gray)" }}
          >
            analytics · 四类视图
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartPanel variant="types" title="游戏类型分布" subtitle="库容占比">
              <TypeDistribution games={filteredGames} />
            </ChartPanel>
            <ChartPanel variant="hours" title="各类型游戏时长" subtitle="累计小时">
              <TypePlaytime games={filteredGames} />
            </ChartPanel>
            <ChartPanel variant="progress" title="游戏进度概览" subtitle="完成度 Top">
              <ProgressDistribution games={filteredGames} />
            </ChartPanel>
            <ChartPanel variant="rank" title="游戏时长对比" subtitle="时长排行">
              <TopPlaytimeList games={filteredGames} />
            </ChartPanel>
          </div>
        </div>
      </section>

      <section className="py-8 section-game">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6" style={{ color: "var(--text-dark)" }}>游戏详细数据</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead style={{ background: "var(--bg-light)" }}>
                <tr>
                  <th className="px-6 py-4 font-semibold" style={{ color: "var(--text-dark)" }}>游戏名称</th>
                  <th className="px-6 py-4 font-semibold" style={{ color: "var(--text-dark)" }}>类型</th>
                  <th className="px-6 py-4 font-semibold" style={{ color: "var(--text-dark)" }}>状态</th>
                  <th className="px-6 py-4 font-semibold" style={{ color: "var(--text-dark)" }}>游戏时长</th>
                  <th className="px-6 py-4 font-semibold" style={{ color: "var(--text-dark)" }}>进度</th>
                </tr>
              </thead>
              <tbody style={{ borderColor: "var(--border-light)" }} className="divide-y">
                {filteredGames.map((game) => {
                  const progress = Math.min(
                    100,
                    Math.max(0, parseInt(String(game.progress), 10) || 0),
                  );
                  return (
                    <tr key={String(game.id)} style={{ transition: "background-color 0.2s" }} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <GameIcon
                            src={game.icon}
                            name={game.name}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                          <span className="font-medium" style={{ color: "var(--text-dark)" }}>{game.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="px-2 py-1 rounded text-sm"
                          style={{
                            background: "var(--primary-light)",
                            color: "var(--text-dark)"
                          }}
                        >
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
                      <td className="px-6 py-4" style={{ color: "var(--text-dark)" }}>
                        {parseInt(String(game.playtime), 10) || 0} 小时
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-24 h-2 rounded-full overflow-hidden"
                            style={{ background: "var(--border-soft)" }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${progress}%`,
                                background: "linear-gradient(90deg, var(--primary), var(--primary-hover))"
                              }}
                            />
                          </div>
                          <span className="text-sm" style={{ color: "var(--text-gray)" }}>{progress}%</span>
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
          <h3 className="text-2xl font-bold" style={{ color: "var(--text-dark)" }}>{summary.year}年度游戏总结</h3>
          <button
            type="button"
            style={{ color: "var(--text-gray)" }}
            onClick={() => setSummaryOpen(false)}
            aria-label="关闭"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div ref={summaryContentRef} className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold mb-2" style={{ color: "var(--text-dark)" }}>{summary.year}</h2>
            <p className="text-lg opacity-90" style={{ color: "var(--text-gray)" }}>年度游戏回顾</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <SummaryStat value={String(summary.games)} label="款游戏" variant="types" />
            <SummaryStat value={String(summary.hours)} label="游戏小时" variant="hours" />
            <SummaryStat value={String(summary.completed)} label="款通关" variant="progress" />
            <SummaryStat value={String(summary.achievements)} label="个成就" variant="rank" />
          </div>

          <div>
            <h4 className="font-semibold mb-3" style={{ color: "var(--text-dark)" }}>年度最爱游戏</h4>
            <div className="space-y-2">
              {summary.topGames.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-gray)" }}>暂无数据</p>
              ) : (
                summary.topGames.map((g, i) => (
                  <div key={String(g.id)} className="flex items-center gap-3">
                    <span className="text-2xl">{["?", "?", "?"][i] ?? "?"}</span>
                    <div>
                      <div className="font-medium" style={{ color: "var(--text-dark)" }}>{g.name}</div>
                      <div className="text-sm opacity-80" style={{ color: "var(--text-gray)" }}>
                        {parseInt(String(g.playtime), 10) || 0} 小时
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3" style={{ color: "var(--text-dark)" }}>游戏类型偏好</h4>
            <div className="space-y-2">
              {summary.typeCounts.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-gray)" }}>暂无数据</p>
              ) : (
                summary.typeCounts.map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between gap-4">
                    <span className="text-sm" style={{ color: "var(--text-dark)" }}>{type}</span>
                    <div className="flex items-center gap-2 flex-1 max-w-xs">
                      <div
                        className="h-2 rounded-full flex-1 overflow-hidden"
                        style={{ background: "var(--border-soft)" }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.round((count / Math.max(1, summary.games)) * 100)}%`,
                            background: "linear-gradient(90deg, var(--primary), var(--primary-hover))"
                          }}
                        />
                      </div>
                      <span className="text-xs w-8 text-right" style={{ color: "var(--text-gray)" }}>{count}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-3 mt-6 pt-4" style={{ borderColor: "var(--border-light)" }}>
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
  iconStyle,
  value,
  label,
}: {
  icon: React.ReactNode;
  iconStyle: "types" | "hours" | "progress" | "rank";
  value: string;
  label: string;
}) {
  const iconStyles = {
    types: {
      background: "rgba(78, 184, 228, 0.2)",
      color: "#2a7fa8",
    },
    hours: {
      background: "rgba(56, 189, 248, 0.2)",
      color: "#0e7490",
    },
    progress: {
      background: "rgba(245, 158, 11, 0.2)",
      color: "#b45309",
    },
    rank: {
      background: "rgba(167, 139, 250, 0.22)",
      color: "#7c3aed",
    },
  };
  const style = iconStyles[iconStyle];
  return (
    <div className="stat-card">
      <div
        className="stat-icon mx-auto mb-4 flex items-center justify-center border"
        style={{
          background: style.background,
          color: style.color,
          borderColor: "var(--border-ui-emphasis)",
          boxShadow: "var(--shadow-brutal)",
        }}
      >
        {icon}
      </div>
      <div className="stat-number" style={{ color: "var(--text-dark)" }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

type ChartVariant = "types" | "hours" | "progress" | "rank";

const CHART_ICONS: Record<ChartVariant, typeof BarChart3> = {
  types: Gamepad2,
  hours: Clock,
  progress: CheckCircle,
  rank: Trophy,
};

function ChartPanel({
  variant,
  title,
  subtitle,
  children,
}: {
  variant: ChartVariant;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const Icon = CHART_ICONS[variant];
  return (
    <div className={`chart-panel chart-panel--${variant}`}>
      <div className="chart-panel__head">
        <div className={`chart-panel__icon chart-panel__icon--${variant}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="chart-panel__title">{title}</h3>
          <p className="chart-panel__subtitle font-mono">{subtitle}</p>
        </div>
      </div>
      <div className="chart-panel__body">{children}</div>
    </div>
  );
}

function ChartBar({
  variant,
  pct,
}: {
  variant: ChartVariant;
  pct: number;
}) {
  return (
    <div className="chart-bar-track">
      <div
        className={`chart-bar-fill chart-bar-fill--${variant}`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
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
    <div className="chart-rows">
      {rows.map(([type, count], index) => {
        const pct = Math.round((count / total) * 100);
        return (
          <div key={type} className="chart-row">
            <span className="chart-row__rank font-mono">{index + 1}</span>
            <span className="chart-row__label">{type}</span>
            <div className="chart-row__bar">
              <ChartBar variant="types" pct={pct} />
              <span className="chart-row__value font-mono">
                {count} ({pct}%)
              </span>
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
    <div className="chart-rows">
      {rows.map(([type, hours], index) => {
        const pct = Math.round((hours / max) * 100);
        return (
          <div key={type} className="chart-row">
            <span className="chart-row__rank font-mono">{index + 1}</span>
            <span className="chart-row__label">{type}</span>
            <div className="chart-row__bar">
              <ChartBar variant="hours" pct={pct} />
              <span className="chart-row__value font-mono">{hours}h</span>
            </div>
          </div>
        );
      })}
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
    <div className="chart-rows">
      {top.map((g, index) => {
        const p = Math.min(100, Math.max(0, parseInt(String(g.progress), 10) || 0));
        return (
          <div key={g.name} className="chart-row">
            <span className="chart-row__rank font-mono">{index + 1}</span>
            <span className="chart-row__label truncate">{g.name}</span>
            <div className="chart-row__bar">
              <ChartBar variant="progress" pct={p} />
              <span className="chart-row__value font-mono">{p}%</span>
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
    <div className="chart-rows">
      {top.map((g, index) => {
        const hours = parseInt(String(g.playtime), 10) || 0;
        const pct = Math.round((hours / max) * 100);
        return (
          <div key={String(g.id)} className="chart-row">
            <span className="chart-row__rank font-mono">{index + 1}</span>
            <span className="chart-row__label truncate">{g.name}</span>
            <div className="chart-row__bar">
              <ChartBar variant="rank" pct={pct} />
              <span className="chart-row__value font-mono">{hours}h</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SummaryStat({ value, label, variant }: { value: string; label: string; variant: "types" | "hours" | "progress" | "rank" }) {
  const variantStyles = {
    types: { color: "#4eb8e4" },
    hours: { color: "#38bdf8" },
    progress: { color: "#f59e0b" },
    rank: { color: "#a78bfa" },
  };
  const style = variantStyles[variant];
  return (
    <div
      className="text-center p-4 rounded-lg border"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border-ui)",
        boxShadow: "var(--shadow-brutal)",
      }}
    >
      <div className="text-3xl font-bold" style={{ color: style.color }}>{value}</div>
      <div className="text-sm" style={{ color: "var(--text-gray)" }}>{label}</div>
    </div>
  );
}
