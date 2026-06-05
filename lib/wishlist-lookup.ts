import type { SupabaseClient } from "@supabase/supabase-js";

export type LookupCandidate = {
  steamAppId: number | null;
  name: string;
  coverUrl: string | null;
  source: string;
};

export type LookupGameRow = {
  id: number;
  steam_app_id: number | null;
  name: string;
  cover_url: string | null;
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
    return body?.hint || "鏈湪 Steam/ITAD 鎵惧埌锛涘彲灏濊瘯鍏朵粬鍏抽敭璇嶆垨鍏佽鎸夊悕绉板叆搴?;
  }
  if (err === "unauthorized") return "璇峰厛鐧诲綍";
  if (err === "invalid_payload") return "璇疯緭鍏ヨ嚦灏?2 涓瓧绗︾殑娓告垙鍚?;
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
