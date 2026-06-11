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

function DynamicIcon({ name, className }: { name?: string; className?: string }) {
  const iconName = safeLucideIcon(name);
  const key = toPascal(iconName) as keyof typeof LucideIcons;
  const Icon = (LucideIcons[key] as LucideIcon) || Trophy;
  return <Icon className={className} />;
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
        <label className="block text-sm font-medium text-gray-700 mb-2">????</label>
        <input
          type="text"
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={values.title}
          onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">????</label>
        <textarea
          required
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">????</label>
        <select
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={values.gameId}
          onChange={(e) => setValues((v) => ({ ...v, gameId: e.target.value }))}
        >
          <option value="">?????</option>
          {games.map((g) => (
            <option key={String(g.id)} value={String(g.id)}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">????</label>
        <input
          required
          type="date"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={values.date}
          onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">????</label>
        <select
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          <label className="block text-sm font-medium text-gray-700 mb-2">????</label>
          <label className="upload-area block cursor-pointer">
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
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2 text-center">??????????JPG/PNG??</p>
          </label>
          {values.screenshot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={values.screenshot}
              alt="????"
              className="w-full mt-3 rounded-lg border border-gray-100"
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
      showToast("??????????", "error");
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
      showToast("????????", "error");
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
    if (!persist([...items, nextItem], "??????")) return;
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
      showToast("????????", "error");
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
    if (!persist(next, "??????")) return;
    setEditItem(null);
  };

  const onDelete = (id: number | string) => {
    if (!window.confirm("?????????????????????")) return;
    const next = items.filter((it) => String(it.id) !== String(id));
    persist(next, "??????");
    if (detailItem && String(detailItem.id) === String(id)) setDetailItem(null);
  };

  return (
    <>
      <section className="bg-gradient-to-br from-blue-50 to-cyan-100 py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-[#223344] to-[#5B9BD5] bg-clip-text text-transparent">
            ????
          </h1>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            ????????????????????
          </p>
          <button className="btn-primary" onClick={() => setAddOpen(true)}>
            <Plus className="w-5 h-5 inline mr-2" />
            ????
          </button>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StatCard
              icon={<Trophy className="w-8 h-8" />}
              iconClass="bg-yellow-100 text-yellow-500"
              value={String(stats.total)}
              label="????"
            />
            <StatCard
              icon={<Calendar className="w-8 h-8" />}
              iconClass="bg-blue-100 text-blue-500"
              value={String(stats.recent)}
              label="????"
            />
            <StatCard
              icon={<Trophy className="w-8 h-8" />}
              iconClass="bg-green-100 text-green-500"
              value={String(stats.gameCount)}
              label="?????"
            />
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto mb-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">????</label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="???????????..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">????</label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={gameFilter}
                onChange={(e) => setGameFilter(e.target.value)}
              >
                <option value="all">????</option>
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
              <div className="text-center py-16">
                <Trophy className="w-20 h-20 text-gray-300 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-700 mb-4">??????</h3>
                <p className="text-gray-600 mb-8">??????????????</p>
                <button className="btn-primary" onClick={() => setAddOpen(true)}>
                  <Plus className="w-5 h-5 inline mr-2" />
                  ????
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
                    <div className="p-6 bg-white rounded-lg shadow-lg border border-gray-100 h-full">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 flex items-center justify-center">
                          <DynamicIcon name={achievement.icon} className="text-white w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-800 truncate">{achievement.title}</h4>
                          <p className="text-sm text-gray-600 truncate">{achievement.gameName}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            className="text-blue-500 hover:text-blue-600"
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
                      <p className="text-gray-600 mb-3 line-clamp-2">{achievement.description}</p>
                      <div className="text-sm text-gray-500">?????{formatDateISO(achievement.date)}</div>
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

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">???????</h2>
          <div className="max-w-3xl mx-auto">
            <div className="relative pl-8 border-l-2 border-blue-200">
              {timeline.map((achievement) => (
                <div key={String(achievement.id)} className="mb-8 relative">
                  <div className="absolute -left-[25px] w-6 h-6 rounded-full bg-yellow-100 border-4 border-white flex items-center justify-center">
                    <DynamicIcon name={achievement.icon} className="w-3 h-3 text-yellow-500" />
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <DynamicIcon name={achievement.icon} className="w-5 h-5 text-yellow-500" />
                      <h4 className="font-bold text-gray-800">{achievement.title}</h4>
                    </div>
                    <p className="text-gray-600 mb-2">{achievement.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">{formatDateISO(achievement.date)}</span>
                      <span className="text-sm font-medium text-blue-600">{achievement.gameName}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="????">
        <AchievementForm
          values={addForm}
          setValues={setAddForm}
          games={games}
          onSubmit={onAddSubmit}
          submitText="????"
          showScreenshotField
        />
      </Modal>

      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="????">
        <AchievementForm
          values={editForm}
          setValues={setEditForm}
          games={games}
          onSubmit={onEditSubmit}
          submitText="????"
        />
      </Modal>

      <Modal
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        title={detailItem?.title || "????"}
        maxWidth="xl"
      >
        {detailItem ? (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 flex items-center justify-center mx-auto mb-4">
                <DynamicIcon name={detailItem.icon} className="text-white w-10 h-10" />
              </div>
              <p className="text-lg text-gray-600">{detailItem.gameName}</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">????</h4>
              <p className="text-gray-600">{detailItem.description}</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">????:</span>
                <span className="font-medium">{formatDateISO(detailItem.date)}</span>
              </div>
            </div>
            {detailItem.screenshot ? (
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">????</h4>
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
                ????
              </button>
              <button
                className="btn-danger"
                onClick={() => onDelete(detailItem.id)}
              >
                <Trash2 className="w-5 h-5 inline mr-2" />
                ????
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
