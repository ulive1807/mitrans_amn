/**
 * Membandingkan aturan Lisensi v1.3 (akses 3 bulan, Langganan mulai bulan ke-4)
 * dengan v1.4 (Lisensi tanpa batas waktu, akses bulan aktivasi, Langganan/RO mulai bulan berikutnya).
 * Pemakaian: npx tsx scripts/banding-lisensi.ts → docs/BANDING_LISENSI_LIFETIME.md
 */
import { writeFileSync } from "node:fs";
import {
  PLAN,
  runIdealScenario,
  runScenario,
  standardScenarios,
  type MonthReport,
  type SimulationSummary,
} from "../src/engine";

const pct = (x: number) => `${(x * 100).toFixed(1).replace(".", ",")}%`;
const rp = (x: number) => `Rp${Math.round(x).toLocaleString("id-ID")}`;
const jt = (x: number) => `Rp${(x / 1e9).toFixed(2).replace(".", ",")} miliar`;

// Parameter dibaca engine saat berjalan; diubah sementara untuk menjalankan aturan v1.3.
const plan = PLAN as unknown as {
  license: { accessMonths: number };
  subscriptionRequiredFromMonth: number;
};
const v14 = {
  access: plan.license.accessMonths,
  from: plan.subscriptionRequiredFromMonth,
};
function withRule(rule: "v1.3" | "v1.4", fn: () => Row): Row {
  plan.license.accessMonths = rule === "v1.3" ? 3 : v14.access;
  plan.subscriptionRequiredFromMonth = rule === "v1.3" ? 4 : v14.from;
  try {
    return fn();
  } finally {
    plan.license.accessMonths = v14.access;
    plan.subscriptionRequiredFromMonth = v14.from;
  }
}

interface Row {
  s: SimulationSummary;
  heldNoSub: number;
}
const row = (s: SimulationSummary, reports: MonthReport[]): Row => ({
  s,
  heldNoSub: reports.reduce((a, r) => a + r.heldNoSubscription, 0),
});

type Variant = {
  key: string;
  label: string;
  rule: "v1.3" | "v1.4";
  retention?: number;
};
const VARIANTS: Variant[] = [
  {
    key: "v13",
    label: "v1.3 (akses 3 bulan, Langganan bulan ke-4)",
    rule: "v1.3",
  },
  {
    key: "v14",
    label: "v1.4 (lifetime, Langganan bulan berikutnya)",
    rule: "v1.4",
  },
  {
    key: "v14r60",
    label: "v1.4, retensi Langganan turun ke 60%",
    rule: "v1.4",
    retention: 0.6,
  },
];

const results = new Map<string, Row[]>();
for (const v of VARIANTS) {
  const rows: Row[] = [];
  if (!v.retention)
    rows.push(
      withRule(v.rule, () => {
        const r = runIdealScenario(12);
        return row(r.summary, r.reports);
      }),
    );
  for (const p of standardScenarios())
    rows.push(
      withRule(v.rule, () => {
        const r = runScenario(
          v.retention ? { ...p, subscriptionRetention: v.retention } : p,
        );
        return row(r.summary, r.reports);
      }),
    );
  results.set(v.key, rows);
}

const L: string[] = [];
L.push("# Banding Aturan Lisensi: v1.3 vs v1.4 (Lisensi Lifetime)", "");
L.push(
  `Dibuat oleh \`npx tsx scripts/banding-lisensi.ts\` pada ${new Date().toISOString().slice(0, 10)}. Skenario, benih acak, dan asumsi perilaku sama dengan Bab 12.3 (\`docs/HASIL_SIMULASI.md\`); hanya aturan Lisensi yang berbeda.`,
  "",
);
L.push(
  '> **Bukan proyeksi penjualan atau penghasilan.** Data sintetis. Simulasi menganggap perilaku pembeli (jumlah Lisensi terjual dan retensi Langganan 80% per bulan) tidak berubah oleh aturan baru; baris "retensi 60%" menguji bila Langganan yang dimulai lebih awal membuat lebih banyak pembeli berhenti.',
  "",
);

L.push("## Omzet dan bonus (total selama simulasi)", "");
L.push(
  "| Skenario | Aturan | Lisensi | Langganan dibayar | Omzet bersih Lisensi | Omzet bersih Langganan | Plan A dibayar | Plan B dibayar | Plan B / omzet Langganan | Omzet bersih dikurangi Plan A+B |",
);
L.push("|---|---|---:|---:|---:|---:|---:|---:|---:|---:|");
const base = results.get("v13")!;
for (const v of VARIANTS) {
  for (const r of results.get(v.key)!) {
    const s = r.s;
    L.push(
      `| ${s.scenario} | ${v.label} | ${s.licenses.toLocaleString("id-ID")} | ${s.subscriptions.toLocaleString("id-ID")} | ${jt(s.licenseNet)} | ${jt(s.subscriptionNet)} | ${jt(s.planAPaid)} | ${jt(s.planBPaid)} | ${pct(s.planBPct)} | ${jt(s.licenseNet + s.subscriptionNet - s.planAPaid - s.planBPaid)} |`,
    );
  }
}
L.push("");

L.push("## Perubahan v1.4 dibanding v1.3 (retensi sama)", "");
L.push(
  "| Skenario | Omzet bersih Langganan | Plan B dibayar | Omzet bersih total | Bonus tim tertahan karena Langganan |",
);
L.push("|---|---:|---:|---:|---:|");
const v14rows = results.get("v14")!;
for (let i = 0; i < base.length; i++) {
  const a = base[i],
    b = v14rows[i];
  const ch = (x: number, y: number) =>
    x ? `${y >= x ? "+" : ""}${pct((y - x) / x)}` : "–";
  L.push(
    `| ${a.s.scenario} | ${ch(a.s.subscriptionNet, b.s.subscriptionNet)} | ${ch(a.s.planBPaid, b.s.planBPaid)} | ${ch(a.s.licenseNet + a.s.subscriptionNet, b.s.licenseNet + b.s.subscriptionNet)} | ${rp(a.heldNoSub)} → ${rp(b.heldNoSub)} |`,
  );
}
L.push("");

L.push("## Pengungkapan penghasilan sintetis per Mitra PLS", "");
L.push(
  "| Skenario | Aturan | Median | Persentil 90 | Tertinggi | Porsi tanpa bonus |",
);
L.push("|---|---|---:|---:|---:|---:|");
for (const v of VARIANTS)
  for (const r of results.get(v.key)!)
    L.push(
      `| ${r.s.scenario} | ${v.label} | ${rp(r.s.income.median)} | ${rp(r.s.income.p90)} | ${rp(r.s.income.max)} | ${pct(r.s.income.zeroShare)} |`,
    );
L.push("");

L.push("## Cara membaca", "");
L.push(
  "- Plan A tidak berubah karena harga, PV, dan bonus Lisensi tidak berubah. Selisih kecil berasal dari urutan acak peristiwa.",
);
L.push(
  "- Langganan dimulai 2 bulan lebih awal per pemegang Lisensi, sehingga omzet Langganan dan Plan B naik. Plafon Plan B tetap 40% omzet bersih Langganan.",
);
L.push(
  "- Bonus tim (Level, Pasangan, Pembinaan) kini mensyaratkan Langganan aktif mulai bulan ke-2, sehingga lebih banyak bonus tim tertahan bila pemegang Lisensi belum berlangganan.",
);
L.push(
  "- Kenaikan penghasilan tertinggi terutama berasal dari Plan B yang mengalir lebih awal; median tetap Rp0 karena sebagian besar Mitra PLS tidak menerima bonus.",
);
writeFileSync("docs/BANDING_LISENSI_LIFETIME.md", L.join("\n") + "\n");
console.log(L.join("\n"));
