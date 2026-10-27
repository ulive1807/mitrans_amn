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

## 3. Asumsi kerja (dokumen tidak mengatur; perlu keputusan Coach)

| # | Hal | Pilihan di engine | Cara mengubah |
|---|---|---|---|
| A1 | Penempatan posisi baru di jaringan biner | **Diputuskan Coach (27 Oktober 2026): kaki kecil, ujung luar.** Posisi baru masuk kaki Sponsor yang Lisensinya lebih sedikit, di ujung terluar kaki itu. Perlu dicantumkan di Rencana Pemasaran dan dikonfirmasi konsultan hukum | `options.placement = 'weaker-leg'` |
| A2 | Sponsor tanpa posisi (Mitra PLS tanpa Lisensi) mensponsori Mitra PLS yang membeli Lisensi | Posisi baru ditempatkan di bawah posisi terdekat pada garis Sponsor | `volumeNodeFor` |
| A3 | Volume Lisensi Pelanggan dari penjual tanpa posisi | Dicatat di posisi terdekat pada garis Sponsor penjual | `volumeNodeFor` |
| A4 | Bonus Sponsor/Berkah pemegang Lisensi bulan ke-4+ tanpa Langganan | Ditahan 2 bulan seperti bonus tim, lalu hangus ke Pool Aktif | `closeMonth` langkah 2–3 |
| A5 | "Langganan sendiri aktif" untuk Plan B pada bulan 1–3 | Masa akses Lisensi dianggap aktif | `options.planBRequiresPaidSubscription` |
| A6 | Konversi: upline di antara posisi baru dan Sponsor | Ikut menghitung (belum pernah menghitung Lisensi itu) | `countedBy` |
| A7 | Generasi Pembinaan melewati Mitra PLS tanpa Lisensi | Tanpa kompresi: bagian generasi itu tidak dibayarkan | `accruePembinaan` |
| A8 | Klaim Prestasi yang tidak muat di dana bulan ini | Urutan ketat: klaim berikutnya ikut menunggu walau nominalnya lebih kecil | `closeMonth` langkah 5 |
| A9 | Kelebihan batas Rp1 miliar dari Plan B, sisa Royalti RO, faktor Plan B | Tidak dibawa; tetap pada Perusahaan | `closeMonth` langkah 9 |
| A10 | Faktor plafon vs pembayaran Jumat | Faktor ditetapkan saat tutup bulan. Bila faktor < 100%, bonus tim dibayar pada Jumat tutup bulan, bukan mingguan | `closeMonth` langkah 4 |
| A11 | Pool Aktif melebihi ruang plafon Plan A | Sisanya dibawa ke bulan berikutnya | `poolCarry` |
| A12 | Pembatalan setelah unit dipasangkan | Volume dan saldo dikurangi; bonus pasangan yang sudah timbul ditandai untuk ditinjau admin | `refundSale().needsReview` |

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
- **Deteksi akun yang dikendalikan sendiri**: rekening, perangkat, alamat, atau nomor telepon yang sama → ditandai untuk ditinjau (Rencana Pemasaran 9.1).
- **Pengungkapan penghasilan tahunan** dari `ledger_entries` (median, sebaran, porsi tanpa bonus), seperti tabel di `HASIL_SIMULASI.md`.

### 5.4 Urutan kerja yang disarankan

1. Keputusan konsultan hukum atas butir 1–9 Catatan Hukum dan keputusan Coach atas asumsi A2–A12 (A1 sudah diputuskan).
2. Backend + PostgreSQL + autentikasi, memindahkan engine ke server.
3. Integrasi e-KYC dan payment gateway di **staging**.
4. Uji paralel: tutup bulan dihitung engine dan dicek manual oleh Keuangan selama minimal 2 siklus.
5. Produksi hanya setelah izin SIUPL terbit dan dokumen diverifikasi asosiasi.
