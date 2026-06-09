import type { SupabaseClient } from "@supabase/supabase-js";

export type LookupCandidate = {
  steamAppId: number | null;
  name: string;
  coverUrl: string | null;
  source: string;
};

export type LookupGameRow = {
  id: number;
  steamAppId: number | null;
  name: string;
  coverUrl: string | null;
};

export type LookupGameResponse = {
  ok: boolean;
  query?: string | null;
  candidates?: LookupCandidate[];
  game?: LookupGameRow | null;
  imported?: boolean;
  warning?: string | null;
  message?: string | null;
  pickSource?: string;
  error?: string;
  hint?: string;
};

export function formatLookupError(
  body: LookupGameResponse | null | undefined,
  fallback?: string,
): string {
  const err = body?.error || fallback || "lookup_failed";
  if (err === "not_found") {
    return body?.hint || "未在Steam/ITAD找到，可尝试其他关键词或允许按名称入库";
  }
  if (err === "unauthorized") return "请先登录";
  if (err === "invalid_payload") return "请输入至少2个字符的游戏名";
  return String(err);
}

export async function invokeLookupGame(
  supabase: SupabaseClient,
  params: {
    query?: string;
    steamAppId?: number;
    import?: boolean;
    allowManual?: boolean;
  },
): Promise<LookupGameResponse> {
  const body: Record<string, unknown> = {
    import: params.import !== false,
    allowManual: params.allowManual !== false,
  };
  if (params.steamAppId != null && params.steamAppId > 0) {
    body.steamAppId = params.steamAppId;
  } else {
    body.query = String(params.query || "").trim();
  }

  const { data, error } = await supabase.functions.invoke<LookupGameResponse>(
    "lookup-game",
    { body },
  );

  if (error) {
    throw new Error(error.message || "lookup-game invoke failed");
  }
  if (!data?.ok) {
    throw new Error(formatLookupError(data));
  }
  return data;
}
