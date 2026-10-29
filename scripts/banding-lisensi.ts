/**
 * Membandingkan aturan Lisensi v1.4 (Lisensi tanpa batas waktu, Langganan/RO setiap 30 hari sejak aktivasi)
 * dengan v1.3 (akses 3 bulan, Langganan mulai bulan ke-4).
 * Engine sekarang hanya menjalankan aturan v1.4; angka v1.3 adalah hasil tetap dari scripts/banding-lisensi.ts
 * pada commit 52d54dc (engine aturan v1.3), dengan omzet dan bonus dibulatkan ke 0,01 miliar.
 * Pemakaian: npx tsx scripts/banding-lisensi.ts → docs/BANDING_LISENSI_LIFETIME.md
 */
import { writeFileSync } from "node:fs";
import {
  runIdealScenario,
  runScenario,
  standardScenarios,
  type MonthReport,
} from "../src/engine";

const pct = (x: number) => `${(x * 100).toFixed(1).replace(".", ",")}%`;
const rp = (x: number) => `Rp${Math.round(x).toLocaleString("id-ID")}`;
const mi = (x: number) => `Rp${(x / 1e9).toFixed(2).replace(".", ",")} miliar`;

interface Row {
  scenario: string;
  licenses: number;
  subscriptions: number;
  licenseNet: number;
  subscriptionNet: number;
  planAPaid: number;
  planBPaid: number;
  p90: number;
  max: number;
  zeroShare: number;
  heldNoSub: number;
}

const B = 1e9;
const V13: Row[] = [
  {
    scenario: "ideal-12",
    licenses: 4095,
    subscriptions: 8178,
    licenseNet: 27.67 * B,
    subscriptionNet: 2.94 * B,
    planAPaid: 7.35 * B,
    planBPaid: 1.04 * B,
    p90: 4_048_736,
    max: 45_730_936,
    zeroShare: 0.5,
    heldNoSub: 0,
  },
  {
    scenario: "flat-5y",
    licenses: 22686,
    subscriptions: 471789,
    licenseNet: 153.28 * B,
    subscriptionNet: 169.59 * B,
    planAPaid: 44.77 * B,
    planBPaid: 22.33 * B,
    p90: 9_808_203,
    max: 408_426_243,
    zeroShare: 0.611,
    heldNoSub: 1_878_517_500,
  },
  {
    scenario: "risefall-5y",
    licenses: 24835,
    subscriptions: 536490,
    licenseNet: 167.8 * B,
    subscriptionNet: 192.85 * B,
    planAPaid: 48.68 * B,
    planBPaid: 25.18 * B,
    p90: 10_034_926,
    max: 725_166_882,
    zeroShare: 0.615,
    heldNoSub: 2_371_785_000,
  },
  {
    scenario: "flat-5y-30",
    licenses: 22609,
    subscriptions: 470456,
    licenseNet: 152.76 * B,
    subscriptionNet: 169.11 * B,
    planAPaid: 38.13 * B,
    planBPaid: 23.94 * B,
    p90: 14_568_384,
    max: 1_770_436_169,
    zeroShare: 0.518,
    heldNoSub: 1_470_585_000,
  },
];

function toRow(r: {
  summary: import("../src/engine").SimulationSummary;
  reports: MonthReport[];
}): Row {
  const s = r.summary;
  return {
    scenario: s.scenario,
    licenses: s.licenses,
    subscriptions: s.subscriptions,
    licenseNet: s.licenseNet,
    subscriptionNet: s.subscriptionNet,
    planAPaid: s.planAPaid,
    planBPaid: s.planBPaid,
    p90: s.income.p90,
    max: s.income.max,
    zeroShare: s.income.zeroShare,
    heldNoSub: r.reports.reduce((a, x) => a + x.heldNoSubscription, 0),
  };
}

const v14: Row[] = [
  toRow(runIdealScenario(12)),
  ...standardScenarios().map((p) => toRow(runScenario(p))),
];
const v14r60: Row[] = standardScenarios().map((p) =>
  toRow(runScenario({ ...p, subscriptionRetention: 0.6 })),
);

const VARIANTS: [string, Row[]][] = [
  ["v1.3 (akses 3 bulan, Langganan bulan ke-4)", V13],
  ["v1.4 (lifetime, Langganan 30 hari setelah aktivasi)", v14],
  ["v1.4, retensi Langganan turun ke 60%", v14r60],
];

const L: string[] = [];
L.push(
  "# Banding Aturan Lisensi: v1.3 vs v1.4 (Lisensi Lifetime, Langganan 30 Hari)",
  "",
);
L.push(
  `Dibuat oleh \`npx tsx scripts/banding-lisensi.ts\` pada ${new Date().toISOString().slice(0, 10)}. Skenario, benih acak, dan asumsi perilaku sama dengan Bab 12.3 (\`docs/HASIL_SIMULASI.md\`). Angka v1.3 adalah hasil tetap dari engine aturan v1.3 (commit 52d54dc); omzet dan bonusnya dibulatkan ke 0,01 miliar.`,
  "",
);
L.push(
  '> **Bukan proyeksi penjualan atau penghasilan.** Data sintetis. Simulasi menganggap jumlah Lisensi terjual dan retensi Langganan (80% per tagihan) tidak berubah oleh aturan baru; baris "retensi 60%" menguji bila tagihan yang datang lebih cepat membuat lebih banyak pembeli berhenti.',
  "",
);

L.push("## Omzet dan bonus (total selama simulasi)", "");
L.push(
  "| Skenario | Aturan | Lisensi | Langganan dibayar | Omzet bersih Lisensi | Omzet bersih Langganan | Plan A dibayar | Plan B dibayar | Plan B / omzet Langganan | Omzet bersih dikurangi Plan A+B |",
);
L.push("|---|---|---:|---:|---:|---:|---:|---:|---:|---:|");
for (const [label, rows] of VARIANTS)
  for (const r of rows)
    L.push(
      `| ${r.scenario} | ${label} | ${r.licenses.toLocaleString("id-ID")} | ${r.subscriptions.toLocaleString("id-ID")} | ${mi(r.licenseNet)} | ${mi(r.subscriptionNet)} | ${mi(r.planAPaid)} | ${mi(r.planBPaid)} | ${pct(r.planBPaid / r.subscriptionNet)} | ${mi(r.licenseNet + r.subscriptionNet - r.planAPaid - r.planBPaid)} |`,
    );
L.push("");

const ch = (x: number, y: number) =>
  x ? `${y >= x ? "+" : ""}${pct((y - x) / x)}` : "–";
L.push("## Perubahan v1.4 dibanding v1.3", "");
L.push(
  "| Skenario | Omzet bersih Langganan (retensi 80%) | Plan B dibayar (retensi 80%) | Omzet bersih total (retensi 80%) | Omzet bersih Langganan (retensi 60%) | Bonus tim tertahan karena Langganan |",
);
L.push("|---|---:|---:|---:|---:|---:|");
for (const a of V13) {
  const b = v14.find((x) => x.scenario === a.scenario)!;
  const c = v14r60.find((x) => x.scenario === a.scenario);
  L.push(
    `| ${a.scenario} | ${ch(a.subscriptionNet, b.subscriptionNet)} | ${ch(a.planBPaid, b.planBPaid)} | ${ch(a.licenseNet + a.subscriptionNet, b.licenseNet + b.subscriptionNet)} | ${c ? ch(a.subscriptionNet, c.subscriptionNet) : "–"} | ${rp(a.heldNoSub)} → ${rp(b.heldNoSub)} |`,
  );
}
L.push("");

L.push("## Pengungkapan penghasilan sintetis per Mitra PLS", "");
L.push(
  "| Skenario | Aturan | Median | Persentil 90 | Tertinggi | Porsi tanpa bonus |",
);
L.push("|---|---|---:|---:|---:|---:|");
for (const [label, rows] of VARIANTS)
  for (const r of rows)
    L.push(
      `| ${r.scenario} | ${label} | Rp0 | ${rp(r.p90)} | ${rp(r.max)} | ${pct(r.zeroShare)} |`,
    );
L.push("");

L.push("## Cara membaca", "");
L.push(
  "- Plan A hampir tidak berubah karena harga, PV, dan bonus Lisensi tidak berubah; selisih kecil berasal dari urutan acak peristiwa.",
);
L.push(
  "- Langganan kini ditagih 30 hari setelah aktivasi (sebelumnya mulai bulan ke-4), sehingga omzet Langganan dan Plan B naik bila retensi tetap. Plafon Plan B tetap 40% omzet bersih Langganan.",
);
L.push(
  "- Syarat Langganan untuk bonus tim dinilai pada akhir bulan: akses harus aktif saat itu, baik dari 30 hari pertama Lisensi maupun dari Langganan.",
);
L.push(
  "- Median tetap Rp0 pada semua skenario karena sebagian besar Mitra PLS tidak menerima bonus.",
);
writeFileSync("docs/BANDING_LISENSI_LIFETIME.md", L.join("\n") + "\n");
console.log(L.join("\n"));
