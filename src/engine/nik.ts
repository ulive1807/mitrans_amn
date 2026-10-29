/**
 * Pemeriksaan struktur NIK (Nomor Induk Kependudukan) sebelum akun dibuat.
 * Susunan NIK: 2 digit provinsi, 2 digit kabupaten/kota, 2 digit kecamatan,
 * 6 digit tanggal lahir (DDMMYY; perempuan: tanggal + 40), 4 digit nomor urut.
 *
 * Ini hanya pemeriksaan bentuk. Keaslian NIK dan kecocokan wajah tetap harus
 * diverifikasi ke Dukcapil/penyedia e-KYC pada sistem produksi.
 */

/** Kode provinsi yang berlaku (Kemendagri), termasuk provinsi Papua hasil pemekaran. */
const PROVINCE_CODES = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 31, 32, 33, 34, 35, 36, 51, 52, 53,
  61, 62, 63, 64, 65, 71, 72, 73, 74, 75, 76, 81, 82, 91, 92, 93, 94, 95, 96,
]);

export interface NikInfo {
  nik: string;
  /** Tanggal lahir, pukul 00.00 UTC. */
  birthDate: number;
  female: boolean;
}

/** Buang spasi, titik, dan tanda hubung agar "3171 0115..." dan "317101 15..." dianggap sama. */
export function normalizeNik(raw: string): string {
  return raw.replace(/[\s.-]/g, "");
}

/** Mengembalikan data NIK, atau pesan kesalahan bila bentuknya tidak sah. */
export function parseNik(
  raw: string,
  today: number,
): NikInfo | { error: string } {
  const nik = normalizeNik(raw);
  if (!/^\d{16}$/.test(nik)) return { error: "NIK harus 16 angka" };
  if (!PROVINCE_CODES.has(Number(nik.slice(0, 2))))
    return { error: "Kode provinsi pada NIK tidak dikenal" };
  if (nik.slice(2, 4) === "00" || nik.slice(4, 6) === "00")
    return { error: "Kode kabupaten/kota atau kecamatan pada NIK tidak sah" };
  let day = Number(nik.slice(6, 8));
  const month = Number(nik.slice(8, 10));
  const yy = Number(nik.slice(10, 12));
  const female = day > 40;
  if (female) day -= 40;
  const nowYy = new Date(today).getUTCFullYear() % 100;
  const year = (yy > nowYy ? 1900 : 2000) + yy;
  const birthDate = Date.UTC(year, month - 1, day);
  const d = new Date(birthDate);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    d.getUTCDate() !== day ||
    d.getUTCMonth() !== month - 1
  )
    return { error: "Tanggal lahir pada NIK tidak sah" };
  if (birthDate > today) return { error: "Tanggal lahir pada NIK tidak sah" };
  if (nik.slice(12) === "0000")
    return { error: "Nomor urut pada NIK tidak sah" };
  return { nik, birthDate, female };
}

/** Usia penuh dalam tahun pada waktu `at`. */
export function ageAt(birthDate: number, at: number): number {
  const b = new Date(birthDate);
  const n = new Date(at + 7 * 3600_000); // tanggal WIB
  let age = n.getUTCFullYear() - b.getUTCFullYear();
  if (
    n.getUTCMonth() < b.getUTCMonth() ||
    (n.getUTCMonth() === b.getUTCMonth() && n.getUTCDate() < b.getUTCDate())
  )
    age--;
  return age;
}
