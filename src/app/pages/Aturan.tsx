import { PLAN, perLicenseUpperBounds } from "../../engine";
import { pct, rp } from "../format";
import { Headline, ProtoRibbon, TopBar } from "../components/ui";

/** Ringkasan aturan dibangun dari konstanta engine yang sama, agar halaman dan perhitungan tidak berbeda. */
export function Aturan() {
  const b = perLicenseUpperBounds();
  return (
    <>
      <ProtoRibbon />
      <TopBar />
      <div className="page">
        <div className="page-head">
          <h1>Ringkasan Aturan Mitra PLS</h1>
          <p className="muted">
            Diringkas dari Rencana Pemasaran v{PLAN.version}, Kode Etik v1.2,
            serta Syarat dan Ketentuan v1.2 (draf 27 Oktober 2026). Ringkasan
            ini bukan pengganti dokumen resmi.
          </p>
        </div>

        <div className="card">
          <h2>1. Prinsip</h2>
          <ul>
            <li>
              Penghasilan hanya dari penjualan nyata Lisensi dan Langganan.
              Tidak ada komisi dari pendaftaran atau perekrutan.
            </li>
            <li>
              Pendaftaran Mitra PLS gratis (Rp0) dan tidak mewajibkan pembelian.
            </li>
            <li>
              Mitrans-Astra adalah alat analisis dan edukasi, bukan produk
              investasi; tanpa sinyal beli/jual.
            </li>
            <li>Tidak ada janji atau jaminan penghasilan.</li>
          </ul>
        </div>

        <div className="card">
          <h2>2. Produk dan poin</h2>
          <table className="t">
            <thead>
              <tr>
                <th>Produk</th>
                <th className="r">Harga (termasuk PPN)</th>
                <th className="r">Omzet bersih</th>
                <th className="r">PV</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Lisensi Atlas (akses 3 bulan, termasuk Program Pendampingan 90 Hari dan 1 workshop tanpa biaya)</td>
                <td className="r num">{rp(PLAN.license.price)}</td>
                <td className="r num">{rp(PLAN.license.netPrice)}</td>
                <td className="r num">{PLAN.license.pvTenths / 10}</td>
              </tr>
              <tr>
                <td>{PLAN.subscription.name} (per bulan, mulai bulan ke-4: AI analisa bulanan dan alat duplikasi)</td>
                <td className="r num">{rp(PLAN.subscription.price)}</td>
                <td className="r num">{rp(PLAN.subscription.netPrice)}</td>
                <td className="r num">{PLAN.subscription.pvTenths / 10}</td>
              </tr>
            </tbody>
          </table>
          <p className="muted">
            1 PV setara {rp(PLAN.rupiahPerPv)} omzet bersih, hanya untuk
            menghitung komisi dan bonus.
          </p>
        </div>

        <div className="card">
          <h2>3. Plan A — dari penjualan Lisensi</h2>
          <Headline />
          <table className="t">
            <thead>
              <tr>
                <th>Bonus</th>
                <th>Nominal</th>
                <th>Batas / syarat utama</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Sponsor</td>
                <td>
                  {rp(PLAN.sponsorBonus)} per Lisensi yang dijual langsung
                </td>
                <td>
                  Lunas, tidak dibatalkan; pemegang Lisensi bulan ke-4+ wajib
                  Langganan aktif
                </td>
              </tr>
              <tr>
                <td>Fast Start</td>
                <td>{rp(PLAN.fastStartBonus)} per Lisensi</td>
                <td>
                  Dijual dalam {PLAN.program90Days} hari pertama sejak aktivasi
                  Lisensi penjual; Lisensi pertama pembeli; dibayar Jumat setelah{" "}
                  {PLAN.refundWorkdays} hari kerja
                </td>
              </tr>
              <tr>
                <td>Pendamping</td>
                <td>{rp(PLAN.pendampingBonus)} sekali per Mitra binaan</td>
                <td>
                  Kepada Sponsor, saat Mitra binaan menjual Lisensi pertamanya
                  dalam {PLAN.program90Days} hari pertamanya
                </td>
              </tr>
              <tr>
                <td>Layanan Berkah</td>
                <td>
                  {rp(PLAN.berkahBonus)} per Lisensi kepada Pelanggan (termasuk
                  yang dikonversi)
                </td>
                <td>
                  Konfirmasi orientasi + lewat {PLAN.berkahMaturityDays} hari;
                  tanpa konfirmasi {PLAN.berkahConfirmDeadlineDays} hari → Pool
                  Aktif
                </td>
              </tr>
              <tr>
                <td>Pasangan</td>
                <td>{rp(PLAN.pairBonus)} per pasangan (1 kiri + 1 kanan)</td>
                <td>
                  Volume 10 level; {PLAN.pairDailyCap} pasangan per hari; sisa
                  unit dibawa
                </td>
              </tr>
              <tr>
                <td>Pembinaan</td>
                <td>
                  Generasi sponsor 1–3:{" "}
                  {pct(PLAN.pembinaanRatesBp[0] / 10_000, 0)}; 4–6:{" "}
                  {pct(PLAN.pembinaanRatesBp[3] / 10_000, 0)} dari Bonus Pasangan
                </td>
                <td>Hanya Mitra PLS pemegang Lisensi</td>
              </tr>
              <tr>
                <td>Prestasi Peringkat</td>
                <td>
                  12 peringkat bulanan, {rp(PLAN.monthlyRanks[1].reward)} sampai{" "}
                  {rp(PLAN.monthlyRanks[PLAN.monthlyRanks.length - 1].reward)}
                </td>
                <td>
                  Sekali per peringkat setelah {PLAN.rankVerifyMonths} bulan
                  terverifikasi; dana {PLAN.rankFundBp / 100}% omzet bersih
                  Lisensi; antrean; &gt;6 bulan dari dana cadangan
                </td>
              </tr>
              <tr>
                <td>Leadership</td>
                <td>
                  Dana {PLAN.leadershipFundBp / 100}% omzet bersih Lisensi, dibagi
                  menurut bobot peringkat bulan itu (Director 1 sampai Royal
                  Crown 8)
                </td>
                <td>
                  Mitra aktif yang memelihara peringkat;{" "}
                  {rp(PLAN.leadershipPersonalMonthlyCap)} per orang per bulan
                </td>
              </tr>
              <tr>
                <td>Pool Aktif</td>
                <td>
                  Sebanding penjualan baru pribadi Mitra PLS aktif, paling banyak{" "}
                  {rp(PLAN.poolMaxPerSale)} per penjualan
                </td>
                <td>
                  Sumber: bonus hangus, sisa dana peringkat/leadership,
                  kelebihan batas, Berkah tak terkonfirmasi, dan pengisian sampai{" "}
                  {pct(PLAN.poolTargetBp / 10_000, 0)} omzet bersih Lisensi
                </td>
              </tr>
            </tbody>
          </table>
          <h3>Peringkat bulanan (volume per kaki dalam 10 level, paket setara per bulan)</h3>
          <table className="t">
            <thead>
              <tr>
                <th>Peringkat</th>
                <th className="r">Transaksi pribadi</th>
                <th className="r">Kiri : kanan</th>
                <th className="r">Mitra langsung aktif</th>
                <th>Pemimpin</th>
                <th className="r">Pemeliharaan</th>
                <th className="r">Bonus sekali</th>
              </tr>
            </thead>
            <tbody>
              {PLAN.monthlyRanks.slice(1).map((r) => (
                <tr key={r.name}>
                  <td>{r.name}</td>
                  <td className="r num">{r.personalTx}</td>
                  <td className="r num">
                    {r.legPaket.toLocaleString("id-ID")} :{" "}
                    {r.legPaket.toLocaleString("id-ID")}
                  </td>
                  <td className="r num">{r.directActive}</td>
                  <td>{r.leaderRank ? `2 ${r.leaderRank} disponsori langsung, kaki berbeda` : "–"}</td>
                  <td className="r num">{r.maintainBp / 100}% per kaki</td>
                  <td className="r num">{rp(r.reward)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2>4. Plan B — dari Langganan</h2>
          <ul>
            <li>
              Komisi Langganan {rp(PLAN.subscriptionCommission)} per Langganan
              per bulan, kepada Mitra PLS penjual atau Sponsor langsung.
            </li>
            <li>
              Pasangan Langganan: {PLAN.roPairBp / 100}% × PV Langganan kaki kecil bulan itu ×
              Rp100.000, dalam 10 level, tanpa akumulasi antarbulan.
            </li>
            <li>
              Royalti Langganan: dana 3% omzet bersih Langganan; tingkat 1 (kaki
              kecil 100 Lisensi) 1,5% dan tingkat 2 (400 Lisensi) 1,5%.
            </li>
            <li>
              Syarat: Langganan sendiri aktif, pernah berstatus aktif, dan 1
              kegiatan pembinaan terkonfirmasi pada bulan itu.
            </li>
          </ul>
        </div>

        <div className="card">
          <h2>5. Status aktif, masa tunggu, dan jadwal bayar</h2>
          <ul>
            <li>
              Aktif = paling sedikit {PLAN.activeMinPersonalSales90} penjualan
              baru pribadi pada bulan yang menyentuh {PLAN.program90Days} hari
              pertama, dan {PLAN.activeMinPersonalSales} sesudahnya (pembelian
              sendiri tidak dihitung).
            </li>
            <li>
              Bonus Pasangan dan Pembinaan pada bulan tidak aktif ditahan 2
              bulan; bila tetap tidak aktif, hangus ke Pool Aktif. Bonus yang
              ditahan dalam {PLAN.program90Days} hari pertama belum hangus
              sampai bulan hari ke-{PLAN.program90HoldUntilDay}.
            </li>
            <li>
              Setiap Jumat (batas 07.00 WIB): Bonus Sponsor, Berkah jatuh tempo,
              dan bonus tim bagi yang sudah aktif bulan berjalan.
            </li>
            <li>
              Tutup bulan (tanggal 1 pukul 00.00 WIB): status aktif, masa
              tunggu, peringkat bulanan, Prestasi, Leadership, Pool Aktif, Plan
              B, dan batas gabungan.
            </li>
          </ul>
        </div>

        <div className="card">
          <h2>6. Plafon dan batas</h2>
          <table className="t">
            <tbody>
              <tr>
                <td>Plafon Plan A</td>
                <td className="r">
                  {pct(PLAN.planACapBp / 10_000, 0)} omzet bersih Lisensi per
                  bulan
                </td>
              </tr>
              <tr>
                <td>Pengisian Pool Aktif</td>
                <td className="r">
                  Sampai {pct(PLAN.poolTargetBp / 10_000, 0)} omzet bersih
                  Lisensi per bulan, paling banyak {rp(PLAN.poolMaxPerSale)} per
                  penjualan; sisanya kembali ke perusahaan
                </td>
              </tr>
              <tr>
                <td>Plafon Plan B</td>
                <td className="r">
                  {pct(PLAN.planBCapBp / 10_000, 0)} omzet bersih Langganan per
                  bulan
                </td>
              </tr>
              <tr>
                <td>Batas gabungan per identitas (NIK)</td>
                <td className="r">{rp(PLAN.identityMonthlyCap)} per bulan</td>
              </tr>
              <tr>
                <td>
                  Batas atas biaya bonus per Lisensi (Mitra PLS / Pelanggan /
                  dikonversi)
                </td>
                <td className="r">
                  {pct(b.toMitra, 2)} / {pct(b.toCustomer, 2)} /{" "}
                  {pct(b.converted, 2)}
                </td>
              </tr>
            </tbody>
          </table>
          <div className="callout warn" style={{ marginTop: 12 }}>
            Catatan hukum butir 1: bila Permendag 70/2019 Pasal 17 (plafon 40%
            omzet) berlaku, plafon Plan A perlu diturunkan ke 40%. Engine sudah
            mendukung perubahan ini sebagai parameter.
          </div>
        </div>

        <div className="card" id="kode-etik">
          <h2>7. Kode Etik — pokok larangan bagi Mitra PLS</h2>
          <ul>
            <li>
              Menjanjikan penghasilan, menampilkan bukti transfer atau gaya
              hidup untuk merekrut.
            </li>
            <li>
              Mengesankan Mitrans-Astra memberi keuntungan investasi, sinyal
              beli/jual, atau "pasti untung".
            </li>
            <li>
              Mewajibkan pembelian untuk mendaftar, menarik biaya apa pun, atau
              merekrut orang di bawah 18 tahun.
            </li>
            <li>
              Membeli atas nama orang lain untuk memenuhi status aktif,
              peringkat, atau pasangan.
            </li>
            <li>
              Menjual lewat lokapasar, memberi potongan harga, atau menerima
              pembayaran ke rekening pribadi.
            </li>
            <li>
              Mengirim pesan massal tanpa persetujuan atau menyebarkan data
              pribadi orang lain.
            </li>
          </ul>
          <p className="muted">
            Pelanggaran berat (Pasal 18 angka 1, 2, 4, 9, 12, 15, 16) dapat
            langsung dikenai pemutusan keanggotaan.
          </p>
        </div>

        <div className="card" id="syarat">
          <h2>8. Hak Pelanggan dan Mitra PLS</h2>
          <ul>
            <li>
              Masa pertimbangan 10 hari kerja bagi Mitra PLS baru: Lisensi belum
              aktif dikembalikan 100%; sudah aktif dikurangi akses terpakai
              (harian dari Rp399.000/bulan).
            </li>
            <li>
              Pengembalian 7 hari kerja bila produk tidak sesuai dengan yang
              diperjanjikan.
            </li>
            <li>
              Pembelian kembali Lisensi yang belum diaktifkan dan dapat
              dialihkan: harga beli − biaya administrasi ≤10% − komisi yang
              sudah diterima.
            </li>
            <li>
              Pengaduan ditanggapi paling lambat 3 hari kerja dan diselesaikan
              paling lambat 14 hari kerja.
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
