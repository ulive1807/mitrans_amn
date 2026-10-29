/**
 * Pemberitahuan tertulis dan tata cara sanksi Mitra PLS (Kode Etik Bab VI, Pasal 9 angka 2, Pasal 20–22).
 *
 * Alur satu kasus:
 *   dibuka (Surat Pemberitahuan Dugaan Pelanggaran)
 *     → penjelasan Mitra PLS paling lama 14 hari                         (Pasal 21 angka 2)
 *     → keputusan paling lambat 14 hari setelah penjelasan, beralasan     (Pasal 21 angka 3)
 *     → keberatan sekali dalam 14 hari, diperiksa pejabat lain            (Pasal 21 angka 4)
 *     → final
 *
 * Pilihan rancangan yang perlu dikonfirmasi konsultan hukum:
 * - Teguran, penarikan, dan pembekuan berlaku saat keputusan. Pemutusan baru berlaku setelah keputusan final
 *   (masa keberatan lewat atau keberatan ditolak), agar hak keberatan bermakna.
 * - Pemutusan langsung hanya untuk pelanggaran berat Pasal 18 angka 1, 2, 4, 9, 12, 15, 16 (Pasal 20),
 *   atau bila sudah ada paling sedikit 2 sanksi final sebelumnya.
 */
import { EngineError, type MitransEngine } from "./engine";

const DAY = 86_400_000;
export const EXPLANATION_DAYS = 14;
export const DECISION_DAYS = 14;
export const OBJECTION_DAYS = 14;
export const PAYMENT_HOLD_DAYS = 30;
export const MAX_FREEZE_MONTHS = 3;

/** Kode Etik Pasal 18 (ringkas). */
export const VIOLATIONS: Record<number, string> = {
  1: "Menjanjikan atau memberi kesan pasti tentang penghasilan",
  2: 'Mengesankan keuntungan investasi, sinyal beli/jual, atau "pasti untung"',
  3: "Memberi rekomendasi beli/jual efek atas nama Mitrans-Astra",
  4: "Mengaku memiliki izin atau dukungan lembaga yang tidak dimiliki",
  5: "Keterangan yang tidak sesuai dokumen resmi",
  6: "Mewajibkan calon Mitra PLS membeli produk untuk mendaftar",
  7: "Menarik biaya dari calon Mitra PLS atau Pelanggan",
  8: "Merekrut orang di bawah 18 tahun atau belum cakap hukum",
  9: "Mendaftarkan orang tanpa sepengetahuannya, memakai identitas orang lain, atau akun fiktif",
  10: "Membujuk Mitra PLS jaringan lain pindah jaringan",
  11: "Merekrut dengan menjelekkan perusahaan lain",
  12: "Membeli atas nama orang lain atau dengan dana Mitra PLS lain untuk status aktif, peringkat, atau pasangan",
  13: "Menjual melalui lokapasar atau saluran tidak langsung",
  14: "Menjual dengan harga berbeda atau memberi potongan dari komisi",
  15: "Menerima pembayaran ke rekening pribadi",
  16: "Menghimpun dana, termasuk janji bagi hasil, arisan, atau titip beli",
  17: "Memanipulasi penempatan jaringan, data penjualan, atau konfirmasi pembinaan",
  18: "Menggunakan data pribadi orang lain tanpa izin",
  19: "Mengirim pesan massal tanpa persetujuan",
  20: "Memakai merek di luar pedoman Perusahaan",
};
export const SEVERE_VIOLATIONS = [1, 2, 4, 9, 12, 15, 16];

export type SanctionType = "teguran" | "penarikan" | "pembekuan" | "pemutusan";
export const SANCTION_LABEL: Record<SanctionType, string> = {
  teguran: "Teguran tertulis",
  penarikan: "Penarikan komisi dan bonus yang diperoleh dari pelanggaran",
  pembekuan: "Pembekuan keanggotaan",
  pemutusan: "Pemutusan keanggotaan",
};

export type CaseStatus =
  | "menunggu_penjelasan"
  | "menunggu_keputusan"
  | "masa_keberatan"
  | "keberatan_diperiksa"
  | "final"
  | "ditutup_tanpa_sanksi";

export const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  menunggu_penjelasan: "Menunggu penjelasan Mitra PLS",
  menunggu_keputusan: "Menunggu keputusan",
  masa_keberatan: "Masa keberatan",
  keberatan_diperiksa: "Keberatan diperiksa",
  final: "Final",
  ditutup_tanpa_sanksi: "Ditutup tanpa sanksi",
};

export type LetterKind =
  | "pemberitahuan"
  | "penundaan"
  | "keputusan"
  | "keputusan_keberatan";

export interface Letter {
  number: string;
  kind: LetterKind;
  caseId: string;
  accountId: string;
  issuedAt: number;
  title: string;
  /** Paragraf surat; baris kosong dipisah sebagai paragraf. */
  body: string[];
  channels: string[];
  readAt?: number;
}

export interface CaseEvent {
  at: number;
  actor: string;
  action: string;
  note?: string;
}

export interface Decision {
  at: number;
  by: string;
  sanctions: SanctionType[];
  reasons: string;
  freezeMonths?: number;
  late: boolean;
}

export interface SanctionCase {
  id: string;
  accountId: string;
  violations: number[];
  allegation: string;
  evidence: string[];
  saleIds: string[];
  openedAt: number;
  openedBy: string;
  status: CaseStatus;
  explanationDue: number;
  explanation?: { at: number; text: string; byAccount: boolean };
  decisionDue?: number;
  decision?: Decision;
  objectionDue?: number;
  objection?: { at: number; text: string };
  objectionDecision?: Decision & {
    outcome: "ditolak" | "dikabulkan" | "diubah";
  };
  finalAt?: number;
  /** Sanksi yang sudah dijalankan pada engine. */
  applied: SanctionType[];
  /** Hal yang perlu ditangani manual (mis. mengembalikan penarikan yang dibatalkan keberatan). */
  manualFollowUp: string[];
  events: CaseEvent[];
  letters: Letter[];
}

const ROMAN = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
];
const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function tanggal(t: number): string {
  const d = new Date(t + 7 * 3600_000);
  return `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export class CaseManager {
  readonly cases: SanctionCase[] = [];
  private seq = 0;
  private letterSeq = new Map<string, number>();

  constructor(private readonly engine: MitransEngine) {}

  forAccount(accountId: string): SanctionCase[] {
    return this.cases.filter((c) => c.accountId === accountId);
  }

  get(caseId: string): SanctionCase {
    const c = this.cases.find((x) => x.id === caseId);
    if (!c) throw new EngineError(`Kasus ${caseId} tidak ditemukan`);
    return c;
  }

  /** Sanksi final sebelumnya (untuk eskalasi). */
  priorFinalSanctions(accountId: string, exceptCaseId?: string): number {
    return this.cases.filter(
      (c) =>
        c.accountId === accountId &&
        c.id !== exceptCaseId &&
        c.status === "final" &&
        c.applied.length > 0,
    ).length;
  }

  /** Langkah 1: buka kasus dan kirim Surat Pemberitahuan Dugaan Pelanggaran (Pasal 21 angka 1). */
  openCase(input: {
    accountId: string;
    violations: number[];
    allegation: string;
    evidence: string[];
    saleIds?: string[];
    actor: string;
    at: number;
  }): SanctionCase {
    const acc = this.engine.accounts.get(input.accountId);
    if (!acc || acc.role !== "mitra")
      throw new EngineError("Kasus hanya untuk Mitra PLS");
    if (input.violations.length === 0)
      throw new EngineError(
        "Sebutkan paling sedikit satu dugaan pelanggaran Pasal 18",
      );
    if (input.evidence.length === 0)
      throw new EngineError(
        "Pemberitahuan wajib disertai bukti (Pasal 21 angka 1)",
      );
    if (
      this.cases.some(
        (c) =>
          c.accountId === input.accountId &&
          !["final", "ditutup_tanpa_sanksi"].includes(c.status) &&
          (input.saleIds ?? []).some((s) => c.saleIds.includes(s)),
      )
    ) {
      throw new EngineError(
        "Penjualan ini sudah masuk kasus yang masih berjalan",
      );
    }
    const c: SanctionCase = {
      id: `KS-${String(++this.seq).padStart(4, "0")}`,
      accountId: input.accountId,
      violations: [...input.violations].sort((a, b) => a - b),
      allegation: input.allegation,
      evidence: input.evidence,
      saleIds: input.saleIds ?? [],
      openedAt: input.at,
      openedBy: input.actor,
      status: "menunggu_penjelasan",
      explanationDue: input.at + EXPLANATION_DAYS * DAY,
      applied: [],
      manualFollowUp: [],
      events: [],
      letters: [],
    };
    this.cases.push(c);
    this.log(c, input.at, input.actor, "Kasus dibuka", input.allegation);
    this.issue(c, "pemberitahuan", input.at);
    // Penundaan pembayaran selama pemeriksaan (Pasal 9 angka 2 dan Pasal 20 angka 2).
    const held: string[] = [];
    for (const saleId of c.saleIds) {
      const sale = this.engine.sales.get(saleId);
      if (!sale || sale.cancelled || sale.controlled) continue;
      const r = sale.review;
      if (!r || r.dismissedAt || r.expiredAt)
        this.engine.openReview(saleId, input.at, `Kasus ${c.id}`);
      held.push(saleId);
    }
    if (held.length) {
      this.issue(c, "penundaan", input.at, held);
      this.log(
        c,
        input.at,
        input.actor,
        "Pembayaran ditunda",
        `${held.length} penjualan, paling lama ${PAYMENT_HOLD_DAYS} hari`,
      );
    }
    return c;
  }

  /** Langkah 2: penjelasan Mitra PLS, paling lama 14 hari sejak pemberitahuan. */
  submitExplanation(
    caseId: string,
    text: string,
    at: number,
    byAccount = true,
  ): void {
    const c = this.get(caseId);
    if (c.status !== "menunggu_penjelasan")
      throw new EngineError("Kasus tidak sedang menunggu penjelasan");
    if (at > c.explanationDue)
      throw new EngineError(
        `Batas penjelasan ${tanggal(c.explanationDue)} sudah lewat`,
      );
    if (text.trim().length < 10)
      throw new EngineError("Penjelasan terlalu singkat");
    c.explanation = { at, text: text.trim(), byAccount };
    c.status = "menunggu_keputusan";
    c.decisionDue = at + DECISION_DAYS * DAY;
    this.log(
      c,
      at,
      byAccount ? this.accountName(c.accountId) : "Admin (mewakili Mitra PLS)",
      "Penjelasan diterima",
    );
  }

  /** Tanpa penjelasan sampai batas waktu: kasus dapat diputus. */
  markNoExplanation(caseId: string, at: number, actor: string): void {
    const c = this.get(caseId);
    if (c.status !== "menunggu_penjelasan")
      throw new EngineError("Kasus tidak sedang menunggu penjelasan");
    if (at <= c.explanationDue)
      throw new EngineError(
        `Mitra PLS masih dapat memberi penjelasan sampai ${tanggal(c.explanationDue)}`,
      );
    c.status = "menunggu_keputusan";
    c.decisionDue = c.explanationDue + DECISION_DAYS * DAY;
    this.log(c, at, actor, "Batas penjelasan lewat tanpa penjelasan");
  }

  /** Langkah 3: keputusan beralasan tertulis (Pasal 21 angka 3). */
  decide(
    caseId: string,
    input: {
      by: string;
      sanctions: SanctionType[];
      reasons: string;
      freezeMonths?: number;
      at: number;
    },
  ): void {
    const c = this.get(caseId);
    if (c.status !== "menunggu_keputusan")
      throw new EngineError(
        "Kasus belum dapat diputus: tunggu penjelasan atau batas waktunya",
      );
    if (input.reasons.trim().length < 20)
      throw new EngineError("Keputusan wajib disertai alasan tertulis");
    this.validateSanctions(c, input.sanctions, input.freezeMonths);
    const late = input.at > (c.decisionDue ?? input.at);
    c.decision = {
      at: input.at,
      by: input.by,
      sanctions: input.sanctions,
      reasons: input.reasons.trim(),
      freezeMonths: input.freezeMonths,
      late,
    };
    this.log(
      c,
      input.at,
      input.by,
      input.sanctions.length
        ? `Keputusan: ${input.sanctions.map((s) => SANCTION_LABEL[s]).join("; ")}`
        : "Keputusan: tidak terbukti",
      late ? "Melewati batas 14 hari setelah penjelasan" : undefined,
    );
    if (input.sanctions.length === 0) {
      for (const saleId of c.saleIds) {
        const s = this.engine.sales.get(saleId);
        if (s?.review && !s.review.dismissedAt && !s.review.confirmedAt)
          this.engine.dismissReview(saleId, input.at);
      }
      c.status = "ditutup_tanpa_sanksi";
      c.finalAt = input.at;
      this.issue(c, "keputusan", input.at);
      return;
    }
    this.applyImmediate(
      c,
      input.sanctions,
      input.at,
      input.by,
      input.freezeMonths,
    );
    c.status = "masa_keberatan";
    c.objectionDue = input.at + OBJECTION_DAYS * DAY;
    this.issue(c, "keputusan", input.at);
  }

  /** Langkah 4: keberatan, sekali, dalam 14 hari setelah keputusan (Pasal 21 angka 4). */
  fileObjection(caseId: string, text: string, at: number): void {
    const c = this.get(caseId);
    if (c.objection)
      throw new EngineError("Keberatan hanya dapat diajukan sekali");
    if (c.status !== "masa_keberatan")
      throw new EngineError("Kasus tidak dalam masa keberatan");
    if (at > c.objectionDue!)
      throw new EngineError(
        `Batas keberatan ${tanggal(c.objectionDue!)} sudah lewat`,
      );
    if (text.trim().length < 10)
      throw new EngineError("Keberatan terlalu singkat");
    c.objection = { at, text: text.trim() };
    c.status = "keberatan_diperiksa";
    this.log(c, at, this.accountName(c.accountId), "Keberatan diajukan");
  }

  /** Keputusan atas keberatan oleh pejabat yang tidak terlibat keputusan pertama. */
  decideObjection(
    caseId: string,
    input: {
      by: string;
      outcome: "ditolak" | "dikabulkan" | "diubah";
      sanctions?: SanctionType[];
      reasons: string;
      freezeMonths?: number;
      at: number;
    },
  ): void {
    const c = this.get(caseId);
    if (c.status !== "keberatan_diperiksa")
      throw new EngineError("Tidak ada keberatan yang diperiksa");
    if (
      input.by.trim().toLowerCase() === c.decision!.by.trim().toLowerCase() ||
      input.by.trim().toLowerCase() === c.openedBy.trim().toLowerCase()
    ) {
      throw new EngineError(
        "Keberatan wajib diperiksa pejabat yang tidak terlibat dalam keputusan pertama",
      );
    }
    if (input.reasons.trim().length < 20)
      throw new EngineError(
        "Keputusan keberatan wajib disertai alasan tertulis",
      );
    const finalSanctions =
      input.outcome === "ditolak"
        ? c.decision!.sanctions
        : input.outcome === "dikabulkan"
          ? []
          : (input.sanctions ?? []);
    if (input.outcome === "diubah")
      this.validateSanctions(c, finalSanctions, input.freezeMonths);
    c.objectionDecision = {
      at: input.at,
      by: input.by,
      sanctions: finalSanctions,
      reasons: input.reasons.trim(),
      freezeMonths: input.freezeMonths,
      late: false,
      outcome: input.outcome,
    };
    // Batalkan sanksi yang tidak lagi berlaku.
    for (const s of c.applied.filter((x) => !finalSanctions.includes(x)))
      this.revert(c, s, input.at, input.by);
    c.applied = c.applied.filter((x) => finalSanctions.includes(x));
    const toApply = finalSanctions.filter(
      (s) => !c.applied.includes(s) && s !== "pemutusan",
    );
    this.applyImmediate(c, toApply, input.at, input.by, input.freezeMonths);
    this.log(
      c,
      input.at,
      input.by,
      `Keberatan ${input.outcome}`,
      input.reasons.trim(),
    );
    this.issue(c, "keputusan_keberatan", input.at);
    this.finalize(c, input.at, input.by, finalSanctions);
  }

  /** Jalankan tenggat: kasus yang masa keberatannya lewat menjadi final. */
  tick(at: number): string[] {
    const done: string[] = [];
    for (const c of this.cases) {
      if (c.status === "masa_keberatan" && at > c.objectionDue!) {
        this.finalize(c, at, "Sistem", c.decision!.sanctions);
        done.push(c.id);
      }
    }
    return done;
  }

  /** Tenggat yang terlewat untuk dasbor admin. */
  overdue(at: number): { caseId: string; what: string }[] {
    const out: { caseId: string; what: string }[] = [];
    for (const c of this.cases) {
      if (c.status === "menunggu_penjelasan" && at > c.explanationDue)
        out.push({
          caseId: c.id,
          what: "Batas penjelasan lewat: catat tanpa penjelasan, lalu putuskan",
        });
      if (
        c.status === "menunggu_keputusan" &&
        c.decisionDue &&
        at > c.decisionDue
      )
        out.push({
          caseId: c.id,
          what: "Keputusan melewati 14 hari setelah penjelasan",
        });
      for (const saleId of c.saleIds) {
        const s = this.engine.sales.get(saleId);
        if (
          s?.review &&
          !s.review.dismissedAt &&
          !s.review.confirmedAt &&
          !s.review.expiredAt &&
          at - s.review.openedAt > PAYMENT_HOLD_DAYS * DAY
        ) {
          out.push({
            caseId: c.id,
            what: `Tunda pembayaran ${saleId} melewati 30 hari; bonus dibayar pada tutup bulan`,
          });
        }
      }
    }
    return out;
  }

  markRead(caseId: string, letterNumber: string, at: number): void {
    const l = this.get(caseId).letters.find((x) => x.number === letterNumber);
    if (l && !l.readAt) l.readAt = at;
  }

  // ---------------------------------------------------------------------------

  private validateSanctions(
    c: SanctionCase,
    sanctions: SanctionType[],
    freezeMonths?: number,
  ): void {
    if (sanctions.includes("pembekuan")) {
      if (!freezeMonths || freezeMonths < 1 || freezeMonths > MAX_FREEZE_MONTHS)
        throw new EngineError(
          "Pembekuan paling lama 3 bulan (Pasal 20 angka 4)",
        );
    }
    if (sanctions.includes("pemutusan")) {
      const severe = c.violations.some((v) => SEVERE_VIOLATIONS.includes(v));
      if (!severe && this.priorFinalSanctions(c.accountId, c.id) < 2) {
        throw new EngineError(
          "Pemutusan langsung hanya untuk pelanggaran berat Pasal 18 angka 1, 2, 4, 9, 12, 15, 16, atau setelah 2 sanksi final sebelumnya",
        );
      }
    }
    if (sanctions.includes("penarikan") && c.saleIds.length === 0) {
      throw new EngineError(
        "Penarikan memerlukan penjualan yang dikaitkan dengan pelanggaran",
      );
    }
  }

  private applyImmediate(
    c: SanctionCase,
    sanctions: SanctionType[],
    at: number,
    actor: string,
    freezeMonths?: number,
  ): void {
    for (const s of sanctions) {
      if (s === "teguran") c.applied.push(s);
      if (s === "penarikan") {
        let total = 0;
        for (const saleId of c.saleIds) {
          const sale = this.engine.sales.get(saleId);
          if (!sale || sale.controlled || sale.cancelled) continue;
          if (!sale.review || sale.review.dismissedAt || sale.review.expiredAt)
            this.engine.openReview(saleId, at, `Kasus ${c.id}`);
          total += this.engine.confirmControlled(saleId, at).clawedBack;
        }
        c.applied.push(s);
        this.log(
          c,
          at,
          actor,
          "Penarikan dijalankan",
          `Rp${total.toLocaleString("id-ID")} yang sudah dibayar dipotong dari pembayaran berikutnya`,
        );
      }
      if (s === "pembekuan") {
        this.engine.freezeAccount(
          c.accountId,
          at + (freezeMonths ?? 1) * 30 * DAY,
        );
        c.applied.push(s);
        this.log(
          c,
          at,
          actor,
          "Keanggotaan dibekukan",
          `sampai ${tanggal(at + (freezeMonths ?? 1) * 30 * DAY)}`,
        );
      }
      // Pemutusan menunggu keputusan final.
    }
  }

  private revert(
    c: SanctionCase,
    s: SanctionType,
    at: number,
    actor: string,
  ): void {
    if (s === "pembekuan") {
      this.engine.unfreezeAccount(c.accountId);
      this.log(c, at, actor, "Pembekuan dicabut");
    }
    if (s === "pemutusan") this.engine.reinstateAccount(c.accountId);
    if (s === "penarikan") {
      c.manualFollowUp.push(
        "Kembalikan komisi yang ditarik melalui pembayaran koreksi oleh Keuangan (penarikan dibatalkan oleh keputusan keberatan).",
      );
      this.log(
        c,
        at,
        actor,
        "Penarikan dibatalkan",
        "Perlu pembayaran koreksi manual",
      );
    }
  }

  private finalize(
    c: SanctionCase,
    at: number,
    actor: string,
    sanctions: SanctionType[],
  ): void {
    if (sanctions.includes("pemutusan") && !c.applied.includes("pemutusan")) {
      this.engine.terminateAccount(c.accountId, at);
      c.applied.push("pemutusan");
      this.log(
        c,
        at,
        actor,
        "Keanggotaan diputus",
        "Komisi yang sudah menjadi hak tetap dibayar (Pasal 7); hak pembelian kembali Lisensi berlaku (Pasal 15)",
      );
    }
    c.status = sanctions.length ? "final" : "ditutup_tanpa_sanksi";
    c.finalAt = at;
    this.log(c, at, actor, "Keputusan final");
  }

  private log(
    c: SanctionCase,
    at: number,
    actor: string,
    action: string,
    note?: string,
  ): void {
    c.events.push({ at, actor, action, note });
  }

  private accountName(id: string): string {
    const a = this.engine.accounts.get(id)!;
    return `${a.name} (${a.code})`;
  }

  private nextNumber(kind: LetterKind, at: number): string {
    const code = {
      pemberitahuan: "PDP",
      penundaan: "PTB",
      keputusan: "KEP",
      keputusan_keberatan: "KKB",
    }[kind];
    const d = new Date(at + 7 * 3600_000);
    const key = `${code}-${d.getUTCFullYear()}`;
    const n = (this.letterSeq.get(key) ?? 0) + 1;
    this.letterSeq.set(key, n);
    return `${String(n).padStart(3, "0")}/${code}-PLS/${ROMAN[d.getUTCMonth()]}/${d.getUTCFullYear()}`;
  }

  private issue(
    c: SanctionCase,
    kind: LetterKind,
    at: number,
    heldSales: string[] = [],
  ): Letter {
    const acc = this.engine.accounts.get(c.accountId)!;
    const number = this.nextNumber(kind, at);
    const pasal = c.violations.map(
      (v) => `Pasal 18 angka ${v} (${VIOLATIONS[v]})`,
    );
    const head = [`Kepada Yth. ${acc.name}`, `Kode Mitra PLS ${acc.code}`];
    let title = "";
    let body: string[] = [];
    if (kind === "pemberitahuan") {
      title = "Surat Pemberitahuan Dugaan Pelanggaran Kode Etik";
      body = [
        ...head,
        `Dengan surat ini PT MITRANS memberitahukan adanya dugaan pelanggaran Kode Etik Mitra PLS Mitrans-Astra oleh Saudara/Saudari, sesuai Kode Etik Pasal 21 angka 1.`,
        `Dugaan pelanggaran: ${pasal.join("; ")}.`,
        `Uraian: ${c.allegation}`,
        `Bukti: ${c.evidence.join("; ")}.`,
        `Saudara/Saudari berhak memberikan penjelasan secara tertulis melalui Kantor Maya paling lambat ${tanggal(c.explanationDue)} (14 hari sejak surat ini). Penjelasan dapat disertai bukti pendukung.`,
        `Keputusan akan diberikan paling lambat 14 hari setelah penjelasan diterima, beserta alasan tertulis. Bila tidak ada penjelasan sampai batas waktu, Perusahaan dapat memutus berdasarkan bukti yang ada.`,
        `Dugaan ini belum merupakan keputusan. Komisi dan bonus yang tidak terkait dengan dugaan pelanggaran tetap dibayarkan sesuai jadwal.`,
      ];
    } else if (kind === "penundaan") {
      title = "Pemberitahuan Penundaan Pembayaran Komisi";
      body = [
        ...head,
        `Sesuai Kode Etik Pasal 9 angka 2 dan Pasal 20 angka 2, pembayaran komisi dan bonus atas penjualan berikut ditunda selama pemeriksaan kasus ${c.id}: ${heldSales.join(", ")}.`,
        `Penundaan berlaku paling lama ${PAYMENT_HOLD_DAYS} hari sejak ${tanggal(at)}, yaitu sampai ${tanggal(at + PAYMENT_HOLD_DAYS * DAY)}. Bila sampai tanggal itu belum ada keputusan, komisi yang ditunda dibayarkan pada pembayaran berikutnya.`,
        `Penjualan tersebut tetap dihitung untuk status aktif selama pemeriksaan.`,
      ];
    } else if (kind === "keputusan") {
      const d = c.decision!;
      const none = d.sanctions.length === 0;
      title = none
        ? "Surat Keputusan: Dugaan Pelanggaran Tidak Terbukti"
        : "Surat Keputusan Sanksi Kode Etik";
      body = [
        ...head,
        `Merujuk Surat Pemberitahuan ${c.letters[0]?.number ?? ""} tanggal ${tanggal(c.openedAt)} dan ${c.explanation ? `penjelasan Saudara/Saudari tanggal ${tanggal(c.explanation.at)}` : "tidak adanya penjelasan sampai batas waktu"}, Perusahaan memutuskan:`,
        none
          ? "Dugaan pelanggaran tidak terbukti. Komisi dan bonus yang ditunda dibayarkan pada pembayaran berikutnya."
          : `Sanksi: ${d.sanctions.map((s) => (s === "pembekuan" ? `${SANCTION_LABEL[s]} selama ${d.freezeMonths} bulan` : SANCTION_LABEL[s])).join("; ")}.`,
        `Alasan: ${d.reasons}`,
        ...(none
          ? []
          : [
              `Teguran, penarikan, dan pembekuan berlaku sejak tanggal surat ini.${d.sanctions.includes("pemutusan") ? " Pemutusan keanggotaan berlaku setelah keputusan ini final." : ""}`,
              `Saudara/Saudari dapat mengajukan keberatan satu kali melalui Kantor Maya paling lambat ${tanggal(c.objectionDue!)}. Keberatan diperiksa oleh pejabat Perusahaan yang tidak terlibat dalam keputusan ini (Kode Etik Pasal 21 angka 4).`,
              `Bila perselisihan berlanjut, Saudara/Saudari dapat menempuh musyawarah dan mediasi melalui asosiasi penjualan langsung (Kode Etik Pasal 22).`,
            ]),
      ];
    } else {
      const d = c.objectionDecision!;
      title = "Surat Keputusan atas Keberatan";
      body = [
        ...head,
        `Atas keberatan Saudara/Saudari tanggal ${tanggal(c.objection!.at)} terhadap keputusan kasus ${c.id}, pejabat pemeriksa keberatan memutuskan: keberatan ${d.outcome}.`,
        d.sanctions.length
          ? `Sanksi yang berlaku: ${d.sanctions.map((s) => SANCTION_LABEL[s]).join("; ")}.`
          : "Tidak ada sanksi yang berlaku.",
        `Alasan: ${d.reasons}`,
        `Keputusan ini final di tingkat Perusahaan. Saudara/Saudari tetap dapat menempuh mediasi melalui asosiasi penjualan langsung dan penyelesaian lanjutan sesuai Kode Etik Pasal 22–23.`,
      ];
    }
    const letter: Letter = {
      number,
      kind,
      caseId: c.id,
      accountId: c.accountId,
      issuedAt: at,
      title,
      body: [...body, `Hormat kami,`, `PT MITRANS [nama lengkap ●]`],
      channels: ["Kantor Maya", "Surel terdaftar"],
    };
    c.letters.push(letter);
    this.log(
      c,
      at,
      "Sistem",
      `Surat ${number} dikirim`,
      `${title} — melalui ${letter.channels.join(" dan ")}`,
    );
    return letter;
  }
}
