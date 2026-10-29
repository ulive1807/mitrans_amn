/**
 * Audit rencana kompensasi v2.0 sebelum Rencana Pemasaran final.
 * Menjalankan berbagai skenario pertumbuhan jaringan dan menghitung laba perusahaan per bulan
 * dengan model biaya yang disepakati, lalu menulis docs/AUDIT_KOMPENSASI_V2.md.
 * Pemakaian: npm run audit [-- --scale 0.5]
 */
import { writeFileSync } from "node:fs";
import {
  BONUS_LABEL,
  PLAN,
  perLicenseUpperBounds,
  runHeadlineScenario,
  runIdealScenario,
  runScenario,
  standardScenarios,
  type BonusType,
  type MitransEngine,
  type ScenarioParams,
  type SimulationResult,
} from "../src/engine";

const scaleArg = process.argv.indexOf("--scale");
const scale = scaleArg > 0 ? Number(process.argv[scaleArg + 1]) : 0.5;

// Model biaya (spesifikasi 10.3 dan 14.2; asumsi tertulis di laporan).
const PLATFORM_PER_ACCOUNT_MONTH = Math.round(
  PLAN.serviceFundPerLicense / PLAN.license.accessMonths,
); // Rp142.000
const WORKSHOP_PER_SEAT = 800_000;
const WORKSHOP_OPS_PER_EVENT = 1_300_000;
const SEATS_PER_EVENT = 30;
const MIN_MARGIN = 0.15;

const pct = (x: number) => `${(x * 100).toFixed(1).replace(".", ",")}%`;
const rp = (x: number) => `Rp${Math.round(x).toLocaleString("id-ID")}`;
const rpM = (x: number) => `Rp${(x / 1e9).toFixed(2).replace(".", ",")} M`;

interface MonthLine {
  month: string;
  revenue: number;
  bonus: number;
  platform: number;
  workshop: number;
  profit: number;
}

function audit(engine: MitransEngine) {
  const accounts = [...engine.accounts.values()].filter(
    (a) => a.licenseActivatedAt !== undefined || a.role !== "struktural",
  );
  // Dana layanan dicadangkan saat penjualan (Rencana Pemasaran Bab 12.2 butir 4): seluruh masa akses
  // Lisensi (3 bulan) atau Family (12 bulan) dibebankan di bulan penjualan; Membership per bulan.
  const reservedByMonth = new Map<string, number>();
  for (const sale of engine.sales.values()) {
    if (sale.kind !== "license" || sale.cancelled) continue;
    const months =
      sale.product === "family"
        ? PLAN.family.accessMonths
        : PLAN.license.accessMonths;
    reservedByMonth.set(
      sale.month,
      (reservedByMonth.get(sale.month) ?? 0) +
        months * PLATFORM_PER_ACCOUNT_MONTH,
    );
  }
  const lines: MonthLine[] = engine.reports.map((r) => {
    const seats = r.licensesSold;
    const revenue = r.licenseNet + r.subscriptionNet;
    const bonus = r.planAPaid + r.planBPaid;
    const platform =
      (reservedByMonth.get(r.month) ?? 0) +
      r.subscriptionsPaid * PLATFORM_PER_ACCOUNT_MONTH;
    const workshop =
      seats * WORKSHOP_PER_SEAT +
      Math.ceil(seats / SEATS_PER_EVENT) * WORKSHOP_OPS_PER_EVENT;
    return {
      month: r.month,
      revenue,
      bonus,
      platform,
      workshop,
      profit: revenue - bonus - platform - workshop,
    };
  });
  const sum = (f: (l: MonthLine) => number) =>
    lines.reduce((a, l) => a + f(l), 0);
  const revenue = sum((l) => l.revenue);
  const profit = sum((l) => l.profit);
  const withRevenue = lines.filter((l) => l.revenue > 0);
  const worst = withRevenue.reduce(
    (w, l) => (l.profit / l.revenue < w.profit / w.revenue ? l : w),
    withRevenue[0],
  );
  const negativeMonths = lines.filter((l) => l.profit < 0).map((l) => l.month);
  const belowMin = withRevenue.filter(
    (l) => l.profit / l.revenue < MIN_MARGIN,
  ).length;
  // Plafon dinilai kumulatif; bulan tanpa penjualan Lisensi yang membayar bonus tertunda dilaporkan terpisah.
  const total = (f: (r: (typeof engine.reports)[number]) => number) =>
    engine.reports.reduce((x, r) => x + f(r), 0);
  const totA = total((r) => r.planAPaid - r.rankPaidFromReserve);
  const totLic = total((r) => r.licenseNet);
  const totB = total((r) => r.planBPaid);
  const totSub = total((r) => r.subscriptionNet);
  const capA = totA > (totLic * PLAN.planACapBp) / 10_000 ? 1 : 0;
  const capB = totB > (totSub * PLAN.planBCapBp) / 10_000 ? 1 : 0;
  const late = engine.reports.filter(
    (r) =>
      r.planAPaid - r.rankPaidFromReserve > r.planACap ||
      r.planBPaid > r.planBCap,
  );
  const lateAmount = late.reduce(
    (x, r) =>
      x +
      Math.max(0, r.planAPaid - r.rankPaidFromReserve - r.planACap) +
      Math.max(0, r.planBPaid - r.planBCap),
    0,
  );
  const cumA = totLic > 0 ? totA / totLic : 0;
  const cumB = totSub > 0 ? totB / totSub : 0;
  const maxA = Math.max(
    ...engine.reports.filter((r) => r.licenseNet > 0).map((r) => r.planAPct),
  );
  const maxB = Math.max(
    0,
    ...engine.reports
      .filter((r) => r.subscriptionNet > 0)
      .map((r) => r.planBPct),
  );
  const last = engine.reports[engine.reports.length - 1];
  // Kewajiban yang masih terbuka di akhir simulasi.
  let deferredService = 0;
  for (const a of accounts) {
    if (a.accessMonths !== 12 || a.licenseActivatedAt === undefined) continue;
    const n = engine.licenseMonthNumber(a.id, last.month) ?? 0;
    deferredService += Math.max(0, 12 - n) * PLATFORM_PER_ACCOUNT_MONTH;
  }
  const liabilities = {
    held: engine.heldEntries.reduce((a, e) => a + e.gross, 0),
    teamCarry: last.teamCarryNext,
    rankQueue: last.rankQueueOutstanding,
    poolCarry: engine.poolCarryAmount,
    deferredService,
  };
  const reserveRank = engine.reports.reduce(
    (a, r) => a + r.rankPaidFromReserve,
    0,
  );
  const byType = new Map<BonusType, number>();
  for (const r of engine.reports)
    for (const [t, v] of Object.entries(r.paidByType) as [BonusType, number][])
      byType.set(t, (byType.get(t) ?? 0) + v);
  return {
    lines,
    revenue,
    profit,
    worst,
    negativeMonths,
    belowMin,
    capA,
    capB,
    maxA,
    maxB,
    cumA,
    cumB,
    lateMonths: late.map((r) => r.month),
    lateAmount,
    liabilities,
    reserveRank,
    byType,
  };
}

function incomeStats(res: SimulationResult) {
  const per = new Map<string, number>();
  for (const a of res.engine.accounts.values())
    if (a.role === "mitra") per.set(a.id, 0);
  for (const e of res.engine.ledger)
    if (
      (e.status === "payable" || e.status === "clawback") &&
      per.has(e.accountId)
    )
      per.set(e.accountId, per.get(e.accountId)! + e.amount);
  const v = [...per.values()].sort((a, b) => b - a);
  const total = v.reduce((a, b) => a + b, 0);
  const top1 = v
    .slice(0, Math.max(1, Math.floor(v.length / 100)))
    .reduce((a, b) => a + b, 0);
  return {
    top1Share: total > 0 ? top1 / total : 0,
    max: v[0] ?? 0,
    zeroShare: v.filter((x) => x <= 0).length / (v.length || 1),
  };
}

const [flat, riseFall, flat30] = standardScenarios(scale);
const scenarios: { key: string; label: string; run: () => SimulationResult }[] =
  [
    {
      key: "dasar",
      label: "Dasar: penjualan rata 5 tahun, 70% pembeli menjadi Mitra",
      run: () => runScenario(flat),
    },
    {
      key: "naik-turun",
      label: "Naik lalu turun 5 tahun",
      run: () => runScenario(riseFall),
    },
    {
      key: "mitra-30",
      label: "Hanya 30% pembeli menjadi Mitra",
      run: () => runScenario(flat30),
    },
    {
      key: "family-30",
      label: "30% penjualan Mitra baru berupa Family",
      run: () =>
        runScenario({ ...flat, name: "family-30", seed: 21, familyShare: 0.3 }),
    },
    {
      key: "family-60",
      label: "60% penjualan Mitra baru berupa Family",
      run: () =>
        runScenario({ ...flat, name: "family-60", seed: 22, familyShare: 0.6 }),
    },
    {
      key: "retensi-40",
      label: "Retensi Atlas Membership hanya 40%/bulan",
      run: () =>
        runScenario({
          ...flat,
          name: "retensi-40",
          seed: 23,
          subscriptionRetention: 0.4,
        }),
    },
    {
      key: "refund-10",
      label: "Pembatalan 10% penjualan Pelanggan",
      run: () =>
        runScenario({ ...flat, name: "refund-10", seed: 24, refundRate: 0.1 }),
    },
    {
      key: "berhenti-24",
      label: "Penjualan berhenti total setelah bulan ke-24 (36 bulan)",
      run: () =>
        runScenario({
          ...flat,
          name: "berhenti-24",
          seed: 25,
          months: 36,
          familyShare: 0.3,
          licensesPerMonth: (m) => (m < 24 ? flat.licensesPerMonth(m) : 0),
        } as ScenarioParams),
    },
    {
      key: "headline",
      label:
        "Headline sempurna: 2 per bulan selama 2 bulan, lalu bina (7 bulan)",
      run: () =>
        runHeadlineScenario({ growthMonths: 7, months: 7, mode: "duaBulan" }),
    },
    {
      key: "headline-stop",
      label: "Headline sempurna 6 bulan lalu penjualan berhenti (12 bulan)",
      run: () =>
        runHeadlineScenario({ growthMonths: 6, months: 12, mode: "duaBulan" }),
    },
    {
      key: "ideal-10",
      label: "Jaringan biner ideal 10 level",
      run: () => runIdealScenario(10),
    },
  ];

const out: string[] = [];
out.push("# Audit Rencana Kompensasi Mitrans-Astra v2.0");
out.push("");
out.push(
  `Dibuat oleh \`npm run audit\` pada ${new Date().toISOString().slice(0, 10)} · parameter v${PLAN.version} · skala organik ${scale}`,
);
out.push("");
out.push(
  "> Hasil simulasi jaringan sintetis, **bukan proyeksi penjualan atau janji penghasilan**. Tujuannya menguji apakah aturan bonus menjaga perusahaan tetap sehat di berbagai pola pertumbuhan.",
);
out.push("");

// 1. Audit parameter
const b = perLicenseUpperBounds();
out.push("## 1. Audit parameter dan batas atas");
out.push("");
out.push("| Parameter | Nilai engine |");
out.push("|---|---:|");
const params: [string, string][] = [
  [
    "Lisensi Atlas (akses 3 bulan)",
    `${rp(PLAN.license.price)} · bersih ${rp(PLAN.license.netPrice)} · ${PLAN.license.pvTenths / 10} PV`,
  ],
  [
    PLAN.family.name +
      ` (${PLAN.family.seats} kursi, ${PLAN.family.accessMonths} bulan)`,
    `${rp(PLAN.family.price)} · bersih ${rp(PLAN.family.netPrice)} · ${PLAN.family.pvTenths / 10} PV`,
  ],
  [
    PLAN.subscription.name,
    `${rp(PLAN.subscription.price)}/bulan · bersih ${rp(PLAN.subscription.netPrice)}`,
  ],
  [
    "Bonus Sponsor / Fast Start (90 hari) / Pendamping",
    `${rp(PLAN.sponsorBonus)} / ${rp(PLAN.fastStartBonus)} / ${rp(PLAN.pendampingBonus)}`,
  ],
  [
    "Pasangan / batas harian",
    `${rp(PLAN.pairBonus)} / ${PLAN.pairDailyCap} pasangan`,
  ],
  [
    "Pembinaan gen 1–6",
    PLAN.pembinaanRatesBp.map((x) => `${x / 100}%`).join(", ") +
      ` · batas ${rp(PLAN.pembinaanPersonalMonthlyCap)}/bulan`,
  ],
  [
    "Dana peringkat / leadership",
    `${PLAN.rankFundBp / 100}% / ${PLAN.leadershipFundBp / 100}%`,
  ],
  [
    "Pool Aktif",
    `isi sampai ${PLAN.poolTargetBp / 100}%, maks ${rp(PLAN.poolMaxPerSale)} per penjualan`,
  ],
  [
    "Plafon Plan A / Plan B",
    `${PLAN.planACapBp / 100}% / ${PLAN.planBCapBp / 100}%`,
  ],
  [
    "Komisi / Pasangan RO / Royalti RO",
    `${rp(PLAN.subscriptionCommission)} / ${PLAN.roPairBp / 100}% / ${PLAN.roRoyaltyTiers.reduce((a, t) => a + t.shareBp, 0) / 100}%`,
  ],
  ["Batas per identitas", `${rp(PLAN.identityMonthlyCap)}/bulan`],
];
for (const [k, v] of params) out.push(`| ${k} | ${v} |`);
out.push("");
out.push("| Batas atas biaya bonus terburuk | Nilai | Plafon | Status |");
out.push("|---|---:|---:|---|");
for (const [k, v, cap] of [
  ["Lisensi kepada Mitra baru", b.toMitra, PLAN.planACapBp / 10_000],
  ["Lisensi kepada Pelanggan", b.toCustomer, PLAN.planACapBp / 10_000],
  ["Paket Family (per paket)", b.family, PLAN.planACapBp / 10_000],
  [PLAN.subscription.name, b.subscription, PLAN.planBCapBp / 10_000],
] as [string, number, number][])
  out.push(
    `| ${k} | ${pct(v)} | ${pct(cap)} | ${v < cap ? "✓ aman" : "✗ melewati"} |`,
  );
out.push("");

// 2. Skenario
out.push("## 2. Skenario pertumbuhan jaringan");
out.push("");
out.push(
  "Model biaya: dana layanan platform " +
    rp(PLATFORM_PER_ACCOUNT_MONTH) +
    " per akun per bulan, dicadangkan saat penjualan untuk seluruh masa akses (3 bulan Lisensi, 12 bulan Family) dan per bulan untuk Membership; workshop " +
    rp(WORKSHOP_PER_SEAT) +
    " per kursi baru + operasional " +
    rp(WORKSHOP_OPS_PER_EVENT) +
    " per event (" +
    SEATS_PER_EVENT +
    " peserta). Laba di sini sebelum biaya kantor, gaji, pemasaran perusahaan, dan pajak penghasilan badan.",
);
out.push("");
out.push(
  "| Skenario | Omzet bersih | Bonus dibayar | Laba | Margin total | Bulan terburuk | Bulan rugi | Bulan < 15% | Plan A kumulatif | Plan B kumulatif | Plafon kumulatif dilanggar | Bonus tertunda di bulan tanpa omzet Lisensi |",
);
out.push("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|");
const detail: string[] = [];
const verdicts: { key: string; ok: boolean; note: string }[] = [];
for (const s of scenarios) {
  const t0 = Date.now();
  const res = s.run();
  const a = audit(res.engine);
  const inc = incomeStats(res);
  const bonus = a.lines.reduce((x, l) => x + l.bonus, 0);
  const worstPct = a.worst ? a.worst.profit / a.worst.revenue : 0;
  out.push(
    `| ${s.label} | ${rpM(a.revenue)} | ${pct(bonus / a.revenue)} | ${rpM(a.profit)} | ${pct(a.profit / a.revenue)} | ${pct(worstPct)} (${a.worst?.month}) | ${a.negativeMonths.length} | ${a.belowMin} | ${pct(a.cumA)} | ${pct(a.cumB)} | ${a.capA + a.capB === 0 ? "Tidak" : "Ya"} | ${a.lateMonths.length ? `${rp(a.lateAmount)} (${a.lateMonths.length} bulan)` : "–"} |`,
  );
  const L = a.liabilities;
  detail.push(
    `| ${s.key} | ${rp(L.held)} | ${rp(L.teamCarry)} | ${rp(L.rankQueue)} | ${rp(L.poolCarry)} | ${rp(L.deferredService)} | ${rp(a.reserveRank)} | ${pct(inc.zeroShare)} | ${pct(inc.top1Share)} | ${rp(inc.max)} | ${((Date.now() - t0) / 1000).toFixed(1)} dtk |`,
  );
  const ok = a.capA + a.capB === 0 && a.profit / a.revenue >= MIN_MARGIN;
  verdicts.push({
    key: s.key,
    ok,
    note: a.negativeMonths.length
      ? `rugi di ${a.negativeMonths.join(", ")}`
      : "",
  });
  console.error(
    `${s.key}: margin ${pct(a.profit / a.revenue)}, terburuk ${pct(worstPct)}`,
  );
}
out.push("");
out.push(
  "Bonus tertunda = Bonus Sponsor, Berkah, dan Fast Start dari penjualan bulan sebelumnya yang baru dibayar (setelah masa tunggu, 30 hari, atau 7 hari kerja) di bulan yang tidak lagi memiliki penjualan Lisensi. Bonus ini sudah tercakup plafon bulan asalnya; karena itu plafon dinilai kumulatif.",
);
out.push("");
out.push("### Kewajiban terbuka di akhir simulasi dan sebaran penghasilan");
out.push("");
out.push(
  "| Skenario | Bonus ditahan | Sisa faktor plafon | Antrean Prestasi | Sisa Pool | Layanan Family prabayar | Prestasi dari cadangan | Mitra tanpa bonus | Porsi 1% teratas | Penerima tertinggi | Waktu |",
);
out.push("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|");
out.push(...detail);
out.push("");
out.push("## 3. Kesimpulan otomatis");
out.push("");
for (const v of verdicts)
  out.push(
    `- ${v.ok ? "✓" : "⚠️"} **${v.key}**: ${v.ok ? "plafon terjaga dan margin total ≥ 15%" : "perlu perhatian"}${v.note ? ` (${v.note})` : ""}`,
  );
out.push("");
out.push(
  "Jenis bonus yang dipakai di laporan: " +
    (Object.keys(BONUS_LABEL) as BonusType[])
      .map((t) => BONUS_LABEL[t])
      .join(", ") +
    ".",
);
out.push("");
writeFileSync("docs/AUDIT_KOMPENSASI_V2.md", out.join("\n"));
console.log(out.join("\n"));
