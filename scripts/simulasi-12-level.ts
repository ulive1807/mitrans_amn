/**
 * Simulasi jaringan biner ideal 12 level untuk Lisensi Atlas (Rp7,5 jt) dan Lisensi Atlas Family (Rp25 jt).
 * Menghitung omzet perusahaan, penghasilan Mitra PLS posisi teratas, rasio bonus Mitra, dan rasio laba
 * perusahaan dengan aturan v2.0 (src/engine/plan.ts). Jalankan: npx tsx scripts/simulasi-12-level.ts
 * Hasil: docs/SIMULASI_12_LEVEL.md. Data sintetis; bukan proyeksi penjualan atau janji penghasilan.
 */
import { writeFileSync } from "node:fs";
import {
  BONUS_LABEL,
  MitransEngine,
  PLAN,
  atWib,
  monthFromIndex,
  monthIndex,
  syntheticName,
  syntheticNik,
  type BonusType,
} from "../src/engine";

// Model biaya sama dengan scripts/audit.ts.
const PLATFORM_PER_ACCOUNT_MONTH = Math.round(
  PLAN.serviceFundPerLicense / PLAN.license.accessMonths,
);
const WORKSHOP_PER_SEAT = 800_000;
const WORKSHOP_OPS_PER_EVENT = 1_300_000;
const SEATS_PER_EVENT = 30;
const LEVELS = 12;
const MONTHS = 16;

const START = "2027-01";
const si = monthIndex(START);
const pct = (x: number) => `${(x * 100).toFixed(1).replace(".", ",")}%`;
const rp = (x: number) => `Rp${Math.round(x).toLocaleString("id-ID")}`;
const rpM = (x: number) =>
  x >= 1e9
    ? `Rp${(x / 1e9).toFixed(2).replace(".", ",")} M`
    : `Rp${(x / 1e6).toFixed(1).replace(".", ",")} jt`;

interface Holder {
  id: string;
  activation: number; // indeks bulan aktivasi
  accessMonths: number;
}

interface World {
  e: MitransEngine;
  /** M1 tetap aktif: menjual 2 Lisensi Atlas kepada Pelanggan setiap bulan setelah bulan pertamanya. */
  topActive: boolean;
  holders: Holder[];
  nextId: () => string;
  nextSale: () => string;
}

function world(topActive: boolean): World {
  const e = new MitransEngine(atWib(`${START}-01`, 0, 1));
  let c = 0;
  let s = 0;
  return { e, topActive, holders: [], nextId: () => `M${++c}`, nextSale: () => `S${++s}` };
}

function register(w: World, sponsorId: string, at: number): string {
  const id = w.nextId();
  const n = Number(id.slice(1));
  w.e.registerMitra({
    id,
    name: syntheticName(n),
    nik: syntheticNik(n),
    sponsorId,
    at,
  });
  w.e.passQuiz(id);
  return id;
}

/** Bulanan: Atlas Membership setelah masa akses (diasumsikan semua berlangganan) dan 1 kegiatan pembinaan. */
function monthStart(w: World, m: number) {
  const month = monthFromIndex(si + m);
  for (const h of w.holders) {
    if (si + m - h.activation + 1 > h.accessMonths)
      w.e.paySubscription({
        saleId: w.nextSale(),
        accountId: h.id,
        forMonth: month,
        at: atWib(`${month}-01`, 6),
      });
    w.e.confirmCoaching(h.id, month);
  }
  if (w.topActive && m >= 1) {
    const sold: string[] = [];
    for (let k = 0; k < 2; k++) {
      const at = atWib(`${month}-05`, 10 + k);
      const pid = `P${w.nextSale()}`;
      w.e.registerPelanggan({ id: pid, name: pid, nik: syntheticNik(500_000 + m * 10 + k), sellerId: "M1", at });
      const saleId = w.nextSale();
      w.e.purchaseLicense({ saleId, buyerId: pid, at });
      sold.push(saleId);
    }
    for (const saleId of sold) w.e.confirmOrientation(saleId, atWib(`${month}-07`, 10));
  }
  return atWib(`${month}-10`, 10);
}

/** A. Lisensi Atlas: pohon biner penuh 12 level di bawah Mitra teratas; setiap orang menjual 2 (kiri dan kanan). */
function scenarioLicense(topActive: boolean): World {
  const w = world(topActive);
  let frontier: string[] = [];
  for (let m = 0; m < MONTHS; m++) {
    const at = monthStart(w, m);
    if (m > LEVELS) continue;
    const next: string[] = [];
    for (const sp of m === 0 ? ["MITRANS-002"] : frontier)
      for (const leg of m === 0 ? (["L"] as const) : (["L", "R"] as const)) {
        const id = register(w, sp, at);
        w.e.purchaseLicense({
          saleId: w.nextSale(),
          buyerId: id,
          at,
          legPreference: leg,
        });
        w.holders.push({
          id,
          activation: si + m,
          accessMonths: PLAN.license.accessMonths,
        });
        next.push(id);
      }
    frontier = next;
  }
  return w;
}

function buyFamily(
  w: World,
  sellerId: string,
  at: number,
  m: number,
): [string, string, string] {
  const head = register(w, sellerId, at);
  const left = register(w, head, at);
  const right = register(w, head, at);
  w.e.purchaseFamily({
    saleId: w.nextSale(),
    headId: head,
    leftId: left,
    rightId: right,
    at,
  });
  for (const id of [head, left, right])
    w.holders.push({
      id,
      activation: si + m,
      accessMonths: PLAN.family.accessMonths,
    });
  return [head, left, right];
}

/**
 * B. Family penuh: semua posisi 12 level berisi kursi Family. Kaki ayah diisi anak dan istri; anak dan istri
 * masing-masing menjual 2 paket Family (kiri dan kanan) sehingga pohon tetap penuh.
 */
function scenarioFamilyFull(topActive: boolean): World {
  const w = world(topActive);
  let sellers: string[] = [];
  for (let m = 0; m < MONTHS; m++) {
    const at = monthStart(w, m);
    // Generasi paket ke-g menempati kedalaman 2g (ayah) dan 2g+1 (anak, istri).
    if (2 * m > LEVELS) continue; // generasi ke-6: ayah di level 12, anak dan istri di level 13
    const next: string[] = [];
    if (m === 0) {
      const [, l, r] = buyFamily(w, "MITRANS-002", at, m);
      next.push(l, r);
    } else
      for (const sp of sellers)
        for (let k = 0; k < 2; k++) {
          const [, l, r] = buyFamily(w, sp, at, m);
          next.push(l, r);
        }
    sellers = next;
  }
  return w;
}

/** C. Pola Family resmi: setiap ayah menjual 2 paket Family per bulan selama 2 bulan; anak dan istri belum menjual. */
function scenarioFamilyHeadline(topActive: boolean): World {
  const w = world(topActive);
  const heads: { id: string; j: number }[] = [];
  for (let m = 0; m < MONTHS; m++) {
    const at = monthStart(w, m);
    if (m === 0) {
      heads.push({ id: buyFamily(w, "MITRANS-002", at, m)[0], j: 0 });
      continue;
    }
    if (m > 7) continue; // berhenti saat kedalaman jaringan melewati 12 level
    for (const h of heads.filter((x) => x.j < m && m - x.j <= 2))
      for (let k = 0; k < 2; k++)
        heads.push({ id: buyFamily(w, h.id, at, m)[0], j: m });
  }
  return w;
}

function report(key: string, label: string, w: World) {
  const e = w.e;
  e.closeThrough(monthFromIndex(si + MONTHS - 1));
  // Biaya layanan dicadangkan saat penjualan untuk seluruh masa akses; Membership per bulan.
  let reserved = 0;
  let seats = 0;
  let licenseGross = 0;
  for (const s of e.sales.values()) {
    if (s.kind !== "license" || s.cancelled) continue;
    seats++;
    reserved +=
      (s.product === "family"
        ? PLAN.family.accessMonths
        : PLAN.license.accessMonths) * PLATFORM_PER_ACCOUNT_MONTH;
    licenseGross +=
      s.product === "family"
        ? PLAN.family.price / PLAN.family.seats
        : PLAN.license.price;
  }
  const R = e.reports;
  const sum = (f: (r: (typeof R)[number]) => number) =>
    R.reduce((a, r) => a + f(r), 0);
  const licNet = sum((r) => r.licenseNet);
  const subNet = sum((r) => r.subscriptionNet);
  const subsPaid = sum((r) => r.subscriptionsPaid);
  const planA = sum((r) => r.planAPaid);
  const planB = sum((r) => r.planBPaid);
  const platform = reserved + subsPaid * PLATFORM_PER_ACCOUNT_MONTH;
  const workshop =
    seats * WORKSHOP_PER_SEAT +
    Math.ceil(seats / SEATS_PER_EVENT) * WORKSHOP_OPS_PER_EVENT;
  const net = licNet + subNet;
  const profit = net - planA - planB - platform - workshop;
  const gross = licenseGross + subsPaid * PLAN.subscription.price;

  // Penghasilan per Mitra PLS.
  const income = new Map<string, number>();
  const byMonthTop = new Map<string, number>();
  const topByType = new Map<BonusType, number>();
  for (const x of e.ledger) {
    if (x.status !== "payable" && x.status !== "clawback") continue;
    income.set(x.accountId, (income.get(x.accountId) ?? 0) + x.amount);
    if (x.accountId === "M1") {
      const mo = x.settledMonth ?? x.month;
      byMonthTop.set(mo, (byMonthTop.get(mo) ?? 0) + x.amount);
      topByType.set(x.type, (topByType.get(x.type) ?? 0) + x.amount);
    }
  }
  const mitra = [...e.accounts.values()].filter((a) => a.role === "mitra");
  const values = mitra.map((a) => income.get(a.id) ?? 0).sort((a, b) => a - b);
  const median = values[Math.floor(values.length / 2)] ?? 0;
  const zero = values.filter((v) => v <= 0).length / (values.length || 1);
  const top = income.get("M1") ?? 0;
  const topMonth = Math.max(0, ...byMonthTop.values());
  const end90 = e.program90End("M1")!;
  const top90 = e.ledger
    .filter(
      (x) =>
        x.accountId === "M1" && x.status === "payable" && x.accruedAt < end90,
    )
    .reduce((a, x) => a + x.amount, 0);
  const maxMonthA = Math.max(
    ...R.filter((r) => r.licenseNet > 0).map((r) => r.planAPct),
  );
  const maxDepth =
    Math.max(...[...e.nodes.values()].map((n) => n.depth)) -
    e.nodes.get(e.accounts.get("M1")!.nodeId!)!.depth;
  const held = e.heldEntries.reduce((a, x) => a + x.gross, 0);

  return {
    key,
    label,
    mitra: mitra.length,
    seats,
    maxDepth,
    gross,
    licNet,
    subNet,
    net,
    planA,
    planB,
    platform,
    workshop,
    profit,
    top,
    topMonth,
    top90,
    topByType,
    median,
    zero,
    maxMonthA,
    held,
    capOk:
      planA <= (licNet * PLAN.planACapBp) / 10_000 &&
      planB <= (subNet * PLAN.planBCapBp) / 10_000,
  };
}

const results = [
  report(
    "A",
    "Lisensi Atlas Rp7,5 jt: pohon penuh 12 level",
    scenarioLicense(true),
  ),
  report(
    "B",
    "Lisensi Atlas Family Rp25 jt: pohon penuh 12 level",
    scenarioFamilyFull(true),
  ),
  report(
    "C",
    "Pola Family resmi: ayah menjual 2 paket/bulan selama 2 bulan",
    scenarioFamilyHeadline(true),
  ),
];
// Pembanding: M1 berhenti menjual setelah pola awal (tidak aktif), aturan lain sama.
const passive = [
  report("A", "", scenarioLicense(false)),
  report("B", "", scenarioFamilyFull(false)),
  report("C", "", scenarioFamilyHeadline(false)),
];

const out: string[] = [];
out.push(
  "# Simulasi Jaringan Biner 12 Level: Lisensi Atlas dan Lisensi Atlas Family",
);
out.push("");
out.push(
  `Dibuat oleh \`npx tsx scripts/simulasi-12-level.ts\` · parameter v${PLAN.version} · ${MONTHS} bulan sejak ${START}`,
);
out.push("");
out.push(
  "> Data sintetis untuk menguji aturan bonus pada keadaan **terbaik bagi Mitra** (duplikasi sempurna, tanpa pembatalan, semua berlangganan Atlas Membership). Bukan proyeksi penjualan atau janji penghasilan.",
);
out.push("");
out.push("Skenario:");
out.push(
  "- **A**: Mitra teratas (M1) membeli Lisensi Atlas; setiap orang menjual 2 Lisensi (kiri dan kanan) pada bulan berikutnya sampai 12 level di bawah M1 penuh (8.191 orang).",
);
out.push(
  "- **B**: semua posisi 12 level berisi kursi Family. Kaki ayah diisi anak dan istri; setiap anak dan istri menjual 2 paket Family.",
);
out.push(
  "- **C**: pola Family yang disetujui: setiap ayah menjual 2 paket per bulan selama 2 bulan pertamanya; anak dan istri belum menjual. Jaringan tumbuh 7 bulan; karena paket ke-2 dan seterusnya ditempatkan di ujung kaki, kedalamannya melewati 12 level (bonus tetap hanya dihitung 10 level).",
);
out.push(
  "- Di semua skenario, **M1 tetap aktif**: setelah bulan pertamanya M1 menjual 2 Lisensi Atlas kepada Pelanggan setiap bulan (syarat aktif). Mitra lain hanya menjual sesuai pola lalu berhenti, sehingga bonus tim mereka ditahan lalu hangus ke Pool Aktif. Baris pembanding menunjukkan M1 bila ia juga berhenti menjual.",
);
out.push(
  "- B: generasi paket ke-6 menempatkan ayah di level 12; anak dan istrinya berada di level 13.",
);
out.push("");
out.push("## 1. Omzet perusahaan, bonus Mitra, dan laba");
out.push("");
out.push("| Pos | " + results.map((r) => `${r.key}`).join(" | ") + " |");
out.push("|---|" + results.map(() => "---:").join("|") + "|");
const row = (label: string, f: (r: (typeof results)[number]) => string) =>
  out.push(`| ${label} | ${results.map(f).join(" | ")} |`);
row("Mitra PLS (kursi)", (r) => r.mitra.toLocaleString("id-ID"));
row("Kedalaman jaringan di bawah M1", (r) => `${r.maxDepth} level`);
row("Omzet kotor (termasuk PPN)", (r) => rpM(r.gross));
row("Omzet bersih Lisensi", (r) => rpM(r.licNet));
row("Omzet bersih Atlas Membership", (r) => rpM(r.subNet));
row("**Omzet bersih total**", (r) => `**${rpM(r.net)}**`);
row(
  "Bonus Plan A dibayar",
  (r) => `${rpM(r.planA)} (${pct(r.planA / r.licNet)})`,
);
row(
  "Bonus Plan B dibayar",
  (r) => `${rpM(r.planB)} (${pct(r.subNet ? r.planB / r.subNet : 0)})`,
);
row(
  "**Rasio Mitra** (bonus ÷ omzet bersih)",
  (r) => `**${pct((r.planA + r.planB) / r.net)}**`,
);
row("Bulan Plan A tertinggi", (r) => pct(r.maxMonthA));
row("Biaya layanan platform", (r) => rpM(r.platform));
row("Biaya workshop", (r) => rpM(r.workshop));
row("Laba sebelum biaya kantor dan pajak", (r) => rpM(r.profit));
row(
  "**Rasio perusahaan** (laba ÷ omzet bersih)",
  (r) => `**${pct(r.profit / r.net)}**`,
);
row("Bonus masih ditahan di akhir", (r) => rpM(r.held));
row("Plafon 60% / 50% terjaga", (r) => (r.capOk ? "✓ Ya" : "✗ Tidak"));
out.push("");
out.push("## 2. Penghasilan Mitra PLS posisi teratas (M1)");
out.push("");
out.push("| | " + results.map((r) => r.key).join(" | ") + " |");
out.push("|---|" + results.map(() => "---:").join("|") + "|");
row("90 hari pertama", (r) => rp(r.top90));
row("Bulan tertinggi", (r) => rp(r.topMonth));
row(`Total ${MONTHS} bulan`, (r) => rp(r.top));
const types = new Set<BonusType>();
for (const r of results) for (const t of r.topByType.keys()) types.add(t);
for (const t of types)
  row(`– ${BONUS_LABEL[t]}`, (r) => rp(r.topByType.get(t) ?? 0));
out.push(
  `| **Pembanding: total ${MONTHS} bulan bila M1 berhenti menjual** | ${passive.map((r) => `**${rp(r.top)}**`).join(" | ")} |`,
);
row("Median seluruh Mitra PLS", (r) => rp(r.median));
row("Mitra PLS tanpa komisi/bonus", (r) => pct(r.zero));
out.push("");
out.push("## 3. Kesimpulan otomatis");
out.push("");
for (const r of results)
  out.push(
    `- ${r.capOk && r.profit / r.net >= 0.15 ? "✓" : "✗"} **${r.key}. ${r.label}**: rasio Mitra ${pct((r.planA + r.planB) / r.net)}, rasio perusahaan ${pct(r.profit / r.net)}, M1 ${rp(r.top)} selama ${MONTHS} bulan.`,
  );
out.push("");
out.push(
  "Model biaya sama dengan `docs/AUDIT_KOMPENSASI_V2.md`: layanan platform Rp142.000 per akun per bulan (dicadangkan untuk seluruh masa akses saat penjualan), workshop Rp800.000 per kursi + Rp1.300.000 per event 30 peserta. Belum termasuk biaya kantor, gaji, pemasaran perusahaan, dan PPh badan.",
);
writeFileSync("docs/SIMULASI_12_LEVEL.md", out.join("\n") + "\n");
console.log(out.join("\n"));
