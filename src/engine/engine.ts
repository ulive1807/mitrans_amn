import {
  DEFAULT_OPTIONS,
  PLAN,
  type EngineOptions,
  type RankName,

} from "./plan";
import {
  allocateEqualWithCap,
  allocateWeightedWithCap,
  capPerAccount,
  applyBp,
  distributePool,
  pairDay,
  pembinaanRateBp,
  maintainsRank,
  qualifiedRank,
  rankIndex,
  rankReward,
  type RankInput,
  roPairAmount,
} from "./calc";
import {
  addDays,
  addMonths,
  addWorkdays,
  atWib,
  monthCloseAt,
  monthIndex,
  monthNumberSince,
  nextDate,
  payoutFriday,
  wibDate,
  wibMonth,
} from "./time";
import {
  DIRECT_TYPES,
  PLAN_A_TYPES,
  PROGRAM90_TYPES,
  PLAN_B_TYPES,
  TEAM_TYPES,
  type Account,
  type BinaryNode,
  type BonusType,
  type LedgerEntry,
  type MonthReport,
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
    FAST_START: 0,
    PENDAMPING: 0,
    PASANGAN: 0,
    PEMBINAAN: 0,
    PRESTASI: 0,
    LEADERSHIP: 0,
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
  private pendingBerkah: LedgerEntry[] = [];
  /** Kekurangan bayar bonus tim karena faktor plafon; dibayar lebih dulu bulan berikutnya. */
  private teamCarry: LedgerEntry[] = [];
  private poolCarry = 0;
  private touchedToday = new Set<string>();
  private subscriptionsPaid = new Map<string, Set<string>>();
  private customersWithPaidSubscription = new Set<string>();
  private licenseSalesByBuyer = new Map<string, string[]>();
  private entriesBySale = new Map<string, LedgerEntry[]>();
  private activeByMonth = new Map<string, Set<string>>();
  private companyByMonth = new Map<string, number>();
  private clawbackByMonth = new Map<string, LedgerEntry[]>();
  /** Program 90 hari: penjualan pribadi dan tim yang dihitung dalam jendela 90 hari tiap akun. */
  private program90Sales = new Map<string, { personal: Set<string>; team: Set<string> }>();
  /** Penjual yang Mitra binaannya sudah memberi Bonus Pendamping kepada Sponsor-nya -> saleId pemicu. */
  private pendampingBySeller = new Map<string, string>();
  /** Masukan dan peringkat bayar per bulan yang sudah ditutup (spesifikasi 6). */
  private rankInputsByMonth = new Map<string, Map<string, RankInput>>();
  private paidAsByMonth = new Map<string, Map<string, RankName>>();
  /** Paket Family: id paket -> akun pemegang kursi. */
  private bundleSeats = new Map<string, Set<string>>();
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
    /** Internal: kursi paket Family. */
    family?: { bundleId: string; net: number };
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
      product: input.family ? "family" : "license",
      net: input.family?.net ?? PLAN.license.netPrice,
      bundleId: input.family?.bundleId,
    };
    this.sales.set(sale.id, sale);
    const bySale = this.licenseSalesByBuyer.get(buyer.id) ?? [];
    // Program 90 hari hanya menghitung Lisensi pertama setiap pembeli (bukan pembelian ulang).
    const firstLicenseOfBuyer = bySale.every((id) => this.sales.get(id)!.cancelled);
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

    const program90 =
      firstLicenseOfBuyer && seller.role === "mitra" && this.inProgram90(seller.id, input.at);
    if (program90) {
      this.accrue(seller.id, "FAST_START", PLAN.fastStartBonus, input.at, { saleId: sale.id });
      if (!this.pendampingBySeller.has(seller.id) && seller.sponsorId) {
        this.pendampingBySeller.set(seller.id, sale.id);
        this.accrue(seller.sponsorId, "PENDAMPING", PLAN.pendampingBonus, input.at, {
          saleId: sale.id,
        });
      }
    }

    if (!buyer.licenseActivatedAt) {
      buyer.licenseActivatedAt = input.at;
      buyer.accessMonths = input.family ? PLAN.family.accessMonths : PLAN.license.accessMonths;
    }
    if (buyer.program90StartAt === undefined) buyer.program90StartAt = input.at;

    if (buyer.role === "mitra") {
      if (!buyer.nodeId) {
        const node = this.placeNode(buyer, input.at, input.legPreference);
        buyer.nodeId = node.id;
      }
      sale.volumeNodeId = buyer.nodeId;
      this.addLicenseVolume(sale, buyer.nodeId);
    } else {
      const nodeId = this.volumeNodeFor(seller);
      sale.volumeNodeId = nodeId;
      if (nodeId) this.addLicenseVolume(sale, nodeId);
    }
    if (firstLicenseOfBuyer && seller.role === "mitra") this.recordProgram90(sale, seller);
    return sale;
  }

  /**
   * Paket Family (keputusan Coach 29 Oktober 2026): 1 pembayaran untuk 1–3 kursi dewasa. Setiap kursi
   * menjadi Lisensi atas nama pemegangnya sendiri (Mitra atau Pelanggan), dijual oleh Sponsor yang
   * sama, dengan akses 12 bulan. Bonus dihitung per kursi seperti Lisensi Atlas.
   */
  purchaseFamily(input: { saleId: string; seatIds: string[]; at: number }): Sale[] {
    const seats = input.seatIds;
    if (seats.length < 1 || seats.length > PLAN.family.seats)
      throw new EngineError(`Family berisi 1–${PLAN.family.seats} kursi`);
    if (new Set(seats).size !== seats.length) throw new EngineError("Kursi Family harus orang berbeda");
    const sponsors = new Set(seats.map((id) => this.mustAccount(id).sponsorId));
    if (sponsors.size !== 1) throw new EngineError("Semua kursi Family harus dari tautan Sponsor yang sama");
    if (this.sales.has(`${input.saleId}-1`)) throw new EngineError(`Penjualan ${input.saleId} sudah ada`);
    this.bundleSeats.set(input.saleId, new Set(seats));
    const base = Math.floor(PLAN.family.netPrice / PLAN.family.seats);
    const nets = Array.from({ length: PLAN.family.seats }, (_, i) =>
      i === 0 ? PLAN.family.netPrice - base * (PLAN.family.seats - 1) : base,
    );
    return seats.map((buyerId, i) =>
      this.purchaseLicense({
        saleId: `${input.saleId}-${i + 1}`,
        buyerId,
        at: input.at,
        family: { bundleId: input.saleId, net: nets[i] },
      }),
    );
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
    this.addLicenseVolume(sale, node.id);
    const ms = this.month(wibMonth(input.at));
    ms.conversions++;
    ms.newMitra++;
    return acc;
  }

  /** Pembayaran Langganan bulanan (mulai bulan ke-4). */
  paySubscription(input: {
    saleId: string;
    accountId: string;
    forMonth: string;
    at: number;
  }): Sale {
    this.advance(input.at);
    const acc = this.mustAccount(input.accountId);
    if (!acc.licenseActivatedAt)
      throw new EngineError("Langganan tanpa Lisensi belum tersedia");
    const paid = this.subscriptionsPaid.get(acc.id) ?? new Set<string>();
    if (paid.has(input.forMonth))
      throw new EngineError("Langganan bulan itu sudah dibayar");
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
      forMonth: input.forMonth,
      firstPaidSubscription: firstPaid,
    };
    this.sales.set(sale.id, sale);
    paid.add(input.forMonth);
    this.subscriptionsPaid.set(acc.id, paid);
    const ms = this.month(month);
    ms.subscriptionSaleIds.push(sale.id);
    this.month(input.forMonth).subscribed.add(acc.id);
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
        anc.monthNet[side] += PLAN.subscription.netPrice;
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
    let clawedBack = 0;
    for (const e of [...(this.entriesBySale.get(saleId) ?? [])]) {
      if (e.gross <= 0) continue;
      clawedBack += this.reverseEntry(e, at, saleId);
    }
    this.pendingBerkah = this.pendingBerkah.filter((e) => e.saleId !== saleId);
    for (const c of this.program90Sales.values()) {
      c.personal.delete(saleId);
      c.team.delete(saleId);
    }
    for (const [sellerId, sid] of this.pendampingBySeller)
      if (sid === saleId) this.pendampingBySeller.delete(sellerId);
    if (sale.kind === "license") {
      const buyer = this.accounts.get(sale.buyerId)!;
      const stillHolds = (this.licenseSalesByBuyer.get(buyer.id) ?? []).some(
        (id) => !this.sales.get(id)!.cancelled,
      );
      if (!stillHolds) buyer.licenseActivatedAt = undefined;
    }
    let needsReview = false;
    if (sale.kind === "license" && sale.volumeNodeId && sale.countedBy) {
      this.walkUp(sale.volumeNodeId, (anc, side) => {
        if (!sale.countedBy!.has(anc.id)) return;
        anc.cumLicenses[side] = Math.max(0, anc.cumLicenses[side] - 1);
        if (sale.month === wibMonth(at))
          anc.monthNet[side] = Math.max(0, anc.monthNet[side] - (sale.net ?? PLAN.license.netPrice));
        if (anc.todayIn[side] > 0) anc.todayIn[side]--;
        else if (anc.carry[side] > 0) anc.carry[side]--;
        else needsReview = true; // unit sudah dipasangkan
      });
    }
    return { clawedBack, needsReview };
  }

  /**
   * Tarik satu entri karena pembatalan. Belum dibayar (tertunda, ditahan, atau Jumat pembayarannya
   * belum tiba): entri dibatalkan. Sudah dibayar: entri negatif. Mengembalikan nominal yang ditarik.
   */
  private reverseEntry(e: LedgerEntry, at: number, saleId: string): number {
    if (e.status === "pending" || e.status === "held") {
      e.status = "clawback";
      e.amount = 0;
      e.note = "Dibatalkan sebelum dibayar";
      return 0;
    }
    if (e.status !== "payable" || e.amount <= 0 || e.reversedBy !== undefined) return 0;
    if (e.payoutDate && e.payoutDate > wibDate(at)) {
      e.status = "clawback";
      e.amount = 0;
      e.note = `Dibatalkan sebelum Jumat pembayaran (${saleId})`;
      return 0;
    }
    const neg = this.pushEntry({
      accountId: e.accountId,
      nik: e.nik,
      type: e.type,
      gross: -e.amount,
      amount: -e.amount,
      status: "clawback",
      month: wibMonth(at),
      accruedAt: at,
      saleId,
      note: `Penarikan ${e.type} atas pembatalan ${saleId}`,
    });
    e.reversedBy = neg.id;
    return e.amount;
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
    this.advance(monthCloseAt(month));
  }

  // ---------------------------------------------------------------------------
  // Pertanyaan untuk kantor maya dan admin

  isActive(accountId: string, month: string): boolean {
    const closed = this.activeByMonth.get(month);
    if (closed) return closed.has(accountId);
    return (
      (this.personalSales(month).get(accountId) ?? 0) >=
      this.activeThreshold(accountId, month)
    );
  }

  /** Ambang aktif (spesifikasi 5.3): 1 penjualan bila bulan itu menyentuh 90 hari pertama, selain itu 2. */
  activeThreshold(accountId: string, month: string): number {
    const end = this.program90End(accountId);
    return end !== undefined && atWib(`${month}-01`, 0) < end
      ? PLAN.activeMinPersonalSales90
      : PLAN.activeMinPersonalSales;
  }

  /** Akhir jendela 90 hari (eksklusif) sejak aktivasi Lisensi pertama; undefined bila belum memegang Lisensi. */
  program90End(accountId: string): number | undefined {
    const acc = this.mustAccount(accountId);
    if (acc.role !== "mitra" || acc.program90StartAt === undefined) return undefined;
    return addDays(acc.program90StartAt, PLAN.program90Days);
  }

  /** Dalam jendela 90 hari dan saat ini memegang Lisensi. */
  inProgram90(accountId: string, t: number): boolean {
    const end = this.program90End(accountId);
    const acc = this.mustAccount(accountId);
    if (end === undefined || acc.licenseActivatedAt === undefined) return false;
    return t >= acc.program90StartAt! && t < end;
  }

  /** Kemajuan program 90 hari: Lisensi pribadi dan Lisensi tim (Sponsor-keturunan) dalam jendela 90 hari. */
  program90Progress(accountId: string): {
    personal: number;
    team: number;
    endsAt?: number;
  } {
    const c = this.program90Sales.get(accountId);
    return {
      personal: c?.personal.size ?? 0,
      team: c?.team.size ?? 0,
      endsAt: this.program90End(accountId),
    };
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
      if (s.cancelled) continue;
      const seller = this.accounts.get(s.sellerId)!;
      if (seller.role !== "mitra" || s.buyerId === s.sellerId) continue;
      bump(s.sellerId);
    }
    for (const id of ms.subscriptionSaleIds) {
      const s = this.sales.get(id)!;
      if (s.cancelled || !s.firstPaidSubscription) continue;
      if (this.accounts.get(s.sellerId)!.role !== "mitra") continue;
      bump(s.sellerId);
    }
    return result;
  }

  hasPaidSubscription(accountId: string, month: string): boolean {
    return this.subscriptionsPaid.get(accountId)?.has(month) ?? false;
  }

  /** Bulan ke berapa sejak aktivasi Lisensi; undefined bila belum memegang Lisensi. */
  licenseMonthNumber(accountId: string, month: string): number | undefined {
    const acc = this.mustAccount(accountId);
    if (!acc.licenseActivatedAt) return undefined;
    return monthNumberSince(wibMonth(acc.licenseActivatedAt), month);
  }

  /** Syarat Langganan aktif mulai bulan ke-4 sejak aktivasi Lisensi (Bab 9.2). */
  subscriptionConditionMet(accountId: string, month: string): boolean {
    const n = this.licenseMonthNumber(accountId, month);
    if (n === undefined) return true;
    const acc = this.mustAccount(accountId);
    if (n <= (acc.accessMonths ?? PLAN.license.accessMonths)) return true;
    return this.hasPaidSubscription(accountId, month);
  }

  accessActive(accountId: string, month: string): boolean {
    const n = this.licenseMonthNumber(accountId, month);
    if (n === undefined) return false;
    if (this.hasPaidSubscription(accountId, month)) return true;
    return (
      !this.options.planBRequiresPaidSubscription &&
      n <= (this.mustAccount(accountId).accessMonths ?? PLAN.license.accessMonths)
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
    return this.ledger.filter((e) => e.accountId === accountId);
  }

  report(month: string): MonthReport | undefined {
    return this.reports.find((r) => r.month === month);
  }

  /** Daftar transfer per Jumat (Bab 11.1). */
  payoutRuns(): {
    date: string;
    total: number;
    count: number;
    byType: Record<BonusType, number>;
  }[] {
    const runs = new Map<
      string,
      {
        date: string;
        total: number;
        count: number;
        byType: Record<BonusType, number>;
      }
    >();
    for (const e of this.ledger) {
      if (e.status !== "payable" || !e.payoutDate || e.amount === 0) continue;
      const r = runs.get(e.payoutDate) ?? {
        date: e.payoutDate,
        total: 0,
        count: 0,
        byType: emptyByType(),
      };
      r.total += e.amount;
      r.count++;
      r.byType[e.type] += e.amount;
      runs.set(e.payoutDate, r);
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
      monthNet: { L: 0, R: 0 },
      carry: { L: 0, R: 0 },
      todayIn: { L: 0, R: 0 },
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

  /** Catat 1 Lisensi pada node `nodeId` untuk upline dalam 10 level. */
  private addLicenseVolume(sale: Sale, nodeId: string): void {
    const coSeats = sale.bundleId ? this.bundleSeats.get(sale.bundleId) : undefined;
    this.walkUp(nodeId, (anc, side) => {
      // Kursi Family tidak menjadi volume bagi kursi lain dalam paket yang sama (bukan pembelian sendiri).
      if (coSeats?.has(anc.accountId)) return;
      if (sale.countedBy!.has(anc.id)) return;
      sale.countedBy!.add(anc.id);
      anc.cumLicenses[side]++;
      anc.monthNet[side] += sale.net ?? PLAN.license.netPrice;
      anc.todayIn[side]++;
      this.touchedToday.add(anc.id);
    });
  }

  /** Catat Lisensi untuk kemajuan program 90 hari penjual dan Sponsor-sponsornya. */
  private recordProgram90(sale: Sale, seller: Account): void {
    const bucket = (id: string) => {
      let c = this.program90Sales.get(id);
      if (!c) {
        c = { personal: new Set(), team: new Set() };
        this.program90Sales.set(id, c);
      }
      return c;
    };
    if (this.inProgram90(seller.id, sale.at)) bucket(seller.id).personal.add(sale.id);
    let cur = seller.sponsorId ? this.accounts.get(seller.sponsorId) : undefined;
    while (cur && cur.role === "mitra") {
      if (this.inProgram90(cur.id, sale.at)) bucket(cur.id).team.add(sale.id);
      cur = cur.sponsorId ? this.accounts.get(cur.sponsorId) : undefined;
    }
  }

  private countPersonalSale(sellerId: string, at: number): void {
    const seller = this.accounts.get(sellerId)!;
    if (seller.role !== "mitra") return;
    const ms = this.month(wibMonth(at));
    const n = (ms.runningSales.get(sellerId) ?? 0) + 1;
    ms.runningSales.set(sellerId, n);
    if (n === this.activeThreshold(sellerId, wibMonth(at)))
      ms.becameActiveAt.set(sellerId, at);
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

  // ---------------------------------------------------------------------------
  // Tutup bulan

  private closeMonth(month: string): void {
    const ms = this.month(month);
    const closeAt = monthCloseAt(month);
    const closeFriday = payoutFriday(closeAt);
    const sales = this.personalSales(month);
    const active = new Set<string>();
    for (const [id, n] of sales) {
      if (n >= this.activeThreshold(id, month)) {
        active.add(id);
        this.accounts.get(id)!.everActive = true;
      }
    }
    this.activeByMonth.set(month, active);
    const isActive = (id: string) => active.has(id);
    const pool: PoolSources = {
      forfeitedTeam: 0,
      leadershipUnassigned: 0,
      leadershipOverCap: 0,
      rankFundLeftover: 0,
      identityCapExcess: 0,
      berkahUnconfirmed: 0,
      carriedFromLastMonth: this.poolCarry,
      pembinaanOverCap: 0,
      topUp: 0,
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
      if (this.inProgram90(e.accountId, e.accruedAt)) {
        // Spesifikasi 5.3: bonus yang ditahan dalam 90 hari pertama belum hangus sampai hari ke-150.
        const day150 = wibMonth(
          addDays(this.accounts.get(e.accountId)!.program90StartAt!, PLAN.program90HoldUntilDay),
        );
        if (monthIndex(day150) > monthIndex(e.holdUntil)) e.holdUntil = day150;
        e.note = `${note} · masa tunggu program 90 hari`;
      }
      this.held.push(e);
    };

    // 1. Bonus Layanan Berkah: cair bila dikonfirmasi dan lewat 30 hari; tanpa konfirmasi 60 hari -> Pool Aktif.
    const stillPending: LedgerEntry[] = [];
    for (const e of this.pendingBerkah) {
      const sale = this.sales.get(e.saleId!)!;
      const due = addDays(sale.at, PLAN.berkahMaturityDays);
      if (sale.orientationConfirmedAt !== undefined && due <= closeAt) {
        if (this.subscriptionConditionMet(e.accountId, month)) {
          settle(
            e,
            e.gross,
            payoutFriday(Math.max(due, sale.orientationConfirmedAt)),
          );
        } else {
          heldNoSubscription += e.gross;
          hold(e, "Langganan penjual tidak aktif (bulan ke-4+)");
        }
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
      if (DIRECT_TYPES.includes(e.type)) {
        if (this.subscriptionConditionMet(e.accountId, month)) {
          settle(e, e.gross, this.directPayoutDate(e));
        } else {
          heldNoSubscription += e.gross;
          hold(e, "Langganan penjual tidak aktif (bulan ke-4+)");
        }
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
              ? "Langganan tidak aktif (bulan ke-4+)"
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
        DIRECT_TYPES.includes(e.type)
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
    const licenseNet = licenseSales.reduce((a, s) => a + (s.net ?? PLAN.license.netPrice), 0);
    const planACap = applyBp(licenseNet, this.options.planACapBp);
    const rankFund = applyBp(licenseNet, PLAN.rankFundBp);
    const leadershipFund = applyBp(licenseNet, PLAN.leadershipFundBp);
    const sumSettled = (types: BonusType[]) =>
      settled
        .filter((e) => types.includes(e.type))
        .reduce((a, e) => a + e.amount, 0);
    const directPaid = sumSettled(DIRECT_TYPES);
    const teamBudget = Math.max(
      0,
      planACap - directPaid - rankFund - leadershipFund,
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
      settle(
        e,
        pay,
        teamFactor >= 1 && e.month === month ? weekly : closeFriday,
      );
      if (pay < e.gross) {
        e.note = `Faktor plafon ${(teamFactor * 100).toFixed(2)}%`;
        this.teamCarry.push(this.carryEntry(e, e.gross - pay, month));
      }
    }
    const teamCarryNext = this.teamCarry.reduce((a, e) => a + e.gross, 0);
    pool.pembinaanOverCap = capPerAccount(
      settled.filter((e) => e.type === "PEMBINAAN"),
      PLAN.pembinaanPersonalMonthlyCap,
    );

    // 5. Peringkat bulanan (spesifikasi 6), lalu Bonus Prestasi Peringkat: klaim pada bulan aktif
    //    pertama setelah terverifikasi, antrean menurut urutan.
    this.evaluateRanks(month, active, closeAt);
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

    // 6. Dana leadership 5% (spesifikasi 7): dibagi menurut bobot peringkat bayar kepada Mitra aktif.
    const leadershipHolders = [...this.accounts.values()]
      .filter((a) => a.role === "mitra" && isActive(a.id))
      .map((a) => ({
        id: a.id,
        weight: PLAN.monthlyRanks[rankIndex(this.paidAsRank(a.id, month))].leadershipWeight,
      }))
      .filter((h) => h.weight > 0);
    const leadership = allocateWeightedWithCap(
      leadershipFund,
      leadershipHolders,
      PLAN.leadershipPersonalMonthlyCap,
    );
    pool.leadershipUnassigned = leadership.unassigned;
    pool.leadershipOverCap = leadership.overCap;
    for (const [id, amt] of leadership.allocation) {
      settle(
        this.accrue(id, "LEADERSHIP", amt, closeAt - 1, { deferred: true, month }),
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
    const poolSources =
      pool.forfeitedTeam +
      pool.leadershipUnassigned +
      pool.leadershipOverCap +
      pool.rankFundLeftover +
      pool.identityCapExcess +
      pool.berkahUnconfirmed +
      pool.pembinaanOverCap +
      pool.carriedFromLastMonth;
    // Spesifikasi 8: bila bonus Plan A di bawah 55%, selisihnya sampai 55% ikut dibagi lewat Pool Aktif.
    const poolTarget = applyBp(licenseNet, PLAN.poolTargetBp);
    pool.topUp = Math.max(0, poolTarget - planABeforePool - poolSources);
    const poolTotal = poolSources + pool.topUp;
    const poolRoom = Math.max(0, planACap - planABeforePool);
    const poolAvailable = Math.min(poolTotal, poolRoom);
    const activeSales = new Map([...sales].filter(([id]) => active.has(id)));
    const identityTotals = this.identityTotals(settled);
    const dist = distributePool(poolAvailable, activeSales, PLAN.poolMaxPerSale);
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
    // Bila ada penerima, sisa Pool (di atas batas per penjualan, sisa pembulatan, dan sisa top-up)
    // kembali ke perusahaan (keputusan Coach 29 Oktober 2026). Bila tidak ada penerima sama sekali,
    // sumber Pool dibawa ke bulan berikutnya; top-up tidak pernah dibawa.
    this.poolCarry = activeSales.size > 0 && dist.perSale > 0 ? 0 : Math.max(0, poolSources - poolDistributed);

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
      poolTarget,
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
      leadershipFund,
      roRoyaltyFund: roFunds.reduce((a, b) => a + b, 0),
      heldAmount: this.held.reduce((a, e) => a + e.gross, 0),
      forfeitedAmount: pool.forfeitedTeam,
      companyStructural,
      heldNoSubscription,
    });
  }

  /**
   * Peringkat bulanan (spesifikasi 6). Node diproses dari yang terdalam agar peringkat pemimpin di
   * kaki bawah sudah diketahui. Hanya Mitra aktif yang dapat memenuhi syarat atau memelihara peringkat.
   */
  private evaluateRanks(month: string, active: Set<string>, closeAt: number): void {
    const names = PLAN.monthlyRanks.map((r) => r.name);
    const personal = this.personalSales(month);
    const directActive = new Map<string, number>();
    for (const id of active) {
      const sp = this.accounts.get(id)!.sponsorId;
      if (sp) directActive.set(sp, (directActive.get(sp) ?? 0) + 1);
    }
    const best = new Map<string, { L: number; R: number }>();
    const inputs = new Map<string, RankInput>();
    const paidAs = new Map<string, RankName>();
    const ordered = [...this.nodes.values()].sort((a, b) => b.depth - a.depth);
    for (const node of ordered) {
      const acc = this.accounts.get(node.accountId)!;
      if (acc.role !== "mitra") continue;
      const b = best.get(node.id) ?? { L: 0, R: 0 };
      const input: RankInput = {
        personalTx: personal.get(acc.id) ?? 0,
        legPaket: {
          L: node.monthNet.L / PLAN.license.netPrice,
          R: node.monthNet.R / PLAN.license.netPrice,
        },
        directActive: directActive.get(acc.id) ?? 0,
        leaderBest: { L: names[b.L], R: names[b.R] },
      };
      inputs.set(acc.id, input);
      const isAct = active.has(acc.id);
      const q: RankName = isAct ? qualifiedRank(input) : "Member";
      let pa = q;
      if (isAct)
        for (const r of acc.ranksAchieved)
          if (rankIndex(r.rank) > rankIndex(pa) && maintainsRank(r.rank, input.legPaket)) pa = r.rank;
      paidAs.set(acc.id, pa);

      // Verifikasi 3 bulan berturut-turut, dihitung terpisah untuk setiap peringkat yang belum dicapai:
      // dimulai saat memenuhi syarat, berlanjut selama memenuhi syarat atau terpelihara.
      const streaks = (acc.rankStreaks ??= {});
      const highestAchieved = acc.ranksAchieved.reduce((m, r) => Math.max(m, rankIndex(r.rank)), 0);
      let verified = 0;
      for (let i = highestAchieved + 1; i < names.length; i++) {
        const name = names[i];
        const s = streaks[name];
        const keeps = isAct && (rankIndex(q) >= i || maintainsRank(name, input.legPaket));
        if (s && keeps) s.months++;
        else if (s) delete streaks[name];
        else if (isAct && rankIndex(q) >= i) streaks[name] = { since: month, months: 1 };
        if ((streaks[name]?.months ?? 0) >= PLAN.rankVerifyMonths) verified = i;
      }
      if (verified > 0) {
        for (let i = 1; i <= verified; i++) {
          if (!acc.ranksAchieved.some((r) => r.rank === names[i]))
            acc.ranksAchieved.push({ rank: names[i], at: closeAt - 1, claimed: false });
          delete streaks[names[i]];
        }
        acc.ranksAchieved.sort((x, y) => rankIndex(x.rank) - rankIndex(y.rank));
      }
      let top: RankName | undefined;
      for (const name of names) if (streaks[name]) top = name;
      acc.rankVerify = top ? { rank: top, ...streaks[top]! } : undefined;

      // Keputusan Coach: pemimpin dihitung dari Mitra yang disponsori langsung, menurut kaki
      // biner tempatnya berada di bawah posisi Sponsor.
      const idx = rankIndex(pa);
      const sponsorNode = acc.sponsorId ? this.accounts.get(acc.sponsorId)?.nodeId : undefined;
      const side = idx > 0 && sponsorNode ? this.sideUnder(sponsorNode, node.id) : undefined;
      if (side) {
        const cur = best.get(sponsorNode!) ?? { L: 0, R: 0 };
        if (idx > cur[side]) cur[side] = idx;
        best.set(sponsorNode!, cur);
      }
    }
    for (const node of this.nodes.values()) node.monthNet = { L: 0, R: 0 };
    this.rankInputsByMonth.set(month, inputs);
    this.paidAsByMonth.set(month, paidAs);
  }

  /** Peringkat bayar bulan yang sudah ditutup (Member bila belum ditutup atau tidak memenuhi). */
  paidAsRank(accountId: string, month: string): RankName {
    return this.paidAsByMonth.get(month)?.get(accountId) ?? "Member";
  }

  /**
   * Masukan peringkat: dari catatan tutup bulan, atau hitungan berjalan untuk bulan terbuka
   * (pemimpin memakai peringkat bayar bulan sebelumnya).
   */
  rankInputs(accountId: string, month: string): RankInput {
    const closed = this.rankInputsByMonth.get(month)?.get(accountId);
    if (closed) return closed;
    const acc = this.mustAccount(accountId);
    const node = acc.nodeId ? this.nodes.get(acc.nodeId) : undefined;
    const prev = addMonths(month, -1);
    const leaderBest: { L: RankName; R: RankName } = { L: "Member", R: "Member" };
    if (node) {
      for (const a of this.accounts.values()) {
        if (a.sponsorId !== accountId || !a.nodeId) continue;
        const side = this.sideUnder(node.id, a.nodeId);
        const r = this.paidAsRank(a.id, prev);
        if (side && rankIndex(r) > rankIndex(leaderBest[side])) leaderBest[side] = r;
      }
    }
    const directActive = [...this.accounts.values()].filter(
      (a) => a.sponsorId === accountId && a.role === "mitra" && this.isActive(a.id, month),
    ).length;
    return {
      personalTx: this.personalSales(month).get(accountId) ?? 0,
      legPaket: {
        L: (node?.monthNet.L ?? 0) / PLAN.license.netPrice,
        R: (node?.monthNet.R ?? 0) / PLAN.license.netPrice,
      },
      directActive,
      leaderBest,
    };
  }

  /** Kaki (kiri/kanan) tempat `nodeId` berada di bawah `ancestorId`; undefined bila bukan keturunannya. */
  private sideUnder(ancestorId: string, nodeId: string): Side | undefined {
    let child = this.nodes.get(nodeId);
    while (child?.parentId) {
      if (child.parentId === ancestorId) return child.side ?? undefined;
      child = this.nodes.get(child.parentId);
    }
    return undefined;
  }

  /** Bonus program 90 hari dibayar setelah masa pengembalian 7 hari kerja; Sponsor pada Jumat berikutnya. */
  private directPayoutDate(e: LedgerEntry): string {
    return PROGRAM90_TYPES.includes(e.type)
      ? payoutFriday(addWorkdays(e.accruedAt, PLAN.refundWorkdays))
      : payoutFriday(e.accruedAt);
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
