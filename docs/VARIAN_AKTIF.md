# Varian Syarat Aktif: 2 Penjualan vs 1 Penjualan per Bulan

Dibuat oleh `npx tsx scripts/varian-aktif.ts` pada 2026-10-27. Semua aturan lain sama dengan Rencana Pemasaran v1.4; skenario dan asumsi sama dengan Bab 12.3.

> Hasil simulasi jaringan buatan. **Bukan proyeksi penjualan dan bukan perkiraan penghasilan.**

## Biaya bonus dan plafon

| Skenario | Plan A (aktif 2) | Plan A (aktif 1) | Plan B (aktif 2) | Plan B (aktif 1) | Bulan Plan A tertinggi (aktif 1) | Faktor plafon dipakai (aktif 1) |
|---|---:|---:|---:|---:|---:|---:|
| Jaringan ideal 12 level (semua Mitra PLS menjual 2 Lisensi) | 26,6% | 26,6% | 35,7% | 35,7% | 27,2% | Tidak |
| Jaringan 5 tahun, penjualan rata (70% pembeli menjadi Mitra PLS) | 28,9% | 29,1% | 9,0% | 13,2% | 30,8% | Tidak |
| Jaringan 5 tahun, penjualan naik lalu turun (70%) | 29,0% | 29,1% | 8,9% | 13,0% | 37,1% | Tidak |
| Jaringan 5 tahun, penjualan rata, hanya 30% pembeli menjadi Mitra PLS | 24,8% | 24,9% | 12,2% | 14,3% | 26,9% | Tidak |

## Ke mana bonus jaringan mengalir

Persentase terhadap omzet bersih Lisensi.

| Skenario | Bonus tim dibayar (2 → 1) | Bonus tim hangus (2 → 1) | Pool Aktif (2 → 1) | Rata-rata Mitra PLS aktif per bulan (2 → 1) |
|---|---:|---:|---:|---:|
| ideal-12 | 6,7% → 6,7% | 23,3% → 23,3% | 8,8% → 8,8% | 19,3% → 19,3% |
| flat-5y | 1,9% → 7,3% | 11,7% → 6,4% | 15,4% → 9,6% | 2,5% → 8,7% |
| risefall-5y | 2,4% → 7,9% | 11,3% → 5,8% | 15,0% → 8,9% | 2,8% → 9,6% |
| flat-5y-30 | 2,7% → 5,9% | 6,4% → 3,4% | 9,8% → 6,0% | 6,1% → 15,4% |

## Sebaran penghasilan sintetis (total selama simulasi per Mitra PLS)

| Skenario | Tanpa bonus (2 → 1) | Persentil 90 (2 → 1) | Tertinggi (2 → 1) |
|---|---:|---:|---:|
| ideal-12 | 50,0% → 50,0% | Rp4.475.736 → Rp4.475.736 | Rp78.663.892 → Rp78.663.892 |
| flat-5y | 61,6% → 61,6% | Rp3.800.000 → Rp10.051.323 | Rp463.471.692 → Rp591.624.556 |
| risefall-5y | 61,9% → 61,9% | Rp3.850.000 → Rp10.346.928 | Rp717.537.373 → Rp929.867.054 |
| flat-5y-30 | 51,5% → 51,5% | Rp14.851.650 → Rp15.253.437 | Rp2.230.016.308 → Rp2.743.216.823 |
