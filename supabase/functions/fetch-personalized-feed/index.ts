/**
 * Supabase Edge Function: fetch-personalized-feed
 * 提供个性化游戏资讯 + 折扣聚合，并在配置 AI 时进行轻量摘要增强。
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type JsonObject = Record<string, unknown>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function nowIso(): string {
  return new Date().toISOString();
}

function buildFallbackNews(wishlist: JsonObject[], games: JsonObject[]) {
  const seed = [...wishlist, ...games].slice(0, 8);
  return seed.map((item, idx) => {
    const gameName = String(item.name || "未知游戏");
    return {
      id: `edge-local-news-${idx}`,
      gameName,
      title: `${gameName} 近期社区讨论活跃`,
      summary: "根据你的游玩与收藏偏好，这款游戏近期值得关注更新与活动信息。",
      source: "edge-fallback",
      link: "",
      publishedAt: nowIso(),
      score: 100 - idx * 5
    };
  });
}

function buildFallbackDeals(wishlist: JsonObject[], minDiscountPercent: number, preferredPlatforms: string[]) {
  return wishlist.map((item, idx) => {
    const originalPrice = Number(item.price || (98 + idx * 10));
    const discountPercent = clamp(Math.max(minDiscountPercent, 25 + (idx % 3) * 10), 1, 95);
    const currentPrice = Number((originalPrice * (1 - discountPercent / 100)).toFixed(2));
    const platform = String(item.platform || "PC");
    return {
      id: `edge-local-deal-${idx}`,
      gameName: String(item.name || "未知游戏"),
      platform,
      originalPrice: Number(originalPrice.toFixed(2)),
      currentPrice,
      discountPercent,
      isNewLow: idx % 2 === 0,
      source: "edge-fallback",
      dealUrl: "",
      fetchedAt: nowIso()
    };
  }).filter((item) => {
    if (preferredPlatforms.length === 0) return true;
    return preferredPlatforms.includes(item.platform);
  });
}

async function summarizeWithAI(news: JsonObject[]) {
  const openAIKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAIKey || news.length === 0) return news;

  const top = news.slice(0, 5);
  const prompt = top.map((item, idx) => `${idx + 1}. ${String(item.title || "")} - ${String(item.summary || "")}`).join("\n");
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAIKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: "你是游戏资讯助手。把每条资讯压缩成 1 句中文摘要，返回 JSON 数组，每项含 title 和 summary。"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      })
    });
    if (!res.ok) return news;
    const payload = await res.json();
    const text = payload?.choices?.[0]?.message?.content;
    if (!text) return news;
    const parsed = JSON.parse(text);
    const items = toArray<JsonObject>(parsed.items);
    if (items.length === 0) return news;
    return news.map((item, idx) => {
      const ai = items[idx];
      if (!ai) return item;
      return {
        ...item,
        title: String(ai.title || item.title || ""),
        summary: String(ai.summary || item.summary || "")
      };
    });
  } catch {
    return news;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const wishlist = toArray<JsonObject>(body.wishlist);
    const games = toArray<JsonObject>(body.games);
    const dealWatchRules = (body.dealWatchRules || {}) as JsonObject;
    const minDiscountPercent = clamp(Number(dealWatchRules.minDiscountPercent || 30), 1, 95);
    const preferredPlatforms = toArray<string>(dealWatchRules.preferredPlatforms).map(String);

    let news = buildFallbackNews(wishlist, games);
    let deals = buildFallbackDeals(wishlist, minDiscountPercent, preferredPlatforms);

    news = await summarizeWithAI(news);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const authHeader = req.headers.get("Authorization");
    if (supabaseUrl && supabaseServiceKey && authHeader) {
      const admin = createClient(supabaseUrl, supabaseServiceKey);
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || "", {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: userInfo } = await userClient.auth.getUser();
      const userId = userInfo?.user?.id;
      if (userId) {
        await admin.from("site_data").upsert([
          { user_id: userId, key: "game_news_feed", data: news, updated_at: nowIso() },
          { user_id: userId, key: "discount_deals", data: deals, updated_at: nowIso() }
        ], { onConflict: "user_id,key" });
      }
    }

    return new Response(JSON.stringify({ news, deals, generatedAt: nowIso() }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
