"use client";

import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  UploadCloud, CheckCircle2, AlertCircle, Loader2,
  Trash2, Pencil, Eye, X, FileSpreadsheet, Calendar,
  ChevronDown, ChevronUp, HardDrive, FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { TransactionInsert, Dataset, Transaction } from "@/types";

// ─── Constants ────────────────────────────────────────────────
const MONTHS: { value: number; label: string }[] = [
  { value: 1, label: "Januari" }, { value: 2, label: "Februari" },
  { value: 3, label: "Maret" }, { value: 4, label: "April" },
  { value: 5, label: "Mei" }, { value: 6, label: "Juni" },
  { value: 7, label: "Juli" }, { value: 8, label: "Agustus" },
  { value: 9, label: "September" }, { value: 10, label: "Oktober" },
  { value: 11, label: "November" }, { value: 12, label: "Desember" },
];
const YEARS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i);

const monthLabel = (m: number) => MONTHS.find((x) => x.value === m)?.label ?? String(m);

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// ─── Types ────────────────────────────────────────────────────
interface DatasetWithCount extends Dataset {
  transaction_count?: number;
}

// ─── Modals ───────────────────────────────────────────────────

/** Confirm Delete Modal */
function ConfirmDeleteModal({
  dataset,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  dataset: DatasetWithCount;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="bg-red-50 px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Konfirmasi Hapus Data</h3>
            <p className="text-xs text-slate-500">Tindakan ini tidak bisa dibatalkan</p>
          </div>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-slate-700">
            Apakah Anda yakin ingin menghapus data periode:
          </p>
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="font-bold text-slate-800 text-sm">
              {monthLabel(dataset.month)} {dataset.year}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{dataset.filename}</p>
            {dataset.transaction_count !== undefined && (
              <p className="text-xs text-red-600 mt-1">
                {new Intl.NumberFormat("id-ID").format(dataset.transaction_count)} baris transaksi akan ikut terhapus
              </p>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Semua data transaksi terkait akan dihapus permanen dari Supabase.
          </p>
        </div>
        <div className="px-6 pb-6 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Ya, Hapus Data
          </button>
        </div>
      </div>
    </div>
  );
}

/** Edit Month/Year Modal */
function EditDatasetModal({
  dataset,
  onConfirm,
  onCancel,
  isSaving,
}: {
  dataset: DatasetWithCount;
  onConfirm: (month: number, year: number) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [editMonth, setEditMonth] = useState(dataset.month);
  const [editYear, setEditYear] = useState(dataset.year);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden">
        <div className="px-6 py-5 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
              <Pencil className="h-4 w-4 text-blue-600" />
            </div>
            <h3 className="font-bold text-slate-800">Edit Periode Data</h3>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-xs text-slate-500">File: <span className="font-medium text-slate-700">{dataset.filename}</span></p>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Bulan</label>
            <select
              value={editMonth}
              onChange={(e) => setEditMonth(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Tahun</label>
            <select
              value={editYear}
              onChange={(e) => setEditYear(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={() => onConfirm(editMonth, editYear)}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  );
}

/** Detail Preview Modal */
function DetailModal({
  dataset,
  transactions,
  isLoading,
  onClose,
}: {
  dataset: DatasetWithCount;
  transactions: Transaction[];
  isLoading: boolean;
  onClose: () => void;
}) {
  const totalBarang = transactions.reduce((s, t) => s + Number(t.total_penjualan_barang || 0), 0);
  const totalJasa = transactions.reduce((s, t) => s + Number(t.total_penjualan_jasa || 0), 0);
  const totalFasilitas = transactions.reduce((s, t) => s + Number(t.total_penjualan_fasilitas || 0), 0);

  const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Detail Data: {monthLabel(dataset.month)} {dataset.year}</h3>
              <p className="text-xs text-slate-400">{dataset.filename}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-4 bg-slate-50 border-b flex-shrink-0">
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Baris</p>
                <p className="text-lg font-bold text-slate-800">{new Intl.NumberFormat("id-ID").format(transactions.length)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Barang</p>
                <p className="text-sm font-bold text-emerald-700">{fmt(totalBarang)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Jasa</p>
                <p className="text-sm font-bold text-amber-700">{fmt(totalJasa)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Fasilitas</p>
                <p className="text-sm font-bold text-violet-700">{fmt(totalFasilitas)}</p>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-auto flex-1">
              <table className="w-full text-xs text-left">
                <thead className="sticky top-0 bg-slate-100 text-slate-600 uppercase z-10">
                  <tr>
                    <th className="px-4 py-3 font-semibold">#</th>
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
                  {transactions.map((row, i) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                      <td className="px-4 py-2.5 text-slate-700 font-medium">{row.nomor_tagihan || "-"}</td>
                      <td className="px-4 py-2.5 text-slate-600">{row.kategori_biaya || "-"}</td>
                      <td className="px-4 py-2.5 text-slate-600 max-w-[180px] truncate">{row.nama_penanggung_utama || "-"}</td>
                      <td className="px-4 py-2.5 text-slate-600">{row.instalasi || "-"}</td>
                      <td className="px-4 py-2.5 text-slate-600">{row.jenis_layanan || "-"}</td>
                      <td className="px-4 py-2.5 text-right text-emerald-700">{fmt(Number(row.total_penjualan_barang) || 0)}</td>
                      <td className="px-4 py-2.5 text-right text-amber-700">{fmt(Number(row.total_penjualan_jasa) || 0)}</td>
                      <td className="px-4 py-2.5 text-right text-violet-700">{fmt(Number(row.total_penjualan_fasilitas) || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transactions.length === 0 && (
                <div className="text-center py-3 text-xs text-slate-400 bg-slate-50 border-t">
                  Tidak ada data transaksi.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex-shrink-0 flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Tutup
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function UploadPage() {
  // Upload form state
  const [file, setFile] = useState<File | null>(null);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [lastUploadInfo, setLastUploadInfo] = useState<{ rows: number; size: number } | null>(null);

  // History state
  const [datasets, setDatasets] = useState<DatasetWithCount[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Modal state
  const [deleteTarget, setDeleteTarget] = useState<DatasetWithCount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editTarget, setEditTarget] = useState<DatasetWithCount | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [detailTarget, setDetailTarget] = useState<DatasetWithCount | null>(null);
  const [detailTransactions, setDetailTransactions] = useState<Transaction[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Load history on mount
  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const { data: ds } = await supabase
        .from("datasets")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (!ds) return;

      // Get transaction counts for each dataset
      const withCounts: DatasetWithCount[] = await Promise.all(
        ds.map(async (d) => {
          const { count } = await supabase
            .from("transactions")
            .select("id", { count: "exact", head: true })
            .eq("dataset_id", d.id);
          return { ...d, transaction_count: count ?? 0 };
        })
      );
      setDatasets(withCounts);
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // ─── File Change ───────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setStatus("idle");
      setMessage("");
      setLastUploadInfo(null);
    }
  };

  // ─── Upload Process ────────────────────────────────────────
  const processExcel = async () => {
    if (!file) { setStatus("error"); setMessage("Pilih file Excel terlebih dahulu."); return; }
    setIsUploading(true); setStatus("idle"); setMessage(""); setProgress(10); setLastUploadInfo(null);

    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === "https://dummy.supabase.co")
        throw new Error("Kredensial Supabase belum diatur. Buat file .env.local terlebih dahulu.");

      const { data: existing } = await supabase
        .from("datasets").select("id").eq("month", month).eq("year", year).single();
      if (existing)
        throw new Error(`Data ${monthLabel(month)} ${year} sudah ada. Hapus terlebih dahulu jika ingin mengupdate.`);

      setProgress(20);

      const fileSize = file.size;
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      // Find header row
      let headerRowIndex = -1;
      let headers: string[] = [];
      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || !Array.isArray(row)) continue;
        const rowStr = row.join(" ").toLowerCase();
        if (rowStr.includes("kategori") || rowStr.includes("penanggung") || rowStr.includes("instalasi") || rowStr.includes("penjualan")) {
          headerRowIndex = i;
          headers = row.map((h) => String(h || "").trim());
          break;
        }
      }
      if (headerRowIndex === -1) throw new Error("Gagal menemukan baris header. Pastikan file memiliki kolom Kategori, Penanggung, Instalasi, atau Penjualan.");

      // Build rows
      const jsonData: any[] = [];
      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const rowArr = rawData[i];
        if (!rowArr || rowArr.every((c: any) => c === undefined || c === null || c === "")) continue;
        const rowObj: any = {};
        for (let j = 0; j < headers.length; j++) {
          if (headers[j]) rowObj[headers[j]] = rowArr[j] ?? "";
        }
        jsonData.push(rowObj);
      }
      if (jsonData.length === 0) throw new Error("File tidak memiliki baris data setelah header.");

      setProgress(40);

      const findKey = (row: any, candidates: string[]): any => {
        for (const name of candidates) { if (row[name] !== undefined && row[name] !== "") return row[name]; }
        for (const name of candidates) {
          const key = Object.keys(row).find(k => k.toLowerCase().replace(/\s+/g, "") === name.toLowerCase().replace(/\s+/g, ""));
          if (key && row[key] !== "") return row[key];
        }
        for (const name of candidates) {
          const key = Object.keys(row).find(k => k.toLowerCase().includes(name.toLowerCase()));
          if (key && row[key] !== "") return row[key];
        }
        return "";
      };

      const parseNum = (val: any): number => {
        if (typeof val === "number") return val;
        if (typeof val !== "string") return 0;
        let s = val.trim();
        if (s === "-" || s === "") return 0;
        s = s.replace(/Rp\.?/gi, "").trim();
        const lc = s.lastIndexOf(","), ld = s.lastIndexOf(".");
        if (lc > ld) s = s.replace(/\./g, "").replace(",", ".");
        else if (ld > lc && lc !== -1) s = s.replace(/,/g, "");
        else if (lc !== -1 && ld === -1) s = s.replace(",", ".");
        else if (ld !== -1 && lc === -1 && s.split(".").length > 2) s = s.replace(/\./g, "");
        const parsed = parseFloat(s.replace(/[^0-9.-]+/g, ""));
        return isNaN(parsed) ? 0 : parsed;
      };

      const transactions: TransactionInsert[] = [];
      for (const row of jsonData) {
        const kategori = String(findKey(row, ["Kategori Biaya", "Kategori"]));
        const penanggung = String(findKey(row, ["Nama Penanggung Utama", "Penanggung Utama", "Penanggung"]));
        if (!kategori && !penanggung) continue;
        transactions.push({
          dataset_id: "",
          kategori_biaya: kategori,
          nama_penanggung_utama: penanggung,
          instalasi: String(findKey(row, ["Instalasi"])),
          jenis_layanan: String(findKey(row, ["Jenis Layanan", "Layanan"])),
          total_penjualan_barang: parseNum(findKey(row, ["Total Penjualan Barang", "Penjualan Barang"])),
          total_penjualan_jasa: parseNum(findKey(row, ["Total Penjualan Jasa", "Penjualan Jasa"])),
          total_penjualan_fasilitas: parseNum(findKey(row, ["Total Penjualan Fasilitas", "Penjualan Fasilitas"])),
          nomor_tagihan: String(findKey(row, ["Nomor Tagihan", "Nomor Kunjungan", "No. Tagihan"])),
        });
      }
      if (transactions.length === 0)
        throw new Error("Gagal mengekstrak data. Pastikan kolom Kategori Biaya / Penanggung Utama ada di file.");

      setProgress(60);

      const { data: newDataset, error: datasetError } = await supabase
        .from("datasets").insert({ month, year, filename: file.name }).select().single();
      if (datasetError || !newDataset) throw new Error(`Gagal membuat dataset: ${datasetError?.message}`);

      setProgress(70);

      const chunkSize = 500;
      for (let i = 0; i < transactions.length; i += chunkSize) {
        const chunk = transactions.slice(i, i + chunkSize).map((t) => ({ ...t, dataset_id: newDataset.id }));
        const { error: ie } = await supabase.from("transactions").insert(chunk);
        if (ie) throw new Error(`Gagal menyimpan baris ${i}–${i + chunk.length}: ${ie.message}`);
        setProgress(70 + Math.floor(((i + chunk.length) / transactions.length) * 30));
      }

      setStatus("success");
      setMessage(`Berhasil menyimpan ${transactions.length} baris data untuk ${monthLabel(month)} ${year}.`);
      setLastUploadInfo({ rows: transactions.length, size: fileSize });
      setFile(null);
      const fi = document.getElementById("file-upload") as HTMLInputElement;
      if (fi) fi.value = "";
      fetchHistory(); // refresh history
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Terjadi kesalahan saat memproses file.");
    } finally {
      setIsUploading(false);
      setProgress(100);
      setTimeout(() => setProgress(0), 800);
    }
  };

  // ─── Delete ────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("datasets").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      setDatasets((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      alert("Gagal menghapus: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Edit ──────────────────────────────────────────────────
  const handleEdit = async (newMonth: number, newYear: number) => {
    if (!editTarget) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("datasets")
        .update({ month: newMonth, year: newYear })
        .eq("id", editTarget.id);
      if (error) throw error;
      setDatasets((prev) =>
        prev.map((d) => d.id === editTarget.id ? { ...d, month: newMonth, year: newYear } : d)
      );
      setEditTarget(null);
    } catch (err: any) {
      alert("Gagal menyimpan perubahan: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── View Detail ───────────────────────────────────────────
  const handleViewDetail = async (dataset: DatasetWithCount) => {
    setDetailTarget(dataset);
    setIsLoadingDetail(true);
    setDetailTransactions([]);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("dataset_id", dataset.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setDetailTransactions(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────
  return (
    <>
      {/* Modals */}
      {deleteTarget && (
        <ConfirmDeleteModal
          dataset={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={isDeleting}
        />
      )}
      {editTarget && (
        <EditDatasetModal
          dataset={editTarget}
          onConfirm={handleEdit}
          onCancel={() => setEditTarget(null)}
          isSaving={isSaving}
        />
      )}
      {detailTarget && (
        <DetailModal
          dataset={detailTarget}
          transactions={detailTransactions}
          isLoading={isLoadingDetail}
          onClose={() => { setDetailTarget(null); setDetailTransactions([]); }}
        />
      )}

      <div className="max-w-4xl mx-auto space-y-8">
        {/* ── Header ── */}
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Upload Data Rekap Biaya</h2>
          <p className="text-slate-500 mt-1 text-sm">
            Upload file Excel bulanan. Sistem membaca kolom Kategori Biaya, Penanggung Utama, Instalasi, Jenis Layanan, dan Penjualan.
          </p>
        </div>

        {/* ── Upload Card ── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-blue-500" />
              Form Upload Data Baru
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Bulan</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white"
                  disabled={isUploading}
                >
                  {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Tahun</label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white"
                  disabled={isUploading}
                >
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Drop zone */}
            {/* Hidden file input — always present */}
            <input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              disabled={isUploading}
            />

            {file ? (
              /* ── File Selected State ── */
              <div className="border-2 border-blue-400 bg-blue-50 rounded-xl px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-blue-800 truncate">{file.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <HardDrive className="h-3 w-3 text-slate-400" />
                    <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setStatus("idle");
                    setMessage("");
                    const fi = document.getElementById("file-upload") as HTMLInputElement;
                    if (fi) fi.value = "";
                  }}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50"
                  title="Hapus file yang dipilih"
                >
                  <X className="h-3.5 w-3.5" />
                  Ganti File
                </button>
              </div>
            ) : (
              /* ── Empty / Click to Select State ── */
              <div
                className="border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-slate-50 rounded-xl p-10 text-center transition-all cursor-pointer"
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                <UploadCloud className="h-11 w-11 mb-3 mx-auto text-slate-300" />
                <p className="text-sm font-medium text-slate-600">Klik untuk memilih file Excel</p>
                <p className="text-xs text-slate-400 mt-1">Format: .xlsx / .xls</p>
              </div>
            )}

            {/* Progress bar */}
            {progress > 0 && progress < 100 && (
              <div className="mt-5 space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Memproses file...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {/* Success message with file info */}
            {status === "success" && (
              <div className="mt-5 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{message}</p>
                    {lastUploadInfo && (
                      <div className="flex gap-4 mt-2">
                        <div className="flex items-center gap-1.5 text-xs text-green-700">
                          <FileText className="h-3.5 w-3.5" />
                          <span>{new Intl.NumberFormat("id-ID").format(lastUploadInfo.rows)} baris data</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-green-700">
                          <HardDrive className="h-3.5 w-3.5" />
                          <span>{formatFileSize(lastUploadInfo.size)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Error message */}
            {status === "error" && (
              <div className="mt-5 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{message}</p>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button onClick={processExcel} disabled={!file || isUploading} className="w-full sm:w-auto px-6">
                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isUploading ? "Memproses Data..." : "Upload & Simpan Data"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── History Card ── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-5 w-5 text-slate-500" />
                Riwayat Data yang Diupload
              </CardTitle>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full font-medium">
                {datasets.length} dataset
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
              </div>
            ) : datasets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <FileSpreadsheet className="h-10 w-10 mb-3" />
                <p className="text-sm font-medium">Belum ada data yang diupload</p>
                <p className="text-xs mt-1">Upload file Excel menggunakan form di atas</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {datasets.map((ds) => (
                  <div key={ds.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group">
                    {/* Icon + Info */}
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <FileSpreadsheet className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">
                        {monthLabel(ds.month)} {ds.year}
                      </p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{ds.filename}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-slate-700">
                        {new Intl.NumberFormat("id-ID").format(ds.transaction_count ?? 0)}
                      </p>
                      <p className="text-xs text-slate-400">baris</p>
                    </div>
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <p className="text-xs text-slate-400">
                        {new Date(ds.created_at).toLocaleDateString("id-ID", {
                          day: "numeric", month: "short", year: "numeric"
                        })}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleViewDetail(ds)}
                        title="Lihat Detail"
                        className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditTarget(ds)}
                        title="Edit Periode"
                        className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(ds)}
                        title="Hapus Data"
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
