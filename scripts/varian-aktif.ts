/**
 * Membandingkan syarat aktif 2 penjualan (dokumen) dengan 1 penjualan per bulan.
 * Pemakaian: npx tsx scripts/varian-aktif.ts → docs/VARIAN_AKTIF.md
 */
import { writeFileSync } from 'node:fs';
import { PLAN, runIdealScenario, runScenario, standardScenarios, type SimulationSummary, type MonthReport } from '../src/engine';

const pct = (x: number) => `${(x * 100).toFixed(1).replace('.', ',')}%`;
const rp = (x: number) => `Rp${Math.round(x).toLocaleString('id-ID')}`;

interface Row {
  s: SimulationSummary;
  pool: number; // Pool Aktif / omzet bersih Lisensi
  team: number; // Level + Pasangan + Pembinaan / omzet bersih Lisensi
  forfeited: number; // bonus tim hangus / omzet bersih Lisensi
}
function row(s: SimulationSummary, reports: MonthReport[]): Row {
  const net = reports.reduce((a, r) => a + r.licenseNet, 0) || 1;
  const sum = (f: (r: MonthReport) => number) => reports.reduce((a, r) => a + f(r), 0);
  return {
    s,
    pool: sum((r) => r.paidByType.POOL_AKTIF) / net,
    team: sum((r) => r.paidByType.LEVEL + r.paidByType.PASANGAN + r.paidByType.PEMBINAAN) / net,
    forfeited: sum((r) => r.pool.forfeitedTeam) / net,
  };
}
const results: Record<number, Row[]> = { 2: [], 1: [] };
for (const min of [2, 1]) {
  const options = { activeMinPersonalSales: min };
  const ideal = runIdealScenario(12, { options });
  results[min].push(row(ideal.summary, ideal.reports));
  for (const p of standardScenarios()) {
    const r = runScenario({ ...p, options });
    results[min].push(row(r.summary, r.reports));
  }
}

const L: string[] = [];
L.push('# Varian Syarat Aktif: 2 Penjualan vs 1 Penjualan per Bulan', '');
L.push(`Dibuat oleh \`npx tsx scripts/varian-aktif.ts\` pada ${new Date().toISOString().slice(0, 10)}. Semua aturan lain sama dengan Rencana Pemasaran v${PLAN.version}; skenario dan asumsi sama dengan Bab 12.3.`, '');
L.push('> Hasil simulasi jaringan buatan. **Bukan proyeksi penjualan dan bukan perkiraan penghasilan.**', '');
L.push('## Biaya bonus dan plafon', '');
L.push('| Skenario | Plan A (aktif 2) | Plan A (aktif 1) | Plan B (aktif 2) | Plan B (aktif 1) | Bulan Plan A tertinggi (aktif 1) | Faktor plafon dipakai (aktif 1) |');
L.push('|---|---:|---:|---:|---:|---:|---:|');
results[2].forEach((a, i) => {
  const b = results[1][i];
  L.push(`| ${a.s.label} | ${pct(a.s.planAPct)} | ${pct(b.s.planAPct)} | ${pct(a.s.planBPct)} | ${pct(b.s.planBPct)} | ${pct(b.s.maxMonthPlanAPct)} | ${b.s.capTriggeredMonths.length ? b.s.capTriggeredMonths.length + ' bulan' : 'Tidak'} |`);
});
L.push('', '## Ke mana bonus jaringan mengalir', '');
L.push('Persentase terhadap omzet bersih Lisensi.', '');
L.push('| Skenario | Bonus tim dibayar (2 → 1) | Bonus tim hangus (2 → 1) | Pool Aktif (2 → 1) | Rata-rata Mitra PLS aktif per bulan (2 → 1) |');
L.push('|---|---:|---:|---:|---:|');
results[2].forEach((a, i) => {
  const b = results[1][i];
  L.push(`| ${a.s.scenario} | ${pct(a.team)} → ${pct(b.team)} | ${pct(a.forfeited)} → ${pct(b.forfeited)} | ${pct(a.pool)} → ${pct(b.pool)} | ${pct(a.s.avgActiveShare)} → ${pct(b.s.avgActiveShare)} |`);
});
L.push('', '## Sebaran penghasilan sintetis (total selama simulasi per Mitra PLS)', '');
L.push('| Skenario | Tanpa bonus (2 → 1) | Persentil 90 (2 → 1) | Tertinggi (2 → 1) |');
L.push('|---|---:|---:|---:|');
results[2].forEach((a, i) => {
  const b = results[1][i];
  L.push(`| ${a.s.scenario} | ${pct(a.s.income.zeroShare)} → ${pct(b.s.income.zeroShare)} | ${rp(a.s.income.p90)} → ${rp(b.s.income.p90)} | ${rp(a.s.income.max)} → ${rp(b.s.income.max)} |`);
});
L.push('');
writeFileSync('docs/VARIAN_AKTIF.md', L.join('\n'));
console.log(L.join('\n'));
