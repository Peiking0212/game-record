"use client";

import { Mail } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { formatDate } from "@/lib/game-utils";
import {
  fetchRecentEmailDeliveries,
  type EmailDeliveryRow,
} from "@/lib/wishlist-alerts";
import { tryCreateClient } from "@/lib/supabase/client";

type Props = {
  signedIn: boolean;
  refreshKey: number;
};

function formatEmailStatus(row: EmailDeliveryRow): string {
  if (row.emailed_at && row.email_to) {
    return `宸插彂閫佽嚦 ${row.email_to}`;
  }
  if (row.email_error === "email_disabled_by_user") {
    return "宸插叧闂偖浠舵彁閱?;
  }
  if (row.email_error?.startsWith("resend_")) {
    return "鍙戦€佸け璐ワ紙閭欢鏈嶅姟锛?;
  }
  if (row.email_error === "no_user_email") {
    return "璐﹀彿鏃犻偖绠憋紝鏃犳硶鍙戦€?;
  }
  if (row.email_error) {
    return "寰呴噸璇曟垨鍙戦€佸け璐?;
  }
  return "寰呭彂閫侊紙闄嶄环宸茶褰曪級";
}

export function WishlistEmailAlertsPanel({ signedIn, refreshKey }: Props) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [rows, setRows] = useState<EmailDeliveryRow[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    const supabase = tryCreateClient();
    if (!supabase || !signedIn) {
      setUserEmail(null);
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      setUserEmail(session.session?.user?.email ?? null);
      const deliveries = await fetchRecentEmailDeliveries(supabase);
      setRows(deliveries);
    } finally {
      setLoading(false);
    }
  }, [signedIn]);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  if (!signedIn) {
    return (
      <div
        id="wishlist-email-panel"
        className="max-w-6xl mx-auto mb-8 p-5 rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-white"
      >
        <p className="text-sm text-gray-500">
          鐧诲綍鍚庡彲鍦ㄧ洰鏍囦环杈炬爣鏃舵帴鏀堕偖浠堕檷浠锋彁閱掞紙鍙戦€佽嚦璐﹀彿娉ㄥ唽閭锛夈€?
        </p>
      </div>
    );
  }

  return (
    <div
      id="wishlist-email-panel"
      data-testid="wishlist-email-panel"
      className="max-w-6xl mx-auto mb-8 p-5 rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-white"
    >
      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-2">
        <Mail className="w-5 h-5 text-violet-500" />
        閭欢闄嶄环鎻愰啋
      </h3>
      <p className="text-sm text-gray-600 mb-3">
        褰撴父鎴忕幇浠蜂綆浜庝綘鍦ㄦ効鏈涘崱鐗囦笂璁剧疆鐨勭洰鏍囦环鏃讹紝闄ょ珯鍐呮彁閱掍笌鐪嬫澘濞樺锛岀郴缁熶細鍚?
        {userEmail ? (
          <>
            {" "}
            <strong className="text-gray-800">{userEmail}</strong>
          </>
        ) : (
          " 浣犵殑鐧诲綍閭"
        )}
        鍙戦€侀偖浠躲€傚彲鍦ㄦ瘡寮犳効鏈涘崱鐨勩€屼繚瀛樻彁閱掋€嶆梺鍕鹃€夋槸鍚﹀彂閫侀偖浠躲€?
      </p>
      <p className="text-xs text-gray-500 mb-4">
        闇€鏈嶅姟绔厤缃?Resend锛圧ESEND_API_KEY锛夈€傛湭閰嶇疆鏃朵簨浠朵細淇濈暀锛岀敱瀹氭椂浠诲姟绋嶅悗閲嶈瘯銆?
      </p>

      {loading && <p className="text-sm text-gray-500 mb-2">鍔犺浇鍙戦€佽褰曗€?/p>}

      {rows.length > 0 ? (
        <ul className="space-y-2 text-sm" data-testid="wishlist-email-delivery-list">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap justify-between gap-2 py-2 border-b border-violet-100 last:border-0"
            >
              <span className="text-gray-800">
                <span className="font-medium">{row.gameName}</span>
                {" 路 "}瑙﹀彂浠?楼{row.trigger_price}
              </span>
              <span className="text-gray-500 text-xs">
                {formatDate(row.triggered_at)} 路 {formatEmailStatus(row)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        !loading && (
          <p className="text-sm text-gray-500">
            鏆傛棤闄嶄环閭欢璁板綍銆傝缃洰鏍囦环骞朵繚瀛樺悗锛屼环鏍艰揪鏍囨椂浼氳嚜鍔ㄥ皾璇曞彂閫併€?
          </p>
        )
      )}
    </div>
  );
}
