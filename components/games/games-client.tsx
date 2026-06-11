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
      <section data-hero className="relative py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 gradient-text">
            我的游戏收藏
          </h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto" style={{ color: "var(--text-dark)" }}>
            记录和管理玩过的每一款游戏，追踪游戏进度与成就
          </p>
          <button
            type="button"
            className="btn-primary inline-flex items-center"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-5 h-5 mr-2" />
            添加新游戏
          </button>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto mb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-4">
              <label
                htmlFor="search"
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-gray)" }}
              >
                搜索游戏
              </label>
              <div className="relative">
                <input
                  id="search"
                  type="text"
                  className="w-full pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:border-transparent"
                  style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
                  placeholder="输入游戏名称..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-light)" }} />
              </div>
            </div>

            <div className="glass-card p-4">
              <label
                htmlFor="status-filter"
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-gray)" }}
              >
                游戏状态
              </label>
              <select
                id="status-filter"
                className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
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

            <div className="glass-card p-4">
              <label
                htmlFor="type-filter"
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-gray)" }}
              >
                游戏类型
              </label>
              <select
                id="type-filter"
                className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
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

          <div className="max-w-6xl mx-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-16 glass-card">
                <Gamepad2 className="w-20 h-20 mx-auto mb-6" style={{ color: "var(--text-light)" }} />
                <h3 className="text-2xl font-bold mb-4" style={{ color: "var(--text-dark)" }}>
                  暂无游戏
                </h3>
                <p className="mb-8" style={{ color: "var(--text-gray)" }}>
                  点击「添加新游戏」按钮开始记录你的游戏之旅
                </p>
                <button
                  type="button"
                  className="btn-primary inline-flex items-center"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  添加新游戏
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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

      <section className="py-14">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold" style={{ color: "var(--text-dark)" }}>最近添加的游戏</h2>
              <Link
                href="/achievements"
                className="text-sm transition-colors"
                style={{ color: "var(--primary)" }}
              >
                查看全部 →
              </Link>
            </div>
            {recentlyAdded.length === 0 ? (
              <p className="text-center text-gray-400 py-10">暂无最近添加的游戏</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {recentlyAdded.map((game) => (
                  <Link
                    key={String(game.id)}
                    href={gameDetailPath(game.id)}
                    className="game-card"
                  >
                    <div className="game-card-cover">
                      <div className="game-card-img-wrapper">
                        <GameIcon
                          src={game.icon}
                          name={game.name}
                          width={200}
                          height={200}
                          className="game-card-img"
                        />
                        <div className="game-card-gradient" />
                      </div>
                    </div>
                    <div className="game-card-body">
                      <h3 className="game-card-title">{game.name}</h3>
                      <div className="game-card-meta">
                        <span>{game.type || "其他"}</span>
                        <span>·</span>
                        <span>{parseInt(String(game.playtime), 10) || 0}h</span>
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