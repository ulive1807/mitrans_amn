# Ringkasan Aturan Mitra PLS Mitrans-Astra (v2.0 draf)

Sumber: spesifikasi `docs/superpowers/specs/2026-10-29-rencana-kompensasi-v2-design.md` (v2.0 draf, 29 Oktober 2026) di atas Rencana Pemasaran v1.2, Kode Etik Mitra PLS v1.2, Syarat dan Ketentuan mitrans.id v1.2 (draf 27 Oktober 2026), dan Catatan untuk Konsultan Hukum v1.1.
Seluruh dokumen sumber masih **draf**: belum ditinjau konsultan hukum dan belum diverifikasi asosiasi penjualan langsung.

Kolom **Kode** menunjukkan tempat aturan dijalankan engine (`src/engine/`).

## 1. Produk

| Produk | Harga (termasuk PPN) | Omzet bersih | PV | Kode |
|---|---:|---:|---:|---|
| Lisensi Atlas (akses 3 bulan + Program Pendampingan 90 Hari dan 1 workshop tanpa biaya) | Rp7.500.000 | Rp6.756.757 | 67,5 | `PLAN.license` |
| Lisensi Atlas Family (3 kursi dewasa, akses 12 bulan; bonus per kursi) | Rp25.000.000 | Rp22.522.523 | 225 | `PLAN.family`, `purchaseFamily` |
| Atlas Membership (per bulan, mulai bulan ke-4) | Rp399.000 | Rp359.459 | 3,5 | `PLAN.subscription` |

- Family: ayah posisi utama di bawah penjual; anak di kaki kiri, ibu di kaki kanan ayah (disponsori ayah). Setiap kursi dewasa = hak usaha tersendiri. Penjual (Sponsor ayah): Bonus Sponsor Rp3.000.000 per paket + Fast Start Rp1.000.000 per kursi (90 hari pertama penjual); ayah tidak menerima Sponsor/Fast Start dari keluarganya; volume ibu dan anak dihitung untuk ayah. Membership wajib mulai bulan ke-13.
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

## 3. Plan A v2.0 — dari penjualan Lisensi

> **Headline:** Ajak 2 orang per bulan selama 2 bulan, dan bantu mereka melakukan hal yang sama.
> *Ajak = bantu mereka memiliki dan memakai Lisensi Mitrans-Astra. Bonus hanya timbul dari penjualan produk yang lunas, bukan dari pendaftaran.*

| Bonus | Nominal | Batas / syarat | Penerima | Kode |
|---|---|---|---|---|
| Sponsor | Rp750.000 per Lisensi dijual langsung | – | Penjual | `purchaseLicense` |
| Fast Start | Rp1.000.000 per Lisensi | Dijual dalam 90 hari pertama penjual; Lisensi pertama pembeli; dibayar Jumat setelah 7 hari kerja | Penjual | `purchaseLicense` |
| Pendamping | Rp100.000 sekali per Mitra binaan | Mitra binaan menjual Lisensi pertamanya dalam 90 hari pertamanya | Sponsor | `purchaseLicense` |
| Layanan Berkah | Rp50.000 per Lisensi kepada Pelanggan | Konfirmasi orientasi + 30 hari; tanpa konfirmasi 60 hari → Pool | Penjual | `closeMonth` langkah 1 |
| Pasangan | Rp150.000 per pasangan | 10 level; 20 pasangan/hari; sisa unit dibawa | Pemegang posisi | `pairDay`, `endOfDay` |
| Pembinaan | Gen 1–3: 25%, gen 4–6: 5% dari Bonus Pasangan | 6 generasi sponsor; paling banyak Rp500 jt per orang per bulan, kelebihan → Pool | Sponsor pemegang Lisensi | `accruePembinaan` |
| Prestasi Peringkat | 12 peringkat bulanan, Rp150.000 (Builder) sampai Rp50.000.000 (Royal Crown) | Setelah 3 bulan terverifikasi; dana 4,5%; antrean; >6 bulan → dana cadangan | Yang mencapai | `evaluateRanks`, `closeMonth` langkah 5 |
| Leadership | Dana 5%, dibagi menurut bobot (Director 1 … Royal Crown 8) | Mitra aktif yang memelihara peringkat; Rp100 jt/orang/bulan | Pemegang peringkat | `allocateWeightedWithCap` |
| Pool Aktif | Sebanding penjualan baru pribadi, paling banyak Rp500.000 per penjualan | Sumber hangus + pengisian sampai 55% omzet bersih Lisensi; sisa kembali ke perusahaan | Semua Mitra PLS aktif | `distributePool` |

Bonus Level dan Royalti Plan A v1.2 dihapus. Bonus Balik Modal yang sempat diusulkan juga dihapus (spesifikasi 14.3).

Peringkat bulanan (volume per kaki dalam 10 level, paket setara = omzet bersih Lisensi dan Langganan ÷ Rp6.756.757): lihat `PLAN.monthlyRanks` atau halaman `/aturan`. Syarat: transaksi pribadi, volume kiri:kanan, Mitra langsung aktif, 2 pemimpin yang disponsori langsung di kaki berbeda; pemeliharaan 70% (Builder–Manager) atau 80% (Director ke atas).

## 4. Plan B — dari Langganan

| Bonus | Nominal | Kode |
|---|---|---|
| Komisi Langganan | Rp70.000 per Langganan per bulan, kepada penjual Pelanggan atau Sponsor langsung Mitra PLS | `closeMonth` langkah 9 |
| Pasangan RO | 5% × PV Langganan kaki kecil × Rp100.000; 10 level; tanpa akumulasi | `roPairAmount` |
| Royalti RO | Dana 3% omzet bersih Langganan: tingkat 1 (100:100) 1,5%, tingkat 2 (400:400) 1,5%; Rp100 jt/orang | `allocateEqualWithCap` |

Syarat Plan B: Langganan sendiri aktif, pernah aktif, dan ≥1 kegiatan pembinaan terkonfirmasi bulan itu.

## 5. Status aktif dan masa tunggu

- **Aktif** = ≥1 penjualan baru pribadi dalam bulan kalender yang menyentuh 90 hari pertama; sesudahnya ≥2.
- Tidak dihitung: pembelian sendiri, akun yang dikendalikan sendiri, pembelian yang dibatalkan.
- Pasangan dan Pembinaan pada bulan tidak aktif **ditahan**; dibayar bila aktif dalam 2 bulan berikutnya; bila tidak, hangus ke Pool Aktif. Bonus yang ditahan dalam 90 hari pertama belum hangus sampai bulan hari ke-150.
- Mulai bulan ke-4 sejak aktivasi Lisensi, pemegang Lisensi wajib Langganan aktif untuk bonus langsung dan bonus tim.

## 6. Plafon dan batas

| Batas | Nilai | Kode |
|---|---|---|
| Plafon Plan A | 60% omzet bersih Lisensi per bulan (PP 29/2021 Pasal 49; Permendag 70/2019 masih 40%) | `options.planACapBp` |
| Pengisian Pool Aktif | Sampai 55% omzet bersih Lisensi, paling banyak Rp500.000 per penjualan; sisa tidak dibawa | `PLAN.poolTargetBp`, `PLAN.poolMaxPerSale` |
| Plafon Plan B | 50% omzet bersih Langganan per bulan | `options.planBCapBp` |
| Anggaran bonus tim | Plafon A − bonus langsung − dana peringkat 4,5% − dana leadership 5% | `closeMonth` langkah 4 |
| Faktor plafon | Semua klaim tim dikali faktor sama; sisanya dibayar lebih dulu bulan berikutnya | `teamCarry` |
| Batas atas per Lisensi | 57,97% (kepada Mitra baru), 57,23% (kepada Pelanggan) | `perLicenseUpperBounds` |
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
