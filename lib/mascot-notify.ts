import type { AlertEvent } from "@/lib/wishlist-alerts";
import {
  getMascotLastAlertEventId,
  MASCOT_LAST_ALERT_KEY,
  setMascotLastAlertEventId,
} from "@/lib/mascot-storage";

export type MascotSpeakFn = (text: string) => boolean;

let speakFn: MascotSpeakFn | null = null;

export function registerMascotSpeak(fn: MascotSpeakFn | null): void {
  speakFn = fn;
}

export function formatPriceAlertMessage(
  gameName: string | undefined,
  triggerPrice: number | string,
  targetPrice?: number | string | null,
): string {
  const name = gameName || "这款游戏";
  const price = Number(triggerPrice);
  const target = Number(targetPrice);
  const priceText = Number.isFinite(price)
    ? price.toFixed(price % 1 === 0 ? 0 : 2)
    : String(triggerPrice);
  if (Number.isFinite(target) && target > 0) {
    return `${name}降到 ${priceText} 元啦，低于你的目标价 ${target.toFixed(target % 1 === 0 ? 0 : 2)} 元！`;
  }
  return `${name}降到 ${priceText} 元啦，快去看看愿望单~`;
}

export function mascotSpeak(text: string): boolean {
  if (!text || !speakFn) return false;
  return speakFn(text);
}

export function notifyPriceHit(opts: {
  gameName?: string;
  triggerPrice: number | string;
  targetPrice?: number | string | null;
}): boolean {
  const msg = formatPriceAlertMessage(
    opts.gameName,
    opts.triggerPrice,
    opts.targetPrice,
  );
  return mascotSpeak(msg);
}

export type AlertEventForMascot = AlertEvent & { _displayName?: string };

export function notifyLatestUnreadEvent(eventRow: AlertEventForMascot): boolean {
  if (!eventRow || eventRow.id == null) return false;
  const lastId = getMascotLastAlertEventId();
  if (eventRow.id <= lastId) return false;

  let gameName = eventRow._displayName || "";
  let targetPrice: number | null = null;
  if (eventRow.alerts) {
    targetPrice = eventRow.alerts.targetPrice;
    if (!gameName && eventRow.alerts.games?.name) {
      gameName = eventRow.alerts.games.name;
    }
  }

  const ok = notifyPriceHit({
    gameName,
    triggerPrice: eventRow.triggerPrice,
    targetPrice,
  });
  if (ok) {
    setMascotLastAlertEventId(eventRow.id);
  }
  return ok;
}

export { MASCOT_LAST_ALERT_KEY };