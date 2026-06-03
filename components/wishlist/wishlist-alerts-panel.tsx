"use client";

import { Bell } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/game-utils";
import { notifyLatestUnreadEvent } from "@/lib/mascot-notify";
import {
  dedupeAlertEventsByGame,
  dismissAlertEventId,
  dismissAllAlertEventIds,
  fetchInAppAlertEvents,
  formatAlertEventMessage,
  isAlertEventDismissed,
  loadAlertContext,
  resolveDisplayGameName,
  type AlertContext,
  type AlertEvent,
} from "@/lib/wishlist-alerts";
import type { WishlistItem } from "@/lib/wishlist";
import { tryCreateClient } from "@/lib/supabase/client";

type Props = {
  signedIn: boolean;
  items: WishlistItem[];
  refreshKey: number;
};

export function WishlistAlertsPanel({ signedIn, items, refreshKey }: Props) {
  const { showToast } = useToast();
  const [ctx, setCtx] = useState<AlertContext | null>(null);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    const supabase = tryCreateClient();
    if (!supabase || !signedIn) {
      setCtx(null);
      setEvents([]);
      return;
    }
    setLoading(true);
    try {
      const alertCtx = await loadAlertContext(supabase);
      setCtx(alertCtx);
      const raw = await fetchInAppAlertEvents(supabase);
      const visible = dedupeAlertEventsByGame(raw).filter(
        (ev) => !isAlertEventDismissed(ev.id),
      );
      setEvents(visible);
    } finally {
      setLoading(false);
    }
  }, [signedIn]);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  useEffect(() => {
    if (!signedIn || events.length === 0 || !ctx) return;
    const newest = events[0];
    const gameId = newest.alerts?.game_id;
    const cloudName = newest.alerts?.games?.name;
    const displayName =
      gameId != null
        ? resolveDisplayGameName(gameId, cloudName, items, ctx)
        : cloudName || "游戏";
    notifyLatestUnreadEvent({ ...newest, _displayName: displayName });
  }, [signedIn, events, ctx, items]);

  if (!signedIn) {
    return (
      <div
        id="wishlist-alerts-panel"
        className="max-w-6xl mx-auto mb-8 p-5 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white"
      >
        <p id="alerts-login-hint" className="text-sm text-gray-500">
          登录后可查看云端降价提醒并设置目标价
        </p>
      </div>
    );
  }

  return (
    <div
      id="wishlist-alerts-panel"
      className="max-w-6xl mx-auto mb-8 p-5 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-500" />
          站内提醒
          {events.length > 0 && (
            <span
              id="alerts-unread-badge"
              className="wishlist-alerts-badge"
              aria-label={`${events.length} 条未读`}
            >
              {events.length}
            </span>
          )}
        </h3>
        {events.length > 0 && (
          <button
            type="button"
            id="alerts-dismiss-all-btn"
            data-testid="wishlist-alerts-dismiss-all"
            className="wishlist-alert-dismiss-all"
            onClick={() => {
              dismissAllAlertEventIds(events.map((e) => e.id));
              setEvents([]);
              showToast("已全部标记为已读", "success");
            }}
          >
            全部知道了
          </button>
        )}
      </div>

      {loading && (
        <p className="text-sm text-gray-500 mb-2">加载提醒中…</p>
      )}

      <ul id="wishlist-alerts-list" className="wishlist-alerts-list space-y-2">
        {events.map((ev) => {
          const gameId = ev.alerts?.game_id;
          const cloudName = ev.alerts?.games?.name;
          const displayName =
            ctx && gameId != null
              ? resolveDisplayGameName(gameId, cloudName, items, ctx)
              : cloudName || "游戏";
          return (
            <li
              key={ev.id}
              className="wishlist-alert-item is-unread"
              data-event-id={ev.id}
            >
              <div>
                <div className="font-medium text-gray-800">
                  {formatAlertEventMessage(ev, displayName)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatDate(ev.triggered_at)}
                </div>
              </div>
              <button
                type="button"
                className="wishlist-alert-dismiss"
                data-testid="wishlist-alert-dismiss"
                onClick={() => {
                  dismissAlertEventId(ev.id);
                  setEvents((prev) => prev.filter((x) => x.id !== ev.id));
                }}
              >
                知道了
              </button>
            </li>
          );
        })}
      </ul>

      {events.length === 0 && !loading && (
        <p id="wishlist-alerts-empty" className="text-sm text-gray-500">
          暂无未读降价提醒。在下方愿望卡片中设置目标价后，系统会检测并提醒。
        </p>
      )}
    </div>
  );
}
