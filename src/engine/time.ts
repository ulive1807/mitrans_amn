/**
 * Waktu dalam engine memakai milidetik UTC. Tanggal kalender dan bulan dihitung menurut WIB (UTC+7),
 * karena tutup bulan dan batas Jumat di Rencana Pemasaran Bab 11 memakai WIB.
 */
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 'YYYY-MM-DD' menurut WIB. */
export function wibDate(t: number): string {
  return new Date(t + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

/** 'YYYY-MM' menurut WIB. */
export function wibMonth(t: number): string {
  return wibDate(t).slice(0, 7);
}

/** Waktu (ms UTC) untuk tanggal WIB 'YYYY-MM-DD' pada jam WIB tertentu. */
export function atWib(date: string, hour = 9, minute = 0): number {
  return (
    Date.parse(`${date}T00:00:00Z`) -
    WIB_OFFSET_MS +
    (hour * 60 + minute) * 60 * 1000
  );
}

export function addDays(t: number, days: number): number {
  return t + days * DAY_MS;
}

export function nextDate(date: string): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export function monthIndex(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return y * 12 + (m - 1);
}

export function monthFromIndex(i: number): string {
  const y = Math.floor(i / 12);
  const m = (i % 12) + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function addMonths(month: string, n: number): string {
  return monthFromIndex(monthIndex(month) + n);
}

/** Bulan ke berapa (1-based) `month` dihitung sejak bulan aktivasi. Bulan aktivasi = bulan ke-1. */
export function monthNumberSince(
  activationMonth: string,
  month: string,
): number {
  return monthIndex(month) - monthIndex(activationMonth) + 1;
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Tanggal 1 bulan berikutnya pukul 00.00 WIB (momen tutup bulan). */
export function monthCloseAt(month: string): number {
  return atWib(`${addMonths(month, 1)}-01`, 0, 0);
}

/**
 * Jumat pembayaran untuk transaksi pada waktu t (Bab 11.1):
 * batas transaksi Jumat 07.00 WIB, transfer 07.01–19.00 WIB pada Jumat yang sama.
 * Transaksi setelah Jumat 07.00 WIB masuk Jumat berikutnya.
 * Jumat 07.00 WIB = Jumat 00.00 UTC, sehingga cukup dihitung di UTC.
 */
export function payoutFriday(t: number): string {
  const d = new Date(t);
  const utcMidnight = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
  );
  const dow = d.getUTCDay(); // 5 = Jumat
  let daysAhead = (5 - dow + 7) % 7;
  // Tepat Jumat: bila t <= Jumat 00:00 UTC (07.00 WIB) masih masuk hari ini, selain itu minggu depan.
  if (daysAhead === 0 && t > utcMidnight) daysAhead = 7;
  return new Date(utcMidnight + daysAhead * DAY_MS).toISOString().slice(0, 10);
}
