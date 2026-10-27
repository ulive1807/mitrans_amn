# Ringkasan Aturan Mitra PLS Mitrans-Astra

Sumber: Rencana Pemasaran v1.2, Kode Etik Mitra PLS v1.2, Syarat dan Ketentuan mitrans.id v1.2 (draf 27 Oktober 2026), dan Catatan untuk Konsultan Hukum v1.1.
Seluruh dokumen sumber masih **draf**: belum ditinjau konsultan hukum dan belum diverifikasi asosiasi penjualan langsung.

Kolom **Kode** menunjukkan tempat aturan dijalankan engine (`src/engine/`).

## 1. Produk

| Produk | Harga (termasuk PPN) | Omzet bersih | PV | Kode |
|---|---:|---:|---:|---|
| Lisensi (akses 3 bulan) | Rp7.500.000 | Rp6.756.757 | 67,5 | `PLAN.license` |
| Langganan (per bulan, mulai bulan ke-4) | Rp399.000 | Rp359.459 | 3,5 | `PLAN.subscription` |

- Harga sama untuk Mitra PLS dan Pelanggan. Tidak ada opsi tahunan. Langganan tanpa Lisensi belum tersedia.
- 1 PV = Rp100.000 omzet bersih, hanya untuk menghitung bonus.
- Produk adalah alat analisis dan edukasi: tanpa sinyal beli/jual, tanpa transaksi otomatis, tanpa pengelolaan dana.

## 2. Keanggotaan

| Aturan | Isi | Kode |
|---|---|---|
| Biaya pendaftaran | Rp0, tanpa kewajiban membeli | `registerMitra` tidak membuat transaksi |
| Syarat | ≥18 tahun, e-KTP, rekening atas nama sendiri, setuju 3 dokumen | Form `/daftar` |
| Identitas | Satu NIK satu akun; batas dihitung per NIK | `assertNikFree`, `nik` di setiap entri |
| Tautan rujukan | Aktif setelah lulus kuis Kode Etik | `passQuiz`, `assertSellerCanSell` |
| Masa pertimbangan | 10 hari kerja | Ditampilkan di `/daftar` |
| Posisi biner | Saat Lisensi pertama diaktifkan | `purchaseLicense` → `placeNode` |
| Mitra PLS tanpa Lisensi | Boleh menjual; menerima Sponsor dan Berkah saja | Pembinaan ditandai `ineligible` |
| Konversi Pelanggan | ≤60 hari sejak pembelian; tanpa Bonus Sponsor kedua; tanpa volume ganda | `convertCustomer` |
| Akun struktural | Mitrans 001 (puncak), 002 (kiri), 003 (kanan): bonusnya tidak dibayarkan | status `company` |

## 3. Plan A — dari penjualan Lisensi

| Bonus | Nominal | Batas | Penerima | Kode |
|---|---|---|---|---|
| Sponsor | Rp750.000 per Lisensi dijual langsung | Selalu dibayar bila lunas (A4) | Penjual | `purchaseLicense` |
| Layanan Berkah | Rp50.000 per Lisensi kepada Pelanggan (termasuk yang dikonversi) | Konfirmasi orientasi + 30 hari; tanpa konfirmasi 60 hari → Pool | Penjual | `closeMonth` langkah 1 |
| Level | Rp750.000 sekali per kedalaman 1–10 saat kedua kaki pertama kali berisi Lisensi **Mitra PLS** | Rp7.500.000 seumur keanggotaan | Pemegang posisi | `markLevel` |
| Pasangan | Rp150.000 per pasangan | 10 level; 20 pasangan/hari; sisa unit dibawa | Pemegang posisi | `pairDay`, `endOfDay` |
| Pembinaan | Gen 1–3: 25%, gen 4–6: 10% dari Bonus Pasangan | 6 generasi sponsor | Sponsor pemegang Lisensi | `accruePembinaan` |
| Prestasi Peringkat | Bronze 0,5 jt · Silver 1 jt · Gold 2,5 jt · Platinum 5 jt · Diamond 10 jt · Emerald 30 jt | Sekali per peringkat; dana 2%; antrean FIFO; >6 bulan → dana cadangan | Yang mencapai | `closeMonth` langkah 5 |
| Royalti | Tingkat 1 (400:400) 1% + tingkat 2 (1.000:1.000) 1% | Rp100 jt/orang/bulan; kelebihan dibagi ulang | Pemegang tingkat yang aktif | `allocateEqualWithCap` |
| Pool Aktif | Sebanding penjualan baru pribadi | Di dalam plafon Plan A | Semua Mitra PLS aktif | `distributePool` |

Peringkat (kaki kecil kumulatif dalam 10 level, termasuk Lisensi Pelanggan): Bronze 5, Silver 15, Gold 50, Platinum 150, Diamond 500, Emerald 1.000.

Sumber Pool Aktif: bonus tim hangus, Royalti tanpa penerima dan kelebihan batas, sisa dana peringkat, kelebihan batas Rp1 miliar, Berkah tak terkonfirmasi.

## 4. Plan B — dari Langganan

| Bonus | Nominal | Kode |
|---|---|---|
| Komisi Langganan | Rp70.000 per Langganan per bulan, kepada penjual Pelanggan atau Sponsor langsung Mitra PLS | `closeMonth` langkah 9 |
| Pasangan RO | 3% × PV Langganan kaki kecil × Rp100.000; 10 level; tanpa akumulasi | `roPairAmount` |
| Royalti RO | Dana 3% omzet bersih Langganan: tingkat 1 (100:100) 1,5%, tingkat 2 (400:400) 1,5%; Rp100 jt/orang | `allocateEqualWithCap` |

Syarat Plan B: Langganan sendiri aktif, pernah aktif, dan ≥1 kegiatan pembinaan terkonfirmasi bulan itu. Tidak mensyaratkan penjualan baru.

## 5. Status aktif dan masa tunggu

- **Aktif** = ≥1 penjualan baru pribadi dalam bulan kalender (keputusan Coach 27 Oktober 2026; v1.2: 2): Lisensi Mitra PLS baru yang disponsori, Lisensi Pelanggan lewat tautannya, Langganan berbayar pertama Pelanggannya (sekali per Pelanggan).
- Tidak dihitung: pembelian sendiri, akun yang dikendalikan sendiri, pembelian yang dibatalkan.
- Level, Pasangan, dan Pembinaan pada bulan tidak aktif **ditahan**; dibayar bila aktif dalam 2 bulan berikutnya; bila tidak, hangus ke Pool Aktif.
- Mulai bulan ke-4 sejak aktivasi Lisensi, pemegang Lisensi wajib Langganan aktif untuk **bonus tim** (Level, Pasangan, Pembinaan). Bonus Sponsor dan Berkah selalu dibayar (keputusan A4).
- Bonus tim dibayar 80% setiap Jumat; 20% setelah tutup bulan sesuai faktor plafon (keputusan A10).
- Pembatalan menarik otomatis semua bonus yang timbul dari Lisensi itu (keputusan A12).

## 6. Plafon dan batas

| Batas | Nilai | Kode |
|---|---|---|
| Plafon Plan A | 50% omzet bersih Lisensi per bulan | `options.planACapBp` |
| Plafon Plan B | 40% omzet bersih Langganan per bulan | `options.planBCapBp` |
| Anggaran bonus tim | Plafon A − Sponsor − Berkah − dana peringkat 2% − dana Royalti 2% | `closeMonth` langkah 4 |
| Faktor plafon | Semua klaim tim dikali faktor sama; sisanya dibayar lebih dulu bulan berikutnya | `teamCarry` |
| Per identitas | Rp1.000.000.000 per bulan (Plan A + B) | `applyIdentityCap` |

## 7. Jadwal pembayaran

- **Setiap Jumat**, batas transaksi 07.00 WIB, transfer 07.01–19.00 WIB: Sponsor, Berkah jatuh tempo, bonus tim bagi yang sudah aktif bulan berjalan (`payoutFriday`).
- **Tutup bulan** tanggal 1 pukul 00.00 WIB, dibayar Jumat pertama sesudahnya: status aktif, masa tunggu, Prestasi, Royalti, Pool Aktif, Plan B, batas gabungan.

## 8. Hak dan perlindungan (Kode Etik, S&K)

- Masa pertimbangan 10 hari kerja; pengembalian 7 hari kerja; pembelian kembali Lisensi belum aktif (harga − admin ≤10% − komisi diterima) dalam 14 hari kerja.
- Komisi atas pembatalan ditarik kembali (`refundSale`).
- Pengaduan ditanggapi ≤3 hari kerja, diselesaikan ≤14 hari kerja; keberatan bonus ≤30 hari setelah pembayaran.
- Data yang terlihat upline: nama, peringkat, status aktif, volume. Telepon hanya untuk Sponsor langsung dengan persetujuan. NIK dan rekening tidak pernah ditampilkan ke Mitra PLS lain.

## 9. Larangan pokok (Kode Etik Pasal 18)

Janji penghasilan; klaim untung atau sinyal beli/jual; mengaku izin yang tidak dimiliki; mewajibkan pembelian atau menarik biaya; merekrut di bawah 18 tahun; akun fiktif; membeli atas nama orang lain untuk status/peringkat; lokapasar; potongan harga; rekening pribadi; menghimpun dana; manipulasi jaringan; pesan massal tanpa izin; memakai merek di luar pedoman.
