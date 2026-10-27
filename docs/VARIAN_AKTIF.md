# Varian Syarat Aktif: 2 Penjualan vs 1 Penjualan per Bulan

Dibuat oleh `npx tsx scripts/varian-aktif.ts` pada 2026-10-27. Semua aturan lain sama dengan Rencana Pemasaran v1.3; skenario dan asumsi sama dengan Bab 12.3.

> Hasil simulasi jaringan buatan. **Bukan proyeksi penjualan dan bukan perkiraan penghasilan.**

## Biaya bonus dan plafon

| Skenario | Plan A (aktif 2) | Plan A (aktif 1) | Plan B (aktif 2) | Plan B (aktif 1) | Bulan Plan A tertinggi (aktif 1) | Faktor plafon dipakai (aktif 1) |
|---|---:|---:|---:|---:|---:|---:|
| Jaringan ideal 12 level (semua Mitra PLS menjual 2 Lisensi) | 26,6% | 26,6% | 35,2% | 35,2% | 27,2% | Tidak |
| Jaringan 5 tahun, penjualan rata (70% pembeli menjadi Mitra PLS) | 29,0% | 29,2% | 8,9% | 13,2% | 31,5% | Tidak |
| Jaringan 5 tahun, penjualan naik lalu turun (70%) | 28,9% | 29,0% | 8,9% | 13,1% | 38,5% | Tidak |
| Jaringan 5 tahun, penjualan rata, hanya 30% pembeli menjadi Mitra PLS | 24,9% | 25,0% | 12,0% | 14,2% | 27,3% | Tidak |

## Ke mana bonus jaringan mengalir

Persentase terhadap omzet bersih Lisensi.

| Skenario | Bonus tim dibayar (2 → 1) | Bonus tim hangus (2 → 1) | Pool Aktif (2 → 1) | Rata-rata Mitra PLS aktif per bulan (2 → 1) |
|---|---:|---:|---:|---:|
| ideal-12 | 6,7% → 6,7% | 23,3% → 23,3% | 8,8% → 8,8% | 19,3% → 19,3% |
| flat-5y | 2,0% → 7,3% | 11,7% → 6,6% | 15,4% → 9,7% | 2,4% → 8,5% |
| risefall-5y | 2,3% → 7,9% | 11,3% → 5,8% | 14,9% → 8,9% | 2,7% → 9,4% |
| flat-5y-30 | 2,8% → 6,3% | 6,5% → 3,1% | 9,8% → 5,7% | 5,7% → 15,2% |

## Sebaran penghasilan sintetis (total selama simulasi per Mitra PLS)

| Skenario | Tanpa bonus (2 → 1) | Persentil 90 (2 → 1) | Tertinggi (2 → 1) |
|---|---:|---:|---:|
| ideal-12 | 50,0% → 50,0% | Rp4.048.736 → Rp4.048.736 | Rp45.730.936 → Rp45.730.936 |
| flat-5y | 61,1% → 61,1% | Rp3.750.000 → Rp9.808.203 | Rp343.704.427 → Rp408.426.243 |
| risefall-5y | 61,5% → 61,5% | Rp3.800.000 → Rp10.034.926 | Rp479.717.355 → Rp725.166.882 |
| flat-5y-30 | 51,8% → 51,8% | Rp14.416.864 → Rp14.568.384 | Rp1.404.939.390 → Rp1.770.436.169 |
