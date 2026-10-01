export interface Dataset {
  id: string;
  month: number;
  year: number;
  filename: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  dataset_id: string;
  kategori_biaya: string;
  nama_penanggung_utama: string;
  instalasi: string;
  jenis_layanan: string;
  total_penjualan_barang: number;
  total_penjualan_jasa: number;
  total_penjualan_fasilitas: number;
  nomor_tagihan: string;
  created_at: string;
}

export interface TransactionInsert extends Omit<Transaction, 'id' | 'created_at'> {}
export interface DatasetInsert extends Omit<Dataset, 'id' | 'created_at'> {}

export interface DashboardFilter {
  year?: number;
  month?: number;
  kategori_biaya?: string;
  nama_penanggung_utama?: string;
  instalasi?: string;
  jenis_layanan?: string;
}

// Legacy compat
export type DatasetColumn = { name: string; type: 'string' | 'number' };
