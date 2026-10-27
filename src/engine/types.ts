import type { RankName } from "./plan";

export type Side = "L" | "R";

export type AccountRole = "mitra" | "pelanggan" | "struktural";

export interface Account {
  id: string;
  /** Kode tampilan, mis. MTR-000123. */
  code: string;
  name: string;
  /** Identitas (NIK). Batas per orang dihitung per NIK. Akun struktural memakai NIK Perusahaan. */
  nik: string;
  role: AccountRole;
  /** Mitra PLS: Sponsor. Pelanggan: Mitra PLS penjual Lisensinya. */
  sponsorId: string | null;
  joinedAt: number;
  /** Mitra PLS: tanggal menjadi Mitra PLS (untuk Pelanggan yang dikonversi berbeda dari joinedAt). */
  mitraSince?: number;
  /** Lulus kuis Kode Etik sehingga tautan rujukan aktif (Bab 6 butir 7). */
  quizPassed: boolean;
  /** Aktivasi Lisensi pertama milik akun ini (akses 30 hari pertama dihitung dari sini). */
  licenseActivatedAt?: number;
  /** Id node jaringan biner. Hanya Mitra PLS pemegang Lisensi. */
  nodeId?: string;
  /** Pernah berstatus aktif paling sedikit sekali (syarat Plan B). */
  everActive: boolean;
  /** Peringkat yang sudah tercapai (sekali per identitas). */
  ranksAchieved: { rank: RankName; at: number; claimed: boolean }[];
  terminated?: boolean;
  terminatedAt?: number;
  /** Pembekuan keanggotaan sebagai sanksi (Kode Etik Pasal 20 angka 4): tidak dapat menjual sampai waktu ini. */
  frozenUntil?: number;
}

export interface BinaryNode {
  id: string;
  accountId: string;
  parentId: string | null;
  side: Side | null; // posisi terhadap parent
  depth: number; // kedalaman absolut dari puncak (Mitrans 001 = 0)
  left: string | null;
  right: string | null;
  createdAt: number;
  /** Jumlah Lisensi kumulatif per kaki dalam 10 level (untuk peringkat dan royalti). */
  cumLicenses: { L: number; R: number };
  /** Saldo unit pasangan yang belum dipasangkan. */
  carry: { L: number; R: number };
  /** Unit masuk hari berjalan, diproses pada akhir hari. */
  todayIn: { L: number; R: number };
  /** Kedalaman (1..10) yang sudah berisi Lisensi Mitra PLS per kaki, sebagai bitmask. */
  levelMask: { L: number; R: number };
  levelPaidMask: number;
  /** PV Langganan per kaki dalam 10 level untuk bulan berjalan (persepuluh PV). */
  roPvTenths: { L: number; R: number };
}

export type SaleKind = "license" | "subscription";

export interface Sale {
  id: string;
  kind: SaleKind;
  buyerId: string;
  /** Mitra PLS yang menjual (pemilik tautan rujukan). */
  sellerId: string;
  at: number;
  month: string;
  /** Lisensi kepada Pelanggan. */
  toCustomer: boolean;
  /** Konversi bagian 5.5. */
  convertedAt?: number;
  orientationConfirmedAt?: number;
  /** Langganan berbayar pertama Pelanggan ini (dihitung sebagai penjualan baru pribadi). */
  firstPaidSubscription?: boolean;
  /** Periode akses yang dibayar Langganan ini: [mulai, akhir). */
  periodStart?: number;
  periodEnd?: number;
  /** Cara bayar Langganan: kanal resmi Perusahaan atau potongan dari bonus yang belum ditransfer. */
  paidFrom?: "kanal_resmi" | "bonus";
  cancelled?: boolean;
  cancelledAt?: number;
  /** Pemeriksaan akun yang dikendalikan sendiri (Kode Etik Pasal 9 dan 21). */
  review?: {
    openedAt: number;
    reason: string;
    dismissedAt?: number;
    confirmedAt?: number;
    /** Tunda pembayaran berakhir karena lewat 30 hari tanpa keputusan. */
    expiredAt?: number;
  };
  /** Terkonfirmasi dibeli oleh akun yang dikendalikan penjual: tidak dihitung dan bonusnya ditarik. */
  controlled?: boolean;
  /** Node tempat volume Lisensi ini dicatat. */
  volumeNodeId?: string;
  /** Node yang sudah menghitung Lisensi ini (agar konversi tidak menghitung ulang). */
  countedBy?: Set<string>;
}

export type BonusType =
  | "SPONSOR"
  | "BERKAH"
  | "LEVEL"
  | "PASANGAN"
  | "PEMBINAAN"
  | "PRESTASI"
  | "ROYALTI"
  | "POOL_AKTIF"
  | "KOMISI_LANGGANAN"
  | "PASANGAN_RO"
  | "ROYALTI_RO";

export const PLAN_A_TYPES: BonusType[] = [
  "SPONSOR",
  "BERKAH",
  "LEVEL",
  "PASANGAN",
  "PEMBINAAN",
  "PRESTASI",
  "ROYALTI",
  "POOL_AKTIF",
];
export const PLAN_B_TYPES: BonusType[] = [
  "KOMISI_LANGGANAN",
  "PASANGAN_RO",
  "ROYALTI_RO",
];
export const TEAM_TYPES: BonusType[] = ["LEVEL", "PASANGAN", "PEMBINAAN"];

export const BONUS_LABEL: Record<BonusType, string> = {
  SPONSOR: "Bonus Sponsor",
  BERKAH: "Bonus Layanan Berkah",
  LEVEL: "Bonus Level",
  PASANGAN: "Bonus Pasangan",
  PEMBINAAN: "Bonus Pembinaan",
  PRESTASI: "Bonus Prestasi Peringkat",
  ROYALTI: "Royalti",
  POOL_AKTIF: "Pool Aktif",
  KOMISI_LANGGANAN: "Komisi Langganan",
  PASANGAN_RO: "Pasangan Langganan (RO)",
  ROYALTI_RO: "Royalti Langganan (RO)",
};

export type EntryStatus =
  /** Timbul, menunggu syarat (mis. Layanan Berkah menunggu 30 hari dan konfirmasi). */
  | "pending"
  /** Ditahan karena tidak aktif; menunggu masa tunggu 2 bulan (Bab 9.3). */
  | "held"
  /** Ditetapkan untuk dibayar pada tanggal `payoutDate`. */
  | "payable"
  /** Hangus dan masuk Pool Aktif. */
  | "forfeited"
  /** Jatuh pada akun struktural: tidak dibayarkan, tetap pendapatan Perusahaan (Bab 2). */
  | "company"
  /** Tidak memenuhi syarat dan tidak dibayarkan (mis. Plan B tanpa kegiatan pembinaan). */
  | "ineligible"
  /** Ditarik kembali karena pembelian dibatalkan/dikembalikan. */
  | "clawback";

/**
 * Potongan transfer Jumat untuk membayar Langganan dari bonus.
 * Dicatat terpisah dari ledger: bonus bruto (dasar pajak) tidak berubah, yang berkurang hanya nilai transfer.
 */
export interface PayoutDeduction {
  saleId: string;
  accountId: string;
  /** Jumat transfer yang dipotong (YYYY-MM-DD). */
  date: string;
  amount: number;
  cancelled?: boolean;
}

export interface LedgerEntry {
  id: number;
  accountId: string;
  nik: string;
  type: BonusType;
  /** Nominal penuh sebelum faktor plafon. */
  gross: number;
  /** Nominal yang ditetapkan untuk dibayar setelah faktor plafon dan batas per orang. */
  amount: number;
  status: EntryStatus;
  /** Bulan timbulnya bonus (bulan bonus). */
  month: string;
  accruedAt: number;
  /** Bulan penetapan (tutup bulan) atau Jumat mingguan. */
  settledMonth?: string;
  payoutDate?: string;
  /** Uang muka bonus tim yang dibayar pada Jumat mingguan (keputusan A10). Sisanya dibayar pada `payoutDate`. */
  advance?: number;
  advanceDate?: string;
  saleId?: string;
  /** Untuk Bonus Pembinaan: generasi. Untuk Bonus Level: kedalaman. */
  ref?: number;
  note?: string;
  /** Bulan terakhir masa tunggu untuk bonus yang ditahan. */
  holdUntil?: string;
  /** Ditahan karena pemeriksaan akun (bukan masa tunggu tidak aktif). */
  reviewHold?: boolean;
}

export interface RankClaim {
  accountId: string;
  rank: RankName;
  amount: number;
  claimMonth: string;
  claimedAt: number;
  paidMonth?: string;
  paidFromReserve?: boolean;
}

export interface PoolSources {
  forfeitedTeam: number;
  royaltyUnassigned: number;
  royaltyOverCap: number;
  rankFundLeftover: number;
  identityCapExcess: number;
  berkahUnconfirmed: number;
  carriedFromLastMonth: number;
}

export interface MonthReport {
  month: string;
  licensesSold: number;
  licensesToCustomers: number;
  conversions: number;
  subscriptionsPaid: number;
  licenseNet: number;
  subscriptionNet: number;
  newMitra: number;
  activeMitra: number;
  totalMitra: number;
  /** Total dibayar per jenis (status payable, termasuk pelepasan bonus tahanan bulan lalu). */
  paidByType: Record<BonusType, number>;
  planAPaid: number;
  planBPaid: number;
  planAPct: number;
  planBPct: number;
  planACap: number;
  planBCap: number;
  teamBudget: number;
  teamClaims: number;
  teamFactor: number;
  planBFactor: number;
  /** Faktor plafon Plan A dipakai pada bonus tim (klaim melebihi anggaran). */
  planACapTriggered: boolean;
  /** Pool Aktif dibatasi plafon Plan A; sisanya dibawa ke bulan berikutnya. */
  poolClampedByCap: boolean;
  planBCapTriggered: boolean;
  teamCarryNext: number;
  pool: PoolSources & {
    total: number;
    distributed: number;
    perSale: number;
    carryNext: number;
  };
  rankFund: number;
  rankPaidFromFund: number;
  rankPaidFromReserve: number;
  rankQueueOutstanding: number;
  royaltyFund: number;
  roRoyaltyFund: number;
  heldAmount: number;
  forfeitedAmount: number;
  companyStructural: number;
  /** Bonus pemegang Lisensi yang tertahan karena Langganan tidak aktif. */
  heldNoSubscription: number;
}
