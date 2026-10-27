/**
 * Simulasi jaringan buatan untuk menguji aturan (Bab 12.3). Hasilnya BUKAN proyeksi penjualan
 * dan bukan perkiraan penghasilan. Semua nama dan NIK sintetis.
 */
import { MitransEngine } from "./engine";
import { ControlDetector } from "./fraud";
import { PLAN, type EngineOptions } from "./plan";
import {
  addDays,
  atWib,
  daysInMonth,
  monthCloseAt,
  monthFromIndex,
  monthIndex,
} from "./time";

const SUBSCRIPTION_PERIOD_MS = PLAN.subscription.periodDays * 86_400_000;
import { PLAN_A_TYPES, type MonthReport, type Side } from "./types";

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = [
  "Ahmad",
  "Siti",
  "Budi",
  "Dewi",
  "Rizki",
  "Nur",
  "Fajar",
  "Aisyah",
  "Hendra",
  "Laila",
  "Yusuf",
  "Rina",
  "Arif",
  "Maya",
  "Ilham",
  "Fitri",
  "Bayu",
  "Zahra",
  "Dimas",
  "Salma",
  "Hasan",
  "Nadia",
  "Rahmat",
  "Intan",
];
const LAST = [
  "Pratama",
  "Lestari",
  "Hidayat",
  "Saputra",
  "Rahmawati",
  "Nugroho",
  "Wulandari",
  "Setiawan",
  "Kurniawan",
  "Permata",
  "Syahputra",
  "Maharani",
  "Firmansyah",
  "Anggraini",
  "Ramadhan",
  "Puspita",
];

export function syntheticName(i: number): string {
  return `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]}`;
}

export function syntheticNik(i: number): string {
  return `3171${String(i).padStart(12, "0")}`;
}

export interface ScenarioParams {
  name: string;
  label: string;
  startMonth: string; // 'YYYY-MM'
  months: number;
  seed: number;
  /** Lisensi terjual per bulan (indeks 0 = bulan pertama). */
  licensesPerMonth: (monthIdx: number) => number;
  /** Peluang pembeli Lisensi mendaftar sebagai Mitra PLS. */
  mitraShare: number;
  /** Peluang Pelanggan mengonversi dalam 60 hari. */
  conversionRate: number;
  /** Peluang pemegang Lisensi membayar Langganan mulai bulan ke-2 (bulan berikutnya setelah aktivasi), per bulan. */
  subscriptionRetention: number;
  /** Peluang Mitra PLS pemegang Lisensi menjalankan kegiatan pembinaan terkonfirmasi per bulan. */
  coachingRate: number;
  /** Peluang Pelanggan mengonfirmasi pendampingan orientasi. */
  orientationRate: number;
  /** Peluang pembatalan/pengembalian Lisensi. */
  refundRate: number;
  /** Jumlah pemimpin pertama di bawah Mitrans 002 dan 003. */
  seedLeaders: number;
  options?: Partial<EngineOptions>;
  keepPairLog?: boolean;
  /** Bila diisi, sinyal akun dibuat dan detektor akun terkendali dijalankan saat pembelian. */
  controlledRate?: number;
  /** Peluang Pelanggan sealamat dengan penjual (keluarga), yang tidak boleh ditandai. */
  familyRate?: number;
}

export interface SimulationSummary {
  scenario: string;
  label: string;
  months: number;
  licenses: number;
  subscriptions: number;
  licenseNet: number;
  subscriptionNet: number;
  planAPaid: number;
  planBPaid: number;
  planAPct: number;
  planBPct: number;
  maxMonthPlanAPct: number;
  maxMonthPlanAMonth: string;
  maxMonthPlanBPct: number;
  capTriggeredMonths: string[];
  poolClampedMonths: string[];
  mitraCount: number;
  customerCount: number;
  avgActiveShare: number;
  /** Pengungkapan penghasilan (Bab 14 butir 4): sebaran total diterima per Mitra PLS selama simulasi. */
  income: { median: number; p90: number; max: number; zeroShare: number };
  rankPaidFromReserve: number;
  poolCarryEnd: number;
  heldEnd: number;
}

export interface SimulationResult {
  engine: MitransEngine;
  reports: MonthReport[];
  summary: SimulationSummary;
  detector?: ControlDetector;
  /** Kebenaran dasar untuk menguji detektor: penjualan yang memang dibeli akun terkendali / keluarga. */
  truth?: Map<string, 'controlled' | 'family'>;
}

type SimEvent = { t: number; run: () => void };

/** Menjalankan skenario jaringan organik (penjual dipilih acak berbobot). */
export function runScenario(p: ScenarioParams): SimulationResult {
  const rnd = mulberry32(p.seed);
  const start = atWib(`${p.startMonth}-01`, 0, 1);
  const engine = new MitransEngine(start, {
    ...p.options,
    keepPairLog: p.keepPairLog,
  });
  let counter = 0;
  let saleCounter = 0;
  const sellers: string[] = [];
  const sellerWeight = new Map<string, number>();
  const holders: { id: string; nextDue: number }[] = [];
  const mitraHolders: string[] = [];
  const startIdx = monthIndex(p.startMonth);
  const detector = p.controlledRate !== undefined ? new ControlDetector() : undefined;
  const truth = new Map<string, 'controlled' | 'family'>();
  const ownSignals = (id: string, i: number) => {
    if (!detector) return;
    detector.addSignal(id, 'bank', `BANK-${id}`);
    detector.addSignal(id, 'phone', `08${String(1_000_000_000 + i)}`);
    detector.addSignal(id, 'email', `${id.toLowerCase()}@contoh.id`);
    detector.addSignal(id, 'device', `DEV-${id}`);
    detector.addSignal(id, 'address', `Jl. Contoh No. ${i}`);
  };
  const addressOf = new Map<string, string>();

  // Antrean peristiwa per hari agar urutan waktu terjaga.
  const buckets = new Map<number, SimEvent[]>();
  const dayKey = (t: number) => Math.floor((t + 7 * 3600_000) / 86_400_000);
  const schedule = (t: number, run: () => void) => {
    const k = dayKey(t);
    const list = buckets.get(k) ?? [];
    list.push({ t, run });
    buckets.set(k, list);
  };
  const safe = (fn: () => void) => () => {
    try {
      fn();
    } catch (err) {
      if (!(err instanceof Error) || err.name !== "EngineError") throw err;
    }
  };

  const newMitra = (sponsorId: string, at: number, leg?: Side) => {
    const i = ++counter;
    const id = `M${i}`;
    engine.registerMitra({
      id,
      name: syntheticName(i),
      nik: syntheticNik(i),
      sponsorId,
      at,
    });
    ownSignals(id, i);
    addressOf.set(id, `Jl. Contoh No. ${i}`);
    // Kuis Kode Etik: sebagian besar lulus di hari pendaftaran.
    if (rnd() < 0.92) engine.passQuiz(id);
    else
      schedule(
        addDays(at, 3 + Math.floor(rnd() * 10)),
        safe(() => engine.passQuiz(id)),
      );
    engine.purchaseLicense({
      saleId: `L${++saleCounter}`,
      buyerId: id,
      at,
      legPreference: leg,
    });
    const u = rnd();
    const w = u < 0.15 ? 12 : u < 0.45 ? 3 : 0.4; // sebagian kecil Mitra PLS menjual jauh lebih banyak
    sellers.push(id);
    sellerWeight.set(id, w);
    holders.push({ id, nextDue: at + SUBSCRIPTION_PERIOD_MS });
    mitraHolders.push(id);
    return id;
  };

  // Pemimpin pertama di bawah akun struktural.
  for (let i = 0; i < p.seedLeaders; i++) {
    newMitra(i % 2 === 0 ? "MITRANS-002" : "MITRANS-003", start + i * 60_000);
  }

  for (let m = 0; m < p.months; m++) {
    const month = monthFromIndex(startIdx + m);
    const days = daysInMonth(month);

    // Langganan: tagihan setiap 30 hari sejak aktivasi Lisensi, dibayar tepat pada tanggal jatuh tempo.
    const monthEnd = monthCloseAt(month);
    for (const h of holders) {
      while (h.nextDue < monthEnd) {
        const at = h.nextDue;
        h.nextDue += SUBSCRIPTION_PERIOD_MS;
        if (rnd() >= p.subscriptionRetention) continue;
        schedule(
          at,
          safe(() =>
            engine.paySubscription({
              saleId: `S${++saleCounter}`,
              accountId: h.id,
              at,
            }),
          ),
        );
      }
    }
    // Kegiatan pembinaan.
    for (const id of mitraHolders) {
      if (rnd() < p.coachingRate) {
        schedule(
          atWib(`${month}-${String(Math.min(days, 20)).padStart(2, "0")}`, 20),
          () => engine.confirmCoaching(id, month),
        );
      }
    }

    // Distribusi bobot penjual bulan ini.
    const pool = sellers.filter((id) => engine.accounts.get(id)!.quizPassed);
    const cum: number[] = [];
    let total = 0;
    for (const id of pool) {
      total += sellerWeight.get(id)!;
      cum.push(total);
    }
    const pickSeller = () => {
      const x = rnd() * total;
      let lo = 0;
      let hi = cum.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (cum[mid] < x) lo = mid + 1;
        else hi = mid;
      }
      return pool[lo];
    };

    const n = Math.round(p.licensesPerMonth(m));
    for (let k = 0; k < n && pool.length > 0; k++) {
      const day = 1 + Math.floor(rnd() * days);
      const at = atWib(
        `${month}-${String(day).padStart(2, "0")}`,
        7 + Math.floor(rnd() * 14),
        Math.floor(rnd() * 60),
      );
      const seller = pickSeller();
      if (rnd() < p.mitraShare) {
        schedule(
          at,
          safe(() => void newMitra(seller, at)),
        );
      } else {
        schedule(
          at,
          safe(() => {
            const i = ++counter;
            const cid = `C${i}`;
            engine.registerPelanggan({
              id: cid,
              name: syntheticName(i),
              nik: syntheticNik(i),
              sellerId: seller,
              at,
            });
            const saleId = `L${++saleCounter}`;
            if (detector) {
              const u = rnd();
              const controlled = u < (p.controlledRate ?? 0);
              const family = !controlled && u < (p.controlledRate ?? 0) + (p.familyRate ?? 0);
              detector.addSignal(cid, 'bank', controlled ? `BANK-${seller}` : `BANK-${cid}`);
              detector.addSignal(cid, 'phone', `08${String(2_000_000_000 + i)}`);
              detector.addSignal(cid, 'email', `${cid.toLowerCase()}@contoh.id`);
              detector.addSignal(cid, 'device', controlled ? `DEV-${seller}` : `DEV-${cid}`);
              detector.addSignal(cid, 'address', controlled || family ? addressOf.get(seller) ?? `Jl. Lain ${i}` : `Jl. Pelanggan ${i}`);
              detector.addPayer(saleId, cid, controlled ? `BANK-${seller}` : `BANK-${cid}`);
              if (controlled) truth.set(saleId, 'controlled');
              else if (family) truth.set(saleId, 'family');
            }
            engine.purchaseLicense({ saleId, buyerId: cid, at });
            const flag = detector?.evaluateSale(engine.sales.get(saleId)!);
            if (flag?.level === 'kuat') {
              engine.openReview(saleId, at, flag.reasons.join(', '));
              // Keputusan setelah tata cara Kode Etik Pasal 21 (disederhanakan: 10 hari).
              const dAt = addDays(at, 10);
              schedule(dAt, safe(() => truth.get(saleId) === 'controlled' ? void engine.confirmControlled(saleId, dAt) : engine.dismissReview(saleId, dAt)));
            }
            const holder = { id: cid, nextDue: at + SUBSCRIPTION_PERIOD_MS };
            holders.push(holder);
            if (rnd() < p.orientationRate) {
              {
            const oAt = addDays(at, 1 + Math.floor(rnd() * 7));
            schedule(oAt, safe(() => engine.confirmOrientation(saleId, oAt)));
          }
            }
            if (rnd() < p.refundRate) {
              {
            const rAt = addDays(at, 2 + Math.floor(rnd() * 5));
            schedule(rAt, safe(() => void engine.refundSale(saleId, rAt)));
          }
            } else if (rnd() < p.conversionRate) {
              const cAt = addDays(at, 5 + Math.floor(rnd() * 50));
              schedule(
                cAt,
                safe(() => {
                  engine.convertCustomer({ customerId: cid, at: cAt });
                  engine.passQuiz(cid);
                  sellers.push(cid);
                  sellerWeight.set(cid, rnd() < 0.3 ? 3 : 0.4);
                  mitraHolders.push(cid);
                }),
              );
            }
          }),
        );
      }
    }

    // Jalankan peristiwa bulan ini (dan yang terjadwal sebelumnya untuk bulan ini) secara berurutan.
    const firstDay = dayKey(atWib(`${month}-01`, 12));
    for (let d = firstDay; d < firstDay + days; d++) {
      // Peristiwa yang dijadwalkan dari dalam hari yang sama ikut diproses.
      let list = buckets.get(d);
      while (list) {
        buckets.delete(d);
        list.sort((a, b) => a.t - b.t).forEach((e) => e.run());
        list = buckets.get(d);
      }
    }
  }
  engine.closeThrough(monthFromIndex(startIdx + p.months - 1));
  return { engine, reports: engine.reports, summary: summarize(p, engine), detector, truth };
}

/** Jaringan ideal: setiap Mitra PLS mensponsori 2 Mitra PLS (kiri dan kanan), satu level per bulan. */
export function runIdealScenario(
  levels: number,
  opts: {
    months?: number;
    seed?: number;
    options?: Partial<EngineOptions>;
  } = {},
): SimulationResult {
  const startMonth = "2027-01";
  const start = atWib(`${startMonth}-01`, 0, 1);
  const engine = new MitransEngine(start, opts.options);
  const months = opts.months ?? levels + 3;
  let counter = 0;
  let sale = 0;
  const all: { id: string; nextDue: number }[] = [];
  let frontier: string[] = [];
  const startIdx = monthIndex(startMonth);
  for (let m = 0; m < months; m++) {
    const month = monthFromIndex(startIdx + m);
    // Pembinaan untuk semua pemegang Lisensi; Langganan dibayar setiap jatuh tempo 30 hari.
    for (const h of all) engine.confirmCoaching(h.id, month);
    const at = atWib(`${month}-10`, 10);
    const dues: { t: number; id: string }[] = [];
    for (const h of all)
      while (h.nextDue < monthCloseAt(month)) {
        dues.push({ t: h.nextDue, id: h.id });
        h.nextDue += SUBSCRIPTION_PERIOD_MS;
      }
    dues.sort((a, b) => a.t - b.t);
    const payDues = (until: number) => {
      while (dues.length && dues[0].t <= until) {
        const d = dues.shift()!;
        engine.paySubscription({ saleId: `S${++sale}`, accountId: d.id, at: d.t });
      }
    };
    payDues(at);
    if (m < levels) {
      const next: string[] = [];
      const sponsors = m === 0 ? ["MITRANS-002"] : frontier;
      for (const sp of sponsors) {
        const legs: Side[] = m === 0 ? ["L"] : ["L", "R"];
        for (const leg of legs) {
          const id = `M${++counter}`;
          engine.registerMitra({
            id,
            name: syntheticName(counter),
            nik: syntheticNik(counter),
            sponsorId: sp,
            at,
          });
          engine.passQuiz(id);
          engine.purchaseLicense({
            saleId: `L${++sale}`,
            buyerId: id,
            at,
            legPreference: leg,
          });
          all.push({ id, nextDue: at + SUBSCRIPTION_PERIOD_MS });
          next.push(id);
        }
      }
      frontier = next;
    }
    payDues(Infinity);
  }
  engine.closeThrough(monthFromIndex(startIdx + months - 1));
  const p = {
    name: `ideal-${levels}`,
    label: `Jaringan ideal ${levels} level (semua Mitra PLS menjual 2 Lisensi)`,
    months,
  } as ScenarioParams;
  return { engine, reports: engine.reports, summary: summarize(p, engine) };
}

export function summarize(
  p: Pick<ScenarioParams, "name" | "label" | "months">,
  engine: MitransEngine,
): SimulationSummary {
  const reports = engine.reports;
  const sum = (f: (r: MonthReport) => number) =>
    reports.reduce((a, r) => a + f(r), 0);
  const licenseNet = sum((r) => r.licenseNet);
  const subscriptionNet = sum((r) => r.subscriptionNet);
  const planAPaid = sum((r) => r.planAPaid);
  const planBPaid = sum((r) => r.planBPaid);
  let maxA = { pct: 0, month: "" };
  let maxB = 0;
  for (const r of reports) {
    if (r.licenseNet > 0 && r.planAPct > maxA.pct)
      maxA = { pct: r.planAPct, month: r.month };
    if (r.subscriptionNet > 0 && r.planBPct > maxB) maxB = r.planBPct;
  }
  const paidPer = new Map<string, number>();
  for (const acc of engine.accounts.values())
    if (acc.role === "mitra") paidPer.set(acc.id, 0);
  for (const e of engine.ledger) {
    if (
      (e.status === "payable" || e.status === "clawback") &&
      paidPer.has(e.accountId)
    ) {
      paidPer.set(e.accountId, paidPer.get(e.accountId)! + e.amount);
    }
  }
  const incomes = [...paidPer.values()].sort((a, b) => a - b);
  const q = (x: number) =>
    incomes.length
      ? incomes[Math.min(incomes.length - 1, Math.floor(x * incomes.length))]
      : 0;
  const withSales = reports.filter((r) => r.totalMitra > 0);
  return {
    scenario: p.name,
    label: p.label,
    months: p.months,
    licenses: sum((r) => r.licensesSold),
    subscriptions: sum((r) => r.subscriptionsPaid),
    licenseNet,
    subscriptionNet,
    planAPaid,
    planBPaid,
    planAPct: licenseNet ? planAPaid / licenseNet : 0,
    planBPct: subscriptionNet ? planBPaid / subscriptionNet : 0,
    maxMonthPlanAPct: maxA.pct,
    maxMonthPlanAMonth: maxA.month,
    maxMonthPlanBPct: maxB,
    capTriggeredMonths: reports
      .filter((r) => r.planACapTriggered || r.planBCapTriggered)
      .map((r) => r.month),
    poolClampedMonths: reports.filter((r) => r.poolClampedByCap).map((r) => r.month),
    mitraCount: paidPer.size,
    customerCount: [...engine.accounts.values()].filter(
      (a) => a.role === "pelanggan",
    ).length,
    avgActiveShare: withSales.length
      ? withSales.reduce((a, r) => a + r.activeMitra / r.totalMitra, 0) /
        withSales.length
      : 0,
    income: {
      median: q(0.5),
      p90: q(0.9),
      max: incomes[incomes.length - 1] ?? 0,
      zeroShare: incomes.length
        ? incomes.filter((x) => x <= 0).length / incomes.length
        : 0,
    },
    rankPaidFromReserve: sum((r) => r.rankPaidFromReserve),
    poolCarryEnd: engine.poolCarryAmount,
    heldEnd: engine.heldEntries.reduce((a, e) => a + e.gross, 0),
  };
}

/** Skenario standar yang mencerminkan Bab 12.3. */
export function standardScenarios(scale = 1): ScenarioParams[] {
  const base = {
    startMonth: "2027-01",
    months: 60,
    conversionRate: 0.15,
    subscriptionRetention: 0.8,
    coachingRate: 0.6,
    orientationRate: 0.9,
    refundRate: 0.01,
    seedLeaders: 4,
  };
  const flat = (m: number) => (m < 6 ? 40 + m * 60 : 400) * scale;
  const riseFall = (m: number) =>
    (m < 30 ? 40 + m * 25 : Math.max(60, 790 - (m - 30) * 25)) * scale;
  return [
    {
      ...base,
      name: "flat-5y",
      label: "Jaringan 5 tahun, penjualan rata (70% pembeli menjadi Mitra PLS)",
      seed: 11,
      licensesPerMonth: flat,
      mitraShare: 0.7,
    },
    {
      ...base,
      name: "risefall-5y",
      label: "Jaringan 5 tahun, penjualan naik lalu turun (70%)",
      seed: 12,
      licensesPerMonth: riseFall,
      mitraShare: 0.7,
    },
    {
      ...base,
      name: "flat-5y-30",
      label:
        "Jaringan 5 tahun, penjualan rata, hanya 30% pembeli menjadi Mitra PLS",
      seed: 13,
      licensesPerMonth: flat,
      mitraShare: 0.3,
    },
  ];
}

/** Data demo kecil untuk antarmuka (8 bulan, data sintetis). */
export function demoScenario(): ScenarioParams {
  return {
    name: "demo",
    label: "Data demo sintetis",
    startMonth: "2026-03",
    months: 8,
    seed: 2026,
    licensesPerMonth: (m) => 18 + m * 9,
    mitraShare: 0.7,
    conversionRate: 0.2,
    subscriptionRetention: 0.85,
    coachingRate: 0.7,
    orientationRate: 0.85,
    refundRate: 0.02,
    controlledRate: 0.04,
    familyRate: 0.06,
    seedLeaders: 2,
    keepPairLog: true,
  };
}

export const PLAN_A_TYPE_LIST = PLAN_A_TYPES;
