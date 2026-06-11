"use client";

import { MessageSquare, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { defaultGameCover, formatDate } from "@/lib/game-utils";
import {
  allUsedTags,
  getReviews,
  REVIEW_TAGS,
  saveReviews,
  type ReviewItem,
} from "@/lib/reviews";
import { getGames, resolveGameFieldsFromSelect } from "@/lib/game-data";

type SortBy =
  | "date-desc"
  | "date-asc"
  | "rating-desc"
  | "rating-asc"
  | "hours-desc"
  | "hours-asc";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="review-stars" aria-label={`${rating} 星`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: i <= rating ? "#f59e0b" : "#9ca3af" }}>
          {i <= rating ? "★" : "☆"}
        </span>
      ))}
    </div>
  );
}

function Cover({ url, name }: { url?: string; name: string }) {
  const src = url?.trim() || defaultGameCover(name);
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={name}
      className="review-cover-img"
      onError={(e) => {
        (e.target as HTMLImageElement).src = defaultGameCover(name);
      }}
    />
  );
}

function TagPills({ tags }: { tags?: string[] }) {
  if (!tags?.length) return null;
  return (
    <div className="review-tags">
      {tags.map((t) => (
        <span key={t} className="tag-pill">
          {t}
        </span>
      ))}
    </div>
  );
}

export function ReviewsClient() {
  const { showToast } = useToast();
  const [items, setItems] = useState<ReviewItem[]>([]);

  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortBy>("date-desc");

  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<ReviewItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<ReviewItem | null>(null);

  const games = useMemo(() => getGames(), []);

  useEffect(() => {
    setItems(getReviews());
  }, []);

  const tagOptions = useMemo(() => {
    const used = allUsedTags(items).filter((t) => !REVIEW_TAGS.includes(t as never));
    return [...REVIEW_TAGS, ...used];
  }, [items]);

  const filtered = useMemo(() => {
    let list = [...items];
    const keyword = search.trim().toLowerCase();
    if (keyword) {
      list = list.filter((it) => it.name.toLowerCase().includes(keyword));
    }
    if (ratingFilter !== "all") {
      const v = parseInt(ratingFilter, 10);
      list = list.filter((it) => (it.rating || 0) === v);
    }
    if (tagFilter !== "all") {
      list = list.filter((it) => (it.tags || []).includes(tagFilter));
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
        case "date-asc":
          return new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
        case "rating-desc":
          return (b.rating || 0) - (a.rating || 0);
        case "rating-asc":
          return (a.rating || 0) - (b.rating || 0);
        case "hours-desc":
          return (
            (parseFloat(b.playtime || b.hours || "") || 0) -
            (parseFloat(a.playtime || a.hours || "") || 0)
          );
        case "hours-asc":
          return (
            (parseFloat(a.playtime || a.hours || "") || 0) -
            (parseFloat(b.playtime || b.hours || "") || 0)
          );
        default:
          return 0;
      }
    });

    return list;
  }, [items, ratingFilter, search, sortBy, tagFilter]);

  function persist(next: ReviewItem[], msg: string) {
    if (!saveReviews(next)) {
      showToast("保存失败，请检查存储空间", "error");
      return;
    }
    setItems(next);
    showToast(msg, "success");
  }

  return (
    <>
      <section className="anime-hero py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 gradient-text">
            游戏评测
          </h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto" style={{ color: "var(--text-dark)" }}>
            记录每款游戏的游玩体验，分享你的真实评价与感受
          </p>
          <button
            type="button"
            className="btn-primary inline-flex items-center"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-5 h-5 mr-2" />
            添加评测
          </button>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto mb-12 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="glass-card p-4">
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-gray)" }}>
                搜索游戏
              </label>
              <div className="relative">
                <input
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
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-gray)" }}>
                评分筛选
              </label>
              <select
                className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
              >
                <option value="all">全部评分</option>
                {[5, 4, 3, 2, 1].map((v) => (
                  <option key={v} value={String(v)}>
                    {v} 星
                  </option>
                ))}
              </select>
            </div>

            <div className="glass-card p-4">
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-gray)" }}>
                标签筛选
              </label>
              <select
                className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
              >
                <option value="all">全部标签</option>
                {tagOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="glass-card p-4">
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-gray)" }}>
                排序方式
              </label>
              <select
                className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
              >
                <option value="date-desc">评测日期（最新）</option>
                <option value="date-asc">评测日期（最早）</option>
                <option value="rating-desc">评分（高到低）</option>
                <option value="rating-asc">评分（低到高）</option>
                <option value="hours-desc">游玩时长（多到少）</option>
                <option value="hours-asc">游玩时长（少到多）</option>
              </select>
            </div>
          </div>

          <div className="max-w-6xl mx-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-16 glass-card">
                <MessageSquare className="w-20 h-20 mx-auto mb-6" style={{ color: "var(--text-light)" }} />
                <h3 className="text-2xl font-bold mb-4" style={{ color: "var(--text-dark)" }}>
                  暂无游戏评测
                </h3>
                <p className="mb-8" style={{ color: "var(--text-gray)" }}>
                  点击「添加评测」按钮，开始记录你的游戏体验吧
                </p>
                <button
                  type="button"
                  className="btn-primary inline-flex items-center"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  添加评测
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {filtered.map((item) => {
                  const reviewText = item.review || item.comment || "";
                  const playtime =
                    item.playtime !== undefined && item.playtime !== null && item.playtime !== ""
                      ? item.playtime
                      : item.hours;
                  return (
                    <div key={item.id} className="review-card">
                      <div className="review-cover">
                        <Cover url={item.coverUrl || item.cover} name={item.name} />
                      </div>
                      <div className="review-info">
                        <div className="review-info-header">
                          <h3 className="review-name">{item.name}</h3>
                          <div className="review-actions">
                            <button
                              type="button"
                              className="btn-edit-review"
                              onClick={() => setEditItem(item)}
                            >
                              编辑
                            </button>
                            <button
                              type="button"
                              className="btn-delete-review"
                              onClick={() => setDeleteItem(item)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <Stars rating={item.rating || 0} />
                        <TagPills tags={item.tags} />
                        {reviewText && <p className="review-text">{reviewText}</p>}
                        <div className="review-meta">
                          {playtime ? (
                            <span className="review-playtime">
                              时长: {String(playtime)} 小时
                            </span>
                          ) : null}
                          <span className="review-date">{formatDate(item.date)}</span>
                        </div>
                        {item.notes ? <p className="review-notes">{item.notes}</p> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      <ReviewModal
        open={addOpen}
        title="添加游戏评测"
        initial={null}
        games={games}
        onClose={() => setAddOpen(false)}
        onSubmit={(values) => {
          if (!values.gameId) {
            showToast("请从游戏库选择游戏", "error");
            return;
          }
          const gameFields = resolveGameFieldsFromSelect(values.gameId);
          if (!gameFields.gameId) {
            showToast("请从游戏库选择游戏", "error");
            return;
          }
          const newItem: ReviewItem = {
            id: `rv_${Date.now()}`,
            gameId: gameFields.gameId,
            name: gameFields.name || values.name.trim(),
            coverUrl: values.coverUrl.trim(),
            rating: values.rating,
            tags: values.tags,
            review: values.comment.trim(),
            playtime: values.hours.trim(),
            notes: values.notes.trim(),
            date: new Date().toISOString(),
          };
          persist([...items, newItem], "评测添加成功");
        }}
      />

      <ReviewModal
        open={!!editItem}
        title="编辑游戏评测"
        initial={editItem}
        games={games}
        onClose={() => setEditItem(null)}
        onSubmit={(values) => {
          if (!editItem) return;
          if (!values.gameId) {
            showToast("请从游戏库选择游戏", "error");
            return;
          }
          const gameFields = resolveGameFieldsFromSelect(values.gameId);
          const next = items.map((it) =>
            it.id === editItem.id
              ? {
                  ...it,
                  gameId: gameFields.gameId || it.gameId,
                  name: gameFields.name || values.name.trim(),
                  coverUrl: values.coverUrl.trim(),
                  rating: values.rating,
                  tags: values.tags,
                  review: values.comment.trim(),
                  playtime: values.hours.trim(),
                  notes: values.notes.trim(),
                }
              : it,
          );
          persist(next, "评测修改成功");
          setEditItem(null);
        }}
      />

      <Modal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        title="确认删除"
        maxWidth="md"
      >
        <p className="text-gray-700 mb-6">确定要删除这条游戏评测吗？</p>
        <div className="flex gap-3 justify-end">
          <button type="button" className="btn-secondary" onClick={() => setDeleteItem(null)}>
            取消
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              if (!deleteItem) return;
              persist(items.filter((it) => it.id !== deleteItem.id), "评测已删除");
              setDeleteItem(null);
            }}
          >
            删除
          </button>
        </div>
      </Modal>
    </>
  );
}

function ReviewModal({
  open,
  title,
  initial,
  games,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  initial: ReviewItem | null;
  games: ReturnType<typeof getGames>;
  onClose: () => void;
  onSubmit: (values: {
    gameId: string;
    name: string;
    coverUrl: string;
    rating: number;
    tags: string[];
    comment: string;
    hours: string;
    notes: string;
  }) => void;
}) {
  const [gameId, setGameId] = useState("");
  const [name, setName] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [rating, setRating] = useState(3);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [hours, setHours] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setGameId(String(initial?.gameId ?? ""));
    setName(initial?.name ?? "");
    setCoverUrl(initial?.coverUrl ?? "");
    setRating(initial?.rating ?? 3);
    setTags(initial?.tags ?? []);
    setComment((initial?.review ?? initial?.comment ?? "") as string);
    setHours((initial?.playtime ?? initial?.hours ?? "") as string);
    setNotes(initial?.notes ?? "");
  }, [open, initial]);

  const remaining = 200 - comment.length;

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="lg">
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ gameId, name, coverUrl, rating, tags, comment, hours, notes });
          onClose();
        }}
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            游戏（从游戏库选择）<span className="text-red-500">*</span>
          </label>
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={gameId}
            onChange={(e) => {
              const id = e.target.value;
              setGameId(id);
              const gf = resolveGameFieldsFromSelect(id);
              if (gf?.name) setName(gf.name);
            }}
          >
            <option value="">选择游戏库内的游戏</option>
            {games.map((g) => (
              <option key={String(g.id)} value={String(g.id)}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            游戏名称（自动回填）
          </label>
          <input
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="选择游戏后自动回填"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">游戏封面 URL</label>
          <input
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="输入封面图片URL（选填）"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            评分 <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                className="px-2 py-1 rounded"
                onClick={() => setRating(i)}
              >
                <span style={{ color: i <= rating ? "#f59e0b" : "#9ca3af" }}>
                  {i <= rating ? "★" : "☆"}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">标签（可多选）</label>
          <div className="flex flex-wrap gap-2">
            {REVIEW_TAGS.map((t) => {
              const active = tags.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  className={`tag-option inline-flex items-center px-3 py-1.5 rounded-full border cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition ${
                    active ? "active" : ""
                  }`}
                  onClick={() =>
                    setTags((prev) =>
                      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
                    )
                  }
                >
                  <span className="text-sm text-gray-600">{t}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">评语</label>
          <textarea
            rows={3}
            maxLength={200}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="写下你的简短评价……"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1 text-right">
            {Math.max(0, 200 - remaining)}/{200}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">游玩时长（小时）</label>
          <input
            type="number"
            min={0}
            step={0.5}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="输入游玩总时长"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">备注</label>
          <textarea
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="btn-primary">
            保存
          </button>
        </div>
      </form>
    </Modal>
  );
}