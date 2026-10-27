# Rancangan Sistem Mitrans-Astra Mitra PLS

Status: **prototipe**. Yang ada di repositori ini adalah engine komisi yang teruji, antarmuka web yang berjalan di peramban dengan data sintetis, dan rancangan untuk tahap produksi. Belum ada backend, basis data, autentikasi, pembayaran, maupun data nyata.

## 1. Yang sudah dibangun

| Bagian | Lokasi | Status |
|---|---|---|
| Engine komisi/PV (Plan A + Plan B, plafon, masa tunggu, konversi, pembatalan) | `src/engine/` | Teruji 54 uji unit/integrasi |
| Simulasi jaringan buatan (cermin Bab 12.3) | `src/engine/simulation.ts`, `scripts/simulate.ts` | Hasil di `docs/HASIL_SIMULASI.md` |
| Halaman depan | `/` | Selesai (prototipe) |
| Ringkasan aturan (dibangun dari konstanta engine) | `/aturan` | Selesai |
| Pendaftaran Mitra PLS + kuis Kode Etik | `/daftar` | Selesai (data hanya di memori peramban) |
| Kantor Maya Mitra PLS | `/mitra` | Selesai (data sintetis) |
| Dasbor admin | `/admin` | Selesai (data sintetis, tanpa otorisasi) |
| Hak akses per peran, pemisahan tugas, maker-checker, log audit | `src/engine/access.ts`, `/admin` (Masuk sebagai, Pengguna & peran, Log audit) | Teruji (prototipe) |
| Pemberitahuan tertulis dan tata cara sanksi | `src/engine/sanctions.ts`, `/admin` tab Kasus & sanksi, Kantor Maya tab Pemberitahuan | Teruji (prototipe) |
| Deteksi akun yang dikendalikan sendiri + alur pemeriksaan | `src/engine/fraud.ts`, `/admin` tab Akun terkendali | Teruji (prototipe) |

## 2. Arsitektur engine

Engine adalah **mesin peristiwa berurutan waktu** yang murni TypeScript, tanpa I/O. Ia dapat dipindah apa adanya ke backend.

```
Peristiwa (berurutan)                Akhir hari (otomatis)          Tutup bulan (otomatis, tgl 1 00.00 WIB)
---------------------                ---------------------          ----------------------------------------
registerMitra / registerPelanggan    pairDay per node tersentuh     1. Berkah: jatuh tempo / hangus 60 hari
passQuiz                             + sisa unit yang masih         2. Sponsor & bonus tim: bayar / tahan
purchaseLicense ──► volume 10 level    bisa dipasangkan             3. Lepas / hanguskan tahanan 2 bulan
convertCustomer      Bonus Level     Bonus Pasangan (≤20/hari)      4. Plafon Plan A → anggaran tim → faktor
paySubscription ──► PV RO 10 level   Bonus Pembinaan 6 generasi     5. Antrean Prestasi (dana 2%, cadangan >6 bln)
confirmOrientation                                                  6. Royalti (pembagian rata + batas)
confirmCoaching                                                     7. Batas Rp1 miliar per NIK
refundSale ──► penarikan                                            8. Pool Aktif (di dalam plafon)
                                                                    9. Plan B + plafon 40%
                                                                   10. Laporan bulan (MonthReport)
```

Prinsip implementasi:

- **Uang dalam Rupiah bulat**, PV dalam persepuluh (3,5 PV = 35), persentase dalam basis poin. Tidak ada bilangan pecahan untuk uang.
- **Buku besar (ledger) append-only**: setiap komisi adalah entri dengan status `pending → held/payable/forfeited/ineligible/company/clawback`. Penarikan dibuat sebagai entri negatif, bukan menghapus entri.
- **Idempoten per upline**: setiap Lisensi dihitung paling banyak sekali oleh setiap upline (`countedBy`). Inilah yang membuat konversi 5.5 tidak menghitung ganda.
- **Waktu WIB**: tanggal, bulan, dan batas Jumat 07.00 WIB (= Jumat 00.00 UTC) dihitung di `time.ts`.
- **Parameter terpusat** di `plan.ts`. Halaman `/aturan` membaca konstanta yang sama.

## 3. Keputusan aturan yang tidak diatur dokumen

Seluruh butir A1–A13 **diputuskan Coach pada 27 Oktober 2026**. Butir yang mengubah isi Rencana Pemasaran (terutama A1, A4, A10, A12) perlu dicantumkan di dokumen dan dikonfirmasi konsultan hukum sebelum diajukan.

| # | Hal | Keputusan | Kode |
|---|---|---|---|
| A1 | Penempatan posisi baru di jaringan biner | Kaki Sponsor yang Lisensinya lebih sedikit, di ujung terluar kaki itu | `options.placement = 'weaker-leg'` |
| A2 | Sponsor tanpa Lisensi mensponsori Mitra PLS yang membeli Lisensi | Posisi baru di bawah posisi terdekat pada garis Sponsor (aturan A1 tetap berlaku) | `volumeNodeFor` |
| A3 | Volume Lisensi Pelanggan dari penjual tanpa posisi | Dicatat di posisi terdekat pada garis Sponsor penjual | `volumeNodeFor` |
| A4 | Bonus Sponsor/Berkah pemegang Lisensi bulan ke-4+ tanpa Langganan | **Selalu dibayar.** Syarat Langganan hanya untuk bonus jaringan (saran Catatan Hukum butir 4). Teks Bab 9.2 perlu diubah | `closeMonth` langkah 1–2 |
| A5 | "Langganan sendiri aktif" untuk Plan B pada bulan 1–3 | Masa akses Lisensi dianggap aktif | `options.planBRequiresPaidSubscription = false` |
| A6 | Konversi: upline di antara posisi baru dan Sponsor | Ikut menghitung (setiap Lisensi dihitung sekali per upline) | `countedBy` |
| A7 | Generasi Pembinaan melewati Mitra PLS tanpa Lisensi | Tanpa kompresi: bagian generasi itu tidak dibayarkan | `accruePembinaan` |
| A8 | Klaim Prestasi yang tidak muat di dana bulan ini | Urutan ketat | `closeMonth` langkah 5 |
| A9 | Kelebihan plafon Plan B, batas per identitas Plan B, sisa Royalti RO | Tetap pada Perusahaan | `closeMonth` langkah 9 |
| A10 | Faktor plafon vs pembayaran Jumat | **Uang muka 80% setiap Jumat**, 20% ditahan sampai tutup bulan lalu dibayar sesuai faktor. Bila faktor < 80%, kelebihan uang muka dipotong dari pembayaran berikutnya | `PLAN.teamWeeklyAdvanceBp`, `advance`/`advanceDate` |
| A11 | Pool Aktif melebihi ruang plafon Plan A | Dibawa ke bulan berikutnya | `poolCarry` |
| A12 | Pembatalan setelah unit dipasangkan | **Tarik otomatis** Bonus Sponsor, Berkah, Level, Pasangan, dan Pembinaan dari Lisensi itu; unit pasangannya kembali menjadi sisa. Bila belum dibayar, entri dikurangi; bila sudah, dibuat entri penarikan negatif | `refundSale`, `reverseTeam` |
| A13 | Syarat aktif (Bab 9.1) | **Paling sedikit 1 penjualan baru pribadi per bulan** (v1.2: 2), setelah perbandingan di `docs/VARIAN_AKTIF.md`. Perlu deteksi akun yang dikendalikan sendiri | `PLAN.activeMinPersonalSales`, `options.activeMinPersonalSales` |

## 4. Temuan dari pengujian yang perlu dibahas

1. **Batas atas biaya Langganan 38% (Bab 12.2) dihitung dari 20% PV**, padahal persentase lain dari omzet bersih. Rp70.000 / Rp359.459 = 19,47%, sehingga batas atas sebenarnya 37,47%. Tidak berbahaya, tetapi teks rumus perlu diselaraskan.
2. **Hasil simulasi engine berbeda dari angka uji internal Bab 12.3** (lihat `docs/HASIL_SIMULASI.md`). Penyebab utamanya: syarat aktif 2 penjualan per bulan membuat sebagian besar bonus tim **ditahan lalu hangus ke Pool Aktif**. Akibatnya:
   - Plan B dibayar jauh di bawah 26%, karena syarat "pernah aktif" tidak terpenuhi oleh sebagian besar Mitra PLS;
   - **Pool Aktif menjadi komponen Plan A terbesar setelah Bonus Sponsor**, dan dinikmati sedikit Mitra PLS yang aktif. Ini perlu dicermati dari sisi keadilan dan pengungkapan penghasilan.
   Angka ini bergantung pada asumsi perilaku simulasi. Sebelum dokumen diajukan, sebaiknya asumsi uji internal yang dipakai di Bab 12.3 ditulis lengkap agar dapat direproduksi.
3. Pada fase penjualan turun, Pool Aktif dari bonus hangus menekan Plan A sampai plafon 50%. Bila plafon diturunkan ke 40% (catatan hukum butir 1), Pool Aktif akan lebih sering dibawa ke bulan berikutnya.

## 5. Rancangan produksi (usulan, belum dibangun)

### 5.1 Komponen

| Komponen | Usulan | Alasan |
|---|---|---|
| Backend API | Node.js (TypeScript) + Fastify/NestJS | Engine yang sama dipakai tanpa terjemahan |
| Basis data | PostgreSQL | Transaksi ACID untuk buku besar komisi |
| Antrean pekerjaan | Penjadwal untuk akhir hari, Jumat 07.00 WIB, dan tutup bulan | Proses berkala yang dapat diulang |
| Pembayaran | Payment gateway berizin BI, rekening resmi Perusahaan | S&K Pasal 5 |
| Verifikasi identitas | Penyedia e-KYC berizin | Satu NIK satu akun, usia ≥18 |
| Domain | `mitrans.id` (akun, kantor maya), `affiliatemarketing.network` (tautan rujukan, halaman penawaran) | Rencana Pemasaran Bab 2 |

### 5.2 Model data inti

```
accounts(id, code, role, nik_hash, nik_encrypted, name, sponsor_id, joined_at, mitra_since,
         quiz_passed_at, license_activated_at, terminated_at, membership_expires_at)
binary_nodes(id, account_id, parent_id, side, depth, created_at)
node_volume(node_id, cum_l, cum_r, carry_l, carry_r, level_mask_l, level_mask_r, level_paid_mask)
sales(id, kind, buyer_id, seller_id, paid_at, month, to_customer, for_month,
      orientation_confirmed_at, converted_at, cancelled_at, payment_ref)
sale_counted_by(sale_id, node_id)                 -- idempotensi volume per upline
ledger_entries(id, account_id, nik_hash, type, gross, amount, status, month, accrued_at,
               settled_month, payout_date, sale_id, ref, hold_until, note)   -- append-only
month_closes(month, report_json, closed_at, closed_by, engine_version, plan_version)
payout_batches(friday, status, file_hash, maker_id, checker_id, sent_at)
coaching_activities(id, account_id, month, kind, confirmed_by, confirmed_at, rating)
rank_claims(account_id, rank, amount, claim_month, paid_month, from_reserve)
audit_log(id, actor_id, action, entity, before_json, after_json, at)
```

NIK disimpan terenkripsi dan di-hash untuk pencarian keunikan (UU 27/2022). Rekening bank terenkripsi dan hanya dapat dibaca peran keuangan.

### 5.3 Pengendalian

- **Tutup bulan dapat diulang (deterministik)**: hasil disimpan bersama versi engine dan versi Rencana Pemasaran. Perubahan Rencana Pemasaran berlaku ke depan (Bab 14 butir 5).
- **Maker-checker** untuk berkas transfer Jumat.
- **Peran**: Mitra PLS, Pelanggan, CS, Keuangan, Kepatuhan, Admin. NIK dan rekening tidak pernah tampil ke Mitra PLS lain.
- **Deteksi akun yang dikendalikan sendiri**: sudah dibangun dalam prototipe (lihat bagian 6). Pada produksi, hash sinyal memakai HMAC-SHA256 dengan kunci rahasia di server, dan sinyal perangkat berasal dari SDK sidik perangkat.
- **Pengungkapan penghasilan tahunan** dari `ledger_entries` (median, sebaran, porsi tanpa bonus), seperti tabel di `HASIL_SIMULASI.md`.

### 5.4 Urutan kerja yang disarankan

1. Keputusan konsultan hukum atas butir 1–9 Catatan Hukum, dan pencantuman keputusan A1–A12 ke Rencana Pemasaran.
2. Backend + PostgreSQL + autentikasi, memindahkan engine ke server.
3. Integrasi e-KYC dan payment gateway di **staging**.
4. Uji paralel: tutup bulan dihitung engine dan dicek manual oleh Keuangan selama minimal 2 siklus.
5. Produksi hanya setelah izin SIUPL terbit dan dokumen diverifikasi asosiasi.

## 6. Deteksi akun yang dikendalikan sendiri

Dasar: Rencana Pemasaran 9.1 (pembelian oleh akun yang dikendalikan sendiri tidak dihitung), Kode Etik Pasal 9 angka 2 (tunda bayar ≤30 hari), Pasal 18 angka 9, 12, 17, dan Pasal 21 (tata cara sanksi). Menjadi wajib setelah keputusan A13 (aktif = 1 penjualan).

**Sinyal dan bobot.** Dua akun dibandingkan pada sinyal yang sama; skor = 1 − Π(1 − bobot).

| Sinyal | Bobot | Catatan |
|---|---:|---|
| Rekening bank / sumber pembayaran | 95% | Rekening penerima bonus dan rekening pembayar dibandingkan silang |
| Nomor telepon | 90% | Dinormalisasi (0812… = +62812…) |
| Surel | 85% | |
| Perangkat | 60% | |
| Alamat | 30% | Tidak pernah cukup sendirian: keluarga serumah wajar |
| Alamat IP | 20% | Tidak pernah cukup sendirian |

**Tingkat.** Skor ≥85% = **kuat**: pemeriksaan dibuka. 50–85% = **sedang**: dipantau, tanpa tunda bayar. Alamat + IP saja = 44%, tidak ditandai.

**Alur pemeriksaan di engine.**

| Langkah | Akibat |
|---|---|
| `openReview` | Bonus Sponsor dan Berkah penjualan itu ditahan saat tutup bulan. Penjualan **tetap dihitung** untuk status aktif selama diperiksa (praduga tak bersalah) |
| `dismissReview` | Bonus yang ditahan dibayar pada tutup bulan berikutnya |
| Lewat 30 hari tanpa keputusan | Bonus otomatis dibayar (Kode Etik Pasal 9 angka 2) |
| `confirmControlled` | Penjualan tidak dihitung; Bonus Sponsor, Berkah, Level, Pasangan, Pembinaan, dan volumenya ditarik. Bila status aktif penjual pada bulan itu hanya karena penjualan ini, bonus tim, Pool Aktif, Royalti, dan Prestasi yang ditetapkan bulan itu ikut ditarik |

**Privasi.** Hanya hash yang disimpan; layar admin menampilkan jenis sinyal (mis. "Rekening bank sama"), bukan nilainya.

**Hasil uji pada data demo sintetis** (`tests/fraud.test.ts`): semua pembelian oleh akun terkendali tertangkap sebagai kuat, dan tidak ada keluarga serumah yang ditandai kuat. Data nyata akan lebih bising; ambang perlu dievaluasi ulang setelah 3 bulan operasi dengan sampel yang diperiksa manual.

**Belum dibangun:** sidik perangkat nyata dan pola waktu (mis. beli–batal berulang di sekitar tutup bulan). Pemberitahuan tertulis dan tata cara sanksi ada di bagian 7.

## 7. Pemberitahuan tertulis dan tata cara sanksi

Dasar: Kode Etik Pasal 7, 9 angka 2, 15, 18, 20, 21, 22.

| Langkah | Aturan | Surat |
|---|---|---|
| 1. Kasus dibuka | Wajib menyebut dugaan Pasal 18 dan bukti (Ps. 21.1). Penjualan terkait ditunda bayar ≤30 hari (Ps. 9.2) | Surat Pemberitahuan Dugaan Pelanggaran (`PDP`); Pemberitahuan Penundaan Pembayaran (`PTB`) |
| 2. Penjelasan | Mitra PLS mengirim lewat Kantor Maya paling lama 14 hari (Ps. 21.2); setelah itu admin dapat mencatat "tanpa penjelasan" | – |
| 3. Keputusan | Paling lambat 14 hari setelah penjelasan, beralasan tertulis (Ps. 21.3); keterlambatan ditandai | Surat Keputusan (`KEP`) |
| 4. Keberatan | Sekali, ≤14 hari setelah keputusan; diperiksa pejabat yang bukan pembuka kasus dan bukan pemutus pertama (Ps. 21.4) | Surat Keputusan atas Keberatan (`KKB`) |
| 5. Final | Keberatan diputus, atau masa keberatan lewat (`tick`) | – |

Nomor surat: `001/KEP-PLS/XI/2026` (urut per jenis per tahun). Surat dikirim ke Kantor Maya dan surel terdaftar; waktu dibaca tercatat saat Mitra PLS membuka halaman Pemberitahuan. Setiap langkah tercatat di jejak kasus.

**Sanksi (Ps. 20) dan akibatnya di engine.**

| Sanksi | Akibat | Kapan berlaku |
|---|---|---|
| Teguran tertulis | Tercatat | Saat keputusan |
| Penarikan | `confirmControlled` untuk penjualan terkait: komisi, volume, dan bila perlu status aktif bulan itu ditarik | Saat keputusan |
| Pembekuan ≤3 bulan | Tautan rujukan tidak dapat dipakai; komisi yang sudah menjadi hak tetap dihitung | Saat keputusan |
| Pemutusan | Keanggotaan berakhir; komisi yang sudah menjadi hak tetap dibayar (Ps. 7); hak pembelian kembali (Ps. 15) | **Setelah final**, agar hak keberatan bermakna |

Pemutusan langsung hanya untuk pelanggaran berat Pasal 18 angka 1, 2, 4, 9, 12, 15, 16, atau setelah 2 sanksi final sebelumnya. Bila keberatan mencabut pembekuan atau pemutusan, engine memulihkannya otomatis. Bila keberatan mencabut **penarikan**, pembayaran koreksi dicatat sebagai tindak lanjut manual untuk Keuangan.

**Perlu dikonfirmasi konsultan hukum:** (a) penundaan berlaku pemutusan sampai final, sementara sanksi lain langsung berlaku; (b) ambang eskalasi 2 sanksi final; (c) surat elektronik melalui Kantor Maya dan surel cukup sebagai "pemberitahuan tertulis".

**Belum dibangun:** pengiriman surel sungguhan, lampiran bukti berkas, dan tanda tangan elektronik pejabat. Hak akses per peran ada di bagian 8.

## 8. Hak akses per peran

Satu sumber aturan: `ROLE_PERMISSIONS` di `src/engine/access.ts`. Menu admin hanya menampilkan tab yang diizinkan, dan setiap tindakan diperiksa lagi saat dijalankan (`require`), sehingga tombol yang disembunyikan tidak menjadi satu-satunya pengaman.

| Peran | Izin pokok | Tidak boleh |
|---|---|---|
| Admin Sistem | Kelola pengguna dan peran, log audit, simulasi | Memutus kasus, menyiapkan atau menyetujui pembayaran, melihat NIK |
| Kepatuhan | Deteksi akun terkendali, buka kasus, catat penjelasan, NIK tersamar | Memutus sanksi, memeriksa keberatan |
| Direksi | Putus sanksi; lihat keuangan, dana, kepatuhan | Memeriksa keberatan, melihat NIK |
| Pemeriksa Keberatan | Putus keberatan, lihat kasus | Membuka kasus, memutus sanksi pertama |
| Keuangan | Tutup bulan, siapkan dan setujui berkas transfer, NIK tersamar | Kasus dan sanksi |
| Layanan Pelanggan | Lihat Mitra PLS dan kasus | Mengubah apa pun |

**Pemisahan tugas.** Ditolak oleh sistem dan dicatat sebagai percobaan yang ditolak:
- Direksi × Pemeriksa Keberatan (Kode Etik Pasal 21 angka 4), Kepatuhan × Pemeriksa Keberatan, Admin Sistem × Keuangan.
- Penyiap berkas transfer Jumat tidak boleh menyetujuinya sendiri (maker-checker); nilai berkas dikunci saat disiapkan.
- Tidak seorang pun dapat mengubah peran atau status dirinya sendiri.
- Nama pelaku di jejak kasus dan surat diambil dari pengguna yang masuk, bukan diketik.

**Data pribadi (UU 27/2022).** NIK hanya untuk Kepatuhan dan Keuangan, selalu tersamar (`3171********0012`), dan setiap penampilan dicatat. Nomor rekening tidak tampil di layar mana pun. Mitra PLS di Kantor Maya hanya melihat akunnya sendiri dan data jaringan menurut Syarat dan Ketentuan Pasal 23.

**Log audit** mencatat masuk, tindakan berizin, perubahan peran (sebelum → sesudah), penampilan NIK, dan semua percobaan yang ditolak.

**Belum dibangun (produksi):** autentikasi sungguhan (kata sandi + OTP/2FA, sesi kedaluwarsa), pemeriksaan izin di server API, log audit append-only di basis data, peninjauan hak akses berkala (mis. tiap 3 bulan), dan pemilihan "masuk sebagai" Mitra PLS di Kantor Maya yang dalam prototipe ini hanya untuk demo.
