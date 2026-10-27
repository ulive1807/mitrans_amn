# Banding Aturan Lisensi: v1.3 vs v1.4 (Lisensi Lifetime, Langganan 30 Hari)

Dibuat oleh `npx tsx scripts/banding-lisensi.ts` pada 2026-10-27. Skenario, benih acak, dan asumsi perilaku sama dengan Bab 12.3 (`docs/HASIL_SIMULASI.md`). Angka v1.3 adalah hasil tetap dari engine aturan v1.3 (commit 52d54dc); omzet dan bonusnya dibulatkan ke 0,01 miliar.

> **Bukan proyeksi penjualan atau penghasilan.** Data sintetis. Simulasi menganggap jumlah Lisensi terjual dan retensi Langganan (80% per tagihan) tidak berubah oleh aturan baru; baris "retensi 60%" menguji bila tagihan yang datang lebih cepat membuat lebih banyak pembeli berhenti.

## Omzet dan bonus (total selama simulasi)

| Skenario | Aturan | Lisensi | Langganan dibayar | Omzet bersih Lisensi | Omzet bersih Langganan | Plan A dibayar | Plan B dibayar | Plan B / omzet Langganan | Omzet bersih dikurangi Plan A+B |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| ideal-12 | v1.3 (akses 3 bulan, Langganan bulan ke-4) | 4.095 | 8.178 | Rp27,67 miliar | Rp2,94 miliar | Rp7,35 miliar | Rp1,04 miliar | 35,4% | Rp22,22 miliar |
| flat-5y | v1.3 (akses 3 bulan, Langganan bulan ke-4) | 22.686 | 471.789 | Rp153,28 miliar | Rp169,59 miliar | Rp44,77 miliar | Rp22,33 miliar | 13,2% | Rp255,77 miliar |
| risefall-5y | v1.3 (akses 3 bulan, Langganan bulan ke-4) | 24.835 | 536.490 | Rp167,80 miliar | Rp192,85 miliar | Rp48,68 miliar | Rp25,18 miliar | 13,1% | Rp286,79 miliar |
| flat-5y-30 | v1.3 (akses 3 bulan, Langganan bulan ke-4) | 22.609 | 470.456 | Rp152,76 miliar | Rp169,11 miliar | Rp38,13 miliar | Rp23,94 miliar | 14,2% | Rp259,80 miliar |
| ideal-12 | v1.4 (lifetime, Langganan 30 hari setelah aktivasi) | 4.095 | 16.368 | Rp27,67 miliar | Rp5,88 miliar | Rp7,35 miliar | Rp2,10 miliar | 35,7% | Rp24,10 miliar |
| flat-5y | v1.4 (lifetime, Langganan 30 hari setelah aktivasi) | 22.683 | 514.666 | Rp153,26 miliar | Rp185,00 miliar | Rp44,18 miliar | Rp24,26 miliar | 13,1% | Rp269,83 miliar |
| risefall-5y | v1.4 (lifetime, Langganan 30 hari setelah aktivasi) | 24.838 | 585.236 | Rp167,82 miliar | Rp210,37 miliar | Rp48,80 miliar | Rp27,56 miliar | 13,1% | Rp301,84 miliar |
| flat-5y-30 | v1.4 (lifetime, Langganan 30 hari setelah aktivasi) | 22.605 | 512.399 | Rp152,74 miliar | Rp184,19 miliar | Rp38,19 miliar | Rp26,25 miliar | 14,3% | Rp272,48 miliar |
| flat-5y | v1.4, retensi Langganan turun ke 60% | 22.683 | 385.887 | Rp153,26 miliar | Rp138,71 miliar | Rp44,09 miliar | Rp14,14 miliar | 10,2% | Rp233,74 miliar |
| risefall-5y | v1.4, retensi Langganan turun ke 60% | 24.838 | 438.229 | Rp167,82 miliar | Rp157,53 miliar | Rp48,79 miliar | Rp15,89 miliar | 10,1% | Rp260,67 miliar |
| flat-5y-30 | v1.4, retensi Langganan turun ke 60% | 22.605 | 384.416 | Rp152,74 miliar | Rp138,18 miliar | Rp38,13 miliar | Rp15,71 miliar | 11,4% | Rp237,08 miliar |

## Perubahan v1.4 dibanding v1.3

| Skenario | Omzet bersih Langganan (retensi 80%) | Plan B dibayar (retensi 80%) | Omzet bersih total (retensi 80%) | Omzet bersih Langganan (retensi 60%) | Bonus tim tertahan karena Langganan |
|---|---:|---:|---:|---:|---:|
| ideal-12 | +100,1% | +102,2% | +9,6% | – | Rp0 → Rp0 |
| flat-5y | +9,1% | +8,6% | +4,8% | -18,2% | Rp1.878.517.500 → Rp2.090.947.500 |
| risefall-5y | +9,1% | +9,4% | +4,9% | -18,3% | Rp2.371.785.000 → Rp2.566.995.000 |
| flat-5y-30 | +8,9% | +9,7% | +4,7% | -18,3% | Rp1.470.585.000 → Rp1.612.185.000 |

## Pengungkapan penghasilan sintetis per Mitra PLS

| Skenario | Aturan | Median | Persentil 90 | Tertinggi | Porsi tanpa bonus |
|---|---|---:|---:|---:|---:|
| ideal-12 | v1.3 (akses 3 bulan, Langganan bulan ke-4) | Rp0 | Rp4.048.736 | Rp45.730.936 | 50,0% |
| flat-5y | v1.3 (akses 3 bulan, Langganan bulan ke-4) | Rp0 | Rp9.808.203 | Rp408.426.243 | 61,1% |
| risefall-5y | v1.3 (akses 3 bulan, Langganan bulan ke-4) | Rp0 | Rp10.034.926 | Rp725.166.882 | 61,5% |
| flat-5y-30 | v1.3 (akses 3 bulan, Langganan bulan ke-4) | Rp0 | Rp14.568.384 | Rp1.770.436.169 | 51,8% |
| ideal-12 | v1.4 (lifetime, Langganan 30 hari setelah aktivasi) | Rp0 | Rp4.475.736 | Rp78.663.892 | 50,0% |
| flat-5y | v1.4 (lifetime, Langganan 30 hari setelah aktivasi) | Rp0 | Rp10.179.912 | Rp393.129.353 | 61,8% |
| risefall-5y | v1.4 (lifetime, Langganan 30 hari setelah aktivasi) | Rp0 | Rp10.293.793 | Rp642.223.820 | 61,7% |
| flat-5y-30 | v1.4 (lifetime, Langganan 30 hari setelah aktivasi) | Rp0 | Rp14.693.423 | Rp2.221.448.017 | 51,8% |
| flat-5y | v1.4, retensi Langganan turun ke 60% | Rp0 | Rp9.072.965 | Rp331.058.184 | 61,8% |
| risefall-5y | v1.4, retensi Langganan turun ke 60% | Rp0 | Rp8.985.201 | Rp494.546.563 | 61,7% |
| flat-5y-30 | v1.4, retensi Langganan turun ke 60% | Rp0 | Rp12.706.486 | Rp1.832.164.201 | 51,8% |

## Cara membaca

- Plan A hampir tidak berubah karena harga, PV, dan bonus Lisensi tidak berubah; selisih kecil berasal dari urutan acak peristiwa.
- Langganan kini ditagih 30 hari setelah aktivasi (sebelumnya mulai bulan ke-4), sehingga omzet Langganan dan Plan B naik bila retensi tetap. Plafon Plan B tetap 40% omzet bersih Langganan.
- Syarat Langganan untuk bonus tim dinilai pada akhir bulan: akses harus aktif saat itu, baik dari 30 hari pertama Lisensi maupun dari Langganan.
- Median tetap Rp0 pada semua skenario karena sebagian besar Mitra PLS tidak menerima bonus.
