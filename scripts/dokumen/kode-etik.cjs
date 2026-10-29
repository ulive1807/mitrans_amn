/**
 * Draf Kode Etik Mitra PLS Mitrans-Astra v2.0 (Word), dibangun dari v1.2.
 * Jalankan: node scripts/dokumen/kode-etik.cjs
 */
const path = require("path");
const { write, OUT_DIR } = require("./lib.cjs");

const HEADLINE =
  "Ajak 2 orang per bulan selama 2 bulan, dan bantu mereka melakukan hal yang sama.";
const SUBTITLE =
  "Ajak = bantu mereka memiliki dan memakai Lisensi Mitrans-Astra. Bonus hanya timbul dari penjualan produk yang lunas, bukan dari pendaftaran.";

const blocks = [
  ["h1n", "Pembukaan"],
  [
    "box",
    [
      [
        "p",
        "**Status dokumen: DRAF v2.0.** Sebelum diberlakukan, dokumen ini perlu:",
      ],
      [
        "ul",
        [
          "ditinjau konsultan hukum;",
          "diverifikasi oleh asosiasi penjualan langsung (Permendag 70/2019 Pasal 9 ayat (4));",
          "dilengkapi data yang ditandai [●].",
        ],
      ],
    ],
  ],
  ["p", "**Perubahan dari versi 1.2 (27 Oktober 2026):**"],
  [
    "ul",
    [
      "Pengertian baru: Lisensi Atlas, Lisensi Atlas Family, Atlas Membership, Program Pendampingan 90 Hari, dan Kalimat Panduan (Pasal 1).",
      "Ketentuan kursi Lisensi Atlas Family (Pasal 3 dan Pasal 4).",
      "Workshop pelatihan 2 hari tanpa biaya diberikan sekali per Lisensi, ditambah kelas daring (Pasal 13).",
      "Etika menjelaskan masa akses 3 atau 12 bulan dan Atlas Membership (Pasal 17).",
      'Larangan baru Pasal 18 angka 21–25: kalimat panduan tanpa subjudul, janji balik modal, ilustrasi batas atas dalam promosi, klaim "beli satu dapat tiga posisi", dan kursi Family yang tidak didaftarkan sendiri oleh pemiliknya. Pasal 20 disesuaikan.',
      "Lampiran: Pedoman Komunikasi dengan kalimat yang disetujui dan yang dilarang.",
    ],
  ],
  [
    "p",
    "PT MITRANS membangun Mitrans-Astra untuk membantu keluarga Indonesia memahami pasar modal syariah dengan alat analisis yang jujur dan bertanggung jawab. Usaha ini dijalankan bersama para Mitra PLS melalui penjualan langsung.",
  ],
  [
    "p",
    "Kode Etik ini menjadi pegangan bersama agar usaha tersebut berjalan dengan:",
  ],
  [
    "ul",
    [
      "jujur (shiddiq) dalam setiap keterangan kepada calon Mitra PLS dan Pelanggan;",
      "amanah dalam menjaga dana, data, dan kepercayaan orang lain;",
      "adil ('adl), sehingga penghasilan berasal dari kerja nyata dan tidak merugikan anggota yang bergabung kemudian;",
      "bermanfaat, yaitu produk benar-benar membantu pemakainya.",
    ],
  ],
  [
    "p",
    "Kode Etik ini disusun berdasarkan Peraturan Menteri Perdagangan Nomor 70 Tahun 2019 Pasal 9, dan Peraturan Pemerintah Nomor 29 Tahun 2021 sebagaimana diubah dengan Peraturan Pemerintah Nomor 3 Tahun 2026. Fatwa DSN-MUI Nomor 75/DSN-MUI/VII/2009 menjadi pedoman nilainya.",
  ],
  [
    "p",
    "Kode Etik ini merupakan satu kesatuan dengan Rencana Pemasaran Mitrans-Astra versi 2.0 dan Syarat dan Ketentuan mitrans.id, termasuk Ketentuan Kemitraan.",
  ],

  ["h1", "Bab I. Ketentuan Umum"],
  ["h2", "Pasal 1. Pengertian"],
  [
    "ol",
    [
      "**Perusahaan** adalah PT MITRANS [nama lengkap ●], pemegang izin usaha penjualan langsung.",
      "**Mitra PLS** (Mitra Marketing Penggerak Literasi Syariah) adalah orang perseorangan yang terdaftar sebagai Penjual Langsung Mitrans-Astra.",
      "**Pelanggan** adalah pembeli Lisensi atau Atlas Membership yang bukan Mitra PLS.",
      "**Lisensi Atlas** adalah lisensi penggunaan perangkat lunak Mitrans-Astra untuk 1 orang, termasuk akses aplikasi 3 bulan.",
      "**Lisensi Atlas Family** adalah lisensi untuk 3 orang dewasa dalam satu keluarga (3 kursi), termasuk akses aplikasi 12 bulan untuk setiap kursi.",
      "**Lisensi** adalah Lisensi Atlas atau setiap kursi Lisensi Atlas Family.",
      "**Atlas Membership** adalah perpanjangan akses bulanan sesudah masa akses Lisensi berakhir; disebut juga Langganan.",
      "**Program Pendampingan 90 Hari** adalah pendampingan tanpa biaya selama 90 hari sejak aktivasi Lisensi pertama, sebagaimana diatur dalam Rencana Pemasaran.",
      "**Kalimat Panduan** adalah kalimat strategi membangun bisnis dalam Rencana Pemasaran bagian 4.2 beserta subjudulnya.",
      "**Sponsor** adalah Mitra PLS yang merujuk calon Mitra PLS atau Pelanggan.",
      "**Rencana Pemasaran** adalah dokumen yang mengatur komisi, bonus, dan syaratnya.",
      "**Kantor Maya** adalah halaman akun Mitra PLS di mitrans.id.",
      "**Tautan Rujukan** adalah tautan pribadi Mitra PLS di affiliatemarketing.network, domain resmi Perusahaan untuk rujukan dan halaman penawaran.",
      "**Identitas** adalah Nomor Induk Kependudukan (NIK).",
    ],
  ],
  ["h2", "Pasal 2. Ruang lingkup"],
  [
    "p",
    "Kode Etik ini mengatur hak, kewajiban, larangan, dan sanksi bagi Perusahaan dan Mitra PLS, serta perlindungan bagi Pelanggan.",
  ],

  ["h1", "Bab II. Keanggotaan"],
  ["h2", "Pasal 3. Persyaratan keanggotaan"],
  ["p", "Calon Mitra PLS harus:"],
  [
    "ol",
    [
      "berusia paling rendah 18 tahun atau sudah cakap hukum;",
      "memiliki KTP elektronik yang masih berlaku;",
      "memiliki rekening bank atas nama sendiri;",
      "memberikan data diri yang benar dan lengkap;",
      "tidak sedang menjalani sanksi pemutusan keanggotaan dari Perusahaan;",
      "membaca dan menyetujui Rencana Pemasaran, Kode Etik ini, serta Syarat dan Ketentuan.",
    ],
  ],
  [
    "p",
    "Satu Identitas hanya untuk satu akun. Sistem otomatis menolak NIK yang sudah terdaftar pada akun mana pun, termasuk kursi Lisensi Atlas Family yang masih menunggu verifikasi. Keanggotaan tidak dapat didaftarkan atas nama orang lain tanpa persetujuan dan verifikasi orang itu sendiri.",
  ],
  ["h2", "Pasal 4. Prosedur pendaftaran"],
  [
    "ol",
    [
      "Sebelum pendaftaran, calon Mitra PLS menerima keterangan tertulis dan lisan yang benar tentang identitas Perusahaan, produk, Rencana Pemasaran, dan Kode Etik. Halaman pendaftaran menampilkan dokumen-dokumen ini sebelum persetujuan diberikan.",
      "Pendaftaran dilakukan di mitrans.id, melalui tautan rujukan Sponsor di affiliatemarketing.network atau langsung.",
      "Calon Mitra PLS melakukan verifikasi identitas dan menyetujui Ketentuan Kemitraan secara elektronik, sendiri.",
      "Pendaftaran tidak dipungut biaya dan tidak mewajibkan pembelian barang apa pun.",
      "Mitra PLS menerima paket perdana digital tanpa biaya melalui Kantor Maya.",
      "Tautan rujukan Mitra PLS aktif setelah ia lulus kuis singkat tentang Kode Etik ini. Kuis tersedia di Kelas Kemitraan dan secara daring, tanpa biaya.",
      "Untuk Lisensi Atlas Family, kursi utama mendaftarkan nama dan NIK anggota keluarganya saat membeli paket, dengan persetujuan mereka. Setiap anggota kemudian memverifikasi identitas dan memberikan persetujuan sendiri paling lambat 30 hari; sebelum itu kursinya belum aktif. Penempatan kursi mengikuti Rencana Pemasaran bagian 5.6.",
    ],
  ],
  ["h2", "Pasal 5. Masa pertimbangan dan pembatalan keanggotaan"],
  [
    "ol",
    [
      "Mitra PLS baru memiliki masa pertimbangan 10 hari kerja sejak pendaftaran untuk melanjutkan atau membatalkan keanggotaan.",
      "Pembatalan dilakukan melalui Kantor Maya atau layanan pelanggan, tanpa perlu menyebutkan alasan.",
      "Lisensi yang dibeli dalam masa pertimbangan dikembalikan dananya: 100% bila Lisensi belum diaktifkan; atau dikurangi nilai akses yang sudah dipakai, dihitung harian dari Rp399.000 per bulan per kursi, bila Lisensi sudah diaktifkan.",
      "Komisi dan bonus yang timbul dari pembelian yang dibatalkan ditarik kembali dari penerimanya.",
      "Lisensi Atlas Family dikembalikan utuh per paket: dalam 10 hari kerja sejak pembelian paket dengan ketentuan angka 3, atau dalam 7 hari kerja dengan pengembalian penuh bila produk tidak sesuai yang diperjanjikan. Kursi yang belum diverifikasi dihapus dan NIK-nya dilepas.",
    ],
  ],
  ["h2", "Pasal 6. Masa berlaku dan pendaftaran ulang"],
  [
    "ol",
    [
      "Keanggotaan berlaku 1 tahun sejak tanggal pendaftaran.",
      "Keanggotaan diperpanjang tanpa biaya dengan konfirmasi data diri di Kantor Maya. Perpanjangan keanggotaan tidak mensyaratkan Atlas Membership.",
      "Bila konfirmasi belum dilakukan dalam 60 hari setelah masa berlaku berakhir, pembayaran komisi dan bonus ditunda sampai konfirmasi dilakukan. Hak yang sudah timbul tidak hilang karena keterlambatan ini.",
    ],
  ],
  ["h2", "Pasal 7. Pemutusan keanggotaan"],
  ["p", "Keanggotaan berakhir karena:"],
  [
    "ol",
    [
      "pengunduran diri Mitra PLS, yang dapat dilakukan kapan saja melalui Kantor Maya;",
      "pemutusan oleh Perusahaan sebagai sanksi berdasarkan Pasal 20;",
      "Mitra PLS meninggal dunia, kecuali dialihkan sesuai Pasal 8.",
    ],
  ],
  [
    "p",
    "Komisi dan bonus yang sudah menjadi hak sebelum keanggotaan berakhir tetap dibayarkan, kecuali komisi dan bonus yang diperoleh dari pelanggaran.",
  ],
  ["h2", "Pasal 8. Pengalihan keanggotaan"],
  [
    "ol",
    [
      "Keanggotaan tidak dapat diperjualbelikan.",
      "Keanggotaan dapat dialihkan kepada ahli waris bila Mitra PLS meninggal dunia, dengan bukti keterangan waris yang sah. Permohonan diajukan paling lambat 12 bulan sejak Mitra PLS meninggal dunia.",
      "Keanggotaan dapat dialihkan kepada suami/istri atau keluarga sedarah satu derajat atas permohonan Mitra PLS dan persetujuan Perusahaan, sekali dalam masa keanggotaan.",
      "Penerima pengalihan harus memenuhi Pasal 3 dan tidak memiliki keanggotaan lain.",
    ],
  ],

  ["h1", "Bab III. Hak dan Kewajiban"],
  ["h2", "Pasal 9. Hak Perusahaan"],
  [
    "ol",
    [
      "Menerima data diri Mitra PLS yang benar dan memverifikasinya.",
      "Menunda pembayaran komisi dan bonus yang sedang diperiksa karena dugaan pelanggaran, paling lama 30 hari, dengan pemberitahuan kepada Mitra PLS.",
      "Menjatuhkan sanksi sesuai Bab VI.",
      "Mengubah Rencana Pemasaran dan Kode Etik sesuai Pasal 24.",
    ],
  ],
  ["h2", "Pasal 10. Kewajiban Perusahaan"],
  [
    "ol",
    [
      "Memberikan keterangan yang benar tentang Perusahaan, produk, Rencana Pemasaran, dan Kode Etik.",
      "Menyediakan produk yang sesuai dengan keterangannya, berlabel dan berharga dalam Rupiah.",
      "Membayar komisi dan bonus sesuai Rencana Pemasaran, tepat waktu dan transparan, beserta rincian perhitungannya di Kantor Maya.",
      "Memberikan masa pertimbangan 10 hari kerja, menerima pengembalian produk dalam 7 hari kerja, dan melakukan pembelian kembali sesuai Bab IV.",
      "Menyelenggarakan Program Pendampingan 90 Hari, workshop sesuai Pasal 13, serta pembinaan dan pelatihan paling sedikit 1 kali dalam 1 tahun.",
      "Melindungi data pribadi Mitra PLS dan Pelanggan sesuai peraturan perundang-undangan.",
      "Menyediakan layanan pengaduan yang mudah dijangkau, menanggapi setiap pengaduan paling lambat 3 hari kerja, dan menyelesaikannya paling lambat 14 hari kerja.",
      "Menerbitkan pengungkapan penghasilan Mitra PLS setiap tahun.",
      "Menyediakan materi pemasaran resmi dan Pedoman Komunikasi (Lampiran) yang sesuai Kode Etik ini.",
      "Melaporkan kegiatan usaha dan perubahan dokumen kepada instansi yang berwenang.",
    ],
  ],
  ["h2", "Pasal 11. Hak Mitra PLS"],
  [
    "ol",
    [
      "Memperoleh keterangan yang benar dan lengkap sebelum dan selama menjadi Mitra PLS.",
      "Menerima komisi dan bonus sesuai Rencana Pemasaran.",
      "Melihat rincian perhitungan komisi, bonus, bonus yang ditahan, kemajuan Program Pendampingan 90 Hari, dan antrean Bonus Prestasi di Kantor Maya.",
      "Mengikuti pembinaan, Program Pendampingan 90 Hari, dan pelatihan.",
      "Membatalkan keanggotaan dalam masa pertimbangan, mengundurkan diri kapan saja, berhenti berlangganan Atlas Membership kapan saja, dan meminta pembelian kembali.",
      "Mengajukan keberatan atas sanksi dan perhitungan bonus paling lambat 30 hari setelah pembayaran.",
      "Mengakses, memperbaiki, dan meminta penghapusan data pribadinya sesuai peraturan perundang-undangan.",
    ],
  ],
  ["h2", "Pasal 12. Kewajiban Mitra PLS"],
  [
    "ol",
    [
      "Menjalankan usaha secara mandiri, jujur, dan sesuai Kode Etik ini. Mitra PLS bukan karyawan, agen, atau kuasa Perusahaan.",
      "Menjelaskan produk secara benar, termasuk bahwa Mitrans-Astra adalah alat analisis dan edukasi, bukan produk investasi, dan tidak memberikan sinyal beli/jual.",
      "Menjelaskan Rencana Pemasaran secara benar, termasuk bahwa penghasilan tidak dijamin dan bergantung pada penjualan dan pembinaan sendiri.",
      "Memakai materi pemasaran resmi Perusahaan, atau materi sendiri yang sudah disetujui Perusahaan, sesuai Pedoman Komunikasi.",
      "Mendampingi orientasi Pelanggan dan Mitra PLS baru yang ia rujuk.",
      "Mengarahkan semua pembayaran ke rekening resmi Perusahaan.",
      "Menjaga kerahasiaan data pribadi Pelanggan dan Mitra PLS lain yang ia ketahui.",
      "Memenuhi kewajiban perpajakan atas penghasilannya.",
      "Memberitahukan perubahan data diri paling lambat 14 hari setelah perubahan.",
    ],
  ],

  ["h1", "Bab IV. Perlindungan Pelanggan dan Mitra PLS"],
  ["h2", "Pasal 13. Program pembinaan"],
  [
    "ol",
    [
      "Perusahaan menyelenggarakan pelatihan dasar produk, etika pemasaran, dan pelindungan konsumen bagi setiap Mitra PLS baru.",
      "Perusahaan menyelenggarakan Program Pendampingan 90 Hari bagi setiap pemegang Lisensi, tanpa biaya.",
      "Setiap pemegang Lisensi berhak mengikuti 1 workshop pelatihan 2 hari tanpa biaya, serta kelas daring. Workshop berikutnya bersifat pilihan, daring tanpa biaya atau tatap muka dengan biaya yang diumumkan terpisah.",
      "Program Pendampingan 90 Hari dan workshop tidak dijual dan bukan bagian dari harga Lisensi. Penjelasan kemitraan di workshop tidak mewajibkan peserta mendaftar sebagai Mitra PLS.",
      "Perusahaan menyelenggarakan pelatihan lanjutan paling sedikit 1 kali dalam 1 tahun.",
      "Mitra PLS yang menerima Plan B wajib menjalankan paling sedikit 1 kegiatan pembinaan terkonfirmasi setiap bulan, sesuai Rencana Pemasaran.",
      "Materi pembinaan mengikuti kurikulum resmi Perusahaan.",
    ],
  ],
  ["h2", "Pasal 14. Jaminan produk dan layanan"],
  [
    "ol",
    [
      "Perusahaan menjamin produk sesuai dengan uraian di halaman produk dan Rencana Pemasaran.",
      "Perusahaan menyediakan dukungan teknis melalui layanan pelanggan pada [jam layanan ●].",
      "Gangguan layanan lebih dari 24 jam berturut-turut yang disebabkan Perusahaan diberi kompensasi berupa perpanjangan masa akses yang sama dengan lamanya gangguan.",
      "Pelanggan dapat mengembalikan produk dalam 7 hari kerja bila produk tidak sesuai dengan yang diperjanjikan, dan menerima pengembalian dana penuh.",
    ],
  ],
  ["h2", "Pasal 15. Jaminan pembelian kembali"],
  [
    "ol",
    [
      "Bila Mitra PLS mengundurkan diri atau diberhentikan, Perusahaan membeli kembali Lisensi milik Mitra PLS yang belum diaktifkan dan masih dapat dialihkan.",
      "Harga pembelian kembali adalah harga pembelian dikurangi biaya administrasi paling banyak 10%, dan dikurangi komisi dan bonus yang telah diterima Mitra PLS atas pembelian itu.",
      "Permohonan diajukan melalui Kantor Maya. Dana dibayarkan paling lambat 14 hari kerja setelah permohonan lengkap.",
    ],
  ],
  ["h2", "Pasal 16. Ganti rugi"],
  [
    "ol",
    [
      "Perusahaan memberikan kompensasi, ganti rugi, atau penggantian atas kerugian Mitra PLS atau Pelanggan yang timbul karena produk atau layanan tidak sesuai dengan yang diperjanjikan, atau karena kesalahan Perusahaan.",
      "Mitra PLS bertanggung jawab atas kerugian Pelanggan yang timbul karena keterangan tidak benar atau pelanggaran Kode Etik oleh Mitra PLS itu.",
      "Permohonan ganti rugi diajukan melalui layanan pengaduan disertai bukti. Perusahaan memberi keputusan paling lambat 14 hari kerja.",
    ],
  ],

  ["h1", "Bab V. Etika Pemasaran dan Larangan"],
  ["h2", "Pasal 17. Etika pemasaran"],
  ["p", "Dalam memasarkan Mitrans-Astra, Mitra PLS:"],
  [
    "ol",
    [
      "memperkenalkan diri sebagai Mitra PLS Mitrans-Astra, bukan karyawan Perusahaan;",
      "menghormati keputusan calon Pelanggan, termasuk keputusan untuk menolak;",
      "menghubungi orang hanya dengan persetujuannya, dan berhenti bila diminta;",
      "tidak memanfaatkan kedekatan keluarga, pertemanan, jabatan, atau hubungan keagamaan untuk menekan orang agar membeli;",
      "memastikan calon pembeli memahami, sebelum membeli: harga; masa akses 3 bulan (Lisensi Atlas) atau 12 bulan (Lisensi Atlas Family); Atlas Membership Rp399.000 per bulan sesudahnya yang dapat dihentikan kapan saja; bahwa Atlas Membership aktif menjadi syarat menerima bonus bagi Mitra PLS sesudah masa akses; serta hak pembatalan dan pengembalian;",
      "memakai Kalimat Panduan hanya sebagai pola kerja, selalu bersama subjudulnya, dan menjelaskan bahwa hasil setiap orang berbeda.",
    ],
  ],
  ["h2", "Pasal 18. Larangan bagi Mitra PLS"],
  ["p", "Mitra PLS dilarang:"],
  ["h3", "Tentang penghasilan dan produk"],
  [
    "ol",
    [
      "Menjanjikan, menjamin, atau memberi kesan pasti tentang penghasilan, termasuk menampilkan bukti transfer, gaya hidup, atau angka penghasilan untuk menarik orang bergabung.",
      'Menyatakan atau mengesankan bahwa Mitrans-Astra memberikan keuntungan investasi, sinyal beli/jual, atau "pasti untung".',
      "Memberikan rekomendasi beli/jual efek tertentu atas nama Mitrans-Astra.",
      "Mengaku memiliki izin, sertifikasi, atau dukungan dari OJK, MUI, Kementerian, atau lembaga lain yang tidak dimiliki Perusahaan.",
      "Memberi keterangan yang tidak sesuai dengan Rencana Pemasaran, Kode Etik, atau halaman produk.",
    ],
  ],
  ["h3", "Tentang perekrutan"],
  ["nl", 6, ["Mewajibkan calon Mitra PLS membeli produk untuk mendaftar.", "Menarik biaya apa pun dari calon Mitra PLS atau Pelanggan, termasuk biaya pelatihan atau pendaftaran.", "Merekrut orang yang berusia di bawah 18 tahun atau belum cakap hukum, atau membantu mereka melewati syarat usia.", "Mendaftarkan orang lain tanpa sepengetahuannya, memakai identitas orang lain, atau membuat akun fiktif.", "Membujuk Mitra PLS dari jaringan Sponsor lain untuk pindah jaringan.", "Merekrut Mitra PLS perusahaan penjualan langsung lain dengan menjelekkan perusahaan tersebut."]],
  ["h3", "Tentang penjualan dan bonus"],
  ["nl", 12, ["Membeli Lisensi atau Atlas Membership atas nama orang lain, atau dengan dana dari Mitra PLS lain, untuk memenuhi status aktif, peringkat, pasangan, atau bonus Program Pendampingan 90 Hari.","Menjual produk melalui lokapasar (online marketplace) atau saluran distribusi tidak langsung.","Menjual dengan harga berbeda dari harga resmi, atau memberikan potongan harga dari komisinya sendiri.","Menerima pembayaran ke rekening pribadi.","Menghimpun dana dari siapa pun, termasuk dengan janji bagi hasil, arisan, atau \"titip beli\".","Memanipulasi penempatan jaringan, data penjualan, atau konfirmasi kegiatan pembinaan."]],
  ["h3", "Tentang data dan merek"],
  ["nl", 18, ["Menggunakan atau menyebarkan data pribadi orang lain tanpa izin.", "Mengirim pesan massal tanpa persetujuan penerima.", "Memakai merek, logo, dan nama Mitrans-Astra atau Atlas di luar pedoman Perusahaan, termasuk membuat situs, akun media sosial, atau iklan berbayar yang mengesankan sebagai akun resmi Perusahaan."]],
  ["h3", "Tentang Kalimat Panduan, ilustrasi, dan Lisensi Atlas Family"],
  ["nl", 21, ["Memakai Kalimat Panduan tanpa subjudulnya, atau mengubahnya sehingga terkesan ada bonus dari mengajak atau mendaftarkan orang.","Menyatakan atau mengesankan \"pasti balik modal\", \"modal kembali dalam 90 hari\", atau janji serupa, termasuk mengutip angka simulasi Rencana Pemasaran tanpa asumsi dan pernyataan bahwa angka itu bukan janji.","Memakai ilustrasi batas atas penghasilan (Rencana Pemasaran bagian 10.4), termasuk angka Rp1 miliar per bulan, dalam iklan, media sosial, presentasi perekrutan, atau materi promosi apa pun.","Mendaftarkan kursi Lisensi Atlas Family untuk orang yang tidak memenuhi Pasal 3, yang tidak mendaftar dan menyetujui sendiri, atau yang bukan anggota keluarga yang sebenarnya, untuk mengisi kaki, pasangan, atau peringkat.","Menawarkan Lisensi Atlas Family dengan kalimat \"beli satu dapat tiga posisi\" atau sejenisnya. Paket ini dijelaskan sebagai lisensi untuk 3 orang dewasa dalam satu keluarga."]],
  ["h2", "Pasal 19. Larangan bagi Perusahaan"],
  ["p", "Perusahaan dilarang:"],
  [
    "ol",
    [
      "memberikan keterangan yang tidak benar tentang produk atau Rencana Pemasaran;",
      "memaksa atau menekan Mitra PLS dan Pelanggan;",
      "mewajibkan pembelian barang saat pendaftaran, untuk mempertahankan keanggotaan, atau untuk mencapai peringkat;",
      "memberikan komisi atau bonus dari pendaftaran atau perekrutan;",
      "menjual langsung kepada konsumen tanpa melalui Mitra PLS;",
      "menghimpun dana masyarakat;",
      "memasarkan produk yang tidak tercantum dalam Rencana Pemasaran, termasuk menjual jasa pendampingan atau workshop melalui jaringan;",
      "mencantumkan klausul baku yang bertentangan dengan peraturan perlindungan konsumen.",
    ],
  ],

  ["h1", "Bab VI. Sanksi"],
  ["h2", "Pasal 20. Jenis sanksi"],
  ["p", "Sesuai berat ringannya pelanggaran, Perusahaan dapat menjatuhkan:"],
  [
    "ol",
    [
      "teguran tertulis;",
      "penundaan pembayaran komisi dan bonus selama pemeriksaan;",
      "penarikan komisi dan bonus yang diperoleh dari pelanggaran;",
      "pembekuan keanggotaan paling lama 3 bulan;",
      "pemutusan keanggotaan.",
    ],
  ],
  [
    "p",
    "Pelanggaran Pasal 18 angka 1, 2, 4, 9, 12, 15, 16, 22, atau 24 dapat langsung dikenai pemutusan keanggotaan. Pelanggaran Pasal 18 angka 21, 23, atau 25 dikenai teguran tertulis dan kewajiban menarik materi; pengulangan dapat dikenai pembekuan atau pemutusan.",
  ],
  ["h2", "Pasal 21. Tata cara"],
  [
    "ol",
    [
      "Perusahaan memberitahukan dugaan pelanggaran secara tertulis beserta buktinya.",
      "Mitra PLS berhak memberikan penjelasan dalam 14 hari sejak pemberitahuan.",
      "Perusahaan memutuskan paling lambat 14 hari setelah penjelasan diterima, dengan alasan tertulis.",
      "Mitra PLS dapat mengajukan keberatan sekali dalam 14 hari setelah keputusan. Keberatan diperiksa oleh pejabat Perusahaan yang tidak terlibat dalam keputusan pertama.",
    ],
  ],

  ["h1", "Bab VII. Penyelesaian Perselisihan"],
  ["h2", "Pasal 22. Musyawarah dan mediasi"],
  [
    "ol",
    [
      "Perselisihan antara Mitra PLS dan Perusahaan, atau antar-Mitra PLS, diselesaikan lebih dulu secara musyawarah dalam 30 hari.",
      "Bila musyawarah tidak berhasil, para pihak dapat meminta mediasi melalui asosiasi penjualan langsung tempat Perusahaan menjadi anggota.",
    ],
  ],
  ["h2", "Pasal 23. Penyelesaian lanjutan"],
  [
    "ol",
    [
      "Bila mediasi tidak berhasil, perselisihan diselesaikan melalui [pilih salah satu ●: Badan Arbitrase Syariah Nasional (BASYARNAS) / Pengadilan Negeri ●].",
      "Pelanggan tetap berhak menempuh penyelesaian sengketa konsumen melalui Badan Penyelesaian Sengketa Konsumen (BPSK) atau pengadilan, sesuai Undang-Undang Perlindungan Konsumen.",
      "Kode Etik ini tunduk pada hukum Republik Indonesia.",
    ],
  ],

  ["h1", "Bab VIII. Penutup"],
  ["h2", "Pasal 24. Perubahan Kode Etik"],
  [
    "ol",
    [
      "Perubahan Kode Etik diberitahukan kepada Mitra PLS melalui Kantor Maya dan surel paling lambat 30 hari sebelum berlaku.",
      "Perubahan diverifikasi asosiasi dan dilaporkan sesuai ketentuan perizinan.",
      "Mitra PLS yang tidak menyetujui perubahan dapat mengundurkan diri dan meminta pembelian kembali sesuai Pasal 15.",
      "Perubahan tidak mengurangi hak yang sudah timbul sebelum perubahan berlaku.",
    ],
  ],
  ["h2", "Pasal 25. Berlaku"],
  [
    "p",
    "Kode Etik ini berlaku sejak [tanggal ●] dan dibuat dalam Bahasa Indonesia.",
  ],
  ["p", "[Kota ●], [tanggal ●]"],
  ["p", "PT MITRANS"],
  ["p", "[Nama ●]"],
  ["p", "[Jabatan ●]"],

  ["h1", "Lampiran. Pedoman Komunikasi"],
  [
    "p",
    "Pedoman ini menjabarkan Pasal 17 dan Pasal 18. Mitra PLS boleh memakai kalimat di kolom kiri, dan dilarang memakai kalimat di kolom kanan atau yang bermakna sama.",
  ],
  ["h2", "1. Kalimat Panduan"],
  ["p", "Kalimat Panduan selalu ditulis atau diucapkan bersama subjudulnya:"],
  [
    "box",
    [
      ["center", `**"${HEADLINE}"**`],
      ["center", `_${SUBTITLE}_`],
    ],
  ],
  ["h2", "2. Kalimat yang disetujui dan yang dilarang"],
  [
    "table",
    ["Boleh", "Dilarang"],
    [
      [
        '"Lisensi Atlas Rp7,5 juta memberi akses aplikasi 3 bulan, lengkap dengan Program Pendampingan 90 Hari dan workshop tanpa biaya."',
        '"Bayar Rp7,5 juta, dapat pelatihan dan akses seumur hidup."',
      ],
      [
        '"Mulai bulan ke-4, akses dilanjutkan dengan Atlas Membership Rp399.000 per bulan, dan dapat dihentikan kapan saja."',
        '"Setelah beli Lisensi tidak ada biaya lagi."',
      ],
      [
        '"Setiap Lisensi yang Anda jual dalam 90 hari pertama memberi Bonus Sponsor Rp750.000 dan Fast Start Rp1.000.000. Hasil setiap orang berbeda."',
        '"Pasti balik modal dalam 90 hari." / "Modal Rp7,5 juta kembali dalam 3 bulan."',
      ],
      [
        '"Bonus hanya timbul dari penjualan produk yang lunas, bukan dari pendaftaran."',
        '"Ajak 2 orang, langsung dapat bonus." / "Daftarkan orang, dapat uang."',
      ],
      [
        '"Lisensi Atlas Family adalah lisensi untuk 3 orang dewasa dalam satu keluarga, dengan akses 12 bulan."',
        '"Beli satu dapat tiga posisi." / "Daftarkan nama siapa saja untuk mengisi kaki."',
      ],
      [
        '"Mitrans-Astra adalah alat analisis dan edukasi pasar modal syariah. Keputusan investasi tetap di tangan Anda."',
        '"Pakai Mitrans-Astra pasti untung." / "Ada sinyal beli dan jual."',
      ],
      [
        '"Perusahaan menerbitkan ringkasan penghasilan Mitra PLS setiap tahun; silakan baca sebelum memutuskan."',
        "Menampilkan bukti transfer, mobil, rumah, atau angka Rp1 miliar per bulan untuk menarik orang bergabung.",
      ],
    ],
    [1, 1],
  ],
  ["h2", "3. Mengutip angka simulasi"],
  [
    "ul",
    [
      'Angka simulasi Rencana Pemasaran Bab 10 hanya boleh dikutip dalam penjelasan Rencana Pemasaran secara lengkap, bersama asumsinya dan kalimat: "Angka ini ilustrasi cara menghitung, bukan janji atau perkiraan penghasilan."',
      "Ilustrasi batas atas (bagian 10.4) tidak boleh dikutip di luar Rencana Pemasaran.",
      "Materi pemasaran buatan sendiri diajukan ke Perusahaan melalui Kantor Maya dan baru dipakai setelah disetujui.",
    ],
  ],
];

write(path.join(OUT_DIR, "Kode_Etik_Mitra_PLS_Mitrans-Astra_v2.0_DRAF.docx"), {
  title: "Kode Etik Mitra PLS Mitrans-Astra v2.0",
  coverLines: [
    ["PT MITRANS", 28, { bold: true, after: 400 }],
    ["Kode Etik Mitra PLS Mitrans-Astra", 44, { bold: true }],
    [
      "Pedoman perilaku, hak, kewajiban, dan perlindungan bagi Mitra PLS dan Pelanggan",
      24,
      { after: 400 },
    ],
    [
      "Disusun berdasarkan Permendag 70/2019 Pasal 9 dan PP 29/2021 sebagaimana diubah dengan PP 3/2026",
      20,
    ],
    ["Untuk ditayangkan di mitrans.id dan disertakan dalam pengajuan izin", 20],
    ["Versi 2.0 · 29 Oktober 2026", 22, { bold: true, after: 600 }],
    [
      "DRAF: untuk ditinjau konsultan hukum dan diverifikasi asosiasi penjualan langsung sebelum diberlakukan.",
      20,
      { color: "C00000" },
    ],
  ],
  blocks,
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
