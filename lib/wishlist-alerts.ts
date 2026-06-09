import { formatPriceAlertMessage } from "@/lib/mascot-notify";
import {
  getWishlistAlias,
  normalizeWishlistGameName,
} from "@/lib/wishlist-aliases";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WishlistItem } from "@/lib/wishlist";
import {
  getDealWatchRules,
  saveDealWatchRules,
} from "@/lib/wishlist";

export type BestPriceRow = {
  gameId: number;
  price: number;
  currency?: string | null;
  bestStore?: string | null;
};

export type AlertRow = {
  id: number;
  gameId: number;
  targetPrice: number;
  enabled: boolean;
  notifyEmail?: boolean;
};

export type AlertContext = {
  signedIn: boolean;
  alertsByGameId: Record<string, AlertRow>;
  pricesByGameId: Record<string, BestPriceRow>;
  gamesById: Record<string, { id: number; name: string; steamAppId: number | null }>;
  gamesList: { id: number; name: string; steamAppId: number | null }[];
};

export type AlertEvent = {
  id: number;
  alertId: number;
  triggerPrice: number;
  channel: string;
  status: string;
  triggeredAt: string;
  alerts?: {
    gameId: number;
    targetPrice: number;
    games?: { name: string } | null;
  } | null;
};

export type UpsertAlertResponse = {
  ok: boolean;
  alert?: AlertRow;
  evaluation?: {
    triggered?: boolean;
    reason?: string;
    currentPrice?: number | null;
    eventId?: number | null;
  };
  error?: string;
};

const ALERT_EVENTS_LIMIT = 15;

let alertContextCache: AlertContext | null = null;

export function invalidateAlertContext(): void {
  alertContextCache = null;
}

export function formatBestPriceLine(priceRow: BestPriceRow | undefined): string {
  if (!priceRow) return "";
  const cur =
    priceRow.currency === "CNY" || !priceRow.currency
      ? "元"
      : `${priceRow.currency} `;
  let store = priceRow.bestStore ? String(priceRow.bestStore) : "";
  if (store === "gog") store = "GOG";
  else if (store) store = store.charAt(0).toUpperCase() + store.slice(1);
  return `当前价${cur}${priceRow.price}${store ? ` @${store}` : ""}`;
}

export function resolveSupabaseGameId(
  item: WishlistItem,
  ctx: AlertContext,
): number | null {
  if (!item || !ctx.signedIn) return null;
  if (item.supabaseGameId != null) return Number(item.supabaseGameId);

  const alias = getWishlistAlias(item.name);
  const wantSteamId = item.steamAppId || alias?.steamAppId;
  const wantName =
    alias?.name ? alias.name : normalizeWishlistGameName(item.name);

  for (const g of ctx.gamesList) {
    if (wantSteamId && g.steamAppId && String(g.steamAppId) === String(wantSteamId)) {
      return g.id;
    }
    if (
      g.name &&
      item.name &&
      normalizeWishlistGameName(g.name) === normalizeWishlistGameName(item.name)
    ) {
      return g.id;
    }
    if (g.name && wantName && normalizeWishlistGameName(g.name) === wantName) {
      return g.id;
    }
  }
  return null;
}

export async function loadAlertContext(
  supabase: SupabaseClient | null,
): Promise<AlertContext> {
  const empty: AlertContext = {
    signedIn: false,
    alertsByGameId: {},
    pricesByGameId: {},
    gamesById: {},
    gamesList: [],
  };
  if (!supabase) return empty;

  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return empty;

  if (alertContextCache?.signedIn) return alertContextCache;

  try {
    let alertsRes = await supabase
      .from("alerts")
      .select("id, game_id, target_price, enabled, notify_email");
    if (
      alertsRes.error &&
      /notify_email/i.test(alertsRes.error.message || "")
    ) {
      alertsRes = await supabase
        .from("alerts")
        .select("id, game_id, target_price, enabled");
    }

    const [pricesRes, gamesRes] = await Promise.all([
      supabase.from("game_best_prices").select("*"),
      supabase.from("games").select("id, name, steam_app_id"),
    ]);

    const alertsByGameId: Record<string, AlertRow> = {};
    (alertsRes.data || []).forEach((row: Record<string, unknown>) => {
      const alert: AlertRow = {
        id: row.id as number,
        gameId: row.game_id as number,
        targetPrice: row.target_price as number,
        enabled: row.enabled as boolean,
        notifyEmail: (row.notify_email as boolean | undefined) ?? true,
      };
      alertsByGameId[String(row.game_id)] = alert;
    });

    const pricesByGameId: Record<string, BestPriceRow> = {};
    (pricesRes.data || []).forEach((row: Record<string, unknown>) => {
      const priceRow: BestPriceRow = {
        gameId: row.game_id as number,
        price: row.price as number,
        currency: row.currency as string | null | undefined,
        bestStore: row.best_store as string | null | undefined,
      };
      pricesByGameId[String(row.game_id)] = priceRow;
    });

    const gamesById: AlertContext["gamesById"] = {};
    const gamesList: AlertContext["gamesList"] = [];
    (gamesRes.data || []).forEach((g: Record<string, unknown>) => {
      const game = {
        id: g.id as number,
        name: g.name as string,
        steamAppId: g.steam_app_id as number | null,
      };
      gamesById[String(game.id)] = game;
      gamesList.push(game);
    });

    alertContextCache = {
      signedIn: true,
      alertsByGameId,
      pricesByGameId,
      gamesById,
      gamesList,
    };
    return alertContextCache;
  } catch (e) {
    console.warn("[wishlist-alerts] loadAlertContext failed", e);
    return empty;
  }
}

export async function fetchInAppAlertEvents(
  supabase: SupabaseClient,
): Promise<AlertEvent[]> {
  const embed = await supabase
    .from("alert_events")
    .select(
      "id, alert_id, trigger_price, channel, status, triggered_at, alerts ( game_id, target_price, games ( name ) )",
    )
    .eq("channel", "in_app")
    .order("triggered_at", { ascending: false })
    .limit(ALERT_EVENTS_LIMIT);

  if (!embed.error && embed.data) {
    return (embed.data as unknown[]).map((row) => ({
      id: (row as Record<string, unknown>).id as number,
      alertId: (row as Record<string, unknown>).alert_id as number,
      triggerPrice: (row as Record<string, unknown>).trigger_price as number,
      channel: (row as Record<string, unknown>).channel as string,
      status: (row as Record<string, unknown>).status as string,
      triggeredAt: (row as Record<string, unknown>).triggered_at as string,
      alerts: (row as Record<string, unknown>).alerts ? {
        gameId: ((row as Record<string, unknown>).alerts as Record<string, unknown>).game_id as number,
        targetPrice: ((row as Record<string, unknown>).alerts as Record<string, unknown>).target_price as number,
        games: (((row as Record<string, unknown>).alerts as Record<string, unknown>).games as { name: string } | null),
      } : null,
    }));
  }

  const plain = await supabase
    .from("alert_events")
    .select("id, alert_id, trigger_price, channel, status, triggered_at")
    .eq("channel", "in_app")
    .order("triggered_at", { ascending: false })
    .limit(ALERT_EVENTS_LIMIT);

  if (plain.error || !plain.data?.length) return [];

  const alertIds = plain.data.map((e: Record<string, unknown>) => e.alert_id);
  const alertsRes = await supabase
    .from("alerts")
    .select("id, game_id, target_price")
    .in("id", alertIds as number[]);
  const gameIds = (alertsRes.data || []).map((a: Record<string, unknown>) => a.game_id);
  const gamesRes = await supabase.from("games").select("id, name").in("id", gameIds as number[]);

  const alertById: Record<number, { id: number; game_id: number; target_price: number }> =
    {};
  (alertsRes.data || []).forEach((a: Record<string, unknown>) => {
    alertById[a.id as number] = { id: a.id as number, game_id: a.game_id as number, target_price: a.target_price as number };
  });
  const gameById: Record<number, { id: number; name: string }> = {};
  (gamesRes.data || []).forEach((g: Record<string, unknown>) => {
    gameById[g.id as number] = { id: g.id as number, name: g.name as string };
  });

  return plain.data.map((ev: Record<string, unknown>) => {
    const alert = alertById[ev.alert_id as number];
    const game = alert ? gameById[alert.game_id] : null;
    return {
      id: ev.id as number,
      alertId: ev.alert_id as number,
      triggerPrice: ev.trigger_price as number,
      channel: ev.channel as string,
      status: ev.status as string,
      triggeredAt: ev.triggered_at as string,
      alerts: alert
        ? {
            gameId: alert.game_id,
            targetPrice: alert.target_price,
            games: game ? { name: game.name } : null,
          }
        : null,
    };
  });
}

export function dedupeAlertEventsByGame(events: AlertEvent[]): AlertEvent[] {
  const seen = new Set<string>();
  const out: AlertEvent[] = [];
  for (const ev of events) {
    const gid = ev.alerts?.gameId;
    const key = gid != null ? `g:${gid}` : `e:${ev.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ev);
  }
  return out;
}

export function isAlertEventDismissed(eventId: number): boolean {
  const rules = getDealWatchRules();
  const ids = rules.dismissedAlertEventIds || [];
  return ids.includes(Number(eventId));
}

export function dismissAlertEventId(eventId: number): void {
  const rules = getDealWatchRules();
  const ids = [...(rules.dismissedAlertEventIds || [])];
  const id = Number(eventId);
  if (!Number.isFinite(id) || ids.includes(id)) return;
  ids.push(id);
  saveDealWatchRules({ ...rules, dismissedAlertEventIds: ids });
}

export function dismissAllAlertEventIds(eventIds: number[]): void {
  const rules = getDealWatchRules();
  const ids = new Set(rules.dismissedAlertEventIds || []);
  eventIds.forEach((id) => ids.add(Number(id)));
  saveDealWatchRules({
    ...rules,
    dismissedAlertEventIds: [...ids],
  });
}

export function resolveDisplayGameName(
  gameId: number | undefined,
  cloudName: string | undefined,
  items: WishlistItem[],
  ctx: AlertContext,
): string {
  const gid = gameId != null ? String(gameId) : "";
  for (const item of items) {
    if (!item.name) continue;
    const resolved = resolveSupabaseGameId(item, ctx);
    if (resolved != null && String(resolved) === gid) return item.name;
  }
  return cloudName || "游戏";
}

export function formatAlertEventMessage(
  ev: AlertEvent,
  displayName: string,
): string {
  let gameName = displayName || "游戏";
  let target: number | null = null;
  if (!displayName && ev.alerts?.games?.name) {
    gameName = ev.alerts.games.name;
  }
  if (ev.alerts?.targetPrice != null) {
    target = ev.alerts.targetPrice;
  }
  return formatPriceAlertMessage(gameName, ev.triggerPrice, target);
}

export type EmailDeliveryRow = {
  id: number;
  triggerPrice: number;
  triggeredAt: string;
  emailedAt: string | null;
  emailTo: string | null;
  emailError: string | null;
  gameName: string;
};

export async function fetchRecentEmailDeliveries(
  supabase: SupabaseClient,
  limit = 6,
): Promise<EmailDeliveryRow[]> {
  const res = await supabase
    .from("alert_events")
    .select(
      "id, trigger_price, triggered_at, emailed_at, email_to, email_error, alerts ( games ( name ) )",
    )
    .eq("channel", "in_app")
    .order("triggered_at", { ascending: false })
    .limit(limit);

  if (res.error || !res.data) {
    console.warn("[wishlist-alerts] email delivery fetch failed", res.error?.message);
    return [];
  }

  return (res.data as unknown[]).map((row) => {
    const r = row as Record<string, unknown>;
    const alerts = r.alerts as { games?: { name?: string } | null } | null;
    return {
      id: r.id as number,
      triggerPrice: Number(r.trigger_price),
      triggeredAt: String(r.triggered_at),
      emailedAt: (r.emailed_at as string | null) ?? null,
      emailTo: (r.email_to as string | null) ?? null,
      emailError: (r.email_error as string | null) ?? null,
      gameName: alerts?.games?.name || "游戏",
    };
  });
}

export async function invokeUpsertAlert(
  supabase: SupabaseClient,
  gameId: number,
  targetPrice: number,
  enabled = true,
  notifyEmail = true,
): Promise<UpsertAlertResponse> {
  const { data, error } = await supabase.functions.invoke<UpsertAlertResponse>(
    "upsert-alert",
    { body: { gameId, targetPrice, enabled, notifyEmail } },
  );
  if (error) throw new Error(error.message || "upsert-alert failed");
  if (!data?.ok) {
    throw new Error(data?.error || "upsert-alert rejected");
  }
  invalidateAlertContext();
  return data;
}

export async function invokeAlertEvaluator(
  supabase: SupabaseClient,
  gameId: number,
): Promise<void> {
  await supabase.functions.invoke("run-alert-evaluator", {
    body: { gameId },
  });
}

export function toastForUpsertEvaluation(
  evaluation: UpsertAlertResponse["evaluation"],
): { message: string; variant: "success" | "error" } {
  if (!evaluation) {
    return { message: "目标价提醒已保存", variant: "success" };
  }
  if (evaluation.triggered) {
    return {
      message: "已达标！站内提醒、弹窗与邮件（如已开启）已推送",
      variant: "success",
    };
  }
  if (evaluation.reason === "above_target") {
    return {
      message: "已保存，当前价格高于目标价，降价后触发提醒",
      variant: "success",
    };
  }
  if (evaluation.reason === "deduped") {
    return { message: "已保存，24小时内不会重复提醒", variant: "success" };
  }
  return { message: "目标价提醒已保存", variant: "success" };
}
