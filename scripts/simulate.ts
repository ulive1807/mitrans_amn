/**
 * Menjalankan skenario uji (Bab 12.3 v1.2 dan skenario headline v2.0) dan menulis docs/HASIL_SIMULASI.md.
 * Pemakaian: npm run simulate [-- --scale 0.5]
 */
import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import {
  BONUS_LABEL,
  PLAN,
  perLicenseUpperBounds,
  runHeadlineScenario,
  runIdealScenario,
  runScenario,
  standardScenarios,
  type BonusType,
  type SimulationResult,
} from "../src/engine";

const scaleArg = process.argv.indexOf("--scale");
const scale = scaleArg > 0 ? Number(process.argv[scaleArg + 1]) : 1;

const pct = (x: number) => `${(x * 100).toFixed(1).replace(".", ",")}%`;
const rp = (x: number) => `Rp${Math.round(x).toLocaleString("id-ID")}`;

const runs: {
  res: SimulationResult;
  ms: number;
  docA?: string;
  docB?: string;
}[] = [];
const time = (fn: () => SimulationResult) => {
  const t0 = performance.now();
  const res = fn();
  return { res, ms: performance.now() - t0 };
};

runs.push({
  ...time(() => runIdealScenario(12)),
  docA: "46,9%",
  docB: "36,7%",
});
const docs = [
  ["31,1%", "26,6%"],
  ["31,8%", "26,7%"],
  ["26,5%", "26,8%"],
];
standardScenarios(scale).forEach((p, i) =>
  runs.push({
    ...time(() => runScenario(p)),
    docA: docs[i][0],
    docB: docs[i][1],
  }),
);

const lines: string[] = [];
lines.push("# Hasil Simulasi Engine Komisi Mitrans-Astra");
lines.push("");
lines.push(
  `Dibuat oleh \`npm run simulate\` pada ${new Date().toISOString().slice(0, 10)} · Rencana Pemasaran v${PLAN.version} · skala ${scale}`,
);
lines.push("");
lines.push(
  "> **Hasil ini bukan proyeksi penjualan dan bukan perkiraan penghasilan.** Jaringan, nama, dan NIK seluruhnya sintetis.",
);
lines.push(
  '> Tujuannya menguji apakah aturan dan plafon bekerja. Kolom "v1.2 (dokumen)" adalah hasil uji internal Rencana Pemasaran v1.2 Bab 12.3,',
);
lines.push(
  "> sebagai pembanding aturan lama; engine kini menjalankan aturan v2.0 (spesifikasi 2026-10-29).",
);
lines.push("");
lines.push("## Ringkasan per skenario");
lines.push("");
lines.push(
  "| Skenario | Lisensi | Mitra PLS | Plan A dibayar (engine) | Plan A v1.2 (dokumen) | Plan B dibayar (engine) | Plan B v1.2 (dokumen) | Bulan Plan A tertinggi | Faktor plafon dipakai |",
);
lines.push("|---|---:|---:|---:|---:|---:|---:|---:|---|");
for (const { res, docA, docB } of runs) {
  const s = res.summary;
  lines.push(
    `| ${s.label} | ${s.licenses.toLocaleString("id-ID")} | ${s.mitraCount.toLocaleString("id-ID")} | ${pct(s.planAPct)} | ${docA} | ${pct(s.planBPct)} | ${docB} | ${pct(s.maxMonthPlanAPct)} (${s.maxMonthPlanAMonth}) | ${s.capTriggeredMonths.length ? s.capTriggeredMonths.length + " bulan" : "Tidak"}${s.poolClampedMonths.length ? " · Pool dibatasi " + s.poolClampedMonths.length + " bulan" : ""} |`,
  );
}
lines.push("");
lines.push("## Rincian pembayaran per jenis (seluruh periode)");
lines.push("");
const types = Object.keys(BONUS_LABEL) as BonusType[];
lines.push(
  `| Jenis | ${runs.map((r) => r.res.summary.scenario).join(" | ")} |`,
);
lines.push(`|---|${runs.map(() => "---:").join("|")}|`);
for (const t of types) {
  lines.push(
    `| ${BONUS_LABEL[t]} | ${runs
      .map((r) => {
        const total = r.res.reports.reduce((a, m) => a + m.paidByType[t], 0);
        const base =
          t === "KOMISI_LANGGANAN" || t === "PASANGAN_RO" || t === "ROYALTI_RO"
            ? r.res.summary.subscriptionNet
            : r.res.summary.licenseNet;
        return `${pct(base ? total / base : 0)}`;
      })
      .join(" | ")} |`,
  );
}
lines.push("");
lines.push(
  "Persentase Plan A terhadap omzet bersih Lisensi; Plan B terhadap omzet bersih Langganan.",
);
lines.push("");
lines.push("## Pengungkapan penghasilan sintetis (format Bab 14 butir 4)");
lines.push("");
lines.push(
  "| Skenario | Median total diterima per Mitra PLS | Persentil 90 | Tertinggi | Porsi Mitra PLS tanpa bonus | Rata-rata porsi Mitra PLS aktif per bulan |",
);
lines.push("|---|---:|---:|---:|---:|---:|");
for (const { res } of runs) {
  const s = res.summary;
  lines.push(
    `| ${s.scenario} | ${rp(s.income.median)} | ${rp(s.income.p90)} | ${rp(s.income.max)} | ${pct(s.income.zeroShare)} | ${pct(s.avgActiveShare)} |`,
  );
}
lines.push("");
lines.push("## Kesehatan dana");
lines.push("");
lines.push(
  "| Skenario | Prestasi dari dana cadangan | Sisa Pool Aktif akhir | Bonus masih ditahan akhir | Waktu jalan |",
);
lines.push("|---|---:|---:|---:|---:|");
for (const { res, ms } of runs) {
  const s = res.summary;
  lines.push(
    `| ${s.scenario} | ${rp(s.rankPaidFromReserve)} | ${rp(s.poolCarryEnd)} | ${rp(s.heldEnd)} | ${(ms / 1000).toFixed(1)} detik |`,
  );
}
lines.push("");
const b = perLicenseUpperBounds();
lines.push(
  "## Batas atas biaya per Lisensi (dihitung ulang dari parameter, spesifikasi 10.2)",
);
lines.push("");
lines.push("| Jenis | Spesifikasi v2.0 | Engine |");
lines.push("|---|---:|---:|");
lines.push(
  `| Lisensi kepada Mitra PLS baru | 58,62% | ${(b.toMitra * 100).toFixed(2).replace(".", ",")}% |`,
);
lines.push(
  `| Lisensi kepada Pelanggan | 57,88% | ${(b.toCustomer * 100).toFixed(2).replace(".", ",")}% |`,
);
lines.push(
  `| Lisensi Pelanggan dikonversi | 57,88% | ${(b.converted * 100).toFixed(2).replace(".", ",")}% |`,
);
lines.push(
  `| Langganan | 37,47% | ${(b.subscription * 100).toFixed(2).replace(".", ",")}% |`,
);
lines.push("");
lines.push("## Skenario headline: \"ajak 2 orang per bulan selama 2 bulan, dan bantu mereka melakukan hal yang sama\"");
lines.push("");
lines.push("Setiap Mitra PLS menjual 1 Lisensi ke kaki kiri dan 1 ke kaki kanan per bulan mulai bulan setelah aktivasinya; semua berlangganan mulai bulan ke-4 dan menjalankan pembinaan. Penjualan terjadi tanggal 10, sehingga penjualan bulan ke-3 (tepat hari ke-90) sudah di luar jendela 90 hari.");
lines.push("");
lines.push("| Skenario | Mitra PLS | Bonus Mitra pertama dari 90 hari pertama | Tanpa Pool Aktif | Porsi Mitra yang memperoleh Balik Modal* | Median total per Mitra PLS | Porsi tanpa bonus |");
lines.push("|---|---:|---:|---:|---:|---:|---:|");
const headlineRuns = [
  runHeadlineScenario({ growthMonths: 5, months: 8, mode: "terus" }),
  runHeadlineScenario({ growthMonths: 8, months: 8, mode: "sekali" }),
];
for (const h of headlineRuns) {
  const end = h.engine.program90End("M1")!;
  const m1 = h.engine.ledger.filter(
    (e) => e.accountId === "M1" && e.status === "payable" && e.accruedAt < end,
  );
  const tot = m1.reduce((a, e) => a + e.amount, 0);
  const noPool = m1.filter((e) => e.type !== "POOL_AKTIF").reduce((a, e) => a + e.amount, 0);
  const s = h.summary;
  lines.push(
    `| ${s.label} | ${s.mitraCount} | ${rp(tot)} | ${rp(noPool)} | ${pct(s.balikModalShare)} | ${rp(s.income.median)} | ${pct(s.income.zeroShare)} |`,
  );
}
lines.push("");
lines.push("\\* Di antara Mitra PLS yang jendela 90 harinya sudah selesai pada akhir simulasi.");
lines.push("");
lines.push("Rasio bonus Plan A per bulan (skenario terus):");
lines.push("");
lines.push("| Bulan | Lisensi | Plan A dibayar | Pengisian Pool (top-up) | Mitra aktif |");
lines.push("|---|---:|---:|---:|---:|");
for (const r of headlineRuns[0].reports)
  lines.push(`| ${r.month} | ${r.licensesSold} | ${pct(r.planAPct)} | ${rp(r.pool.topUp)} | ${r.activeMitra} / ${r.totalMitra} |`);
lines.push("");
lines.push("## Catatan pembacaan");
lines.push("");
lines.push(
  "- Skenario organik memakai asumsi: 15% Pelanggan mengonversi, retensi Langganan 80% per bulan, 60% Mitra PLS menjalankan pembinaan, 90% Pelanggan mengonfirmasi orientasi, 1% pembatalan. Penjual dipilih acak berbobot (15% Mitra PLS menjual jauh lebih banyak).",
);
lines.push(
  "- Skenario ideal: setiap Mitra PLS mensponsori tepat 2 Mitra PLS (kiri dan kanan), satu level per bulan, semua berlangganan dan menjalankan pembinaan.",
);
lines.push(
  "- Kolom v1.2 (dokumen) hanya pembanding: engine kini memakai plafon Plan A 60% dan pengisian Pool Aktif sampai 55%, sehingga bulan dengan Mitra aktif cenderung membayar tepat 55%.",
);
lines.push(
  "- Pada skenario headline, Pool Aktif menjadi bagian besar penghasilan Mitra awal karena hanya sedikit Mitra yang aktif saat jaringan masih kecil. Ini konsekuensi aturan pengisian 55% dan perlu keputusan (lihat ringkasan pekerjaan).",
);
lines.push(
  "- Asumsi penempatan dan aturan yang tidak diatur dokumen: lihat docs/ARSITEKTUR_SISTEM.md bagian Asumsi.",
);
lines.push("");

writeFileSync("docs/HASIL_SIMULASI.md", lines.join("\n"));
console.log(lines.join("\n"));
