import { Link } from "react-router-dom";
import { PLAN } from "../../engine";
import { rp } from "../format";
import { Headline, Logo, ProtoRibbon } from "../components/ui";

/*
 * Copy halaman depan mengikuti Kode Etik Pasal 17–18:
 * tanpa janji penghasilan, tanpa klaim keuntungan investasi atau sinyal beli/jual,
 * tanpa testimoni, statistik, atau kelangkaan yang dikarang.
 */

const Icon = ({ d }: { d: string }) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

const FEATURES = [
  {
    t: "Data & grafik terkurasi",
    d: "Harga, volume, dan riwayat transaksi saham syariah disajikan bersama tanggal dan sumber datanya.",
    i: "M3 3v18h18M7 15l4-4 3 3 5-6",
  },
  {
    t: "Penyaring (screener)",
    d: "Saring efek berdasarkan kriteria yang Anda tentukan sendiri. Status syariah mengacu Daftar Efek Syariah OJK.",
    i: "M4 5h16M7 12h10M10 19h4",
  },
  {
    t: "Materi edukasi bertahap",
    d: "Belajar membaca laporan keuangan, valuasi, dan risiko: satu konsep, satu contoh, satu latihan.",
    i: "M4 19V5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2zM8 7h6",
  },
  {
    t: "Workshop 2 hari setiap bulan",
    d: "Bagi pemegang Lisensi, tanpa biaya, serta kelas daring pengganti bagi yang berhalangan.",
    i: "M17 20h5v-2a4 4 0 0 0-5-3.9M9 20H2v-2a4 4 0 0 1 7-2.6M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  },
  {
    t: "Pendampingan orientasi 7 hari",
    d: "Mitra PLS yang menjual mendampingi aktivasi akun, pengenalan fitur, dan etika penggunaan.",
    i: "M20 6 9 17l-5-5",
  },
  {
    t: "Keputusan tetap milik Anda",
    d: "Tidak ada sinyal beli/jual, tidak ada transaksi otomatis, tidak ada pengelolaan dana.",
    i: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  },
];

const STEPS = [
  {
    t: "Penjelasan awal",
    d: "Anda menerima keterangan tertulis tentang Perusahaan, produk, Rencana Pemasaran, dan Kode Etik.",
  },
  {
    t: "Daftar di mitrans.id",
    d: "Verifikasi identitas. Satu NIK untuk satu akun. Pendaftaran Mitra PLS Rp0.",
  },
  {
    t: "Pembelian & aktivasi",
    d: "Bayar hanya ke rekening resmi Perusahaan. Lisensi aktif setelah pembayaran diterima.",
  },
  {
    t: "Orientasi & belajar",
    d: "Pendampingan 7 hari, workshop bulanan, lalu Langganan mulai bulan ke-4 bila Anda memilih melanjutkan.",
  },
];

const FAQ = [
  {
    q: "Apakah Mitrans-Astra memberi sinyal beli atau jual saham?",
    a: "Tidak. Mitrans-Astra adalah alat bantu analisis dan edukasi. Platform tidak memberi rekomendasi atau sinyal beli/jual, tidak bertransaksi atas nama Anda, dan tidak mengelola dana. Investasi saham mengandung risiko, termasuk kehilangan sebagian atau seluruh modal.",
  },
  {
    q: "Apakah saya wajib membeli Lisensi untuk menjadi Mitra PLS?",
    a: "Tidak. Pendaftaran Mitra PLS gratis dan tidak mewajibkan pembelian apa pun. Mitra PLS tanpa Lisensi tetap boleh memasarkan dan menerima Bonus Sponsor serta Bonus Layanan Berkah. Posisi jaringan biner diberikan saat Lisensi pertama diaktifkan.",
  },
  {
    q: "Berapa penghasilan seorang Mitra PLS?",
    a: "Tidak ada jaminan penghasilan. Komisi dan bonus hanya timbul dari penjualan Lisensi dan Langganan yang nyata, bukan dari perekrutan. Perusahaan menerbitkan ringkasan penghasilan Mitra PLS setiap tahun: median, sebaran, dan porsi yang tidak menerima bonus.",
  },
  {
    q: "Bagaimana jika saya berubah pikiran?",
    a: "Mitra PLS baru memiliki masa pertimbangan 10 hari kerja. Pelanggan dapat meminta pengembalian dalam 7 hari kerja bila produk tidak sesuai dengan yang diperjanjikan. Langganan dapat dihentikan kapan saja melalui akun.",
  },
  {
    q: "Ke mana saya membayar?",
    a: "Hanya ke rekening atau kanal pembayaran resmi Perusahaan yang tertera di halaman pembayaran. Jangan membayar ke rekening pribadi siapa pun, termasuk Mitra PLS. Perusahaan tidak pernah meminta kata sandi atau OTP Anda.",
  },
];

export function Landing() {
  return (
    <div className="lp">
      <ProtoRibbon />
      <nav className="lp-nav">
        <div className="lp-wrap">
          <Link to="/">
            <Logo />
          </Link>
          <div className="lp-links">
            <a href="#produk">Produk</a>
            <a href="#harga">Harga</a>
            <a href="#kemitraan">Kemitraan</a>
            <a href="#alur">Alur</a>
            <a href="#faq">Tanya Jawab</a>
          </div>
          <Link className="btn btn-ghost btn-sm" to="/mitra">
            Kantor Maya
          </Link>
        </div>
      </nav>

      <header className="hero">
        <div className="lp-wrap hero-grid">
          <div>
            <span className="eyebrow">
              Platform Analisa Transaksi Saham Syariah
            </span>
            <h1>
              Memahami pasar modal syariah, <em>dengan jujur</em> dan
              bertanggung jawab.
            </h1>
            <p className="lead">
              Mitrans-Astra menyajikan data, alat analisis, dan materi edukasi
              untuk membantu keluarga Indonesia mengambil keputusan dengan
              pemahaman, bukan ikut-ikutan.
            </p>
            <div className="hero-cta">
              <a className="btn btn-gold" href="#harga">
                Lihat harga & isi Lisensi
              </a>
              <Link className="btn btn-ghost" to="/daftar">
                Jadi Mitra PLS · Gratis
              </Link>
            </div>
            <p className="hero-note">
              Bukan produk investasi · Tanpa sinyal beli/jual · Keputusan
              investasi sepenuhnya milik Anda
            </p>
          </div>
          <div
            className="glass hero-card"
            aria-label="Ilustrasi tampilan platform"
          >
            <div className="hc-top">
              <span>Ruang Belajar</span>
              <span className="chip">Ilustrasi tampilan</span>
            </div>
            <div className="hc-title">Membaca volume transaksi</div>
            <div className="mock-chart" aria-hidden="true">
              {[38, 52, 44, 61, 57, 72, 66, 80, 74, 88, 70, 92].map((h, i) => (
                <span key={i} style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="hc-rows">
              <div className="hc-row">
                <span>Modul aktif</span>
                <b>Fundamental 2 · Rasio utang</b>
              </div>
              <div className="hc-row">
                <span>Status syariah</span>
                <b>Mengacu DES OJK + tanggal data</b>
              </div>
              <div className="hc-row">
                <span>Latihan berikutnya</span>
                <b>Bandingkan 2 emiten</b>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="trust">
        <div className="lp-wrap">
          <div>
            <b>Rp0</b>Pendaftaran Mitra PLS, tanpa kewajiban membeli
          </div>
          <div>
            <b>10 hari kerja</b>Masa pertimbangan Mitra PLS baru
          </div>
          <div>
            <b>7 hari kerja</b>Pengembalian bila produk tidak sesuai
          </div>
          <div>
            <b>Rekening resmi</b>Pembayaran hanya ke Perusahaan
          </div>
        </div>
      </div>

      <section className="section" id="produk">
        <div className="lp-wrap">
          <div className="sec-head">
            <span className="eyebrow">Produk</span>
            <h2>Satu produk, dirancang untuk belajar dengan tenang</h2>
            <p>
              Lisensi penggunaan perangkat lunak Mitrans-Astra: data, alat
              analisis, dan kurikulum edukasi pasar modal syariah.
            </p>
          </div>
          <div className="grid-3">
            {FEATURES.map((f) => (
              <div className="feature" key={f.t}>
                <div className="ic">
                  <Icon d={f.i} />
                </div>
                <h3>{f.t}</h3>
                <p>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt" id="harga">
        <div className="lp-wrap">
          <div className="sec-head">
            <span className="eyebrow">Harga</span>
            <h2>Harga yang sama untuk semua, tercantum jelas</h2>
            <p>
              Harga sudah termasuk PPN dan berlaku sama bagi Mitra PLS maupun
              Pelanggan. Tidak ada opsi tahunan.
            </p>
          </div>
          <div className="grid-2">
            <div className="price-card featured">
              <span className="chip tag">Mulai di sini</span>
              <h3>Lisensi Mitrans-Astra</h3>
              <div className="muted" style={{ color: "#a8b8af" }}>
                Termasuk akses {PLAN.license.accessMonths} bulan sejak aktivasi
              </div>
              <div className="price">
                {rp(PLAN.license.price)} <small>sekali bayar</small>
              </div>
              <ul>
                <li>Seluruh fitur data, grafik, dan penyaring</li>
                <li>Materi edukasi dan latihan bertahap</li>
                <li>Pendampingan orientasi 7 hari oleh Mitra PLS</li>
                <li>Lisensi dapat dialihkan melalui aplikasi</li>
              </ul>
              <p className="fineprint">
                Dasar pengenaan pajak {rp(PLAN.license.netPrice)} + PPN{" "}
                {rp(PLAN.license.vat)}. Workshop bulanan tanpa biaya dan bukan
                bagian dari harga Lisensi.
              </p>
            </div>
            <div className="price-card plain">
              <h3>Langganan</h3>
              <div className="muted" style={{ color: "#a8b8af" }}>
                Perpanjangan akses mulai bulan ke-4
              </div>
              <div className="price">
                {rp(PLAN.subscription.price)} <small>per bulan</small>
              </div>
              <ul>
                <li>Hanya bila Anda menyetujuinya secara tegas</li>
                <li>Pengingat paling lambat 3 hari sebelum tagihan</li>
                <li>Berhenti kapan saja melalui akun</li>
                <li>Akses berjalan sampai akhir periode yang dibayar</li>
              </ul>
              <p className="fineprint">
                Langganan tanpa Lisensi belum tersedia.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="kemitraan">
        <div className="lp-wrap">
          <div className="sec-head">
            <span className="eyebrow">Mitra PLS</span>
            <h2>Mitra Marketing Penggerak Literasi Syariah</h2>
            <p>
              Penjualan langsung yang menghargai kerja nyata: penghasilan hanya
              dari penjualan produk kepada pemakai, bukan dari perekrutan.
            </p>
          </div>
          <div className="values">
            {[
              {
                ar: "shiddiq",
                t: "Jujur",
                d: "Setiap keterangan kepada calon Mitra PLS dan Pelanggan benar dan lengkap.",
              },
              {
                ar: "amanah",
                t: "Amanah",
                d: "Menjaga dana, data pribadi, dan kepercayaan orang lain.",
              },
              {
                ar: "'adl",
                t: "Adil",
                d: "Penghasilan dari kerja nyata, tidak merugikan anggota yang bergabung kemudian.",
              },
              {
                ar: "manfaat",
                t: "Bermanfaat",
                d: "Produk benar-benar membantu pemakainya belajar dan memutuskan.",
              },
            ].map((v) => (
              <div className="value" key={v.t}>
                <div className="ar">{v.ar}</div>
                <h4>{v.t}</h4>
                <p>{v.d}</p>
              </div>
            ))}
          </div>

          <Headline tone="dark" />
          <p className="hero-note" style={{ marginTop: 0 }}>
            Bonus Balik Modal {rp(PLAN.balikModalBonus)} diberikan bila dalam{" "}
            {PLAN.program90Days} hari Anda menjual {PLAN.balikModalPersonal}{" "}
            Lisensi dan tim Anda menjual {PLAN.balikModalTeam} Lisensi.
          </p>
          <div className="plan-split">
            <div className="plan-box">
              <h3>Plan A</h3>
              <div className="src">Dari penjualan Lisensi</div>
              <div className="plan-row">
                <span>Bonus Sponsor</span>
                <span>
                  {rp(PLAN.sponsorBonus)} per Lisensi yang dijual langsung
                </span>
              </div>
              <div className="plan-row">
                <span>Bonus Layanan Berkah</span>
                <span>
                  {rp(PLAN.berkahBonus)} setelah pendampingan dikonfirmasi
                </span>
              </div>
              <div className="plan-row">
                <span>Program 90 hari</span>
                <span>
                  Fast Start {rp(PLAN.fastStartBonus)} per Lisensi · Pendamping{" "}
                  {rp(PLAN.pendampingBonus)} · Balik Modal{" "}
                  {rp(PLAN.balikModalBonus)}
                </span>
              </div>
              <div className="plan-row">
                <span>Bonus Pasangan · Pembinaan</span>
                <span>Dari jaringan biner, sampai 10 level</span>
              </div>
              <div className="plan-row">
                <span>Prestasi Peringkat · Leadership · Pool Aktif</span>
                <span>Dari dana bulanan, dengan batas</span>
              </div>
            </div>
            <div className="plan-box">
              <h3>Plan B</h3>
              <div className="src">Dari Langganan bulanan</div>
              <div className="plan-row">
                <span>Komisi Langganan</span>
                <span>
                  {rp(PLAN.subscriptionCommission)} per Langganan per bulan
                </span>
              </div>
              <div className="plan-row">
                <span>Pasangan Langganan</span>
                <span>{PLAN.roPairBp / 100}% × PV kaki kecil × Rp100.000</span>
              </div>
              <div className="plan-row">
                <span>Royalti Langganan</span>
                <span>Dana 3% omzet bersih Langganan</span>
              </div>
              <div className="plan-row">
                <span>Syarat</span>
                <span>
                  Langganan aktif + 1 kegiatan pembinaan terkonfirmasi
                </span>
              </div>
            </div>
          </div>
          <div className="disclaimer">
            <b>Tidak ada jaminan penghasilan.</b> Komisi dan bonus berasal dari
            penjualan dan pembinaan nyata, dengan syarat aktif bulanan, plafon,
            dan batas per orang. Baca seluruh ketentuannya sebelum memutuskan.{" "}
            <Link
              to="/aturan"
              style={{ color: "#f3dfae", textDecoration: "underline" }}
            >
              Ringkasan aturan lengkap →
            </Link>
          </div>
        </div>
      </section>

      <section className="section section-alt" id="alur">
        <div className="lp-wrap">
          <div className="sec-head">
            <span className="eyebrow">Alur</span>
            <h2>Dari penjelasan sampai belajar mandiri</h2>
          </div>
          <div className="steps">
            {STEPS.map((s) => (
              <div className="step" key={s.t}>
                <h4>{s.t}</h4>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="faq">
        <div className="lp-wrap" style={{ maxWidth: 860 }}>
          <div className="sec-head">
            <span className="eyebrow">Tanya Jawab</span>
            <h2>Hal yang perlu Anda ketahui lebih dulu</h2>
          </div>
          <div className="faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="lp-wrap">
          <div className="cta-band">
            <span className="eyebrow">Bertumbuh · Berdaya · Bermanfaat</span>
            <h2>Mulai dari memahami, bukan dari janji</h2>
            <p>
              Baca Rencana Pemasaran, Kode Etik, serta Syarat dan Ketentuan.
              Bila sesuai, daftar sebagai Mitra PLS tanpa biaya.
            </p>
            <div className="hero-cta" style={{ justifyContent: "center" }}>
              <Link className="btn btn-gold" to="/daftar">
                Daftar Mitra PLS
              </Link>
              <Link className="btn btn-ghost" to="/aturan">
                Baca aturan
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="cols">
            <div>
              <Logo />
              <p style={{ marginTop: 14, maxWidth: 360 }}>
                PT MITRANS [nama lengkap ●]. Alamat [●]. NIB [●]. Izin usaha
                penjualan langsung [●]. Anggota asosiasi penjualan langsung [●].
              </p>
            </div>
            <div>
              <h5>Situs resmi</h5>
              <a href="#produk">mitrans.id</a>
              <a href="#kemitraan">affiliatemarketing.network</a>
            </div>
            <div>
              <h5>Dokumen</h5>
              <Link to="/aturan">Rencana Pemasaran</Link>
              <Link to="/aturan#kode-etik">Kode Etik Mitra PLS</Link>
              <Link to="/aturan#syarat">Syarat dan Ketentuan</Link>
            </div>
            <div>
              <h5>Pengaduan</h5>
              <a href="#faq">Telepon/WhatsApp [●]</a>
              <a href="#faq">Surel [●]</a>
              <span>Ditanggapi paling lambat 3 hari kerja</span>
            </div>
          </div>
          <p>
            Investasi saham mengandung risiko, termasuk kehilangan sebagian atau
            seluruh modal. Kinerja masa lalu tidak menjamin hasil di masa depan.
            Mitrans-Astra bukan perusahaan efek, manajer investasi, maupun
            penasihat investasi.
          </p>
        </div>
      </footer>
    </div>
  );
}
