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
  game_id: number;
  price: number;
  currency?: string | null;
  best_store?: string | null;
};

export type AlertRow = {
  id: number;
  game_id: number;
  target_price: number;
  enabled: boolean;
  notify_email?: boolean;
};

export type AlertContext = {
  signedIn: boolean;
  alertsByGameId: Record<string, AlertRow>;
  pricesByGameId: Record<string, BestPriceRow>;
  gamesById: Record<string, { id: number; name: string; steam_app_id: number | null }>;
  gamesList: { id: number; name: string; steam_app_id: number | null }[];
};

export type AlertEvent = {
  id: number;
  alert_id: number;
  trigger_price: number;
  channel: string;
  status: string;
  triggered_at: string;
  alerts?: {
    game_id: number;
    target_price: number;
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
  let store = priceRow.best_store ? String(priceRow.best_store) : "";
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
    if (wantSteamId && g.steam_app_id && String(g.steam_app_id) === String(wantSteamId)) {
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
    (alertsRes.data || []).forEach((row) => {
      const alert = row as AlertRow;
      if (alert.notify_email === undefined) alert.notify_email = true;
      alertsByGameId[String(row.game_id)] = alert;
    });

    const pricesByGameId: Record<string, BestPriceRow> = {};
    (pricesRes.data || []).forEach((row) => {
      pricesByGameId[String((row as BestPriceRow).game_id)] = row as BestPriceRow;
    });

    const gamesById: AlertContext["gamesById"] = {};
    const gamesList: AlertContext["gamesList"] = [];
    (gamesRes.data || []).forEach((g) => {
      const game = g as AlertContext["gamesList"][0];
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
    return embed.data as unknown as AlertEvent[];
  }

  const plain = await supabase
    .from("alert_events")
    .select("id, alert_id, trigger_price, channel, status, triggered_at")
    .eq("channel", "in_app")
    .order("triggered_at", { ascending: false })
    .limit(ALERT_EVENTS_LIMIT);

  if (plain.error || !plain.data?.length) return [];

  const alertIds = plain.data.map((e) => e.alert_id);
  const alertsRes = await supabase
    .from("alerts")
    .select("id, game_id, target_price")
    .in("id", alertIds);
  const gameIds = (alertsRes.data || []).map((a) => a.game_id);
  const gamesRes = await supabase.from("games").select("id, name").in("id", gameIds);

  const alertById: Record<number, { id: number; game_id: number; target_price: number }> =
    {};
  (alertsRes.data || []).forEach((a) => {
    alertById[a.id] = a;
  });
  const gameById: Record<number, { id: number; name: string }> = {};
  (gamesRes.data || []).forEach((g) => {
    gameById[g.id] = g;
  });

  return plain.data.map((ev) => {
    const alert = alertById[ev.alert_id];
    const game = alert ? gameById[alert.game_id] : null;
    return {
      ...ev,
      alerts: alert
        ? {
            game_id: alert.game_id,
            target_price: alert.target_price,
            games: game ? { name: game.name } : null,
          }
        : null,
    } as AlertEvent;
  });
}

export function dedupeAlertEventsByGame(events: AlertEvent[]): AlertEvent[] {
  const seen = new Set<string>();
  const out: AlertEvent[] = [];
  for (const ev of events) {
    const gid = ev.alerts?.game_id;
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
  if (ev.alerts?.target_price != null) {
    target = ev.alerts.target_price;
  }
  return formatPriceAlertMessage(gameName, ev.trigger_price, target);
}

export type EmailDeliveryRow = {
  id: number;
  trigger_price: number;
  triggered_at: string;
  emailed_at: string | null;
  email_to: string | null;
  email_error: string | null;
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

  return res.data.map((row) => {
    const alerts = row.alerts as { games?: { name?: string } | null } | null;
    return {
      id: row.id as number,
      trigger_price: Number(row.trigger_price),
      triggered_at: String(row.triggered_at),
      emailed_at: (row.emailed_at as string | null) ?? null,
      email_to: (row.email_to as string | null) ?? null,
      email_error: (row.email_error as string | null) ?? null,
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