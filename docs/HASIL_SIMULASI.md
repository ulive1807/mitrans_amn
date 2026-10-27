# Hasil Simulasi Engine Komisi Mitrans-Astra

Dibuat oleh `npm run simulate` pada 2026-10-27 · Rencana Pemasaran v1.3 · skala 1

> **Hasil ini bukan proyeksi penjualan dan bukan perkiraan penghasilan.** Jaringan, nama, dan NIK seluruhnya sintetis.
> Tujuannya menguji apakah aturan dan plafon bekerja. Angka "uji lama v1.2" adalah hasil uji internal Rencana Pemasaran v1.2 Bab 12.3;
> Rencana Pemasaran v1.3 Bab 12.3 sudah memakai hasil engine di bawah ini beserta asumsinya.

## Ringkasan per skenario

| Skenario | Lisensi | Mitra PLS | Plan A dibayar (engine) | Plan A (uji lama v1.2) | Plan B dibayar (engine) | Plan B (uji lama v1.2) | Bulan Plan A tertinggi | Faktor plafon dipakai |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Jaringan ideal 12 level (semua Mitra PLS menjual 2 Lisensi) | 4.095 | 4.095 | 26,6% | 46,9% | 35,2% | 36,7% | 27,2% (2027-12) | Tidak · Pool dibatasi 3 bulan |
| Jaringan 5 tahun, penjualan rata (70% pembeli menjadi Mitra PLS) | 22.686 | 16.974 | 29,2% | 31,1% | 13,2% | 26,6% | 31,5% (2031-07) | Tidak |
| Jaringan 5 tahun, penjualan naik lalu turun (70%) | 24.835 | 18.401 | 29,0% | 31,8% | 13,1% | 26,7% | 38,5% (2031-12) | Tidak |
| Jaringan 5 tahun, penjualan rata, hanya 30% pembeli menjadi Mitra PLS | 22.609 | 9.084 | 25,0% | 26,5% | 14,2% | 26,8% | 27,3% (2029-06) | Tidak |

## Rincian pembayaran per jenis (seluruh periode)

| Jenis | ideal-12 | flat-5y | risefall-5y | flat-5y-30 |
|---|---:|---:|---:|---:|
| Bonus Sponsor | 11,1% | 11,1% | 11,1% | 11,1% |
| Bonus Layanan Berkah | 0,0% | 0,2% | 0,2% | 0,5% |
| Bonus Level | 5,5% | 4,6% | 4,7% | 2,7% |
| Bonus Pasangan | 1,1% | 1,8% | 1,9% | 2,1% |
| Bonus Pembinaan | 0,0% | 0,9% | 1,3% | 1,4% |
| Bonus Prestasi Peringkat | 0,0% | 0,9% | 0,8% | 0,9% |
| Royalti | 0,0% | 0,0% | 0,0% | 0,6% |
| Pool Aktif | 8,8% | 9,7% | 8,9% | 5,7% |
| Komisi Langganan | 19,4% | 9,3% | 9,3% | 9,4% |
| Pasangan Langganan (RO) | 12,8% | 2,3% | 2,3% | 2,1% |
| Royalti Langganan (RO) | 3,0% | 1,5% | 1,5% | 2,7% |

Persentase Plan A terhadap omzet bersih Lisensi; Plan B terhadap omzet bersih Langganan.

## Pengungkapan penghasilan sintetis (format Bab 14 butir 4)

| Skenario | Median total diterima per Mitra PLS | Persentil 90 | Tertinggi | Porsi Mitra PLS tanpa bonus | Rata-rata porsi Mitra PLS aktif per bulan |
|---|---:|---:|---:|---:|---:|
| ideal-12 | Rp0 | Rp4.048.736 | Rp45.730.936 | 50,0% | 19,3% |
| flat-5y | Rp0 | Rp9.808.203 | Rp408.426.243 | 61,1% | 8,5% |
| risefall-5y | Rp0 | Rp10.034.926 | Rp725.166.882 | 61,5% | 9,4% |
| flat-5y-30 | Rp0 | Rp14.568.384 | Rp1.770.436.169 | 51,8% | 15,2% |

## Kesehatan dana

| Skenario | Prestasi dari dana cadangan | Sisa Pool Aktif akhir | Bonus masih ditahan akhir | Waktu jalan |
|---|---:|---:|---:|---:|
| ideal-12 | Rp0 | Rp5.112.631.234 | Rp0 | 0.7 detik |
| flat-5y | Rp0 | Rp338 | Rp533.677.500 | 19.6 detik |
| risefall-5y | Rp0 | Rp49 | Rp87.922.500 | 28.2 detik |
| flat-5y-30 | Rp0 | Rp315 | Rp347.767.500 | 21.6 detik |

## Batas atas biaya per Lisensi (dihitung ulang dari parameter, Bab 12.2)

| Jenis | Dokumen | Engine |
|---|---:|---:|
| Lisensi kepada Mitra PLS baru | 48,95% | 48,95% |
| Lisensi kepada Pelanggan | 38,6% | 38,59% |
| Lisensi Pelanggan dikonversi | 49,7% | 49,69% |
| Langganan | 38% | 37,47% |

## Catatan pembacaan

- Skenario organik memakai asumsi: 15% Pelanggan mengonversi, retensi Langganan 80% per bulan, 60% Mitra PLS menjalankan pembinaan, 90% Pelanggan mengonfirmasi orientasi, 1% pembatalan. Penjual dipilih acak berbobot (15% Mitra PLS menjual jauh lebih banyak).
- Skenario ideal: setiap Mitra PLS mensponsori tepat 2 Mitra PLS (kiri dan kanan), satu level per bulan, semua berlangganan dan menjalankan pembinaan.
- Selisih dengan angka dokumen berasal dari asumsi perilaku dan aturan penempatan yang tidak diatur dokumen. Lihat docs/ARSITEKTUR_SISTEM.md bagian Asumsi.

## Kepekaan: plafon Plan A 40%

Skenario yang sama, hanya plafon Plan A diubah dari 50% menjadi 40% omzet bersih Lisensi.

| Skenario | Plan A dibayar | Bulan Plan A tertinggi | Bulan faktor plafon dipakai | Bulan Pool Aktif dibatasi plafon |
|---|---:|---:|---:|---:|
| ideal-12 | 26,6% | 27,2% | 0 | 3 |
| flat-5y | 29,2% | 31,5% | 0 | 0 |
| risefall-5y | 29,0% | 38,5% | 0 | 0 |
| flat-5y-30 | 25,0% | 27,3% | 0 | 0 |
