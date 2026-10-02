"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Transaction, DashboardFilter } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Loader2, FilterX, TrendingUp, Package, Briefcase, Building2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  TooltipProps,
  ComposedChart,
  Area,
  ReferenceLine,
} from "recharts";

const MONTHS_LABEL: Record<number, string> = {
  1: "Januari", 2: "Februari", 3: "Maret", 4: "April",
  5: "Mei", 6: "Juni", 7: "Juli", 8: "Agustus",
  9: "September", 10: "Oktober", 11: "November", 12: "Desember",
};

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316",
];

// Custom tooltip for currency
const CurrencyTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-slate-700 mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color }} className="font-medium">
            {formatCurrency(Number(entry.value) || 0)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const CountTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-slate-700 mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color }} className="font-medium">
            {new Intl.NumberFormat("id-ID").format(Number(entry.value) || 0)} transaksi
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ── Bell Curve Helpers ──────────────────────────────────────────
function normalPDF(x: number, mean: number, std: number): number {
  if (std === 0) return 0;
  return (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / std, 2));
}

function buildBellData(
  values: number[],
  color: string,
  label: string
): { curvePoints: { x: number; y: number; label?: string }[]; mean: number; std: number; color: string; label: string } {
  if (values.length < 2) {
    return { curvePoints: [], mean: 0, std: 0, color, label };
  }
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);

  if (std === 0) return { curvePoints: [], mean, std: 0, color, label };

  const minX = mean - 3.5 * std;
  const maxX = mean + 3.5 * std;
  const steps = 80;
  const stepSize = (maxX - minX) / steps;

  const curvePoints = Array.from({ length: steps + 1 }, (_, i) => {
    const x = minX + i * stepSize;
    return { x: Math.round(x), y: normalPDF(x, mean, std) };
  });

  return { curvePoints, mean, std, color, label };
}

const KATEGORI_COLORS: Record<string, string> = {
  Akut: "#3b82f6",
  Fisioterapi: "#10b981",
  Kronis: "#f59e0b",
};

type BellField = "total_keseluruhan" | "total_penjualan_barang" | "total_penjualan_jasa" | "total_penjualan_fasilitas";

const BELL_CONFIG: { field: BellField; label: string; color: string; accentClass: string }[] = [
  { field: "total_keseluruhan", label: "Total Keseluruhan", color: "#3b82f6", accentClass: "blue" },
  { field: "total_penjualan_barang", label: "Penjualan Barang", color: "#10b981", accentClass: "emerald" },
  { field: "total_penjualan_jasa", label: "Penjualan Jasa", color: "#f59e0b", accentClass: "amber" },
  { field: "total_penjualan_fasilitas", label: "Penjualan Fasilitas", color: "#8b5cf6", accentClass: "violet" },
];

interface BellCurveCardProps {
  allData: Transaction[];
  field: BellField;
  label: string;
  color: string;
}

function BellCurveCard({ allData, field, label, color }: BellCurveCardProps) {
  const [selectedKategori, setSelectedKategori] = useState("Semua");

  const availableKategori = useMemo(() => {
    const cats = Array.from(new Set(allData.map((t) => t.kategori_biaya).filter(Boolean))).sort();
    return ["Semua", ...cats];
  }, [allData]);

  const chartData = useMemo(() => {
    const getValue = (t: Transaction) => {
      if (field === "total_keseluruhan") {
        return Number(t.total_penjualan_barang || 0) + Number(t.total_penjualan_jasa || 0) + Number(t.total_penjualan_fasilitas || 0);
      }
      return Number(t[field as keyof Transaction] || 0);
    };

    if (selectedKategori === "Semua") {
      const values = allData.map(getValue).filter((v) => v > 0);
      const bell = buildBellData(values, color, label);
      return { series: [bell], globalMin: bell.curvePoints[0]?.x ?? 0, globalMax: bell.curvePoints[bell.curvePoints.length - 1]?.x ?? 0 };
    } else {
      const filtered = allData.filter((t) => t.kategori_biaya === selectedKategori);
      const values = filtered.map(getValue).filter((v) => v > 0);
      const bell = buildBellData(values, KATEGORI_COLORS[selectedKategori] || color, selectedKategori);
      return { series: [bell], globalMin: bell.curvePoints[0]?.x ?? 0, globalMax: bell.curvePoints[bell.curvePoints.length - 1]?.x ?? 0 };
    }
  }, [allData, field, label, color, selectedKategori]);

  // Merge all series' curvePoints into unified x-axis for recharts
  const mergedPoints = useMemo(() => {
    const { series } = chartData;
    const xSet = new Set<number>();
    series.forEach((s) => s.curvePoints.forEach((p) => xSet.add(p.x)));
    const xs = Array.from(xSet).sort((a, b) => a - b);

    return xs.map((x) => {
      const point: Record<string, number> = { x };
      series.forEach((s, i) => {
        const found = s.curvePoints.find((p) => p.x === x);
        point[`y${i}`] = found ? found.y : 0;
      });
      return point;
    });
  }, [chartData]);

  const { series } = chartData;
  const isEmpty = series.every((s) => s.curvePoints.length === 0);

  const stats = useMemo(() => {
    return series.map((s) => ({
      label: s.label,
      mean: s.mean,
      std: s.std,
      color: s.color,
    }));
  }, [series]);

  return (
    <Card className="border border-slate-200/70 shadow-sm bg-white rounded-xl">
      <CardHeader className="pb-3 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Distribusi Normal – {label}
          </CardTitle>
          <div className="flex gap-1 flex-wrap">
            {availableKategori.map((k) => (
              <button
                key={k}
                onClick={() => setSelectedKategori(k)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${selectedKategori === k
                  ? "bg-slate-800 text-white shadow-sm"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {isEmpty ? (
          <div className="h-[260px] flex items-center justify-center text-slate-400 text-sm">
            Tidak ada data untuk ditampilkan
          </div>
        ) : (
          <>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={mergedPoints} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
                  <defs>
                    {series.map((s, i) => (
                      <linearGradient key={i} id={`bellGrad-${field}-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={s.color} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={s.color} stopOpacity={0.02} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="x"
                    type="number"
                    domain={["auto", "auto"]}
                    tickFormatter={(v) => {
                      if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`;
                      if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}rb`;
                      return String(v);
                    }}
                    tick={{ fontSize: 9, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: "Nominal (Rp)", position: "insideBottom", offset: -18, fontSize: 10, fill: "#94a3b8" }}
                  />
                  <YAxis hide />
                  <Tooltip
                    labelFormatter={(v) => `Rp ${new Intl.NumberFormat("id-ID").format(Number(v))}`}
                    formatter={(v: any, name: any) => {
                      const idx = parseInt(String(name).replace("y", ""));
                      const s = series[idx];
                      return [(Number(v)).toExponential(3), s?.label || String(name)];
                    }}
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                  {series.map((s, i) => (
                    <Area
                      key={`area-${i}`}
                      type="monotone"
                      dataKey={`y${i}`}
                      stroke={s.color}
                      strokeWidth={2.5}
                      fill={`url(#bellGrad-${field}-${i})`}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      name={`y${i}`}
                    />
                  ))}
                  {series.map((s, i) => (
                    s.mean > 0 && (
                      <ReferenceLine
                        key={`ref-${i}`}
                        x={Math.round(s.mean)}
                        stroke={s.color}
                        strokeDasharray="5 3"
                        strokeWidth={1.5}
                        label={{
                          value: `μ=${Math.round(s.mean / 1000)}rb`,
                          position: "top",
                          fontSize: 9,
                          fill: s.color,
                          fontWeight: 600,
                        }}
                      />
                    )
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Stats summary */}
            <div className="mt-3 grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(series.length, 3)}, 1fr)` }}>
              {stats.map((s, i) => (
                <div key={i} className="rounded-lg p-3 bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-xs font-semibold text-slate-600">{s.label}</span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <div>μ (Rata-rata): <span className="font-semibold text-slate-700">{formatCurrency(s.mean)}</span></div>
                    <div>σ (Std Dev): <span className="font-semibold text-slate-700">{formatCurrency(s.std)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [allData, setAllData] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [filters, setFilters] = useState<DashboardFilter>({
    year: new Date().getFullYear(),
  });

  const [filterOptions, setFilterOptions] = useState({
    years: [] as number[],
    months: [] as number[],
    kategori_biaya: [] as string[],
    nama_penanggung_utama: [] as string[],
    instalasi: [] as string[],
    jenis_layanan: [] as string[],
  });

  // Fetch data from Supabase whenever year/month filter changes
  useEffect(() => {
    fetchData();
  }, [filters.year, filters.month]);

  const fetchData = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      if (
        process.env.NEXT_PUBLIC_SUPABASE_URL === "https://dummy.supabase.co" ||
        !process.env.NEXT_PUBLIC_SUPABASE_URL
      ) {
        setErrorMsg(
          "Kredensial Supabase belum diatur. Buat file .env.local dan isi NEXT_PUBLIC_SUPABASE_URL sesuai instruksi."
        );
        setIsLoading(false);
        return;
      }

      // Fetch all datasets to populate year/month options
      const { data: allDatasets } = await supabase.from("datasets").select("year, month");
      if (allDatasets) {
        const years = Array.from(new Set(allDatasets.map((d) => d.year))).sort((a, b) => b - a);
        const months = Array.from(new Set(allDatasets.map((d) => d.month))).sort((a, b) => a - b);
        setFilterOptions((prev) => ({
          ...prev,
          years: years.length ? years : [new Date().getFullYear()],
          months,
        }));
      }

      // Get dataset IDs for current year/month filter
      let datasetQuery = supabase.from("datasets").select("id");
      if (filters.year) datasetQuery = datasetQuery.eq("year", filters.year);
      if (filters.month) datasetQuery = datasetQuery.eq("month", filters.month);

      const { data: datasets } = await datasetQuery;

      if (!datasets || datasets.length === 0) {
        setAllData([]);
        setIsLoading(false);
        return;
      }

      const datasetIds = datasets.map((d) => d.id);

      // Fetch all transactions for matched datasets
      let allTransactions: Transaction[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: transactions, error } = await supabase
          .from("transactions")
          .select("*")
          .in("dataset_id", datasetIds)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;

        if (transactions && transactions.length > 0) {
          allTransactions = [...allTransactions, ...transactions];
          if (transactions.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      const txns = allTransactions || [];
      setAllData(txns);

      // Build filter dropdown options from fetched data
      setFilterOptions((prev) => ({
        ...prev,
        kategori_biaya: Array.from(new Set(txns.map((t) => t.kategori_biaya))).filter(Boolean).sort(),
        nama_penanggung_utama: Array.from(new Set(txns.map((t) => t.nama_penanggung_utama))).filter(Boolean).sort(),
        instalasi: Array.from(new Set(txns.map((t) => t.instalasi))).filter(Boolean).sort(),
        jenis_layanan: Array.from(new Set(txns.map((t) => t.jenis_layanan))).filter(Boolean).sort(),
      }));
    } catch (err) {
      console.error("Error fetching data:", err);
      setErrorMsg("Terjadi kesalahan saat memuat data. Cek konsol untuk detail.");
    } finally {
      setIsLoading(false);
    }
  };

  // Apply in-memory filters for kategori, penanggung, instalasi, jenis_layanan
  const filteredData = useMemo(() => {
    let result = allData;
    if (filters.kategori_biaya)
      result = result.filter((t) => t.kategori_biaya === filters.kategori_biaya);
    if (filters.nama_penanggung_utama)
      result = result.filter((t) => t.nama_penanggung_utama === filters.nama_penanggung_utama);
    if (filters.instalasi)
      result = result.filter((t) => t.instalasi === filters.instalasi);
    if (filters.jenis_layanan)
      result = result.filter((t) => t.jenis_layanan === filters.jenis_layanan);
    return result;
  }, [allData, filters]);

  const resetFilters = () => {
    setFilters({ year: new Date().getFullYear() });
  };

  // ── KPIs ────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    return filteredData.reduce(
      (acc, t) => ({
        volume: acc.volume + 1,
        barang: acc.barang + Number(t.total_penjualan_barang || 0),
        jasa: acc.jasa + Number(t.total_penjualan_jasa || 0),
        fasilitas: acc.fasilitas + Number(t.total_penjualan_fasilitas || 0),
      }),
      { volume: 0, barang: 0, jasa: 0, fasilitas: 0 }
    );
  }, [filteredData]);

  // ── Chart: Volume by Kategori Biaya ─────────────────────────
  const chartByKategori = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach((t) => {
      const key = t.kategori_biaya || "Tidak Diketahui";
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  // ── Chart: Volume by Nama Penanggung Utama (Top 10) ─────────
  const chartByPenanggung = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach((t) => {
      const key = t.nama_penanggung_utama || "Tidak Diketahui";
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredData]);

  // ── Chart: Total Penjualan by Kategori Biaya ─────────────────
  const chartPenjualanByKategori = useMemo(() => {
    const map: Record<string, { barang: number; jasa: number; fasilitas: number }> = {};
    filteredData.forEach((t) => {
      const key = t.kategori_biaya || "Tidak Diketahui";
      if (!map[key]) map[key] = { barang: 0, jasa: 0, fasilitas: 0 };
      map[key].barang += Number(t.total_penjualan_barang || 0);
      map[key].jasa += Number(t.total_penjualan_jasa || 0);
      map[key].fasilitas += Number(t.total_penjualan_fasilitas || 0);
    });
    return Object.entries(map)
      .map(([name, vals]) => ({
        name,
        barang: vals.barang,
        jasa: vals.jasa,
        fasilitas: vals.fasilitas,
        total: vals.barang + vals.jasa + vals.fasilitas,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredData]);

  // ── Chart: Penjualan by Instalasi ────────────────────────────
  const chartByInstalasi = useMemo(() => {
    const map: Record<string, { barang: number; jasa: number; fasilitas: number }> = {};
    filteredData.forEach((t) => {
      const key = t.instalasi || "Tidak Diketahui";
      if (!map[key]) map[key] = { barang: 0, jasa: 0, fasilitas: 0 };
      map[key].barang += Number(t.total_penjualan_barang || 0);
      map[key].jasa += Number(t.total_penjualan_jasa || 0);
      map[key].fasilitas += Number(t.total_penjualan_fasilitas || 0);
    });
    return Object.entries(map)
      .map(([name, vals]) => ({
        name,
        barang: vals.barang,
        jasa: vals.jasa,
        fasilitas: vals.fasilitas,
        total: vals.barang + vals.jasa + vals.fasilitas,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [filteredData]);

  // Active filter count
  const activeFilterCount = [
    filters.kategori_biaya,
    filters.nama_penanggung_utama,
    filters.instalasi,
    filters.jenis_layanan,
  ].filter(Boolean).length;

  const periodLabel = filters.month
    ? `${MONTHS_LABEL[filters.month]} ${filters.year || ""}`
    : `Tahun ${filters.year || "Semua"}`;

  return (
    <div className="space-y-6">

      {/* ── Filter Panel ── */}
      <Card className="border border-slate-200/70 shadow-sm bg-white rounded-xl">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Filter Data</h2>
              <p className="text-xs text-slate-500 mt-1">Periode aktif: {periodLabel}</p>
            </div>
            <button
              onClick={resetFilters}
              className="text-sm text-slate-500 hover:text-red-600 flex items-center gap-1.5 mt-3 sm:mt-0 transition-colors"
            >
              <FilterX className="h-4 w-4" />
              Reset Filter
              {activeFilterCount > 0 && (
                <span className="ml-1 bg-red-100 text-red-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Tahun */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tahun</label>
              <select
                value={filters.year ?? ""}
                onChange={(e) =>
                  setFilters({ ...filters, year: e.target.value ? Number(e.target.value) : undefined })
                }
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
              >
                <option value="">Semua</option>
                {filterOptions.years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Bulan */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bulan</label>
              <select
                value={filters.month ?? ""}
                onChange={(e) =>
                  setFilters({ ...filters, month: e.target.value ? Number(e.target.value) : undefined })
                }
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
              >
                <option value="">Semua</option>
                {filterOptions.months.map((m) => (
                  <option key={m} value={m}>{MONTHS_LABEL[m]}</option>
                ))}
              </select>
            </div>

            {/* Kategori Biaya */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kategori Biaya</label>
              <select
                value={filters.kategori_biaya ?? ""}
                onChange={(e) =>
                  setFilters({ ...filters, kategori_biaya: e.target.value || undefined })
                }
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
              >
                <option value="">Semua</option>
                {filterOptions.kategori_biaya.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>

            {/* Penanggung Utama */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Penanggung</label>
              <select
                value={filters.nama_penanggung_utama ?? ""}
                onChange={(e) =>
                  setFilters({ ...filters, nama_penanggung_utama: e.target.value || undefined })
                }
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
              >
                <option value="">Semua</option>
                {filterOptions.nama_penanggung_utama.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Instalasi */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Instalasi</label>
              <select
                value={filters.instalasi ?? ""}
                onChange={(e) =>
                  setFilters({ ...filters, instalasi: e.target.value || undefined })
                }
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
              >
                <option value="">Semua</option>
                {filterOptions.instalasi.map((ins) => (
                  <option key={ins} value={ins}>{ins}</option>
                ))}
              </select>
            </div>

            {/* Jenis Layanan */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Jenis Layanan</label>
              <select
                value={filters.jenis_layanan ?? ""}
                onChange={(e) =>
                  setFilters({ ...filters, jenis_layanan: e.target.value || undefined })
                }
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
              >
                <option value="">Semua</option>
                {filterOptions.jenis_layanan.map((j) => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Loading / Error / Empty ── */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : errorMsg ? (
        <div className="flex flex-col items-center justify-center h-64 bg-red-50 text-red-700 rounded-xl border border-red-200 p-6 text-center">
          <svg className="w-12 h-12 mb-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-bold mb-1">Error</h3>
          <p className="text-sm max-w-md">{errorMsg}</p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border shadow-sm">
          <svg className="w-16 h-16 mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-slate-700">Tidak ada data</h3>
          <p className="text-sm text-slate-400 mt-1">Silakan upload file Excel atau ubah filter.</p>
        </div>
      ) : (
        <>
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Volume */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-blue-700 text-white overflow-hidden relative col-span-2 lg:col-span-1">
              <div className="absolute -right-4 -top-4 opacity-10">
                <TrendingUp size={100} />
              </div>
              <CardContent className="p-5 relative z-10">
                <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider mb-2">Volume Transaksi</p>
                <h3 className="text-4xl font-extrabold">{new Intl.NumberFormat("id-ID").format(kpis.volume)}</h3>
                <p className="text-blue-200 text-xs mt-1">baris data</p>
              </CardContent>
            </Card>

            {/* Barang */}
            <Card className="border-0 shadow-sm bg-white overflow-hidden relative">
              <div className="absolute right-3 top-3 text-emerald-100">
                <Package size={40} />
              </div>
              <CardContent className="p-5">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">Total Penjualan Barang</p>
                <h3 className="text-xl font-bold text-slate-800">{formatCurrency(kpis.barang)}</h3>
                <div className="mt-2 h-1 w-full bg-slate-100 rounded-full">
                  <div
                    className="h-1 bg-emerald-500 rounded-full"
                    style={{ width: `${kpis.barang + kpis.jasa + kpis.fasilitas > 0 ? (kpis.barang / (kpis.barang + kpis.jasa + kpis.fasilitas)) * 100 : 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Jasa */}
            <Card className="border-0 shadow-sm bg-white overflow-hidden relative">
              <div className="absolute right-3 top-3 text-amber-100">
                <Briefcase size={40} />
              </div>
              <CardContent className="p-5">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">Total Penjualan Jasa</p>
                <h3 className="text-xl font-bold text-slate-800">{formatCurrency(kpis.jasa)}</h3>
                <div className="mt-2 h-1 w-full bg-slate-100 rounded-full">
                  <div
                    className="h-1 bg-amber-500 rounded-full"
                    style={{ width: `${kpis.barang + kpis.jasa + kpis.fasilitas > 0 ? (kpis.jasa / (kpis.barang + kpis.jasa + kpis.fasilitas)) * 100 : 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Fasilitas */}
            <Card className="border-0 shadow-sm bg-white overflow-hidden relative">
              <div className="absolute right-3 top-3 text-violet-100">
                <Building2 size={40} />
              </div>
              <CardContent className="p-5">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">Total Penjualan Fasilitas</p>
                <h3 className="text-xl font-bold text-slate-800">{formatCurrency(kpis.fasilitas)}</h3>
                <div className="mt-2 h-1 w-full bg-slate-100 rounded-full">
                  <div
                    className="h-1 bg-violet-500 rounded-full"
                    style={{ width: `${kpis.barang + kpis.jasa + kpis.fasilitas > 0 ? (kpis.fasilitas / (kpis.barang + kpis.jasa + kpis.fasilitas)) * 100 : 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Row 2: Volume by Kategori + Volume by Penanggung ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Volume by Kategori Biaya – Pie Chart */}
            <Card className="border border-slate-200/70 shadow-sm bg-white rounded-xl">
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-sm font-semibold text-slate-700">Volume Transaksi by Kategori Biaya</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartByKategori}
                        cx="40%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {chartByKategori.map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [
                          `${new Intl.NumberFormat("id-ID").format(Number(val))} transaksi`,
                          "Volume",
                        ]}
                      />
                      <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        iconType="circle"
                        iconSize={8}
                        formatter={(value) => (
                          <span className="text-xs text-slate-600">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Volume by Penanggung Utama – Horizontal Bar */}
            <Card className="border border-slate-200/70 shadow-sm bg-white rounded-xl">
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-sm font-semibold text-slate-700">Volume Transaksi by Nama Penanggung Utama (Top 10)</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartByPenanggung}
                      layout="vertical"
                      margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={130}
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CountTooltip />} cursor={{ fill: "#f8fafc" }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18}>
                        {chartByPenanggung.map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Row 3: Penjualan by Kategori Biaya ── */}
          <Card className="border border-slate-200/70 shadow-sm bg-white rounded-xl">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-sm font-semibold text-slate-700">
                Total Penjualan Barang, Jasa &amp; Fasilitas by Kategori Biaya
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartPenjualanByKategori}
                    margin={{ top: 5, right: 20, left: 20, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      angle={-25}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis hide />
                    <Tooltip content={<CurrencyTooltip />} cursor={{ fill: "#f8fafc" }} />
                    <Legend
                      verticalAlign="top"
                      formatter={(value) => {
                        const labels: Record<string, string> = {
                          barang: "Penjualan Barang",
                          jasa: "Penjualan Jasa",
                          fasilitas: "Penjualan Fasilitas",
                        };
                        return <span className="text-xs text-slate-600">{labels[value] || value}</span>;
                      }}
                    />
                    <Bar dataKey="barang" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="jasa" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="fasilitas" fill="#8b5cf6" radius={[3, 3, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* ── Row 4: Penjualan by Instalasi ── */}
          {chartByInstalasi.length > 0 && (
            <Card className="border border-slate-200/70 shadow-sm bg-white rounded-xl">
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-sm font-semibold text-slate-700">
                  Total Penjualan by Instalasi (Top 8)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartByInstalasi}
                      layout="vertical"
                      margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={140}
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CurrencyTooltip />} cursor={{ fill: "#f8fafc" }} />
                      <Legend
                        verticalAlign="top"
                        formatter={(value) => {
                          const labels: Record<string, string> = {
                            barang: "Barang",
                            jasa: "Jasa",
                            fasilitas: "Fasilitas",
                          };
                          return <span className="text-xs text-slate-600">{labels[value] || value}</span>;
                        }}
                      />
                      <Bar dataKey="barang" fill="#10b981" radius={[0, 3, 3, 0]} maxBarSize={12} />
                      <Bar dataKey="jasa" fill="#f59e0b" radius={[0, 3, 3, 0]} maxBarSize={12} />
                      <Bar dataKey="fasilitas" fill="#8b5cf6" radius={[0, 3, 3, 0]} maxBarSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Row 5: Bell Curve Charts ── */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-slate-200" />
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Distribusi Normal (Diagram Lonceng)</h2>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            <p className="text-xs text-slate-400 mb-5 text-center">
              Pilih kategori biaya pada masing-masing kartu untuk melihat distribusi per kelompok
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {BELL_CONFIG.map(({ field, label, color }) => (
                <BellCurveCard
                  key={field}
                  allData={filteredData}
                  field={field}
                  label={label}
                  color={color}
                />
              ))}
            </div>
          </div>

          {/* ── Detail Table ── */}
          <Card className="border border-slate-200/70 shadow-sm bg-white rounded-xl">
            <CardHeader className="border-b bg-white rounded-t-xl pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base">Detail Transaksi</CardTitle>
                <span className="text-xs text-slate-400">
                  {filteredData.length > 50
                    ? `50 dari ${new Intl.NumberFormat("id-ID").format(filteredData.length)} baris`
                    : `${filteredData.length} baris`}
                </span>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-semibold">No. Tagihan</th>
                    <th className="px-4 py-3 font-semibold">Kategori Biaya</th>
                    <th className="px-4 py-3 font-semibold">Nama Penanggung Utama</th>
                    <th className="px-4 py-3 font-semibold">Instalasi</th>
                    <th className="px-4 py-3 font-semibold">Jenis Layanan</th>
                    <th className="px-4 py-3 font-semibold text-right">Penjualan Barang</th>
                    <th className="px-4 py-3 font-semibold text-right">Penjualan Jasa</th>
                    <th className="px-4 py-3 font-semibold text-right">Penjualan Fasilitas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.slice(0, 50).map((row) => (
                    <tr key={row.id} className="bg-white hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-700 font-medium">{row.nomor_tagihan || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{row.kategori_biaya || "-"}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">{row.nama_penanggung_utama || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{row.instalasi || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{row.jenis_layanan || "-"}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(row.total_penjualan_barang)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(row.total_penjualan_jasa)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(row.total_penjualan_fasilitas)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredData.length > 50 && (
              <div className="p-4 text-center text-xs text-slate-400 border-t bg-slate-50 rounded-b-xl">
                Menampilkan 50 dari {new Intl.NumberFormat("id-ID").format(filteredData.length)} baris data.
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
