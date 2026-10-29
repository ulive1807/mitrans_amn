import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BONUS_LABEL,
  addMonths,
  PLAN,
  PLAN_B_TYPES,
  type BinaryNode,
  type BonusType,
  type LedgerEntry,
  type MitransEngine,
} from "../../engine";
import { BarChart } from "../components/Chart";
import {
  Badge,
  Kpi,
  Panel,
  ProtoRibbon,
  StatusBadge,
  TopBar,
} from "../components/ui";
import { dateLabel, monthLabel, num, pct, rp, rpShort } from "../format";
import { currentRank, paidTotals, useDemo } from "../store";

type Tab =
  | "ringkasan"
  | "jaringan"
  | "bonus"
  | "peringkat"
  | "planb"
  | "rujukan";
const TABS: { id: Tab; label: string }[] = [
  { id: "ringkasan", label: "Ringkasan" },
  { id: "jaringan", label: "Jaringan biner" },
  { id: "bonus", label: "Komisi & bonus" },
  { id: "peringkat", label: "Peringkat & Royalti" },
  { id: "planb", label: "Plan B · Langganan" },
  { id: "rujukan", label: "Rujukan & orientasi" },
];

export function KantorMaya() {
  const { engine, reports, lastMonth, version } = useDemo();
  const [params, setParams] = useSearchParams();
  const totals = useMemo(() => paidTotals(engine), [engine, version]);
  const mitraList = useMemo(
    () =>
      [...engine.accounts.values()]
        .filter((a) => a.role === "mitra")
        .sort((a, b) => (totals.get(b.id) ?? 0) - (totals.get(a.id) ?? 0)),
    [engine, totals, version],
  );
  const id = params.get("id") ?? mitraList[0]?.id;
  const acc = id ? engine.accounts.get(id) : undefined;
  const [tab, setTab] = useState<Tab>("ringkasan");

  if (!acc) return <div className="page">Akun tidak ditemukan.</div>;
  const entries = engine.entriesFor(acc.id);

  return (
    <>
      <ProtoRibbon />
      <TopBar />
      <div className="dash">
        <aside className="side">
          <div className="who">
            <b>{acc.name}</b>
            <span>
              {acc.code} · {currentRank(engine, acc.id) ?? "Belum berperingkat"}
            </span>
          </div>
          <div className="sec">Kantor Maya</div>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? "on" : ""}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
          <div className="sec">Demo</div>
          <select
            aria-label="Pilih Mitra PLS demo"
            value={acc.id}
            onChange={(e) => setParams({ id: e.target.value })}
            style={{
              margin: "0 8px",
              padding: 8,
              borderRadius: 8,
              background: "#0b2a22",
              color: "#e7ece9",
              border: "1px solid rgba(212,175,106,.3)",
            }}
          >
            {mitraList.slice(0, 200).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} · {m.code}
              </option>
            ))}
          </select>
        </aside>
        <main className="main">
          <div className="main-head">
            <div>
              <h1>{TABS.find((t) => t.id === tab)!.label}</h1>
              <p>
                Data sintetis sampai tutup bulan {monthLabel(lastMonth, true)} ·
                Rencana Pemasaran v{PLAN.version}
              </p>
            </div>
          </div>
          {tab === "ringkasan" && (
            <Ringkasan
              engine={engine}
              accId={acc.id}
              entries={entries}
              months={reports.map((r) => r.month)}
              lastMonth={lastMonth}
            />
          )}
          {tab === "jaringan" && <Jaringan engine={engine} accId={acc.id} />}
          {tab === "bonus" && <BonusTable entries={entries} />}
          {tab === "peringkat" && <Peringkat engine={engine} accId={acc.id} />}
          {tab === "planb" && (
            <PlanB
              engine={engine}
              accId={acc.id}
              entries={entries}
              months={reports.map((r) => r.month)}
            />
          )}
          {tab === "rujukan" && <Rujukan engine={engine} accId={acc.id} />}
        </main>
      </div>
    </>
  );
}

function Ringkasan({
  engine,
  accId,
  entries,
  months,
  lastMonth,
}: {
  engine: MitransEngine;
  accId: string;
  entries: LedgerEntry[];
  months: string[];
  lastMonth: string;
}) {
  const acc = engine.accounts.get(accId)!;
  const paid = entries.filter(
    (e) => e.status === "payable" || e.status === "clawback",
  );
  const total = paid.reduce((a, e) => a + e.amount, 0);
  const lastPaid = paid
    .filter((e) => e.settledMonth === lastMonth)
    .reduce((a, e) => a + e.amount, 0);
  const held = entries.filter((e) => e.status === "held");
  const sales = engine.personalSales(lastMonth).get(accId) ?? 0;
  const active = engine.isActive(accId, lastMonth);
  const byMonth = months.map((m) =>
    paid.filter((e) => e.settledMonth === m).reduce((a, e) => a + e.amount, 0),
  );
  const byType = new Map<BonusType, number>();
  for (const e of paid)
    byType.set(e.type, (byType.get(e.type) ?? 0) + e.amount);
  const node = acc.nodeId ? engine.nodes.get(acc.nodeId) : undefined;
  const nextPayout = paid
    .filter((e) => e.payoutDate && e.payoutDate >= engine.today)
    .sort((a, b) => a.payoutDate!.localeCompare(b.payoutDate!))[0];

  return (
    <>
      <div className="kpis">
        <Kpi
          label={`Status ${monthLabel(lastMonth)}`}
          value={
            active ? (
              <Badge tone="good">✓ Aktif</Badge>
            ) : (
              <Badge tone="warn">⏸ Belum aktif</Badge>
            )
          }
          sub={`${sales} dari ${PLAN.activeMinPersonalSales} penjualan baru pribadi`}
        />
        <Kpi
          label={`Diterima ${monthLabel(lastMonth)}`}
          value={rpShort(lastPaid)}
          sub="Bruto sebelum PPh"
        />
        <Kpi
          label="Total diterima"
          value={rpShort(total)}
          sub={`Sejak ${dateLabel(acc.joinedAt)}`}
        />
        <Kpi
          label="Bonus ditahan"
          value={rpShort(held.reduce((a, e) => a + e.gross, 0))}
          sub={
            held.length
              ? `${held.length} entri · masa tunggu 2 bulan`
              : "Tidak ada"
          }
        />
      </div>
      <div className="row2">
        <Panel title="Diterima per bulan" hint="Per bulan penetapan">
          <BarChart
            labels={months.map((m) => monthLabel(m))}
            values={byMonth}
            color="var(--series-1)"
            format={rpShort}
            title="Diterima per bulan"
            name="Diterima"
          />
        </Panel>
        <Panel title="Komposisi" hint="Seluruh periode">
          <table className="t">
            <tbody>
              {[...byType.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([t, v]) => (
                  <tr key={t}>
                    <td>{BONUS_LABEL[t]}</td>
                    <td className="r num">{rp(v)}</td>
                    <td className="r num muted">
                      {total ? pct(v / total, 0) : "–"}
                    </td>
                  </tr>
                ))}
              {byType.size === 0 && (
                <tr>
                  <td className="muted">Belum ada komisi atau bonus.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Panel>
      </div>
      <div className="row2 even">
        <Panel title="Posisi jaringan">
          {node ? (
            <dl className="kv">
              <dt>Lisensi kaki kiri / kanan (10 level)</dt>
              <dd>
                {num(node.cumLicenses.L)} / {num(node.cumLicenses.R)}
              </dd>
              <dt>Sisa unit pasangan kiri / kanan</dt>
              <dd>
                {num(node.carry.L)} / {num(node.carry.R)}
              </dd>
              <dt>Langganan bulan {monthLabel(lastMonth)}</dt>
              <dd>
                {engine.subscriptionConditionMet(accId, lastMonth)
                  ? "Syarat terpenuhi"
                  : "Wajib aktif (bulan ke-4+)"}
              </dd>
            </dl>
          ) : (
            <div className="callout info">
              Belum memegang Lisensi. Posisi jaringan biner diberikan saat
              Lisensi pertama diaktifkan (Rencana Pemasaran 5.4).
            </div>
          )}
        </Panel>
        <Panel title="Pembayaran berikutnya">
          {nextPayout ? (
            <p>
              Jumat <b>{dateLabel(nextPayout.payoutDate!)}</b>, transfer
              07.01–19.00 WIB ke rekening terdaftar.
            </p>
          ) : (
            <p className="muted">Tidak ada pembayaran terjadwal.</p>
          )}
          <p className="muted" style={{ fontSize: 13 }}>
            Perusahaan memotong PPh sesuai ketentuan dan menerbitkan bukti
            potong. Keberatan atas perhitungan dapat diajukan dalam 30 hari
            setelah pembayaran.
          </p>
        </Panel>
      </div>
    </>
  );
}


function Jaringan({ engine, accId }: { engine: MitransEngine; accId: string }) {
  const acc = engine.accounts.get(accId)!;
  const [rootId, setRootId] = useState<string | undefined>(acc.nodeId);
  if (!acc.nodeId || !rootId)
    return (
      <div className="callout info">Belum memiliki posisi jaringan biner.</div>
    );
  const levels: (BinaryNode | null)[][] = [[engine.nodes.get(rootId)!]];
  for (let d = 1; d < 4; d++) {
    levels.push(
      levels[d - 1].flatMap((n) => [
        n?.left ? engine.nodes.get(n.left)! : null,
        n?.right ? engine.nodes.get(n.right)! : null,
      ]),
    );
  }
  const root = engine.nodes.get(rootId)!;
  return (
    <Panel
      title="Pohon biner (4 level)"
      hint="Klik posisi untuk menelusuri. Angka = Lisensi kumulatif kaki kiri | kanan dalam 10 level."
      actions={
        rootId !== acc.nodeId ? (
          <button
            className="btn-secondary"
            onClick={() => setRootId(acc.nodeId)}
          >
            Kembali ke posisi saya
          </button>
        ) : undefined
      }
    >
      <div className="tree">
        {levels.map((row, d) => (
          <div className="tree-level" key={d}>
            {row.map((n, i) => (
              <div className="tnode" key={i}>
                {n ? (
                  <div
                    className={`tcard${d === 0 ? " root" : ""}${engine.accounts.get(n.accountId)!.role === "struktural" ? " struct" : ""}`}
                    onClick={() => d > 0 && setRootId(n.id)}
                    role="button"
                    tabIndex={0}
                    title={engine.accounts.get(n.accountId)!.name}
                  >
                    <b>{engine.accounts.get(n.accountId)!.name}</b>
                    <span className="muted">
                      {engine.accounts.get(n.accountId)!.code}
                    </span>
                    <div className="lr">
                      <span>{num(n.cumLicenses.L)}</span>
                      <span>|</span>
                      <span>{num(n.cumLicenses.R)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="tcard empty">kosong</div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 13 }}>
        Posisi {engine.accounts.get(root.accountId)!.name}: kedalaman{" "}
        {root.depth} dari puncak (Mitrans 001). Lisensi Pelanggan dicatat pada
        posisi Mitra PLS penjual dan dihitung untuk upline-nya.
      </p>
    </Panel>
  );
}

function BonusTable({ entries }: { entries: LedgerEntry[] }) {
  const [type, setType] = useState<BonusType | "ALL">("ALL");
  const [status, setStatus] = useState<string>("ALL");
  const rows = entries
    .filter(
      (e) =>
        (type === "ALL" || e.type === type) &&
        (status === "ALL" || e.status === status),
    )
    .sort((a, b) => b.accruedAt - a.accruedAt);
  return (
    <Panel title="Rincian komisi dan bonus" hint={`${num(rows.length)} entri`}>
      <div className="toolbar">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as BonusType | "ALL")}
          aria-label="Jenis"
        >
          <option value="ALL">Semua jenis</option>
          {(Object.keys(BONUS_LABEL) as BonusType[]).map((t) => (
            <option key={t} value={t}>
              {BONUS_LABEL[t]}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Status"
        >
          <option value="ALL">Semua status</option>
          <option value="payable">Dibayar</option>
          <option value="held">Ditahan</option>
          <option value="pending">Menunggu syarat</option>
          <option value="forfeited">Hangus</option>
          <option value="ineligible">Tidak memenuhi syarat</option>
          <option value="clawback">Ditarik</option>
        </select>
      </div>
      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr>
              <th>Timbul</th>
              <th>Jenis</th>
              <th className="r">Bruto</th>
              <th className="r">Dibayar</th>
              <th>Status</th>
              <th>Jumat bayar</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 400).map((e) => (
              <tr key={e.id}>
                <td className="num">{dateLabel(e.accruedAt)}</td>
                <td>
                  {BONUS_LABEL[e.type]}
                  {e.type === "PEMBINAAN" && e.ref ? ` · gen ${e.ref}` : ""}
                  {e.type === "PASANGAN" && e.ref ? ` · ${e.ref} pasangan` : ""}
                </td>
                <td className="r num">{rp(e.gross)}</td>
                <td className="r num">
                  {e.status === "payable" || e.status === "clawback"
                    ? rp(e.amount)
                    : "–"}
                </td>
                <td>
                  <StatusBadge status={e.status} />
                </td>
                <td className="num">
                  {e.payoutDate ? dateLabel(e.payoutDate) : "–"}
                </td>
                <td className="muted" style={{ fontSize: 12.5 }}>
                  {e.note ??
                    (e.holdUntil
                      ? `Masa tunggu sampai ${monthLabel(e.holdUntil)}`
                      : "")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Peringkat({
  engine,
  accId,
}: {
  engine: MitransEngine;
  accId: string;
}) {
  const acc = engine.accounts.get(accId)!;
  const small = engine.smallLeg(accId);
  const month = engine.today.slice(0, 7);
  const input = engine.rankInputs(accId, month);
  const achievedIdx = acc.ranksAchieved.length
    ? PLAN.monthlyRanks.findIndex(
        (r) => r.name === acc.ranksAchieved[acc.ranksAchieved.length - 1].rank,
      )
    : 0;
  const next = PLAN.monthlyRanks[achievedIdx + 1];
  const claims = [...engine.rankPaid, ...engine.rankQueue].filter(
    (c) => c.accountId === accId,
  );
  const smallPaket = Math.min(input.legPaket.L, input.legPaket.R);
  return (
    <div className="row2 even">
      <Panel title="Peringkat" hint="Volume bulan ini per kaki, paket setara">
        <div style={{ fontSize: 30, fontWeight: 700 }}>
          {currentRank(engine, accId) ?? "Belum berperingkat"}
        </div>
        <p className="muted">
          Bulan ini: kiri {input.legPaket.L.toFixed(2)} · kanan{" "}
          {input.legPaket.R.toFixed(2)} paket · {input.personalTx} transaksi
          pribadi · {input.directActive} Mitra langsung aktif
        </p>
        {acc.rankVerify && (
          <p className="muted" style={{ fontSize: 13 }}>
            Verifikasi {acc.rankVerify.rank}: {acc.rankVerify.months} dari{" "}
            {PLAN.rankVerifyMonths} bulan
          </p>
        )}
        {next && (
          <>
            <div className="progress" aria-label={`Menuju ${next.name}`}>
              <i
                style={{
                  width: `${Math.min(100, (smallPaket / next.legPaket) * 100)}%`,
                }}
              />
            </div>
            <p className="muted" style={{ fontSize: 13 }}>
              Menuju {next.name}: kaki kecil {smallPaket.toFixed(2)} /{" "}
              {num(next.legPaket)} paket bulan ini
            </p>
          </>
        )}
        <table className="t" style={{ marginTop: 10 }}>
          <thead>
            <tr>
              <th>Peringkat</th>
              <th className="r">Syarat</th>
              <th className="r">Bonus</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {PLAN.monthlyRanks.slice(1).map((r) => {
              const got = acc.ranksAchieved.find((x) => x.rank === r.name);
              const claim = claims.find((c) => c.rank === r.name);
              return (
                <tr key={r.name}>
                  <td>{r.name}</td>
                  <td className="r num">{num(r.legPaket)}</td>
                  <td className="r num">{rp(r.reward)}</td>
                  <td>
                    {claim?.paidMonth ? (
                      <Badge tone="good">
                        ✓ Dibayar {monthLabel(claim.paidMonth)}
                      </Badge>
                    ) : claim ? (
                      <Badge tone="info">
                        … Antrean sejak {monthLabel(claim.claimMonth)}
                      </Badge>
                    ) : got ? (
                      <Badge tone="warn">⏸ Tercapai, klaim saat aktif</Badge>
                    ) : (
                      <span className="muted">–</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
      <Panel title="Leadership dan Royalti RO" hint="Leadership: peringkat bulanan · Royalti RO: kaki kecil kumulatif">
        <p style={{ fontSize: 13.5 }}>
          Bobot leadership bulan lalu:{" "}
          {PLAN.monthlyRanks[
            PLAN.monthlyRanks.findIndex(
              (r) =>
                r.name ===
                engine.paidAsRank(accId, addMonths(engine.today.slice(0, 7), -1)),
            )
          ].leadershipWeight}{" "}
          (mulai Director). Dana {PLAN.leadershipFundBp / 100}% omzet bersih
          Lisensi, paling banyak {rp(PLAN.leadershipPersonalMonthlyCap)} per
          orang per bulan.
        </p>
        {[
          ...PLAN.roRoyaltyTiers.map((t) => ({
            ...t,
            name: `Royalti RO tingkat ${t.tier}`,
            share: t.shareBp,
          })),
        ].map((t) => (
          <div key={t.name} style={{ marginBottom: 14 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13.5,
              }}
            >
              <span>
                {t.name} · {pct(t.share / 10_000, 1)}
              </span>
              <span className="num muted">
                {num(Math.min(small, t.smallLeg))} / {num(t.smallLeg)}
              </span>
            </div>
            <div className="progress">
              <i
                style={{
                  width: `${Math.min(100, (small / t.smallLeg) * 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
        <p className="muted" style={{ fontSize: 13 }}>
          Royalti RO dibagi rata kepada pemegang tingkat yang memenuhi syarat
          Plan B, paling banyak {rp(PLAN.roRoyaltyPersonalMonthlyCap)} per
          orang per bulan.
        </p>
      </Panel>
    </div>
  );
}

function PlanB({
  engine,
  accId,
  entries,
  months,
}: {
  engine: MitransEngine;
  accId: string;
  entries: LedgerEntry[];
  months: string[];
}) {
  const acc = engine.accounts.get(accId)!;
  return (
    <>
      <Panel
        title="Syarat Plan B per bulan"
        hint="Langganan/akses aktif · pernah aktif · 1 kegiatan pembinaan terkonfirmasi"
      >
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th>Bulan</th>
                <th>Bulan Lisensi ke-</th>
                <th>Akses aktif</th>
                <th>Pembinaan</th>
                <th>Plan B</th>
                <th className="r">Dibayar Plan B</th>
              </tr>
            </thead>
            <tbody>
              {months
                .slice()
                .reverse()
                .map((m) => {
                  const n = engine.licenseMonthNumber(accId, m);
                  const paid = entries
                    .filter(
                      (e) =>
                        PLAN_B_TYPES.includes(e.type) &&
                        e.settledMonth === m &&
                        e.status === "payable",
                    )
                    .reduce((a, e) => a + e.amount, 0);
                  const eligible = engine.planBEligible(accId, m);
                  return (
                    <tr key={m}>
                      <td>{monthLabel(m)}</td>
                      <td className="num">
                        {n !== undefined && n > 0 ? n : "–"}
                      </td>
                      <td>
                        {engine.accessActive(accId, m)
                          ? engine.hasPaidSubscription(accId, m)
                            ? "Langganan"
                            : "Masa Lisensi"
                          : "–"}
                      </td>
                      <td>
                        {eligible ||
                        (engine.accessActive(accId, m) && acc.everActive)
                          ? eligible
                            ? "✓"
                            : "Belum"
                          : "–"}
                      </td>
                      <td>
                        {eligible ? (
                          <Badge tone="good">✓ Memenuhi</Badge>
                        ) : (
                          <Badge tone="mute">Belum</Badge>
                        )}
                      </td>
                      <td className="r num">{paid ? rp(paid) : "–"}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Kegiatan pembinaan yang dihitung (Rencana Pemasaran 9.4)">
        <ul style={{ margin: 0 }}>
          <li>
            Sesi belajar tim minimal 60 menit, dihadiri minimal 3 peserta dari
            jaringan yang mengonfirmasi kehadiran.
          </li>
          <li>
            Pendampingan orientasi Mitra PLS atau Pelanggan baru dengan daftar
            periksa selesai dan dikonfirmasi.
          </li>
          <li>
            Sesi pemakaian platform 1:1 minimal 30 menit, dikonfirmasi penerima
            beserta nilai 1–5.
          </li>
        </ul>
        <p className="muted" style={{ fontSize: 13 }}>
          Konfirmasi dari akun yang dikendalikan sendiri tidak dihitung.
        </p>
      </Panel>
    </>
  );
}

function Rujukan({ engine, accId }: { engine: MitransEngine; accId: string }) {
  const acc = engine.accounts.get(accId)!;
  const customerSales = [...engine.sales.values()].filter(
    (s) => s.kind === "license" && s.sellerId === accId && s.toCustomer,
  );
  return (
    <div className="row2 even">
      <Panel title="Tautan rujukan">
        {acc.quizPassed ? (
          <>
            <div className="reflink">
              https://affiliatemarketing.network/r/{acc.code}
            </div>
            <p className="muted" style={{ fontSize: 13 }}>
              Gunakan materi pemasaran resmi. Dilarang menjanjikan penghasilan,
              keuntungan investasi, atau sinyal beli/jual.
            </p>
          </>
        ) : (
          <div className="callout warn">
            Tautan belum aktif. Selesaikan kuis singkat Kode Etik (gratis) di
            Kelas Kemitraan atau secara daring.
          </div>
        )}
      </Panel>
      <Panel
        title="Pendampingan orientasi Pelanggan"
        hint="Konfirmasi oleh Pelanggan di aplikasi"
      >
        <div className="table-wrap" style={{ maxHeight: 360 }}>
          <table className="t">
            <thead>
              <tr>
                <th>Pelanggan</th>
                <th>Pembelian</th>
                <th>Orientasi</th>
              </tr>
            </thead>
            <tbody>
              {customerSales.map((s) => (
                <tr key={s.id}>
                  <td>{engine.accounts.get(s.buyerId)!.name}</td>
                  <td className="num">{dateLabel(s.at)}</td>
                  <td>
                    {s.cancelled ? (
                      <Badge tone="bad">↩ Dibatalkan</Badge>
                    ) : s.orientationConfirmedAt ? (
                      <Badge tone="good">
                        ✓ {dateLabel(s.orientationConfirmedAt)}
                      </Badge>
                    ) : (
                      <Badge tone="warn">⏸ Belum dikonfirmasi</Badge>
                    )}
                    {s.convertedAt ? (
                      <span className="muted"> · dikonversi</span>
                    ) : null}
                  </td>
                </tr>
              ))}
              {customerSales.length === 0 && (
                <tr>
                  <td colSpan={3} className="muted">
                    Belum ada penjualan kepada Pelanggan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
