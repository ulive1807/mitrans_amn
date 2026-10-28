/**
 * PPh Pasal 21 atas komisi dan bonus Mitra PLS (penerima penghasilan bukan pegawai).
 *
 * Dasar (dirangkum dari publikasi pajak sekunder, 27 Oktober 2026; WAJIB dikonfirmasi konsultan pajak
 * terhadap naskah resmi PMK 168/2023 dan Perdirjen terbaru sebelum dipakai dengan uang sungguhan):
 * - PMK 168/2023 Pasal 3 ayat (2) huruf l: distributor perusahaan pemasaran berjenjang/penjualan langsung
 *   termasuk bukan pegawai.
 * - PPh 21 bukan pegawai = tarif Pasal 17 ayat (1) huruf a UU PPh × 50% penghasilan bruto, tanpa
 *   penghitungan kumulatif tahunan (skema "berkesinambungan" PER-16/PJ/2016 tidak berlaku lagi).
 * - Tarif Pasal 17 ayat (1) huruf a (UU HPP): 5% s.d. Rp60 juta; 15% s.d. Rp250 juta; 25% s.d. Rp500 juta;
 *   30% s.d. Rp5 miliar; 35% di atasnya.
 *
 * Asumsi kerja prototipe (ditandai agar dinilai konsultan pajak):
 * - Setiap transfer Jumat adalah satu pembayaran. Lapisan tarif diterapkan pada jumlah bruto bulan kalender
 *   pembayaran (masa pajak) secara berjalan: pajak suatu Jumat = pajak atas bruto bulan itu sampai Jumat itu
 *   dikurangi pajak Jumat sebelumnya pada bulan yang sama. Untuk pembayaran kecil hasilnya sama dengan
 *   menghitung per pembayaran; untuk pembayaran besar cara ini tidak memotong terlalu sedikit.
 * - Tambahan 20% bagi penerima tanpa NPWP tidak dipakai secara bawaan, karena NIK kini berfungsi sebagai NPWP;
 *   dapat dihidupkan per akun (`withoutNpwp`).
 * - Penarikan bonus (clawback) belum mengoreksi pajak yang sudah dipotong; koreksi dilakukan di pembukuan pajak.
 */
export const PPH21 = {
  dppBp: 5000, // 50% penghasilan bruto
  brackets: [
    { upTo: 60_000_000, bp: 500 },
    { upTo: 250_000_000, bp: 1500 },
    { upTo: 500_000_000, bp: 2500 },
    { upTo: 5_000_000_000, bp: 3000 },
    { upTo: Infinity, bp: 3500 },
  ],
  withoutNpwpSurchargeBp: 2000, // 20% lebih tinggi
  /** Kode objek pajak distributor penjualan langsung menurut sumber sekunder; cek Perdirjen terbaru. */
  objectCode: "21-100-04",
} as const;

/** Dasar pemotongan: 50% bruto, dibulatkan ke bawah. */
export const dppOf = (gross: number) => Math.floor((Math.max(0, gross) * PPH21.dppBp) / 10_000);

/** Pajak menurut tarif Pasal 17 ayat (1) huruf a atas dasar pemotongan `dpp` (Rupiah bulat, dibulatkan ke bawah). */
export function pasal17(dpp: number): number {
  let tax = 0;
  let lower = 0;
  for (const b of PPH21.brackets) {
    if (dpp <= lower) break;
    const part = Math.min(dpp, b.upTo) - lower;
    tax += (part * b.bp) / 10_000;
    lower = b.upTo;
  }
  return Math.floor(tax);
}

/** PPh 21 atas bruto `gross` bila sudah ada bruto `priorGrossThisMonth` yang dibayar pada masa pajak yang sama. */
export function pph21BukanPegawai(
  gross: number,
  priorGrossThisMonth = 0,
  withoutNpwp = false,
): number {
  if (gross <= 0) return 0;
  const tax =
    pasal17(dppOf(priorGrossThisMonth + gross)) -
    pasal17(dppOf(priorGrossThisMonth));
  return withoutNpwp
    ? Math.floor((tax * (10_000 + PPH21.withoutNpwpSurchargeBp)) / 10_000)
    : tax;
}

export interface PayoutLine {
  /** Jumat transfer (YYYY-MM-DD). */
  date: string;
  /** Bonus bruto pada Jumat itu. */
  gross: number;
  /** PPh 21 yang dipotong pada Jumat itu. */
  tax: number;
}

/** PPh 21 per Jumat untuk satu Mitra PLS, dari daftar bruto per tanggal (urutan bebas). */
export function withholdBySchedule(
  grossByDate: Map<string, number>,
  withoutNpwp = false,
): PayoutLine[] {
  const dates = [...grossByDate.keys()].sort();
  const monthGross = new Map<string, number>();
  return dates.map((date) => {
    const gross = grossByDate.get(date)!;
    const m = date.slice(0, 7);
    const prior = monthGross.get(m) ?? 0;
    const tax = pph21BukanPegawai(gross, prior, withoutNpwp);
    monthGross.set(m, prior + Math.max(0, gross));
    return { date, gross, tax };
  });
}

/** Satu baris jadwal transfer Mitra PLS. Nilai yang ditransfer = bruto − penarikan − PPh 21 − potongan Langganan. */
export interface PayoutScheduleLine {
  date: string;
  /** Bonus bruto yang dijadwalkan pada Jumat itu. */
  gross: number;
  /** Penarikan bonus (clawback) yang dipotong pada Jumat itu. */
  clawback: number;
  /** Bruto kena pajak = bruto − penarikan. */
  taxable: number;
  tax: number;
  /** Potongan Langganan yang dibayar dari bonus. */
  deducted: number;
  net: number;
}

/** Status satu penarikan bonus: dipotong dari Jumat mana saja, dan sisa piutang. */
export interface ClawbackStatus {
  entry: import("./types").LedgerEntry;
  amount: number;
  /** Tempat penarikan dipotong: transfer bonus Jumat, atau hak lain (pembelian kembali, pengembalian dana, dll.). */
  offsets: { date: string; amount: number; source: "transfer" | "hak_lain"; entitlementId?: string }[];
  /** Sisa piutang yang masih dapat dipotong. */
  outstanding: number;
  /** Tanggal sisa piutang dihapus (12 bulan sejak penarikan). */
  writeOffDate: string;
  /** Sisa yang sudah dihapus karena lewat 12 bulan. */
  writtenOff: number;
}

/** Rincian pemotongan PPh 21 satu Mitra PLS untuk satu masa pajak (bahan bukti potong BP21 di Coretax). */
export interface BuktiPotong {
  /** Nomor internal; nomor resmi diberikan Coretax DJP saat bukti potong diterbitkan. */
  number: string;
  /** Masa pajak YYYY-MM. */
  month: string;
  accountId: string;
  name: string;
  nik: string;
  withoutNpwp: boolean;
  objectCode: string;
  lines: { date: string; gross: number; clawback: number; taxable: number; dpp: number; tax: number }[];
  gross: number;
  clawback: number;
  taxable: number;
  dpp: number;
  tax: number;
  /** Masa pajak sudah lewat (bukan sementara). */
  final: boolean;
}
