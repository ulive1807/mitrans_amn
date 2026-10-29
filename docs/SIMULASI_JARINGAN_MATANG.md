# Simulasi Jaringan Matang 36 Bulan

Dibuat oleh `npx tsx scripts/simulasi-matang.ts` · parameter v2.0-draf · 36 bulan sejak 2027-01

> Data sintetis. Menguji berapa omzet bulanan jaringan yang dibutuhkan agar Mitra PLS teratas (M1) mencapai penghasilan tertentu. Bukan proyeksi penjualan atau janji penghasilan.

Asumsi:
- Penjualan baru per bulan naik secepat mungkin (setiap penjual membuat 2 penjualan Lisensi atau 1 paket Family agar aktif), lalu **stabil** pada angka di nama skenario.
- Penjual dipilih acak dari seluruh pemegang Lisensi; M1 menjual sendiri sejumlah yang disebut (2 = syarat aktif; 20 = syarat transaksi pribadi Royal Crown).
- Atlas Membership dimulai setelah masa akses; retensi 85,0% per bulan (M1 selalu berlangganan); semua menjalankan 1 kegiatan pembinaan per bulan.
- Model biaya sama dengan audit: layanan Rp142.000 per akun per bulan, workshop Rp800.000 per kursi + Rp1.300.000 per 30 peserta. Laba sebelum biaya kantor dan pajak.

## 1. Penghasilan M1 dan omzet jaringan

| Skenario | Omzet bersih jaringan/bln (12 bln terakhir) | M1 rata-rata/bln (12 bln terakhir) | M1 bulan tertinggi | M1 total 36 bln | Peringkat M1 akhir | ≥Rp100 jt | ≥Rp500 jt | ≥Rp1 M |
|---|---:|---:|---:|---:|---|---|---|---|
| Platinum 1.000/bln, acak, Pelanggan 30%, M1 2 | Rp9,03 M | **Rp35,3 jt** | Rp79,1 jt | Rp1,39 M | Manager | – | – | – |
| Platinum 6.000/bln, acak, Pelanggan 30%, M1 2 | Rp54,08 M | **Rp87,2 jt** | Rp356,2 jt | Rp3,07 M | Manager | bulan ke-9 | – | – |
| Platinum 1.500/bln, tim 10 level, Pelanggan 50%, M1 20 | Rp13,53 M | **Rp168,3 jt** | Rp191,8 jt | Rp4,98 M | Executive | bulan ke-10 | – | – |
| Platinum 6.000/bln, tim 10 level, Pelanggan 50%, M1 20 | Rp36,37 M | **Rp290,7 jt** | Rp308,4 jt | Rp7,52 M | Executive | bulan ke-10 | – | – |
| Family 1.000/bln, tim 10 level, Pelanggan 50%, M1 20 | Rp18,84 M | **Rp176,4 jt** | Rp243,2 jt | Rp5,96 M | Manager | bulan ke-3 | – | – |
| Family 6.000/bln, tim 10 level, Pelanggan 50%, M1 20 | Rp76,58 M | **Rp331,6 jt** | Rp529,4 jt | Rp11,97 M | Manager | bulan ke-3 | bulan ke-9 | – |

## 2. Susunan penghasilan M1 (12 bulan terakhir)

| Jenis | Platinum 1.000/bln, acak, Pelanggan 30%, M1 2 | Platinum 6.000/bln, acak, Pelanggan 30%, M1 2 | Platinum 1.500/bln, tim 10 level, Pelanggan 50%, M1 20 | Platinum 6.000/bln, tim 10 level, Pelanggan 50%, M1 20 | Family 1.000/bln, tim 10 level, Pelanggan 50%, M1 20 | Family 6.000/bln, tim 10 level, Pelanggan 50%, M1 20 |
|---|---:|---:|---:|---:|---:|---:|
| Bonus Sponsor | Rp18,0 jt | Rp18,0 jt | Rp180,0 jt | Rp180,0 jt | Rp454,5 jt | Rp436,5 jt |
| Bonus Pasangan | Rp37,8 jt | Rp42,3 jt | Rp683,7 jt | Rp1,09 M | Rp451,6 jt | Rp1,09 M |
| Bonus Pembinaan | Rp5,8 jt | Rp30,6 jt | Rp30,7 jt | Rp230,9 jt | Rp28,2 jt | Rp365,3 jt |
| Pool Aktif | Rp15,5 jt | Rp16,0 jt | Rp184,5 jt | Rp177,5 jt | Rp301,0 jt | Rp301,0 jt |
| Komisi Langganan | Rp8,5 jt | Rp13,0 jt | Rp114,0 jt | Rp111,5 jt | Rp105,5 jt | Rp115,8 jt |
| Pasangan Langganan (RO) | Rp58,9 jt | Rp81,8 jt | Rp518,5 jt | Rp1,28 M | Rp377,0 jt | Rp1,40 M |
| Royalti Langganan (RO) | Rp278,9 jt | Rp844,2 jt | Rp307,9 jt | Rp412,1 jt | Rp398,7 jt | Rp263,7 jt |
| Bonus Pendamping | Rp0,0 jt | Rp0,2 jt | Rp0,0 jt | Rp0,0 jt | Rp0,0 jt | Rp0,0 jt |

## 3. Perusahaan dan sebaran penghasilan (36 bulan)

| Skenario | Mitra PLS | Omzet bersih | Rasio Mitra | Bulan Plan A tertinggi | Rasio perusahaan | 10 teratas rata-rata/bln | Median | Tanpa bonus |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Platinum 1.000/bln, acak, Pelanggan 30%, M1 2 | 19.829 | Rp238,33 M | 19,0% | 39,6% | 58,1% | Rp8,2 jt | Rp0 | 58,7% |
| Platinum 6.000/bln, acak, Pelanggan 30%, M1 2 | 112.002 | Rp1347,05 M | 19,4% | 39,7% | 57,7% | Rp25,0 jt | Rp0 | 58,3% |
| Platinum 1.500/bln, tim 10 level, Pelanggan 50%, M1 20 | 20.225 | Rp342,23 M | 17,9% | 34,7% | 59,2% | Rp20,5 jt | Rp0 | 90,0% |
| Platinum 6.000/bln, tim 10 level, Pelanggan 50%, M1 20 | 48.998 | Rp814,37 M | 16,9% | 35,0% | 60,4% | Rp41,5 jt | Rp0 | 95,8% |
| Family 1.000/bln, tim 10 level, Pelanggan 50%, M1 20 | 46.665 | Rp532,83 M | 20,9% | 40,6% | 47,4% | Rp27,7 jt | Rp0 | 95,6% |
| Family 6.000/bln, tim 10 level, Pelanggan 50%, M1 20 | 178.884 | Rp2023,59 M | 18,9% | 41,8% | 49,4% | Rp78,9 jt | Rp0 | 98,9% |

