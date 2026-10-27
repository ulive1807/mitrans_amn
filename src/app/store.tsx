import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import {
  type ControlDetector,
  CaseManager,
  AccessControl,
  PayoutApprovals,
  demoStaff,
  atWib,
  demoScenario,
  runScenario,
  type MitransEngine,
  type MonthReport,
} from "../engine";

/**
 * Prototipe: seluruh data berjalan di peramban dari simulasi sintetis yang deterministik.
 * Tidak ada server, tidak ada data pribadi nyata, dan tidak ada pembayaran.
 * Pada produksi, engine yang sama dijalankan di backend (lihat docs/ARSITEKTUR_SISTEM.md).
 */
interface DemoState {
  engine: MitransEngine;
  detector: ControlDetector;
  cases: CaseManager;
  access: AccessControl;
  payouts: PayoutApprovals;
  /** Staf yang sedang masuk (demo). */
  staffId: string;
  setStaffId: (id: string) => void;
  /** Waktu demo (09.00 WIB pada hari berjalan engine). */
  now: number;
  reports: MonthReport[];
  lastMonth: string;
  /** Penanda perubahan agar komponen membaca ulang engine setelah aksi. */
  version: number;
  bump: () => void;
}

const Ctx = createContext<DemoState | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const result = useMemo(() => runScenario(demoScenario()), []);
  const access = useMemo(() => {
    const ac = new AccessControl();
    for (const u of demoStaff()) ac.addUser(u);
    return ac;
  }, []);
  const payouts = useMemo(() => new PayoutApprovals(access), [access]);
  const cases = useMemo(() => seedCases(result.engine, result.detector!, access), [result, access]);
  const [staffId, setStaffIdRaw] = useState("u-budi");
  const [version, bump] = useReducer((x: number) => x + 1, 0);
  const value = useMemo<DemoState>(
    () => ({
      engine: result.engine,
      detector: result.detector!,
      cases,
      access,
      payouts,
      staffId,
      setStaffId: (id: string) => {
        access.record(id, "Masuk (demo)", atWib(result.engine.today, 9));
        setStaffIdRaw(id);
      },
      now: atWib(result.engine.today, 9),
      reports: result.engine.reports,
      lastMonth: result.engine.reports[result.engine.reports.length - 1].month,
      version,
      bump,
    }),
    [result, cases, access, payouts, staffId, version],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemo(): DemoState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDemo di luar DemoProvider");
  return v;
}

/** Total diterima (status payable dan penarikan) per akun. */
export function paidTotals(engine: MitransEngine): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of engine.ledger) {
    if (e.status !== "payable" && e.status !== "clawback") continue;
    m.set(e.accountId, (m.get(e.accountId) ?? 0) + e.amount);
  }
  return m;
}

export function currentRank(
  engine: MitransEngine,
  accountId: string,
): string | null {
  const acc = engine.accounts.get(accountId);
  const r = acc?.ranksAchieved;
  return r && r.length ? r[r.length - 1].rank : null;
}

/** Kasus contoh untuk demo: satu dari tanda kuat yang belum diperiksa, satu pelanggaran pesan massal yang sudah diputus. */
function seedCases(engine: MitransEngine, detector: ControlDetector, access: AccessControl): CaseManager {
  const cm = new CaseManager(engine);
  const now = atWib(engine.today, 9);
  const flag = detector.scan(engine).find((f) => f.level === "kuat" && !engine.sales.get(f.saleId)!.review);
  if (flag) {
    cm.openCase({
      accountId: flag.sellerId,
      violations: [12],
      allegation: `Penjualan ${flag.saleId} diduga dibeli oleh akun yang dikendalikan penjual untuk memenuhi status aktif.`,
      evidence: [...flag.reasons.map((r) => `${r} antara akun penjual dan pembeli`), `Skor keterkaitan ${Math.round(flag.score * 100)}% (deteksi otomatis)`],
      saleIds: [flag.saleId],
      actor: access.actorName("u-rina"),
      at: now,
    });
  }
  const other = [...engine.accounts.values()].find((a) => a.role === "mitra" && a.nodeId && a.id !== flag?.sellerId && a.quizPassed);
  if (other) {
    const c = cm.openCase({
      accountId: other.id,
      violations: [19],
      allegation: "Mengirim pesan promosi WhatsApp ke grup warga tanpa persetujuan penerima.",
      evidence: ["Pengaduan Pelanggan melalui layanan pengaduan", "Tangkapan layar pesan grup"],
      actor: access.actorName("u-rina"),
      at: now,
    });
    cm.submitExplanation(c.id, "Saya mengira grup warga boleh untuk promosi. Saya sudah menghapus pesan dan meminta maaf di grup.", now);
    cm.decide(c.id, {
      by: access.actorName("u-budi"),
      sanctions: ["teguran"],
      reasons: "Pesan massal tanpa persetujuan melanggar Pasal 18 angka 19; Mitra PLS mengakui dan sudah memperbaiki, sehingga cukup teguran.",
      at: now,
    });
  }
  return cm;
}
