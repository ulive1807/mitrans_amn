# Hasil Simulasi Engine Komisi Mitrans-Astra

Dibuat oleh `npm run simulate` pada 2026-10-29 · Rencana Pemasaran v2.0-draf · skala 1

> **Hasil ini bukan proyeksi penjualan dan bukan perkiraan penghasilan.** Jaringan, nama, dan NIK seluruhnya sintetis.
> Tujuannya menguji apakah aturan dan plafon bekerja. Kolom "v1.2 (dokumen)" adalah hasil uji internal Rencana Pemasaran v1.2 Bab 12.3,
> sebagai pembanding aturan lama; engine kini menjalankan aturan v2.0 (spesifikasi 2026-10-29).

## Ringkasan per skenario

| Skenario | Lisensi | Mitra PLS | Plan A dibayar (engine) | Plan A v1.2 (dokumen) | Plan B dibayar (engine) | Plan B v1.2 (dokumen) | Bulan Plan A tertinggi | Faktor plafon dipakai |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Jaringan ideal 12 level (semua Mitra PLS menjual 2 Lisensi) | 4.095 | 4.095 | 35,1% | 46,9% | 43,8% | 36,7% | 35,1% (2027-03) | Tidak · Pool dibatasi 3 bulan |
| Jaringan 5 tahun, penjualan rata (70% pembeli menjadi Mitra PLS) | 22.691 | 17.028 | 17,7% | 31,1% | 12,5% | 26,6% | 36,0% (2027-05) | Tidak |
| Jaringan 5 tahun, penjualan naik lalu turun (70%) | 24.838 | 18.607 | 18,4% | 31,8% | 12,6% | 26,7% | 36,7% (2027-03) | Tidak |
| Jaringan 5 tahun, penjualan rata, hanya 30% pembeli menjadi Mitra PLS | 22.595 | 9.121 | 21,0% | 26,5% | 14,1% | 26,8% | 36,4% (2027-03) | Tidak |

## Rincian pembayaran per jenis (seluruh periode)

| Jenis | ideal-12 | flat-5y | risefall-5y | flat-5y-30 |
|---|---:|---:|---:|---:|
| Bonus Sponsor | 11,1% | 11,0% | 11,0% | 11,0% |
| Bonus Layanan Berkah | 0,0% | 0,2% | 0,2% | 0,5% |
| Bonus Fast Start | 14,8% | 2,6% | 2,6% | 2,4% |
| Bonus Pendamping | 0,7% | 0,1% | 0,2% | 0,1% |
| Bonus Pasangan | 1,1% | 0,6% | 0,7% | 0,9% |
| Bonus Pembinaan | 0,0% | 0,2% | 0,4% | 0,7% |
| Bonus Prestasi Peringkat | 0,0% | 0,0% | 0,0% | 0,0% |
| Bonus Leadership | 0,0% | 0,0% | 0,0% | 0,0% |
| Pool Aktif | 7,4% | 3,0% | 3,3% | 5,4% |
| Komisi Langganan | 19,4% | 7,6% | 7,7% | 8,3% |
| Pasangan Langganan (RO) | 21,3% | 3,4% | 3,4% | 3,0% |
| Royalti Langganan (RO) | 3,0% | 1,5% | 1,5% | 2,8% |

Persentase Plan A terhadap omzet bersih Lisensi; Plan B terhadap omzet bersih Langganan.

## Pengungkapan penghasilan sintetis (format Bab 14 butir 4)

| Skenario | Median total diterima per Mitra PLS | Persentil 90 | Tertinggi | Porsi Mitra PLS tanpa bonus | Rata-rata porsi Mitra PLS aktif per bulan |
|---|---:|---:|---:|---:|---:|
| ideal-12 | Rp0 | Rp5.462.500 | Rp68.783.126 | 50,0% | 19,3% |
| flat-5y | Rp0 | Rp6.250.000 | Rp330.262.236 | 62,3% | 4,3% |
| risefall-5y | Rp0 | Rp6.927.500 | Rp530.072.350 | 62,1% | 5,1% |
| flat-5y-30 | Rp0 | Rp12.410.000 | Rp1.952.525.335 | 51,2% | 7,8% |

## Kesehatan dana

| Skenario | Prestasi dari dana cadangan | Sisa Pool Aktif akhir | Bonus masih ditahan akhir | Waktu jalan |
|---|---:|---:|---:|---:|
| ideal-12 | Rp0 | Rp3.815.040.000 | Rp0 | 0.5 detik |
| flat-5y | Rp0 | Rp0 | Rp424.932.500 | 14.1 detik |
| risefall-5y | Rp0 | Rp0 | Rp79.202.500 | 22.5 detik |
| flat-5y-30 | Rp0 | Rp0 | Rp383.930.000 | 17.9 detik |

## Batas atas biaya per Lisensi (dihitung ulang dari parameter, spesifikasi 10.2)

| Jenis | Spesifikasi v2.0 | Engine |
|---|---:|---:|
| Lisensi kepada Mitra PLS baru | 57,97% | 57,97% |
| Lisensi kepada Pelanggan | 57,23% | 57,23% |
| Lisensi Pelanggan dikonversi | 57,23% | 57,23% |
| Langganan | 47,47% | 47,47% |

## Skenario headline: "ajak 2 orang per bulan selama 2 bulan, dan bantu mereka melakukan hal yang sama"

Setiap Mitra PLS menjual 1 Lisensi ke kaki kiri dan 1 ke kaki kanan per bulan mulai bulan setelah aktivasinya (headline resmi: selama 2 bulan, lalu membina); semua berlangganan mulai bulan ke-4 dan menjalankan pembinaan. Penjualan terjadi tanggal 10, sehingga penjualan bulan ke-3 (tepat hari ke-90) sudah di luar jendela 90 hari.

| Skenario | Mitra PLS | Bonus Mitra pertama dari 90 hari pertama | Tanpa Pool Aktif | Porsi Mitra ≥ Rp7,5 jt dalam 90 hari* | Median total per Mitra PLS | Porsi tanpa bonus |
|---|---:|---:|---:|---:|---:|---:|
| Headline: 2 per bulan (selama 2 bulan, lalu bina), 7 bulan | 517 | Rp9.875.000 | Rp7.875.000 | 100,0% | Rp0 | 63,4% |
| Headline: 2 per bulan (terus), 5 bulan | 81 | Rp9.875.000 | Rp7.875.000 | 33,3% | Rp0 | 66,7% |
| Headline: 2 per bulan (sekali), 8 bulan | 255 | Rp4.850.000 | Rp3.850.000 | 0,0% | Rp0 | 50,2% |

\* Di antara Mitra PLS yang jendela 90 harinya sudah selesai pada akhir simulasi.

Rasio bonus Plan A per bulan (headline resmi: 2 per bulan selama 2 bulan, lalu bina):

| Bulan | Lisensi | Plan A dibayar | Pengisian Pool (top-up) | Mitra aktif |
|---|---:|---:|---:|---:|
| 2027-01 | 1 | 0,0% | Rp3.074.324 | 0 / 1 |
| 2027-02 | 2 | 34,4% | Rp1.856.757 | 1 / 3 |
| 2027-03 | 6 | 35,8% | Rp6.920.947 | 3 / 9 |
| 2027-04 | 16 | 35,7% | Rp18.639.191 | 8 / 25 |
| 2027-05 | 44 | 35,7% | Rp51.120.275 | 22 / 69 |
| 2027-06 | 120 | 35,7% | Rp137.868.932 | 60 / 189 |
| 2027-07 | 328 | 35,7% | Rp372.953.415 | 164 / 517 |

## Catatan pembacaan

- Skenario organik memakai asumsi: 15% Pelanggan mengonversi, retensi Langganan 80% per bulan, 60% Mitra PLS menjalankan pembinaan, 90% Pelanggan mengonfirmasi orientasi, 1% pembatalan. Penjual dipilih acak berbobot (15% Mitra PLS menjual jauh lebih banyak).
- Skenario ideal: setiap Mitra PLS mensponsori tepat 2 Mitra PLS (kiri dan kanan), satu level per bulan, semua berlangganan dan menjalankan pembinaan.
- Kolom v1.2 (dokumen) hanya pembanding: engine kini memakai plafon Plan A 60% dan pengisian Pool Aktif sampai 55%, sehingga bulan dengan Mitra aktif cenderung membayar tepat 55%.
- Pada skenario headline, Pool Aktif menjadi bagian besar penghasilan Mitra awal karena hanya sedikit Mitra yang aktif saat jaringan masih kecil. Ini konsekuensi aturan pengisian 55% dan perlu keputusan (lihat ringkasan pekerjaan).
- Asumsi penempatan dan aturan yang tidak diatur dokumen: lihat docs/ARSITEKTUR_SISTEM.md bagian Asumsi.
