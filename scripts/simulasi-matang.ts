/**
 * Simulasi jaringan matang 36 bulan: penjualan baru setiap bulan naik lalu stabil pada tingkat tertentu,
 * pelanggan Atlas Membership menumpuk (retensi 85%/bulan), dan Mitra PLS teratas (M1) tetap aktif.
 * Tujuan: melihat omzet bulanan jaringan yang dibutuhkan untuk penghasilan M1 Rp100 jt, Rp500 jt, dan
 * Rp1 miliar per bulan dengan aturan v2.0. Jalankan: npx tsx scripts/simulasi-matang.ts
 * Hasil: docs/SIMULASI_JARINGAN_MATANG.md. Data sintetis; bukan proyeksi atau janji penghasilan.
 */
import { writeFileSync } from "node:fs";
import {
  BONUS_LABEL,
  MitransEngine,
  PLAN,
  atWib,
  monthFromIndex,
  monthIndex,
  mulberry32,
  syntheticName,
  syntheticNik,
  type BonusType,
} from "../src/engine";

const PLATFORM_PER_ACCOUNT_MONTH = Math.round(
  PLAN.serviceFundPerLicense / PLAN.license.accessMonths,
);
const WORKSHOP_PER_SEAT = 800_000;
const WORKSHOP_OPS_PER_EVENT = 1_300_000;
const SEATS_PER_EVENT = 30;
const MONTHS = Number(process.env.MONTHS ?? 36);
const RETENTION = 0.85;
const START = "2027-01";
const si = monthIndex(START);

const pct = (x: number) => `${(x * 100).toFixed(1).replace(".", ",")}%`;
const rp = (x: number) => `Rp${Math.round(x).toLocaleString("id-ID")}`;
const rpS = (x: number) =>
  Math.abs(x) >= 1e9
    ? `Rp${(x / 1e9).toFixed(2).replace(".", ",")} M`
    : `Rp${(x / 1e6).toFixed(1).replace(".", ",")} jt`;

interface Params {
  key: string;
  product: "license" | "family";
  /** Penjualan baru per bulan saat stabil: Lisensi Atlas, atau paket Family. */
  plateau: number;
  /** Penjualan pribadi M1 per bulan (Lisensi atau paket Family). */
  topSales: number;
  /** Penjual hanya Mitra PLS dalam 10 level di bawah M1 (tim pemimpin yang produktif). */
  focus: boolean;
  /** Porsi penjualan kepada Pelanggan (Lisensi Atlas; volumenya tercatat di posisi penjual). */
  customerShare: number;
}

interface Holder {
  id: string;
  activation: number;
  accessMonths: number;
  subscribed: boolean;
  mitra: boolean;
}

function run(p: Params) {
  const rnd = mulberry32(2027 + p.plateau + p.topSales);
  const e = new MitransEngine(atWib(`${START}-01`, 0, 1));
  const holders: Holder[] = [];
  let c = 0;
  let s = 0;
  const reg = (sponsorId: string, at: number) => {
    const id = `M${++c}`;
    e.registerMitra({
      id,
      name: syntheticName(c),
      nik: syntheticNik(c),
      sponsorId,
      at,
    });
    e.passQuiz(id);
    return id;
  };
  const sell = (sellerId: string, at: number, m: number, toCustomer: boolean) => {
    if (toCustomer) {
      const id = `P${++c}`;
      e.registerPelanggan({ id, name: syntheticName(c), nik: syntheticNik(c), sellerId, at });
      e.purchaseLicense({ saleId: `S${++s}`, buyerId: id, at });
      holders.push({ id, activation: si + m, accessMonths: PLAN.license.accessMonths, subscribed: true, mitra: false });
      return;
    }
    if (p.product === "license") {
      const id = reg(sellerId, at);
      e.purchaseLicense({ saleId: `S${++s}`, buyerId: id, at });
      holders.push({
        id,
        activation: si + m,
        accessMonths: PLAN.license.accessMonths,
        subscribed: true,
        mitra: true,
      });
    } else {
      const head = reg(sellerId, at);
      const l = reg(head, at);
      const r = reg(head, at);
      e.purchaseFamily({
        saleId: `S${++s}`,
        headId: head,
        leftId: l,
        rightId: r,
        at,
      });
      for (const id of [head, l, r])
        holders.push({
          id,
          activation: si + m,
          accessMonths: PLAN.family.accessMonths,
          subscribed: true,
          mitra: true,
        });
    }
  };
  // Penjual per bulan: setiap penjual membuat 2 penjualan Lisensi (atau 1 paket Family = 3 kursi) agar aktif.
  const perSeller = 2;
  const top: number[] = [];
  const network: number[] = [];
  for (let m = 0; m < MONTHS; m++) {
    const month = monthFromIndex(si + m);
    for (const h of holders) {
      if (!h.subscribed) continue;
      const n = si + m - h.activation + 1;
      if (n > h.accessMonths) {
        if (h.id !== "M1" && n > h.accessMonths + 1 && rnd() > RETENTION) {
          h.subscribed = false;
          continue;
        }
        e.paySubscription({
          saleId: `S${++s}`,
          accountId: h.id,
          forMonth: month,
          at: atWib(`${month}-01`, 6),
        });
      }
      e.confirmCoaching(h.id, month);
    }
    if (m === 0) {
      const id = reg("MITRANS-002", atWib(`${month}-02`, 9));
      if (p.product === "license")
        e.purchaseLicense({
          saleId: `S${++s}`,
          buyerId: id,
          at: atWib(`${month}-02`, 9),
        });
      else {
        const l = reg(id, atWib(`${month}-02`, 9));
        const r = reg(id, atWib(`${month}-02`, 9));
        e.purchaseFamily({
          saleId: `S${++s}`,
          headId: id,
          leftId: l,
          rightId: r,
          at: atWib(`${month}-02`, 9),
        });
        holders.push({
          id: l,
          activation: si,
          accessMonths: PLAN.family.accessMonths,
          subscribed: true,
          mitra: true,
        });
        holders.push({
          id: r,
          activation: si,
          accessMonths: PLAN.family.accessMonths,
          subscribed: true,
          mitra: true,
        });
      }
      holders.push({
        id,
        activation: si,
        accessMonths:
          p.product === "license"
            ? PLAN.license.accessMonths
            : PLAN.family.accessMonths,
        subscribed: true,
        mitra: true,
      });
      continue;
    }
    // M1 menjual sendiri; sisanya dari Mitra lain yang dipilih acak (penjualan baru naik sampai plateau).
    const m1Depth = e.nodes.get(e.accounts.get("M1")!.nodeId!)!.depth;
    const eligible = holders.filter((h) => {
      if (!h.mitra || h.id === "M1") return false;
      if (!p.focus) return true;
      const nodeId = e.accounts.get(h.id)?.nodeId;
      return nodeId !== undefined && e.nodes.get(nodeId)!.depth - m1Depth <= 10;
    });
    const capacity = Math.min(p.plateau, (eligible.length + 1) * perSeller);
    const sales: { seller: string; day: number; customer: boolean }[] = [];
    for (let k = 0; k < p.topSales; k++)
      sales.push({ seller: "M1", day: 3 + (k % 25), customer: rnd() < p.customerShare });
    const others = Math.max(0, Math.floor((capacity - p.topSales) / perSeller));
    // Pilih penjual tanpa pengulangan (acak urutannya): bila kapasitas penuh, semua Mitra yang memenuhi syarat aktif.
    for (let k = eligible.length - 1; k > 0; k--) {
      const j = Math.floor(rnd() * (k + 1));
      [eligible[k], eligible[j]] = [eligible[j], eligible[k]];
    }
    for (let k = 0; k < others; k++) {
      if (k >= eligible.length) break;
      const seller = eligible[k].id;
      const day = 3 + Math.floor(rnd() * 25);
      for (let j = 0; j < perSeller; j++) sales.push({ seller, day, customer: rnd() < p.customerShare });
    }
    sales.sort((a, b) => a.day - b.day);
    for (const x of sales)
      sell(
        x.seller,
        atWib(`${month}-${String(x.day).padStart(2, "0")}`, 10),
        m,
        x.customer,
      );
  }
  e.closeThrough(monthFromIndex(si + MONTHS - 1));

  // Penghasilan M1 per bulan penetapan.
  const byMonth = new Map<string, number>();
  const topByType = new Map<BonusType, number>();
  const last12 = new Set(
    Array.from({ length: 12 }, (_, i) => monthFromIndex(si + MONTHS - 12 + i)),
  );
  const income = new Map<string, number>();
  for (const x of e.ledger) {
    if (x.status !== "payable" && x.status !== "clawback") continue;
    income.set(x.accountId, (income.get(x.accountId) ?? 0) + x.amount);
    if (x.accountId !== "M1") continue;
    const mo = x.settledMonth ?? x.month;
    byMonth.set(mo, (byMonth.get(mo) ?? 0) + x.amount);
    if (last12.has(mo))
      topByType.set(x.type, (topByType.get(x.type) ?? 0) + x.amount);
  }
  for (let m = 0; m < MONTHS; m++) {
    const mo = monthFromIndex(si + m);
    top.push(byMonth.get(mo) ?? 0);
    const r = e.reports[m];
    network.push(r ? r.licenseNet + r.subscriptionNet : 0);
  }
  const R = e.reports;
  let reserved = 0;
  let seats = 0;
  for (const x of e.sales.values()) {
    if (x.kind !== "license" || x.cancelled) continue;
    seats++;
    reserved +=
      (x.product === "family"
        ? PLAN.family.accessMonths
        : PLAN.license.accessMonths) * PLATFORM_PER_ACCOUNT_MONTH;
  }
  const sum = (f: (r: (typeof R)[number]) => number) =>
    R.reduce((a, r) => a + f(r), 0);
  const net = sum((r) => r.licenseNet + r.subscriptionNet);
  const bonus = sum((r) => r.planAPaid + r.planBPaid);
  const platform =
    reserved + sum((r) => r.subscriptionsPaid) * PLATFORM_PER_ACCOUNT_MONTH;
  const workshop =
    seats * WORKSHOP_PER_SEAT +
    Math.ceil(seats / SEATS_PER_EVENT) * WORKSHOP_OPS_PER_EVENT;
  const profit = net - bonus - platform - workshop;
  const maxA = Math.max(
    ...R.filter((r) => r.licenseNet > 0).map((r) => r.planAPct),
  );
  const mitra = [...e.accounts.values()].filter((a) => a.role === "mitra");
  const vals = mitra.map((a) => income.get(a.id) ?? 0).sort((a, b) => b - a);
  const lastMonth = monthFromIndex(si + MONTHS - 1);
  const avg12 = top.slice(-12).reduce((a, b) => a + b, 0) / 12;
  const net12 = network.slice(-12).reduce((a, b) => a + b, 0) / 12;
  const first = (limit: number) => {
    const i = top.findIndex((v) => v >= limit);
    return i < 0 ? "–" : `bulan ke-${i + 1}`;
  };
  return {
    p,
    mitra: mitra.length,
    net,
    bonus,
    profit,
    maxA,
    avg12,
    net12,
    maxTop: Math.max(...top),
    totalTop: top.reduce((a, b) => a + b, 0),
    rank: e.paidAsRank("M1", lastMonth),
    first100: first(100e6),
    first500: first(500e6),
    first1000: first(1e9),
    topByType,
    top10: vals.slice(0, 10).reduce((a, b) => a + b, 0) / 10 / MONTHS,
    zero: vals.filter((v) => v <= 0).length / (vals.length || 1),
    median: vals[Math.floor(vals.length / 2)] ?? 0,
  };
}

const configs: Params[] = (
  process.env.CONFIGS ??
  "license:1000:2:acak:30,license:6000:2:acak:30,license:1500:20:fokus:50,license:6000:20:fokus:50,family:1000:20:fokus:50,family:6000:20:fokus:50"
)
  .split(",")
  .map((x) => {
    const [product, plateau, topSales, focus = "acak", cust = "0"] = x.split(":");
    return {
      key: `${product === "license" ? "Platinum" : "Family"} ${Number(plateau).toLocaleString("id-ID")}/bln, ${focus === "fokus" ? "tim 10 level" : "acak"}, Pelanggan ${cust}%, M1 ${topSales}`,
      product: product as Params["product"],
      plateau: Number(plateau),
      topSales: Number(topSales),
      focus: focus === "fokus",
      customerShare: Number(cust) / 100,
    };
  });

const results = configs.map((p) => {
  const t0 = Date.now();
  const r = run(p);
  console.error(`${p.key}: ${((Date.now() - t0) / 1000).toFixed(1)} dtk`);
  return r;
});

const out: string[] = [];
out.push("# Simulasi Jaringan Matang 36 Bulan");
out.push("");
out.push(
  `Dibuat oleh \`npx tsx scripts/simulasi-matang.ts\` · parameter v${PLAN.version} · ${MONTHS} bulan sejak ${START}`,
);
out.push("");
out.push(
  "> Data sintetis. Menguji berapa omzet bulanan jaringan yang dibutuhkan agar Mitra PLS teratas (M1) mencapai penghasilan tertentu. Bukan proyeksi penjualan atau janji penghasilan.",
);
out.push("");
out.push("Asumsi:");
out.push(
  "- Penjualan baru per bulan naik secepat mungkin (setiap penjual membuat 2 penjualan Lisensi atau 1 paket Family agar aktif), lalu **stabil** pada angka di nama skenario.",
);
out.push(
  "- Penjual dipilih acak tanpa pengulangan: «acak» dari seluruh Mitra PLS pemegang Lisensi, «tim 10 level» hanya dari Mitra dalam 10 level di bawah M1 (bila kapasitas penuh, seluruh tim aktif). Porsi Pelanggan membeli Lisensi Atlas dan volumenya tercatat di posisi penjual; M1 menjual sendiri sejumlah yang disebut (2 = syarat aktif; 20 = syarat transaksi pribadi Royal Crown).",
);
out.push(
  `- Atlas Membership dimulai setelah masa akses; retensi ${pct(RETENTION)} per bulan (M1 selalu berlangganan); semua menjalankan 1 kegiatan pembinaan per bulan.`,
);
out.push(
  "- Model biaya sama dengan audit: layanan Rp142.000 per akun per bulan, workshop Rp800.000 per kursi + Rp1.300.000 per 30 peserta. Laba sebelum biaya kantor dan pajak.",
);
out.push("");
out.push("## 1. Penghasilan M1 dan omzet jaringan");
out.push("");
out.push(
  "| Skenario | Omzet bersih jaringan/bln (12 bln terakhir) | M1 rata-rata/bln (12 bln terakhir) | M1 bulan tertinggi | M1 total 36 bln | Peringkat M1 akhir | ≥Rp100 jt | ≥Rp500 jt | ≥Rp1 M |",
);
out.push("|---|---:|---:|---:|---:|---|---|---|---|");
for (const r of results)
  out.push(
    `| ${r.p.key} | ${rpS(r.net12)} | **${rpS(r.avg12)}** | ${rpS(r.maxTop)} | ${rpS(r.totalTop)} | ${r.rank} | ${r.first100} | ${r.first500} | ${r.first1000} |`,
  );
out.push("");
out.push("## 2. Susunan penghasilan M1 (12 bulan terakhir)");
out.push("");
const types = new Set<BonusType>();
for (const r of results) for (const t of r.topByType.keys()) types.add(t);
out.push("| Jenis | " + results.map((r) => r.p.key).join(" | ") + " |");
out.push("|---|" + results.map(() => "---:").join("|") + "|");
for (const t of types)
  out.push(
    `| ${BONUS_LABEL[t]} | ${results.map((r) => rpS(r.topByType.get(t) ?? 0)).join(" | ")} |`,
  );
out.push("");
out.push("## 3. Perusahaan dan sebaran penghasilan (36 bulan)");
out.push("");
out.push(
  "| Skenario | Mitra PLS | Omzet bersih | Rasio Mitra | Bulan Plan A tertinggi | Rasio perusahaan | 10 teratas rata-rata/bln | Median | Tanpa bonus |",
);
out.push("|---|---:|---:|---:|---:|---:|---:|---:|---:|");
for (const r of results)
  out.push(
    `| ${r.p.key} | ${r.mitra.toLocaleString("id-ID")} | ${rpS(r.net)} | ${pct(r.bonus / r.net)} | ${pct(r.maxA)} | ${pct(r.profit / r.net)} | ${rpS(r.top10)} | ${rp(r.median)} | ${pct(r.zero)} |`,
  );
out.push("");
writeFileSync("docs/SIMULASI_JARINGAN_MATANG.md", out.join("\n") + "\n");
console.log(out.join("\n"));
