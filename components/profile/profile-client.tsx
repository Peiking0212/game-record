"use client";

import {
  Calendar,
  Camera,
  Clock,
  Edit,
  Gamepad2,
  Heart,
  Save,
  Settings,
  Star,
  Trophy,
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

const AVATAR_FALLBACK = "/assets/default-cover-male.svg";

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
    { key: "singlePlayer", label: "单人游戏" },
    { key: "multiPlayer", label: "多人游戏" },
    { key: "pve", label: "PVE" },
    { key: "pvp", label: "PVP" },
  ];
  return (
    <div className="space-y-4">
      {rows.map(({ key, label }) => (
        <div key={key} className="flex justify-between items-center gap-3">
          <span className="text-gray-700 shrink-0">{label}</span>
          <div className="w-32 bg-gray-200 rounded-full h-2 shrink-0">
            <div
              className="progress-bar-fill"
              style={{ width: `${playStyle[key]}%` }}
            />
          </div>
          <span className="text-gray-600 font-medium shrink-0 w-10 text-right">
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
      <div className="text-center py-4 text-gray-500">
        <p>还没有选择最喜欢的游戏</p>
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
            <h4 className="font-semibold text-gray-800 truncate">
              {game.name}
            </h4>
            <p className="text-sm text-gray-600">
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
    { key: "singlePlayer", label: "单人游戏" },
    { key: "multiPlayer", label: "多人游戏" },
    { key: "pve", label: "PVE" },
    { key: "pvp", label: "PVP" },
  ];

  return (
    <Modal open={open} onClose={onClose} title="编辑游戏风格">
      <div className="space-y-4">
        {sliders.map(({ key, label }) => (
          <div key={key}>
            <label className="block mb-2 text-gray-700">{label}</label>
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
            <div className="flex justify-between text-sm text-gray-600">
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
    <Modal open={open} onClose={onClose} title="编辑最喜欢的游戏">
      <div className="space-y-4 max-h-80 overflow-y-auto">
        {allGames.length === 0 ? (
          <p className="text-gray-500 text-center">还没有添加任何游戏</p>
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
          "保存失败：头像或数据过大，请换一张较小的图片",
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
    return {
      totalGames: allGames.length,
      totalPlaytime,
      totalAchievements: achievements.length,
      memberDays: memberDaysSince(profile.joinDate),
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
      <p className="text-center py-16 text-gray-500">加载中…</p>
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
    persist(next, "标签已添加");
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
      <section className="bg-gradient-to-br from-blue-50 to-cyan-100 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-8 md:p-12 text-center">
              <div className="profile-avatar mb-6 mx-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarSrc}
                  alt="头像"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = AVATAR_FALLBACK;
                  }}
                />
                <label className="avatar-upload cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      handleAvatarChange(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <Camera className="w-4 h-4 inline mr-1" />
                  更换头像
                </label>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                {profile.name}
              </h1>
              <p className="text-xl text-gray-600 mb-4">{profile.title}</p>
              <div className="flex flex-wrap justify-center gap-3 mb-6">
                <TagBadges tags={profile.tags} />
              </div>
              <p className="text-gray-600 max-w-2xl mx-auto">{profile.bio}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
            游戏数据
          </h2>
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="stat-card">
                <div className="stat-icon bg-blue-100 text-blue-500">
                  <Gamepad2 className="w-8 h-8" />
                </div>
                <div className="stat-number">{stats.totalGames}</div>
                <div className="stat-label">游戏总数</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon bg-cyan-50 text-cyan-500">
                  <Clock className="w-8 h-8" />
                </div>
                <div className="stat-number">{stats.totalPlaytime}</div>
                <div className="stat-label">总游戏时长</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon bg-purple-100 text-purple-500">
                  <Trophy className="w-8 h-8" />
                </div>
                <div className="stat-number">{stats.totalAchievements}</div>
                <div className="stat-label">获得成就</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon bg-green-100 text-green-500">
                  <Calendar className="w-8 h-8" />
                </div>
                <div className="stat-number">{stats.memberDays}</div>
                <div className="stat-label">加入天数</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
            游戏偏好
          </h2>
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h3 className="text-xl font-semibold mb-6 text-gray-800 flex items-center">
                  <Heart className="w-6 h-6 text-red-500 mr-2" />
                  最喜欢的游戏
                </h3>
                <FavoriteGamesList games={favoriteGames} />
                <button
                  type="button"
                  className="btn-primary w-full mt-6"
                  onClick={() => setFavoritesOpen(true)}
                >
                  <Edit className="w-5 h-5 inline mr-2" />
                  编辑偏好
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-8">
                <h3 className="text-xl font-semibold mb-6 text-gray-800 flex items-center">
                  <Settings className="w-6 h-6 text-blue-500 mr-2" />
                  游戏风格
                </h3>
                <PlayStyleBars playStyle={playStyle} />
                <button
                  type="button"
                  className="btn-primary w-full mt-6"
                  onClick={() => setPlayStyleOpen(true)}
                >
                  <Edit className="w-5 h-5 inline mr-2" />
                  编辑风格
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
            个人设置
          </h2>
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="profile-name-input"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  用户名
                </label>
                <input
                  id="profile-name-input"
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="profile-title-input"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  个人头衔
                </label>
                <input
                  id="profile-title-input"
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="profile-bio-input"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  个人简介
                </label>
                <textarea
                  id="profile-bio-input"
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formBio}
                  onChange={(e) => setFormBio(e.target.value)}
                />
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          persist(next, "最喜欢的游戏已更新");
          setFavoritesOpen(false);
        }}
      />

      <PlayStyleModal
        open={playStyleOpen}
        initial={playStyle}
        onClose={() => setPlayStyleOpen(false)}
        onSave={(style) => {
          const next = { ...profile, playStyle: style };
          persist(next, "游戏风格已更新");
          setPlayStyleOpen(false);
        }}
      />
    </>
  );
}
