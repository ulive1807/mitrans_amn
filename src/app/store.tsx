import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import {
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
  reports: MonthReport[];
  lastMonth: string;
  /** Penanda perubahan agar komponen membaca ulang engine setelah aksi. */
  version: number;
  bump: () => void;
}

const Ctx = createContext<DemoState | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const result = useMemo(() => runScenario(demoScenario()), []);
  const [version, bump] = useReducer((x: number) => x + 1, 0);
  const value = useMemo<DemoState>(
    () => ({
      engine: result.engine,
      reports: result.engine.reports,
      lastMonth: result.engine.reports[result.engine.reports.length - 1].month,
      version,
      bump,
    }),
    [result, version],
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
