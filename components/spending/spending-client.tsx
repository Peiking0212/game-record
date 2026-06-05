"use client";

import {
  Calendar,
  List,
  Pencil,
  PlusCircle,
  Receipt,
  Save,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { getGames } from "@/lib/game-data";
import { formatDate, gameDetailPath } from "@/lib/game-utils";
import { getWishlist } from "@/lib/wishlist";
import {
  DEFAULT_GAME_LABEL,
  DEFAULT_PLATFORM,
  filterSpendingByYear,
  getSpending,
  getSpendingYears,
  platformClass,
  PLATFORM_OPTIONS,
  RECORD_TYPE_LABEL,
  saveSpending,
  type SpendingItem,
  type SpendingRecordType,
} from "@/lib/spending";

type FormState = {
  recordType: SpendingRecordType;
  linkValue: string;
  amount: string;
  date: string;
  platform: string;
  note: string;
};

type LinkOption = {
  value: string;
  label: string;
  game: string;
  gameId?: number | string;
  wishlistId?: number | string;
};

const RECHARGE_OTHER = "__recharge_other__";

function todayIso(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function fmtMoney(v: number): string {
  return `楼${(Number(v) || 0).toFixed(2)}`;
}

function normalizeType(
  recordType?: string,
  wishlistId?: number | string,
): SpendingRecordType {
  if (recordType === "purchase" || recordType === "recharge") return recordType;
  return wishlistId != null && wishlistId !== "" ? "purchase" : "recharge";
}

function monthlyAverage(items: SpendingItem[], year: string): number {
  if (!items.length) return 0;
  const total = items.reduce((s, x) => s + x.amount, 0);
  if (year !== "all") return total / 12;

  const dates = items
    .map((x) => new Date(x.date))
    .filter((d) => !Number.isNaN(d.getTime()));
  if (!dates.length) return 0;

  const min = new Date(Math.min(...dates.map((d) => d.getTime())));
  const max = new Date(Math.max(...dates.map((d) => d.getTime())));
  const months =
    (max.getFullYear() - min.getFullYear()) * 12 +
    (max.getMonth() - min.getMonth()) +
    1;
  return total / Math.max(1, months);
}

function buildPurchaseLinks(): LinkOption[] {
  const wishlist = getWishlist()
    .slice()
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "zh-CN"));
  return wishlist.map((w) => ({
    value: String(w.id),
    label: w.name || "鏈懡鍚?,
    game: w.name || "鏈懡鍚?,
    wishlistId: w.id,
  }));
}

function buildRechargeLinks(): LinkOption[] {
  const games = getGames()
    .slice()
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "zh-CN"));
  return [
    { value: RECHARGE_OTHER, label: "鍏朵粬 / 璐︽埛鍏呭€?, game: DEFAULT_GAME_LABEL },
    ...games.map((g) => ({
      value: String(g.id),
      label: g.name || "鏈懡鍚?,
      game: g.name || "鏈懡鍚?,
      gameId: g.id,
    })),
  ];
}

function defaultForm(): FormState {
  return {
    recordType: "purchase",
    linkValue: "",
    amount: "",
    date: todayIso(),
    platform: DEFAULT_PLATFORM,
    note: "",
  };
}

export function SpendingClient() {
  const { showToast } = useToast();
  const [items, setItems] = useState<SpendingItem[]>([]);
  const [year, setYear] = useState("all");

  const [addForm, setAddForm] = useState<FormState>(defaultForm);
  const [editing, setEditing] = useState<SpendingItem | null>(null);
  const [editForm, setEditForm] = useState<FormState>(defaultForm);

  useEffect(() => {
    setItems(getSpending());
  }, []);

  const years = useMemo(() => getSpendingYears(items), [items]);

  const filtered = useMemo(() => {
    const list = filterSpendingByYear(items, year);
    return list.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [items, year]);

  const stats = useMemo(() => {
    const total = filtered.reduce((s, x) => s + x.amount, 0);
    const count = filtered.length;
    const purchaseCount = filtered.filter((x) => x.recordType === "purchase").length;
    const rechargeCount = count - purchaseCount;
    return {
      total,
      count,
      avg: count ? total / count : 0,
      monthly: monthlyAverage(filtered, year),
      purchaseCount,
      rechargeCount,
    };
  }, [filtered, year]);

  const purchaseLinks = useMemo(() => buildPurchaseLinks(), [items]);
  const rechargeLinks = useMemo(() => buildRechargeLinks(), [items]);

  const addLinks = addForm.recordType === "purchase" ? purchaseLinks : rechargeLinks;
  const editLinks =
    editForm.recordType === "purchase" ? purchaseLinks : rechargeLinks;

  useEffect(() => {
    setAddForm((f) => {
      const links = f.recordType === "purchase" ? purchaseLinks : rechargeLinks;
      const nextValue = links[0]?.value ?? "";
      if (f.linkValue && links.some((x) => x.value === f.linkValue)) return f;
      return { ...f, linkValue: nextValue };
    });
  }, [purchaseLinks, rechargeLinks]);

  const persist = (next: SpendingItem[], okMessage: string) => {
    if (!saveSpending(next)) {
      showToast("淇濆瓨澶辫触锛岃绋嶅悗閲嶈瘯", "error");
      return false;
    }
    setItems(next);
    showToast(okMessage, "success");
    return true;
  };

  const readRecordFields = (
    form: FormState,
    links: LinkOption[],
  ): Pick<SpendingItem, "recordType" | "game" | "gameId" | "wishlistId"> | null => {
    if (form.recordType === "purchase") {
      const link = links.find((x) => x.value === form.linkValue);
      if (!link?.wishlistId) {
        showToast("璇烽€夋嫨鎰挎湜鍗曚腑鐨勬父鎴?, "error");
        return null;
      }
      return {
        recordType: "purchase",
        game: link.game,
        wishlistId: link.wishlistId,
        gameId: undefined,
      };
    }

    if (form.linkValue === RECHARGE_OTHER) {
      return {
        recordType: "recharge",
        game: DEFAULT_GAME_LABEL,
        gameId: undefined,
        wishlistId: undefined,
      };
    }
    const link = links.find((x) => x.value === form.linkValue);
    if (!link) {
      showToast("璇烽€夋嫨鍏呭€煎搴旂殑娓告垙", "error");
      return null;
    }
    return {
      recordType: "recharge",
      game: link.game,
      gameId: link.gameId,
      wishlistId: undefined,
    };
  };

  const validateMoneyAndDate = (form: FormState): boolean => {
    const amount = Number(form.amount);
    if (Number.isNaN(amount) || amount < 0) {
      showToast("璇疯緭鍏ユ湁鏁堥噾棰?, "error");
      return false;
    }
    if (!form.date) {
      showToast("璇烽€夋嫨娑堣垂鏃ユ湡", "error");
      return false;
    }
    return true;
  };

  const onAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateMoneyAndDate(addForm)) return;
    const recordFields = readRecordFields(addForm, addLinks);
    if (!recordFields) return;

    const next: SpendingItem = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      amount: Number(addForm.amount),
      date: addForm.date,
      platform: addForm.platform || DEFAULT_PLATFORM,
      note: addForm.note.trim(),
      ...recordFields,
    };
    if (!persist([...items, next], "娑堣垂璁板綍宸叉坊鍔?)) return;
    setAddForm({
      ...defaultForm(),
      linkValue: (addLinks[0]?.value ?? ""),
    });
  };

  const startEdit = (item: SpendingItem) => {
    const type = normalizeType(item.recordType, item.wishlistId);
    const links = type === "purchase" ? purchaseLinks : rechargeLinks;
    const linkValue =
      type === "purchase"
        ? String(item.wishlistId ?? "")
        : item.gameId != null && item.gameId !== ""
          ? String(item.gameId)
          : RECHARGE_OTHER;

    setEditing(item);
    setEditForm({
      recordType: type,
      linkValue: links.some((x) => x.value === linkValue)
        ? linkValue
        : (links[0]?.value ?? ""),
      amount: String(item.amount ?? ""),
      date: item.date || todayIso(),
      platform: item.platform || DEFAULT_PLATFORM,
      note: item.note || "",
    });
  };

  const onEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!validateMoneyAndDate(editForm)) return;
    const recordFields = readRecordFields(editForm, editLinks);
    if (!recordFields) return;

    const next = items.map((x) =>
      String(x.id) !== String(editing.id)
        ? x
        : {
            ...x,
            amount: Number(editForm.amount),
            date: editForm.date,
            platform: editForm.platform || DEFAULT_PLATFORM,
            note: editForm.note.trim(),
            ...recordFields,
          },
    );
    if (!persist(next, "娑堣垂璁板綍宸叉洿鏂?)) return;
    setEditing(null);
  };

  const onDelete = (id: string) => {
    if (!window.confirm("纭畾瑕佸垹闄よ繖鏉℃秷璐硅褰曞悧锛?)) return;
    const next = items.filter((x) => String(x.id) !== String(id));
    persist(next, "娑堣垂璁板綍宸插垹闄?);
  };

  return (
    <>
      <section className="bg-gradient-to-br from-[#52B6FF15] to-[#94D8FF15] py-14">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-[#223344] to-[#5B9BD5] bg-clip-text text-transparent">
            娑堣垂璁板綍
          </h1>
          <p className="text-lg text-gray-600 mb-6 max-w-xl mx-auto">
            璁板綍浣犵殑娓告垙鑺辫垂锛岀悊鎬ф秷璐?
          </p>
          <div className="inline-flex items-center gap-3 bg-white rounded-full px-5 py-2 shadow-md">
            <Calendar className="w-5 h-5 text-[#52B6FF]" />
            <select
              className="text-base font-bold bg-transparent border-none outline-none cursor-pointer text-gray-800"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              <option value="all">鍏ㄩ儴骞翠唤</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y} 骞?
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="py-10 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="chart-card">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-6">
              <PlusCircle className="w-6 h-6 text-[#52B6FF]" />
              娣诲姞娑堣垂璁板綍
            </h2>
            <form className="space-y-5" onSubmit={onAddSubmit}>
              <SpendingFormFields
                form={addForm}
                setForm={setAddForm}
                links={addLinks}
              />
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary">
                  <Save className="w-5 h-5 inline mr-2" />
                  娣诲姞璁板綍
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setAddForm({ ...defaultForm(), linkValue: addLinks[0]?.value ?? "" })}
                >
                  閲嶇疆
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="py-10 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            <StatCard title="鎬昏姳璐? value={fmtMoney(stats.total)} />
            <StatCard
              title="娑堣垂绗旀暟"
              value={String(stats.count)}
              sub={stats.count ? `${stats.purchaseCount} 绗旇喘涔?路 ${stats.rechargeCount} 绗斿厖鍊糮 : ""}
            />
            <StatCard title="骞冲潎姣忕瑪娑堣垂" value={fmtMoney(stats.avg)} />
            <StatCard title="鏈堝潎娑堣垂" value={fmtMoney(stats.monthly)} />
          </div>
        </div>
      </section>

      <section className="py-10 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <List className="w-6 h-6 text-[#52B6FF]" />
              娑堣垂璁板綍鍒楄〃
            </h2>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700 mb-2">鏆傛棤娑堣垂璁板綍</h3>
              <p className="text-gray-500">鍦ㄤ笂鏂硅〃鍗曟坊鍔犱綘鐨勭涓€鏉℃秷璐硅褰曞惂</p>
            </div>
          ) : (
            <div className="spending-table-wrap overflow-x-auto">
              <table className="spending-table">
                <thead>
                  <tr>
                    <th>绫诲瀷</th>
                    <th>椤圭洰</th>
                    <th>閲戦 (楼)</th>
                    <th>鏃ユ湡</th>
                    <th>骞冲彴</th>
                    <th>澶囨敞</th>
                    <th>鎿嶄綔</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={String(r.id)}>
                      <td>
                        <span
                          className={`spending-type-badge ${
                            r.recordType === "purchase"
                              ? "spending-type-purchase"
                              : "spending-type-recharge"
                          }`}
                        >
                          {RECORD_TYPE_LABEL[r.recordType]}
                        </span>
                      </td>
                      <td>
                        {r.recordType === "recharge" && r.gameId != null ? (
                          <a
                            href={gameDetailPath(r.gameId)}
                            className="text-[#52B6FF] hover:underline font-medium"
                          >
                            {r.game}
                          </a>
                        ) : r.recordType === "purchase" && r.wishlistId != null ? (
                          <a
                            href="/wishlist"
                            className="text-[#52B6FF] hover:underline font-medium"
                          >
                            {r.game}
                          </a>
                        ) : (
                          <span className="font-medium text-gray-800">{r.game}</span>
                        )}
                      </td>
                      <td>
                        <span className="spending-amount">{fmtMoney(r.amount)}</span>
                      </td>
                      <td>{formatDate(r.date)}</td>
                      <td>
                        <span
                          className={`spending-platform-badge ${platformClass(r.platform)}`}
                        >
                          {r.platform || "-"}
                        </span>
                      </td>
                      <td>
                        <span className="text-gray-600 text-sm">{r.note || "-"}</span>
                      </td>
                      <td className="space-x-1 whitespace-nowrap">
                        <button
                          type="button"
                          className="spending-action-btn edit-btn"
                          title="缂栬緫"
                          onClick={() => startEdit(r)}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="spending-action-btn delete-btn"
                          title="鍒犻櫎"
                          onClick={() => onDelete(String(r.id))}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="缂栬緫娑堣垂璁板綍"
      >
        <form className="space-y-5" onSubmit={onEditSubmit}>
          <SpendingFormFields form={editForm} setForm={setEditForm} links={editLinks} />
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">
              <Save className="w-5 h-5 inline mr-2" />
              淇濆瓨鏇存敼
            </button>
            <button
              type="button"
              className="btn-secondary flex-1"
              onClick={() => setEditing(null)}
            >
              鍙栨秷
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function StatCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="stat-card-spending">
      <div className="stat-icon-wrap" style={{ background: "#E8F4FF" }}>
        <Receipt className="w-5 h-5 text-[#52B6FF]" />
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">
        {title}
        {sub ? <span className="block text-xs font-normal text-gray-400 mt-1">{sub}</span> : null}
      </div>
    </div>
  );
}

function SpendingFormFields({
  form,
  setForm,
  links,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  links: LinkOption[];
}) {
  const linkHelp =
    form.recordType === "purchase"
      ? "璐拱娓告垙锛氫粠鎰挎湜鍗曢€夋嫨瑕佽喘涔扮殑娓告垙锛岃褰曚細鏄剧ず鍦ㄦ効鏈涘崟椤甸潰銆?
      : "璐︽埛鍏呭€硷細浠庢父鎴忓簱閫夋嫨鍏呭€煎搴旂殑娓告垙锛岃褰曚細鏄剧ず鍦ㄨ娓告垙璇︽儏椤点€?;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">娑堣垂绫诲瀷</label>
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={form.recordType}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                recordType: e.target.value as SpendingRecordType,
                linkValue: "",
              }))
            }
          >
            <option value="purchase">璐拱娓告垙</option>
            <option value="recharge">璐︽埛鍏呭€?/option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">鍏宠仈椤圭洰</label>
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={form.linkValue}
            onChange={(e) => setForm((f) => ({ ...f, linkValue: e.target.value }))}
          >
            {links.length === 0 ? (
              <option value="">
                {form.recordType === "purchase"
                  ? "鎰挎湜鍗曚负绌猴紝璇峰厛鍦ㄦ効鏈涘崟椤垫坊鍔?
                  : "娓告垙搴撲负绌猴紝榛樿璁板綍涓鸿处鎴峰厖鍊?}
              </option>
            ) : (
              links.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            )}
          </select>
          <p className="spending-link-help">{linkHelp}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">閲戦 (楼)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={form.amount}
            placeholder="渚嬪锛?98.00"
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">娑堣垂鏃ユ湡</label>
          <input
            type="date"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">骞冲彴</label>
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={form.platform}
            onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
          >
            {PLATFORM_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">澶囨敞</label>
        <textarea
          rows={2}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="渚嬪锛氶璐豹鍗庣増銆丏LC銆佹父鎴忓唴璐€丼team 閽卞寘鍏呭€?.."
          value={form.note}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
        />
      </div>
    </>
  );
}
