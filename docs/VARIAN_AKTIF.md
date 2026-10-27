# Varian Syarat Aktif: 2 Penjualan vs 1 Penjualan per Bulan

Dibuat oleh `npx tsx scripts/varian-aktif.ts` pada 2026-10-27. Semua aturan lain sama dengan Rencana Pemasaran v1.4; skenario dan asumsi sama dengan Bab 12.3.

> Hasil simulasi jaringan buatan. **Bukan proyeksi penjualan dan bukan perkiraan penghasilan.**

## Biaya bonus dan plafon

| Skenario | Plan A (aktif 2) | Plan A (aktif 1) | Plan B (aktif 2) | Plan B (aktif 1) | Bulan Plan A tertinggi (aktif 1) | Faktor plafon dipakai (aktif 1) |
|---|---:|---:|---:|---:|---:|---:|
| Jaringan ideal 12 level (semua Mitra PLS menjual 2 Lisensi) | 26,6% | 26,6% | 35,7% | 35,7% | 27,2% | Tidak |
| Jaringan 5 tahun, penjualan rata (70% pembeli menjadi Mitra PLS) | 28,7% | 28,8% | 8,9% | 13,1% | 31,0% | Tidak |
| Jaringan 5 tahun, penjualan naik lalu turun (70%) | 29,0% | 29,1% | 8,8% | 13,1% | 37,1% | Tidak |
| Jaringan 5 tahun, penjualan rata, hanya 30% pembeli menjadi Mitra PLS | 24,9% | 25,0% | 12,0% | 14,3% | 27,3% | Tidak |

## Ke mana bonus jaringan mengalir

Persentase terhadap omzet bersih Lisensi.

| Skenario | Bonus tim dibayar (2 → 1) | Bonus tim hangus (2 → 1) | Pool Aktif (2 → 1) | Rata-rata Mitra PLS aktif per bulan (2 → 1) |
|---|---:|---:|---:|---:|
| ideal-12 | 6,7% → 6,7% | 23,3% → 23,3% | 8,8% → 8,8% | 19,3% → 19,3% |
| flat-5y | 1,8% → 7,1% | 11,5% → 6,5% | 15,2% → 9,6% | 2,4% → 8,6% |
| risefall-5y | 2,1% → 7,7% | 11,6% → 6,1% | 15,3% → 9,2% | 2,8% → 9,7% |
| flat-5y-30 | 2,4% → 5,8% | 6,9% → 3,6% | 10,2% → 6,0% | 5,7% → 15,6% |

## Sebaran penghasilan sintetis (total selama simulasi per Mitra PLS)

| Skenario | Tanpa bonus (2 → 1) | Persentil 90 (2 → 1) | Tertinggi (2 → 1) |
|---|---:|---:|---:|
| ideal-12 | 50,0% → 50,0% | Rp4.475.736 → Rp4.475.736 | Rp78.663.892 → Rp78.663.892 |
| flat-5y | 61,8% → 61,8% | Rp3.750.000 → Rp10.179.912 | Rp393.797.116 → Rp393.129.353 |
| risefall-5y | 61,7% → 61,7% | Rp3.800.000 → Rp10.293.793 | Rp343.708.121 → Rp642.223.820 |
| flat-5y-30 | 51,9% → 51,8% | Rp14.235.016 → Rp14.693.423 | Rp1.439.166.418 → Rp2.221.448.017 |
