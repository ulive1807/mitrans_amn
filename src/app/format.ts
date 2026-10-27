export const rp = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

/** Ringkas: Rp1,2 jt / Rp3,4 M. */
export function rpShort(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1e12)
    return `${sign}Rp${(abs / 1e12).toLocaleString("id-ID", { maximumFractionDigits: 1 })} T`;
  if (abs >= 1e9)
    return `${sign}Rp${(abs / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (abs >= 1e6)
    return `${sign}Rp${(abs / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  if (abs >= 1e3)
    return `${sign}Rp${(abs / 1e3).toLocaleString("id-ID", { maximumFractionDigits: 0 })} rb`;
  return `${sign}Rp${abs}`;
}

export const pct = (x: number, digits = 1) =>
  `${(x * 100).toLocaleString("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;

export const num = (n: number) => n.toLocaleString("id-ID");

const BULAN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];
const BULAN_PANJANG = [
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

export function monthLabel(month: string, long = false): string {
  const [y, m] = month.split("-").map(Number);
  return `${(long ? BULAN_PANJANG : BULAN)[m - 1]} ${y}`;
}

export function dateLabel(date: string | number): string {
  const d =
    typeof date === "number"
      ? new Date(date + 7 * 3600_000).toISOString().slice(0, 10)
      : date;
  const [y, m, day] = d.split("-").map(Number);
  return `${day} ${BULAN[m - 1]} ${y}`;
}
