import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "PeikingGameTime <onboarding@resend.dev>";

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type AlertEventRow = {
  id: number;
  trigger_price: number;
  triggered_at: string;
  alert_id: number;
  alerts: {
    user_id: string;
    target_price: number | null;
    notify_email?: boolean | null;
    game_id: number;
    games: { name: string | null } | null;
  } | null;
};

/** Public diagnostics: confirms APP_URL secret is loaded (no secrets in response). */
function emailEnvMeta(appUrl: string) {
  const base = appUrl ? appUrl.replace(/\/$/, "") : "";
  return {
    appUrlConfigured: base.length > 0,
    wishlistLink: base ? `${base}/wishlist` : null,
  };
}

function buildEmail(gameName: string, price: number, target: number | null, appUrl: string) {
  const subject = `🎮 ${gameName} 降到 ¥${price} 啦`;
  const targetLine = target != null
    ? `<p style="margin:0 0 8px;color:#475569">你的目标价：<strong>¥${target}</strong></p>`
    : "";
  const link = appUrl ? `${appUrl.replace(/\/$/, "")}/wishlist` : "";
  const cta = link
    ? `<p style="margin:20px 0 0"><a href="${link}" style="background:#52B6FF;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;display:inline-block">查看愿望单</a></p>`
    : "";
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px">
    <h2 style="margin:0 0 12px;color:#0f172a">降价提醒</h2>
    <p style="margin:0 0 8px;color:#0f172a;font-size:16px"><strong>${gameName}</strong> 现价 <strong style="color:#16a34a">¥${price}</strong></p>
    ${targetLine}
    <p style="margin:0;color:#64748b;font-size:13px">来自 PeikingGameTime 游戏记录的愿望单降价提醒。</p>
    ${cta}
  </div>`;
  return { subject, html };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const resendKey = Deno.env.get("RESEND_API_KEY") || "";
    const fromAddress = Deno.env.get("ALERT_EMAIL_FROM") || DEFAULT_FROM;
    const appUrl = Deno.env.get("APP_URL") || "";
    const envMeta = emailEnvMeta(appUrl);

    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { ok: false, error: "missing_service_env" });
    }

    const payload = await req.json().catch(() => ({}));
    const limit = Number.isFinite(Number(payload?.limit)) ? Number(payload.limit) : 50;
    // Avoid blasting historical backlog: only events newer than this window (hours).
    const windowHours = Number.isFinite(Number(payload?.windowHours)) ? Number(payload.windowHours) : 72;
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: events, error: eventsError } = await admin
      .from("alert_events")
      .select("id, trigger_price, triggered_at, alert_id, alerts(user_id, target_price, notify_email, game_id, games(name))")
      .is("emailed_at", null)
      .eq("status", "triggered")
      .gte("triggered_at", since)
      .order("triggered_at", { ascending: true })
      .limit(limit);

    if (eventsError) {
      return json(500, { ok: false, error: "fetch_events_failed", detail: eventsError.message });
    }

    const pending = (events || []) as unknown as AlertEventRow[];
    if (pending.length === 0) {
      return json(200, { ok: true, sent: 0, skipped: 0, pending: 0, ...envMeta });
    }

    if (!resendKey) {
      return json(200, {
        ok: true,
        sent: 0,
        skipped: pending.length,
        pending: pending.length,
        note: "RESEND_API_KEY not set; events left unsent. Configure secret to enable email.",
        ...envMeta,
      });
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const emailCache = new Map<string, string | null>();

    for (const ev of pending) {
      const alert = ev.alerts;
      if (!alert?.user_id) {
        await admin.from("alert_events").update({ email_error: "no_alert_or_user" }).eq("id", ev.id);
        failed++;
        continue;
      }

      if (alert.notify_email === false) {
        skipped += 1;
        continue;
      }

      let email = emailCache.get(alert.user_id);
      if (email === undefined) {
        const { data: userData } = await admin.auth.admin.getUserById(alert.user_id);
        email = userData?.user?.email ?? null;
        emailCache.set(alert.user_id, email);
      }
      if (!email) {
        await admin.from("alert_events").update({ email_error: "no_user_email" }).eq("id", ev.id);
        failed++;
        continue;
      }

      const gameName = alert.games?.name || "你关注的游戏";
      const { subject, html } = buildEmail(gameName, ev.trigger_price, alert.target_price, appUrl);

      try {
        const res = await fetch(RESEND_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ from: fromAddress, to: [email], subject, html }),
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          await admin
            .from("alert_events")
            .update({ email_error: `resend_${res.status}:${detail.slice(0, 200)}` })
            .eq("id", ev.id);
          failed++;
          continue;
        }
        await admin
          .from("alert_events")
          .update({ emailed_at: new Date().toISOString(), email_to: email, email_error: null })
          .eq("id", ev.id);
        sent++;
      } catch (e) {
        await admin
          .from("alert_events")
          .update({ email_error: `exception:${String(e).slice(0, 200)}` })
          .eq("id", ev.id);
        failed++;
      }
    }

    return json(200, {
      ok: true,
      sent,
      failed,
      skipped,
      pending: pending.length,
      ...envMeta,
    });
  } catch (error) {
    return json(500, { ok: false, error: "unexpected_error", detail: String(error) });
  }
});
