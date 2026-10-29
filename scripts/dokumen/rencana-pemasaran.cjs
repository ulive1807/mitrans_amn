/**
 * Draf Rencana Pemasaran Mitrans-Astra v2.0 (Word).
 * Angka mengikuti src/engine/plan.ts (versi 2.0-draf) dan hasil `npm run audit`.
 * Jalankan: node scripts/dokumen/rencana-pemasaran.cjs
 */
const path = require("path");
const { write, OUT_DIR } = require("./lib.cjs");

const HEADLINE =
  "Ajak 2 orang per bulan selama 2 bulan, dan bantu mereka melakukan hal yang sama.";
const SUBTITLE =
  "Ajak = bantu mereka memiliki dan memakai Lisensi Mitrans-Astra. Bonus hanya timbul dari penjualan produk yang lunas, bukan dari pendaftaran.";
const DISCLAIMER =
  "Seluruh angka di bab ini adalah ilustrasi cara menghitung. Angka ini bukan janji, perkiraan, atau jaminan penghasilan. Penghasilan setiap Mitra PLS bergantung pada penjualan dan pembinaan yang ia lakukan sendiri. Dalam simulasi Perusahaan, lebih dari separuh Mitra PLS tidak menerima komisi atau bonus apa pun.";

const blocks = [
  ["h1n", "Catatan Penyusunan"],
  [
    "box",
    [
      [
        "p",
        "**Status dokumen: DRAF v2.0.** Sebelum diajukan, dokumen ini perlu:",
      ],
      [
        "ul",
        [
          "ditinjau konsultan hukum, terutama plafon 60% (Lampiran D);",
          "diverifikasi oleh asosiasi penjualan langsung (Permendag 70/2019 Pasal 8 ayat (3));",
          "dilengkapi data perusahaan yang ditandai [●];",
          "disetujui Direksi sebelum diberlakukan. Dokumen ini belum berlaku dan belum boleh dipakai untuk pemasaran.",
        ],
      ],
    ],
  ],
  ["p", "**Perubahan pokok dari versi 1.2 (27 Oktober 2026):**"],
  [
    "ol",
    [
      "Nama dagang produk: **Lisensi Atlas** (Lisensi Mitrans-Astra, akses 3 bulan) dan **Atlas Membership** (Langganan bulanan Rp399.000). Produk baru **Lisensi Atlas Family** Rp25.000.000 untuk 3 kursi dewasa dengan akses 12 bulan (Bab 3 dan bagian 5.6).",
      "Strategi membangun bisnis memakai satu kalimat panduan beserta subjudul wajibnya (bagian 4.2).",
      "**Program Pendampingan 90 Hari**: Bonus Fast Start Rp1.000.000 dan Bonus Pendamping Rp100.000; syarat aktif 1 penjualan per bulan selama 90 hari pertama; bonus yang ditahan dalam 90 hari pertama tidak hangus sebelum hari ke-150 (bagian 8.2 dan Bab 9).",
      "Bonus Level dan Royalti Plan A dihapus. Penggantinya 12 peringkat bulanan dengan dana 4,5% dan Bonus Leadership dengan dana 5% (bagian 8.4 dan 8.5).",
      "Bonus Pembinaan generasi 4–6 turun dari 10% menjadi 5%, dengan batas Rp500.000.000 per orang per bulan.",
      "Pool Aktif diisi sampai 55% omzet bersih Lisensi, paling banyak Rp500.000 per penjualan (bagian 8.6).",
      "Plafon Plan A 60% omzet bersih Lisensi (PP 29/2021 Pasal 49) dan Plan B 50%; Pasangan Langganan naik dari 3% menjadi 5% (Bab 12).",
      "Workshop pelatihan 2 hari tanpa biaya diberikan **sekali per Lisensi** (semula setiap bulan), ditambah kelas daring (Bab 7).",
      "Atlas Membership yang aktif menjadi syarat menerima bonus mulai bulan ke-4 sejak aktivasi Lisensi, atau bulan ke-13 untuk Lisensi Atlas Family (bagian 9.4).",
    ],
  ],
  ["p", "**Kesesuaian dengan Permendag 70/2019 Pasal 8 ayat (1):**"],
  [
    "table",
    ["Informasi yang diwajibkan", "Bab dalam dokumen ini"],
    [
      ["Profil perusahaan", "Bab 2"],
      ["Daftar barang beserta izin dan harga", "Bab 3"],
      ["Jenis program", "Bab 4"],
      ["Biaya pendaftaran", "Bab 5"],
      ["Isi paket perdana (starter kit)", "Bab 6"],
      ["Alur penjualan", "Bab 7"],
      ["Komisi dan bonus dalam Rupiah", "Bab 8"],
      ["Simulasi perhitungan komisi dan bonus", "Bab 10 dan Lampiran B"],
      ["Syarat memperoleh komisi dan bonus", "Bab 9"],
      ["Waktu pembayaran komisi dan bonus", "Bab 11"],
    ],
    [3, 2],
  ],
  [
    "p",
    "Lampiran: A. Daftar Istilah; B. Contoh Perhitungan Rinci; C. Ringkasan Alur Bonus; D. Catatan untuk Konsultan Hukum.",
  ],
  ["toc"],

  // Bab 1
  ["h1", "Bab 1. Pendahuluan dan Dasar Hukum"],
  ["h2", "1.1 Maksud dokumen"],
  [
    "p",
    "Rencana Pemasaran ini menjelaskan cara PT MITRANS memasarkan produk Mitrans-Astra melalui penjualan langsung dengan sistem jaringan, serta cara menghitung dan membayarkan komisi dan bonus kepada Mitra Marketing Penggerak Literasi Syariah, selanjutnya disebut Mitra PLS.",
  ],
  ["p", "Rencana Pemasaran ini merupakan satu kesatuan dengan:"],
  [
    "ul",
    [
      "Kode Etik Mitra PLS Mitrans-Astra versi 2.0;",
      "Syarat dan Ketentuan Penggunaan mitrans.id, termasuk Ketentuan Kemitraan sebagai perjanjian tertulis antara Perusahaan dan Mitra PLS.",
    ],
  ],
  ["h2", "1.2 Prinsip"],
  [
    "ol",
    [
      "**Penghasilan berasal dari penjualan nyata.** Komisi dan bonus hanya timbul dari penjualan Lisensi Atlas, Lisensi Atlas Family, dan Atlas Membership yang lunas. Tidak ada komisi atau bonus dari pendaftaran atau perekrutan.",
      "**Pendaftaran gratis.** Calon Mitra PLS tidak diwajibkan membeli barang apa pun saat mendaftar.",
      "**Jelas sejak awal.** Seluruh nominal, syarat, batas, dan waktu pembayaran tercantum dalam dokumen ini.",
      "**Adil bagi yang bekerja.** Bonus jaringan hanya dibayarkan kepada Mitra PLS yang aktif menjual pada bulan itu. Mitra PLS yang baru bergabung mendapat syarat aktif yang lebih ringan selama 90 hari pertama.",
      "**Bukan produk investasi.** Mitrans-Astra adalah alat bantu analisis dan edukasi. Platform tidak memberi sinyal beli atau jual, tidak mengelola dana, dan tidak menjanjikan hasil investasi.",
      "**Tanpa janji penghasilan.** Penghasilan setiap Mitra PLS bergantung pada penjualan dan pembinaan yang ia lakukan sendiri.",
    ],
  ],
  ["h2", "1.3 Dasar hukum dan pedoman"],
  [
    "ul",
    [
      "Undang-Undang Nomor 7 Tahun 2014 tentang Perdagangan.",
      "Peraturan Pemerintah Nomor 29 Tahun 2021 tentang Penyelenggaraan Bidang Perdagangan, sebagaimana diubah dengan Peraturan Pemerintah Nomor 3 Tahun 2026, termasuk Pasal 49 tentang batas komisi dan bonus.",
      "Peraturan Menteri Perdagangan Nomor 70 Tahun 2019 tentang Distribusi Barang Secara Langsung.",
      "Undang-Undang Nomor 8 Tahun 1999 tentang Perlindungan Konsumen.",
      "Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi.",
      "Fatwa DSN-MUI Nomor 75/DSN-MUI/VII/2009 tentang Pedoman Penjualan Langsung Berjenjang Syariah, sebagai pedoman nilai.",
    ],
  ],
  [
    "note",
    "Catatan: Permendag 70/2019 masih memuat batas 40%, sedangkan rancangan ini memakai batas 60% berdasarkan PP 29/2021 Pasal 49. Pilihan ini memerlukan opini konsultan hukum sebelum diajukan (Lampiran D butir 1).",
  ],

  // Bab 2
  ["h1", "Bab 2. Profil Perusahaan"],
  [
    "table",
    ["Keterangan", "Isi"],
    [
      ["Nama perusahaan", "PT MITRANS [nama lengkap sesuai akta ●]"],
      ["Bentuk badan usaha", "Perseroan Terbatas"],
      ["Akta pendirian dan perubahan terakhir", "[nomor, tanggal, notaris ●]"],
      ["Pengesahan Kementerian Hukum", "[nomor keputusan ●]"],
      ["Nomor Induk Berusaha (NIB)", "[●]"],
      [
        "KBLI",
        "[● sesuai klasifikasi yang ditetapkan untuk penjualan langsung]",
      ],
      ["NPWP", "[●]"],
      ["Alamat kantor", "[●]"],
      [
        "Situs resmi",
        "mitrans.id (dokumen resmi, akun, pendaftaran Mitra PLS, dan kantor maya)",
      ],
      [
        "Domain resmi untuk tautan rujukan",
        "affiliatemarketing.network (tautan rujukan Mitra PLS dan halaman penawaran)",
      ],
      ["Layanan pelanggan dan pengaduan", "[nomor telepon ●], [surel ●]"],
      ["Direksi", "[nama dan jabatan ●]"],
      ["Dewan Komisaris", "[nama dan jabatan ●]"],
      ["Dewan Pengawas Syariah (bila ada)", "[●]"],
      [
        "Keanggotaan asosiasi",
        "[nama asosiasi penjualan langsung dan nomor anggota ●]",
      ],
    ],
    [2, 3],
  ],
  [
    "p",
    "**Struktur awal jaringan.** Tiga posisi pertama dalam jaringan, yaitu Mitrans 001 (puncak), Mitrans 002 (kiri), dan Mitrans 003 (kanan), dipegang Perusahaan sebagai akun struktural.",
  ],
  [
    "ul",
    [
      "Akun ini bukan Penjual Langsung, tidak pernah berstatus aktif, dan tidak dihitung dalam syarat maupun peringkat.",
      "Komisi dan bonus yang jatuh pada posisi tersebut tidak dibayarkan kepada siapa pun, tidak dihitung dalam pengisian Pool Aktif, dan tetap menjadi pendapatan Perusahaan.",
    ],
  ],

  // Bab 3
  ["h1", "Bab 3. Produk dan Harga"],
  ["h2", "3.1 Produk"],
  [
    "p",
    "Perusahaan hanya memasarkan satu produk melalui jaringan penjualan langsung, yaitu lisensi penggunaan perangkat lunak Platform Analisa Transaksi Saham Syariah Mitrans-Astra, dalam tiga bentuk pembelian:",
  ],
  [
    "table",
    [
      "Produk",
      "Uraian",
      "Harga (termasuk PPN)",
      "Dasar pengenaan pajak",
      "PPN",
      "Nilai poin",
    ],
    [
      [
        "Lisensi Atlas",
        "Lisensi penggunaan perangkat lunak Mitrans-Astra untuk 1 orang, termasuk akses aplikasi 3 bulan",
        "Rp7.500.000",
        "Rp6.756.757",
        "Rp743.243",
        "67,5 PV",
      ],
      [
        "Lisensi Atlas Family",
        "Lisensi untuk 3 orang dewasa dalam satu keluarga (3 kursi), termasuk akses aplikasi 12 bulan untuk setiap kursi",
        "Rp25.000.000",
        "Rp22.522.523",
        "Rp2.477.477",
        "225 PV",
      ],
      [
        "Atlas Membership",
        "Perpanjangan akses bulanan: AI analisa dan alat duplikasi sistem, mulai bulan ke-4 (Family: bulan ke-13)",
        "Rp399.000 per bulan",
        "Rp359.459",
        "Rp39.541",
        "3,5 PV",
      ],
    ],
    [2, 4, 2, 2, 1.6, 1.2],
  ],
  ["p", "Ketentuan produk:"],
  [
    "ul",
    [
      "Harga sama untuk Mitra PLS dan Pelanggan, dan tercantum dalam Rupiah.",
      "Tidak ada opsi Atlas Membership tahunan. Atlas Membership tanpa Lisensi belum tersedia.",
      "Pembeli dapat berhenti berlangganan Atlas Membership kapan saja.",
      "Setiap kursi Lisensi Atlas Family hanya untuk orang berusia paling rendah 18 tahun dengan NIK sendiri. Paket ini tidak dapat dipakai untuk anak di bawah 18 tahun.",
      "1 PV setara Rp100.000 omzet bersih, dan hanya dipakai untuk menghitung komisi dan bonus.",
      'Perusahaan tidak memakai kata "seumur hidup" (lifetime) untuk produk apa pun.',
    ],
  ],
  ["h2", "3.2 Sifat produk dan layanan pendukung"],
  [
    "ul",
    [
      "Lisensi adalah hak menggunakan perangkat lunak, yaitu barang tidak berwujud. Lisensi dapat dialihkan kepada orang lain melalui aplikasi sesuai Syarat dan Ketentuan.",
      "Platform menyajikan data, alat analisis, dan materi edukasi pasar modal syariah.",
      "Platform tidak memberikan rekomendasi atau sinyal beli/jual efek, tidak melakukan transaksi otomatis, tidak mengelola dana, dan tidak menjanjikan keuntungan. Keputusan investasi sepenuhnya menjadi tanggung jawab pengguna.",
      "**Program Pendampingan 90 Hari** dan **1 workshop pelatihan 2 hari** diberikan tanpa biaya kepada setiap pemegang Lisensi. Keduanya bukan bagian dari harga Lisensi dan tidak dijual, karena jasa tidak dapat dipasarkan melalui penjualan langsung (PP 3/2026 Pasal 54 ayat (2)).",
    ],
  ],
  ["h2", "3.3 Izin, pendaftaran, dan hak distribusi"],
  [
    "table",
    ["Keterangan", "Isi"],
    [
      ["Tanda Daftar Penyelenggara Sistem Elektronik", "[nomor ●]"],
      [
        'Pendaftaran merek "Mitrans-Astra" dan "Atlas"',
        "[nomor permohonan atau sertifikat ●]",
      ],
      ["Hak cipta perangkat lunak", "[nomor pencatatan ●]"],
      [
        "Hak distribusi eksklusif",
        "[dasar: kepemilikan merek dan hak cipta, atau perjanjian distribusi eksklusif ●]",
      ],
    ],
    [2, 3],
  ],

  // Bab 4
  ["h1", "Bab 4. Jenis Program"],
  ["h2", "4.1 Struktur program"],
  [
    "p",
    "Program ini adalah penjualan langsung berjenjang (multi level) dengan jaringan biner. Setiap posisi memiliki dua kaki, kiri dan kanan. Program terdiri atas dua bagian:",
  ],
  [
    "table",
    ["Bagian", "Sumber omzet", "Isi"],
    [
      [
        "Plan A",
        "Penjualan Lisensi Atlas dan Lisensi Atlas Family",
        "Bonus Sponsor, Bonus Fast Start, Bonus Pendamping, Bonus Layanan Berkah, Bonus Pasangan, Bonus Pembinaan, Bonus Prestasi Peringkat, Bonus Leadership, Pool Aktif",
      ],
      [
        "Plan B",
        "Penjualan Atlas Membership",
        "Komisi Langganan, Pasangan Langganan (Pasangan RO), Royalti Langganan (Royalti RO)",
      ],
    ],
    [1, 2, 4],
  ],
  ["p", "Ciri pengaman program:"],
  [
    "ul",
    [
      "Volume jaringan untuk Bonus Pasangan, peringkat, dan Plan B hanya dihitung sampai 10 level di bawah setiap Mitra PLS.",
      "Ada plafon bulanan, batas per orang, syarat aktif bulanan, dan masa tunggu (Bab 9 dan Bab 12).",
      "Batas atas biaya bonus per Lisensi tetap di bawah plafon, sedalam apa pun jaringannya (bagian 12.2).",
    ],
  ],
  ["h2", "4.2 Strategi membangun bisnis"],
  ["p", "Perusahaan memakai satu kalimat panduan untuk membangun bisnis:"],
  [
    "box",
    [
      ["center", `**"${HEADLINE}"**`],
      ["center", `_${SUBTITLE}_`],
    ],
  ],
  [
    "ul",
    [
      "Kalimat panduan ini adalah **pola kerja**, bukan syarat bonus dan bukan janji penghasilan. Bonus tetap dihitung menurut Bab 8 dan Bab 9.",
      "Subjudul wajib selalu menyertai kalimat panduan di setiap materi, lisan maupun tertulis (Kode Etik Pasal 18).",
      "Dalam 90 hari pertama, Kantor Maya menampilkan kemajuan Mitra PLS terhadap pola ini: 4 penjualan pribadi dan 4 penjualan oleh Mitra PLS yang ia sponsori. Angka ini hanya penanda kemajuan.",
      "Mengajak berarti membantu orang lain memiliki dan memakai Lisensi dengan keputusan bebas, setelah memahami produk, harga, masa akses, Atlas Membership, dan hak pembatalan.",
    ],
  ],

  // Bab 5
  ["h1", "Bab 5. Keanggotaan dan Biaya Pendaftaran"],
  ["h2", "5.1 Biaya pendaftaran"],
  [
    "p",
    "Pendaftaran Mitra PLS tidak dipungut biaya (Rp0). Pendaftaran tidak mewajibkan pembelian Lisensi, Atlas Membership, atau barang lain.",
  ],
  ["h2", "5.2 Persyaratan Mitra PLS"],
  [
    "ol",
    [
      "Berusia paling rendah 18 tahun atau sudah cakap hukum.",
      "Memiliki KTP elektronik yang masih berlaku. Satu Nomor Induk Kependudukan (NIK) hanya untuk satu akun, baik Mitra PLS maupun Pelanggan. Sistem memeriksa bentuk NIK dan tanggal lahirnya, dan otomatis menolak NIK yang sudah terdaftar; keaslian NIK diverifikasi melalui layanan verifikasi identitas elektronik.",
      "Memiliki rekening bank atas nama sendiri untuk menerima komisi dan bonus.",
      "Membaca serta menyetujui Rencana Pemasaran, Kode Etik, dan Syarat dan Ketentuan secara elektronik.",
      "Tidak sedang menjalani sanksi pemutusan keanggotaan dari Perusahaan.",
    ],
  ],
  ["h2", "5.3 Masa pertimbangan"],
  [
    "p",
    "Setelah mendaftar, Mitra PLS memiliki masa pertimbangan 10 hari kerja. Dalam masa ini, Mitra PLS dapat membatalkan keanggotaannya. Bila ia membeli Lisensi dalam masa itu, ia berhak atas pengembalian dana sesuai Bab 13.",
  ],
  ["h2", "5.4 Mitra PLS dengan dan tanpa Lisensi"],
  [
    "table",
    ["", "Mitra PLS tanpa Lisensi", "Mitra PLS pemegang Lisensi"],
    [
      ["Boleh memasarkan Lisensi dan Atlas Membership", "Ya", "Ya"],
      ["Bonus Sponsor dan Bonus Layanan Berkah", "Ya", "Ya"],
      [
        "Program Pendampingan 90 Hari (Fast Start, Pendamping)",
        "Tidak",
        "Ya, dihitung sejak aktivasi Lisensi pertamanya",
      ],
      [
        "Posisi dalam jaringan biner (Pasangan, Pembinaan, Prestasi Peringkat, Leadership, Pool Aktif)",
        "Tidak",
        "Ya",
      ],
      ["Plan B", "Tidak", "Ya, bila Atlas Membership atau masa aksesnya aktif"],
    ],
    [3, 1.6, 2.4],
  ],
  [
    "p",
    "Posisi jaringan diberikan pada saat Mitra PLS mengaktifkan Lisensi pertamanya, karena volume jaringan dihitung dari Lisensi yang benar-benar terjual. Pelanggan yang kemudian mendaftar sebagai Mitra PLS dapat memperoleh posisi jaringan melalui konversi Lisensi (bagian 5.5).",
  ],
  ["h2", "5.5 Konversi Lisensi Pelanggan"],
  [
    "p",
    "Pelanggan yang mendaftar sebagai Mitra PLS paling lambat 60 hari sejak tanggal pembelian Lisensinya dapat mengonversi Lisensi itu menjadi Lisensi Mitra PLS tanpa pembelian baru.",
  ],
  [
    "table",
    ["Hal", "Ketentuan"],
    [
      [
        "Posisi jaringan",
        "Dibuat pada tanggal konversi, dengan Sponsor yang sama, yaitu Mitra PLS yang menjual Lisensi itu",
      ],
      [
        "Penjualan baru",
        "Lisensi itu tetap dihitung satu kali sebagai penjualan baru Sponsor, pada bulan pembeliannya",
      ],
      ["Bonus Sponsor dan Fast Start", "Tidak dibayar lagi"],
      [
        "Bonus Layanan Berkah",
        "Tetap dibayar kepada Sponsor bila syaratnya terpenuhi (bagian 9.2)",
      ],
      [
        "Volume jaringan",
        "Upline yang sudah menghitung Lisensi itu tidak menghitungnya lagi. Bagi Sponsor, Lisensi itu mulai dihitung di kakinya pada tanggal konversi",
      ],
    ],
    [1.3, 4],
  ],
  [
    "p",
    "Bila lewat 60 hari, Lisensi tetap tercatat sebagai Lisensi Pelanggan. Posisi jaringan diberikan saat Mitra PLS itu mengaktifkan Lisensi berikutnya.",
  ],
  ["h2", "5.6 Lisensi Atlas Family"],
  [
    "p",
    "Lisensi Atlas Family dibeli dengan satu pembayaran untuk 3 orang dewasa dalam satu keluarga. Setiap kursi adalah hak usaha tersendiri bila pemegangnya mendaftar sebagai Mitra PLS.",
  ],
  [
    "table",
    ["Hal", "Ketentuan"],
    [
      [
        "Pemegang kursi",
        '3 orang berusia paling rendah 18 tahun, masing-masing dengan NIK, verifikasi identitas, dan persetujuan sendiri. Penyebutan "ayah, ibu, dan anak" di bawah ini hanya contoh susunan keluarga',
      ],
      [
        "Posisi kursi utama (ayah)",
        "Disponsori oleh Mitra PLS yang menjual paket, dan ditempatkan seperti posisi biasa",
      ],
      [
        "Posisi kursi kedua dan ketiga",
        "Anak ditempatkan langsung di kaki kiri ayah dan ibu di kaki kanan ayah. Sponsor keduanya adalah ayah. Posisi ini dikunci saat pembelian sehingga tidak dapat terisi penempatan lain",
      ],
      [
        "Masa akses",
        "12 bulan untuk setiap kursi. Atlas Membership mulai bulan ke-13",
      ],
      [
        "Program Pendampingan 90 Hari",
        "Dimulai bagi setiap kursi pada tanggal aktivasi paket",
      ],
      [
        "Status, peringkat, dan batas",
        "Dihitung terpisah untuk setiap kursi (per NIK)",
      ],
      [
        "Pendaftaran kursi kedua dan ketiga",
        "Saat membeli paket, kursi utama mendaftarkan nama dan NIK anak serta istri. Sistem menolak NIK yang tidak sah, sudah terdaftar pada akun mana pun, dipakai dua kali, atau milik orang di bawah 18 tahun (menurut tanggal lahir pada NIK)",
      ],
      [
        "Verifikasi oleh anggota sendiri",
        "Kursi kedua dan ketiga baru aktif setelah anggota itu sendiri memverifikasi identitas dan menyetujui Rencana Pemasaran, Kode Etik, serta Syarat dan Ketentuan, paling lambat 30 hari sejak didaftarkan. Sebelum itu tidak ada volume, bonus, maupun tautan rujukan bagi kursi itu",
      ],
      [
        "Penggantian anggota",
        "Anggota yang belum memverifikasi dapat diganti oleh kursi utama dengan anggota keluarga dewasa lain; NIK lama dilepas dan anggota baru mendapat batas 30 hari",
      ],
      ["Bonus dari pembelian paket", "Lihat bagian 8.3"],
    ],
    [1.5, 4],
  ],

  // Bab 6
  ["h1", "Bab 6. Paket Perdana Digital"],
  [
    "p",
    "Setiap Mitra PLS menerima paket perdana digital tanpa biaya melalui akun mitrans.id, berisi:",
  ],
  [
    "ol",
    [
      "Rencana Pemasaran ini.",
      "Kode Etik Mitra PLS.",
      "Syarat dan Ketentuan, termasuk Ketentuan Kemitraan.",
      "Panduan produk dan cara penggunaan platform.",
      "Materi pelatihan dasar, daftar periksa orientasi pelanggan, dan pedoman komunikasi resmi (termasuk cara memakai kalimat panduan bagian 4.2).",
      "Akses Kantor Maya untuk memantau penjualan, jaringan, status aktif, kemajuan Program Pendampingan 90 Hari, dan bonus.",
      "Tautan rujukan pribadi di affiliatemarketing.network, yang aktif setelah Mitra PLS lulus kuis singkat tentang Kode Etik. Kuis tersedia di Kelas Kemitraan dan secara daring, tanpa biaya.",
    ],
  ],

  // Bab 7
  ["h1", "Bab 7. Alur Penjualan"],
  [
    "ol",
    [
      "**Penjelasan awal.** Sebelum mendaftarkan calon Mitra PLS, Perusahaan dan Mitra PLS memberikan keterangan lisan dan tertulis tentang identitas Perusahaan, produk, Rencana Pemasaran, dan Kode Etik. Halaman pendaftaran mitrans.id menampilkan seluruh dokumen ini sebelum persetujuan diberikan.",
      "**Pendaftaran** di mitrans.id, melalui tautan rujukan Mitra PLS di affiliatemarketing.network atau langsung, beserta verifikasi identitas.",
      "**Pembelian.** Lisensi Atlas, Lisensi Atlas Family, dan Atlas Membership dibeli melalui tautan rujukan Mitra PLS. Pembayaran dilakukan hanya ke rekening resmi Perusahaan, bukan ke rekening pribadi Mitra PLS.",
      "**Aktivasi.** Lisensi aktif setelah pembayaran diterima. Pembeli menerima bukti pembelian dan faktur. Untuk Lisensi Atlas Family, setiap pemegang kursi mengaktifkan akunnya sendiri.",
      "**Pendampingan orientasi.** Dalam 7 hari setelah pembelian, Mitra PLS yang menjual mendampingi pembeli: aktivasi akun, pengenalan fitur, dan etika penggunaan. Pembeli mengonfirmasi pendampingan ini di aplikasi.",
      "**Program Pendampingan 90 Hari dan workshop.** Setiap pemegang Lisensi berhak mengikuti 1 workshop pelatihan 2 hari tanpa biaya, serta kelas daring. Workshop berikutnya bersifat pilihan, daring tanpa biaya atau tatap muka dengan biaya yang diumumkan terpisah. Pada hari ke-2, peserta yang berminat menerima penjelasan lengkap tentang kemitraan (Kelas Kemitraan). Mendaftar sebagai Mitra PLS tetap pilihan bebas.",
      "**Atlas Membership.** Mulai bulan ke-4 (Lisensi Atlas Family: bulan ke-13), pembeli dapat melanjutkan akses dengan Atlas Membership atas persetujuannya sendiri dan dapat berhenti kapan saja. Bagi Mitra PLS, Atlas Membership yang aktif menjadi syarat menerima bonus sejak bulan itu (bagian 9.4), tetapi bukan syarat tetap menjadi Mitra PLS.",
    ],
  ],
  ["p", "Larangan saluran penjualan:"],
  [
    "ul",
    [
      "Perusahaan tidak menjual langsung kepada konsumen tanpa melalui Mitra PLS.",
      "Produk tidak dijual melalui saluran distribusi tidak langsung maupun lokapasar (online marketplace).",
    ],
  ],

  // Bab 8
  ["h1", "Bab 8. Komisi dan Bonus"],
  [
    "p",
    "Semua nominal dalam Rupiah. Persentase dihitung dari omzet bersih, yaitu harga setelah dikurangi PPN.",
  ],
  ["h2", "8.1 Plan A: dari penjualan Lisensi"],
  [
    "table",
    ["Komisi/Bonus", "Nominal", "Batas dan syarat pokok", "Penerima"],
    [
      [
        "Bonus Sponsor",
        "Rp750.000 per Lisensi Atlas yang dijual langsung; Rp3.000.000 per paket Lisensi Atlas Family",
        "Penjualan lunas",
        "Mitra PLS penjual",
      ],
      [
        "Bonus Fast Start",
        "Rp1.000.000 per Lisensi",
        "Dijual dalam 90 hari pertama penjual; Lisensi pertama pembeli; dibayar setelah 7 hari kerja",
        "Mitra PLS penjual pemegang Lisensi",
      ],
      [
        "Bonus Pendamping",
        "Rp100.000 sekali per Mitra PLS binaan",
        "Mitra PLS yang disponsori langsung membuat penjualan Fast Start pertamanya",
        "Sponsor Mitra PLS binaan",
      ],
      [
        "Bonus Layanan Berkah",
        "Rp50.000 per Lisensi yang dijual kepada Pelanggan",
        "Pendampingan dikonfirmasi Pelanggan dan lewat 30 hari",
        "Mitra PLS penjual",
      ],
      [
        "Bonus Pasangan",
        "Rp150.000 per pasangan (1 Lisensi di kaki kiri dan 1 di kaki kanan)",
        "Volume dari 10 level; paling banyak 20 pasangan per hari",
        "Mitra PLS pemegang posisi",
      ],
      [
        "Bonus Pembinaan",
        "Persentase Bonus Pasangan Mitra PLS yang disponsori: generasi 1–3 masing-masing 25%, generasi 4–6 masing-masing 5%",
        "6 generasi sponsor; paling banyak Rp500.000.000 per orang per bulan",
        "Mitra PLS sponsor pemegang Lisensi",
      ],
      [
        "Bonus Prestasi Peringkat",
        "Rp150.000 sampai Rp50.000.000 sekali per peringkat (bagian 8.4)",
        "Dana 4,5% omzet bersih Lisensi bulan itu",
        "Mitra PLS yang mencapai peringkat",
      ],
      [
        "Bonus Leadership",
        "Bagian dari dana 5% omzet bersih Lisensi bulan itu (bagian 8.5)",
        "Paling banyak Rp100.000.000 per orang per bulan",
        "Pemegang peringkat Director ke atas",
      ],
      [
        "Pool Aktif",
        "Bagian sebanding penjualan baru pribadi (bagian 8.6)",
        "Paling banyak Rp500.000 per penjualan",
        "Semua Mitra PLS aktif",
      ],
    ],
    [1.5, 2.6, 2.6, 1.6],
  ],
  ["p", "Penjelasan:"],
  [
    "ul",
    [
      "Lisensi Pelanggan dicatat pada posisi Mitra PLS penjual. Volumenya dihitung untuk upline Mitra PLS itu.",
      "Sisa unit pasangan yang belum berpasangan tetap tercatat untuk perhitungan berikutnya. Pasangan di atas 20 per hari yang terjadi dalam 90 hari pertama dibawa ke hari berikutnya.",
      "Generasi pembinaan: generasi 1 adalah Mitra PLS yang disponsori langsung, generasi 2 adalah Mitra PLS yang mereka sponsori, dan seterusnya.",
    ],
  ],
  ["h2", "8.2 Program Pendampingan 90 Hari"],
  [
    "p",
    '"90 hari pertama" dihitung sejak tanggal aktivasi Lisensi pertama Mitra PLS. Program ini membantu Mitra PLS baru memulai usaha dengan benar: memakai produk, mendampingi pembeli, dan membina timnya.',
  ],
  [
    "table",
    ["Ketentuan", "Isi"],
    [
      [
        "Bonus Fast Start",
        "Rp1.000.000 untuk setiap Lisensi yang dijual langsung dalam 90 hari pertama penjual, bila Lisensi itu adalah Lisensi pertama pembelinya. Untuk Lisensi Atlas Family, dihitung per kursi",
      ],
      [
        "Bonus Pendamping",
        "Rp100.000 kepada Sponsor, sekali untuk setiap Mitra PLS yang ia sponsori langsung, pada penjualan Fast Start pertama Mitra PLS itu",
      ],
      [
        "Syarat aktif",
        "Paling sedikit 1 penjualan baru pribadi pada bulan kalender yang menyentuh 90 hari pertama (bagian 9.1)",
      ],
      [
        "Masa tunggu",
        "Bonus tim yang ditahan dalam 90 hari pertama tidak hangus sebelum bulan hari ke-150 (bagian 9.3)",
      ],
      [
        "Tidak dihitung",
        "Pembelian sendiri, pembelian oleh akun yang dikendalikan sendiri, pembelian yang dibatalkan atau dikembalikan, dan Atlas Membership",
      ],
      [
        "Waktu bayar",
        "Fast Start dan Pendamping dibayar pada Jumat pertama setelah masa pengembalian 7 hari kerja berakhir",
      ],
    ],
    [1.5, 4],
  ],
  ["h2", "8.3 Bonus dari Lisensi Atlas Family"],
  [
    "table",
    ["Penerima", "Yang diterima", "Keterangan"],
    [
      [
        "Mitra PLS yang menjual paket (Sponsor kursi utama)",
        "Bonus Sponsor Rp3.000.000 per paket, ditambah Fast Start Rp1.000.000 per kursi bila dijual dalam 90 hari pertamanya (paling banyak Rp6.000.000 per paket)",
        "Bagian kursi utama timbul saat pembelian; bagian kursi kedua dan ketiga timbul saat kursi itu diverifikasi. Fast Start dinilai dari tanggal pembelian paket. Setiap kursi tercatat sebagai penjualan baru pribadinya",
      ],
      [
        "Pemegang kursi utama (ayah)",
        "Tidak menerima Bonus Sponsor, Fast Start, maupun Pendamping atas pembelian paket keluarganya",
        "Keluarga sudah memperoleh nilai hemat Rp8.273.000 (25%) dibanding membeli terpisah",
      ],
      [
        "Volume jaringan",
        "Kursi kedua (kaki kiri) dan ketiga (kaki kanan) dihitung sebagai volume kursi utama dan upline-nya seperti Lisensi biasa",
        "Kursi utama langsung memiliki 1 pasangan (Rp150.000), dibayar bila ia aktif (Bab 9)",
      ],
      [
        "Bonus lain",
        "Pasangan, Pembinaan, peringkat, Leadership, Pool Aktif, dan Plan B berlaku seperti Lisensi Atlas",
        "–",
      ],
    ],
    [1.8, 3, 2.4],
  ],
  [
    "note",
    "Nilai hemat Rp8.273.000 = biaya 3 Lisensi Atlas dan 9 bulan Atlas Membership untuk 3 orang (Rp33.273.000) dikurangi harga paket Rp25.000.000.",
  ],
  ["h2", "8.4 Peringkat dan Bonus Prestasi Peringkat"],
  [
    "p",
    "Peringkat dinilai setiap bulan. Volume kaki dihitung dalam **paket setara per bulan**, yaitu omzet bersih Lisensi dan Atlas Membership yang sah di kaki itu dalam 10 level, dibagi Rp6.756.757.",
  ],
  [
    "table",
    [
      "Peringkat",
      "Transaksi pribadi per bulan",
      "Paket setara kiri : kanan per bulan",
      "Mitra langsung aktif",
      "Syarat pemimpin",
      "Pemeliharaan per kaki",
      "Bonus Prestasi (sekali)",
      "Bobot Leadership",
    ],
    [
      ["Builder", "1", "2 : 2", "2", "–", "70%", "Rp150.000", "–"],
      ["Executive", "2", "5 : 5", "3", "2 Builder", "70%", "Rp300.000", "–"],
      ["Manager", "3", "12 : 12", "4", "2 Executive", "70%", "Rp600.000", "–"],
      ["Director", "4", "25 : 25", "5", "2 Manager", "80%", "Rp1.200.000", "1"],
      [
        "Senior Director",
        "5",
        "50 : 50",
        "6",
        "2 Director",
        "80%",
        "Rp2.400.000",
        "2",
      ],
      [
        "Emerald",
        "6",
        "100 : 100",
        "7",
        "2 Senior Director",
        "80%",
        "Rp4.000.000",
        "3",
      ],
      [
        "Diamond",
        "8",
        "200 : 200",
        "8",
        "2 Emerald",
        "80%",
        "Rp7.500.000",
        "4",
      ],
      [
        "Double Diamond",
        "10",
        "400 : 400",
        "9",
        "2 Diamond",
        "80%",
        "Rp12.500.000",
        "5",
      ],
      [
        "Crown Diamond",
        "12",
        "750 : 750",
        "10",
        "2 Double Diamond",
        "80%",
        "Rp20.000.000",
        "6",
      ],
      [
        "Ambassador",
        "15",
        "1.500 : 1.500",
        "12",
        "2 Crown Diamond",
        "80%",
        "Rp35.000.000",
        "7",
      ],
      [
        "Royal Crown",
        "20",
        "3.000 : 3.000",
        "15",
        "2 Ambassador",
        "80%",
        "Rp50.000.000",
        "8",
      ],
    ],
    [1.6, 1.1, 1.4, 1, 1.6, 1.1, 1.5, 1],
  ],
  ["p", "Ketentuan:"],
  [
    "ol",
    [
      "Transaksi pribadi adalah penjualan baru pribadi menurut bagian 9.1.",
      "Syarat pemimpin: 2 Mitra PLS yang disponsori langsung dengan peringkat yang disebut, satu berada di kaki kiri dan satu di kaki kanan.",
      "Peringkat tercapai bila seluruh syarat terpenuhi dalam satu bulan. Bonus Prestasi dibayar setelah peringkat itu **terverifikasi 3 bulan berturut-turut**, yaitu volume setiap kaki paling sedikit sama dengan persentase pemeliharaan dari syaratnya.",
      "Bonus Prestasi dibayar sekali per peringkat per identitas, dengan nominal utuh. Jumlahnya paling banyak Rp133.650.000 per orang sampai Royal Crown.",
      "Klaim dibayar dari dana peringkat 4,5% omzet bersih Lisensi bulan itu, menurut urutan klaim. Bila dana bulan itu tidak cukup, klaim menunggu dana bulan berikutnya. Klaim yang menunggu lebih dari 6 bulan dilunasi dari dana cadangan Perusahaan.",
      "Sisa dana peringkat bulan itu dimasukkan ke Pool Aktif.",
    ],
  ],
  ["h2", "8.5 Bonus Leadership"],
  [
    "ul",
    [
      "Dana Leadership adalah 5% omzet bersih Lisensi bulan itu.",
      "Dana dibagi kepada pemegang peringkat Director ke atas yang aktif dan memenuhi pemeliharaan peringkatnya bulan itu, sebanding bobotnya (tabel bagian 8.4).",
      "Bagian seseorang paling banyak Rp100.000.000 per bulan. Kelebihannya dibagi kembali kepada penerima lain yang belum mencapai batas. Dana yang tetap tanpa penerima dimasukkan ke Pool Aktif.",
    ],
  ],
  ["h2", "8.6 Pool Aktif"],
  [
    "p",
    "Pool Aktif adalah dana bulanan untuk semua Mitra PLS yang aktif pada bulan itu, dibagi sebanding jumlah penjualan baru pribadinya. Sumbernya:",
  ],
  [
    "ol",
    [
      "Bonus yang hangus karena penerimanya tidak memenuhi syarat dalam masa tunggu (Bab 9).",
      "Sisa dana peringkat dan dana Leadership yang tidak memiliki penerima, serta kelebihan di atas batas per orang.",
      "Bonus Layanan Berkah yang tidak terkonfirmasi dalam 60 hari.",
      "Pengisian dari Perusahaan: bila seluruh bonus Plan A bulan itu di bawah 55% omzet bersih Lisensi, selisihnya sampai 55% dimasukkan ke Pool Aktif.",
    ],
  ],
  [
    "p",
    "Bagian setiap Mitra PLS paling banyak Rp500.000 per penjualan baru pribadi. Bila masih ada sisa setelah semua penerima mencapai batas itu, sisanya kembali kepada Perusahaan dan tidak dibawa ke bulan berikutnya.",
  ],
  ["h2", "8.7 Plan B: dari Atlas Membership"],
  [
    "table",
    ["Komisi/Bonus", "Nominal", "Batas", "Penerima"],
    [
      [
        "Komisi Langganan",
        "Rp70.000 per Atlas Membership per bulan (20% × 3,5 PV × Rp100.000)",
        "–",
        "Mitra PLS yang menjual kepada Pelanggan itu atau mensponsori Mitra PLS itu secara langsung",
      ],
      [
        "Pasangan Langganan (Pasangan RO)",
        "5% × PV Atlas Membership kaki kecil bulan itu × Rp100.000",
        "10 level; tanpa akumulasi antarbulan",
        "Mitra PLS pemegang posisi",
      ],
      [
        "Royalti Langganan (Royalti RO)",
        "Dana 3% omzet bersih Atlas Membership bulan itu",
        "Paling banyak Rp100.000.000 per orang per bulan",
        "Pemegang tingkat Royalti RO",
      ],
    ],
    [1.6, 2.6, 2, 2],
  ],
  [
    "table",
    [
      "Tingkat",
      "Syarat kaki kecil kumulatif dalam 10 level",
      "Bagian dari omzet bersih Atlas Membership bulan itu",
    ],
    [
      ["Royalti RO tingkat 1", "100 Lisensi : 100 Lisensi", "1,5%"],
      ["Royalti RO tingkat 2", "400 Lisensi : 400 Lisensi", "1,5%"],
    ],
    [1.5, 2.5, 2.5],
  ],
  [
    "p",
    "Atlas Membership tidak menimbulkan Bonus Sponsor, Fast Start, Pendamping, maupun Bonus Layanan Berkah.",
  ],
  ["h2", "8.8 Batas per orang"],
  [
    "table",
    ["Jenis", "Batas"],
    [
      ["Bonus Pasangan", "20 pasangan per hari (Rp3.000.000 per hari)"],
      [
        "Bonus Pembinaan",
        "Rp500.000.000 per bulan; kelebihan masuk Pool Aktif",
      ],
      ["Bonus Prestasi Peringkat", "Rp133.650.000 seumur keanggotaan"],
      ["Bonus Leadership", "Rp100.000.000 per bulan"],
      ["Royalti RO", "Rp100.000.000 per bulan"],
      [
        "Semua komisi dan bonus (Plan A dan Plan B)",
        "Rp1.000.000.000 per identitas per bulan kalender",
      ],
    ],
    [2, 3],
  ],
  [
    "p",
    "Batas dihitung per identitas: semua akun yang memakai NIK yang sama digabung.",
  ],

  // Bab 9
  ["h1", "Bab 9. Syarat Memperoleh Komisi dan Bonus"],
  ["h2", "9.1 Status aktif bulanan"],
  [
    "table",
    ["Masa", "Mitra PLS aktif bila pada bulan kalender itu membuat"],
    [
      [
        "Bulan yang menyentuh 90 hari pertama",
        "Paling sedikit **1** penjualan baru pribadi",
      ],
      ["Sesudahnya", "Paling sedikit **2** penjualan baru pribadi"],
    ],
    [2, 3],
  ],
  ["p", "Penjualan baru pribadi adalah:"],
  [
    "ul",
    [
      "Lisensi yang dibeli Mitra PLS baru yang ia sponsori, termasuk setiap kursi Lisensi Atlas Family yang ia jual;",
      "Lisensi yang dibeli Pelanggan melalui tautannya;",
      "Atlas Membership berbayar pertama dari Pelanggannya, dihitung satu kali per Pelanggan.",
    ],
  ],
  [
    "p",
    "Yang tidak dihitung: pembelian untuk diri sendiri; pembelian oleh akun yang dikendalikan sendiri; pembelian yang dibatalkan atau dikembalikan.",
  ],
  ["h2", "9.2 Syarat per jenis bonus"],
  [
    "table",
    ["Jenis", "Syarat"],
    [
      [
        "Bonus Sponsor, Fast Start, Pendamping",
        "Penjualan lunas dan tidak dibatalkan; Atlas Membership aktif bila sudah melewati masa akses (bagian 9.4)",
      ],
      [
        "Bonus Layanan Berkah",
        "Seperti Bonus Sponsor, ditambah konfirmasi pendampingan orientasi oleh Pelanggan dan lewat 30 hari sejak pembelian",
      ],
      [
        "Bonus Pasangan dan Pembinaan",
        "Aktif pada bulan bonus itu timbul, dan syarat bagian 9.4",
      ],
      [
        "Bonus Prestasi Peringkat",
        "Terverifikasi 3 bulan berturut-turut (bagian 8.4) dan aktif pada bulan klaim",
      ],
      [
        "Bonus Leadership dan Pool Aktif",
        "Aktif pada bulan itu; Leadership juga mensyaratkan pemeliharaan peringkat",
      ],
      [
        "Plan B",
        "Atlas Membership sendiri aktif (atau masih dalam masa akses Lisensi), pernah berstatus aktif paling sedikit sekali, dan menjalankan paling sedikit 1 kegiatan pembinaan terkonfirmasi pada bulan itu. Plan B tidak mensyaratkan penjualan baru",
      ],
    ],
    [2, 4],
  ],
  ["h2", "9.3 Masa tunggu"],
  [
    "ul",
    [
      "Bonus Pasangan dan Pembinaan yang timbul pada bulan Mitra PLS tidak aktif ditahan, dan terlihat di Kantor Maya.",
      "Bila Mitra PLS memenuhi syarat pada salah satu dari 2 bulan berikutnya, bonus itu dibayarkan. Bila tidak, bonus itu hangus pada akhir bulan ke-2 dan dimasukkan ke Pool Aktif.",
      "Bonus yang ditahan dalam 90 hari pertama tidak hangus sebelum bulan hari ke-150 sejak aktivasi Lisensi pertama.",
    ],
  ],
  ["h2", "9.4 Atlas Membership sebagai syarat bonus"],
  [
    "ul",
    [
      "Mulai bulan ke-4 sejak aktivasi Lisensi Atlas (bulan ke-13 untuk Lisensi Atlas Family), Mitra PLS pemegang Lisensi harus memiliki Atlas Membership yang aktif untuk menerima komisi dan bonus bulan itu.",
      "Bonus yang timbul ketika syarat ini belum terpenuhi ditahan dengan masa tunggu bagian 9.3.",
      "Syarat ini bukan syarat tetap menjadi Mitra PLS. Mitra PLS dan Pelanggan dapat berhenti berlangganan kapan saja.",
    ],
  ],
  ["h2", "9.5 Kegiatan pembinaan untuk Plan B"],
  [
    "p",
    "Satu dari kegiatan berikut setiap bulan, yang dikonfirmasi oleh penerima pembinaan di aplikasi. Materi kegiatan mengikuti kurikulum resmi Perusahaan. Konfirmasi dari akun yang dikendalikan sendiri tidak dihitung.",
  ],
  [
    "table",
    ["Kegiatan", "Syarat"],
    [
      [
        "Sesi belajar tim, minimal 60 menit",
        "Minimal 3 peserta dari jaringannya mengonfirmasi kehadiran",
      ],
      [
        "Pendampingan orientasi Mitra PLS atau Pelanggan baru",
        "Daftar periksa orientasi selesai dan dikonfirmasi oleh orang yang didampingi",
      ],
      [
        "Sesi pemakaian platform 1:1, minimal 30 menit",
        "Dikonfirmasi penerima, beserta nilai 1–5",
      ],
    ],
    [2, 3],
  ],

  // Bab 10
  ["h1", "Bab 10. Simulasi Perhitungan"],
  ["box", [["p", `**${DISCLAIMER}**`]]],
  ["h2", "10.1 Contoh menjalankan kalimat panduan selama 90 hari"],
  ["p", "Keadaan yang diandaikan:"],
  [
    "ul",
    [
      "Mitra PLS Contoh mengaktifkan Lisensi Atlas pada bulan ke-1.",
      "Pada bulan ke-2 dan ke-3 ia menjual masing-masing 2 Lisensi Atlas kepada Mitra PLS baru, satu di kaki kiri dan satu di kaki kanan.",
      "Setiap Mitra PLS baru melakukan hal yang sama pada bulan kedua dan ketiga sejak aktivasinya. Tidak ada pembatalan.",
      "Pool Aktif bulan itu cukup besar sehingga setiap penjualan memperoleh bagian paling banyak Rp500.000.",
    ],
  ],
  [
    "table",
    ["Komponen", "Bulan ke-2", "Bulan ke-3", "Jumlah 90 hari"],
    [
      [
        "Bonus Sponsor (2 × Rp750.000 per bulan)",
        "Rp1.500.000",
        "Rp1.500.000",
        "Rp3.000.000",
      ],
      [
        "Bonus Fast Start (2 × Rp1.000.000 per bulan)",
        "Rp2.000.000",
        "Rp2.000.000",
        "Rp4.000.000",
      ],
      [
        "Bonus Pendamping (2 Mitra binaan × Rp100.000)",
        "–",
        "Rp200.000",
        "Rp200.000",
      ],
      ["Bonus Pasangan", "Rp150.000", "Rp450.000", "Rp600.000"],
      ["Bonus Pembinaan", "–", "Rp75.000", "Rp75.000"],
      [
        "**Jumlah tanpa Pool Aktif**",
        "**Rp3.650.000**",
        "**Rp4.225.000**",
        "**Rp7.875.000**",
      ],
      [
        "Pool Aktif (2 penjualan × paling banyak Rp500.000)",
        "Rp1.000.000",
        "Rp1.000.000",
        "Rp2.000.000",
      ],
      [
        "**Jumlah bruto**",
        "**Rp4.650.000**",
        "**Rp5.225.000**",
        "**Rp9.875.000**",
      ],
    ],
    [3.2, 1.4, 1.4, 1.6],
  ],
  [
    "ul",
    [
      "Angka bruto, sebelum pajak penghasilan. Mitra PLS Contoh telah membayar Lisensi Atlas Rp7.500.000.",
      "Pool Aktif tidak tetap. Besarnya bergantung pada dana bulan itu dan dapat lebih kecil atau nihil.",
      "Bila sebagian Mitra PLS baru tidak menjual, Bonus Pasangan, Pembinaan, dan Pendamping menjadi lebih kecil. Bila Mitra PLS Contoh tidak menjual, ia hanya menerima bonus yang sudah timbul dan memenuhi syarat.",
      "Pola ini tidak dapat berlangsung terus: jumlah orang yang dibutuhkan berlipat setiap bulan. Ilustrasi ini hanya menjelaskan cara bonus dihitung.",
    ],
  ],
  ["h2", "10.2 Contoh sesudah 90 hari dan bulan tidak aktif"],
  [
    "p",
    "Andaikan sesudah 90 hari Mitra PLS Contoh berhenti menjual tetapi berlangganan Atlas Membership, sementara timnya tetap berlangganan.",
  ],
  [
    "ul",
    [
      "Ia tidak aktif (kurang dari 2 penjualan baru pribadi per bulan). Bonus Pasangan dan Pembinaan yang timbul **ditahan**, lalu hangus ke Pool Aktif bila ia tidak aktif dalam 2 bulan berikutnya.",
      "Plan B tetap dapat diterima bila syaratnya terpenuhi (bagian 9.2). Dalam simulasi Perusahaan, Plan B Mitra PLS Contoh pada bulan ke-5, ke-6, dan ke-7 adalah Rp157.500, Rp350.000, dan Rp624.797.",
      "Bonus Sponsor dan Fast Start atas penjualan yang sudah terjadi tetap dibayarkan.",
    ],
  ],
  ["h2", "10.3 Contoh pola Lisensi Atlas Family: 2 paket per bulan selama 2 bulan"],
  ["p", "Keadaan yang diandaikan:"],
  [
    "ul",
    [
      "Mitra PLS Contoh mengaktifkan Lisensinya pada bulan ke-1, lalu menjual 2 paket Lisensi Atlas Family pada bulan ke-2 dan 2 paket pada bulan ke-3 (4 paket, 12 kursi). Setiap kursi diisi orang dewasa yang mendaftar sendiri sebagai Mitra PLS.",
      "Setiap pemegang kursi utama yang ia sponsori melakukan pola yang sama pada bulan kedua dan ketiga sejak aktivasinya. Kursi kedua dan ketiga diandaikan belum menjual. Tidak ada pembatalan.",
      "Pool Aktif bulan itu cukup besar sehingga setiap penjualan memperoleh bagian paling banyak Rp500.000.",
    ],
  ],
  [
    "table",
    ["Komponen", "Perhitungan", "Jumlah 90 hari"],
    [
      ["Bonus Sponsor", "4 paket × Rp3.000.000", "Rp12.000.000"],
      ["Bonus Fast Start", "12 kursi × Rp1.000.000", "Rp12.000.000"],
      ["Bonus Pasangan", "Sesuai jaringan yang terbentuk dalam 90 hari", "Rp1.800.000"],
      ["Bonus Pembinaan", "25% × Bonus Pasangan generasi 1–3", "Rp525.000"],
      ["Bonus Pendamping", "2 kursi utama binaan membuat penjualan Fast Start pertamanya dalam 90 hari Mitra PLS Contoh", "Rp200.000"],
      ["**Jumlah tanpa Pool Aktif**", "", "**Rp26.525.000**"],
      ["Pool Aktif", "12 penjualan × paling banyak Rp500.000 (tidak tetap)", "Rp6.000.000"],
      ["**Jumlah bruto 90 hari**", "", "**Rp32.525.000**"],
    ],
    [2, 3.4, 1.6],
  ],
  [
    "ul",
    [
      "Angka bruto, sebelum pajak penghasilan. Pola ini berarti menjual 4 paket senilai Rp100.000.000 dalam 2 bulan, dan jumlah keluarga yang dibutuhkan berlipat setiap bulan, sehingga tidak dapat berlangsung terus.",
      "Bila Mitra PLS Contoh menjual 1 paket per bulan selama 2 bulan, jumlahnya Rp12.525.000 tanpa Pool Aktif.",
      "Pemegang kursi utama tidak menerima Bonus Sponsor maupun Fast Start dari keluarganya. Ia memperoleh 1 pasangan (Rp150.000) dari kursi kedua dan ketiga, yang dibayar setelah ia aktif.",
    ],
  ],
  ["h2", "10.4 Ilustrasi batas atas penghasilan bulanan"],
  [
    "p",
    "Batas gabungan seluruh komisi dan bonus adalah Rp1.000.000.000 per identitas per bulan. Ilustrasi berikut menunjukkan syarat yang dibutuhkan untuk mendekati batas itu. Ilustrasi ini hanya boleh dimuat dalam Rencana Pemasaran, lengkap dengan syaratnya, dan **dilarang dipakai dalam iklan atau materi promosi** (Kode Etik Pasal 18).",
  ],
  [
    "table",
    ["Komponen", "Keadaan yang diandaikan", "Paling banyak per bulan"],
    [
      ["Bonus Pasangan", "20 pasangan setiap hari", "Rp90.000.000"],
      [
        "Bonus Pembinaan",
        "Jaringan 6 generasi dengan Bonus Pasangan sangat besar",
        "Rp500.000.000",
      ],
      ["Bonus Leadership", "Royal Crown yang terpelihara", "Rp100.000.000"],
      ["Royalti RO", "Tingkat 1 dan 2", "Rp100.000.000"],
      [
        "Pasangan RO",
        "Kaki kecil sekitar 5.700 Atlas Membership",
        "Rp100.000.000",
      ],
      [
        "Sponsor, Pool Aktif, Komisi Langganan, dan lainnya",
        "Penjualan pribadi tetap berjalan",
        "± Rp110.000.000",
      ],
      ["**Batas gabungan**", "", "**Rp1.000.000.000**"],
    ],
    [2.2, 3, 1.8],
  ],
  [
    "p",
    "Keadaan ini membutuhkan omzet bersih jaringan sekitar Rp40,5 miliar per bulan pada peringkat Royal Crown. Dalam simulasi Perusahaan atas jaringan buatan, **51% sampai 71% Mitra PLS tidak menerima komisi atau bonus apa pun**, dan penerima tertinggi umumnya jauh di bawah batas ini. Perusahaan menerbitkan ringkasan penghasilan Mitra PLS yang sebenarnya setiap tahun (Bab 14).",
  ],

  // Bab 11
  ["h1", "Bab 11. Waktu dan Cara Pembayaran"],
  ["h2", "11.1 Jadwal"],
  [
    "table",
    ["Jadwal", "Komisi/Bonus yang dibayarkan"],
    [
      [
        "Setiap Jumat, batas transaksi pukul 07.00 WIB, transfer pukul 07.01–19.00 WIB",
        "Bonus Sponsor; Bonus Fast Start dan Pendamping yang sudah melewati 7 hari kerja; Bonus Layanan Berkah yang sudah jatuh tempo; Bonus Pasangan dan Pembinaan bagi Mitra PLS yang sudah berstatus aktif pada bulan berjalan",
      ],
      [
        "Tutup bulan (tanggal 1 pukul 00.00 WIB), dibayarkan pada Jumat pertama sesudahnya",
        "Penetapan status aktif, masa tunggu, faktor plafon, Bonus Prestasi Peringkat, Bonus Leadership, Pool Aktif, seluruh Plan B, dan batas gabungan",
      ],
    ],
    [2, 3],
  ],
  [
    "ul",
    [
      "Transaksi setelah Jumat pukul 07.00 WIB masuk perhitungan Jumat berikutnya.",
      "Mitra PLS yang mencapai status aktif di tengah bulan menerima bonus timnya mulai Jumat berikutnya.",
    ],
  ],
  ["h2", "11.2 Cara pembayaran"],
  [
    "ul",
    [
      "Komisi dan bonus ditransfer ke rekening bank atas nama Mitra PLS yang terdaftar.",
      "Perusahaan memotong pajak penghasilan sesuai ketentuan perpajakan yang berlaku dan menerbitkan bukti potong.",
      "Rincian setiap pembayaran dapat dilihat di Kantor Maya, termasuk bonus yang ditahan, bonus yang hangus, antrean Bonus Prestasi, dan faktor plafon.",
      "Gangguan bank atau sistem diumumkan secara terbuka, dan pembayaran diselesaikan pada kesempatan pertama.",
      "Komisi dan bonus atas pembelian yang dibatalkan atau dikembalikan ditarik kembali: dibatalkan bila belum dibayar, atau dipotong dari pembayaran berikutnya bila sudah dibayar.",
    ],
  ],

  // Bab 12
  ["h1", "Bab 12. Batas Komisi dan Bonus serta Pengendaliannya"],
  ["h2", "12.1 Plafon"],
  [
    "table",
    ["Bagian", "Plafon"],
    [
      [
        "Plan A",
        "Paling banyak 60% omzet bersih Lisensi per bulan (PP 29/2021 Pasal 49)",
      ],
      [
        "Pengisian Pool Aktif",
        "Sampai 55% omzet bersih Lisensi, paling banyak Rp500.000 per penjualan",
      ],
      ["Plan B", "Paling banyak 50% omzet bersih Atlas Membership per bulan"],
    ],
    [1.5, 4],
  ],
  ["h2", "12.2 Mekanisme pengendalian"],
  [
    "p",
    "**1. Batas atas biaya bonus per penjualan.** Karena volume hanya dihitung 10 level, biaya bonus per penjualan memiliki batas atas yang tetap, sedalam apa pun jaringannya:",
  ],
  [
    "table",
    ["Jenis", "Rumus", "Batas atas"],
    [
      [
        "Lisensi Atlas kepada Mitra PLS baru",
        "(Rp750.000 + Rp1.000.000 + Rp100.000 + 5 × Rp150.000 × 1,90) ÷ Rp6.756.757 + 4,5% + 5%",
        "57,97%",
      ],
      [
        "Lisensi Atlas kepada Pelanggan",
        "(Rp750.000 + Rp1.000.000 + Rp50.000 + 5 × Rp150.000 × 1,90) ÷ Rp6.756.757 + 4,5% + 5%",
        "57,23%",
      ],
      [
        "Lisensi Atlas Family (per paket)",
        "(Rp3.000.000 + 3 × (Rp1.000.000 + Rp100.000 + 5 × Rp150.000 × 1,90)) ÷ Rp22.522.523 + 4,5% + 5%",
        "56,45%",
      ],
      ["Atlas Membership", "Rp70.000 ÷ Rp359.459 + 5 × 5% + 3%", "47,47%"],
    ],
    [2, 4, 1],
  ],
  [
    "note",
    "Keterangan rumus: 5 pasangan per Lisensi (10 upline, 1 pasangan memakai 2 Lisensi); Bonus Pembinaan paling banyak 90% dari Bonus Pasangan (3 × 25% + 3 × 5%); 4,5% dana peringkat dan 5% dana Leadership.",
  ],
  ["p", "**2. Plafon bulanan.**"],
  [
    "ul",
    [
      "Anggaran bonus tim = plafon Plan A − bonus langsung (Sponsor, Fast Start, Pendamping, Berkah) − dana peringkat − dana Leadership.",
      "Bila klaim melebihi anggaran, semua klaim dibayar dengan faktor yang sama, dan sisanya dibayar lebih dulu pada periode berikutnya. Faktor ini diumumkan di Kantor Maya.",
    ],
  ],
  ["p", "**3. Batas per orang** (bagian 8.8)."],
  [
    "p",
    "**4. Dana layanan.** Rp426.000 per Lisensi Atlas (setara Rp142.000 per akun per bulan selama masa akses) dan Rp1.704.000 per kursi Lisensi Atlas Family disisihkan untuk biaya layanan platform, dan tidak dipakai untuk komisi atau bonus.",
  ],
  [
    "p",
    "**5. Pemantauan.** Rasio bonus terhadap omzet dipantau setiap minggu, dengan peringatan internal pada 52%.",
  ],
  ["h2", "12.3 Hasil uji internal"],
  [
    "p",
    "Perusahaan menguji aturan ini dengan simulasi jaringan buatan (skala organik 0,5). Hasilnya bukan proyeksi penjualan. Laba di bawah ini sebelum biaya kantor, gaji, pemasaran perusahaan, dan pajak penghasilan badan, serta sudah memperhitungkan dana layanan dan biaya workshop.",
  ],
  [
    "table",
    [
      "Skenario",
      "Plan A dibayar (% omzet bersih Lisensi)",
      "Plan B dibayar (% omzet bersih Membership)",
      "Margin sebelum biaya kantor",
      "Bulan rugi",
      "Mitra PLS tanpa bonus",
    ],
    [
      [
        "Penjualan rata 5 tahun, 70% pembeli menjadi Mitra PLS",
        "17,4%",
        "12,5%",
        "55,5%",
        "0",
        "62,1%",
      ],
      [
        "Penjualan naik lalu turun, 5 tahun",
        "18,3%",
        "12,5%",
        "54,9%",
        "0",
        "62,5%",
      ],
      [
        "Hanya 30% pembeli menjadi Mitra PLS",
        "20,5%",
        "13,6%",
        "53,4%",
        "0",
        "51,5%",
      ],
      [
        "30% penjualan Mitra PLS baru berupa Family",
        "20,3%",
        "11,3%",
        "51,6%",
        "0",
        "67,1%",
      ],
      [
        "60% penjualan Mitra PLS baru berupa Family",
        "21,8%",
        "10,6%",
        "49,2%",
        "0",
        "71,0%",
      ],
      [
        "Atlas Membership bertahan hanya 40% per bulan",
        "15,2%",
        "6,9%",
        "61,6%",
        "0",
        "64,2%",
      ],
      [
        "10% penjualan kepada Pelanggan dibatalkan",
        "17,7%",
        "12,3%",
        "55,5%",
        "0",
        "62,5%",
      ],
      [
        "Penjualan berhenti total setelah bulan ke-24",
        "23,7%",
        "12,6%",
        "49,3%",
        "0",
        "66,6%",
      ],
      [
        "Semua Mitra PLS menjalankan kalimat panduan sempurna",
        "35,6%",
        "22,6%",
        "45,4%",
        "0",
        "63,4%",
      ],
      [
        "Jaringan biner ideal 10 level",
        "35,1%",
        "39,4%",
        "43,6%",
        "0",
        "50,0%",
      ],
    ],
    [3, 1.4, 1.4, 1.3, 0.9, 1.2],
  ],
  [
    "p",
    "Dalam semua skenario, plafon kumulatif tidak terlampaui dan tidak ada bulan rugi. Persentase Plan A dan Plan B adalah kumulatif selama masa simulasi.",
  ],

  // Bab 13
  ["h1", "Bab 13. Kewajiban Perusahaan kepada Mitra PLS dan Pelanggan"],
  [
    "ol",
    [
      "Keterangan yang benar sebelum perekrutan tentang identitas Perusahaan, produk, Rencana Pemasaran, dan Kode Etik.",
      "Masa pertimbangan 10 hari kerja bagi Mitra PLS baru. Lisensi yang dibeli dalam masa itu dan belum diaktifkan dikembalikan dananya 100%. Bila sudah diaktifkan, pengembalian dana dikurangi nilai akses yang sudah dipakai, dihitung harian dari Rp399.000 per bulan per kursi.",
      "Pengembalian 7 hari kerja bagi Pelanggan bila produk tidak sesuai dengan yang diperjanjikan.",
      "Pembelian kembali Lisensi yang belum diaktifkan dan masih dapat dialihkan bila Mitra PLS mengundurkan diri atau diberhentikan, dengan harga pembelian dikurangi biaya administrasi paling banyak 10% dan komisi atau bonus yang telah diterima atas pembelian itu.",
      "Ganti rugi atas kerugian akibat produk atau layanan yang tidak sesuai dengan yang diperjanjikan, sesuai Kode Etik.",
      "Pembinaan dan pelatihan bagi Mitra PLS paling sedikit 1 kali dalam 1 tahun, Program Pendampingan 90 Hari, serta 1 workshop pelatihan 2 hari tanpa biaya bagi setiap pemegang Lisensi (Bab 7).",
      "Pembayaran komisi dan bonus sesuai Rencana Pemasaran ini.",
      "Daftar Mitra PLS beserta identitasnya.",
      "Pelaporan kegiatan usaha tahunan kepada Kementerian Perdagangan, serta laporan perubahan Rencana Pemasaran dan Kode Etik melalui sistem perizinan.",
      "Penarikan komisi atas pembelian yang dibatalkan atau dikembalikan, agar komisi hanya berasal dari penjualan yang sah.",
    ],
  ],

  // Bab 14
  ["h1", "Bab 14. Ketentuan Lain"],
  [
    "ol",
    [
      "**Larangan skema piramida.** Tidak ada komisi atau bonus dari biaya pendaftaran atau perekrutan. Satu identitas hanya untuk satu keanggotaan. Tidak ada komisi atau bonus bila tidak ada penjualan produk.",
      "**Larangan penghimpunan dana.** Perusahaan dan Mitra PLS tidak menghimpun dana masyarakat dalam bentuk apa pun.",
      "**Larangan klaim penghasilan dan klaim investasi.** Mitra PLS dilarang menjanjikan penghasilan, balik modal, atau keuntungan investasi. Ketentuan rinci ada dalam Kode Etik.",
      "**Aturan memakai kalimat panduan dan ilustrasi.** Kalimat panduan bagian 4.2 selalu disertai subjudulnya. Angka dari Bab 10 hanya boleh dikutip bersama asumsi dan pernyataan bahwa angka itu bukan janji. Ilustrasi batas atas (bagian 10.4) tidak boleh dipakai dalam iklan atau materi promosi.",
      "**Pengungkapan penghasilan.** Perusahaan menerbitkan ringkasan penghasilan Mitra PLS setiap tahun: median, sebaran, dan porsi Mitra PLS yang tidak menerima bonus.",
      "**Perubahan Rencana Pemasaran** diberitahukan kepada Mitra PLS paling lambat 30 hari sebelum berlaku, dan dilaporkan sesuai ketentuan perizinan. Perubahan tidak mengurangi komisi dan bonus yang telah menjadi hak Mitra PLS.",
      "**Penyelesaian perselisihan** mengikuti Kode Etik.",
    ],
  ],

  // Lampiran A
  ["h1", "Lampiran A. Daftar Istilah"],
  [
    "table",
    ["Istilah", "Arti"],
    [
      ["Perusahaan", "PT MITRANS [nama lengkap ●]"],
      [
        "Mitra PLS",
        "Mitra Marketing Penggerak Literasi Syariah, yaitu Penjual Langsung yang terdaftar dan menyetujui Kode Etik serta Ketentuan Kemitraan",
      ],
      [
        "Pelanggan",
        "Pembeli Lisensi atau Atlas Membership yang bukan Mitra PLS",
      ],
      [
        "Lisensi Atlas",
        "Lisensi penggunaan perangkat lunak Mitrans-Astra untuk 1 orang, termasuk akses aplikasi 3 bulan",
      ],
      [
        "Lisensi Atlas Family",
        "Lisensi untuk 3 orang dewasa dalam satu keluarga, termasuk akses aplikasi 12 bulan per kursi",
      ],
      ["Lisensi", "Lisensi Atlas atau setiap kursi Lisensi Atlas Family"],
      [
        "Atlas Membership",
        "Perpanjangan akses bulanan Rp399.000; disebut juga Langganan",
      ],
      [
        "Program Pendampingan 90 Hari",
        "Pendampingan tanpa biaya selama 90 hari sejak aktivasi Lisensi pertama, beserta bonus programnya (bagian 8.2)",
      ],
      [
        "Kalimat panduan",
        '"Ajak 2 orang per bulan selama 2 bulan, dan bantu mereka melakukan hal yang sama", selalu dengan subjudulnya (bagian 4.2)',
      ],
      [
        "Konversi Lisensi",
        "Pencatatan Lisensi Pelanggan menjadi Lisensi Mitra PLS dalam 60 hari sejak pembelian (bagian 5.5)",
      ],
      [
        "Workshop pelatihan",
        "Pelatihan 2 hari tanpa biaya, sekali untuk setiap pemegang Lisensi",
      ],
      ["Omzet bersih", "Nilai penjualan setelah dikurangi PPN"],
      ["PV", "Nilai poin; 1 PV setara Rp100.000 omzet bersih"],
      [
        "Paket setara",
        "Omzet bersih Lisensi dan Atlas Membership dibagi Rp6.756.757; dipakai untuk peringkat",
      ],
      [
        "Kaki kiri dan kaki kanan",
        "Dua cabang jaringan biner di bawah suatu posisi",
      ],
      ["Kaki kecil", "Kaki dengan jumlah Lisensi atau PV lebih sedikit"],
      [
        "Level",
        "Jarak suatu posisi dari posisi Mitra PLS di atasnya; dihitung sampai 10",
      ],
      [
        "Pasangan",
        "1 Lisensi di kaki kiri dan 1 Lisensi di kaki kanan yang belum pernah dipasangkan",
      ],
      ["Sponsor", "Mitra PLS yang merujuk Mitra PLS baru atau Pelanggan"],
      [
        "Generasi",
        "Urutan garis sponsor; generasi 1 adalah Mitra PLS yang disponsori langsung",
      ],
      [
        "Aktif",
        "Membuat paling sedikit 1 penjualan baru pribadi (bulan yang menyentuh 90 hari pertama) atau 2 penjualan baru pribadi (sesudahnya) dalam satu bulan kalender",
      ],
      [
        "Pool Aktif",
        "Dana bulanan untuk Mitra PLS aktif, dibagi sebanding penjualan baru pribadi",
      ],
      [
        "Peringkat",
        "Builder, Executive, Manager, Director, Senior Director, Emerald, Diamond, Double Diamond, Crown Diamond, Ambassador, dan Royal Crown",
      ],
      ["Identitas", "Nomor Induk Kependudukan (NIK)"],
      [
        "Akun struktural",
        "Posisi Mitrans 001, 002, dan 003 yang dipegang Perusahaan",
      ],
    ],
    [1.6, 4],
  ],

  // Lampiran B
  ["h1", "Lampiran B. Contoh Perhitungan Rinci"],
  ["h2", "B.1 Bonus Pasangan dan sisa unit"],
  [
    "table",
    [
      "Hari",
      "Unit kiri masuk",
      "Unit kanan masuk",
      "Saldo kiri",
      "Saldo kanan",
      "Pasangan dibayar",
      "Bonus",
    ],
    [
      ["Hari 1", "3", "1", "3", "1", "1", "Rp150.000"],
      ["Hari 2", "0", "4", "2", "4", "2", "Rp300.000"],
      ["Hari 3", "25", "30", "25", "32", "20 (batas harian)", "Rp3.000.000"],
    ],
    [1, 1, 1, 1, 1, 1.4, 1.3],
  ],
  [
    "p",
    "Sisa unit setelah hari 3: kiri 5, kanan 12. Sisa ini dipakai pada hari berikutnya. Bila hari 3 berada dalam 90 hari pertama, pasangan di atas batas harian dibawa ke hari berikutnya.",
  ],
  ["h2", "B.2 Bonus Pembinaan"],
  [
    "table",
    [
      "Generasi",
      "Bonus Pasangan generasi itu",
      "Persentase",
      "Bonus Pembinaan",
    ],
    [
      ["1", "Rp2.000.000", "25%", "Rp500.000"],
      ["2", "Rp1.000.000", "25%", "Rp250.000"],
      ["3", "Rp800.000", "25%", "Rp200.000"],
      ["4", "Rp500.000", "5%", "Rp25.000"],
      ["5", "Rp300.000", "5%", "Rp15.000"],
      ["6", "Rp100.000", "5%", "Rp5.000"],
      ["**Jumlah**", "", "", "**Rp995.000**"],
    ],
    [1, 2, 1, 2],
  ],
  [
    "p",
    "Bonus Pembinaan hanya dibayar bila Mitra PLS penerima aktif pada bulan itu. Bila tidak, bonus ditahan sesuai bagian 9.3.",
  ],
  ["h2", "B.3 Bonus Leadership"],
  [
    "p",
    "Omzet bersih Lisensi bulan itu Rp2.400.000.000, sehingga dana Leadership 5% = Rp120.000.000. Penerima yang memenuhi syarat: 3 Director (bobot 1) dan 1 Emerald (bobot 3). Jumlah bobot 6, sehingga nilai per bobot Rp20.000.000. Setiap Director menerima Rp20.000.000 dan Emerald menerima Rp60.000.000.",
  ],
  ["h2", "B.4 Pool Aktif dengan batas per penjualan"],
  [
    "p",
    "Pool Aktif bulan itu Rp10.000.000. Tiga Mitra PLS aktif membuat 2, 3, dan 5 penjualan baru pribadi (jumlah 10). Bagian per penjualan Rp1.000.000 melebihi batas Rp500.000, sehingga masing-masing menerima Rp1.000.000, Rp1.500.000, dan Rp2.500.000. Sisa Rp5.000.000 kembali kepada Perusahaan dan tidak dibawa ke bulan berikutnya.",
  ],
  ["h2", "B.5 Pasangan Langganan"],
  [
    "p",
    "Bulan itu kaki kiri memiliki 40 Atlas Membership berbayar dalam 10 level (140 PV) dan kaki kanan 25 (87,5 PV). Kaki kecil 87,5 PV × Rp100.000 × 5% = Rp437.500. Saldo kaki besar tidak dibawa ke bulan berikutnya.",
  ],
  ["h2", "B.6 Antrean Bonus Prestasi"],
  [
    "p",
    "Dana peringkat bulan itu Rp100.000.000, sedangkan klaim baru Rp130.000.000. Klaim dibayar menurut urutan sampai Rp100.000.000, dengan nominal utuh per klaim. Klaim senilai Rp30.000.000 menunggu dan dibayar lebih dulu dari dana bulan berikutnya. Bila menunggu lebih dari 6 bulan, klaim itu dilunasi dari dana cadangan Perusahaan.",
  ],

  // Lampiran C
  ["h1", "Lampiran C. Ringkasan Alur Bonus"],
  [
    "table",
    ["Saat", "Yang Mitra PLS peroleh", "Syarat"],
    [
      ["Menjual Lisensi Atlas", "Bonus Sponsor Rp750.000", "Penjualan lunas"],
      [
        "Menjual Lisensi dalam 90 hari pertamanya",
        "Bonus Fast Start Rp1.000.000 per Lisensi",
        "Lisensi pertama pembeli; lewat 7 hari kerja",
      ],
      [
        "Menjual paket Lisensi Atlas Family",
        "Bonus Sponsor Rp3.000.000 per paket + Fast Start per kursi",
        "Seperti di atas",
      ],
      [
        "Mitra binaan membuat penjualan Fast Start pertamanya",
        "Bonus Pendamping Rp100.000",
        "Sekali per Mitra binaan",
      ],
      [
        "Menjual kepada Pelanggan, lalu mendampinginya",
        "Bonus Layanan Berkah Rp50.000",
        "30 hari dan dikonfirmasi Pelanggan",
      ],
      [
        "Jaringan tumbuh di kaki kiri dan kanan",
        "Bonus Pasangan dan Bonus Pembinaan",
        "Aktif bulan itu",
      ],
      [
        "Memenuhi syarat peringkat 3 bulan berturut-turut",
        "Bonus Prestasi Builder sampai Royal Crown",
        "Aktif pada bulan klaim",
      ],
      [
        "Memelihara peringkat Director ke atas",
        "Bonus Leadership",
        "Aktif bulan itu",
      ],
      [
        "Pelanggan dan Mitra PLS langsung berlangganan",
        "Komisi Langganan Rp70.000 per bulan",
        "Syarat Plan B (bagian 9.2)",
      ],
      [
        "Jaringan berlangganan di kaki kiri dan kanan",
        "Pasangan RO; Royalti RO pada kaki kecil 100 atau 400 Lisensi",
        "Syarat Plan B",
      ],
      ["Setiap bulan aktif", "Bagian Pool Aktif", "Aktif bulan itu"],
    ],
    [2.4, 2.6, 2],
  ],
  [
    "p",
    "**Tidak ada jaminan penghasilan.** Komisi dan bonus berasal dari penjualan dan pembinaan nyata.",
  ],

  // Lampiran D
  ["h1", "Lampiran D. Catatan untuk Konsultan Hukum"],
  ["p", "Hal-hal berikut perlu pendapat hukum sebelum dokumen ini diajukan:"],
  [
    "ol",
    [
      '**Plafon 60%.** Dasarnya PP 29/2021 Pasal 49. Permendag 70/2019 masih memuat 40% dan dipakai asosiasi. Perlu dipastikan apakah PP 3/2026 mengubah Pasal 49, dan apakah "omzet" berarti omzet kotor atau bersih. Engine menyimpan plafon sebagai parameter sehingga dapat diturunkan tanpa mengubah struktur.',
      '**Volume kursi keluarga.** Volume kursi kedua dan ketiga Lisensi Atlas Family dihitung untuk kursi utama. Ini perlu diuji terhadap prinsip "pembelian sendiri tidak dihitung" (bagian 9.1), karena pembeliannya dibayar dalam satu paket keluarga.',
      "**Atlas Membership sebagai syarat bonus.** Perlu dipastikan bahwa syarat ini tidak dianggap kewajiban pembelian untuk tetap menjadi Mitra PLS (Permendag 70/2019 dan Kode Etik Pasal 19 angka 3).",
      "**Pendampingan dan workshop tanpa biaya.** Perlu dipastikan rumusan bahwa keduanya bukan bagian dari harga Lisensi cukup untuk memenuhi PP 3/2026 Pasal 54 ayat (2).",
      "**Kalimat panduan.** Perlu dipastikan bahwa kalimat panduan beserta subjudulnya tidak dibaca sebagai bonus perekrutan (PP 3/2026 Pasal 51A).",
      "**Bonus Fast Start dan Pendamping.** Keduanya hanya timbul dari penjualan Lisensi yang lunas. Perlu dipastikan tidak dianggap bonus pendaftaran.",
    ],
  ],
  ["p", "[Kota ●], [tanggal ●]"],
  ["p", "PT MITRANS"],
  ["p", "[Nama ●]"],
  ["p", "[Jabatan ●]"],
];

write(path.join(OUT_DIR, "Rencana_Pemasaran_Mitrans-Astra_v2.0_DRAF.docx"), {
  title: "Rencana Pemasaran Mitrans-Astra v2.0",
  coverLines: [
    ["PT MITRANS", 28, { bold: true, after: 400 }],
    ["Rencana Pemasaran Mitrans-Astra", 48, { bold: true }],
    ["Program Pemasaran untuk Pengajuan Izin Usaha Penjualan Langsung", 24],
    ["Produk: Lisensi Atlas, Lisensi Atlas Family, dan Atlas Membership", 22],
    [
      "(Lisensi Platform Analisa Transaksi Saham Syariah Mitrans-Astra)",
      20,
      { after: 400 },
    ],
    [
      "Disusun berdasarkan Permendag 70/2019 Pasal 8 dan PP 29/2021 sebagaimana diubah dengan PP 3/2026",
      20,
    ],
    ["Versi 2.0 · 29 Oktober 2026", 22, { bold: true, after: 600 }],
    [
      "DRAF: untuk ditinjau konsultan hukum dan diverifikasi asosiasi penjualan langsung sebelum diajukan. Belum berlaku dan belum boleh dipakai untuk pemasaran.",
      20,
      { color: "C00000" },
    ],
  ],
  blocks,
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
