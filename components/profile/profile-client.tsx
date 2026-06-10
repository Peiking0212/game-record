"use client";

import {
  Calendar,
  Camera,
  Clock,
  Crown,
  Edit,
  Flame,
  Gamepad2,
  Heart,
  Save,
  Settings,
  Star,
  Sword,
  Trophy,
  Zap,
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

const AVATAR_FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Crect width='96' height='96' fill='%238B5CF6'/%3E%3C/svg%3E";

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
              aria-label={`删除标签 ${tag}`}
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
          <span className="shrink-0" style={{ color: "var(--text-dark)" }}>{label}</span>
          <div className="w-32 h-2 rounded-full overflow-hidden" style={{ background: "var(--primary-light)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${playStyle[key]}%`,
                background: "linear-gradient(90deg, #8B5CF6, #EC4899)",
              }}
            />
          </div>
          <span className="font-medium shrink-0 w-10 text-right" style={{ color: "var(--text-gray)" }}>
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
      <div className="text-center py-8">
        <Heart className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--text-light)" }} />
        <p style={{ color: "var(--text-gray)" }}>尚未选择喜欢的游戏</p>
        <p className="text-sm mt-1" style={{ color: "var(--text-light)" }}>点击「编辑偏好」按钮添加</p>
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
            className="w-12 h-12 rounded-xl object-cover"
            width={48}
            height={48}
          />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate" style={{ color: "var(--text-dark)" }}>
              {game.name}
            </h4>
            <p className="text-sm" style={{ color: "var(--text-gray)" }}>
              {Number(game.playtime) || 0} 小时
            </p>
          </div>
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 shrink-0" />
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
            <label className="block mb-2" style={{ color: "var(--text-dark)" }}>{label}</label>
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
            <div className="flex justify-between text-sm" style={{ color: "var(--text-gray)" }}>
              <span>0%</span>
              <span>{style[key]}%</span>
              <span>100%</span>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="btn-primary w-full mt-4"
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
          <p className="text-center" style={{ color: "var(--text-gray)" }}>暂无添加任何游戏</p>
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
              <span>{game.name}</span>
            </label>
          ))
        )}
        <button
          type="button"
          className="btn-primary w-full mt-4"
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
    const completedGames = allGames.filter((g) => g.status === "completed").length;
    const level = Math.floor(totalPlaytime / 50) + 1;
    const title = level >= 50 ? "传说级玩家" : level >= 30 ? "大师级玩家" : level >= 15 ? "资深玩家" : level >= 5 ? "进阶玩家" : "新手玩家";
    return {
      totalGames: allGames.length,
      totalPlaytime,
      totalAchievements: achievements.length,
      memberDays: memberDaysSince(profile.joinDate),
      completedGames,
      level,
      title,
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

  if (!profile || !stats) {
    return (
      <p className="text-center py-16" style={{ color: "var(--text-gray)" }}>加载中...</p>
    );
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
      {/* ====== 玩家身份 Header - 深色二次元风格 ====== */}
      <section className="anime-hero relative py-20 md:py-28">
        <div className="container mx-auto px-4 text-center relative z-10">
          {/* 等级徽章 */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-card mb-6">
            <Crown className="w-5 h-5 text-yellow-400" />
            <span className="text-sm font-bold text-white">Lv.{stats.level}</span>
            <span className="text-sm text-white/70">{stats.title}</span>
          </div>

          {/* 头像 */}
          <div className="relative inline-block mb-6">
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarSrc}
                alt="头像"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = AVATAR_FALLBACK;
                }}
              />
            </div>
            <label className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full glass-card flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  handleAvatarChange(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <Camera className="w-4 h-4 text-white" />
            </label>
          </div>

          {/* 名字和头衔 */}
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
            {profile.name}
          </h1>
          <p className="text-lg text-white/70 mb-4">{profile.title}</p>

          {/* 标签 */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            <TagBadges tags={profile.tags} />
          </div>

          {/* 简介 */}
          <p className="text-white/60 max-w-xl mx-auto text-base leading-relaxed">
            {profile.bio}
          </p>
        </div>

        {/* 底部渐变过渡 */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--bg-light)] to-transparent" />
      </section>

      {/* ====== 核心数据 - 毛玻璃卡片 ====== */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold gradient-text mb-2">
              玩家数据
            </h2>
            <p className="text-sm" style={{ color: "var(--text-gray)" }}>
              你的游戏成就与里程碑
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* 主数据 */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="glass-card p-6 text-center">
                <div className="flex justify-center mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-500 to-pink-500">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold gradient-text">{stats.totalPlaytime}h</div>
                <div className="text-sm mt-1" style={{ color: "var(--text-gray)" }}>累计时长</div>
              </div>
              <div className="glass-card p-6 text-center">
                <div className="flex justify-center mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-cyan-500">
                    <Sword className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold gradient-text">{stats.completedGames}</div>
                <div className="text-sm mt-1" style={{ color: "var(--text-gray)" }}>已通关</div>
              </div>
            </div>

            {/* 次数据 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="glass-card p-4 text-center">
                <Gamepad2 className="w-5 h-5 mx-auto mb-2" style={{ color: "var(--primary)" }} />
                <div className="text-xl font-bold" style={{ color: "var(--text-dark)" }}>{stats.totalGames}</div>
                <div className="text-xs" style={{ color: "var(--text-gray)" }}>游戏总数</div>
              </div>
              <div className="glass-card p-4 text-center">
                <Trophy className="w-5 h-5 mx-auto mb-2" style={{ color: "var(--accent-pink)" }} />
                <div className="text-xl font-bold" style={{ color: "var(--text-dark)" }}>{stats.totalAchievements}</div>
                <div className="text-xs" style={{ color: "var(--text-gray)" }}>解锁成就</div>
              </div>
              <div className="glass-card p-4 text-center">
                <Flame className="w-5 h-5 mx-auto mb-2" style={{ color: "var(--accent-cyan)" }} />
                <div className="text-xl font-bold" style={{ color: "var(--text-dark)" }}>{stats.memberDays}</div>
                <div className="text-xs" style={{ color: "var(--text-gray)" }}>入驻天数</div>
              </div>
              <div className="glass-card p-4 text-center">
                <Zap className="w-5 h-5 mx-auto mb-2" style={{ color: "var(--accent-blue)" }} />
                <div className="text-xl font-bold" style={{ color: "var(--text-dark)" }}>{stats.level}</div>
                <div className="text-xs" style={{ color: "var(--text-gray)" }}>玩家等级</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== 游戏偏好 ====== */}
      <section className="py-16 section-glass">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold gradient-text mb-2">
              游戏偏好
            </h2>
            <p className="text-sm" style={{ color: "var(--text-gray)" }}>
              你的独特游戏风格
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card-strong p-6">
                <h3 className="text-lg font-semibold mb-5 flex items-center" style={{ color: "var(--text-dark)" }}>
                  <Heart className="w-5 h-5 text-pink-500 mr-2" />
                  最爱游戏
                </h3>
                <FavoriteGamesList games={favoriteGames} />
                <button
                  type="button"
                  className="btn-primary w-full mt-5"
                  onClick={() => setFavoritesOpen(true)}
                >
                  <Edit className="w-4 h-4 inline mr-2" />
                  编辑偏好
                </button>
              </div>

              <div className="glass-card-strong p-6">
                <h3 className="text-lg font-semibold mb-5 flex items-center" style={{ color: "var(--text-dark)" }}>
                  <Settings className="w-5 h-5 text-violet-500 mr-2" />
                  游玩风格
                </h3>
                <PlayStyleBars playStyle={playStyle} />
                <button
                  type="button"
                  className="btn-primary w-full mt-5"
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

      {/* ====== 个人资料设置 ====== */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold gradient-text mb-2">
              资料设置
            </h2>
            <p className="text-sm" style={{ color: "var(--text-gray)" }}>
              管理你的个人信息
            </p>
          </div>

          <div className="max-w-2xl mx-auto glass-card-strong p-8">
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="profile-name-input"
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--text-dark)" }}
                >
                  用户昵称
                </label>
                <input
                  id="profile-name-input"
                  type="text"
                  className="w-full px-4 py-2.5 rounded-xl border transition-all focus:ring-2 focus:outline-none"
                  style={{
                    background: "var(--input-bg)",
                    borderColor: "var(--input-border)",
                    color: "var(--text-dark)",
                  }}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="profile-title-input"
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--text-dark)" }}
                >
                  个人头衔
                </label>
                <input
                  id="profile-title-input"
                  type="text"
                  className="w-full px-4 py-2.5 rounded-xl border transition-all focus:ring-2 focus:outline-none"
                  style={{
                    background: "var(--input-bg)",
                    borderColor: "var(--input-border)",
                    color: "var(--text-dark)",
                  }}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="profile-bio-input"
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--text-dark)" }}
                >
                  个人简介
                </label>
                <textarea
                  id="profile-bio-input"
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl border transition-all focus:ring-2 focus:outline-none resize-none"
                  style={{
                    background: "var(--input-bg)",
                    borderColor: "var(--input-border)",
                    color: "var(--text-dark)",
                  }}
                  value={formBio}
                  onChange={(e) => setFormBio(e.target.value)}
                />
              </div>
              <div>
                <span className="block text-sm font-medium mb-2" style={{ color: "var(--text-dark)" }}>
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
                    className="flex-1 px-4 py-2.5 rounded-xl border transition-all focus:ring-2 focus:outline-none"
                    style={{
                      background: "var(--input-bg)",
                      borderColor: "var(--input-border)",
                      color: "var(--text-dark)",
                    }}
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
                    className="btn-secondary"
                    onClick={addTag}
                  >
                    添加
                  </button>
                </div>
              </div>
              <button type="submit" className="btn-primary w-full">
                <Save className="w-5 h-5 inline mr-2" />
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
