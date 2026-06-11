"use client";

import {
  Calendar,
  Edit,
  Image as ImageIcon,
  Plus,
  Search,
  Trash2,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { getGames, migrateLegacyAchievements, resolveGameFieldsFromSelect } from "@/lib/game-data";
import type { GameRecord } from "@/lib/game-types";
import { formatDateISO, safeLucideIcon } from "@/lib/game-utils";
import {
  getAchievements,
  saveAchievements,
  type AchievementItem,
} from "@/lib/achievements";

const ICON_OPTIONS = [
  "trophy",
  "star",
  "medal",
  "gift",
  "award",
  "target",
  "flag",
  "crown",
] as const;

type FormValues = {
  title: string;
  description: string;
  gameId: string;
  date: string;
  icon: string;
  screenshot?: string;
};

function toPascal(name: string): string {
  return name
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

function DynamicIcon({ name, className, style }: { name?: string; className?: string; style?: React.CSSProperties }) {
  const iconName = safeLucideIcon(name);
  const key = toPascal(iconName) as keyof typeof LucideIcons;
  const Icon = (LucideIcons[key] as LucideIcon) || Trophy;
  return <Icon className={className} style={style} />;
}

function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function AchievementForm({
  values,
  setValues,
  games,
  onSubmit,
  submitText,
  showScreenshotField = false,
}: {
  values: FormValues;
  setValues: React.Dispatch<React.SetStateAction<FormValues>>;
  games: GameRecord[];
  onSubmit: (e: React.FormEvent) => void;
  submitText: string;
  showScreenshotField?: boolean;
}) {
  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-gray)" }}>成就名称</label>
        <input
          type="text"
          required
          className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:border-transparent"
          style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
          value={values.title}
          onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-gray)" }}>成就描述</label>
        <textarea
          required
          rows={3}
          className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:border-transparent"
          style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-gray)" }}>所属游戏</label>
        <select
          required
          className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:border-transparent"
          style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
          value={values.gameId}
          onChange={(e) => setValues((v) => ({ ...v, gameId: e.target.value }))}
        >
          <option value="">请选择游戏</option>
          {games.map((g) => (
            <option key={String(g.id)} value={String(g.id)}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-gray)" }}>解锁日期</label>
        <input
          required
          type="date"
          className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:border-transparent"
          style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
          value={values.date}
          onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-gray)" }}>图标样式</label>
        <select
          required
          className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:border-transparent"
          style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
          value={values.icon}
          onChange={(e) => setValues((v) => ({ ...v, icon: e.target.value }))}
        >
          {ICON_OPTIONS.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </div>

      {showScreenshotField && (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-gray)" }}>成就截图</label>
          <label className="upload-area block cursor-pointer glass-card p-4">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () =>
                  setValues((v) => ({ ...v, screenshot: String(reader.result || "") }));
                reader.readAsDataURL(file);
                e.currentTarget.value = "";
              }}
            />
            <ImageIcon className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--text-light)" }} />
            <p className="mb-2 text-center" style={{ color: "var(--text-gray)" }}>点击上传图片，仅支持JPG/PNG格式</p>
          </label>
          {values.screenshot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={values.screenshot}
              alt="预览截图"
              className="w-full mt-3 rounded-lg"
              style={{ border: "1px solid var(--border-glass)" }}
            />
          ) : null}
        </div>
      )}

      <button type="submit" className="btn-primary w-full">
        <Plus className="w-5 h-5 inline mr-2" />
        {submitText}
      </button>
    </form>
  );
}

export function AchievementsClient() {
  const { showToast } = useToast();
  const [items, setItems] = useState<AchievementItem[]>([]);
  const [games, setGames] = useState<GameRecord[]>([]);
  const [search, setSearch] = useState("");
  const [gameFilter, setGameFilter] = useState("all");

  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<AchievementItem | null>(null);
  const [detailItem, setDetailItem] = useState<AchievementItem | null>(null);

  const [addForm, setAddForm] = useState<FormValues>({
    title: "",
    description: "",
    gameId: "",
    date: todayIso(),
    icon: "trophy",
  });
  const [editForm, setEditForm] = useState<FormValues>({
    title: "",
    description: "",
    gameId: "",
    date: todayIso(),
    icon: "trophy",
  });

  useEffect(() => {
    migrateLegacyAchievements();
    setItems(getAchievements());
    setGames(getGames());
  }, []);

  const persist = (next: AchievementItem[], message: string) => {
    if (!saveAchievements(next)) {
      showToast("保存失败，请稍后重试", "error");
      return false;
    }
    setItems(next);
    showToast(message, "success");
    return true;
  };

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return [...items]
      .filter((it) => {
        if (keyword) {
          const titleHit = it.title.toLowerCase().includes(keyword);
          const gameHit = it.gameName.toLowerCase().includes(keyword);
          if (!titleHit && !gameHit) return false;
        }
        if (gameFilter !== "all") {
          return String(it.gameId ?? "") === String(gameFilter);
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [items, search, gameFilter]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const recent = items.filter((a) => {
      const d = new Date(a.date);
      return !Number.isNaN(d.getTime()) && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;
    const gameCount = new Set(items.map((a) => String(a.gameId || a.gameName))).size;
    return { total: items.length, recent, gameCount };
  }, [items]);

  const timeline = useMemo(() => filtered.slice(0, 6), [filtered]);

  const onAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const gameFields = resolveGameFieldsFromSelect(addForm.gameId);
    if (!gameFields?.gameId) {
      showToast("必须选择对应游戏", "error");
      return;
    }
    const nextItem: AchievementItem = {
      id: Date.now(),
      title: addForm.title.trim(),
      description: addForm.description.trim(),
      gameId: gameFields.gameId ?? undefined,
      gameName: gameFields.gameName || "",
      date: addForm.date,
      icon: addForm.icon,
      screenshot: addForm.screenshot,
    };
    if (!persist([...items, nextItem], "新增成就成功")) return;
    setAddOpen(false);
    setAddForm({
      title: "",
      description: "",
      gameId: "",
      date: todayIso(),
      icon: "trophy",
    });
  };

  const openEdit = (item: AchievementItem) => {
    setEditItem(item);
    setEditForm({
      title: item.title,
      description: item.description,
      gameId: String(item.gameId || ""),
      date: formatDateISO(item.date),
      icon: item.icon || "trophy",
      screenshot: item.screenshot,
    });
  };

  const onEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    const gameFields = resolveGameFieldsFromSelect(editForm.gameId);
    if (!gameFields?.gameId) {
      showToast("必须选择对应游戏", "error");
      return;
    }
    const next = items.map((it) =>
      String(it.id) !== String(editItem.id)
        ? it
        : {
            ...it,
            title: editForm.title.trim(),
            description: editForm.description.trim(),
            gameId: gameFields.gameId ?? undefined,
            gameName: gameFields.gameName || "",
            date: editForm.date,
            icon: editForm.icon,
          },
    );
    if (!persist(next, "修改成就成功")) return;
    setEditItem(null);
  };

  const onDelete = (id: number | string) => {
    if (!window.confirm("确定要删除这条成就记录吗？删除后无法恢复！")) return;
    const next = items.filter((it) => String(it.id) !== String(id));
    persist(next, "删除成就成功");
    if (detailItem && String(detailItem.id) === String(id)) setDetailItem(null);
  };

  return (
    <>
      <section className="anime-hero py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 gradient-text">
            游戏成就
          </h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto" style={{ color: "var(--text-dark)" }}>
            记录游戏解锁的各类成就，收藏高光游戏瞬间
          </p>
          <button className="btn-primary" onClick={() => setAddOpen(true)}>
            <Plus className="w-5 h-5 inline mr-2" />
            添加成就
          </button>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StatCard
              icon={<Trophy className="w-8 h-8" />}
              iconClass="bg-yellow-100 text-yellow-500"
              value={String(stats.total)}
              label="总成就数"
            />
            <StatCard
              icon={<Calendar className="w-8 h-8" />}
              iconClass="bg-blue-100 text-blue-500"
              value={String(stats.recent)}
              label="本月解锁"
            />
            <StatCard
              icon={<Trophy className="w-8 h-8" />}
              iconClass="bg-green-100 text-green-500"
              value={String(stats.gameCount)}
              label="涉及游戏数"
            />
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto mb-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-4">
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-gray)" }}>搜索成就</label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:border-transparent"
                  style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
                  placeholder="输入成就名或游戏名搜索..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-light)" }} />
              </div>
            </div>
            <div className="glass-card p-4">
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-gray)" }}>筛选游戏</label>
              <select
                className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
                value={gameFilter}
                onChange={(e) => setGameFilter(e.target.value)}
              >
                <option value="all">全部游戏</option>
                {games.map((g) => (
                  <option key={String(g.id)} value={String(g.id)}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="max-w-6xl mx-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-16 glass-card">
                <Trophy className="w-20 h-20 mx-auto mb-6" style={{ color: "var(--text-light)" }} />
                <h3 className="text-2xl font-bold mb-4" style={{ color: "var(--text-dark)" }}>暂无成就数据</h3>
                <p className="mb-8" style={{ color: "var(--text-gray)" }}>快去添加第一条游戏成就记录吧</p>
                <button className="btn-primary" onClick={() => setAddOpen(true)}>
                  <Plus className="w-5 h-5 inline mr-2" />
                  添加成就
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filtered.map((achievement) => (
                  <button
                    type="button"
                    key={String(achievement.id)}
                    className="achievement-card cursor-pointer text-left"
                    onClick={() => setDetailItem(achievement)}
                  >
                    <div className="p-6 glass-card-strong h-full">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center">
                          <DynamicIcon name={achievement.icon} className="text-white w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold truncate" style={{ color: "var(--text-dark)" }}>{achievement.title}</h4>
                          <p className="text-sm truncate" style={{ color: "var(--text-gray)" }}>{achievement.gameName}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            className="hover:opacity-80"
                            style={{ color: "var(--primary)" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(achievement);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            className="text-red-500 hover:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(achievement.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="mb-3 line-clamp-2" style={{ color: "var(--text-gray)" }}>{achievement.description}</p>
                      <div className="text-sm" style={{ color: "var(--text-light)" }}>解锁日期：{formatDateISO(achievement.date)}</div>
                      {achievement.screenshot ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={achievement.screenshot}
                          alt={achievement.title}
                          className="w-full h-32 object-cover rounded-lg mt-4"
                        />
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 gradient-text">成就解锁时间线</h2>
          <div className="max-w-3xl mx-auto">
            <div className="relative pl-8 border-l-2" style={{ borderColor: "var(--border-glass)" }}>
              {timeline.map((achievement) => (
                <div key={String(achievement.id)} className="mb-8 relative">
                  <div className="absolute -left-[25px] w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "var(--bg-glass)", border: "2px solid var(--border-light)" }}>
                    <DynamicIcon name={achievement.icon} className="w-3 h-3" style={{ color: "var(--primary)" }} />
                  </div>
                  <div className="glass-card-strong p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <DynamicIcon name={achievement.icon} className="w-5 h-5" style={{ color: "var(--primary)" }} />
                      <h4 className="font-bold" style={{ color: "var(--text-dark)" }}>{achievement.title}</h4>
                    </div>
                    <p className="mb-2" style={{ color: "var(--text-gray)" }}>{achievement.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm" style={{ color: "var(--text-light)" }}>{formatDateISO(achievement.date)}</span>
                      <span className="text-sm font-medium" style={{ color: "var(--primary)" }}>{achievement.gameName}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="添加成就">
        <AchievementForm
          values={addForm}
          setValues={setAddForm}
          games={games}
          onSubmit={onAddSubmit}
          submitText="提交新增"
          showScreenshotField
        />
      </Modal>

      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="编辑成就">
        <AchievementForm
          values={editForm}
          setValues={setEditForm}
          games={games}
          onSubmit={onEditSubmit}
          submitText="保存修改"
        />
      </Modal>

      <Modal
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        title={detailItem?.title || "成就详情"}
        maxWidth="xl"
      >
        {detailItem ? (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center mx-auto mb-4">
                <DynamicIcon name={detailItem.icon} className="text-white w-10 h-10" />
              </div>
              <p className="text-lg" style={{ color: "var(--text-gray)" }}>{detailItem.gameName}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2" style={{ color: "var(--text-dark)" }}>成就描述</h4>
              <p style={{ color: "var(--text-gray)" }}>{detailItem.description}</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: "var(--text-gray)" }}>解锁日期:</span>
                <span className="font-medium">{formatDateISO(detailItem.date)}</span>
              </div>
            </div>
            {detailItem.screenshot ? (
              <div>
                <h4 className="font-semibold mb-2" style={{ color: "var(--text-dark)" }}>成就截图</h4>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={detailItem.screenshot} alt={detailItem.title} className="w-full rounded-lg" />
              </div>
            ) : null}
            <div className="flex gap-3">
              <button
                className="btn-primary flex-1"
                onClick={() => {
                  openEdit(detailItem);
                  setDetailItem(null);
                }}
              >
                <Edit className="w-5 h-5 inline mr-2" />
                编辑成就
              </button>
              <button
                className="btn-danger"
                onClick={() => onDelete(detailItem.id)}
              >
                <Trash2 className="w-5 h-5 inline mr-2" />
                删除成就
              </button>
            </div>
          </div>
        ) : null}
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