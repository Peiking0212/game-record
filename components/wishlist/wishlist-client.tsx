"use client";

import { Cloud, Heart, Plus, RefreshCw, Save, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LookupGameModal } from "@/components/wishlist/lookup-game-modal";
import { WishlistAlertsPanel } from "@/components/wishlist/wishlist-alerts-panel";
import { WishlistEmailAlertsPanel } from "@/components/wishlist/wishlist-email-alerts-panel";
import { WishlistTargetPriceRow } from "@/components/wishlist/wishlist-target-price-row";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatDate, defaultGameCover } from "@/lib/game-utils";
import { tryCreateClient } from "@/lib/supabase/client";
import {
  invalidateAlertContext,
  loadAlertContext,
  type AlertContext,
} from "@/lib/wishlist-alerts";
import {
  invalidateWishlistCatalogCache,
  loadWishlistWithFallback,
  searchWishlistCatalog,
  type CatalogGame,
} from "@/lib/wishlist-catalog";
import { invokeLookupGame, type LookupGameResponse } from "@/lib/wishlist-lookup";
import {
  getDealWatchRules,
  parsePlatformList,
  priorityClass,
  priorityLabel,
  saveDealWatchRules,
  saveWishlist,
  type DealWatchRules,
  type WishlistItem,
} from "@/lib/wishlist";

type SortBy =
  | "date-desc"
  | "date-asc"
  | "rating-desc"
  | "rating-asc"
  | "price-asc"
  | "price-desc";

const PLATFORM_OPTIONS = [
  "PC",
  "PlayStation",
  "Xbox",
  "Nintendo Switch",
  "手机",
  "其他",
] as const;

function Stars({ rating }: { rating: number }) {
  return (
    <span className="wishlist-stars" aria-label={`${rating} 星`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="star"
          style={{ color: i <= rating ? "#f59e0b" : "#9ca3af" }}
        >
          {i <= rating ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}

function WishlistCover({ cover, name }: { cover?: string; name: string }) {
  const src = cover?.trim() || defaultGameCover(name);
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={name}
      className="wishlist-cover-img"
      onError={(e) => {
        (e.target as HTMLImageElement).src = defaultGameCover(name);
      }}
    />
  );
}

export function WishlistClient() {
  const { showToast } = useToast();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [rules, setRules] = useState<DealWatchRules>({});

  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortBy>("date-desc");

  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<WishlistItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<WishlistItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [lookupTarget, setLookupTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [alertCtx, setAlertCtx] = useState<AlertContext | null>(null);
  const [alertsRefreshKey, setAlertsRefreshKey] = useState(0);

  const bumpAlerts = useCallback(() => {
    invalidateAlertContext();
    setAlertsRefreshKey((k) => k + 1);
  }, []);

  const reloadWishlist = useCallback(async () => {
    setLoading(true);
    try {
      const list = await loadWishlistWithFallback();
      setItems(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setRules(getDealWatchRules());
    void reloadWishlist();
    const supabase = tryCreateClient();
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const inSession = !!session;
      setSignedIn(inSession);
      if (inSession) {
        void reloadWishlist();
        void loadAlertContext(supabase).then(setAlertCtx);
      } else {
        setAlertCtx(null);
      }
    });
    void loadAlertContext(supabase).then(setAlertCtx);
    return () => sub.subscription.unsubscribe();
  }, [reloadWishlist]);

  useEffect(() => {
    if (!signedIn) {
      setAlertCtx(null);
      return;
    }
    const supabase = tryCreateClient();
    if (!supabase) return;
    void loadAlertContext(supabase).then(setAlertCtx);
  }, [signedIn, alertsRefreshKey]);

  function applyLookupToItem(
    item: WishlistItem,
    result: LookupGameResponse,
  ): WishlistItem {
    const game = result.game;
    if (!game) return item;
    const next: WishlistItem = {
      ...item,
      supabaseGameId: Number(game.id),
      steamAppId: game.steam_app_id ?? undefined,
      cover: item.cover || game.cover_url || "",
    };
    if (result.candidates && result.candidates.length > 1) {
      const note = `已匹配：${game.name}`;
      next.notes = next.notes ? `${next.notes} · ${note}` : note;
    }
    if (result.message) {
      next.notes = next.notes ? `${next.notes} · ${result.message}` : result.message;
    }
    return next;
  }

  const filtered = useMemo(() => {
    let list = [...items];
    const keyword = search.trim().toLowerCase();
    if (keyword) {
      list = list.filter(
        (it) =>
          (it.name || "").toLowerCase().includes(keyword) ||
          (it.notes || "").toLowerCase().includes(keyword),
      );
    }
    if (platformFilter !== "all") {
      list = list.filter((it) => it.platform === platformFilter);
    }
    if (priorityFilter !== "all") {
      list = list.filter((it) => it.priority === priorityFilter);
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return (
            new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
          );
        case "date-asc":
          return (
            new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime()
          );
        case "rating-desc":
          return (b.rating || 0) - (a.rating || 0);
        case "rating-asc":
          return (a.rating || 0) - (b.rating || 0);
        case "price-asc":
          return (parseFloat(a.price || "") || 0) - (parseFloat(b.price || "") || 0);
        case "price-desc":
          return (parseFloat(b.price || "") || 0) - (parseFloat(a.price || "") || 0);
        default:
          return 0;
      }
    });
    return list;
  }, [items, platformFilter, priorityFilter, search, sortBy]);

  function persist(next: WishlistItem[], msg: string) {
    if (!saveWishlist(next)) {
      showToast("保存失败，请检查存储空间", "error");
      return false;
    }
    setItems(next);
    showToast(msg, "success");
    return true;
  }

  async function syncCloudCatalog() {
    invalidateWishlistCatalogCache();
    await reloadWishlist();
    bumpAlerts();
    showToast("已同步云端目录与价格", "success");
  }

  async function refreshDeals() {
    const supabase = tryCreateClient();
    if (!supabase) {
      showToast("需要配置 Supabase 才能刷新折扣", "error");
      return;
    }
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      showToast("请先登录再刷新折扣与资讯", "error");
      return;
    }
    try {
      await supabase.functions.invoke("fetch-personalized-feed", {
        body: { force: true },
      });
      showToast("折扣与资讯已刷新（如未变化可稍后再试）", "success");
    } catch {
      showToast("刷新失败（已保留本地缓存）", "error");
    }
  }

  return (
    <>
      <section className="bg-gradient-to-br from-blue-50 to-cyan-100 py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-[#223344] to-[#5B9BD5] bg-clip-text text-transparent">
            游戏愿望单
          </h1>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            记录你想玩的每一款游戏，追踪期望，规划你的游戏预算
          </p>
          <button
            type="button"
            className="btn-primary inline-flex items-center"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-5 h-5 mr-2" />
            添加愿望
          </button>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <WishlistAlertsPanel
            signedIn={signedIn}
            items={items}
            refreshKey={alertsRefreshKey}
          />

          <WishlistEmailAlertsPanel
            signedIn={signedIn}
            refreshKey={alertsRefreshKey}
          />

          <div className="max-w-6xl mx-auto mb-8 p-5 rounded-xl border border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Heart className="w-5 h-5 text-blue-500" />
              折扣提醒规则
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="text-sm text-gray-600">
                最低折扣（%）
                <input
                  type="number"
                  min={1}
                  max={95}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                  value={rules.minDiscountPercent ?? 30}
                  onChange={(e) =>
                    setRules((r) => ({
                      ...r,
                      minDiscountPercent: Math.max(
                        1,
                        Math.min(95, parseInt(e.target.value || "30", 10)),
                      ),
                    }))
                  }
                />
              </label>
              <label className="text-sm text-gray-600">
                平台偏好（留空为全部）
                <input
                  type="text"
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="例如：PC, PlayStation"
                  value={(rules.preferredPlatforms || []).join(", ")}
                  onChange={(e) =>
                    setRules((r) => ({
                      ...r,
                      preferredPlatforms: parsePlatformList(e.target.value),
                    }))
                  }
                />
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 mt-6">
                <input
                  type="checkbox"
                  checked={rules.notifyOnlyNewLows !== false}
                  onChange={(e) =>
                    setRules((r) => ({ ...r, notifyOnlyNewLows: e.target.checked }))
                  }
                />
                仅提醒历史新低
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {signedIn && (
                <button
                  type="button"
                  className="btn-secondary inline-flex items-center"
                  onClick={() => void syncCloudCatalog()}
                >
                  <Cloud className="w-4 h-4 mr-2" />
                  同步云端目录
                </button>
              )}
              <button
                type="button"
                className="btn-primary inline-flex items-center"
                onClick={() => {
                  const next = { ...rules, updatedAt: new Date().toISOString() };
                  if (!saveDealWatchRules(next)) {
                    showToast("保存规则失败", "error");
                    return;
                  }
                  setRules(next);
                  showToast("折扣提醒规则已保存", "success");
                }}
              >
                <Save className="w-4 h-4 mr-2" />
                保存规则
              </button>
              <button
                type="button"
                className="btn-secondary inline-flex items-center"
                onClick={refreshDeals}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新折扣
              </button>
            </div>
          </div>

          <div className="max-w-6xl mx-auto mb-12 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                搜索游戏
              </label>
              <div className="relative">
                <input
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                平台筛选
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
              >
                <option value="all">全部平台</option>
                {PLATFORM_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                优先级筛选
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="all">全部优先级</option>
                <option value="high">高优先级</option>
                <option value="medium">中优先级</option>
                <option value="low">低优先级</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                排序方式
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
              >
                <option value="date-desc">添加时间：新 → 旧</option>
                <option value="date-asc">添加时间：旧 → 新</option>
                <option value="rating-desc">期望度：高 → 低</option>
                <option value="rating-asc">期望度：低 → 高</option>
                <option value="price-asc">期望价格：低 → 高</option>
                <option value="price-desc">期望价格：高 → 低</option>
              </select>
            </div>
          </div>

          <div className="max-w-6xl mx-auto">
            {loading ? (
              <p className="text-center py-12 text-gray-500">正在加载愿望单…</p>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <Heart className="w-20 h-20 text-gray-300 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-700 mb-4">
                  还没有愿望单
                </h3>
                <p className="text-gray-600 mb-8">
                  点击「添加愿望」开始记录你想玩的游戏
                </p>
                <button
                  type="button"
                  className="btn-primary inline-flex items-center"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  添加愿望
                </button>
              </div>
            ) : (
              <div id="wishlist-items" className="wishlist-grid">
                {filtered.map((item) => (
                  <div
                    key={item.id}
                    className={`wishlist-card wishlist-priority-${priorityClass(item.priority)}`}
                  >
                    <div className="wishlist-cover">
                      <WishlistCover cover={item.cover} name={item.name} />
                    </div>
                    <div className="wishlist-info">
                      <div className="wishlist-info-header">
                        <h3 className="wishlist-name">{item.name}</h3>
                        <div className="wishlist-actions">
                          <button
                            type="button"
                            className="btn-edit-wishlist"
                            title="编辑"
                            onClick={() => setEditItem(item)}
                          >
                            编辑
                          </button>
                          <button
                            type="button"
                            className="btn-delete-wishlist"
                            title="删除"
                            onClick={() => setDeleteItem(item)}
                          >
                            删除
                          </button>
                        </div>
                      </div>

                      <div className="wishlist-meta">
                        {item.platform && (
                          <span className="wishlist-platform">{item.platform}</span>
                        )}
                        <Stars rating={item.rating || 0} />
                        <span className="wishlist-priority-tag">
                          {priorityLabel(item.priority)}
                        </span>
                        {item.price && (
                          <span className="wishlist-price">¥{item.price}</span>
                        )}
                      </div>

                      {item.notes && <p className="wishlist-notes">{item.notes}</p>}

                      <WishlistTargetPriceRow
                        item={item}
                        ctx={alertCtx}
                        signedIn={signedIn}
                        onLookup={() =>
                          setLookupTarget({ id: item.id, name: item.name })
                        }
                        onSaved={() => {
                          bumpAlerts();
                          const supabase = tryCreateClient();
                          if (supabase) {
                            void loadAlertContext(supabase).then(setAlertCtx);
                          }
                        }}
                      />

                      <div className="wishlist-date">{formatDate(item.date)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <WishlistItemModal
        open={addOpen}
        title="添加愿望"
        initial={null}
        enableCatalogSearch
        onClose={() => setAddOpen(false)}
        onSubmit={async (values) => {
          if (!values.name.trim()) {
            showToast("请输入游戏名称", "error");
            return;
          }
          if (values.rating < 1) {
            showToast("请选择期望度", "error");
            return;
          }
          let newItem: WishlistItem = {
            id: `wl_${Date.now()}`,
            name: values.name.trim(),
            cover: values.cover.trim(),
            platform: values.platform,
            rating: values.rating,
            priority: values.priority,
            price: values.price.trim(),
            notes: values.notes.trim(),
            date: new Date().toISOString(),
            supabaseGameId: values.supabaseGameId,
          };

          const supabase = tryCreateClient();
          if (supabase && signedIn && !newItem.supabaseGameId) {
            try {
              showToast("正在从 Steam 搜索并入库…", "success");
              const lookup = await invokeLookupGame(supabase, {
                query: newItem.name,
                import: true,
                allowManual: true,
              });
              newItem = applyLookupToItem(newItem, lookup);
              invalidateWishlistCatalogCache();
            } catch (e) {
              showToast(
                `${e instanceof Error ? e.message : "云端入库失败"}，已仅保存本地`,
                "error",
              );
            }
          }

          const rulesNext = { ...rules };
          if (!rulesNext.targetPriceByWishlistId) {
            rulesNext.targetPriceByWishlistId = {};
          }
          if (newItem.price !== "") {
            rulesNext.targetPriceByWishlistId[newItem.id] =
              parseFloat(newItem.price || "") || 0;
          }
          saveDealWatchRules(rulesNext);
          setRules(rulesNext);

          persist(
            [...items, newItem],
            newItem.supabaseGameId
              ? "愿望单已添加并已同步云端"
              : "愿望单已添加",
          );
        }}
      />

      <WishlistItemModal
        open={!!editItem}
        title="编辑愿望"
        initial={editItem}
        onClose={() => setEditItem(null)}
        onSubmit={(values) => {
          if (!editItem) return;
          if (!values.name.trim()) {
            showToast("请输入游戏名称", "error");
            return;
          }
          if (values.rating < 1) {
            showToast("请选择期望度", "error");
            return;
          }
          const next = items.map((it) =>
            it.id === editItem.id
              ? {
                  ...it,
                  name: values.name.trim(),
                  cover: values.cover.trim(),
                  platform: values.platform,
                  rating: values.rating,
                  priority: values.priority,
                  price: values.price.trim(),
                  notes: values.notes.trim(),
                }
              : it,
          );
          persist(next, "愿望单已更新");
          setEditItem(null);
        }}
      />

      <Modal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        title="确认删除"
        maxWidth="md"
      >
        <p className="text-gray-700 mb-6">
          确定要删除「{deleteItem?.name}」吗？
        </p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setDeleteItem(null)}
          >
            取消
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              if (!deleteItem) return;
              persist(
                items.filter((it) => it.id !== deleteItem.id),
                "愿望单已删除",
              );
              setDeleteItem(null);
            }}
          >
            删除
          </button>
        </div>
      </Modal>

      <LookupGameModal
        open={!!lookupTarget}
        initialQuery={lookupTarget?.name ?? ""}
        onClose={() => setLookupTarget(null)}
        onImported={(result) => {
          if (!lookupTarget || !result.game) return;
          invalidateWishlistCatalogCache();
          const next = items.map((it) =>
            it.id === lookupTarget.id ? applyLookupToItem(it, result) : it,
          );
          persist(next, `已入库：${result.game?.name || lookupTarget.name}`);
          bumpAlerts();
          const sb = tryCreateClient();
          if (sb) void loadAlertContext(sb).then(setAlertCtx);
          setLookupTarget(null);
        }}
      />
    </>
  );
}

function WishlistItemModal({
  open,
  title,
  initial,
  enableCatalogSearch = false,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  initial: WishlistItem | null;
  enableCatalogSearch?: boolean;
  onClose: () => void;
  onSubmit: (values: {
    name: string;
    cover: string;
    platform: string;
    rating: number;
    priority: "high" | "medium" | "low";
    price: string;
    notes: string;
    supabaseGameId?: number;
  }) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [cover, setCover] = useState("");
  const [platform, setPlatform] = useState("");
  const [rating, setRating] = useState(0);
  const [priority, setPriority] = useState<"high" | "medium" | "low">("high");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [supabaseGameId, setSupabaseGameId] = useState<number | undefined>(
    initial?.supabaseGameId,
  );
  const [catalogHits, setCatalogHits] = useState<CatalogGame[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setCover(initial?.cover ?? "");
    setPlatform(initial?.platform ?? "");
    setRating(initial?.rating ?? 0);
    setPriority(initial?.priority ?? "high");
    setPrice(initial?.price ?? "");
    setNotes(initial?.notes ?? "");
    setSupabaseGameId(initial?.supabaseGameId);
    setCatalogHits([]);
  }, [open, initial]);

  useEffect(() => {
    if (!open || !enableCatalogSearch) return;
    const q = name.trim();
    if (q.length < 2) {
      setCatalogHits([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setCatalogLoading(true);
      const hits = await searchWishlistCatalog(q);
      setCatalogHits(hits);
      setCatalogLoading(false);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [open, enableCatalogSearch, name]);

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="lg">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void Promise.resolve(
            onSubmit({
              name,
              cover,
              platform,
              rating,
              priority,
              price,
              notes,
              supabaseGameId,
            }),
          ).then(() => onClose());
        }}
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            游戏名称
          </label>
          <input
            data-testid="wishlist-name-input"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          {enableCatalogSearch && catalogHits.length > 0 && (
            <div className="mt-2 border border-gray-200 rounded-lg max-h-40 overflow-y-auto bg-gray-50">
              {catalogLoading && (
                <p className="px-3 py-2 text-xs text-gray-500">搜索中…</p>
              )}
              {!catalogLoading &&
                catalogHits.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-white border-b border-gray-100 last:border-0"
                    onClick={() => {
                      setName(g.name);
                      if (g.cover_url) setCover(g.cover_url);
                      setSupabaseGameId(g.id);
                    }}
                  >
                    <span className="font-medium text-gray-800">{g.name}</span>
                    {g.steam_app_id != null && (
                      <span className="text-xs text-gray-500 ml-2">
                        Steam #{g.steam_app_id}
                      </span>
                    )}
                  </button>
                ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            封面（可选）
          </label>
          <input
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={cover}
            onChange={(e) => setCover(e.target.value)}
            placeholder="输入图片 URL"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              平台
            </label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              <option value="">不指定</option>
              {PLATFORM_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              优先级
            </label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as "high" | "medium" | "low")
              }
            >
              <option value="high">高优先级</option>
              <option value="medium">中优先级</option>
              <option value="low">低优先级</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            期望度（1-5）
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                data-testid={`wishlist-rating-${i}`}
                className="px-2 py-1 rounded"
                onClick={() => setRating(i)}
                title={`${i} 星`}
                aria-label={`${i} 星`}
              >
                <span style={{ color: i <= rating ? "#f59e0b" : "#9ca3af" }}>
                  {i <= rating ? "★" : "☆"}
                </span>
              </button>
            ))}
            <span className="text-sm text-gray-500 ml-2">{rating || 0}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            期望价格（可选）
          </label>
          <input
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="例如 50"
            inputMode="decimal"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            备注（可选）
          </label>
          <textarea
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="btn-primary" data-testid="wishlist-save-btn">
            保存
          </button>
        </div>
      </form>
    </Modal>
  );
}

