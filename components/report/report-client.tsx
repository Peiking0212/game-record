"use client";

import { Calendar, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { GameIcon } from "@/components/games/game-icon";
import { useToast } from "@/components/ui/toast";
import { buildReport, getReportYears, type ReportData } from "@/lib/report";

const SLIDE_BGS = [
  "linear-gradient(135deg, #E8F4FF, #D4ECFF)",
  "linear-gradient(135deg, #FFF7ED, #FFEDD5)",
  "linear-gradient(135deg, #ECFDF5, #D1FAE5)",
  "linear-gradient(135deg, #FDF2F8, #FCE7F3)",
  "linear-gradient(135deg, #ECFEFF, #CFFAFE)",
  "linear-gradient(135deg, #F5F3FF, #EDE9FE)",
] as const;

const BAR_COLORS = [
  "#52B6FF",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
] as const;

function Slide({
  children,
  bg,
}: {
  children: React.ReactNode;
  bg: string;
}) {
  return (
    <div
      className="min-w-full flex flex-col items-center justify-center px-6 py-10 text-center"
      style={{ background: bg, minHeight: "80vh" }}
    >
      {children}
    </div>
  );
}

function YearBadge({ text }: { text: string }) {
  return (
    <span className="inline-block px-6 py-1 rounded-full bg-gradient-to-r from-[#52B6FF] to-[#94D8FF] text-white font-bold text-sm mb-6">
      {text}
    </span>
  );
}

export function ReportClient() {
  const { showToast } = useToast();
  const years = useMemo(() => getReportYears(), []);
  const [year, setYear] = useState<number | null>(years[0] ?? null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = useMemo(() => {
    if (!report) return [];

    const completed = report.games.filter((g) => g.status === "completed").length;
    const playing = report.games.filter((g) => g.status === "playing").length;
    const sortedTypes = Object.entries(report.typeCounts).sort((a, b) => b[1] - a[1]);
    const maxType = sortedTypes[0]?.[1] || 1;

    const gameSpending = report.spending.reduce<Record<string, number>>((acc, s) => {
      const key = s.game || "鍏朵粬";
      acc[key] = (acc[key] || 0) + (Number(s.amount) || 0);
      return acc;
    }, {});
    const sortedSpending = Object.entries(gameSpending).sort((a, b) => b[1] - a[1]);
    const maxSpend = sortedSpending[0]?.[1] || 1;

    const top3 = [...report.games]
      .sort(
        (a, b) =>
          (parseInt(String(b.playtime), 10) || 0) -
          (parseInt(String(a.playtime), 10) || 0),
      )
      .slice(0, 3);

    return [
      <Slide key="cover" bg={SLIDE_BGS[0]}>
        <YearBadge text={`${report.year} 路 骞村害鍥為【`} />
        <div className="text-7xl my-4">馃幃</div>
        <div className="text-7xl font-black bg-gradient-to-r from-[#52B6FF] via-[#f59e0b] to-[#94D8FF] bg-clip-text text-transparent">
          {report.year}
        </div>
        <p className="text-xl font-semibold text-gray-800 mt-4">浣犵殑娓告垙骞村害鎶ュ憡</p>
        <p className="text-gray-600 mt-2">
          璁板綍浜?{report.games.length} 娆炬父鎴忋€亄report.achievements.length} 涓垚灏辩殑绮惧僵涓€骞?
        </p>
      </Slide>,

      <Slide key="overview" bg={SLIDE_BGS[1]}>
        <YearBadge text="鏁版嵁鎬昏" />
        <h2 className="text-3xl font-extrabold text-gray-800 mb-6">杩欎竴骞达紝浣犫€︹€?/h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl w-full">
          <MiniCard value={String(report.games.length)} label="娓哥帺娓告垙" />
          <MiniCard value={`${report.totalHours}h`} label="娓告垙鏃堕暱" />
          <MiniCard value={String(report.achievements.length)} label="瑙ｉ攣鎴愬氨" />
          <MiniCard value={String(completed)} label="宸查€氬叧" />
          <MiniCard value={String(playing)} label="杩涜涓? />
        </div>
      </Slide>,

      <Slide key="genre" bg={SLIDE_BGS[2]}>
        <YearBadge text="娓告垙绫诲瀷" />
        <h2 className="text-3xl font-extrabold text-gray-800 mb-6">浣犳渶鐖辩帺鐨勭被鍨?/h2>
        <div className="w-full max-w-xl space-y-3">
          {sortedTypes.length === 0 ? (
            <p className="text-gray-500">鏆傛棤绫诲瀷鏁版嵁</p>
          ) : (
            sortedTypes.map(([name, count], i) => {
              const pct = Math.round((count / maxType) * 100);
              return (
                <div key={name} className="flex items-center gap-3">
                  <span className="w-20 text-right text-sm font-semibold text-gray-700">{name}</span>
                  <div className="flex-1 h-6 bg-gray-200 rounded-lg overflow-hidden">
                    <div
                      className="h-full rounded-lg"
                      style={{ width: `${pct}%`, background: BAR_COLORS[i % BAR_COLORS.length] }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-700 min-w-12">{count}娆?/span>
                </div>
              );
            })
          )}
        </div>
        {sortedTypes[0] ? (
          <p className="mt-4 text-gray-600">
            鏈€鐖憋細<strong className="text-[#52B6FF]">{sortedTypes[0][0]}</strong>
          </p>
        ) : null}
      </Slide>,

      <Slide key="spending" bg={SLIDE_BGS[3]}>
        <YearBadge text="娑堣垂璁板綍" />
        <div className="text-7xl font-black bg-gradient-to-r from-[#f59e0b] via-[#fbbf24] to-[#f59e0b] bg-clip-text text-transparent">
          楼{report.totalSpent.toFixed(0)}
        </div>
        <p className="text-gray-600 mt-2">骞村害娓告垙鎬昏姳璐?/p>
        <div className="grid grid-cols-2 gap-4 max-w-md w-full my-5">
          <MiniCard
            value={`楼${report.totalHours > 0 ? (report.totalSpent / report.totalHours).toFixed(2) : "0.00"}`}
            label="姣忓皬鏃舵垚鏈?
          />
          <MiniCard value={String(report.spending.length)} label="娑堣垂绗旀暟" />
        </div>
        {sortedSpending.length > 0 ? (
          <div className="w-full max-w-xl space-y-2">
            {sortedSpending.slice(0, 5).map(([name, amount], i) => (
              <div key={name} className="flex items-center gap-3">
                <span className="w-24 text-right text-xs font-semibold text-gray-700">{name}</span>
                <div className="flex-1 h-6 bg-gray-200 rounded-lg overflow-hidden">
                  <div
                    className="h-full rounded-lg"
                    style={{
                      width: `${Math.round((amount / maxSpend) * 100)}%`,
                      background: BAR_COLORS[i % BAR_COLORS.length],
                    }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-700 min-w-14">楼{amount.toFixed(0)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 mt-4">鏆傛棤娑堣垂璁板綍</p>
        )}
      </Slide>,

      <Slide key="top" bg={SLIDE_BGS[4]}>
        <YearBadge text="鏈€甯哥帺鐨勬父鎴? />
        <h2 className="text-3xl font-extrabold text-gray-800 mb-6">浣犵殑骞村害 TOP 3</h2>
        <div className="w-full max-w-xl space-y-3">
          {top3.length === 0 ? (
            <p className="text-gray-500">鏆傛棤娓告垙鏃堕暱璁板綍</p>
          ) : (
            top3.map((g, i) => (
              <div key={String(g.id)} className="flex items-center gap-4 p-3 bg-white rounded-2xl shadow-sm">
                <span
                  className={`text-2xl font-black w-10 text-center ${
                    i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : "text-orange-600"
                  }`}
                >
                  #{i + 1}
                </span>
                <GameIcon
                  src={g.icon}
                  name={g.name}
                  width={50}
                  height={50}
                  className="w-[50px] h-[50px] rounded-xl object-cover"
                />
                <div className="text-left flex-1">
                  <div className="font-bold text-gray-800">{g.name}</div>
                  <div className="text-xs text-gray-500">
                    {parseInt(String(g.playtime), 10) || 0} 灏忔椂 路 杩涘害 {parseInt(String(g.progress), 10) || 0}%
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Slide>,

      <Slide key="end" bg={SLIDE_BGS[5]}>
        <div className="text-6xl my-3">馃弳</div>
        <h2 className="text-4xl font-extrabold text-gray-800 my-2">绮惧僵鐨勪竴骞达紒</h2>
        <p className="text-gray-600">{report.year} 骞达紝浣犳€诲叡鐜╀簡 <strong>{report.games.length}</strong> 娆炬父鎴?/p>
        <p className="text-gray-600">绱 <strong>{report.totalHours}</strong> 灏忔椂</p>
        <p className="text-gray-600">瑙ｉ攣浜?<strong>{report.achievements.length}</strong> 涓垚灏?/p>
        <p className="mt-8 text-sm text-gray-500">鏈熷緟鏂扮殑涓€骞达紝缁х画鍐掗櫓锛佲湪</p>
      </Slide>,
    ];
  }, [report]);

  const totalSlides = slides.length;

  const go = (index: number) => {
    if (index < 0 || index >= totalSlides) return;
    setCurrentSlide(index);
  };

  return (
    <>
      <section className="bg-gradient-to-br from-[#52B6FF15] to-[#94D8FF15] py-6">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-3 bg-white rounded-full px-5 py-2 shadow-md">
            <Calendar className="w-5 h-5 text-[#52B6FF]" />
            <select
              className="text-lg font-bold bg-transparent border-none outline-none cursor-pointer text-gray-800"
              value={year ?? ""}
              onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">閫夋嫨骞翠唤</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y} 骞?
                </option>
              ))}
            </select>
            <button
              className="px-4 py-1.5 rounded-full text-white font-semibold text-sm border-none btn-primary"
              onClick={() => {
                if (!year) {
                  showToast("璇峰厛閫夋嫨骞翠唤", "error");
                  return;
                }
                const next = buildReport(year);
                if (next.games.length === 0 && next.achievements.length === 0) {
                  showToast(`${year} 骞存殏鏃犳父鎴忔暟鎹甡, "info");
                  return;
                }
                setReport(next);
                setCurrentSlide(0);
              }}
            >
              鐢熸垚鎶ュ憡 鉁?
            </button>
          </div>
        </div>
      </section>

      {!report ? (
        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <Sparkles className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">骞村害娓告垙鎶ュ憡</h2>
            <p className="text-gray-500 mb-6">閫夋嫨骞翠唤锛岀敓鎴愪綘鐨勪笓灞炴父鎴忓勾搴︽姤鍛?鉁?/p>
            <p className="text-gray-400 text-sm">鍍?Spotify Wrapped 涓€鏍凤紝鍥為【浣犵殑娓告垙涔嬫梾</p>
          </div>
        </section>
      ) : (
        <section className="relative overflow-hidden min-h-[80vh]">
          <div
            className="flex transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {slides}
          </div>

          <button
            className="hidden sm:flex fixed top-1/2 -translate-y-1/2 left-4 w-10 h-10 rounded-full bg-white border border-gray-200 z-50 items-center justify-center shadow text-gray-500 hover:text-[#52B6FF]"
            onClick={() => go(currentSlide - 1)}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            className="hidden sm:flex fixed top-1/2 -translate-y-1/2 right-4 w-10 h-10 rounded-full bg-white border border-gray-200 z-50 items-center justify-center shadow text-gray-500 hover:text-[#52B6FF]"
            onClick={() => go(currentSlide + 1)}
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-50">
            {slides.map((_, i) => (
              <button
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentSlide ? "bg-[#52B6FF] scale-125" : "bg-gray-300"}`}
                onClick={() => go(i)}
                aria-label={`璺宠浆鍒扮 ${i + 1} 椤礰}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function MiniCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-center">
      <div className="text-3xl font-extrabold text-gray-800">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
