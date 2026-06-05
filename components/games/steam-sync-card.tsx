"use client";

import { Library } from "lucide-react";
import { useEffect, useState } from "react";
import { tryCreateClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";

const STEAM_ID_KEY = "steam_id";

export function SteamSyncCard({ onSynced }: { onSynced?: () => void }) {
  const { showToast } = useToast();
  const [visible, setVisible] = useState(false);
  const [steamId, setSteamId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = tryCreateClient();
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      const signedIn = !!data.session;
      setVisible(signedIn);
      if (signedIn) {
        try {
          const saved = localStorage.getItem(STEAM_ID_KEY) || "";
          if (saved) setSteamId(saved);
        } catch {
          /* noop */
        }
      }
    });
  }, []);

  async function handleSync() {
    const clean = steamId.replace(/\D/g, "");
    if (clean.length < 17) {
      setStatus("璇疯緭鍏?17 浣?SteamID64锛堜釜浜鸿祫鏂欓』鍏紑锛?);
      return;
    }

    const supabase = tryCreateClient();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabase || !url || !anonKey) {
      showToast("Supabase 鏈厤缃?, "error");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      showToast("璇峰厛鐧诲綍", "error");
      return;
    }

    setLoading(true);
    setStatus("姝ｅ湪浠?Steam 鎷夊彇娓告垙搴撯€?);
    try {
      const res = await fetch(`${url.replace(/\/$/, "")}/functions/v1/sync-user-games`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: anonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ steamId: clean }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        hint?: string;
        error?: string;
        mode?: string;
        ownedCount?: number;
        gameCount?: number;
        syncedCount?: number;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.hint || data.error || `HTTP ${res.status}`);
      }
      localStorage.setItem(STEAM_ID_KEY, clean);
      if (data.mode === "steam") {
        setStatus(
          `宸插悓姝?${data.ownedCount ?? 0} 娆撅紙搴撳唴鍏?${data.gameCount ?? 0} 娆撅級`,
        );
      } else {
        setStatus(`宸插悓姝?${data.syncedCount ?? 0} 鏉);
      }
      showToast("Steam 搴撳悓姝ュ畬鎴?, "success");
      onSynced?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "鍚屾澶辫触";
      setStatus(`鍚屾澶辫触锛?{msg}`);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="max-w-6xl mx-auto mb-12">
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 border border-blue-100 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Library className="w-5 h-5" />
              鍚屾 Steam 娓告垙搴?
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              杈撳叆浣犵殑 SteamID64锛?7 浣嶏紝涓汉璧勬枡 / 娓告垙璇︽儏椤昏涓哄叕寮€锛夛紝涓€閿妸宸茶喘娓告垙涓庢椂闀垮悓姝ュ埌浜戠銆?
            </p>
            {status && (
              <p className="text-xs text-gray-500 mt-1">{status}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="76561198XXXXXXXXX"
              className="px-3 py-2 border border-gray-300 rounded-lg w-56 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={steamId}
              onChange={(e) => setSteamId(e.target.value)}
            />
            <button
              type="button"
              className="btn-primary whitespace-nowrap"
              disabled={loading}
              onClick={handleSync}
            >
              {loading ? "鍚屾涓€? : "鍚屾"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
