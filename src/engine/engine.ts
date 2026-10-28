import {
  DEFAULT_OPTIONS,
  PLAN,
  type EngineOptions,

} from "./plan";
import {
  allocateEqualWithCap,
  applyBp,
  distributePool,
  pairDay,
  pembinaanRateBp,
  rankReward,
  ranksForSmallLeg,
  roPairAmount,
} from "./calc";
import {
  addDays,
  addMonths,
  monthCloseAt,
  monthIndex,
  monthNumberSince,
  nextDate,
  payoutFriday,
  wibDate,
  wibMonth,
} from "./time";
import { PPH21, dppOf, withholdBySchedule, type BuktiPotong, type ClawbackStatus, type PayoutScheduleLine } from "./tax";

const DAY_MS = 86_400_000;
/** Tanggal YYYY-MM-DD ditambah n bulan kalender (tanggal akhir bulan disesuaikan). */
function addMonthsToDate(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const idx = y * 12 + (m - 1) + n;
  const ny = Math.floor(idx / 12);
  const nm = (idx % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}
import {
  PLAN_A_TYPES,
  PLAN_B_TYPES,
  SALE_DRIVEN_TYPES,
  TEAM_TYPES,
  type Account,
  type BinaryNode,
  type BonusType,
  type LedgerEntry,
  type MonthReport,
  type OtherEntitlement,
  type OtherEntitlementKind,
  type PayoutDeduction,
  type PoolSources,
  type RankClaim,
  type Sale,
  type Side,
} from "./types";

export class EngineError extends Error {
  override name = "EngineError";
}

const STRUCTURAL_NIK = "PT-MITRANS";

function emptyByType(): Record<BonusType, number> {
  return {
    SPONSOR: 0,
    BERKAH: 0,
    LEVEL: 0,
    PASANGAN: 0,
    PEMBINAAN: 0,
    PRESTASI: 0,
    ROYALTI: 0,
    POOL_AKTIF: 0,
    KOMISI_LANGGANAN: 0,
    PASANGAN_RO: 0,
    ROYALTI_RO: 0,
  };
}

interface MonthState {
  licenseSaleIds: string[];
  subscriptionSaleIds: string[];
  conversions: number;
  newMitra: number;
  coaching: Set<string>;
  /** Waktu penjualan baru pribadi ke-2 (status aktif tercapai), untuk jadwal Jumat. */
  becameActiveAt: Map<string, number>;
  /** Hitungan berjalan penjualan baru pribadi (sebelum pembatalan). */
  runningSales: Map<string, number>;
  /** Akun yang membayar Langganan untuk bulan ini. */
  subscribed: Set<string>;
  /** Node yang menerima PV Langganan bulan ini. */
  roTouched: Set<string>;
}

export interface PairLogItem {
  accountId: string;
  date: string;
  inL: number;
  inR: number;
  balanceL: number;
  balanceR: number;
  pairs: number;
  carryL: number;
  carryR: number;
}

/**
 * Engine komisi dan PV Mitrans-Astra.
 *
 * Model waktu: semua peristiwa harus dikirim berurutan waktu. Engine memproses akhir hari
 * (Bonus Pasangan dan Pembinaan) dan tutup bulan (status aktif, masa tunggu, plafon,
 * Prestasi, Royalti, Pool Aktif, Plan B) secara otomatis saat waktu bergerak maju.
 */
export class MitransEngine {
  readonly options: EngineOptions;
  readonly accounts = new Map<string, Account>();
  readonly nodes = new Map<string, BinaryNode>();
  readonly sales = new Map<string, Sale>();
  readonly ledger: LedgerEntry[] = [];
  readonly reports: MonthReport[] = [];
  readonly rankQueue: RankClaim[] = [];
  readonly rankPaid: RankClaim[] = [];
  readonly pairLog: PairLogItem[] = [];

  private readonly nikIndex = new Map<string, string>();
  private readonly months = new Map<string, MonthState>();
  private readonly pendingByMonth = new Map<string, LedgerEntry[]>();
  private held: LedgerEntry[] = [];
  private reviewHeld: LedgerEntry[] = [];
  private pendingBerkah: LedgerEntry[] = [];
  /** Kekurangan bayar bonus tim karena faktor plafon; dibayar lebih dulu bulan berikutnya. */
  private teamCarry: LedgerEntry[] = [];
  private poolCarry = 0;
  private touchedToday = new Set<string>();
  /** Periode akses dari Langganan per akun (Lisensi memberi 30 hari pertama sejak aktivasi). */
  private subscriptionPeriods = new Map<string, Sale[]>();
  /** Potongan transfer Jumat untuk Langganan yang dibayar dari bonus. */
  readonly payoutDeductions: PayoutDeduction[] = [];
  /** Hak lain Mitra PLS yang dibayar Perusahaan (bukan bonus). */
  readonly otherEntitlements: OtherEntitlement[] = [];
  private customersWithPaidSubscription = new Set<string>();
  private licenseSalesByBuyer = new Map<string, string[]>();
  private entriesBySale = new Map<string, LedgerEntry[]>();
  private entriesByAccount = new Map<string, LedgerEntry[]>();
  private activeByMonth = new Map<string, Set<string>>();
  private companyByMonth = new Map<string, number>();
  private clawbackByMonth = new Map<string, LedgerEntry[]>();
  private currentDayEnd = 0;
  private nextEntryId = 1;
  private currentDay: string;
  private readonly keepPairLog: boolean;
  readonly rootNodeId: string;

  constructor(
    startAt: number,
    options: Partial<EngineOptions> & { keepPairLog?: boolean } = {},
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.keepPairLog = options.keepPairLog ?? false;
    this.currentDay = wibDate(startAt);
    // Bab 2: akun struktural Mitrans 001 (puncak), 002 (kiri), 003 (kanan).
    const s1 = this.createStructural(
      "MITRANS-001",
      "Mitrans 001",
      null,
      startAt,
    );
    const s2 = this.createStructural(
      "MITRANS-002",
      "Mitrans 002",
      s1.id,
      startAt,
    );
    const s3 = this.createStructural(
      "MITRANS-003",
      "Mitrans 003",
      s1.id,
      startAt,
    );
    this.rootNodeId = this.attachNode(s1, null, null, startAt).id;
    this.attachNode(s2, this.rootNodeId, "L", startAt);
    this.attachNode(s3, this.rootNodeId, "R", startAt);
  }

  get today(): string {
    return this.currentDay;
  }

  // ---------------------------------------------------------------------------
  // Pendaftaran

  /** Pendaftaran Mitra PLS. Gratis dan tidak mewajibkan pembelian (Bab 5.1). */
  registerMitra(input: {
    id: string;
    name: string;
    nik: string;
    sponsorId: string;
    at: number;
    code?: string;
  }): Account {
    this.advance(input.at);
    const sponsor = this.mustAccount(input.sponsorId);
    if (sponsor.role === "pelanggan")
      throw new EngineError("Sponsor harus Mitra PLS atau akun struktural");
    this.assertNikFree(input.nik);
    const acc: Account = {
      id: input.id,
      code:
        input.code ?? `MTR-${String(this.accounts.size + 1).padStart(6, "0")}`,
      name: input.name,
      nik: input.nik,
      role: "mitra",
      sponsorId: sponsor.id,
      joinedAt: input.at,
      mitraSince: input.at,
      quizPassed: false,
      everActive: false,
      ranksAchieved: [],
    };
    this.addAccount(acc);
    this.month(wibMonth(input.at)).newMitra++;
    return acc;
  }

  registerPelanggan(input: {
    id: string;
    name: string;
    nik: string;
    sellerId: string;
    at: number;
    code?: string;
  }): Account {
    this.advance(input.at);
    const seller = this.mustAccount(input.sellerId);
    if (seller.role === "pelanggan")
      throw new EngineError("Penjual harus Mitra PLS");
    this.assertNikFree(input.nik);
    const acc: Account = {
      id: input.id,
      code:
        input.code ?? `PLG-${String(this.accounts.size + 1).padStart(6, "0")}`,
      name: input.name,
      nik: input.nik,
      role: "pelanggan",
      sponsorId: seller.id,
      joinedAt: input.at,
      quizPassed: false,
      everActive: false,
      ranksAchieved: [],
    };
    this.addAccount(acc);
    return acc;
  }

  /** Lulus kuis Kode Etik: tautan rujukan aktif (Bab 6 butir 7). */
  passQuiz(accountId: string): void {
    const acc = this.mustAccount(accountId);
    if (acc.role !== "mitra")
      throw new EngineError("Kuis hanya untuk Mitra PLS");
    acc.quizPassed = true;
  }

  // ---------------------------------------------------------------------------
  // Penjualan

  /**
   * Pembelian Lisensi melalui tautan rujukan.
   * - Pembeli Mitra PLS: penjual harus Sponsor-nya. Lisensi pertama memberi posisi jaringan.
   * - Pembeli Pelanggan: penjual adalah Mitra PLS yang merujuknya; volume dicatat di posisi penjual.
   */
  purchaseLicense(input: {
    saleId: string;
    buyerId: string;
    at: number;
    legPreference?: Side;
  }): Sale {
    this.advance(input.at);
    const buyer = this.mustAccount(input.buyerId);
    if (buyer.role === "struktural")
      throw new EngineError("Akun struktural tidak membeli");
    const seller = this.mustAccount(buyer.sponsorId!);
    this.assertSellerCanSell(seller);
    if (this.sales.has(input.saleId))
      throw new EngineError(`Penjualan ${input.saleId} sudah ada`);

    const month = wibMonth(input.at);
    const sale: Sale = {
      id: input.saleId,
      kind: "license",
      buyerId: buyer.id,
      sellerId: seller.id,
      at: input.at,
      month,
      toCustomer: buyer.role === "pelanggan",
      countedBy: new Set(),
    };
    this.sales.set(sale.id, sale);
    const bySale = this.licenseSalesByBuyer.get(buyer.id) ?? [];
    bySale.push(sale.id);
    this.licenseSalesByBuyer.set(buyer.id, bySale);
    const ms = this.month(month);
    ms.licenseSaleIds.push(sale.id);
    this.countPersonalSale(seller.id, input.at);

    // Bonus Sponsor (8.1): kepada Mitra PLS penjual.
    this.accrue(seller.id, "SPONSOR", PLAN.sponsorBonus, input.at, {
      saleId: sale.id,
    });
    // Bonus Layanan Berkah: hanya Lisensi kepada Pelanggan, cair setelah 30 hari dan konfirmasi orientasi.
    if (sale.toCustomer) {
      const e = this.accrue(seller.id, "BERKAH", PLAN.berkahBonus, input.at, {
        saleId: sale.id,
        deferred: true,
      });
      if (e.status === "pending") this.pendingBerkah.push(e);
    }

    if (!buyer.licenseActivatedAt) buyer.licenseActivatedAt = input.at;

    if (buyer.role === "mitra") {
      let createdNode = false;
      if (!buyer.nodeId) {
        const node = this.placeNode(buyer, input.at, input.legPreference);
        buyer.nodeId = node.id;
        createdNode = true;
      }
      sale.volumeNodeId = buyer.nodeId;
      this.addLicenseVolume(sale, buyer.nodeId, createdNode);
    } else {
      const nodeId = this.volumeNodeFor(seller);
      sale.volumeNodeId = nodeId;
      if (nodeId) this.addLicenseVolume(sale, nodeId, false);
    }
    return sale;
  }

  /** Pelanggan mengonfirmasi pendampingan orientasi di aplikasi (Bab 7 butir 5). */
  confirmOrientation(saleId: string, at: number): void {
    this.advance(at);
    const sale = this.mustSale(saleId);
    if (!sale.toCustomer) return;
    if (at > addDays(sale.at, PLAN.berkahConfirmDeadlineDays)) {
      throw new EngineError("Konfirmasi melewati batas 60 hari");
    }
    sale.orientationConfirmedAt = at;
  }

  /**
   * Konversi Lisensi Pelanggan menjadi Lisensi Mitra PLS (Bab 5.5), paling lambat 60 hari sejak pembelian.
   * Posisi dibuat di bawah Sponsor yang sama; Bonus Sponsor tidak dibayar lagi; upline yang sudah
   * menghitung Lisensi ini tidak menghitungnya lagi.
   */
  convertCustomer(input: {
    customerId: string;
    at: number;
    legPreference?: Side;
  }): Account {
    this.advance(input.at);
    const acc = this.mustAccount(input.customerId);
    if (acc.role !== "pelanggan")
      throw new EngineError("Hanya Pelanggan yang dapat dikonversi");
    const sale = (this.licenseSalesByBuyer.get(acc.id) ?? [])
      .map((id) => this.sales.get(id)!)
      .find((s) => !s.cancelled && !s.convertedAt);
    if (!sale) throw new EngineError("Pelanggan belum memiliki Lisensi");
    if (input.at > addDays(sale.at, PLAN.conversionWindowDays)) {
      throw new EngineError(
        "Konversi melewati batas 60 hari; posisi diberikan saat Lisensi berikutnya",
      );
    }
    acc.role = "mitra";
    acc.mitraSince = input.at;
    acc.code = acc.code.replace(/^PLG-/, "MTR-");
    sale.convertedAt = input.at;
    const node = this.placeNode(acc, input.at, input.legPreference);
    acc.nodeId = node.id;
    sale.volumeNodeId = node.id;
    this.addLicenseVolume(sale, node.id, true);
    const ms = this.month(wibMonth(input.at));
    ms.conversions++;
    ms.newMitra++;
    return acc;
  }

  /**
   * Pembayaran Langganan (RO): memperpanjang akses 30 hari. Tagihan pertama 30 hari setelah aktivasi Lisensi.
   * Bila dibayar sebelum akses berakhir, periode baru menyambung dari akhir akses; bila sudah lewat, dimulai saat dibayar.
   * Paling banyak satu periode dibayar di muka.
   */
  paySubscription(input: {
    saleId: string;
    accountId: string;
    at: number;
  }): Sale {
    this.advance(input.at);
    const acc = this.mustAccount(input.accountId);
    if (!acc.licenseActivatedAt)
      throw new EngineError("Langganan tanpa Lisensi belum tersedia");
    const period = PLAN.subscription.periodDays * DAY_MS;
    const until = this.accessUntil(acc.id) ?? input.at;
    if (until - input.at > period)
      throw new EngineError("Langganan periode berikutnya sudah dibayar");
    const periodStart = Math.max(until, input.at);
    const month = wibMonth(input.at);
    const firstPaid =
      acc.role === "pelanggan" &&
      !this.customersWithPaidSubscription.has(acc.id);
    const sale: Sale = {
      id: input.saleId,
      kind: "subscription",
      buyerId: acc.id,
      sellerId: acc.sponsorId!,
      at: input.at,
      month,
      toCustomer: acc.role === "pelanggan",
      periodStart,
      periodEnd: periodStart + period,
      firstPaidSubscription: firstPaid,
    };
    this.sales.set(sale.id, sale);
    const periods = this.subscriptionPeriods.get(acc.id) ?? [];
    periods.push(sale);
    this.subscriptionPeriods.set(acc.id, periods);
    const ms = this.month(month);
    ms.subscriptionSaleIds.push(sale.id);
    ms.subscribed.add(acc.id);
    if (firstPaid) {
      this.customersWithPaidSubscription.add(acc.id);
      this.countPersonalSale(sale.sellerId, input.at);
    }
    // PV Langganan untuk Pasangan RO: dicatat di posisi pembeli (Mitra PLS) atau posisi penjual (Pelanggan).
    const volumeNode =
      acc.nodeId ?? this.volumeNodeFor(this.mustAccount(sale.sellerId));
    sale.volumeNodeId = volumeNode;
    if (volumeNode) {
      this.walkUp(volumeNode, (anc, side) => {
        anc.roPvTenths[side] += PLAN.subscription.pvTenths;
        ms.roTouched.add(anc.id);
      });
    }
    return sale;
  }

  /** Kegiatan pembinaan terkonfirmasi (Bab 9.4), syarat Plan B. */
  confirmCoaching(accountId: string, month: string): void {
    this.mustAccount(accountId);
    this.month(month).coaching.add(accountId);
  }

  /**
   * Pembatalan atau pengembalian (Bab 13 butir 10): komisi atas pembelian itu ditarik.
   * Keterbatasan prototipe: Bonus Pasangan/Level/Pembinaan yang sudah timbul dari unit ini tidak
   * dihitung ulang otomatis; engine mengurangi volume dan saldo unit, lalu menandai untuk ditinjau admin.
   */
  refundSale(
    saleId: string,
    at: number,
  ): { clawedBack: number; needsReview: boolean } {
    this.advance(at);
    const sale = this.mustSale(saleId);
    if (sale.cancelled) throw new EngineError("Penjualan sudah dibatalkan");
    sale.cancelled = true;
    sale.cancelledAt = at;
    // Penjualan akun terkendali sudah ditarik saat konfirmasi; jangan ditarik dua kali.
    const clawedBack = sale.controlled ? 0 : this.voidSaleBonuses(sale, at, "pembatalan");
    if (sale.kind === "subscription" && sale.paidFrom === "bonus") {
      // Potongan yang belum ditransfer dibatalkan; yang sudah dipotong dikembalikan lewat pengembalian dana biasa.
      for (const d of this.payoutDeductions)
        if (d.saleId === sale.id && d.date > this.currentDay) d.cancelled = true;
    }
    if (sale.kind === "license") {
      const buyer = this.accounts.get(sale.buyerId)!;
      const stillHolds = (this.licenseSalesByBuyer.get(buyer.id) ?? []).some(
        (id) => !this.sales.get(id)!.cancelled,
      );
      if (!stillHolds) buyer.licenseActivatedAt = undefined;
    }
    return { clawedBack, needsReview: false };
  }

  /** Tarik semua komisi dan volume yang timbul dari satu penjualan (pembatalan atau akun terkendali). */
  private voidSaleBonuses(sale: Sale, at: number, label: string): number {
    const saleId = sale.id;
    let clawedBack = 0;
    for (const e of [...(this.entriesBySale.get(saleId) ?? [])]) {
      if (e.gross <= 0) continue;
      if (e.status === "pending" || e.status === "held") {
        e.status = "clawback";
        e.amount = 0;
        e.note = `Ditarik sebelum dibayar (${label})`;
      } else if (e.status === "payable" && e.amount > 0) {
        clawedBack += e.amount;
        this.pushEntry({
          accountId: e.accountId,
          nik: e.nik,
          type: e.type,
          gross: -e.amount,
          amount: -e.amount,
          status: "clawback",
          month: wibMonth(at),
          accruedAt: at,
          saleId,
          note: `Penarikan ${e.type} atas ${label} ${saleId}`,
        });
      }
    }
    this.pendingBerkah = this.pendingBerkah.filter((e) => e.saleId !== saleId);
    this.reviewHeld = this.reviewHeld.filter((e) => e.saleId !== saleId);
    // Keputusan A12: bonus tim dari Lisensi yang dibatalkan ditarik otomatis.
    if (sale.kind === "license" && sale.volumeNodeId && sale.countedBy) {
      this.walkUp(sale.volumeNodeId, (anc, side) => {
        if (!sale.countedBy!.has(anc.id)) return;
        anc.cumLicenses[side] = Math.max(0, anc.cumLicenses[side] - 1);
        if (anc.todayIn[side] > 0) anc.todayIn[side]--;
        else if (anc.carry[side] > 0) anc.carry[side]--;
        else {
          // Unit sudah dipasangkan: batalkan satu pasangan, unit pasangannya kembali menjadi sisa.
          const other: Side = side === "L" ? "R" : "L";
          anc.carry[other]++;
          this.touchedToday.add(anc.id);
          clawedBack += this.reverseTeam(anc.accountId, "PASANGAN", PLAN.pairBonus, at, saleId);
          let cur = this.accounts.get(anc.accountId)!;
          for (let gen = 1; gen <= PLAN.pembinaanRatesBp.length && cur.sponsorId; gen++) {
            const sponsor = this.accounts.get(cur.sponsorId)!;
            if (sponsor.nodeId) {
              clawedBack += this.reverseTeam(sponsor.id, "PEMBINAAN", applyBp(PLAN.pairBonus, pembinaanRateBp(gen)), at, saleId);
            }
            cur = sponsor;
          }
        }
      });
    }
    return clawedBack;
  }

  // ---------------------------------------------------------------------------
  // Pemeriksaan akun yang dikendalikan sendiri

  /** Buka pemeriksaan: Bonus Sponsor dan Berkah penjualan ini ditunda paling lama 30 hari (Kode Etik Pasal 9). */
  openReview(saleId: string, at: number, reason: string): void {
    this.advance(at);
    const sale = this.mustSale(saleId);
    if (sale.cancelled || sale.controlled) throw new EngineError("Penjualan sudah dibatalkan atau dikonfirmasi");
    if (sale.review && !sale.review.dismissedAt && !sale.review.expiredAt) throw new EngineError("Pemeriksaan sudah terbuka");
    sale.review = { openedAt: at, reason };
  }

  /** Pemeriksaan selesai tanpa pelanggaran: bonus yang ditunda dibayar pada tutup bulan berikutnya. */
  dismissReview(saleId: string, at: number): void {
    this.advance(at);
    const sale = this.mustSale(saleId);
    if (!sale.review || sale.review.confirmedAt) throw new EngineError("Tidak ada pemeriksaan terbuka");
    sale.review.dismissedAt = at;
  }

  /**
   * Pelanggaran terkonfirmasi (setelah tata cara Kode Etik Pasal 21): penjualan tidak dihitung,
   * komisi dan volumenya ditarik. Bila status aktif penjual pada bulan penjualan hanya karena penjualan ini,
   * bonus tim, Pool Aktif, Royalti, dan Prestasi bulan itu ikut ditarik.
   */
  confirmControlled(saleId: string, at: number): { clawedBack: number; activeRevoked: boolean } {
    this.advance(at);
    const sale = this.mustSale(saleId);
    if (!sale.review || sale.review.dismissedAt) throw new EngineError("Buka pemeriksaan sebelum mengonfirmasi");
    if (sale.controlled) throw new EngineError("Sudah dikonfirmasi");
    if (sale.cancelled) throw new EngineError("Penjualan sudah dibatalkan; komisinya sudah ditarik");
    sale.review.confirmedAt = at;
    sale.controlled = true;
    let clawedBack = this.voidSaleBonuses(sale, at, "akun terkendali");
    let activeRevoked = false;
    const closed = this.activeByMonth.get(sale.month);
    if (closed?.has(sale.sellerId)) {
      const left = this.personalSales(sale.month).get(sale.sellerId) ?? 0;
      if (left < this.options.activeMinPersonalSales) {
        closed.delete(sale.sellerId);
        activeRevoked = true;
        const types: BonusType[] = ["LEVEL", "PASANGAN", "PEMBINAAN", "POOL_AKTIF", "ROYALTI", "PRESTASI"];
        for (const e of [...this.entriesFor(sale.sellerId)]) {
          if (e.status !== "payable" || e.settledMonth !== sale.month || !types.includes(e.type) || e.amount <= 0) continue;
          clawedBack += e.amount;
          this.pushEntry({
            accountId: e.accountId,
            nik: e.nik,
            type: e.type,
            gross: -e.amount,
            amount: -e.amount,
            status: "clawback",
            month: wibMonth(at),
            accruedAt: at,
            saleId,
            note: `Status aktif ${sale.month} dicabut: penjualan ${saleId} oleh akun terkendali`,
          });
        }
      }
    }
    return { clawedBack, activeRevoked };
  }

  /** Pembekuan keanggotaan (sanksi). Komisi yang sudah menjadi hak tetap dihitung. */
  freezeAccount(accountId: string, until: number): void {
    this.mustAccount(accountId).frozenUntil = until;
  }

  unfreezeAccount(accountId: string): void {
    this.mustAccount(accountId).frozenUntil = undefined;
  }

  /**
   * Pemutusan keanggotaan (Kode Etik Pasal 7 dan 20). Komisi yang sudah menjadi hak tetap dibayarkan,
   * kecuali yang diperoleh dari pelanggaran (ditarik melalui confirmControlled).
   */
  terminateAccount(accountId: string, at: number): void {
    this.advance(at);
    const acc = this.mustAccount(accountId);
    acc.terminated = true;
    acc.terminatedAt = at;
  }

  reinstateAccount(accountId: string): void {
    const acc = this.mustAccount(accountId);
    acc.terminated = false;
    acc.terminatedAt = undefined;
  }

  /** Penjualan dengan pemeriksaan terbuka. */
  openReviews(): Sale[] {
    return [...this.sales.values()].filter((s) => s.review && !s.review.dismissedAt && !s.review.confirmedAt && !s.review.expiredAt);
  }

  // ---------------------------------------------------------------------------
  // Waktu

  /** Gerakkan waktu sampai t: proses akhir hari dan tutup bulan yang terlewati. */
  advance(t: number): void {
    if (t < this.currentDayEnd && t >= this.currentDayEnd - 86_400_000) return;
    const target = wibDate(t);
    if (target < this.currentDay) {
      throw new EngineError(`Peristiwa mundur waktu: ${target} < ${this.currentDay}`);
    }
    while (this.currentDay < target) {
      this.endOfDay(this.currentDay);
      const next = nextDate(this.currentDay);
      if (next.slice(0, 7) !== this.currentDay.slice(0, 7)) this.closeMonth(this.currentDay.slice(0, 7));
      this.currentDay = next;
    }
    // Batas akhir hari berjalan (00.00 WIB hari berikutnya) untuk jalur cepat.
    this.currentDayEnd = Date.parse(`${nextDate(this.currentDay)}T00:00:00Z`) - 7 * 3600_000;
  }


  /** Tutup bulan berjalan dan semua bulan sebelum `month` (inklusif). */
  closeThrough(month: string): void {
    const t = monthCloseAt(month);
    if (wibDate(t) <= this.currentDay) return; // bulan itu sudah ditutup
    this.advance(t);
  }

  // ---------------------------------------------------------------------------
  // Pertanyaan untuk kantor maya dan admin

  isActive(accountId: string, month: string): boolean {
    const closed = this.activeByMonth.get(month);
    if (closed) return closed.has(accountId);
    return (this.personalSales(month).get(accountId) ?? 0) >= this.options.activeMinPersonalSales;
  }


  personalSales(month: string): Map<string, number> {
    const result = new Map<string, number>();
    for (const acc of this.accounts.values())
      if (acc.role === "mitra") result.set(acc.id, 0);
    const ms = this.months.get(month);
    if (!ms) return result;
    const bump = (id: string) => result.set(id, (result.get(id) ?? 0) + 1);
    for (const id of ms.licenseSaleIds) {
      const s = this.sales.get(id)!;
      if (s.cancelled || s.controlled) continue;
      const seller = this.accounts.get(s.sellerId)!;
      if (seller.role !== "mitra" || s.buyerId === s.sellerId) continue;
      bump(s.sellerId);
    }
    for (const id of ms.subscriptionSaleIds) {
      const s = this.sales.get(id)!;
      if (s.cancelled || s.controlled || !s.firstPaidSubscription) continue;
      if (this.accounts.get(s.sellerId)!.role !== "mitra") continue;
      bump(s.sellerId);
    }
    return result;
  }

  /** Akhir akses (Lisensi 30 hari pertama atau Langganan terakhir yang belum dibatalkan); undefined bila tidak memegang Lisensi. */
  accessUntil(accountId: string): number | undefined {
    const acc = this.mustAccount(accountId);
    if (!acc.licenseActivatedAt) return undefined;
    let end = acc.licenseActivatedAt + PLAN.license.accessDays * DAY_MS;
    for (const s of this.subscriptionPeriods.get(accountId) ?? [])
      if (!s.cancelled && s.periodEnd! > end) end = s.periodEnd!;
    return end;
  }

  /** Akses aktif pada waktu t. paidOnly: hanya dari Langganan berbayar, tidak termasuk 30 hari pertama Lisensi. */
  accessActiveAt(accountId: string, t: number, paidOnly = false): boolean {
    const acc = this.mustAccount(accountId);
    const act = acc.licenseActivatedAt;
    if (act === undefined || t < act) return false;
    if (!paidOnly && t < act + PLAN.license.accessDays * DAY_MS) return true;
    return (this.subscriptionPeriods.get(accountId) ?? []).some(
      (s) => !s.cancelled && s.periodStart! <= t && t < s.periodEnd!,
    );
  }

  /** Langganan berbayar menutup akhir bulan itu (23.59 WIB hari terakhir). */
  hasPaidSubscription(accountId: string, month: string): boolean {
    return this.accessActiveAt(accountId, monthCloseAt(month) - 1, true);
  }

  /** Bulan ke berapa sejak aktivasi Lisensi; undefined bila belum memegang Lisensi. */
  licenseMonthNumber(accountId: string, month: string): number | undefined {
    const acc = this.mustAccount(accountId);
    if (!acc.licenseActivatedAt) return undefined;
    return monthNumberSince(wibMonth(acc.licenseActivatedAt), month);
  }

  /**
   * Syarat Langganan untuk bonus tim (Bab 9.2): akses aktif pada akhir bulan bonus.
   * 30 hari pertama setelah aktivasi termasuk Lisensi; sesudahnya akses aktif hanya dengan Langganan.
   */
  subscriptionConditionMet(accountId: string, month: string): boolean {
    const acc = this.mustAccount(accountId);
    const end = monthCloseAt(month) - 1;
    if (acc.licenseActivatedAt === undefined || acc.licenseActivatedAt > end) return true;
    return this.accessActiveAt(accountId, end);
  }

  /** "Langganan sendiri aktif" untuk Plan B: akses aktif pada akhir bulan. */
  accessActive(accountId: string, month: string): boolean {
    return this.accessActiveAt(
      accountId,
      monthCloseAt(month) - 1,
      this.options.planBRequiresPaidSubscription,
    );
  }

  planBEligible(accountId: string, month: string): boolean {
    const acc = this.mustAccount(accountId);
    if (acc.role !== "mitra" || acc.terminated || !acc.nodeId) return false;
    return (
      this.accessActive(accountId, month) &&
      (acc.everActive || this.isActive(accountId, month)) &&
      (this.months.get(month)?.coaching.has(accountId) ?? false)
    );
  }

  smallLeg(accountId: string): number {
    const acc = this.mustAccount(accountId);
    if (!acc.nodeId) return 0;
    const n = this.nodes.get(acc.nodeId)!;
    return Math.min(n.cumLicenses.L, n.cumLicenses.R);
  }

  entriesFor(accountId: string): LedgerEntry[] {
    return this.entriesByAccount.get(accountId) ?? [];
  }

  report(month: string): MonthReport | undefined {
    return this.reports.find((r) => r.month === month);
  }

  /** Daftar transfer per Jumat (Bab 11.1). */
  /** Bonus bruto per Jumat transfer (semua tanggal) untuk satu akun. */
  private grossByDate(accountId: string): Map<string, number> {
    const by = new Map<string, number>();
    const add = (date: string, x: number) => by.set(date, (by.get(date) ?? 0) + x);
    for (const e of this.entriesFor(accountId)) {
      if (e.status !== "payable" || !e.payoutDate || e.amount === 0) continue;
      if (e.advance && e.advanceDate) add(e.advanceDate, e.advance);
      add(e.payoutDate, e.amount - (e.advance ?? 0));
    }
    return by;
  }

  /**
   * Hitungan inti per akun: penarikan bonus (clawback) dialokasikan ke Jumat transfer berikutnya, lalu PPh 21 dihitung
   * atas bruto setelah penarikan (tax.ts), lalu potongan Langganan. Murni dari ledger, tanpa keadaan tersimpan.
   */
  private computeSchedule(accountId: string): {
    lines: PayoutScheduleLine[];
    clawbacks: ClawbackStatus[];
    /** Kekurangan transfer minus yang belum tertutup Jumat berikutnya. */
    shortfall: number;
  } {
    const acc = this.mustAccount(accountId);
    const gross = this.grossByDate(accountId);
    const dates = [...gross.keys()].sort();
    const room = new Map(gross);
    const offsetByDate = new Map<string, number>();
    const clawbacks: ClawbackStatus[] = [];
    // Sumber pemotongan menurut urutan waktu: transfer bonus Jumat dan hak lain (pembelian kembali, pengembalian dana, dll.).
    const ents = this.otherEntitlements.filter((e) => e.accountId === accountId);
    const entRoom = new Map(ents.map((e) => [e.id, e.amount]));
    const sources = [
      ...dates.map((d) => ({ date: d, entitlement: undefined as OtherEntitlement | undefined })),
      ...ents.map((e) => ({ date: wibDate(e.at), entitlement: e as OtherEntitlement | undefined })),
    ].sort((a, b) => a.date.localeCompare(b.date) || (a.entitlement ? 1 : 0) - (b.entitlement ? 1 : 0));
    const claws = this.entriesFor(accountId)
      .filter((e) => e.status === "clawback" && e.amount < 0)
      .sort((a, b) => a.accruedAt - b.accruedAt || a.id - b.id);
    for (const c of claws) {
      let left = -c.amount;
      const after = wibDate(c.accruedAt);
      const writeOffDate = addMonthsToDate(after, PLAN.clawbackWriteOffMonths);
      const offsets: ClawbackStatus["offsets"] = [];
      for (const src of sources) {
        if (left <= 0) break;
        if (src.date >= writeOffDate) break;
        if (src.entitlement) {
          if (src.entitlement.at < c.accruedAt) continue;
          const take = Math.min(left, entRoom.get(src.entitlement.id)!);
          if (take <= 0) continue;
          entRoom.set(src.entitlement.id, entRoom.get(src.entitlement.id)! - take);
          offsets.push({ date: src.date, amount: take, source: "hak_lain", entitlementId: src.entitlement.id });
          left -= take;
        } else {
          const d = src.date;
          if (d <= after) continue;
          const take = Math.min(left, Math.max(0, room.get(d)!));
          if (take <= 0) continue;
          room.set(d, room.get(d)! - take);
          offsetByDate.set(d, (offsetByDate.get(d) ?? 0) + take);
          offsets.push({ date: d, amount: take, source: "transfer" });
          left -= take;
        }
      }
      const expired = left > 0 && this.currentDay >= writeOffDate;
      clawbacks.push({
        entry: c,
        amount: -c.amount,
        offsets,
        outstanding: expired ? 0 : left,
        writeOffDate,
        writtenOff: expired ? left : 0,
      });
    }
    const taxable = new Map<string, number>();
    for (const d of dates) taxable.set(d, gross.get(d)! - (offsetByDate.get(d) ?? 0));
    const deducted = new Map<string, number>();
    for (const d of this.payoutDeductions)
      if (d.accountId === accountId && !d.cancelled) deducted.set(d.date, (deducted.get(d.date) ?? 0) + d.amount);
    // Bonus penjualan yang belum lewat masa pembatalan: masih dapat ditarik, sehingga belum aman dipakai.
    const riskFrom = Date.parse(`${this.currentDay}T00:00:00+07:00`) - PLAN.bonusSafetyDays * DAY_MS;
    const atRisk = new Map<string, number>();
    for (const e of this.entriesFor(accountId)) {
      if (e.status !== "payable" || !e.payoutDate || e.amount <= 0) continue;
      if (!SALE_DRIVEN_TYPES.includes(e.type) || e.accruedAt < riskFrom) continue;
      if (e.advance && e.advanceDate) atRisk.set(e.advanceDate, (atRisk.get(e.advanceDate) ?? 0) + e.advance);
      atRisk.set(e.payoutDate, (atRisk.get(e.payoutDate) ?? 0) + e.amount - (e.advance ?? 0));
    }
    // Transfer tidak pernah negatif: kekurangan dipindah ke Jumat berikutnya; sisanya menjadi kekurangan terbuka.
    let carry = 0;
    const lines = withholdBySchedule(taxable, acc.withoutNpwp).map((l) => {
      const g = gross.get(l.date)!;
      const clawback = offsetByDate.get(l.date) ?? 0;
      const ded = deducted.get(l.date) ?? 0;
      const carriedIn = carry;
      const raw = g - clawback - l.tax - ded - carriedIn;
      carry = raw < 0 ? -raw : 0;
      return { date: l.date, gross: g, clawback, taxable: l.gross, tax: l.tax, deducted: ded, carriedIn, net: Math.max(0, raw), atRisk: atRisk.get(l.date) ?? 0 };
    });
    return { lines, clawbacks, shortfall: carry };
  }

  /**
   * Jadwal transfer satu Mitra PLS per Jumat: bonus bruto, penarikan bonus, bruto kena pajak, PPh 21, potongan
   * Langganan, dan nilai yang ditransfer. Potongan Langganan diambil dari sisa setelah PPh (S&K Pasal 21 angka 7).
   */
  payoutSchedule(accountId: string): PayoutScheduleLine[] {
    return this.computeSchedule(accountId).lines;
  }

  /** Bonus yang belum ditransfer (Jumat setelah hari ini). Hanya entri berstatus payable; bonus tim yang belum ditetapkan tidak dihitung. */
  pendingPayouts(accountId: string): PayoutScheduleLine[] {
    return this.payoutSchedule(accountId).filter((r) => r.date > this.currentDay);
  }

  /**
   * Catat pembayaran hak lain kepada Mitra PLS (pembelian kembali Lisensi, pengembalian dana, atau pembayaran lain).
   * Piutang penarikan bonus yang masih ada dipotong lebih dulu; sisanya dibayarkan. Hak ini bukan bonus, sehingga
   * tidak dikenai PPh 21 bonus dan tidak masuk bukti potong.
   */
  recordOtherEntitlement(input: { id: string; accountId: string; kind: OtherEntitlementKind; amount: number; at: number; note?: string }): {
    offset: number;
    paid: number;
  } {
    this.advance(input.at);
    const acc = this.mustAccount(input.accountId);
    if (acc.role !== "mitra") throw new EngineError("Hak lain hanya dicatat untuk Mitra PLS");
    if (!Number.isInteger(input.amount) || input.amount <= 0) throw new EngineError("Nominal hak harus bilangan bulat positif");
    if (this.otherEntitlements.some((e) => e.id === input.id)) throw new EngineError("Nomor hak sudah dipakai");
    this.otherEntitlements.push({ ...input });
    return this.otherEntitlementStatus(input.id);
  }

  /** Berapa dari satu hak lain yang dipakai menutup piutang penarikan, dan berapa yang dibayarkan. */
  otherEntitlementStatus(id: string): { offset: number; paid: number } {
    const e = this.otherEntitlements.find((x) => x.id === id);
    if (!e) throw new EngineError("Hak tidak ditemukan");
    const offset = this.clawbackStatus(e.accountId)
      .flatMap((c) => c.offsets)
      .filter((o) => o.entitlementId === id)
      .reduce((a, o) => a + o.amount, 0);
    return { offset, paid: e.amount - offset };
  }

  /** Penarikan bonus satu akun: nominal, tempat dipotong, sisa piutang, dan penghapusan setelah 12 bulan. */
  clawbackStatus(accountId: string): ClawbackStatus[] {
    return this.computeSchedule(accountId).clawbacks;
  }

  /** Piutang penarikan bonus yang belum dapat dipotong dari transfer mana pun. */
  clawbackOutstanding(accountId: string): number {
    return this.clawbackStatus(accountId).reduce((a, c) => a + c.outstanding, 0);
  }

  /**
   * Rincian saldo bonus untuk bayar Langganan. `available` hanya memakai bagian yang aman per Jumat: transfer mendatang
   * setelah penarikan, PPh, dan potongan, dikurangi bonus yang penjualannya masih dapat dibatalkan, dikurangi piutang
   * penarikan dan kekurangan transfer minus.
   */
  bonusBalanceDetail(accountId: string): { pending: number; atRisk: number; outstanding: number; shortfall: number; available: number } {
    const { lines, clawbacks, shortfall } = this.computeSchedule(accountId);
    const future = lines.filter((r) => r.date > this.currentDay);
    const pending = future.reduce((a, r) => a + r.net, 0);
    const safe = future.reduce((a, r) => a + Math.max(0, r.net - r.atRisk), 0);
    const outstanding = clawbacks.reduce((a, c) => a + c.outstanding, 0);
    return { pending, atRisk: pending - safe, outstanding, shortfall, available: Math.max(0, safe - outstanding - shortfall) };
  }

  /** Saldo bonus yang aman dipakai membayar Langganan (lihat bonusBalanceDetail). */
  bonusBalance(accountId: string): number {
    return this.bonusBalanceDetail(accountId).available;
  }

  /**
   * Rincian pemotongan PPh 21 satu Mitra PLS untuk satu masa pajak (bulan kalender transfer), bahan bukti potong
   * BP21 yang diterbitkan resmi melalui Coretax DJP. Undefined bila tidak ada transfer pada masa itu.
   */
  buktiPotong(accountId: string, month: string): BuktiPotong | undefined {
    const acc = this.mustAccount(accountId);
    const lines = this.payoutSchedule(accountId)
      .filter((l) => l.date.startsWith(month))
      .map((l) => ({ date: l.date, gross: l.gross, clawback: l.clawback, taxable: l.taxable, dpp: dppOf(l.taxable), tax: l.tax }));
    if (!lines.length) return undefined;
    const sum = (f: (l: (typeof lines)[number]) => number) => lines.reduce((a, l) => a + f(l), 0);
    return {
      number: `BP21/${month.replace("-", "")}/${acc.code}`,
      month,
      accountId,
      name: acc.name,
      nik: acc.nik,
      withoutNpwp: !!acc.withoutNpwp,
      objectCode: PPH21.objectCode,
      lines,
      gross: sum((l) => l.gross),
      clawback: sum((l) => l.clawback),
      taxable: sum((l) => l.taxable),
      dpp: sum((l) => l.dpp),
      tax: sum((l) => l.tax),
      final: month < this.currentDay.slice(0, 7),
    };
  }

  /** Semua rincian pemotongan pada satu masa pajak (rekap Keuangan untuk e-Bupot). */
  buktiPotongMasa(month: string): BuktiPotong[] {
    const out: BuktiPotong[] = [];
    for (const [id] of this.entriesByAccount) {
      if (!this.accounts.has(id)) continue;
      const b = this.buktiPotong(id, month);
      if (b) out.push(b);
    }
    return out.sort((a, b) => b.tax - a.tax || a.accountId.localeCompare(b.accountId));
  }

  /**
   * Bayar Langganan dari bonus yang belum ditransfer (atas permintaan Mitra PLS sendiri).
   * Nominal dipotong dari transfer Jumat terdekat yang cukup, berurutan. Plan B atas Langganan ini tetap dihitung
   * seperti pembayaran biasa karena Langganan tetap dibeli dengan uang Mitra PLS.
   */
  paySubscriptionFromBonus(input: { saleId: string; accountId: string; at: number }): Sale {
    this.advance(input.at);
    const acc = this.mustAccount(input.accountId);
    if (acc.role !== "mitra") throw new EngineError("Bayar dari bonus hanya untuk Mitra PLS");
    const price = PLAN.subscription.price;
    if (this.bonusBalance(acc.id) < price)
      throw new EngineError("Saldo bonus yang belum ditransfer tidak cukup untuk membayar Langganan");
    const sale = this.paySubscription(input);
    sale.paidFrom = "bonus";
    let left = price;
    for (const r of this.pendingPayouts(acc.id)) {
      if (left <= 0) break;
      const take = Math.min(left, Math.max(0, r.net - r.atRisk));
      if (take <= 0) continue;
      this.payoutDeductions.push({ saleId: sale.id, accountId: acc.id, date: r.date, amount: take });
      left -= take;
    }
    if (left > 0) throw new EngineError("Alokasi potongan bonus gagal");
    return sale;
  }

  payoutRuns(): {
    date: string;
    total: number;
    count: number;
    byType: Record<BonusType, number>;
    /** Penarikan bonus (clawback) yang dipotong pada Jumat itu. */
    clawback: number;
    /** Kekurangan transfer minus Jumat sebelumnya yang dipindah ke Jumat ini. */
    carried: number;
    /** PPh 21 yang dipotong pada Jumat itu (atas bruto setelah penarikan). */
    tax: number;
    /** Potongan Langganan dari bonus pada Jumat itu. */
    deducted: number;
    /** Nilai yang ditransfer: total bonus dikurangi penarikan, PPh 21, dan potongan Langganan. */
    transfer: number;
  }[] {
    const runs = new Map<
      string,
      {
        date: string;
        total: number;
        count: number;
        byType: Record<BonusType, number>;
        clawback: number;
        carried: number;
        tax: number;
        deducted: number;
        transfer: number;
      }
    >();
    for (const e of this.ledger) {
      if (e.status !== "payable" || !e.payoutDate || e.amount === 0) continue;
      if (e.advance && e.advanceDate) {
        const a = runs.get(e.advanceDate) ?? { date: e.advanceDate, total: 0, count: 0, byType: emptyByType(), clawback: 0, carried: 0, tax: 0, deducted: 0, transfer: 0 };
        a.total += e.advance;
        a.count++;
        a.byType[e.type] += e.advance;
        runs.set(e.advanceDate, a);
      }
      const rest = e.amount - (e.advance ?? 0);
      const r = runs.get(e.payoutDate) ?? {
        date: e.payoutDate,
        total: 0,
        count: 0,
        byType: emptyByType(),
        clawback: 0,
        carried: 0,
        tax: 0,
        deducted: 0,
        transfer: 0,
      };
      r.total += rest;
      r.count++;
      r.byType[e.type] += rest;
      runs.set(e.payoutDate, r);
    }
    for (const d of this.payoutDeductions) {
      if (d.cancelled) continue;
      const r = runs.get(d.date);
      if (r) r.deducted += d.amount;
    }
    // Penarikan bonus dan PPh 21 dihitung per Mitra PLS per Jumat, lalu dijumlahkan.
    for (const [id] of this.entriesByAccount) {
      if (!this.accounts.has(id)) continue;
      for (const l of this.computeSchedule(id).lines) {
        const r = runs.get(l.date);
        if (!r) continue;
        r.clawback += l.clawback;
        r.tax += l.tax;
        r.carried += l.carriedIn;
        r.transfer += l.net;
      }
    }
    return [...runs.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  get poolCarryAmount(): number {
    return this.poolCarry;
  }

  get heldEntries(): readonly LedgerEntry[] {
    return this.held;
  }

  // ---------------------------------------------------------------------------
  // Internal: akun dan jaringan

  private createStructural(
    id: string,
    name: string,
    sponsorId: string | null,
    at: number,
  ): Account {
    const acc: Account = {
      id,
      code: id,
      name,
      nik: STRUCTURAL_NIK,
      role: "struktural",
      sponsorId,
      joinedAt: at,
      quizPassed: true,
      everActive: false,
      ranksAchieved: [],
      licenseActivatedAt: at,
    };
    this.accounts.set(acc.id, acc);
    return acc;
  }

  private addAccount(acc: Account): void {
    if (this.accounts.has(acc.id))
      throw new EngineError(`Akun ${acc.id} sudah ada`);
    this.accounts.set(acc.id, acc);
    this.nikIndex.set(acc.nik, acc.id);
  }

  private assertNikFree(nik: string): void {
    if (!/^\d{16}$/.test(nik)) throw new EngineError("NIK harus 16 digit");
    if (this.nikIndex.has(nik))
      throw new EngineError("Satu NIK hanya untuk satu akun");
  }

  private assertSellerCanSell(seller: Account): void {
    if (seller.role === "struktural") return;
    if (seller.role !== "mitra")
      throw new EngineError("Penjual harus Mitra PLS");
    if (seller.terminated)
      throw new EngineError("Keanggotaan penjual sudah berakhir");
    if (seller.frozenUntil !== undefined && this.currentDayEnd - 86_400_000 < seller.frozenUntil)
      throw new EngineError("Keanggotaan penjual sedang dibekukan (sanksi Kode Etik Pasal 20)");
    if (!seller.quizPassed)
      throw new EngineError(
        "Tautan rujukan penjual belum aktif (kuis Kode Etik belum lulus)",
      );
  }

  private attachNode(
    acc: Account,
    parentId: string | null,
    side: Side | null,
    at: number,
  ): BinaryNode {
    const parent = parentId ? this.nodes.get(parentId)! : null;
    const node: BinaryNode = {
      id: `N-${acc.id}`,
      accountId: acc.id,
      parentId,
      side,
      depth: parent ? parent.depth + 1 : 0,
      left: null,
      right: null,
      createdAt: at,
      cumLicenses: { L: 0, R: 0 },
      carry: { L: 0, R: 0 },
      todayIn: { L: 0, R: 0 },
      levelMask: { L: 0, R: 0 },
      levelPaidMask: 0,
      roPvTenths: { L: 0, R: 0 },
    };
    if (parent && side) {
      if (side === "L") parent.left = node.id;
      else parent.right = node.id;
    }
    this.nodes.set(node.id, node);
    acc.nodeId = node.id;
    return node;
  }

  /**
   * Node tempat volume Pelanggan dicatat: posisi penjual. Bila penjual belum memegang Lisensi,
   * dipakai posisi terdekat di garis Sponsor-nya (asumsi; dokumen tidak mengatur).
   */
  private volumeNodeFor(seller: Account): string | undefined {
    let cur: Account | undefined = seller;
    while (cur) {
      if (cur.nodeId) return cur.nodeId;
      cur = cur.sponsorId ? this.accounts.get(cur.sponsorId) : undefined;
    }
    return this.rootNodeId;
  }

  /** Penempatan posisi baru (asumsi kerja, lihat EngineOptions.placement). */
  private placeNode(acc: Account, at: number, preference?: Side): BinaryNode {
    const sponsor = this.mustAccount(acc.sponsorId!);
    const anchorId = this.volumeNodeFor(sponsor)!;
    const anchor = this.nodes.get(anchorId)!;
    let side: Side = preference ?? "L";
    if (!preference && this.options.placement === "weaker-leg") {
      const l = anchor.left ? 1 + anchor.cumLicenses.L : 0;
      const r = anchor.right ? 1 + anchor.cumLicenses.R : 0;
      side = r < l ? "R" : "L";
    }
    // Ujung terluar kaki yang dipilih.
    let parent = anchor;
    for (;;) {
      const childId = side === "L" ? parent.left : parent.right;
      if (!childId) break;
      parent = this.nodes.get(childId)!;
    }
    return this.attachNode(acc, parent.id, side, at);
  }

  /** Jalan ke atas sampai 10 level. Callback menerima ancestor, kaki, dan jarak. */
  private walkUp(
    nodeId: string,
    fn: (ancestor: BinaryNode, side: Side, distance: number) => void,
  ): void {
    let child = this.nodes.get(nodeId)!;
    for (let d = 1; d <= PLAN.maxLevels && child.parentId; d++) {
      const anc = this.nodes.get(child.parentId)!;
      fn(anc, child.side!, d);
      child = anc;
    }
  }

  /**
   * Catat 1 Lisensi pada node `nodeId` untuk upline dalam 10 level.
   * `mitraLicenseNode`: node ini adalah posisi Mitra PLS yang baru terisi Lisensi (memicu Bonus Level).
   */
  private addLicenseVolume(
    sale: Sale,
    nodeId: string,
    mitraLicenseNode: boolean,
  ): void {
    const at = sale.convertedAt ?? sale.at;
    this.walkUp(nodeId, (anc, side, d) => {
      if (mitraLicenseNode) this.markLevel(anc, side, d, at, sale.id);
      if (sale.countedBy!.has(anc.id)) return;
      sale.countedBy!.add(anc.id);
      anc.cumLicenses[side]++;
      anc.todayIn[side]++;
      this.touchedToday.add(anc.id);
      this.checkRanks(anc, at);
    });
  }

  /** Bonus Level (8.1, Lampiran B.1): sekali per kedalaman saat kedua kaki pertama kali berisi Lisensi Mitra PLS. */
  private markLevel(
    anc: BinaryNode,
    side: Side,
    depth: number,
    at: number,
    saleId: string,
  ): void {
    const bit = 1 << (depth - 1);
    anc.levelMask[side] |= bit;
    if (anc.levelMask.L & anc.levelMask.R & bit && !(anc.levelPaidMask & bit)) {
      anc.levelPaidMask |= bit;
      this.accrue(anc.accountId, "LEVEL", PLAN.levelBonus, at, {
        saleId,
        ref: depth,
      });
    }
  }

  private checkRanks(node: BinaryNode, at: number): void {
    const acc = this.accounts.get(node.accountId)!;
    if (acc.role !== "mitra") return;
    const reached = ranksForSmallLeg(
      Math.min(node.cumLicenses.L, node.cumLicenses.R),
    );
    for (const rank of reached) {
      if (!acc.ranksAchieved.some((r) => r.rank === rank))
        acc.ranksAchieved.push({ rank, at, claimed: false });
    }
  }

  private countPersonalSale(sellerId: string, at: number): void {
    const seller = this.accounts.get(sellerId)!;
    if (seller.role !== "mitra") return;
    const ms = this.month(wibMonth(at));
    const n = (ms.runningSales.get(sellerId) ?? 0) + 1;
    ms.runningSales.set(sellerId, n);
    if (n === this.options.activeMinPersonalSales) ms.becameActiveAt.set(sellerId, at);
  }

  // ---------------------------------------------------------------------------
  // Internal: buku besar

  private accrue(
    accountId: string,
    type: BonusType,
    gross: number,
    at: number,
    extra: {
      saleId?: string;
      ref?: number;
      deferred?: boolean;
      month?: string;
    } = {},
  ): LedgerEntry {
    const acc = this.accounts.get(accountId)!;
    const month = extra.month ?? wibMonth(at);
    const entry = this.pushEntry({
      accountId,
      nik: acc.nik,
      type,
      gross,
      amount: 0,
      status: acc.role === "struktural" ? "company" : "pending",
      month,
      accruedAt: at,
      saleId: extra.saleId,
      ref: extra.ref,
      note:
        acc.role === "struktural"
          ? "Akun struktural: tetap pendapatan Perusahaan"
          : undefined,
    });
    if (entry.status === "pending" && !extra.deferred) {
      const list = this.pendingByMonth.get(month) ?? [];
      list.push(entry);
      this.pendingByMonth.set(month, list);
    }
    return entry;
  }

  private pushEntry(e: Omit<LedgerEntry, "id">): LedgerEntry {
    const entry: LedgerEntry = { id: this.nextEntryId++, ...e };
    this.ledger.push(entry);
    const byAcc = this.entriesByAccount.get(entry.accountId) ?? [];
    byAcc.push(entry);
    this.entriesByAccount.set(entry.accountId, byAcc);
    if (entry.saleId) {
      const list = this.entriesBySale.get(entry.saleId) ?? [];
      list.push(entry);
      this.entriesBySale.set(entry.saleId, list);
    }
    if (entry.status === "company") {
      this.companyByMonth.set(entry.month, (this.companyByMonth.get(entry.month) ?? 0) + entry.gross);
    }
    if (entry.status === "clawback" && entry.amount < 0) {
      const list = this.clawbackByMonth.get(entry.month) ?? [];
      list.push(entry);
      this.clawbackByMonth.set(entry.month, list);
    }
    return entry;
  }


  private month(month: string): MonthState {
    let ms = this.months.get(month);
    if (!ms) {
      ms = {
        licenseSaleIds: [],
        subscriptionSaleIds: [],
        conversions: 0,
        newMitra: 0,
        coaching: new Set(),
        becameActiveAt: new Map(),
        runningSales: new Map(),
        subscribed: new Set(),
        roTouched: new Set(),
      };
      this.months.set(month, ms);
    }
    return ms;
  }

  private mustAccount(id: string): Account {
    const acc = this.accounts.get(id);
    if (!acc) throw new EngineError(`Akun ${id} tidak ditemukan`);
    return acc;
  }

  private mustSale(id: string): Sale {
    const s = this.sales.get(id);
    if (!s) throw new EngineError(`Penjualan ${id} tidak ditemukan`);
    return s;
  }

  // ---------------------------------------------------------------------------
  // Akhir hari: Bonus Pasangan dan Bonus Pembinaan

  private endOfDay(date: string): void {
    const at = Date.parse(`${date}T16:59:59Z`); // 23.59.59 WIB
    const carryOver: string[] = [];
    for (const nodeId of this.touchedToday) {
      const node = this.nodes.get(nodeId)!;
      const r = pairDay(
        node.carry.L,
        node.carry.R,
        node.todayIn.L,
        node.todayIn.R,
      );
      if (this.keepPairLog && (node.todayIn.L || node.todayIn.R)) {
        this.pairLog.push({
          accountId: node.accountId,
          date,
          inL: node.todayIn.L,
          inR: node.todayIn.R,
          balanceL: r.balanceL,
          balanceR: r.balanceR,
          pairs: r.pairs,
          carryL: r.carryL,
          carryR: r.carryR,
        });
      }
      node.carry = { L: r.carryL, R: r.carryR };
      if (r.carryL > 0 && r.carryR > 0) carryOver.push(nodeId);
      node.todayIn = { L: 0, R: 0 };
      if (r.pairs > 0) {
        const amount = r.pairs * PLAN.pairBonus;
        this.accrue(node.accountId, "PASANGAN", amount, at, { ref: r.pairs });
        this.accruePembinaan(node.accountId, amount, at);
      }
    }
    this.touchedToday.clear();
    // Sisa unit yang masih dapat dipasangkan (karena batas harian) diproses lagi besok (Lampiran B.2).
    for (const id of carryOver) this.touchedToday.add(id);
  }

  /** Bonus Pembinaan (8.1, Lampiran B.3): persentase Bonus Pasangan generasi sponsor 1..6. */
  private accruePembinaan(
    earnerId: string,
    pairAmount: number,
    at: number,
  ): void {
    let cur = this.accounts.get(earnerId)!;
    for (let gen = 1; gen <= PLAN.pembinaanRatesBp.length; gen++) {
      if (!cur.sponsorId) return;
      const sponsor = this.accounts.get(cur.sponsorId)!;
      const amount = applyBp(pairAmount, pembinaanRateBp(gen));
      if (sponsor.role === "struktural" || sponsor.nodeId) {
        this.accrue(sponsor.id, "PEMBINAAN", amount, at, { ref: gen });
      } else {
        // Mitra PLS tanpa Lisensi tidak memperoleh Bonus Pembinaan (Bab 5.4).
        const e = this.accrue(sponsor.id, "PEMBINAAN", amount, at, {
          ref: gen,
          deferred: true,
        });
        e.status = "ineligible";
        e.note = "Belum memegang Lisensi (Bab 5.4)";
      }
      cur = sponsor;
    }
  }

  /**
   * Kurangi bonus tim karena pembatalan: potong dulu entri sejenis yang belum dibayar (menunggu/ditahan);
   * bila sudah dibayar, buat entri penarikan negatif. Mengembalikan nominal yang ditarik dari yang sudah dibayar.
   */
  private reverseTeam(accountId: string, type: BonusType, amount: number, at: number, saleId: string): number {
    const acc = this.accounts.get(accountId)!;
    if (acc.role === "struktural" || amount <= 0) return 0;
    const list = this.entriesByAccount.get(accountId) ?? [];
    for (let k = list.length - 1; k >= 0; k--) {
      const e = list[k];
      if (e.type !== type || e.gross < amount || (e.status !== "pending" && e.status !== "held")) continue;
      e.gross -= amount;
      e.note = `${e.note ? e.note + "; " : ""}dikurangi ${amount} atas pembatalan ${saleId}`;
      if (e.gross === 0) e.status = "clawback";
      return 0;
    }
    this.pushEntry({
      accountId,
      nik: acc.nik,
      type,
      gross: -amount,
      amount: -amount,
      status: "clawback",
      month: wibMonth(at),
      accruedAt: at,
      saleId,
      note: `Penarikan ${type} atas pembatalan ${saleId}`,
    });
    return amount;
  }

  // ---------------------------------------------------------------------------
  // Tutup bulan

  private closeMonth(month: string): void {
    const ms = this.month(month);
    const closeAt = monthCloseAt(month);
    const closeFriday = payoutFriday(closeAt);
    const sales = this.personalSales(month);
    const active = new Set<string>();
    for (const [id, n] of sales) {
      if (n >= this.options.activeMinPersonalSales) {
        active.add(id);
        this.accounts.get(id)!.everActive = true;
      }
    }
    this.activeByMonth.set(month, active);
    const isActive = (id: string) => active.has(id);
    const pool: PoolSources = {
      forfeitedTeam: 0,
      royaltyUnassigned: 0,
      royaltyOverCap: 0,
      rankFundLeftover: 0,
      identityCapExcess: 0,
      berkahUnconfirmed: 0,
      carriedFromLastMonth: this.poolCarry,
    };
    let heldNoSubscription = 0;
    const settled: LedgerEntry[] = [];
    const settle = (e: LedgerEntry, amount: number, payoutDate: string) => {
      e.status = "payable";
      e.amount = amount;
      e.settledMonth = month;
      e.payoutDate = payoutDate;
      settled.push(e);
    };
    const hold = (e: LedgerEntry, note: string) => {
      e.status = "held";
      e.holdUntil = addMonths(month, PLAN.holdMonths);
      e.note = note;
      this.held.push(e);
    };

    // Pemeriksaan akun: tunda paling lama 30 hari sejak dibuka (Kode Etik Pasal 9 angka 2).
    const underReview = (sale: Sale) => {
      const r = sale.review;
      if (!r || r.dismissedAt || r.confirmedAt || r.expiredAt) return false;
      if (closeAt - r.openedAt > 30 * 86_400_000) {
        r.expiredAt = closeAt;
        return false;
      }
      return true;
    };
    const reviewHold = (e: LedgerEntry) => {
      e.status = "held";
      e.reviewHold = true;
      e.note = "Ditunda: pemeriksaan akun (Kode Etik Pasal 9, paling lama 30 hari)";
      this.reviewHeld.push(e);
    };
    const stillReview: LedgerEntry[] = [];
    for (const e of this.reviewHeld) {
      if (e.status !== "held") continue;
      const sale = this.sales.get(e.saleId!)!;
      if (underReview(sale)) {
        stillReview.push(e);
        continue;
      }
      e.reviewHold = false;
      settle(e, e.gross, closeFriday);
      e.note = sale.review?.expiredAt
        ? "Dibayar: batas tunda pemeriksaan 30 hari lewat tanpa keputusan"
        : "Dibayar setelah pemeriksaan selesai tanpa pelanggaran";
    }
    this.reviewHeld = stillReview;

    // 1. Bonus Layanan Berkah: cair bila dikonfirmasi dan lewat 30 hari; tanpa konfirmasi 60 hari -> Pool Aktif.
    const stillPending: LedgerEntry[] = [];
    for (const e of this.pendingBerkah) {
      const sale = this.sales.get(e.saleId!)!;
      const due = addDays(sale.at, PLAN.berkahMaturityDays);
      if (sale.orientationConfirmedAt !== undefined && due <= closeAt) {
        // Keputusan A4: Berkah selalu dibayar tanpa syarat Langganan penjual.
        if (underReview(sale)) reviewHold(e);
        else settle(e, e.gross, payoutFriday(Math.max(due, sale.orientationConfirmedAt)));
      } else if (
        sale.orientationConfirmedAt === undefined &&
        addDays(sale.at, PLAN.berkahConfirmDeadlineDays) < closeAt
      ) {
        e.status = "forfeited";
        e.settledMonth = month;
        e.note = "Pendampingan tidak dikonfirmasi dalam 60 hari";
        pool.berkahUnconfirmed += e.gross;
      } else {
        stillPending.push(e);
      }
    }
    this.pendingBerkah = stillPending;

    // 2. Bonus Sponsor dan bonus tim bulan ini.
    const teamClaims: LedgerEntry[] = [];
    for (const e of this.pendingByMonth.get(month) ?? []) {
      if (e.status !== "pending") continue;
      if (e.type === "SPONSOR") {
        // Keputusan A4: Bonus Sponsor selalu dibayar; syarat Langganan hanya untuk bonus jaringan.
        const sale = e.saleId ? this.sales.get(e.saleId) : undefined;
        if (sale && underReview(sale)) reviewHold(e);
        else settle(e, e.gross, payoutFriday(e.accruedAt));
      } else if (TEAM_TYPES.includes(e.type)) {
        const ok =
          isActive(e.accountId) &&
          this.subscriptionConditionMet(e.accountId, month);
        if (ok) teamClaims.push(e);
        else {
          if (isActive(e.accountId)) heldNoSubscription += e.gross;
          hold(
            e,
            isActive(e.accountId)
              ? "Langganan tidak aktif pada akhir bulan"
              : "Tidak aktif pada bulan bonus",
          );
        }
      }
    }
    this.pendingByMonth.delete(month);

    // 3. Bonus yang ditahan: dilepas bila syarat terpenuhi bulan ini, hangus pada akhir bulan ke-2.
    const stillHeld: LedgerEntry[] = [];
    for (const e of this.held) {
      if (e.status !== "held") continue;
      if (e.holdUntil === addMonths(month, PLAN.holdMonths)) {
        stillHeld.push(e); // baru ditahan pada tutup bulan ini
        continue;
      }
      const ok =
        e.type === "SPONSOR" || e.type === "BERKAH"
          ? this.subscriptionConditionMet(e.accountId, month)
          : isActive(e.accountId) &&
            this.subscriptionConditionMet(e.accountId, month);
      if (ok) {
        if (TEAM_TYPES.includes(e.type)) teamClaims.push(e);
        else settle(e, e.gross, closeFriday);
        e.note = `Dilepas dari masa tunggu pada ${month}`;
      } else if (monthIndex(month) >= monthIndex(e.holdUntil!)) {
        e.status = "forfeited";
        e.settledMonth = month;
        e.note = "Hangus setelah masa tunggu 2 bulan";
        pool.forfeitedTeam += e.gross;
      } else {
        stillHeld.push(e);
      }
    }
    this.held = stillHeld;

    // 4. Plafon Plan A dan anggaran bonus tim (Bab 12.2 butir 2).
    const licenseSales = ms.licenseSaleIds
      .map((id) => this.sales.get(id)!)
      .filter((s) => !s.cancelled);
    const licenseNet = licenseSales.length * PLAN.license.netPrice;
    const planACap = applyBp(licenseNet, this.options.planACapBp);
    const rankFund = applyBp(licenseNet, PLAN.rankFundBp);
    const royaltyFunds = PLAN.royaltyTiers.map((t) =>
      applyBp(licenseNet, t.shareBp),
    );
    const royaltyFund = royaltyFunds.reduce((a, b) => a + b, 0);
    const sumSettled = (types: BonusType[]) =>
      settled
        .filter((e) => types.includes(e.type))
        .reduce((a, e) => a + e.amount, 0);
    const directPaid = sumSettled(["SPONSOR", "BERKAH"]);
    const teamBudget = Math.max(
      0,
      planACap - directPaid - rankFund - royaltyFund,
    );

    const carryIn = this.teamCarry;
    this.teamCarry = [];
    const carryTotal = carryIn.reduce((a, e) => a + e.gross, 0);
    const currentTotal = teamClaims.reduce((a, e) => a + e.gross, 0);
    let teamFactor = 1;
    let budgetLeft = teamBudget;
    // Kekurangan bulan lalu dibayar lebih dulu.
    const carryFactor =
      carryTotal > 0 ? Math.min(1, budgetLeft / carryTotal) : 1;
    for (const e of carryIn) {
      const pay = Math.floor(e.gross * carryFactor);
      settle(e, pay, closeFriday);
      budgetLeft -= pay;
      if (pay < e.gross)
        this.teamCarry.push(this.carryEntry(e, e.gross - pay, month));
    }
    if (currentTotal > budgetLeft)
      teamFactor =
        currentTotal > 0 ? Math.max(0, budgetLeft) / currentTotal : 1;
    for (const e of teamClaims) {
      const pay = teamFactor >= 1 ? e.gross : Math.floor(e.gross * teamFactor);
      const becameActive = ms.becameActiveAt.get(e.accountId) ?? e.accruedAt;
      const weekly = payoutFriday(Math.max(e.accruedAt, becameActive));
      settle(e, pay, closeFriday);
      if (e.month === month) {
        // Keputusan A10: uang muka mingguan, sisanya setelah faktor plafon diketahui.
        e.advance = Math.min(applyBp(e.gross, PLAN.teamWeeklyAdvanceBp), e.gross);
        e.advanceDate = weekly;
        if (pay < e.advance) {
          e.note = `Uang muka melebihi hak setelah faktor plafon; selisih ${e.advance - pay} dipotong dari pembayaran berikutnya`;
        }
      }
      if (pay < e.gross) {
        e.note = `Faktor plafon ${(teamFactor * 100).toFixed(2)}%`;
        this.teamCarry.push(this.carryEntry(e, e.gross - pay, month));
      }
    }
    const teamCarryNext = this.teamCarry.reduce((a, e) => a + e.gross, 0);

    // 5. Bonus Prestasi Peringkat: klaim pada bulan aktif pertama setelah tercapai, antrean menurut urutan.
    const newClaims: RankClaim[] = [];
    for (const acc of this.accounts.values()) {
      if (acc.role !== "mitra" || !isActive(acc.id)) continue;
      for (const r of acc.ranksAchieved) {
        if (r.claimed || r.at >= closeAt) continue;
        r.claimed = true;
        newClaims.push({
          accountId: acc.id,
          rank: r.rank,
          amount: rankReward(r.rank),
          claimMonth: month,
          claimedAt: r.at,
        });
      }
    }
    newClaims.sort((a, b) => a.claimedAt - b.claimedAt);
    this.rankQueue.push(...newClaims);
    let rankLeft = rankFund;
    let rankPaidFromFund = 0;
    let rankPaidFromReserve = 0;
    const queue: RankClaim[] = [];
    let blocked = false;
    for (const c of this.rankQueue) {
      const waited = monthIndex(month) - monthIndex(c.claimMonth);
      if (!blocked && c.amount <= rankLeft) {
        rankLeft -= c.amount;
        rankPaidFromFund += c.amount;
        this.payRank(c, month, closeFriday, false, settled);
      } else if (waited >= PLAN.rankClaimMaxWaitMonths) {
        rankPaidFromReserve += c.amount;
        this.payRank(c, month, closeFriday, true, settled);
      } else {
        blocked = true; // urutan klaim dipertahankan
        queue.push(c);
      }
    }
    this.rankQueue.length = 0;
    this.rankQueue.push(...queue);
    pool.rankFundLeftover = rankLeft;

    // 6. Royalti Plan A.
    const royaltyHolders = (smallLeg: number) =>
      [...this.accounts.values()]
        .filter(
          (a) =>
            a.role === "mitra" &&
            a.nodeId &&
            isActive(a.id) &&
            this.smallLeg(a.id) >= smallLeg,
        )
        .map((a) => a.id);
    const royalty = allocateEqualWithCap(
      PLAN.royaltyTiers.map((t, i) => ({
        amount: royaltyFunds[i],
        holders: royaltyHolders(t.smallLeg),
      })),
      PLAN.royaltyPersonalMonthlyCap,
    );
    pool.royaltyUnassigned = royalty.unassigned;
    pool.royaltyOverCap = royalty.overCap;
    for (const [id, amt] of royalty.allocation) {
      settle(
        this.accrue(id, "ROYALTI", amt, closeAt - 1, { deferred: true, month }),
        amt,
        closeFriday,
      );
    }

    // 7. Batas gabungan per identitas untuk Plan A (sebelum Pool Aktif). Kelebihan -> Pool Aktif.
    pool.identityCapExcess = this.applyIdentityCap(
      settled,
      PLAN_A_TYPES,
      month,
      new Map(),
    );

    // 8. Pool Aktif, tetap di dalam plafon Plan A.
    const planABeforePool = settled
      .filter(
        (e) =>
          PLAN_A_TYPES.includes(e.type) &&
          !(e.type === "PRESTASI" && e.note?.includes("cadangan")),
      )
      .reduce((a, e) => a + e.amount, 0);
    const poolTotal =
      pool.forfeitedTeam +
      pool.royaltyUnassigned +
      pool.royaltyOverCap +
      pool.rankFundLeftover +
      pool.identityCapExcess +
      pool.berkahUnconfirmed +
      pool.carriedFromLastMonth;
    const poolRoom = Math.max(0, planACap - planABeforePool);
    const poolAvailable = Math.min(poolTotal, poolRoom);
    const activeSales = new Map([...sales].filter(([id]) => active.has(id)));
    const identityTotals = this.identityTotals(settled);
    const dist = distributePool(poolAvailable, activeSales);
    let poolDistributed = 0;
    for (const [id, share] of dist.shares) {
      const acc = this.accounts.get(id)!;
      const room = PLAN.identityMonthlyCap - (identityTotals.get(acc.nik) ?? 0);
      const pay = Math.max(0, Math.min(share, room));
      if (pay <= 0) continue;
      identityTotals.set(acc.nik, (identityTotals.get(acc.nik) ?? 0) + pay);
      poolDistributed += pay;
      const e = this.accrue(id, "POOL_AKTIF", pay, closeAt - 1, {
        deferred: true,
        month,
        ref: sales.get(id),
      });
      settle(e, pay, closeFriday);
    }
    this.poolCarry = poolTotal - poolDistributed;

    // 9. Plan B.
    const subSales = ms.subscriptionSaleIds
      .map((id) => this.sales.get(id)!)
      .filter((s) => !s.cancelled);
    const subscriptionNet = subSales.length * PLAN.subscription.netPrice;
    const planBCap = applyBp(subscriptionNet, this.options.planBCapBp);
    const planBEntries: LedgerEntry[] = [];
    const eligibleB = new Map<string, boolean>();
    const isEligibleB = (id: string) => {
      if (!eligibleB.has(id)) eligibleB.set(id, this.planBEligible(id, month));
      return eligibleB.get(id)!;
    };
    let companyStructural = 0;
    for (const s of subSales) {
      const recipient = this.accounts.get(s.sellerId)!;
      const e = this.accrue(
        recipient.id,
        "KOMISI_LANGGANAN",
        PLAN.subscriptionCommission,
        s.at,
        {
          deferred: true,
          month,
          saleId: s.id,
        },
      );
      if (e.status === "company") continue;
      if (isEligibleB(recipient.id)) planBEntries.push(e);
      else this.markIneligible(e, month, "Syarat Plan B belum terpenuhi");
    }
    for (const nodeId of ms.roTouched) {
      const node = this.nodes.get(nodeId)!;
      const amt = roPairAmount(node.roPvTenths.L, node.roPvTenths.R);
      node.roPvTenths = { L: 0, R: 0 }; // tanpa akumulasi antarbulan
      if (amt <= 0) continue;
      const e = this.accrue(node.accountId, "PASANGAN_RO", amt, closeAt - 1, {
        deferred: true,
        month,
      });
      if (e.status === "company") continue;
      if (isEligibleB(node.accountId)) planBEntries.push(e);
      else this.markIneligible(e, month, "Syarat Plan B belum terpenuhi");
    }
    const roFunds = PLAN.roRoyaltyTiers.map((t) =>
      applyBp(subscriptionNet, t.shareBp),
    );
    const roHolders = (smallLeg: number) =>
      [...this.accounts.values()]
        .filter(
          (a) =>
            a.role === "mitra" &&
            a.nodeId &&
            this.smallLeg(a.id) >= smallLeg &&
            isEligibleB(a.id),
        )
        .map((a) => a.id);
    const roRoyalty = allocateEqualWithCap(
      PLAN.roRoyaltyTiers.map((t, i) => ({
        amount: roFunds[i],
        holders: roHolders(t.smallLeg),
      })),
      PLAN.roRoyaltyPersonalMonthlyCap,
    );
    for (const [id, amt] of roRoyalty.allocation) {
      planBEntries.push(
        this.accrue(id, "ROYALTI_RO", amt, closeAt - 1, {
          deferred: true,
          month,
        }),
      );
    }
    const planBClaims = planBEntries.reduce((a, e) => a + e.gross, 0);
    const planBFactor = planBClaims > planBCap ? planBCap / planBClaims : 1;
    for (const e of planBEntries) {
      const acc = this.accounts.get(e.accountId)!;
      let pay = planBFactor >= 1 ? e.gross : Math.floor(e.gross * planBFactor);
      const room = PLAN.identityMonthlyCap - (identityTotals.get(acc.nik) ?? 0);
      if (pay > room) pay = Math.max(0, room);
      identityTotals.set(acc.nik, (identityTotals.get(acc.nik) ?? 0) + pay);
      settle(e, pay, closeFriday);
      if (pay < e.gross)
        e.note = `Faktor Plan B ${(planBFactor * 100).toFixed(2)}% / batas per identitas`;
    }

    // 10. Laporan bulan.
    const paidByType = emptyByType();
    for (const e of settled) paidByType[e.type] += e.amount;
    for (const e of this.clawbackByMonth.get(month) ?? []) paidByType[e.type] += e.amount;
    companyStructural += this.companyByMonth.get(month) ?? 0;
    const planAPaid = PLAN_A_TYPES.reduce((a, t) => a + paidByType[t], 0);
    const planBPaid = PLAN_B_TYPES.reduce((a, t) => a + paidByType[t], 0);
    const totalMitra = [...this.accounts.values()].filter(
      (a) => a.role === "mitra" && (a.mitraSince ?? 0) < closeAt,
    ).length;
    this.reports.push({
      month,
      licensesSold: licenseSales.length,
      licensesToCustomers: licenseSales.filter((s) => s.toCustomer).length,
      conversions: ms.conversions,
      subscriptionsPaid: subSales.length,
      licenseNet,
      subscriptionNet,
      newMitra: ms.newMitra,
      activeMitra: active.size,
      totalMitra,
      paidByType,
      planAPaid,
      planBPaid,
      planAPct: licenseNet > 0 ? planAPaid / licenseNet : 0,
      planBPct: subscriptionNet > 0 ? planBPaid / subscriptionNet : 0,
      planACap,
      planBCap,
      teamBudget,
      teamClaims: carryTotal + currentTotal,
      teamFactor,
      planBFactor,
      planACapTriggered: teamFactor < 1,
      poolClampedByCap: poolTotal > poolRoom,
      planBCapTriggered: planBFactor < 1,
      teamCarryNext,
      pool: {
        ...pool,
        total: poolTotal,
        distributed: poolDistributed,
        perSale: dist.perSale,
        carryNext: this.poolCarry,
      },
      rankFund,
      rankPaidFromFund,
      rankPaidFromReserve,
      rankQueueOutstanding: this.rankQueue.reduce((a, c) => a + c.amount, 0),
      royaltyFund,
      roRoyaltyFund: roFunds.reduce((a, b) => a + b, 0),
      heldAmount: this.held.reduce((a, e) => a + e.gross, 0),
      forfeitedAmount: pool.forfeitedTeam,
      companyStructural,
      heldNoSubscription,
    });
  }

  private carryEntry(
    source: LedgerEntry,
    remainder: number,
    month: string,
  ): LedgerEntry {
    return this.pushEntry({
      accountId: source.accountId,
      nik: source.nik,
      type: source.type,
      gross: remainder,
      amount: 0,
      status: "pending",
      month: addMonths(month, 1),
      accruedAt: monthCloseAt(month),
      ref: source.ref,
      note: `Sisa faktor plafon dari entri #${source.id}`,
    });
  }

  private payRank(
    c: RankClaim,
    month: string,
    payoutDate: string,
    reserve: boolean,
    settled: LedgerEntry[],
  ): void {
    c.paidMonth = month;
    c.paidFromReserve = reserve;
    this.rankPaid.push(c);
    const e = this.accrue(
      c.accountId,
      "PRESTASI",
      c.amount,
      monthCloseAt(month) - 1,
      { deferred: true, month },
    );
    e.status = "payable";
    e.amount = c.amount;
    e.settledMonth = month;
    e.payoutDate = payoutDate;
    e.note = `${c.rank}${reserve ? " (dilunasi dana cadangan setelah 6 bulan)" : ""}`;
    settled.push(e);
  }

  private markIneligible(e: LedgerEntry, month: string, note: string): void {
    e.status = "ineligible";
    e.settledMonth = month;
    e.note = note;
  }

  private identityTotals(settled: LedgerEntry[]): Map<string, number> {
    const totals = new Map<string, number>();
    for (const e of settled)
      totals.set(e.nik, (totals.get(e.nik) ?? 0) + e.amount);
    return totals;
  }

  /** Terapkan batas Rp1 miliar per identitas per bulan. Mengembalikan kelebihan yang dipotong. */
  private applyIdentityCap(
    settled: LedgerEntry[],
    types: BonusType[],
    _month: string,
    base: Map<string, number>,
  ): number {
    const byNik = new Map<string, LedgerEntry[]>();
    for (const e of settled) {
      if (!types.includes(e.type)) continue;
      const list = byNik.get(e.nik) ?? [];
      list.push(e);
      byNik.set(e.nik, list);
    }
    let excess = 0;
    for (const [nik, list] of byNik) {
      const total =
        list.reduce((a, e) => a + e.amount, 0) + (base.get(nik) ?? 0);
      if (total <= PLAN.identityMonthlyCap) continue;
      const factor = PLAN.identityMonthlyCap / total;
      for (const e of list) {
        const pay = Math.floor(e.amount * factor);
        excess += e.amount - pay;
        e.amount = pay;
        e.note = `Batas Rp1 miliar per identitas (faktor ${(factor * 100).toFixed(2)}%)`;
      }
    }
    return excess;
  }
}
