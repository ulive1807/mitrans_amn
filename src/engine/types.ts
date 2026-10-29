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
  /** Awal program 90 hari: aktivasi Lisensi pertama; tidak berubah walau Lisensi dibatalkan lalu dibeli lagi. */
  program90StartAt?: number;
  /** Masa akses Lisensi pertama dalam bulan (3 untuk Lisensi Atlas, 12 untuk Family). */
  accessMonths?: number;
  /** Aktivasi Lisensi pertama milik akun ini (untuk syarat Langganan bulan ke-4 dan masa akses). */
  licenseActivatedAt?: number;
  /** Id node jaringan biner. Hanya Mitra PLS pemegang Lisensi. */
  nodeId?: string;
  /** Pernah berstatus aktif paling sedikit sekali (syarat Plan B). */
  everActive: boolean;
  /** Verifikasi peringkat yang sedang berjalan (spesifikasi 6): perlu 3 bulan berturut-turut. */
  rankVerify?: { rank: RankName; since: string; months: number };
  /** Hitungan bulan berturut-turut per peringkat yang belum dicapai (verifikasi per peringkat). */
  rankStreaks?: Partial<Record<RankName, { since: string; months: number }>>;
  /** Peringkat yang sudah tercapai dan terverifikasi (sekali per identitas), urut dari rendah. */
  ranksAchieved: { rank: RankName; at: number; claimed: boolean }[];
  terminated?: boolean;
  /** Pemegang kursi kedua/ketiga Lisensi Atlas Family yang didaftarkan kursi utama. */
  familySeat?: {
    bundleId: string;
    side: Side;
    /** "menunggu": posisi sudah dikunci, tetapi Lisensi kursi belum aktif sampai anggota memverifikasi sendiri. */
    status: "menunggu" | "aktif";
    invitedAt: number;
    verifiedAt?: number;
  };
}

/** Paket Lisensi Atlas Family. */
export interface FamilyBundle {
  id: string;
  /** Kursi utama (ayah). */
  headId: string;
  /** Mitra PLS yang menjual paket (Sponsor kursi utama). */
  sellerId: string;
  purchasedAt: number;
  /** Pemegang kursi di kaki kiri dan kanan kursi utama. */
  seats: Partial<Record<Side, string>>;
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
  /** Omzet bersih Lisensi dan Langganan per kaki dalam 10 level bulan berjalan (peringkat bulanan). */
  monthNet: { L: number; R: number };
  /** Jumlah Lisensi kumulatif per kaki dalam 10 level (penempatan, Royalti RO, tampilan). */
  cumLicenses: { L: number; R: number };
  /** Saldo unit pasangan yang belum dipasangkan. */
  carry: { L: number; R: number };
  /** Unit masuk hari berjalan, diproses pada akhir hari. */
  todayIn: { L: number; R: number };
  /** PV Langganan per kaki dalam 10 level untuk bulan berjalan (persepuluh PV). */
  roPvTenths: { L: number; R: number };
}

export type SaleKind = "license" | "subscription";

export interface Sale {
  id: string;
  kind: SaleKind;
  /** Lisensi: produk asal kursi ini. */
  product?: "license" | "family";
  /** Lisensi: omzet bersih kursi ini (Family dibagi rata per kursi). */
  net?: number;
  /** Family: id paket bersama. */
  bundleId?: string;
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
  /** Langganan: bulan akses yang dibayar. */
  forMonth?: string;
  cancelled?: boolean;
  cancelledAt?: number;
  /** Node tempat volume Lisensi ini dicatat. */
  volumeNodeId?: string;
  /** Node yang sudah menghitung Lisensi ini (agar konversi tidak menghitung ulang). */
  countedBy?: Set<string>;
}

export type BonusType =
  | "SPONSOR"
  | "BERKAH"
  | "FAST_START"
  | "PENDAMPING"
  | "PASANGAN"
  | "PEMBINAAN"
  | "PRESTASI"
  | "LEADERSHIP"
  | "POOL_AKTIF"
  | "KOMISI_LANGGANAN"
  | "PASANGAN_RO"
  | "ROYALTI_RO";

export const PLAN_A_TYPES: BonusType[] = [
  "SPONSOR",
  "BERKAH",
  "FAST_START",
  "PENDAMPING",
  "PASANGAN",
  "PEMBINAAN",
  "PRESTASI",
  "LEADERSHIP",
  "POOL_AKTIF",
];
export const PLAN_B_TYPES: BonusType[] = [
  "KOMISI_LANGGANAN",
  "PASANGAN_RO",
  "ROYALTI_RO",
];
/** Bonus langsung: dibayar tanpa syarat aktif, di luar anggaran bonus tim. */
export const DIRECT_TYPES: BonusType[] = [
  "SPONSOR",
  "BERKAH",
  "FAST_START",
  "PENDAMPING",
];
/** Bonus program 90 hari: dibayar setelah masa pengembalian 7 hari kerja. */
export const PROGRAM90_TYPES: BonusType[] = ["FAST_START", "PENDAMPING"];
export const TEAM_TYPES: BonusType[] = ["PASANGAN", "PEMBINAAN"];

export const BONUS_LABEL: Record<BonusType, string> = {
  SPONSOR: "Bonus Sponsor",
  BERKAH: "Bonus Layanan Berkah",
  FAST_START: "Bonus Fast Start",
  PENDAMPING: "Bonus Pendamping",
  PASANGAN: "Bonus Pasangan",
  PEMBINAAN: "Bonus Pembinaan",
  PRESTASI: "Bonus Prestasi Peringkat",
  LEADERSHIP: "Bonus Leadership",
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
  saleId?: string;
  /** Untuk Bonus Pembinaan: generasi. Untuk Bonus Pasangan: jumlah pasangan. */
  ref?: number;
  note?: string;
  /** Id entri negatif yang menarik kembali entri ini setelah dibayar. */
  reversedBy?: number;
  /** Bulan terakhir masa tunggu untuk bonus yang ditahan. */
  holdUntil?: string;
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
  leadershipUnassigned: number;
  leadershipOverCap: number;
  rankFundLeftover: number;
  identityCapExcess: number;
  berkahUnconfirmed: number;
  carriedFromLastMonth: number;
  /** Bonus Pembinaan di atas Rp500 jt per orang per bulan (keputusan Coach 29 Oktober 2026). */
  pembinaanOverCap: number;
  /** Pengisian Pool sampai 55% omzet bersih Lisensi (spesifikasi 8); sisanya tidak dibawa. */
  topUp: number;
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
  /** 55% omzet bersih Lisensi: batas pengisian Pool Aktif (spesifikasi 8). */
  poolTarget: number;
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
  leadershipFund: number;
  roRoyaltyFund: number;
  heldAmount: number;
  forfeitedAmount: number;
  companyStructural: number;
  /** Bonus pemegang Lisensi bulan ke-4+ yang tertahan karena Langganan tidak aktif. */
  heldNoSubscription: number;
}
