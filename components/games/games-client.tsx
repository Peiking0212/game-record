"use client";

import Link from "next/link";
import { Gamepad2, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GameCassetteCard } from "@/components/games/game-cassette-card";
import { GameFormModal } from "@/components/games/game-form-modal";
import { GameIcon } from "@/components/games/game-icon";
import { SteamSyncCard } from "@/components/games/steam-sync-card";
import { useToast } from "@/components/ui/toast";
import { getGames, saveGames, seedGamesIfEmpty } from "@/lib/game-data";
import type { GameFormValues, GameRecord } from "@/lib/game-types";
import {
  GAME_STATUS_OPTIONS,
  GAME_TYPE_OPTIONS,
} from "@/lib/game-types";
import { defaultGameCover, gameDetailPath } from "@/lib/game-utils";

export function GamesClient() {
  const { showToast } = useToast();
  const [games, setGames] = useState<GameRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editGame, setEditGame] = useState<GameRecord | null>(null);

  const loadGames = useCallback(async () => {
    const list = await seedGamesIfEmpty();
    setGames(list);
    setReady(true);
  }, []);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  const filtered = useMemo(() => {
    let list = games;
    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter((g) => g.name.toLowerCase().includes(term));
    }
    if (statusFilter !== "all") {
      list = list.filter((g) => g.status === statusFilter);
    }
    if (typeFilter !== "all") {
      list = list.filter((g) => g.type === typeFilter);
    }
    return list;
  }, [games, search, statusFilter, typeFilter]);

  const recentlyAdded = useMemo(
    () =>
      [...games]
        .sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0))
        .slice(0, 4),
    [games],
  );

  const totalHours = useMemo(
    () => games.reduce((s, g) => s + (parseInt(String(g.playtime), 10) || 0), 0),
    [games],
  );

  function persist(next: GameRecord[], message: string) {
    if (!saveGames(next)) {
      showToast("保存失败，请检查存储空间", "error");
      return;
    }
    setGames(next);
    showToast(message, "success");
  }

  function handleAdd(values: GameFormValues) {
    const newGame: GameRecord = {
      id: Date.now(),
      name: values.name,
      icon: values.icon || defaultGameCover(values.name),
      playtime: values.playtime,
      progress: values.progress,
      status: values.status,
      type: values.type,
      description: values.description,
      lastPlayed: new Date().toISOString().split("T")[0],
      screenshots: [],
      videos: [],
    };
    persist([...games, newGame], "游戏添加成功");
  }

  function handleEdit(values: GameFormValues, gameId?: number | string) {
    if (gameId == null) return;
    const idx = games.findIndex((g) => String(g.id) === String(gameId));
    if (idx === -1) return;
    const updated: GameRecord = {
      ...games[idx],
      name: values.name,
      icon: values.icon || defaultGameCover(values.name),
      playtime: values.playtime,
      progress: values.progress,
      status: values.status,
      type: values.type,
      description: values.description,
      lastPlayed: new Date().toISOString().split("T")[0],
    };
    const next = [...games];
    next[idx] = updated;
    persist(next, "游戏信息已更新");
  }

  if (!ready) {
    return (
      <p className="text-center py-24" style={{ color: "var(--text-gray)" }}>
        加载中…
      </p>
    );
  }

  return (
    <>
      {/* ── 深色 Hero ── */}
      <section
        className="relative overflow-hidden"
        style={{ background: "#0f172a" }}
        data-hero
      >
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 0%, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="container mx-auto px-4 py-16 md:py-20 text-center relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: "#f1f5f9" }}>
            我的游戏收藏
          </h1>
          <p className="text-lg max-w-2xl mx-auto mb-8" style={{ color: "#94a3b8" }}>
            记录和管理玩过的每一款游戏，追踪游戏进度与成就
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-4">
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all hover:scale-105"
              style={{ background: "#3b82f6", color: "#fff" }}
            >
              <Plus className="w-4 h-4" />
              添加新游戏
            </button>
          </div>
          {/* 微统计 */}
          <div className="flex justify-center gap-8 mt-6 text-sm" style={{ color: "#64748b" }}>
            <span>{games.length} 款游戏</span>
            <span>·</span>
            <span>{totalHours} 小时</span>
            <span>·</span>
            <span>{games.filter((g) => g.status === "completed").length} 已通关</span>
          </div>
        </div>
      </section>

      {/* ── 过滤器 ── */}
      <section className="py-10" style={{ background: "#f8fafc" }}>
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="search"
                className="block text-sm font-medium mb-2"
                style={{ color: "#475569" }}
              >
                搜索游戏
              </label>
              <div className="relative">
                <input
                  id="search"
                  type="text"
                  className="w-full pl-10 pr-4 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ border: "1px solid #e2e8f0" }}
                  placeholder="输入游戏名称..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#94a3b8" }} />
              </div>
            </div>

            <div>
              <label
                htmlFor="status-filter"
                className="block text-sm font-medium mb-2"
                style={{ color: "#475569" }}
              >
                游戏状态
              </label>
              <select
                id="status-filter"
                className="w-full px-4 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ border: "1px solid #e2e8f0" }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">全部状态</option>
                {GAME_STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="type-filter"
                className="block text-sm font-medium mb-2"
                style={{ color: "#475569" }}
              >
                游戏类型
              </label>
              <select
                id="type-filter"
                className="w-full px-4 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ border: "1px solid #e2e8f0" }}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">全部类型</option>
                {GAME_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <SteamSyncCard onSynced={loadGames} />

          {/* ── 游戏列表 ── */}
          <div className="max-w-6xl mx-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <Gamepad2 className="w-20 h-20 mx-auto mb-6" style={{ color: "#cbd5e1" }} />
                <h3 className="text-2xl font-bold mb-4" style={{ color: "#475569" }}>
                  暂无游戏
                </h3>
                <p className="mb-8" style={{ color: "#94a3b8" }}>
                  点击「添加新游戏」按钮开始记录你的游戏之旅
                </p>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all hover:scale-105"
                  style={{ background: "#3b82f6", color: "#fff" }}
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="w-4 h-4" />
                  添加新游戏
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filtered.map((game) => (
                  <GameCassetteCard
                    key={String(game.id)}
                    game={game}
                    onEdit={(id) => {
                      const g = games.find((x) => String(x.id) === String(id));
                      if (g) setEditGame(g);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 最近添加 ── */}
      <section className="py-14" style={{ background: "#fff" }}>
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold" style={{ color: "#1e293b" }}>
                最近添加的游戏
              </h2>
              <Link
                href="/achievements"
                className="text-sm transition-colors"
                style={{ color: "#3b82f6" }}
              >
                查看全部 →
              </Link>
            </div>
            {recentlyAdded.length === 0 ? (
              <p className="text-center py-10" style={{ color: "#94a3b8" }}>暂无最近添加的游戏</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {recentlyAdded.map((game) => (
                  <Link
                    key={String(game.id)}
                    href={gameDetailPath(game.id)}
                    className="block rounded-xl overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg"
                    style={{ background: "#fff", border: "1px solid #e2e8f0" }}
                  >
                    <div className="aspect-[3/4] relative overflow-hidden">
                      <GameIcon
                        src={game.icon}
                        name={game.name}
                        width={200}
                        height={280}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(transparent 50%, rgba(15,23,42,0.7))" }} />
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-semibold truncate" style={{ color: "#1e293b" }}>{game.name}</h3>
                      <div className="text-xs mt-1" style={{ color: "#64748b" }}>
                        {parseInt(String(game.playtime), 10) || 0}h
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <GameFormModal
        mode="add"
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={(values) => handleAdd(values)}
      />

      <GameFormModal
        mode="edit"
        open={!!editGame}
        game={editGame}
        onClose={() => setEditGame(null)}
        onSubmit={(values, id) => handleEdit(values, id)}
      />
    </>
  );
}
