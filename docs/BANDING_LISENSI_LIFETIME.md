# Banding Aturan Lisensi: v1.3 vs v1.4 (Lisensi Lifetime)

Dibuat oleh `npx tsx scripts/banding-lisensi.ts` pada 2026-10-27. Skenario, benih acak, dan asumsi perilaku sama dengan Bab 12.3 (`docs/HASIL_SIMULASI.md`); hanya aturan Lisensi yang berbeda.

> **Bukan proyeksi penjualan atau penghasilan.** Data sintetis. Simulasi menganggap perilaku pembeli (jumlah Lisensi terjual dan retensi Langganan 80% per bulan) tidak berubah oleh aturan baru; baris "retensi 60%" menguji bila Langganan yang dimulai lebih awal membuat lebih banyak pembeli berhenti.

## Omzet dan bonus (total selama simulasi)

| Skenario | Aturan | Lisensi | Langganan dibayar | Omzet bersih Lisensi | Omzet bersih Langganan | Plan A dibayar | Plan B dibayar | Plan B / omzet Langganan | Omzet bersih dikurangi Plan A+B |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| ideal-12 | v1.3 (akses 3 bulan, Langganan bulan ke-4) | 4.095 | 8.178 | Rp27,67 miliar | Rp2,94 miliar | Rp7,35 miliar | Rp1,04 miliar | 35,2% | Rp22,22 miliar |
| flat-5y | v1.3 (akses 3 bulan, Langganan bulan ke-4) | 22.686 | 471.789 | Rp153,28 miliar | Rp169,59 miliar | Rp44,77 miliar | Rp22,33 miliar | 13,2% | Rp255,78 miliar |
| risefall-5y | v1.3 (akses 3 bulan, Langganan bulan ke-4) | 24.835 | 536.490 | Rp167,80 miliar | Rp192,85 miliar | Rp48,68 miliar | Rp25,18 miliar | 13,1% | Rp286,79 miliar |
| flat-5y-30 | v1.3 (akses 3 bulan, Langganan bulan ke-4) | 22.609 | 470.456 | Rp152,76 miliar | Rp169,11 miliar | Rp38,13 miliar | Rp23,94 miliar | 14,2% | Rp259,81 miliar |
| ideal-12 | v1.4 (lifetime, Langganan bulan berikutnya) | 4.095 | 16.368 | Rp27,67 miliar | Rp5,88 miliar | Rp7,35 miliar | Rp2,10 miliar | 35,7% | Rp24,10 miliar |
| flat-5y | v1.4 (lifetime, Langganan bulan berikutnya) | 22.691 | 507.578 | Rp153,32 miliar | Rp182,45 miliar | Rp44,56 miliar | Rp24,02 miliar | 13,2% | Rp267,19 miliar |
| risefall-5y | v1.4 (lifetime, Langganan bulan berikutnya) | 24.847 | 576.746 | Rp167,89 miliar | Rp207,32 miliar | Rp48,79 miliar | Rp26,98 miliar | 13,0% | Rp299,43 miliar |
| flat-5y-30 | v1.4 (lifetime, Langganan bulan berikutnya) | 22.591 | 505.484 | Rp152,64 miliar | Rp181,70 miliar | Rp37,96 miliar | Rp25,93 miliar | 14,3% | Rp270,45 miliar |
| flat-5y | v1.4, retensi Langganan turun ke 60% | 22.696 | 380.470 | Rp153,35 miliar | Rp136,76 miliar | Rp44,00 miliar | Rp13,85 miliar | 10,1% | Rp232,26 miliar |
| risefall-5y | v1.4, retensi Langganan turun ke 60% | 24.839 | 432.823 | Rp167,83 miliar | Rp155,58 miliar | Rp48,87 miliar | Rp15,88 miliar | 10,2% | Rp258,66 miliar |
| flat-5y-30 | v1.4, retensi Langganan turun ke 60% | 22.603 | 379.094 | Rp152,72 miliar | Rp136,27 miliar | Rp37,53 miliar | Rp14,97 miliar | 11,0% | Rp236,49 miliar |

## Perubahan v1.4 dibanding v1.3 (retensi sama)

| Skenario | Omzet bersih Langganan | Plan B dibayar | Omzet bersih total | Bonus tim tertahan karena Langganan |
|---|---:|---:|---:|---:|
| ideal-12 | +100,1% | +103,1% | +9,6% | Rp0 → Rp0 |
| flat-5y | +7,6% | +7,6% | +4,0% | Rp1.878.517.500 → Rp2.196.307.500 |
| risefall-5y | +7,5% | +7,1% | +4,0% | Rp2.371.785.000 → Rp2.457.930.000 |
| flat-5y-30 | +7,4% | +8,3% | +3,9% | Rp1.470.585.000 → Rp1.651.957.500 |

## Pengungkapan penghasilan sintetis per Mitra PLS

| Skenario | Aturan | Median | Persentil 90 | Tertinggi | Porsi tanpa bonus |
|---|---|---:|---:|---:|---:|
| ideal-12 | v1.3 (akses 3 bulan, Langganan bulan ke-4) | Rp0 | Rp4.048.736 | Rp45.730.936 | 50,0% |
| flat-5y | v1.3 (akses 3 bulan, Langganan bulan ke-4) | Rp0 | Rp9.808.203 | Rp408.426.243 | 61,1% |
| risefall-5y | v1.3 (akses 3 bulan, Langganan bulan ke-4) | Rp0 | Rp10.034.926 | Rp725.166.882 | 61,5% |
| flat-5y-30 | v1.3 (akses 3 bulan, Langganan bulan ke-4) | Rp0 | Rp14.568.384 | Rp1.770.436.169 | 51,8% |
| ideal-12 | v1.4 (lifetime, Langganan bulan berikutnya) | Rp0 | Rp4.475.736 | Rp78.663.892 | 50,0% |
| flat-5y | v1.4 (lifetime, Langganan bulan berikutnya) | Rp0 | Rp10.051.323 | Rp591.624.556 | 61,6% |
| risefall-5y | v1.4 (lifetime, Langganan bulan berikutnya) | Rp0 | Rp10.346.928 | Rp929.867.054 | 61,9% |
| flat-5y-30 | v1.4 (lifetime, Langganan bulan berikutnya) | Rp0 | Rp15.253.437 | Rp2.743.216.823 | 51,5% |
| flat-5y | v1.4, retensi Langganan turun ke 60% | Rp0 | Rp8.578.234 | Rp421.282.263 | 61,7% |
| risefall-5y | v1.4, retensi Langganan turun ke 60% | Rp0 | Rp8.795.421 | Rp678.597.036 | 61,3% |
| flat-5y-30 | v1.4, retensi Langganan turun ke 60% | Rp0 | Rp12.720.314 | Rp1.857.597.498 | 50,8% |

## Cara membaca

- Plan A tidak berubah karena harga, PV, dan bonus Lisensi tidak berubah. Selisih kecil berasal dari urutan acak peristiwa.
- Langganan dimulai 2 bulan lebih awal per pemegang Lisensi, sehingga omzet Langganan dan Plan B naik. Plafon Plan B tetap 40% omzet bersih Langganan.
- Bonus tim (Level, Pasangan, Pembinaan) kini mensyaratkan Langganan aktif mulai bulan ke-2, sehingga lebih banyak bonus tim tertahan bila pemegang Lisensi belum berlangganan.
- Kenaikan penghasilan tertinggi terutama berasal dari Plan B yang mengalir lebih awal; median tetap Rp0 karena sebagian besar Mitra PLS tidak menerima bonus.
