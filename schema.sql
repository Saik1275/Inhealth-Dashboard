-- schema.sql
-- Run this in your Supabase SQL Editor

-- Drop existing tables first
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS datasets;

-- 1. Create Datasets table
CREATE TABLE datasets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    filename TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(month, year)
);

-- 2. Create Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    kategori_biaya TEXT,
    nama_penanggung_utama TEXT,
    instalasi TEXT,
    jenis_layanan TEXT,
    total_penjualan_barang NUMERIC DEFAULT 0,
    total_penjualan_jasa NUMERIC DEFAULT 0,
    total_penjualan_fasilitas NUMERIC DEFAULT 0,
    nomor_tagihan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Indexes for faster querying
CREATE INDEX idx_transactions_dataset_id ON transactions(dataset_id);
CREATE INDEX idx_transactions_kategori_biaya ON transactions(kategori_biaya);
CREATE INDEX idx_transactions_nama_penanggung_utama ON transactions(nama_penanggung_utama);
CREATE INDEX idx_transactions_instalasi ON transactions(instalasi);
CREATE INDEX idx_transactions_jenis_layanan ON transactions(jenis_layanan);

-- 4. Enable Row Level Security
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 5. Allow all operations for anonymous users
CREATE POLICY "Allow anonymous all operations on datasets" ON datasets FOR ALL USING (true);
CREATE POLICY "Allow anonymous all operations on transactions" ON transactions FOR ALL USING (true);
