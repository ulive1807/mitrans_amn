import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BONUS_LABEL,
  PLAN,
  atWib,
  runScenario,
  type BonusType,
  type MonthReport,
  type SimulationSummary,
} from "../../engine";
import { BarChart, LineChart } from "../components/Chart";
import { Badge, Kpi, Panel, ProtoRibbon, TopBar } from "../components/ui";
import { dateLabel, monthLabel, num, pct, rp, rpShort } from "../format";
import { currentRank, paidTotals, useDemo } from "../store";

type Tab =
  | "terkendali"
  | "ikhtisar"
  | "tutup"
  | "jumat"
  | "mitra"
  | "dana"
  | "kepatuhan"
  | "simulasi";
const TABS: { id: Tab; label: string }[] = [
  { id: "ikhtisar", label: "Ikhtisar" },
  { id: "tutup", label: "Tutup bulan & plafon" },
  { id: "jumat", label: "Pembayaran Jumat" },
  { id: "mitra", label: "Mitra PLS" },
  { id: "dana", label: "Pool & Prestasi" },
  { id: "kepatuhan", label: "Kepatuhan" },
  { id: "terkendali", label: "Akun terkendali" },
  { id: "simulasi", label: "Simulasi engine" },
];

export function Admin() {
  const { reports, lastMonth } = useDemo();
  const [tab, setTab] = useState<Tab>("ikhtisar");
  return (
    <>
      <ProtoRibbon />
      <TopBar />
      <div className="dash">
        <aside className="side">
          <div className="who">
            <b>Admin PT MITRANS</b>
            <span>Peran demo · tanpa otorisasi nyata</span>
          </div>
          <div className="sec">Operasional</div>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? "on" : ""}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </aside>
        <main className="main">
          <div className="main-head">
            <div>
              <h1>{TABS.find((t) => t.id === tab)!.label}</h1>
              <p>
                Data sintetis {monthLabel(reports[0].month)} –{" "}
                {monthLabel(lastMonth)} · plafon Plan A{" "}
                {pct(PLAN.planACapBp / 10_000, 0)}, Plan B{" "}
                {pct(PLAN.planBCapBp / 10_000, 0)}
              </p>
            </div>
          </div>
          {tab === "ikhtisar" && <Ikhtisar reports={reports} />}
          {tab === "tutup" && <TutupBulan reports={reports} />}
          {tab === "jumat" && <Jumat />}
          {tab === "mitra" && <DaftarMitra />}
          {tab === "dana" && <Dana reports={reports} />}
          {tab === "kepatuhan" && <Kepatuhan />}
          {tab === "terkendali" && <AkunTerkendali />}
          {tab === "simulasi" && <Simulasi />}
        </main>
      </div>
    </>
  );
}

function Ikhtisar({ reports }: { reports: MonthReport[] }) {
  const last = reports[reports.length - 1];
  const labels = reports.map((r) => monthLabel(r.month));
  const sum = (f: (r: MonthReport) => number) =>
    reports.reduce((a, r) => a + f(r), 0);
  const totalNet = sum((r) => r.licenseNet);
  const totalA = sum((r) => r.planAPaid);
  return (
    <>
      <div className="kpis">
        <Kpi
          label={`Lisensi ${monthLabel(last.month)}`}
          value={num(last.licensesSold)}
          sub={`${num(last.licensesToCustomers)} kepada Pelanggan · ${num(last.conversions)} konversi`}
        />
        <Kpi
          label="Omzet bersih Lisensi"
          value={rpShort(last.licenseNet)}
          sub={`Langganan ${rpShort(last.subscriptionNet)}`}
        />
        <Kpi
          label="Plan A dibayar"
          value={pct(last.planAPct)}
          sub={`Plafon ${pct(PLAN.planACapBp / 10_000, 0)} · kumulatif ${pct(totalNet ? totalA / totalNet : 0)}`}
        />
        <Kpi
          label="Mitra PLS aktif"
          value={`${num(last.activeMitra)} / ${num(last.totalMitra)}`}
          sub={`${pct(last.totalMitra ? last.activeMitra / last.totalMitra : 0)} memenuhi syarat aktif`}
        />
      </div>
      <div className="row2">
        <Panel
          title="Rasio pembayaran terhadap omzet bersih"
          hint="Plan A terhadap Lisensi, Plan B terhadap Langganan"
        >
          <LineChart
            labels={labels}
            title="Rasio pembayaran"
            format={(v) => pct(v, 0)}
            refLine={{
              value: PLAN.planACapBp / 10_000,
              label: "Plafon Plan A 50%",
            }}
            series={[
              {
                name: "Plan A",
                color: "var(--series-1)",
                values: reports.map((r) => r.planAPct),
              },
              {
                name: "Plan B",
                color: "var(--series-2)",
                values: reports.map((r) => r.planBPct),
              },
            ]}
          />
        </Panel>
        <Panel title="Lisensi terjual per bulan">
          <BarChart
            labels={labels}
            values={reports.map((r) => r.licensesSold)}
            color="var(--series-1)"
            format={(v) => num(Math.round(v))}
            title="Lisensi per bulan"
            name="Lisensi"
          />
        </Panel>
      </div>
      <Panel title={`Pembayaran per jenis · ${monthLabel(last.month)}`}>
        <table className="t">
          <thead>
            <tr>
              <th>Jenis</th>
              <th className="r">Dibayar</th>
              <th className="r">% omzet bersih</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(BONUS_LABEL) as BonusType[]).map((t) => {
              const isB =
                t === "KOMISI_LANGGANAN" ||
                t === "PASANGAN_RO" ||
                t === "ROYALTI_RO";
              const base = isB ? last.subscriptionNet : last.licenseNet;
              return (
                <tr key={t}>
                  <td>
                    {BONUS_LABEL[t]}{" "}
                    <span className="muted">· Plan {isB ? "B" : "A"}</span>
                  </td>
                  <td className="r num">{rp(last.paidByType[t])}</td>
                  <td className="r num">
                    {base ? pct(last.paidByType[t] / base, 2) : "–"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </>
  );
}

function TutupBulan({ reports }: { reports: MonthReport[] }) {
  return (
    <>
      <Panel
        title="Penetapan tutup bulan"
        hint="Tanggal 1 pukul 00.00 WIB · dibayar Jumat pertama sesudahnya"
      >
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th>Bulan</th>
                <th className="r">Omzet bersih Lisensi</th>
                <th className="r">Plafon Plan A</th>
                <th className="r">Anggaran bonus tim</th>
                <th className="r">Klaim bonus tim</th>
                <th className="r">Faktor</th>
                <th className="r">Plan A dibayar</th>
                <th className="r">Plan B dibayar</th>
                <th>Status plafon</th>
              </tr>
            </thead>
            <tbody>
              {reports
                .slice()
                .reverse()
                .map((r) => (
                  <tr key={r.month}>
                    <td>{monthLabel(r.month)}</td>
                    <td className="r num">{rpShort(r.licenseNet)}</td>
                    <td className="r num">{rpShort(r.planACap)}</td>
                    <td className="r num">{rpShort(r.teamBudget)}</td>
                    <td className="r num">{rpShort(r.teamClaims)}</td>
                    <td className="r num">
                      {pct(Math.min(1, r.teamFactor), 0)}
                    </td>
                    <td className="r num">
                      {rpShort(r.planAPaid)}{" "}
                      <span className="muted">({pct(r.planAPct)})</span>
                    </td>
                    <td className="r num">
                      {rpShort(r.planBPaid)}{" "}
                      <span className="muted">({pct(r.planBPct)})</span>
                    </td>
                    <td>
                      {r.planACapTriggered || r.planBCapTriggered ? (
                        <Badge tone="warn">⚠ Faktor dipakai</Badge>
                      ) : r.poolClampedByCap ? (
                        <Badge tone="info">Pool dibatasi plafon</Badge>
                      ) : (
                        <Badge tone="good">✓ Di bawah plafon</Badge>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Rumus anggaran bonus tim (Bab 12.2)">
        <p style={{ margin: 0 }}>
          Anggaran bonus tim = plafon Plan A − Bonus Sponsor − Bonus Layanan
          Berkah − dana peringkat (2%) − dana Royalti (2%). Bila klaim Level,
          Pasangan, dan Pembinaan melebihi anggaran, semua klaim dibayar dengan
          faktor yang sama dan sisanya dibayar lebih dulu bulan berikutnya.
        </p>
      </Panel>
    </>
  );
}

function Jumat() {
  const { engine } = useDemo();
  const runs = useMemo(() => engine.payoutRuns(), [engine]);
  return (
    <Panel
      title="Daftar transfer Jumat"
      hint="Batas transaksi Jumat 07.00 WIB · transfer 07.01–19.00 WIB"
    >
      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr>
              <th>Jumat</th>
              <th className="r">Entri</th>
              <th className="r">Sponsor</th>
              <th className="r">Bonus tim</th>
              <th className="r">Bulanan (Prestasi, Royalti, Pool, Plan B)</th>
              <th className="r">Total bruto</th>
            </tr>
          </thead>
          <tbody>
            {runs
              .slice()
              .reverse()
              .map((r) => {
                const team =
                  r.byType.LEVEL + r.byType.PASANGAN + r.byType.PEMBINAAN;
                const direct = r.byType.SPONSOR + r.byType.BERKAH;
                return (
                  <tr key={r.date}>
                    <td>{dateLabel(r.date)}</td>
                    <td className="r num">{num(r.count)}</td>
                    <td className="r num">{rp(direct)}</td>
                    <td className="r num">{rp(team)}</td>
                    <td className="r num">{rp(r.total - team - direct)}</td>
                    <td className="r num">
                      <b>{rp(r.total)}</b>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: 13 }}>
        Bruto sebelum PPh. Pada produksi, daftar ini menjadi berkas transfer
        bank yang disetujui dua orang (maker-checker) sebelum dikirim.
      </p>
    </Panel>
  );
}

function DaftarMitra() {
  const { engine, lastMonth, version } = useDemo();
  const [q, setQ] = useState("");
  const totals = useMemo(() => paidTotals(engine), [engine, version]);
  const rows = useMemo(
    () =>
      [...engine.accounts.values()]
        .filter((a) => a.role === "mitra")
        .filter(
          (a) =>
            !q || `${a.name} ${a.code}`.toLowerCase().includes(q.toLowerCase()),
        )
        .sort((a, b) => (totals.get(b.id) ?? 0) - (totals.get(a.id) ?? 0)),
    [engine, q, totals, version],
  );
  return (
    <Panel title="Mitra PLS" hint={`${num(rows.length)} akun`}>
      <div className="toolbar">
        <input
          placeholder="Cari nama atau kode"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Cari Mitra PLS"
        />
      </div>
      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama</th>
              <th>Sponsor</th>
              <th>Lisensi</th>
              <th>Kuis</th>
              <th>Aktif {monthLabel(lastMonth)}</th>
              <th>Peringkat</th>
              <th className="r">Kaki kecil</th>
              <th className="r">Total diterima</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 300).map((a) => (
              <tr key={a.id}>
                <td className="num">
                  <Link to={`/mitra?id=${a.id}`}>{a.code}</Link>
                </td>
                <td>{a.name}</td>
                <td className="muted">
                  {engine.accounts.get(a.sponsorId!)?.code}
                </td>
                <td>{a.nodeId ? "✓" : "–"}</td>
                <td>{a.quizPassed ? "✓" : <Badge tone="warn">Belum</Badge>}</td>
                <td>
                  {engine.isActive(a.id, lastMonth) ? (
                    <Badge tone="good">✓ Aktif</Badge>
                  ) : (
                    <span className="muted">–</span>
                  )}
                </td>
                <td>{currentRank(engine, a.id) ?? "–"}</td>
                <td className="r num">{num(engine.smallLeg(a.id))}</td>
                <td className="r num">{rp(totals.get(a.id) ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: 13 }}>
        Data identitas (NIK) dan rekening tidak ditampilkan di daftar ini. Akses
        ke data tersebut dibatasi per peran dan tercatat di log audit.
      </p>
    </Panel>
  );
}

function Dana({ reports }: { reports: MonthReport[] }) {
  const { engine } = useDemo();
  return (
    <>
      <Panel title="Sumber Pool Aktif per bulan (Bab 8.4)">
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th>Bulan</th>
                <th className="r">Bonus tim hangus</th>
                <th className="r">Royalti tanpa penerima / lebih batas</th>
                <th className="r">Sisa dana peringkat</th>
                <th className="r">Berkah tak terkonfirmasi</th>
                <th className="r">Bawaan</th>
                <th className="r">Dibagikan</th>
                <th className="r">Per penjualan</th>
                <th className="r">Dibawa</th>
              </tr>
            </thead>
            <tbody>
              {reports
                .slice()
                .reverse()
                .map((r) => (
                  <tr key={r.month}>
                    <td>{monthLabel(r.month)}</td>
                    <td className="r num">{rpShort(r.pool.forfeitedTeam)}</td>
                    <td className="r num">
                      {rpShort(
                        r.pool.royaltyUnassigned + r.pool.royaltyOverCap,
                      )}
                    </td>
                    <td className="r num">
                      {rpShort(r.pool.rankFundLeftover)}
                    </td>
                    <td className="r num">
                      {rpShort(r.pool.berkahUnconfirmed)}
                    </td>
                    <td className="r num">
                      {rpShort(r.pool.carriedFromLastMonth)}
                    </td>
                    <td className="r num">{rpShort(r.pool.distributed)}</td>
                    <td className="r num">{rp(r.pool.perSale)}</td>
                    <td className="r num">{rpShort(r.pool.carryNext)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel
        title="Antrean Bonus Prestasi"
        hint="Dibayar menurut urutan klaim, nominal utuh"
      >
        {engine.rankQueue.length === 0 ? (
          <p className="muted">Tidak ada klaim yang menunggu.</p>
        ) : (
          <table className="t">
            <tbody>
              {engine.rankQueue.map((c, i) => (
                <tr key={i}>
                  <td>{engine.accounts.get(c.accountId)!.name}</td>
                  <td>{c.rank}</td>
                  <td className="r num">{rp(c.amount)}</td>
                  <td>sejak {monthLabel(c.claimMonth)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <h3 style={{ fontSize: 14, marginTop: 16 }}>Prestasi terbayar</h3>
        <div className="table-wrap" style={{ maxHeight: 280 }}>
          <table className="t">
            <thead>
              <tr>
                <th>Mitra PLS</th>
                <th>Peringkat</th>
                <th className="r">Nominal</th>
                <th>Bulan bayar</th>
                <th>Sumber</th>
              </tr>
            </thead>
            <tbody>
              {engine.rankPaid
                .slice()
                .reverse()
                .map((c, i) => (
                  <tr key={i}>
                    <td>{engine.accounts.get(c.accountId)!.name}</td>
                    <td>{c.rank}</td>
                    <td className="r num">{rp(c.amount)}</td>
                    <td>{monthLabel(c.paidMonth!)}</td>
                    <td>
                      {c.paidFromReserve
                        ? "Dana cadangan"
                        : "Dana peringkat 2%"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

/** Butir dari Catatan untuk Konsultan Hukum v1.1 Bagian 1, yang memengaruhi sistem. */
const LEGAL = [
  [
    "Plafon komisi",
    "Permendag 70/2019 Ps. 17 (40%)",
    "Plafon Plan A dapat diubah lewat parameter planACapBp",
  ],
  [
    "Produk jasa atau barang",
    "Permendag 70/2019 Ps. 21 m; PP 3/2026 Ps. 54",
    "Butuh pendapat hukum tertulis",
  ],
  [
    "Lisensi dapat dipindahtangankan",
    "PP 3/2026 Ps. 54",
    "Fitur pengalihan perlu dibangun (S&K Ps. 9)",
  ],
  [
    "Syarat Langganan bulan ke-4 vs larangan wajib beli",
    "Permendag 70/2019 Ps. 21 f, g",
    "Engine memisahkan syarat Bonus Sponsor agar mudah diubah",
  ],
  [
    "Akun struktural Mitrans 001–003",
    "Permendag 70/2019 Ps. 21 i",
    "Bentuk penjualan kepada pemimpin pertama belum diputuskan",
  ],
  [
    'Merek "Mitrans-Astra"',
    'Merek terkenal "Astra"',
    "Cek PDKI sebelum materi dicetak; nama produk dibuat parameter",
  ],
  [
    "Batas 60 hari konversi",
    "Permendag 70/2019 Ps. 21 f, g",
    "Parameter conversionWindowDays",
  ],
  ["Verifikasi asosiasi", "Permendag 70/2019 Ps. 8(3), 9(4)", "Belum"],
];

function Kepatuhan() {
  const { engine, reports, lastMonth } = useDemo();
  const last = reports[reports.length - 1];
  const held = engine.heldEntries;
  const refunds = [...engine.sales.values()].filter((s) => s.cancelled).length;
  const unconfirmed = [...engine.sales.values()].filter(
    (s) =>
      s.kind === "license" &&
      s.toCustomer &&
      !s.cancelled &&
      !s.orientationConfirmedAt,
  ).length;
  const noQuiz = [...engine.accounts.values()].filter(
    (a) => a.role === "mitra" && !a.quizPassed,
  ).length;
  return (
    <>
      <div className="kpis">
        <Kpi
          label="Bonus ditahan"
          value={rpShort(held.reduce((a, e) => a + e.gross, 0))}
          sub={`${num(held.length)} entri`}
        />
        <Kpi
          label="Tertahan karena Langganan"
          value={rpShort(last.heldNoSubscription)}
          sub={`${monthLabel(lastMonth)} · bulan ke-4+`}
        />
        <Kpi
          label="Orientasi belum dikonfirmasi"
          value={num(unconfirmed)}
          sub="Lisensi Pelanggan"
        />
        <Kpi
          label="Pembatalan"
          value={num(refunds)}
          sub={`${num(noQuiz)} Mitra PLS belum lulus kuis`}
        />
      </div>
      <Panel
        title="Butir hukum yang memengaruhi sistem"
        hint="Dari Catatan untuk Konsultan Hukum v1.1 · bukan pendapat hukum"
      >
        <table className="t">
          <thead>
            <tr>
              <th>Hal</th>
              <th>Dasar</th>
              <th>Dampak ke sistem</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {LEGAL.map(([a, b, c]) => (
              <tr key={a}>
                <td>{a}</td>
                <td className="muted">{b}</td>
                <td>{c}</td>
                <td>
                  <Badge tone="warn">⚠ Perlu keputusan</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <Panel title="Pengaman yang sudah dijalankan engine">
        <ul style={{ margin: 0 }}>
          <li>
            Satu NIK satu akun; batas gabungan Rp1 miliar per identitas per
            bulan.
          </li>
          <li>
            Tautan rujukan tidak dapat dipakai sebelum lulus kuis Kode Etik.
          </li>
          <li>
            Pembelian untuk diri sendiri tidak dihitung sebagai penjualan baru
            pribadi.
          </li>
          <li>
            Pembatalan menarik komisi terkait dan mengurangi volume jaringan.
          </li>
          <li>Bonus yang jatuh pada akun struktural tidak dibayarkan.</li>
          <li>Pembelian oleh akun yang dikendalikan penjual ditandai dari sinyal yang di-hash; pemeriksaan menunda bonus langsung paling lama 30 hari.</li>
          <li>
            Plafon Plan A dan Plan B diperiksa setiap tutup bulan dengan faktor
            yang sama untuk semua klaim.
          </li>
        </ul>
        <p className="muted" style={{ fontSize: 13 }}>
          Deteksi akun yang dikendalikan sendiri ada di tab Akun terkendali.
          Belum dibangun: verifikasi e-KTP, pemberitahuan tertulis otomatis,
          dan pencatatan penjelasan Mitra PLS untuk tata cara sanksi Pasal
          20–21.
        </p>
      </Panel>
    </>
  );
}

function Simulasi() {
  const [p, setP] = useState({
    months: 18,
    licenses: 120,
    mitraShare: 70,
    retention: 80,
    coaching: 60,
  });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    s: SimulationSummary;
    reports: MonthReport[];
  } | null>(null);
  const run = () => {
    setBusy(true);
    setTimeout(() => {
      const res = runScenario({
        name: "browser",
        label: "Simulasi di peramban",
        startMonth: "2027-01",
        months: p.months,
        seed: 7,
        licensesPerMonth: (m) =>
          Math.min(p.licenses, 20 + m * (p.licenses / 6)),
        mitraShare: p.mitraShare / 100,
        conversionRate: 0.15,
        subscriptionRetention: p.retention / 100,
        coachingRate: p.coaching / 100,
        orientationRate: 0.9,
        refundRate: 0.01,
        seedLeaders: 4,
      });
      setResult({ s: res.summary, reports: res.reports });
      setBusy(false);
    }, 30);
  };
  const field = (
    k: keyof typeof p,
    label: string,
    min: number,
    max: number,
  ) => (
    <div className="field">
      <label htmlFor={k}>
        {label}: <b>{p[k]}</b>
      </label>
      <input
        id={k}
        type="range"
        min={min}
        max={max}
        value={p[k]}
        onChange={(e) => setP({ ...p, [k]: Number(e.target.value) })}
      />
    </div>
  );
  return (
    <>
      <div className="callout warn" style={{ marginBottom: 16 }}>
        Simulasi menguji aturan dengan jaringan buatan. Hasilnya bukan proyeksi
        penjualan dan bukan perkiraan penghasilan.
      </div>
      <Panel title="Parameter">
        <div className="form-grid">
          {field("months", "Bulan", 6, 36)}
          {field("licenses", "Lisensi per bulan (setelah naik)", 20, 400)}
          {field("mitraShare", "% pembeli menjadi Mitra PLS", 10, 100)}
          {field("retention", "% retensi Langganan per bulan", 0, 100)}
          {field("coaching", "% Mitra PLS dengan kegiatan pembinaan", 0, 100)}
        </div>
        <button
          className="btn-primary"
          style={{ marginTop: 14 }}
          onClick={run}
          disabled={busy}
        >
          {busy ? "Menjalankan…" : "Jalankan simulasi"}
        </button>
      </Panel>
      {result && (
        <>
          <div className="kpis" style={{ marginTop: 16 }}>
            <Kpi
              label="Plan A dibayar"
              value={pct(result.s.planAPct)}
              sub={`Bulan tertinggi ${pct(result.s.maxMonthPlanAPct)}`}
            />
            <Kpi
              label="Plan B dibayar"
              value={pct(result.s.planBPct)}
              sub={`Bulan tertinggi ${pct(result.s.maxMonthPlanBPct)}`}
            />
            <Kpi
              label="Mitra PLS tanpa bonus"
              value={pct(result.s.income.zeroShare)}
              sub={`Median ${rp(result.s.income.median)}`}
            />
            <Kpi
              label="Faktor plafon dipakai"
              value={
                result.s.capTriggeredMonths.length
                  ? `${result.s.capTriggeredMonths.length} bulan`
                  : "Tidak"
              }
              sub={`${num(result.s.licenses)} Lisensi · ${num(result.s.mitraCount)} Mitra PLS`}
            />
          </div>
          <Panel title="Rasio pembayaran per bulan">
            <LineChart
              labels={result.reports.map((r) => monthLabel(r.month))}
              title="Rasio pembayaran simulasi"
              format={(v) => pct(v, 0)}
              refLine={{
                value: PLAN.planACapBp / 10_000,
                label: "Plafon Plan A 50%",
              }}
              series={[
                {
                  name: "Plan A",
                  color: "var(--series-1)",
                  values: result.reports.map((r) => r.planAPct),
                },
                {
                  name: "Plan B",
                  color: "var(--series-2)",
                  values: result.reports.map((r) => r.planBPct),
                },
              ]}
            />
          </Panel>
        </>
      )}
    </>
  );
}

const DAY = 86_400_000;

/** Deteksi akun yang dikendalikan sendiri (Rencana Pemasaran 9.1; Kode Etik Pasal 9, 18, 21). */
function AkunTerkendali() {
  const { engine, detector, version, bump } = useDemo();
  const [level, setLevel] = useState<"kuat" | "sedang" | "semua">("kuat");
  const [msg, setMsg] = useState("");
  const flags = useMemo(() => detector.scan(engine), [engine, detector, version]);
  const clusters = useMemo(() => detector.clusters(), [detector, version]);
  const now = atWib(engine.today, 9);
  const rows = flags.filter((f) => level === "semua" || f.level === level);
  const name = (id: string) => {
    const a = engine.accounts.get(id)!;
    return `${a.name} (${a.code})`;
  };
  const statusOf = (saleId: string) => {
    const s = engine.sales.get(saleId)!;
    const r = s.review;
    if (s.controlled) return <Badge tone="bad">✕ Pelanggaran terkonfirmasi</Badge>;
    if (s.cancelled) return <Badge tone="mute">↩ Dibatalkan</Badge>;
    if (!r) return <Badge tone="mute">Belum diperiksa</Badge>;
    if (r.dismissedAt) return <Badge tone="good">✓ Tidak terbukti</Badge>;
    if (r.expiredAt) return <Badge tone="warn">⏱ Tunda 30 hari lewat</Badge>;
    return <Badge tone="warn">⏸ Diperiksa sejak {dateLabel(r.openedAt)}</Badge>;
  };
  const act = (fn: () => string) => {
    try {
      setMsg(fn());
      bump();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Gagal");
    }
  };
  const open = engine.openReviews();
  return (
    <>
      <div className="kpis">
        <Kpi label="Tanda kuat" value={num(flags.filter((f) => f.level === "kuat").length)} sub="Skor ≥ 85%: pemeriksaan dibuka" />
        <Kpi label="Tanda sedang" value={num(flags.filter((f) => f.level === "sedang").length)} sub="Skor 50–85%: dipantau, tanpa tunda bayar" />
        <Kpi label="Pemeriksaan terbuka" value={num(open.length)} sub="Bonus langsung ditunda ≤ 30 hari" />
        <Kpi label="Terkonfirmasi" value={num([...engine.sales.values()].filter((x) => x.controlled).length)} sub={`${num(clusters.length)} klaster akun terkait kuat`} />
      </div>
      <div className="callout info" style={{ marginBottom: 16 }}>
        Deteksi hanya membuka pemeriksaan, bukan sanksi. Tata cara Kode Etik Pasal 21: pemberitahuan tertulis beserta bukti, penjelasan Mitra PLS paling lama 14 hari,
        lalu keputusan dengan alasan tertulis. Selama diperiksa, penjualan tetap dihitung untuk status aktif; hanya Bonus Sponsor dan Berkah penjualan itu yang ditunda,
        paling lama 30 hari (Pasal 9 angka 2).
      </div>
      {msg && <div className="callout warn" style={{ marginBottom: 16 }}>{msg}</div>}
      <Panel
        title="Penjualan yang ditandai"
        hint="Pembeli kemungkinan akun yang dikendalikan penjual"
        actions={
          <div className="seg" role="group" aria-label="Tingkat">
            {(["kuat", "sedang", "semua"] as const).map((l) => (
              <button key={l} className={level === l ? "on" : ""} onClick={() => setLevel(l)}>
                {l[0].toUpperCase() + l.slice(1)}
              </button>
            ))}
          </div>
        }
      >
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Penjual</th>
                <th>Pembeli</th>
                <th className="r">Skor</th>
                <th>Sinyal yang sama</th>
                <th>Status</th>
                <th>Tenggat</th>
                <th>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 200).map((f) => {
                const s = engine.sales.get(f.saleId)!;
                const r = s.review;
                const openNow = r && !r.dismissedAt && !r.confirmedAt && !r.expiredAt;
                return (
                  <tr key={f.saleId}>
                    <td className="num">{dateLabel(f.at)}</td>
                    <td>{name(f.sellerId)}</td>
                    <td>{name(f.buyerId)}</td>
                    <td className="r num">
                      <Badge tone={f.level === "kuat" ? "bad" : "warn"}>{pct(f.score, 0)}</Badge>
                    </td>
                    <td style={{ fontSize: 12.5 }}>{f.reasons.join(" · ")}</td>
                    <td>{statusOf(f.saleId)}</td>
                    <td className="muted" style={{ fontSize: 12.5 }}>
                      {openNow ? (
                        <>
                          Penjelasan s.d. {dateLabel(r.openedAt + 14 * DAY)}
                          <br />
                          Tunda s.d. {dateLabel(r.openedAt + 30 * DAY)}
                        </>
                      ) : (
                        "–"
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {!s.controlled && !s.cancelled && (!r || r.dismissedAt || r.expiredAt) && (
                        <button className="btn-secondary" onClick={() => act(() => (engine.openReview(f.saleId, now, f.reasons.join(", ")), "Pemeriksaan dibuka. Kirim pemberitahuan tertulis kepada Mitra PLS."))}>
                          Buka pemeriksaan
                        </button>
                      )}
                      {openNow && (
                        <>
                          <button className="btn-secondary" onClick={() => act(() => (engine.dismissReview(f.saleId, now), "Pemeriksaan ditutup: tidak terbukti. Bonus dibayar pada tutup bulan berikutnya."))}>
                            Tidak terbukti
                          </button>{" "}
                          <button
                            className="btn-primary"
                            onClick={() =>
                              act(() => {
                                const x = engine.confirmControlled(f.saleId, now);
                                return `Pelanggaran dikonfirmasi. Ditarik ${rp(x.clawedBack)} yang sudah dibayar${x.activeRevoked ? "; status aktif bulan itu dicabut" : ""}.`;
                              })
                            }
                          >
                            Konfirmasi
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted">
                    Tidak ada penjualan pada tingkat ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Klaster akun terkait kuat" hint="Akun yang saling berbagi rekening, telepon, surel, atau kombinasi sinyal kuat">
        <div className="table-wrap" style={{ maxHeight: 320 }}>
          <table className="t">
            <thead>
              <tr>
                <th className="r">Akun</th>
                <th>Anggota</th>
              </tr>
            </thead>
            <tbody>
              {clusters.slice(0, 100).map((c, i) => (
                <tr key={i}>
                  <td className="r num">{c.length}</td>
                  <td style={{ fontSize: 12.5 }}>{c.map((id) => `${engine.accounts.get(id)!.code} (${engine.accounts.get(id)!.role === "mitra" ? "Mitra PLS" : "Pelanggan"})`).join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ fontSize: 13 }}>
          Nilai sinyal (nomor rekening, telepon, alamat) disimpan sebagai hash dan tidak ditampilkan. Alamat atau IP yang sama saja tidak pernah menimbulkan tanda,
          karena wajar bagi anggota keluarga serumah.
        </p>
      </Panel>
    </>
  );
}
