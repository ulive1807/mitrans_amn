# Hasil Simulasi Engine Komisi Mitrans-Astra

Dibuat oleh `npm run simulate` pada 2026-10-27 · Rencana Pemasaran v1.2 · skala 1

> **Hasil ini bukan proyeksi penjualan dan bukan perkiraan penghasilan.** Jaringan, nama, dan NIK seluruhnya sintetis.
> Tujuannya menguji apakah aturan dan plafon bekerja. Angka "dokumen" adalah hasil uji internal di Rencana Pemasaran Bab 12.3,
> yang asumsi lengkapnya tidak tercantum, sehingga selisih wajar terjadi dan perlu dibahas (lihat bagian Catatan).

## Ringkasan per skenario

| Skenario | Lisensi | Mitra PLS | Plan A dibayar (engine) | Plan A (dokumen) | Plan B dibayar (engine) | Plan B (dokumen) | Bulan Plan A tertinggi | Faktor plafon dipakai |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Jaringan ideal 12 level (semua Mitra PLS menjual 2 Lisensi) | 4.095 | 4.095 | 26,6% | 46,9% | 35,2% | 36,7% | 27,2% (2027-12) | Tidak · Pool dibatasi 3 bulan |
| Jaringan 5 tahun, penjualan rata (70% pembeli menjadi Mitra PLS) | 22.686 | 16.974 | 29,0% | 31,1% | 8,9% | 26,6% | 31,1% (2031-11) | Tidak |
| Jaringan 5 tahun, penjualan naik lalu turun (70%) | 24.835 | 18.401 | 28,9% | 31,8% | 8,9% | 26,7% | 50,0% (2031-12) | Tidak · Pool dibatasi 2 bulan |
| Jaringan 5 tahun, penjualan rata, hanya 30% pembeli menjadi Mitra PLS | 22.609 | 9.084 | 24,9% | 26,5% | 12,0% | 26,8% | 26,8% (2031-06) | Tidak |

## Rincian pembayaran per jenis (seluruh periode)

| Jenis | ideal-12 | flat-5y | risefall-5y | flat-5y-30 |
|---|---:|---:|---:|---:|
| Bonus Sponsor | 11,1% | 11,0% | 11,0% | 11,0% |
| Bonus Layanan Berkah | 0,0% | 0,2% | 0,2% | 0,4% |
| Bonus Level | 5,5% | 1,2% | 1,3% | 1,2% |
| Bonus Pasangan | 1,1% | 0,5% | 0,6% | 1,0% |
| Bonus Pembinaan | 0,0% | 0,3% | 0,4% | 0,6% |
| Bonus Prestasi Peringkat | 0,0% | 0,3% | 0,4% | 0,5% |
| Royalti | 0,0% | 0,0% | 0,0% | 0,2% |
| Pool Aktif | 8,8% | 15,5% | 15,0% | 9,9% |
| Komisi Langganan | 19,4% | 5,7% | 5,9% | 7,4% |
| Pasangan Langganan (RO) | 12,8% | 1,7% | 1,5% | 1,8% |
| Royalti Langganan (RO) | 3,0% | 1,5% | 1,5% | 2,7% |

Persentase Plan A terhadap omzet bersih Lisensi; Plan B terhadap omzet bersih Langganan.

## Pengungkapan penghasilan sintetis (format Bab 14 butir 4)

| Skenario | Median total diterima per Mitra PLS | Persentil 90 | Tertinggi | Porsi Mitra PLS tanpa bonus | Rata-rata porsi Mitra PLS aktif per bulan |
|---|---:|---:|---:|---:|---:|
| ideal-12 | Rp0 | Rp4.048.736 | Rp45.730.936 | 50,0% | 19,3% |
| flat-5y | Rp0 | Rp3.750.000 | Rp344.026.543 | 61,4% | 2,4% |
| risefall-5y | Rp0 | Rp3.800.000 | Rp480.302.466 | 61,6% | 2,7% |
| flat-5y-30 | Rp0 | Rp14.403.108 | Rp1.406.165.618 | 52,0% | 5,7% |

## Kesehatan dana

| Skenario | Prestasi dari dana cadangan | Sisa Pool Aktif akhir | Bonus masih ditahan akhir | Waktu jalan |
|---|---:|---:|---:|---:|
| ideal-12 | Rp0 | Rp5.112.631.234 | Rp0 | 0.7 detik |
| flat-5y | Rp0 | Rp18 | Rp840.950.000 | 18.8 detik |
| risefall-5y | Rp0 | Rp90.899.315 | Rp146.142.500 | 23.4 detik |
| flat-5y-30 | Rp0 | Rp79 | Rp558.212.500 | 18.3 detik |

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
