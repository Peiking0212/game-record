"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Clock,
  Inbox,
  MessageSquare,
  SearchX,
  ShoppingCart,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { GameIcon } from "@/components/games/game-icon";
import {
  findGame,
  getSpendingRecordType,
  loadGameHubData,
  type GameHubData,
} from "@/lib/game-hub";
import { seedGamesIfEmpty } from "@/lib/game-data";
import {
  formatDate,
  formatDateISO,
  getStatusClass,
  getStatusText,
  safeLucideIcon,
} from "@/lib/game-utils";

type Props = {
  gameId?: string;
  gameNameQuery?: string;
};

function EmptySection({ message }: { message: string }) {
  return (
    <div className="game-hub-empty">
      <Inbox className="w-8 h-8 text-gray-300" />
      <p>{message}</p>
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="review-stars" aria-label={`${rating} 颗星`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: i <= rating ? "#f59e0b" : "#d1d5db" }}>
          {i <= rating ? "★" : "☆"}
        </span>
      ))}
    </div>
  );
}

function DynamicLucide({ name, className }: { name: string; className?: string }) {
  const iconName = safeLucideIcon(name);
  const pascal = iconName
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("") as keyof typeof LucideIcons;
  const Icon = (LucideIcons[pascal] as LucideIcon) || Trophy;
  return <Icon className={className} />;
}

function sectionMuted(empty: boolean) {
  return empty ? "game-hub-section game-hub-section-muted" : "game-hub-section";
}

export function GameDetailClient({ gameId: gameIdProp, gameNameQuery: nameProp }: Props) {
  const routeParams = useParams();
  const searchParams = useSearchParams();
  const routeId = typeof routeParams?.id === "string" ? routeParams.id : undefined;
  const gameId =
    gameIdProp && gameIdProp !== "_"
      ? gameIdProp
      : routeId && routeId !== "_"
        ? routeId
        : gameIdProp;
  const nameFromQuery = searchParams.get("name");
  const gameNameQuery = nameProp ?? (nameFromQuery ? nameFromQuery : undefined);

  const [ready, setReady] = useState(false);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [hub, setHub] = useState<GameHubData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const games = await seedGamesIfEmpty();

      if (!gameId && !gameNameQuery) {
        if (!cancelled) {
          setNotFound("缺少游戏参数，请从游戏收藏页点击进入。");
          setReady(true);
        }
        return;
      }

      const game = findGame(games, { id: gameId, name: gameNameQuery });
      if (!game) {
        const label = gameNameQuery
          ? decodeURIComponent(gameNameQuery)
          : `ID ${gameId}`;
        if (!cancelled) {
          setNotFound(`找不到名为「${label}」的游戏。`);
          setReady(true);
        }
        return;
      }

      if (!cancelled) {
        setHub(loadGameHubData(game));
        setNotFound(null);
        setReady(true);
        document.title = `${game.name} - 游戏记录`;
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [gameId, gameNameQuery]);

  const counts = useMemo(() => {
    if (!hub) return null;
    return {
      reviews: hub.reviews.length,
      achievements: hub.achievements.length,
      screenshots: hub.mediaItems.length,
      spending: hub.spending.length,
    };
  }, [hub]);

  if (!ready) {
    return (
      <p className="text-center py-24" style={{ color: "var(--text-gray)" }}>
        加载中…
      </p>
    );
  }

  if (notFound || !hub) {
    return (
      <section className="py-24">
        <div className="container mx-auto px-4 text-center max-w-lg">
          <SearchX className="w-20 h-20 text-gray-300 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-800 mb-4">未找到该游戏</h2>
          <p className="text-gray-600 mb-8">{notFound}</p>
          <Link href="/games" className="btn-primary inline-flex items-center">
            <ArrowLeft className="w-5 h-5 mr-2" />
            返回游戏收藏
          </Link>
        </div>
      </section>
    );
  }

  const { game } = hub;
  const progress = parseInt(String(game.progress), 10) || 0;
  const playtime = parseInt(String(game.playtime), 10) || 0;
  const spendingTotal = hub.spending.reduce(
    (sum, r) => sum + (parseFloat(String(r.amount)) || 0),
    0,
  );
  const sortedSpending = [...hub.spending].sort((a, b) =>
    String(b.date || "").localeCompare(String(a.date || "")),
  );

  return (
    <div id="game-hub-content">
      <section className="game-hub-hero bg-gradient-to-br from-blue-50 to-cyan-100 py-10 md:py-16">
        <div className="container mx-auto px-4">
          <Link
            href="/games"
            className="game-hub-back inline-flex items-center text-sm text-gray-600 hover:text-blue-600 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回游戏收藏
          </Link>
          <div className="game-hub-hero-grid">
            <div className="game-hub-cover">
              <GameIcon
                src={game.icon}
                name={game.name}
                width={280}
                height={360}
                className="game-hub-cover-img"
              />
            </div>
            <div className="game-hub-hero-info">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="game-hub-tag">{game.type || "其他"}</span>
                <span
                  className={`game-hub-status ${getStatusClass(game.status)}`}
                >
                  {getStatusText(game.status)}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                {game.name}
              </h1>
              <p className="text-gray-600 mb-6 max-w-2xl">
                {game.description || "暂无描述"}
              </p>
              <div className="game-hub-stats-row">
                <div className="game-hub-stat">
                  <Clock className="w-4 h-4" />
                  <span>
                    <strong>{playtime}</strong> 小时
                  </span>
                </div>
              </div>
              <div className="game-hub-progress-wrap mt-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>完成进度</span>
                  <span>{progress}%</span>
                </div>
                <div className="game-hub-progress-bar">
                  <div
                    className="game-hub-progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="py-12 bg-white">
        <div className="container mx-auto px-4 max-w-6xl space-y-10">
          <section
            id="section-reviews"
            className={sectionMuted(!counts?.reviews)}
          >
            <div className="game-hub-section-header">
              <h2>
                <MessageSquare className="w-5 h-5 inline mr-2" />
                游戏评测
              </h2>
              <Link href="/reviews" className="game-hub-section-link">
                查看全部
              </Link>
            </div>
            <div className="game-hub-list">
              {hub.reviews.length === 0 ? (
                <EmptySection message="暂无该游戏的评测" />
              ) : (
                hub.reviews.map((item) => {
                  const reviewText = item.review || item.comment || "";
                  return (
                    <div
                      key={String(item.id ?? item.name)}
                      className="review-card game-hub-review-card"
                    >
                      <div className="review-cover">
                        <GameIcon
                          src={item.coverUrl || item.cover}
                          name={item.name || game.name}
                          width={120}
                          height={80}
                          className="review-cover-img"
                        />
                      </div>
                      <div className="review-info">
                        <Stars rating={item.rating || 0} />
                        {item.tags && item.tags.length > 0 && (
                          <div className="review-tags">
                            {item.tags.map((tag) => (
                              <span key={tag} className="tag-pill">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {reviewText && (
                          <p
                            className="review-text"
                            style={{ WebkitLineClamp: 4 }}
                          >
                            {reviewText}
                          </p>
                        )}
                        <div className="review-meta">
                          <span className="review-date">
                            {formatDate(item.date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section
            id="section-achievements"
            className={sectionMuted(!counts?.achievements)}
          >
            <div className="game-hub-section-header">
              <h2>
                <Trophy className="w-5 h-5 inline mr-2" />
                成就记录
              </h2>
              <Link href="/achievements" className="game-hub-section-link">
                查看全部
              </Link>
            </div>
            <div className="game-hub-achievements-grid">
              {hub.achievements.length === 0 ? (
                <EmptySection message="暂无该游戏的成就" />
              ) : (
                hub.achievements.map((a) => (
                  <div key={String(a.id ?? a.title)} className="game-hub-achievement-item">
                    <div className="game-hub-achievement-icon">
                      <DynamicLucide name={a.icon || "trophy"} className="w-5 h-5" />
                    </div>
                    <div className="game-hub-achievement-body">
                      <h4>{a.title}</h4>
                      <p>{a.description || ""}</p>
                      <span className="game-hub-achievement-date">
                        {formatDateISO(a.date) || "-"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section
            id="section-screenshots"
            className={sectionMuted(!counts?.screenshots)}
          >
            <div className="game-hub-section-header">
              <h2>
                <Camera className="w-5 h-5 inline mr-2" />
                游戏截图与视频
              </h2>
              <Link href="/gallery" className="game-hub-section-link">
                媒体库
              </Link>
            </div>
            {hub.mediaItems.length === 0 ? (
              <EmptySection message="暂无截图或视频" />
            ) : (
              <div className="media-gallery">
                {hub.mediaItems.map((item, i) =>
                  item.type === "video" ? (
                    <div key={item.url} className="media-item">
                      <video
                        src={item.url}
                        controls
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div key={item.url} className="media-item">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt={`截图 ${i + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ),
                )}
              </div>
            )}
          </section>

          <section
            id="section-spending"
            className={sectionMuted(!counts?.spending)}
          >
            <div className="game-hub-section-header">
              <h2>
                <ShoppingCart className="w-5 h-5 inline mr-2" />
                消费记录
              </h2>
              <Link href="/spending" className="game-hub-section-link">
                查看全部
              </Link>
            </div>
            {hub.spending.length === 0 ? (
              <EmptySection message="暂无该游戏的消费记录" />
            ) : (
              <>
                <div className="game-hub-spending-summary">
                  <div className="game-hub-spending-total">
                    <span>累计消费</span>
                    <strong>¥{spendingTotal.toFixed(2)}</strong>
                    <span className="text-sm text-gray-500">
                      {hub.spending.length} 条记录
                    </span>
                  </div>
                </div>
                <div className="game-hub-spending-table-wrap overflow-x-auto">
                  <table className="game-hub-table">
                    <thead>
                      <tr>
                        <th>类型</th>
                        <th>金额</th>
                        <th>日期</th>
                        <th>平台</th>
                        <th>备注</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedSpending.map((r) => {
                        const typeLabel =
                          getSpendingRecordType(r) === "purchase"
                            ? "购买"
                            : "充值";
                        return (
                          <tr key={String(r.id ?? `${r.date}-${r.amount}`)}>
                            <td>{typeLabel}</td>
                            <td className="font-medium">
                              ¥{(parseFloat(String(r.amount)) || 0).toFixed(2)}
                            </td>
                            <td>{formatDateISO(r.date) || "-"}</td>
                            <td>{r.platform || "-"}</td>
                            <td>{r.note || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          <section className="game-hub-section" id="section-personalized">
            <div className="game-hub-section-header">
              <h2>
                <Sparkles className="w-5 h-5 inline mr-2" />
                相关资讯与折扣
              </h2>
              <Link href="/wishlist" className="game-hub-section-link">
                管理提醒
              </Link>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">资讯</h3>
                <div className="game-hub-list">
                  {hub.news.length === 0 ? (
                    <EmptySection message="暂无该游戏资讯" />
                  ) : (
                    hub.news.slice(0, 4).map((item, idx) => (
                      <article
                        key={`news-${idx}`}
                        className="p-3 rounded-lg border border-gray-200 bg-white/70"
                      >
                        <h4 className="font-semibold text-gray-800">
                          {item.title || "游戏资讯"}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {item.summary || ""}
                        </p>
                      </article>
                    ))
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">折扣</h3>
                <div className="game-hub-list">
                  {hub.deals.length === 0 ? (
                    <EmptySection message="暂无该游戏折扣" />
                  ) : (
                    hub.deals.slice(0, 4).map((item, idx) => (
                      <article
                        key={`deal-${idx}`}
                        className="p-3 rounded-lg border border-gray-200 bg-white/70"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-gray-800">
                            {item.platform || "平台"}
                          </strong>
                          <span className="badge badge-green">
                            {String(item.discountPercent ?? 0)}% OFF
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-2">
                          ¥{Number(item.currentPrice ?? 0).toFixed(2)}
                          <span className="text-gray-400 line-through ml-1">
                            ¥{Number(item.originalPrice ?? 0).toFixed(2)}
                          </span>
                        </p>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}