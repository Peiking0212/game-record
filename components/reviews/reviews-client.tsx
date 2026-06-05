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
    <div className="review-stars" aria-label={`${rating} 鏄焋}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: i <= rating ? "#f59e0b" : "#9ca3af" }}>
          {i <= rating ? "鈽? : "鈽?}
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
      showToast("淇濆瓨澶辫触锛岃妫€鏌ュ瓨鍌ㄧ┖闂?, "error");
      return;
    }
    setItems(next);
    showToast(msg, "success");
  }

  return (
    <>
      <section className="bg-gradient-to-br from-blue-50 to-cyan-100 py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-[#223344] to-[#5B9BD5] bg-clip-text text-transparent">
            娓告垙璇勬祴
          </h1>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            璁板綍姣忔娓告垙鐨勬父鐜╀綋楠岋紝鍒嗕韩浣犵殑鐪熷疄璇勪环涓庢劅鍙?
          </p>
          <button
            type="button"
            className="btn-primary inline-flex items-center"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-5 h-5 mr-2" />
            娣诲姞璇勬祴
          </button>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto mb-12 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                鎼滅储娓告垙
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="杈撳叆娓告垙鍚嶇О..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                璇勫垎绛涢€?
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
              >
                <option value="all">鍏ㄩ儴璇勫垎</option>
                {[5, 4, 3, 2, 1].map((v) => (
                  <option key={v} value={String(v)}>
                    {v} 鏄?
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                鏍囩绛涢€?
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
              >
                <option value="all">鍏ㄩ儴鏍囩</option>
                {tagOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                鎺掑簭鏂瑰紡
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
              >
                <option value="date-desc">璇勬祴鏃ユ湡锛堟渶鏂帮級</option>
                <option value="date-asc">璇勬祴鏃ユ湡锛堟渶鏃╋級</option>
                <option value="rating-desc">璇勫垎锛堥珮鍒颁綆锛?/option>
                <option value="rating-asc">璇勫垎锛堜綆鍒伴珮锛?/option>
                <option value="hours-desc">娓哥帺鏃堕暱锛堝鍒板皯锛?/option>
                <option value="hours-asc">娓哥帺鏃堕暱锛堝皯鍒板锛?/option>
              </select>
            </div>
          </div>

          <div className="max-w-6xl mx-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <MessageSquare className="w-20 h-20 text-gray-300 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-700 mb-4">
                  杩樻病鏈夋父鎴忚瘎娴?
                </h3>
                <p className="text-gray-600 mb-8">
                  鐐瑰嚮銆屾坊鍔犺瘎娴嬨€嶆寜閽紝寮€濮嬭褰曚綘鐨勬父鎴忎綋楠屽惂
                </p>
                <button
                  type="button"
                  className="btn-primary inline-flex items-center"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  娣诲姞璇勬祴
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
                              缂栬緫
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
                              鏃堕暱: {String(playtime)} 灏忔椂
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
        title="娣诲姞娓告垙璇勬祴"
        initial={null}
        games={games}
        onClose={() => setAddOpen(false)}
        onSubmit={(values) => {
          if (!values.gameId) {
            showToast("璇蜂粠娓告垙搴撻€夋嫨娓告垙", "error");
            return;
          }
          const gameFields = resolveGameFieldsFromSelect(values.gameId);
          if (!gameFields.gameId) {
            showToast("璇蜂粠娓告垙搴撻€夋嫨娓告垙", "error");
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
          persist([...items, newItem], "璇勬祴宸叉坊鍔?);
        }}
      />

      <ReviewModal
        open={!!editItem}
        title="缂栬緫娓告垙璇勬祴"
        initial={editItem}
        games={games}
        onClose={() => setEditItem(null)}
        onSubmit={(values) => {
          if (!editItem) return;
          if (!values.gameId) {
            showToast("璇蜂粠娓告垙搴撻€夋嫨娓告垙", "error");
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
          persist(next, "璇勬祴宸叉洿鏂?);
          setEditItem(null);
        }}
      />

      <Modal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        title="纭鍒犻櫎"
        maxWidth="md"
      >
        <p className="text-gray-700 mb-6">纭畾瑕佸垹闄よ繖绡囨父鎴忚瘎娴嬪悧锛?/p>
        <div className="flex gap-3 justify-end">
          <button type="button" className="btn-secondary" onClick={() => setDeleteItem(null)}>
            鍙栨秷
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              if (!deleteItem) return;
              persist(items.filter((it) => it.id !== deleteItem.id), "璇勬祴宸插垹闄?);
              setDeleteItem(null);
            }}
          >
            鍒犻櫎
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
            娓告垙锛堜粠娓告垙搴撻€夋嫨锛?<span className="text-red-500">*</span>
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
            <option value="">閫夋嫨娓告垙搴撲腑鐨勬父鎴?/option>
            {games.map((g) => (
              <option key={String(g.id)} value={String(g.id)}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            娓告垙鍚嶇О锛堣嚜鍔ㄥ～鍏咃級
          </label>
          <input
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="閫夋嫨娓告垙鍚庤嚜鍔ㄥ～鍏?
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">娓告垙灏侀潰 URL</label>
          <input
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="杈撳叆灏侀潰鍥剧墖URL锛堝彲閫夛級"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            璇勫垎 <span className="text-red-500">*</span>
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
                  {i <= rating ? "鈽? : "鈽?}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">鏍囩锛堝彲澶氶€夛級</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">璇勮</label>
          <textarea
            rows={3}
            maxLength={200}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="鍐欎笅浣犵殑绠€鐭瘎浠?.."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1 text-right">
            {Math.max(0, 200 - remaining)}/{200}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">娓哥帺鏃堕暱锛堝皬鏃讹級</label>
          <input
            type="number"
            min={0}
            step={0.5}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="杈撳叆娓哥帺鎬绘椂闀?
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">澶囨敞</label>
          <textarea
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            鍙栨秷
          </button>
          <button type="submit" className="btn-primary">
            淇濆瓨
          </button>
        </div>
      </form>
    </Modal>
  );
}

