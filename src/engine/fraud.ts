/**
 * Deteksi akun yang dikendalikan sendiri (Rencana Pemasaran 9.1; Kode Etik Pasal 18 angka 9, 12, 17).
 *
 * Prinsip:
 * - Hanya sinyal yang di-hash yang disimpan; nilai mentah (rekening, telepon, alamat) tidak pernah tampil di admin.
 * - Sinyal lemah (alamat, IP) tidak pernah cukup sendirian: anggota keluarga wajar berbagi alamat dan jaringan rumah.
 * - Deteksi hanya membuka pemeriksaan. Sanksi mengikuti Kode Etik Pasal 21 (pemberitahuan, penjelasan 14 hari, keputusan).
 *
 * Prototipe memakai hash FNV-1a bergaram. Pada produksi, hashing dilakukan di server dengan HMAC-SHA256 dan kunci rahasia.
 */
import type { MitransEngine } from "./engine";
import type { Sale } from "./types";

export type SignalKind =
  | "bank"
  | "payer"
  | "phone"
  | "email"
  | "device"
  | "address"
  | "ip";

/** Bobot: peluang dua akun dikendalikan orang yang sama bila sinyal ini sama. */
export const SIGNAL_WEIGHT: Record<SignalKind, number> = {
  bank: 0.95,
  payer: 0.95,
  phone: 0.9,
  email: 0.85,
  device: 0.6,
  address: 0.3,
  ip: 0.2,
};

export const SIGNAL_LABEL: Record<SignalKind, string> = {
  bank: "Rekening bank sama",
  payer: "Sumber pembayaran sama",
  phone: "Nomor telepon sama",
  email: "Surel sama",
  device: "Perangkat sama",
  address: "Alamat sama",
  ip: "Alamat IP sama",
};

export const STRONG_SCORE = 0.85;
export const MEDIUM_SCORE = 0.5;

export type FlagLevel = "kuat" | "sedang";

export interface LinkResult {
  score: number;
  kinds: SignalKind[];
}

export interface SaleFlag {
  saleId: string;
  sellerId: string;
  buyerId: string;
  month: string;
  at: number;
  score: number;
  level: FlagLevel;
  reasons: string[];
}

function normalize(kind: SignalKind, raw: string): string {
  const v = raw.trim().toLowerCase();
  switch (kind) {
    case "phone": {
      const d = v.replace(/\D/g, "");
      return d.startsWith("0") ? `62${d.slice(1)}` : d;
    }
    case "bank":
    case "payer":
      return v.replace(/[^a-z0-9]/g, "");
    case "address":
      return v.replace(/[.,/#-]/g, " ").replace(/\s+/g, " ");
    default:
      return v;
  }
}

function fnv1a(s: string, seed: number): string {
  let h = seed >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export class ControlDetector {
  /** kind:hash -> akun */
  private readonly index = new Map<string, Set<string>>();
  /** akun -> kind -> hash */
  private readonly byAccount = new Map<string, Map<SignalKind, Set<string>>>();
  /** sumber pembayaran per penjualan */
  private readonly salePayer = new Map<string, string>();

  constructor(private readonly salt = "mitrans-prototipe") {}

  private hash(kind: SignalKind, raw: string): string {
    const n = normalize(kind, raw);
    // Rekening dan sumber pembayaran dibandingkan dalam ruang yang sama.
    const space = kind === "payer" ? "bank" : kind;
    return (
      fnv1a(`${this.salt}|${space}|${n}`, 0x811c9dc5) +
      fnv1a(`${n}|${space}|${this.salt}`, 0x01000193)
    );
  }

  addSignal(accountId: string, kind: SignalKind, raw: string): void {
    if (!raw.trim()) return;
    const h = this.hash(kind, raw);
    const key = `${kind}:${h}`;
    const set = this.index.get(key) ?? new Set<string>();
    set.add(accountId);
    this.index.set(key, set);
    const m =
      this.byAccount.get(accountId) ?? new Map<SignalKind, Set<string>>();
    const hs = m.get(kind) ?? new Set<string>();
    hs.add(h);
    m.set(kind, hs);
    this.byAccount.set(accountId, m);
  }

  /** Sumber pembayaran sebuah penjualan (rekening/e-wallet pembayar). */
  addPayer(saleId: string, buyerId: string, raw: string): void {
    this.salePayer.set(saleId, this.hash("payer", raw));
    this.addSignal(buyerId, "payer", raw);
  }

  /** Skor keterkaitan dua akun: 1 − Π(1 − bobot) atas jenis sinyal yang sama. */
  link(a: string, b: string): LinkResult {
    if (a === b) return { score: 1, kinds: [] };
    const ma = this.byAccount.get(a);
    const mb = this.byAccount.get(b);
    if (!ma || !mb) return { score: 0, kinds: [] };
    const kinds: SignalKind[] = [];
    // Rekening penerima bonus dan sumber pembayaran dibandingkan silang.
    const pools = (m: Map<SignalKind, Set<string>>, k: SignalKind) =>
      k === "bank" || k === "payer"
        ? new Set([...(m.get("bank") ?? []), ...(m.get("payer") ?? [])])
        : (m.get(k) ?? new Set<string>());
    for (const k of Object.keys(SIGNAL_WEIGHT) as SignalKind[]) {
      if (k === "payer") continue; // digabung dengan 'bank'
      const A = pools(ma, k);
      const B = pools(mb, k);
      for (const h of A) {
        if (B.has(h)) {
          kinds.push(k);
          break;
        }
      }
    }
    let keep = 1;
    for (const k of kinds) keep *= 1 - SIGNAL_WEIGHT[k];
    return { score: 1 - keep, kinds };
  }

  /** Akun lain yang berbagi paling sedikit satu sinyal. */
  neighbours(accountId: string): Set<string> {
    const out = new Set<string>();
    const m = this.byAccount.get(accountId);
    if (!m) return out;
    for (const [k, hs] of m) {
      const kinds: SignalKind[] =
        k === "bank" || k === "payer" ? ["bank", "payer"] : [k];
      for (const h of hs)
        for (const kk of kinds)
          for (const id of this.index.get(`${kk}:${h}`) ?? [])
            if (id !== accountId) out.add(id);
    }
    return out;
  }

  /** Nilai satu penjualan: apakah pembeli kemungkinan akun yang dikendalikan penjual? */
  evaluateSale(sale: Sale): SaleFlag | null {
    const { score, kinds } = this.link(sale.buyerId, sale.sellerId);
    const reasons = kinds.map((k) => SIGNAL_LABEL[k]);
    let s = score;
    const payer = this.salePayer.get(sale.id);
    const sellerBank = this.byAccount.get(sale.sellerId)?.get("bank");
    if (payer && sellerBank?.has(payer) && !kinds.includes("bank")) {
      s = 1 - (1 - s) * (1 - SIGNAL_WEIGHT.payer);
      reasons.push("Dibayar dari rekening penjual");
    }
    if (s < MEDIUM_SCORE) return null;
    return {
      saleId: sale.id,
      sellerId: sale.sellerId,
      buyerId: sale.buyerId,
      month: sale.month,
      at: sale.at,
      score: s,
      level: s >= STRONG_SCORE ? "kuat" : "sedang",
      reasons,
    };
  }

  /** Pindai semua penjualan Lisensi dan Langganan berbayar pertama. */
  scan(engine: MitransEngine): SaleFlag[] {
    const flags: SaleFlag[] = [];
    for (const s of engine.sales.values()) {
      if (s.cancelled) continue;
      if (s.kind === "subscription" && !s.firstPaidSubscription) continue;
      const f = this.evaluateSale(s);
      if (f) flags.push(f);
    }
    return flags.sort((a, b) => b.score - a.score || b.at - a.at);
  }

  /** Kelompok akun yang saling terkait kuat (union-find). */
  clusters(minScore = STRONG_SCORE): string[][] {
    const parent = new Map<string, string>();
    const find = (x: string): string => {
      let r = x;
      while (parent.get(r) !== r) r = parent.get(r)!;
      parent.set(x, r);
      return r;
    };
    for (const id of this.byAccount.keys()) parent.set(id, id);
    for (const a of this.byAccount.keys()) {
      for (const b of this.neighbours(a)) {
        if (a < b && this.link(a, b).score >= minScore)
          parent.set(find(a), find(b));
      }
    }
    const groups = new Map<string, string[]>();
    for (const id of this.byAccount.keys()) {
      const r = find(id);
      groups.set(r, [...(groups.get(r) ?? []), id]);
    }
    return [...groups.values()]
      .filter((g) => g.length > 1)
      .sort((a, b) => b.length - a.length);
  }
}
