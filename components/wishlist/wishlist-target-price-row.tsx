"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import {
  formatBestPriceLine,
  invokeAlertEvaluator,
  invokeUpsertAlert,
  resolveSupabaseGameId,
  toastForUpsertEvaluation,
  type AlertContext,
} from "@/lib/wishlist-alerts";
import type { WishlistItem } from "@/lib/wishlist";
import { tryCreateClient } from "@/lib/supabase/client";

type Props = {
  item: WishlistItem;
  ctx: AlertContext | null;
  signedIn: boolean;
  onLookup: () => void;
  onSaved: () => void;
};

export function WishlistTargetPriceRow({
  item,
  ctx,
  signedIn,
  onLookup,
  onSaved,
}: Props) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    text: string;
    tone: "idle" | "success" | "error";
  }>({ text: "", tone: "idle" });

  if (!signedIn || !ctx) return null;

  const gameId = resolveSupabaseGameId(item, ctx);
  const alertRow = gameId ? ctx.alertsByGameId[String(gameId)] : undefined;
  const priceRow = gameId ? ctx.pricesByGameId[String(gameId)] : undefined;
  const initialTarget =
    alertRow?.target_price != null
      ? String(alertRow.target_price)
      : item.price || "";

  const [targetInput, setTargetInput] = useState(initialTarget);
  const [notifyEmail, setNotifyEmail] = useState(
    alertRow?.notify_email !== false,
  );

  useEffect(() => {
    setTargetInput(initialTarget);
    setNotifyEmail(alertRow?.notify_email !== false);
  }, [initialTarget, item.id, alertRow?.notify_email]);

  if (!gameId) {
    return (
      <div className="wishlist-alert-row wishlist-alert-unmatched mt-2">
        <span className="wishlist-alert-inline text-amber-900">
          鏈湪浜戠鐩綍涓€傚叆搴撳悗鍙鐩爣浠锋彁閱掋€?
        </span>
        <button
          type="button"
          data-testid="wishlist-lookup-btn"
          className="wishlist-lookup-cloud-btn mt-2"
          onClick={onLookup}
        >
          浠?Steam 鎼滅储鍏ュ簱
        </button>
      </div>
    );
  }

  async function saveTarget() {
    if (!gameId) return;
    const price = parseFloat(targetInput);
    if (!Number.isFinite(price) || price <= 0) {
      setFeedback({ text: "璇疯緭鍏ユ湁鏁堢洰鏍囦环", tone: "error" });
      return;
    }

    const supabase = tryCreateClient();
    if (!supabase) return;

    setSaving(true);
    setFeedback({ text: "淇濆瓨涓€?, tone: "idle" });
    try {
      const body = await invokeUpsertAlert(
        supabase,
        gameId,
        price,
        true,
        notifyEmail,
      );
      await invokeAlertEvaluator(supabase, gameId).catch(() => undefined);
      const t = toastForUpsertEvaluation(body.evaluation);
      setFeedback({ text: "宸蹭繚瀛?, tone: "success" });
      showToast(t.message, t.variant);
      onSaved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "淇濆瓨澶辫触";
      setFeedback({ text: msg, tone: "error" });
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="wishlist-alert-row mt-2" data-game-id={gameId}>
      <div className="wishlist-alert-prices">
        {priceRow ? (
          <span className="wishlist-best-price text-sm text-gray-700">
            {formatBestPriceLine(priceRow)}
          </span>
        ) : (
          <span className="wishlist-alert-inline text-gray-500 text-sm">
            鏆傛棤浜戠鏈€浣庝环
          </span>
        )}
        {alertRow?.target_price != null && (
          <span className="text-sm text-green-700 ml-2">
            宸茶鐩爣 楼{alertRow.target_price}
          </span>
        )}
      </div>
      <div className="wishlist-alert-form mt-2 flex flex-wrap items-end gap-2">
        <label className="wishlist-alert-inline text-sm text-gray-600 flex-1 min-w-[140px]">
          鐩爣浠凤紙CNY锛?
          <input
            type="number"
            inputMode="decimal"
            min={0.01}
            step={0.01}
            data-testid="wishlist-target-price-input"
            className="wishlist-target-price-input w-full mt-1 px-3 py-1.5 border border-gray-300 rounded-lg"
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            placeholder="渚嬪 50"
            autoComplete="off"
          />
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-gray-600 self-center">
          <input
            type="checkbox"
            data-testid="wishlist-notify-email"
            checked={notifyEmail}
            onChange={(e) => setNotifyEmail(e.target.checked)}
          />
          闄嶄环鍙戦偖浠?
        </label>
        <button
          type="button"
          className="wishlist-save-alert-btn btn-secondary text-sm py-1.5 px-3"
          data-testid="wishlist-save-alert-btn"
          disabled={saving}
          onClick={() => void saveTarget()}
        >
          淇濆瓨鎻愰啋
        </button>
        {feedback.text && (
          <span
            className={`wishlist-alert-inline wishlist-alert-feedback text-sm ${
              feedback.tone === "error"
                ? "error"
                : feedback.tone === "success"
                  ? "success"
                  : ""
            }`}
          >
            {feedback.text}
          </span>
        )}
      </div>
    </div>
  );
}
