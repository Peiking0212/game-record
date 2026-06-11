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
  if (row.emailedAt && row.emailTo) {
    return `已发送至 ${row.emailTo}`;
  }
  if (row.emailError === "email_disabled_by_user") {
    return "已关闭邮件提醒";
  }
  if (row.emailError?.startsWith("resend_")) {
    return "发送失败(邮件服务异常)";
  }
  if (row.emailError === "no_user_email") {
    return "账号无邮箱，无法发送";
  }
  if (row.emailError) {
    return "待重试或发送失败";
  }
  return "待发送(降价已记录)";
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
        className="max-w-6xl mx-auto mb-8 p-5 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white"
      >
        <p className="text-sm text-gray-500">
          登录后可在目标价达标时接收邮件降价提醒（发送至账号注册邮箱）。
        </p>
      </div>
    );
  }

  return (
    <div
      id="wishlist-email-panel"
      data-testid="wishlist-email-panel"
      className="max-w-6xl mx-auto mb-8 p-5 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white"
    >
      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-2">
        <Mail className="w-5 h-5 text-blue-500" />
        邮件降价提醒
      </h3>
      <p className="text-sm text-gray-600 mb-3">
        当游戏现价低于你在愿望卡片设置的目标价时，除站内提醒与弹窗外，系统会向
        {userEmail ? (
          <>
            {" "}
            <strong className="text-gray-800">{userEmail}</strong>
          </>
        ) : (
          " 你的登录邮箱"
        )}
        发送邮件。可在每张愿望卡的【保存提醒】旁选择是否开启邮件推送。
      </p>
      <p className="text-xs text-gray-500 mb-4">
        需要服务端配置Resend(RESEND_API_KEY)。未配置时事件会留存，由定时任务延后重试。
      </p>

      {loading && <p className="text-sm text-gray-500 mb-2">加载发送记录中…</p>}

      {rows.length > 0 ? (
        <ul className="space-y-2 text-sm" data-testid="wishlist-email-delivery-list">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap justify-between gap-2 py-2 border-b border-blue-100 last:border-0"
            >
              <span className="text-gray-800">
                <span className="font-medium">{row.gameName}</span>
                {" · "}触发价¥{row.triggerPrice}
              </span>
              <span className="text-gray-500 text-xs">
                {formatDate(row.triggeredAt)} · {formatEmailStatus(row)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        !loading && (
          <p className="text-sm text-gray-500">
            暂无降价邮件记录。设置目标价并保存后，价格达标会自动尝试发送。
          </p>
        )
      )}
    </div>
  );
}