# Hasil Simulasi Engine Komisi Mitrans-Astra

Dibuat oleh `npm run simulate` pada 2026-10-29 · Rencana Pemasaran v2.0-draf · skala 1

> **Hasil ini bukan proyeksi penjualan dan bukan perkiraan penghasilan.** Jaringan, nama, dan NIK seluruhnya sintetis.
> Tujuannya menguji apakah aturan dan plafon bekerja. Kolom "v1.2 (dokumen)" adalah hasil uji internal Rencana Pemasaran v1.2 Bab 12.3,
> sebagai pembanding aturan lama; engine kini menjalankan aturan v2.0 (spesifikasi 2026-10-29).

## Ringkasan per skenario

| Skenario | Lisensi | Mitra PLS | Plan A dibayar (engine) | Plan A v1.2 (dokumen) | Plan B dibayar (engine) | Plan B v1.2 (dokumen) | Bulan Plan A tertinggi | Faktor plafon dipakai |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Jaringan ideal 12 level (semua Mitra PLS menjual 2 Lisensi) | 4.095 | 4.095 | 31,4% | 46,9% | 35,2% | 36,7% | 31,4% (2027-03) | Tidak · Pool dibatasi 3 bulan |
| Jaringan 5 tahun, penjualan rata (70% pembeli menjadi Mitra PLS) | 22.686 | 16.974 | 17,1% | 31,1% | 11,2% | 26,6% | 33,6% (2027-04) | Tidak |
| Jaringan 5 tahun, penjualan naik lalu turun (70%) | 24.835 | 18.401 | 17,7% | 31,8% | 11,0% | 26,7% | 33,4% (2027-03) | Tidak |
| Jaringan 5 tahun, penjualan rata, hanya 30% pembeli menjadi Mitra PLS | 22.609 | 9.084 | 20,1% | 26,5% | 13,0% | 26,8% | 32,6% (2027-05) | Tidak |

## Rincian pembayaran per jenis (seluruh periode)

| Jenis | ideal-12 | flat-5y | risefall-5y | flat-5y-30 |
|---|---:|---:|---:|---:|
| Bonus Sponsor | 11,1% | 11,0% | 11,0% | 11,0% |
| Bonus Layanan Berkah | 0,0% | 0,2% | 0,2% | 0,4% |
| Bonus Fast Start | 11,1% | 1,9% | 1,9% | 1,8% |
| Bonus Pendamping | 0,7% | 0,1% | 0,2% | 0,1% |
| Bonus Balik Modal | 0,0% | 0,0% | 0,0% | 0,0% |
| Bonus Pasangan | 1,1% | 0,6% | 0,6% | 1,0% |
| Bonus Pembinaan | 0,0% | 0,3% | 0,4% | 0,6% |
| Bonus Prestasi Peringkat | 0,0% | 0,0% | 0,0% | 0,0% |
| Bonus Leadership | 0,0% | 0,0% | 0,0% | 0,0% |
| Pool Aktif | 7,4% | 3,0% | 3,3% | 5,2% |
| Komisi Langganan | 19,4% | 7,6% | 7,6% | 8,3% |
| Pasangan Langganan (RO) | 12,8% | 2,1% | 1,9% | 2,0% |
| Royalti Langganan (RO) | 3,0% | 1,5% | 1,5% | 2,7% |

Persentase Plan A terhadap omzet bersih Lisensi; Plan B terhadap omzet bersih Langganan.

## Pengungkapan penghasilan sintetis (format Bab 14 butir 4)

| Skenario | Median total diterima per Mitra PLS | Persentil 90 | Tertinggi | Porsi Mitra PLS tanpa bonus | Rata-rata porsi Mitra PLS aktif per bulan |
|---|---:|---:|---:|---:|---:|
| ideal-12 | Rp0 | Rp4.885.500 | Rp46.870.126 | 50,0% | 19,3% |
| flat-5y | Rp0 | Rp6.002.000 | Rp350.822.821 | 61,3% | 4,3% |
| risefall-5y | Rp0 | Rp6.477.000 | Rp467.209.274 | 61,6% | 4,9% |
| flat-5y-30 | Rp0 | Rp12.242.500 | Rp1.264.651.536 | 52,0% | 7,8% |

## Kesehatan dana

| Skenario | Prestasi dari dana cadangan | Sisa Pool Aktif akhir | Bonus masih ditahan akhir | Waktu jalan |
|---|---:|---:|---:|---:|
| ideal-12 | Rp0 | Rp3.815.040.000 | Rp0 | 0.6 detik |
| flat-5y | Rp0 | Rp0 | Rp448.550.000 | 18.9 detik |
| risefall-5y | Rp0 | Rp0 | Rp73.002.500 | 20.2 detik |
| flat-5y-30 | Rp0 | Rp0 | Rp380.362.500 | 16.5 detik |

## Batas atas biaya per Lisensi (dihitung ulang dari parameter, spesifikasi 10.2)

| Jenis | Spesifikasi v2.0 | Engine |
|---|---:|---:|
| Lisensi kepada Mitra PLS baru | 59,82% | 59,82% |
| Lisensi kepada Pelanggan | 59,08% | 59,08% |
| Lisensi Pelanggan dikonversi | 59,08% | 59,08% |
| Langganan | 37,47% | 37,47% |

## Skenario headline: "ajak 2 orang per bulan selama 2 bulan, dan bantu mereka melakukan hal yang sama"

Setiap Mitra PLS menjual 1 Lisensi ke kaki kiri dan 1 ke kaki kanan per bulan mulai bulan setelah aktivasinya; semua berlangganan mulai bulan ke-4 dan menjalankan pembinaan. Penjualan terjadi tanggal 10, sehingga penjualan bulan ke-3 (tepat hari ke-90) sudah di luar jendela 90 hari.

| Skenario | Mitra PLS | Bonus Mitra pertama dari 90 hari pertama | Tanpa Pool Aktif | Porsi Mitra yang memperoleh Balik Modal* | Median total per Mitra PLS | Porsi tanpa bonus |
|---|---:|---:|---:|---:|---:|---:|
| Headline: 2 per bulan (terus), 5 bulan pertumbuhan | 81 | Rp10.375.000 | Rp8.375.000 | 33,3% | Rp0 | 66,7% |
| Headline: 2 per bulan (sekali), 8 bulan pertumbuhan | 255 | Rp4.350.000 | Rp3.350.000 | 0,0% | Rp0 | 50,2% |

\* Di antara Mitra PLS yang jendela 90 harinya sudah selesai pada akhir simulasi.

Rasio bonus Plan A per bulan (skenario terus):

| Bulan | Lisensi | Plan A dibayar | Pengisian Pool (top-up) | Mitra aktif |
|---|---:|---:|---:|---:|
| 2027-01 | 1 | 0,0% | Rp3.074.324 | 0 / 1 |
| 2027-02 | 2 | 30,7% | Rp2.356.757 | 1 / 3 |
| 2027-03 | 6 | 35,8% | Rp6.920.947 | 3 / 9 |
| 2027-04 | 18 | 34,4% | Rp22.487.840 | 9 / 27 |
| 2027-05 | 54 | 36,2% | Rp60.938.519 | 27 / 81 |
| 2027-06 | 0 | 0,0% | Rp0 | 0 / 81 |
| 2027-07 | 0 | 0,0% | Rp0 | 0 / 81 |
| 2027-08 | 0 | 0,0% | Rp0 | 0 / 81 |

## Catatan pembacaan

- Skenario organik memakai asumsi: 15% Pelanggan mengonversi, retensi Langganan 80% per bulan, 60% Mitra PLS menjalankan pembinaan, 90% Pelanggan mengonfirmasi orientasi, 1% pembatalan. Penjual dipilih acak berbobot (15% Mitra PLS menjual jauh lebih banyak).
- Skenario ideal: setiap Mitra PLS mensponsori tepat 2 Mitra PLS (kiri dan kanan), satu level per bulan, semua berlangganan dan menjalankan pembinaan.
- Kolom v1.2 (dokumen) hanya pembanding: engine kini memakai plafon Plan A 60% dan pengisian Pool Aktif sampai 55%, sehingga bulan dengan Mitra aktif cenderung membayar tepat 55%.
- Pada skenario headline, Pool Aktif menjadi bagian besar penghasilan Mitra awal karena hanya sedikit Mitra yang aktif saat jaringan masih kecil. Ini konsekuensi aturan pengisian 55% dan perlu keputusan (lihat ringkasan pekerjaan).
- Asumsi penempatan dan aturan yang tidak diatur dokumen: lihat docs/ARSITEKTUR_SISTEM.md bagian Asumsi.
