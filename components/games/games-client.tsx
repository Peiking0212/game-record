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
    persist([...games, newGame], "游戏已添加");
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
      <section className="bg-gradient-to-br from-blue-50 to-cyan-100 py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-[#223344] to-[#5B9BD5] bg-clip-text text-transparent">
            我的游戏收藏
          </h1>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            记录和管理我玩过的每一次游戏，追踪游戏进度和成就
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

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto mb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label
                htmlFor="search"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                搜索游戏
              </label>
              <div className="relative">
                <input
                  id="search"
                  type="text"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入游戏名称..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label
                htmlFor="status-filter"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                游戏状态
              </label>
              <select
                id="status-filter"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                游戏类型
              </label>
              <select
                id="type-filter"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <div className="text-center py-16">
                <Gamepad2 className="w-20 h-20 text-gray-300 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-700 mb-4">
                  还没有游戏
                </h3>
                <p className="text-gray-600 mb-8">
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

      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
            最近添加的游戏
          </h2>
          <div className="max-w-6xl mx-auto">
            {recentlyAdded.length === 0 ? (
              <p className="text-center text-gray-500">暂无最近添加的游戏</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {recentlyAdded.map((game) => (
                  <Link
                    key={String(game.id)}
                    href={gameDetailPath(game.id)}
                    className="bg-white rounded-lg shadow-lg overflow-hidden block hover:shadow-xl transition-shadow"
                  >
                    <GameIcon
                      src={game.icon}
                      name={game.name}
                      width={400}
                      height={128}
                      className="w-full h-32 object-cover"
                    />
                    <div className="p-4">
                      <h4 className="font-semibold text-gray-800">{game.name}</h4>
                      <p className="text-sm text-gray-600">{game.type}</p>
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
