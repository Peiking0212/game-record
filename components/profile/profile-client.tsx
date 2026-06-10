"use client";

import {
  Calendar,
  Camera,
  Clock,
  Edit,
  Flame,
  Gamepad2,
  Heart,
  Save,
  Settings,
  Star,
  Trophy,
  User,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GameIcon } from "@/components/games/game-icon";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { getAchievements, getGames } from "@/lib/game-data";
import type { GameRecord } from "@/lib/game-types";
import { gameIconUrl } from "@/lib/game-utils";
import {
  DEFAULT_PLAY_STYLE,
  getProfile,
  memberDaysSince,
  profileAvatarUrl,
  saveProfile,
  TAG_BADGE_CLASSES,
  type PlayStyle,
  type UserProfile,
} from "@/lib/profile";

const AVATAR_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Crect width='96' height='96' fill='%236366f1'/%3E%3C/svg%3E";

// 玩家等级计算
function calcLevel(stats: { totalGames: number; totalHours: number; achievements: number }): number {
  const score = stats.totalGames * 5 + stats.totalHours * 0.5 + stats.achievements * 10;
  return Math.max(1, Math.floor(Math.sqrt(score)));
}

function TagBadges({
  tags,
  removable,
  onRemove,
}: {
  tags: string[];
  removable?: boolean;
  onRemove?: (tag: string) => void;
}) {
  if (!tags.length) return null;
  return (
    <>
      {tags.map((tag, index) => (
        <span
          key={tag}
          className={`badge ${TAG_BADGE_CLASSES[index % TAG_BADGE_CLASSES.length]}${removable ? " flex items-center" : ""}`}
        >
          {tag}
          {removable && onRemove && (
            <button
              type="button"
              className="ml-1 text-xs"
              onClick={() => onRemove(tag)}
              aria-label={"删除标签 " + tag}
            >
              ×
            </button>
          )}
        </span>
      ))}
    </>
  );
}

function PlayStyleBars({ playStyle }: { playStyle: PlayStyle }) {
  const rows: { key: keyof PlayStyle; label: string }[] = [
    { key: "singlePlayer", label: "单机游戏" },
    { key: "multiPlayer", label: "多人联机" },
    { key: "pve", label: "PVE" },
    { key: "pvp", label: "PVP" },
  ];
  return (
    <div className="space-y-4">
      {rows.map(({ key, label }) => (
        <div key={key} className="flex justify-between items-center gap-3">
          <span style={{ color: "#64748b" }} className="shrink-0 text-sm">
            {label}
          </span>
          <div className="w-32 rounded-full h-2 shrink-0" style={{ background: "#e2e8f0" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: playStyle[key] + "%",
                background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
              }}
            />
          </div>
          <span
            className="font-medium shrink-0 w-10 text-right text-sm"
            style={{ color: "#475569" }}
          >
            {playStyle[key]}%
          </span>
        </div>
      ))}
    </div>
  );
}

function FavoriteGamesList({ games }: { games: GameRecord[] }) {
  if (games.length === 0) {
    return (
      <div className="text-center py-4" style={{ color: "#94a3b8" }}>
        <p>尚未选择喜欢的游戏</p>
        <p className="text-sm">点击「编辑偏好」按钮添加</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {games.map((game) => (
        <div key={String(game.id)} className="flex items-center gap-4">
          <GameIcon
            src={game.icon}
            name={game.name}
            className="w-12 h-12 rounded-lg object-cover"
            width={48}
            height={48}
          />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate" style={{ color: "#1e293b" }}>
              {game.name}
            </h4>
            <p className="text-sm" style={{ color: "#64748b" }}>
              {Number(game.playtime) || 0} 小时
            </p>
          </div>
          <Star className="w-5 h-5 shrink-0" style={{ color: "#f59e0b" }} fill="#f59e0b" />
        </div>
      ))}
    </div>
  );
}

function PlayStyleModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: PlayStyle;
  onClose: () => void;
  onSave: (style: PlayStyle) => void;
}) {
  const [style, setStyle] = useState(initial);

  useEffect(() => {
    if (open) setStyle(initial);
  }, [open, initial]);

  const sliders: { key: keyof PlayStyle; label: string }[] = [
    { key: "singlePlayer", label: "单机游戏" },
    { key: "multiPlayer", label: "多人联机" },
    { key: "pve", label: "PVE" },
    { key: "pvp", label: "PVP" },
  ];

  return (
    <Modal open={open} onClose={onClose} title="编辑游戏偏好">
      <div className="space-y-4">
        {sliders.map(({ key, label }) => (
          <div key={key}>
            <label className="block mb-2" style={{ color: "#475569" }}>
              {label}
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={style[key]}
              className="w-full"
              onChange={(e) =>
                setStyle((s) => ({
                  ...s,
                  [key]: parseInt(e.target.value, 10),
                }))
              }
            />
            <div className="flex justify-between text-sm" style={{ color: "#94a3b8" }}>
              <span>0%</span>
              <span>{style[key]}%</span>
              <span>100%</span>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="w-full mt-4 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all"
          style={{ background: "#3b82f6", color: "#fff" }}
          onClick={() => onSave(style)}
        >
          保存
        </button>
      </div>
    </Modal>
  );
}

function FavoriteGamesModal({
  open,
  allGames,
  selectedIds,
  onClose,
  onSave,
}: {
  open: boolean;
  allGames: GameRecord[];
  selectedIds: Set<string>;
  onClose: () => void;
  onSave: (ids: Array<number | string>) => void;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) setPicked(new Set(selectedIds));
  }, [open, selectedIds]);

  const toggle = (id: number | string) => {
    const key = String(id);
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="编辑喜爱游戏">
      <div className="space-y-4 max-h-80 overflow-y-auto">
        {allGames.length === 0 ? (
          <p className="text-center" style={{ color: "#94a3b8" }}>
            暂无添加任何游戏
          </p>
        ) : (
          allGames.map((game) => (
            <label
              key={String(game.id)}
              className="flex items-center gap-3 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={picked.has(String(game.id))}
                onChange={() => toggle(game.id)}
                className="mr-1"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={gameIconUrl(game.icon, game.name)}
                alt={game.name}
                className="w-8 h-8 rounded object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = gameIconUrl(
                    undefined,
                    game.name,
                  );
                }}
              />
              <span style={{ color: "#475569" }}>{game.name}</span>
            </label>
          ))
        )}
        <button
          type="button"
          className="w-full mt-4 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all"
          style={{ background: "#3b82f6", color: "#fff" }}
          onClick={() => {
            const ids = allGames
              .filter((g) => picked.has(String(g.id)))
              .map((g) => g.id);
            onSave(ids);
          }}
        >
          保存
        </button>
      </div>
    </Modal>
  );
}

export function ProfileClient() {
  const { showToast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formName, setFormName] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formBio, setFormBio] = useState("");
  const [newTag, setNewTag] = useState("");

  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [playStyleOpen, setPlayStyleOpen] = useState(false);

  const allGames = useMemo(() => getGames(), []);
  const achievements = useMemo(() => getAchievements(), []);

  useEffect(() => {
    const p = getProfile();
    setProfile(p);
    setFormName(p.name);
    setFormTitle(p.title);
    setFormBio(p.bio);
  }, []);

  const persist = useCallback(
    (next: UserProfile, message?: string) => {
      if (!saveProfile(next)) {
        showToast(
          "保存失败：头像或数据过大，请更换一张偏小的图片",
          "error",
        );
        return false;
      }
      setProfile(next);
      setFormName(next.name);
      setFormTitle(next.title);
      setFormBio(next.bio);
      showToast(message || "个人信息已更新", "success");
      return true;
    },
    [showToast],
  );

  const stats = useMemo(() => {
    if (!profile) return null;
    const totalPlaytime = allGames.reduce(
      (sum, g) => sum + (Number(g.playtime) || 0),
      0,
    );
    const completed = allGames.filter((g) => g.status === "completed").length;
    return {
      totalGames: allGames.length,
      totalPlaytime,
      totalAchievements: achievements.length,
      memberDays: memberDaysSince(profile.joinDate),
      completed,
      level: calcLevel({
        totalGames: allGames.length,
        totalHours: totalPlaytime,
        achievements: achievements.length,
      }),
    };
  }, [profile, allGames, achievements]);

  const favoriteGames = useMemo(() => {
    if (!profile) return [];
    const ids = profile.favoriteGames || [];
    if (!ids.length) return [];
    return ids
      .map((id) => allGames.find((g) => String(g.id) === String(id)))
      .filter((g): g is GameRecord => !!g);
  }, [profile, allGames]);

  const selectedFavoriteIds = useMemo(() => {
    return new Set((profile?.favoriteGames || []).map(String));
  }, [profile?.favoriteGames]);

  // 最近沉迷：按 playtime 排序 top 3
  const topGames = useMemo(
    () =>
      [...allGames]
        .sort((a, b) => (parseInt(String(b.playtime), 10) || 0) - (parseInt(String(a.playtime), 10) || 0))
        .slice(0, 3),
    [allGames],
  );

  // 成就墙：前 6 个
  const recentAchievements = useMemo(() => achievements.slice(0, 6), [achievements]);

  if (!profile || !stats) {
    return <p className="text-center py-16" style={{ color: "#94a3b8" }}>加载中…</p>;
  }

  const handleAvatarChange = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const next = { ...profile, avatar: dataUrl };
      setProfile(next);
      persist(next, "头像已更新");
    };
    reader.readAsDataURL(file);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = {
      ...profile,
      name: formName.trim() || profile.name,
      title: formTitle.trim() || profile.title,
      bio: formBio.trim() || profile.bio,
    };
    persist(next, "个人信息已保存");
  };

  const addTag = () => {
    const tag = newTag.trim();
    if (!tag || profile.tags.includes(tag)) return;
    const next = { ...profile, tags: [...profile.tags, tag] };
    setNewTag("");
    persist(next, "标签添加成功");
  };

  const removeTag = (tag: string) => {
    const next = {
      ...profile,
      tags: profile.tags.filter((t) => t !== tag),
    };
    persist(next, "标签已删除");
  };

  const playStyle = profile.playStyle || DEFAULT_PLAY_STYLE;
  const avatarSrc = profileAvatarUrl(profile.avatar);

  return (
    <>
      {/* ── Steam 风格深色 Hero ── */}
      <section
        className="relative overflow-hidden"
        style={{ background: "#0f172a" }}
      >
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 50%, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="container mx-auto px-4 py-16 md:py-20 relative z-10">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8">
            {/* 头像 + 等级 */}
            <div className="flex flex-col items-center shrink-0">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarSrc}
                  alt="头像"
                  className="w-28 h-28 rounded-2xl object-cover shadow-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = AVATAR_FALLBACK;
                  }}
                />
                <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110"
                  style={{ background: "#3b82f6", color: "#fff" }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      handleAvatarChange(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <Camera className="w-4 h-4" />
                </label>
              </div>
              {/* 等级徽章 */}
              <div
                className="mt-3 px-4 py-1 rounded-full text-sm font-bold"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  color: "#fff",
                }}
              >
                Lv.{stats.level}
              </div>
            </div>

            {/* 信息 */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold mb-1" style={{ color: "#f1f5f9" }}>
                {profile.name}
              </h1>
              <p className="text-lg mb-1" style={{ color: "#60a5fa" }}>
                {profile.title}
              </p>
              <p className="text-sm max-w-lg" style={{ color: "#94a3b8" }}>
                {profile.bio}
              </p>
              <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                <TagBadges tags={profile.tags} />
              </div>

              {/* 入驻信息 */}
              <div className="flex flex-wrap gap-6 mt-4 justify-center md:justify-start text-sm" style={{ color: "#64748b" }}>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> {stats.memberDays} 天入驻
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 深色数据面板 ── */}
      <section style={{ background: "#111827" }} className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatsCard
                icon={<Gamepad2 className="w-5 h-5" />}
                value={String(stats.totalGames)}
                label="游戏收藏"
                color="#60a5fa"
              />
              <StatsCard
                icon={<Clock className="w-5 h-5" />}
                value={stats.totalPlaytime + "h"}
                label="累计游玩"
                color="#22c55e"
                highlight
              />
              <StatsCard
                icon={<Trophy className="w-5 h-5" />}
                value={String(stats.totalAchievements)}
                label="解锁成就"
                color="#f59e0b"
              />
              <StatsCard
                icon={<Star className="w-5 h-5" />}
                value={stats.completed + " 款"}
                label="已通关"
                color="#ef4444"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── 成就墙 + 最近沉迷 ── */}
      <section className="py-12" style={{ background: "#f8fafc" }}>
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 最近沉迷 */}
            <div
              className="rounded-2xl p-6"
              style={{ background: "#fff", border: "1px solid #e2e8f0" }}
            >
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "#1e293b" }}>
                <Flame className="w-5 h-5" style={{ color: "#f59e0b" }} />
                最近沉迷
              </h3>
              {topGames.length === 0 ? (
                <p style={{ color: "#94a3b8" }}>暂无游戏数据</p>
              ) : (
                <div className="space-y-3">
                  {topGames.map((game, idx) => (
                    <div key={String(game.id)} className="flex items-center gap-3">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{
                          background: idx === 0 ? "#f59e0b" : idx === 1 ? "#94a3b8" : "#78716c",
                          color: "#fff",
                        }}
                      >
                        {idx + 1}
                      </span>
                      <GameIcon
                        src={game.icon}
                        name={game.name}
                        className="w-10 h-10 rounded-lg object-cover"
                        width={40}
                        height={40}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate" style={{ color: "#1e293b" }}>
                          {game.name}
                        </div>
                        <div className="text-xs" style={{ color: "#64748b" }}>
                          {parseInt(String(game.playtime), 10) || 0} 小时
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 成就墙 */}
            <div
              className="rounded-2xl p-6"
              style={{ background: "#fff", border: "1px solid #e2e8f0" }}
            >
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "#1e293b" }}>
                <Trophy className="w-5 h-5" style={{ color: "#f59e0b" }} />
                成就墙
              </h3>
              {recentAchievements.length === 0 ? (
                <p style={{ color: "#94a3b8" }}>暂无成就数据</p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {recentAchievements.map((ach: any) => (
                    <div
                      key={ach.id || ach.name}
                      className="aspect-square rounded-xl flex flex-col items-center justify-center text-center p-2"
                      style={{ background: "#f1f5f9" }}
                    >
                      <Trophy className="w-6 h-6 mb-1" style={{ color: "#f59e0b" }} />
                      <span className="text-[10px] font-medium leading-tight line-clamp-2" style={{ color: "#475569" }}>
                        {ach.name || "成就"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 游戏偏好 ── */}
      <section className="py-12" style={{ background: "#fff" }}>
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl p-6" style={{ border: "1px solid #e2e8f0" }}>
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ color: "#1e293b" }}>
                  <Heart className="w-5 h-5" style={{ color: "#ef4444" }} />
                  最爱游戏
                </h3>
                <FavoriteGamesList games={favoriteGames} />
                <button
                  type="button"
                  className="w-full mt-6 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }}
                  onClick={() => setFavoritesOpen(true)}
                >
                  <Edit className="w-4 h-4 inline mr-2" />
                  编辑偏好
                </button>
              </div>

              <div className="rounded-2xl p-6" style={{ border: "1px solid #e2e8f0" }}>
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ color: "#1e293b" }}>
                  <Settings className="w-5 h-5" style={{ color: "#3b82f6" }} />
                  游玩风格
                </h3>
                <PlayStyleBars playStyle={playStyle} />
                <button
                  type="button"
                  className="w-full mt-6 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }}
                  onClick={() => setPlayStyleOpen(true)}
                >
                  <Edit className="w-4 h-4 inline mr-2" />
                  编辑风格
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 个人资料设置 ── */}
      <section className="py-12" style={{ background: "#f8fafc" }}>
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto rounded-2xl p-8" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
            <h2 className="text-xl font-bold mb-8" style={{ color: "#1e293b" }}>
              <User className="w-5 h-5 inline mr-2" />
              个人资料设置
            </h2>
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="profile-name-input"
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#475569" }}
                >
                  用户昵称
                </label>
                <input
                  id="profile-name-input"
                  type="text"
                  className="w-full px-4 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ border: "1px solid #e2e8f0" }}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="profile-title-input"
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#475569" }}
                >
                  个人头衔
                </label>
                <input
                  id="profile-title-input"
                  type="text"
                  className="w-full px-4 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ border: "1px solid #e2e8f0" }}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="profile-bio-input"
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#475569" }}
                >
                  个人简介
                </label>
                <textarea
                  id="profile-bio-input"
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ border: "1px solid #e2e8f0" }}
                  value={formBio}
                  onChange={(e) => setFormBio(e.target.value)}
                />
              </div>
              <div>
                <span className="block text-sm font-medium mb-2" style={{ color: "#475569" }}>
                  游戏标签
                </span>
                <div className="flex flex-wrap gap-2 mb-2">
                  <TagBadges
                    tags={profile.tags}
                    removable
                    onRemove={removeTag}
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-4 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    style={{ border: "1px solid #e2e8f0" }}
                    placeholder="添加新标签"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                    style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }}
                    onClick={addTag}
                  >
                    添加
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="w-full px-5 py-2.5 rounded-lg font-semibold text-sm transition-all"
                style={{ background: "#3b82f6", color: "#fff" }}
              >
                <Save className="w-4 h-4 inline mr-2" />
                保存设置
              </button>
            </form>
          </div>
        </div>
      </section>

      <FavoriteGamesModal
        open={favoritesOpen}
        allGames={allGames}
        selectedIds={selectedFavoriteIds}
        onClose={() => setFavoritesOpen(false)}
        onSave={(ids) => {
          const next = { ...profile, favoriteGames: ids };
          persist(next, "喜爱游戏列表已更新");
          setFavoritesOpen(false);
        }}
      />

      <PlayStyleModal
        open={playStyleOpen}
        initial={playStyle}
        onClose={() => setPlayStyleOpen(false)}
        onSave={(style) => {
          const next = { ...profile, playStyle: style };
          persist(next, "游玩风格已更新");
          setPlayStyleOpen(false);
        }}
      />
    </>
  );
}

function StatsCard({
  icon,
  value,
  label,
  color,
  highlight,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-5 text-center transition-all"
      style={{
        background: highlight
          ? "linear-gradient(135deg, #1e3a5f, #1e1b4b)"
          : "rgba(255,255,255,0.05)",
        border: highlight
          ? "1px solid rgba(59,130,246,0.3)"
          : "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex justify-center mb-2" style={{ color }}>{icon}</div>
      <div
        className="text-2xl font-bold mb-0.5"
        style={{ color: highlight ? "#f1f5f9" : "#e2e8f0" }}
      >
        {value}
      </div>
      <div className="text-xs" style={{ color: "#64748b" }}>
        {label}
      </div>
    </div>
  );
}
