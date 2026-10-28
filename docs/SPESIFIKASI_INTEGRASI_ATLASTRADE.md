# Spesifikasi Integrasi atlastrade.io ↔ Sistem Mitra PLS

Versi 0.1 (draf) · 28 Oktober 2026 · PT Mitra Transformasi Inteligensi
Untuk: tim pengembang atlastrade.io. Acuan kode: `server/integration.ts`, `server/app.ts`, uji `tests/integration.test.ts`.

## 1. Gambaran

| Domain | Tugas |
|---|---|
| affiliatemarketing.network | Tautan rujukan Mitra PLS: `/r/KODE` → checkout atlastrade.io dengan tiket |
| atlastrade.io | Checkout, pembayaran, pembatalan, pengembalian dana, akses aplikasi |
| mitrans.id | Akun, Kantor Maya, dokumen resmi |

Ketiganya memakai **satu instance Clerk** (domain satelit), jadi `userId` Clerk sama di semua domain. Pengguna hanya mendaftar dan memasukkan OTP sekali. Kebanyakan pembeli Lisensi sudah punya akun sejak membeli e-book Mitra PLS, dan Sponsor-nya sudah terkunci saat itu; tiket rujukan tetap dipakai untuk pembeli yang datang langsung dari tautan `/r/KODE`.

**Alur:** prospek klik `affiliatemarketing.network/r/MTR-000123` → diarahkan (302) ke `https://www.atlastrade.io/checkout?t=<tiket>` → login Clerk, isi nama dan NIK sekali → bayar → atlastrade.io mengirim webhook ke sistem Mitra PLS → komisi dihitung.

## 2. Rahasia bersama

Dua rahasia **berbeda**, masing-masing minimal 32 karakter acak. Keduanya disimpan di pengelola rahasia server dan tidak boleh ada di kode peramban, repositori, log, atau chat.

| Nama | Dipakai untuk |
|---|---|
| `RUJUKAN_TICKET_SECRET` | atlastrade.io **memeriksa** tiket rujukan |
| `ATLAS_WEBHOOK_SECRET` | atlastrade.io **menandatangani** webhook |

Rahasia staging dan produksi berbeda. Rahasia diserahkan lewat pengelola rahasia, tidak lewat surel atau WhatsApp.

## 3. Tiket rujukan (masuk lewat `?t=`)

Format: `<isi>.<tanda tangan>`, keduanya base64url tanpa padding.

- `isi` = base64url(JSON) dengan kolom `sponsor` (kode Mitra PLS), `nonce` (UUID), `iat` dan `exp` (milidetik epoch; berlaku 72 jam).
- `tanda tangan` = base64url(HMAC-SHA256(`RUJUKAN_TICKET_SECRET`, `isi` sebagai teks)).

Yang wajib dilakukan checkout:

1. Ambil `t` dari URL dan simpan di sesi atau pesanan **sebelum** pengguna diarahkan ke login Clerk.
2. Periksa tanda tangan (bandingkan waktu-konstan) dan `exp`. Bila tidak sah atau kedaluwarsa, **checkout tetap jalan** tanpa tiket; sistem Mitra PLS mencatatnya sebagai penjualan langsung Perusahaan.
3. Bila sah, simpan tiket **utuh** bersama pesanan, lalu kirim kembali di webhook `license.activated`. Jangan mengubah atau membuat tiket sendiri.
4. Pembeli tidak diminta memasukkan kode rujukan.

Contoh pemeriksaan (Node.js):

```js
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyTicket(ticket, secret, now = Date.now()) {
  const m = /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(ticket ?? "");
  if (!m) return null;
  const expected = createHmac("sha256", secret).update(m[1]).digest();
  const given = Buffer.from(m[2], "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const p = JSON.parse(Buffer.from(m[1], "base64url").toString("utf8"));
  return now <= p.exp ? p : null; // { sponsor, nonce, iat, exp }
}
```

## 4. Webhook ke sistem Mitra PLS

`POST https://<server-mitra-pls>/api/integrasi/atlastrade`

- `Content-Type: application/json`, isi paling besar 8 KB, hanya lewat HTTPS.
- `X-Atlas-Signature: t=<detik epoch>,v1=<hex HMAC-SHA256(ATLAS_WEBHOOK_SECRET, "<t>.<isi mentah>")>`
- Tanda tangan dihitung atas **byte isi yang persis dikirim**. Selisih `t` dengan jam server paling banyak 5 menit, jadi jam server harus disinkronkan (NTP).

```js
export function signWebhook(rawBody, secret, t = Math.floor(Date.now() / 1000)) {
  const v1 = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  return `t=${t},v1=${v1}`;
}
```

Amplop: `{ "id": "<nomor peristiwa unik>", "type": "...", "data": { ... } }`. Waktu dalam milidetik epoch.

| `type` | `data` | Kapan dikirim |
|---|---|---|
| `license.activated` | `saleId`, `userId`, `name`, `nik` (16 digit), `ticket` (bila ada), `paidAt` | Pembayaran Lisensi **lunas** |
| `subscription.paid` | `saleId`, `userId`, `paidAt` | Pembayaran Langganan Rp399.000 lunas |
| `sale.refunded` | `saleId`, `refundedAt` | Pembatalan atau pengembalian dana Lisensi atau Langganan **disetujui** |

Aturan isi:

- `saleId` = nomor pesanan atlastrade.io, tetap dan unik (paling panjang 128 karakter).
- `id` peristiwa unik per peristiwa dan **sama pada setiap pengiriman ulang**.
- `userId` = ID pengguna Clerk.
- `name` dan `nik` selalu dikirim pada `license.activated`. Keduanya wajib bila pengguna belum dikenal sistem Mitra PLS.
- `paidAt` = waktu dana diterima, bukan waktu pesanan dibuat.
- Kirim `license.activated` **sebelum** `subscription.paid` untuk pengguna yang sama.
- NIK tidak boleh muncul di log atau di URL.

## 5. Jawaban server dan pengiriman ulang

| Kode | Arti | Tindakan atlastrade.io |
|---|---|---|
| 200 | Diproses. Bila `"duplikat": true`, peristiwa ini sudah pernah diterima | Selesai |
| 400 | Format salah | Perbaiki; jangan kirim ulang apa adanya |
| 401 | Tanda tangan salah, isi berubah, atau jam berselisih > 5 menit | Periksa rahasia, isi mentah, dan jam |
| 409 | Bertentangan dengan data (mis. `saleId` sudah dipakai, pengguna belum dikenal, penjualan tidak dikenal) | Masukkan antrean tinjauan manual |
| 422 | Pengguna baru tanpa `name`/`nik` | Lengkapi data, kirim ulang dengan `id` yang sama |
| 5xx / jaringan | Gangguan sementara | Kirim ulang dengan jeda bertambah (mis. 1, 5, 30 menit, 2 jam), sampai 24 jam, lalu beri tanda peringatan |

Contoh jawaban 200 untuk `license.activated`:
`{"peristiwa":"evt_…","jenis":"license.activated","akun":"…","penjualan":"ATL-ORD-100045","penjual":"…","rujukan":"tiket"}`. Nilai `rujukan`: `ebook` (Sponsor terkunci sejak pembeli membeli e-book Mitra PLS; diutamakan di atas tiket), `tiket`, `akun` (pengguna lama; sponsor tidak berubah), atau `langsung` (bila tiket ditolak, alasannya ada di `tiketDitolak`).

## 6. Contoh uji (vektor tetap)

Rahasia contoh di bawah **hanya untuk uji**: `RUJUKAN_TICKET_SECRET = contoh-rahasia-tiket-JANGAN-DIPAKAI-0001`, `ATLAS_WEBHOOK_SECRET = contoh-rahasia-webhook-JANGAN-DIPAKAI-01`. Semua data pribadi di contoh ini sintetis.

Tiket (sponsor `MTR-000123`, terbit 2 Nov 2026 03.00 UTC, berlaku 72 jam):

```
eyJzcG9uc29yIjoiTVRSLTAwMDEyMyIsIm5vbmNlIjoiN2YwYzJkNGUtNWIxYS00YzNlLTlkOGYtMGExYjJjM2Q0ZTVmIiwiaWF0IjoxNzkzNTg4NDAwMDAwLCJleHAiOjE3OTM4NDc2MDAwMDB9.ktueXfl5oOg7eCpz3DyiJvPLpB5Owpv8V54BK7_ox-4
```

Isi webhook (satu baris, persis seperti ini):

```
{"id":"evt_01JAB0001","type":"license.activated","data":{"saleId":"ATL-ORD-100045","userId":"user_2abcDEFghiJKL","name":"Siti Contoh","nik":"3201010101900001","ticket":"eyJzcG9uc29yIjoiTVRSLTAwMDEyMyIsIm5vbmNlIjoiN2YwYzJkNGUtNWIxYS00YzNlLTlkOGYtMGExYjJjM2Q0ZTVmIiwiaWF0IjoxNzkzNTg4NDAwMDAwLCJleHAiOjE3OTM4NDc2MDAwMDB9.ktueXfl5oOg7eCpz3DyiJvPLpB5Owpv8V54BK7_ox-4","paidAt":1793589165000}}
```

Header untuk `t = 1793589200`:

```
X-Atlas-Signature: t=1793589200,v1=874b4e4e65eacb24fb1d5f5a1a8203a5d09cd4c80fef0bc1b0782c9e7e7a3e5f
```

Implementasi atlastrade.io dianggap benar bila menghasilkan tanda tangan yang sama persis untuk isi dan `t` di atas, dan `verifyTicket` mengembalikan `sponsor: "MTR-000123"` pada waktu sebelum `exp`. Vektor ini diuji otomatis di `tests/integration-spec.test.ts`.

## 7. Daftar uji bersama di staging

1. Tautan rujukan yang sah → checkout menerima tiket → bayar → jawaban `rujukan: "tiket"`, dan Bonus Sponsor tampil di Kantor Maya Mitra PLS.
2. Tiket diubah satu huruf → checkout tetap jalan → jawaban `rujukan: "langsung"`, `tiketDitolak: "tanda-tangan"`.
3. Tiket berumur lebih dari 72 jam → `tiketDitolak: "kedaluwarsa"`.
4. Peristiwa yang sama dikirim dua kali → kiriman kedua `duplikat: true`, bonus tidak ganda.
5. Rahasia salah, isi diubah, atau jam bergeser lebih dari 5 menit → 401.
6. Mitra PLS yang sudah terdaftar membeli Lisensi → `rujukan: "akun"`, sponsor tidak berubah.
7. `subscription.paid` → akses bertambah 30 hari.
8. `sale.refunded` dalam masa pembatalan → bonus ditarik dan tampil di Kantor Maya.
9. Server Mitra PLS dimatikan sementara → atlastrade.io mengirim ulang dan berhasil setelah server hidup.

## 8. Belum diputuskan atau belum dibangun

- Alamat server Mitra PLS untuk staging dan produksi.
- Pengaturan domain satelit di dasbor Clerk, yang dikerjakan pemilik akun Clerk.
- Rotasi rahasia: dua rahasia berlaku bersamaan selama masa pergantian.
- Penyimpanan permanen di sisi Mitra PLS. Prototipe masih menyimpan tautan pengguna dan peristiwa yang sudah diproses di memori.
- Pengembalian dana sebagian dan pembatasan nilai `paidAt` (tidak di masa depan dan tidak sebelum tutup bulan).
