/**
 * Menjalankan skenario uji Bab 12.3 dan menulis docs/HASIL_SIMULASI.md.
 * Pemakaian: npm run simulate [-- --scale 0.5]
 */
import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import {
  BONUS_LABEL,
  PLAN,
  perLicenseUpperBounds,
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
  '> Tujuannya menguji apakah aturan dan plafon bekerja. Angka "uji lama v1.2" adalah hasil uji internal Rencana Pemasaran v1.2 Bab 12.3;',
);
lines.push(
  `> Rencana Pemasaran v${PLAN.version} Bab 12.3 sudah memakai hasil engine di bawah ini beserta asumsinya.`,
);
lines.push("");
lines.push("## Ringkasan per skenario");
lines.push("");
lines.push(
  "| Skenario | Lisensi | Mitra PLS | Plan A dibayar (engine) | Plan A (uji lama v1.2) | Plan B dibayar (engine) | Plan B (uji lama v1.2) | Bulan Plan A tertinggi | Faktor plafon dipakai |",
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
  "## Batas atas biaya per Lisensi (dihitung ulang dari parameter, Bab 12.2)",
);
lines.push("");
lines.push("| Jenis | Dokumen | Engine |");
lines.push("|---|---:|---:|");
lines.push(
  `| Lisensi kepada Mitra PLS baru | 48,95% | ${(b.toMitra * 100).toFixed(2).replace(".", ",")}% |`,
);
lines.push(
  `| Lisensi kepada Pelanggan | 38,6% | ${(b.toCustomer * 100).toFixed(2).replace(".", ",")}% |`,
);
lines.push(
  `| Lisensi Pelanggan dikonversi | 49,7% | ${(b.converted * 100).toFixed(2).replace(".", ",")}% |`,
);
lines.push(
  `| Langganan | 38% | ${(b.subscription * 100).toFixed(2).replace(".", ",")}% |`,
);
lines.push("");
lines.push("## Catatan pembacaan");
lines.push("");
lines.push(
  "- Skenario organik memakai asumsi: 15% Pelanggan mengonversi, retensi Langganan 80% per tagihan 30 hari (tagihan pertama 30 hari setelah aktivasi), 60% Mitra PLS menjalankan pembinaan, 90% Pelanggan mengonfirmasi orientasi, 1% pembatalan. Penjual dipilih acak berbobot (15% Mitra PLS menjual jauh lebih banyak).",
);
lines.push(
  "- Skenario ideal: setiap Mitra PLS mensponsori tepat 2 Mitra PLS (kiri dan kanan), satu level per bulan, semua berlangganan dan menjalankan pembinaan.",
);
lines.push(
  "- Selisih dengan angka dokumen berasal dari asumsi perilaku dan aturan penempatan yang tidak diatur dokumen. Lihat docs/ARSITEKTUR_SISTEM.md bagian Asumsi.",
);
lines.push("");

// Kepekaan: plafon Plan A 40% (Catatan Hukum butir 1, Permendag 70/2019 Pasal 17).
// Hanya ringkasan yang disimpan agar memori engine dapat dibebaskan.
const cap40 = [runIdealScenario(12, { options: { planACapBp: 4000 } }).summary];
for (const p of standardScenarios(scale)) cap40.push(runScenario({ ...p, options: { planACapBp: 4000 } }).summary);
lines.push("## Kepekaan: plafon Plan A 40%");
lines.push("");
lines.push("Skenario yang sama, hanya plafon Plan A diubah dari 50% menjadi 40% omzet bersih Lisensi.");
lines.push("");
lines.push("| Skenario | Plan A dibayar | Bulan Plan A tertinggi | Bulan faktor plafon dipakai | Bulan Pool Aktif dibatasi plafon |");
lines.push("|---|---:|---:|---:|---:|");
for (const s of cap40) {
  lines.push(`| ${s.scenario} | ${pct(s.planAPct)} | ${pct(s.maxMonthPlanAPct)} | ${s.capTriggeredMonths.length} | ${s.poolClampedMonths.length} |`);
}
lines.push("");
writeFileSync("docs/HASIL_SIMULASI.md", lines.join("\n"));
console.log(lines.join("\n"));
