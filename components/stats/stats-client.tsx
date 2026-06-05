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
  { value: "playing", label: "娓哥帺涓? },
  { value: "completed", label: "宸插畬鎴? },
  { value: "planned", label: "璁″垝涓? },
  { value: "dropped", label: "宸叉斁寮? },
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

  const exportElementAsImage = async (
    el: HTMLElement | null,
    filename: string,
  ) => {
    if (!el) {
      showToast("鎵句笉鍒拌瀵煎嚭鐨勫唴瀹?, "error");
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
      showToast("宸蹭繚瀛樹负鍥剧墖", "success");
    } catch (e) {
      console.error("[stats] export failed", e);
      showToast("瀵煎嚭鍥剧墖澶辫触锛岃閲嶈瘯", "error");
    }
  };

  return (
    <>
      <section className="bg-gradient-to-br from-blue-50 to-cyan-100 py-12 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-[#223344] to-[#5B9BD5] bg-clip-text text-transparent">
            鏁版嵁缁熻鍒嗘瀽
          </h1>
          <p className="text-lg md:text-xl text-gray-700 mb-6 max-w-2xl mx-auto">
            娣卞叆浜嗚В浣犵殑娓告垙涔犳儻锛屽彂鐜伴殣钘忕殑娓告垙瑙勫緥
          </p>
        </div>
      </section>

      <section className="py-4 bg-white border-b sticky top-16 z-40">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-gray-600">绛涢€夛細</span>
              <select
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                value={formFilters.year}
                onChange={(e) =>
                  setFormFilters((f) => ({ ...f, year: e.target.value }))
                }
              >
                <option value="all">鍏ㄩ儴骞翠唤</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}骞?
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
                <option value="all">鍏ㄩ儴绫诲瀷</option>
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
                <option value="all">鍏ㄩ儴鐘舵€?/option>
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
                搴旂敤
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
                娓呴櫎
              </button>
            </div>

            <div className="flex gap-2">
              <button
                className="export-btn export-btn-secondary"
                onClick={() =>
                  exportElementAsImage(
                    chartsSectionRef.current,
                    `娓告垙缁熻_${new Date().toISOString().slice(0, 10)}.png`,
                  )
                }
              >
                <ImageIcon className="w-4 h-4" />
                淇濆瓨鍥剧墖
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
                骞村害鎬荤粨
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
              label="娓告垙鎬绘暟"
            />
            <StatCard
              icon={<Clock className="w-8 h-8" />}
              iconClass="bg-cyan-50 text-cyan-500"
              value={String(overview.totalPlaytime)}
              label="鎬绘父鎴忔椂闀?灏忔椂)"
            />
            <StatCard
              icon={<CheckCircle className="w-8 h-8" />}
              iconClass="bg-green-100 text-green-500"
              value={String(overview.completed)}
              label="宸插畬鎴愭父鎴?
            />
            <StatCard
              icon={<Trophy className="w-8 h-8" />}
              iconClass="bg-purple-100 text-purple-500"
              value={String(overview.achievements)}
              label="鑾峰緱鎴愬氨"
            />
          </div>
        </div>
      </section>

      <section ref={chartsSectionRef} className="py-8 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SimplePanel title="娓告垙绫诲瀷鍒嗗竷">
              <TypeDistribution games={filteredGames} />
            </SimplePanel>
            <SimplePanel title="鍚勭被鍨嬫父鎴忔椂闀?>
              <TypePlaytime games={filteredGames} />
            </SimplePanel>
            <SimplePanel title="娓告垙杩涘害姒傝">
              <ProgressDistribution games={filteredGames} />
            </SimplePanel>
            <SimplePanel title="娓告垙鏃堕暱瀵规瘮">
              <TopPlaytimeList games={filteredGames} />
            </SimplePanel>
          </div>
        </div>
      </section>

      <section className="py-8 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">娓告垙璇︾粏鏁版嵁</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-700">娓告垙鍚嶇О</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">绫诲瀷</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">鐘舵€?/th>
                  <th className="px-6 py-4 font-semibold text-gray-700">娓告垙鏃堕暱</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">杩涘害</th>
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
                          {game.type || "鍏朵粬"}
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
                        {parseInt(String(game.playtime), 10) || 0} 灏忔椂
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
          <h3 className="text-2xl font-bold text-gray-800">{summary.year}骞村害娓告垙鎬荤粨</h3>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600"
            onClick={() => setSummaryOpen(false)}
            aria-label="鍏抽棴"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div ref={summaryContentRef} className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold mb-2">{summary.year}</h2>
            <p className="text-lg opacity-90">骞村害娓告垙鍥為【</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <SummaryStat value={String(summary.games)} label="娆炬父鎴? />
            <SummaryStat value={String(summary.hours)} label="娓告垙灏忔椂" />
            <SummaryStat value={String(summary.completed)} label="娆鹃€氬叧" />
            <SummaryStat value={String(summary.achievements)} label="涓垚灏? />
          </div>

          <div>
            <h4 className="font-semibold mb-3">骞村害鏈€鐖辨父鎴?/h4>
            <div className="space-y-2">
              {summary.topGames.length === 0 ? (
                <p className="text-sm text-gray-500">鏆傛棤鏁版嵁</p>
              ) : (
                summary.topGames.map((g, i) => (
                  <div key={String(g.id)} className="flex items-center gap-3">
                    <span className="text-2xl">{["馃", "馃", "馃"][i] ?? "馃幃"}</span>
                    <div>
                      <div className="font-medium">{g.name}</div>
                      <div className="text-sm opacity-80">
                        {parseInt(String(g.playtime), 10) || 0} 灏忔椂
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">娓告垙绫诲瀷鍋忓ソ</h4>
            <div className="space-y-2">
              {summary.typeCounts.length === 0 ? (
                <p className="text-sm text-gray-500">鏆傛棤鏁版嵁</p>
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
                `骞村害鎬荤粨_${summary.year}.png`,
              )
            }
          >
            <Camera className="w-4 h-4 inline mr-2" />
            淇濆瓨涓哄浘鐗?
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
      const key = g.type || "鍏朵粬";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [games]);

  if (!rows.length) return <p className="text-sm text-gray-500">鏆傛棤鏁版嵁</p>;
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
      const key = g.type || "鍏朵粬";
      acc[key] = (acc[key] || 0) + (parseInt(String(g.playtime), 10) || 0);
      return acc;
    }, {});
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [games]);
  if (!rows.length) return <p className="text-sm text-gray-500">鏆傛棤鏁版嵁</p>;
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
  if (!top.length) return <p className="text-sm text-gray-500">鏆傛棤鏁版嵁</p>;
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
  if (!top.length) return <p className="text-sm text-gray-500">鏆傛棤鏁版嵁</p>;
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
                  className="h-full bg-purple-500 rounded-full"
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
