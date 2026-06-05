"use client";

import { Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import {
  formatLookupError,
  invokeLookupGame,
  type LookupCandidate,
  type LookupGameResponse,
} from "@/lib/wishlist-lookup";
import { tryCreateClient } from "@/lib/supabase/client";

type Props = {
  open: boolean;
  initialQuery: string;
  onClose: () => void;
  onImported: (result: LookupGameResponse) => void;
};

export function LookupGameModal({
  open,
  initialQuery,
  onClose,
  onImported,
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<LookupCandidate[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<LookupGameResponse | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
    setCandidates([]);
    setSelectedIdx(0);
    setError(null);
    setLastResult(null);
  }, [open, initialQuery]);

  async function runLookup(pick?: LookupCandidate) {
    const q = query.trim();
    if (!pick && q.length < 2) {
      setError("请输入至少2个字符");
      return;
    }

    const supabase = tryCreateClient();
    if (!supabase) {
      setError("未配置Supabase");
      return;
    }
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      setError("请先登录后再从Steam导入");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await invokeLookupGame(supabase, {
        query: pick ? pick.name : q,
        steamAppId: pick?.steamAppId ?? undefined,
        import: true,
        allowManual: true,
      });
      setLastResult(result);
      const list = result.candidates || [];
      if (list.length > 0) {
        setCandidates(list);
        const idx = pick
          ? list.findIndex(
              (c) =>
                c.name === pick.name &&
                c.steamAppId === pick.steamAppId,
            )
          : 0;
        setSelectedIdx(idx >= 0 ? idx : 0);
      }
      if (result.game) {
        onImported(result);
        onClose();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : formatLookupError(null));
    } finally {
      setLoading(false);
    }
  }

  const selected = candidates[selectedIdx];

  return (
    <Modal open={open} onClose={onClose} title="从Steam搜索导入" maxWidth="lg">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          检索 Steam / ITAD 并录入云端游戏清单，方便价格提醒与折扣匹配。
        </p>
        <div className="flex gap-2">
          <input
            data-testid="wishlist-lookup-query"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="游戏名称（中英文均可）"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void runLookup();
              }
            }}
          />
          <button
            type="button"
            className="btn-primary inline-flex items-center shrink-0"
            disabled={loading}
            onClick={() => void runLookup()}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span className="ml-2">搜索</span>
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {candidates.length > 1 && (
          <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
            <p className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-b">
              找到多个结果，请选择后点击【确认导入】
            </p>
            {candidates.map((c, i) => (
              <label
                key={`${c.name}-${c.steamAppId ?? "m"}-${i}`}
                className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name="lookup-candidate"
                  checked={selectedIdx === i}
                  onChange={() => setSelectedIdx(i)}
                />
                <span className="text-sm font-medium text-gray-800">{c.name}</span>
                {c.steamAppId != null && (
                  <span className="text-xs text-gray-500">
                    Steam #{c.steamAppId}
                  </span>
                )}
                <span className="text-xs text-gray-400 ml-auto">{c.source}</span>
              </label>
            ))}
          </div>
        )}

        {lastResult?.message && (
          <p className="text-sm text-amber-700">{lastResult.message}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            取消
          </button>
          {candidates.length > 1 && selected && (
            <button
              type="button"
              className="btn-primary"
              disabled={loading}
              data-testid="wishlist-lookup-confirm"
              onClick={() => void runLookup(selected)}
            >
              确认导入
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}