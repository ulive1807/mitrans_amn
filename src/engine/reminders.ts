/**
 * Pengingat tagihan Langganan (S&K Pasal 6; halaman depan: "pengingat paling lambat 3 hari sebelum tagihan").
 *
 * Jadwal per pemegang Lisensi, dihitung dari tanggal akhir akses (WIB):
 *   H-7, H-3, H-1, hari jatuh tempo (H), dan satu pemberitahuan sehari setelah akses berakhir.
 * Tidak ada pengingat berulang sesudahnya, tidak ada bahasa menekan, dan tidak ada tenggat palsu.
 * Pemberitahuan di Kantor Maya selalu tampil; surel/WhatsApp hanya untuk penerima yang menyetujuinya
 * dan baru dikirim setelah penyedia pesan disambungkan (prototipe ini tidak mengirim apa pun).
 */
import type { MitransEngine } from "./engine";
import { PLAN } from "./plan";
import { wibDate } from "./time";

export type ReminderStage = "H-7" | "H-3" | "H-1" | "H" | "berakhir";

export const REMINDER_LABEL: Record<ReminderStage, string> = {
  "H-7": "7 hari lagi",
  "H-3": "3 hari lagi",
  "H-1": "Besok",
  H: "Hari ini",
  berakhir: "Akses berakhir",
};

/** Selisih hari kalender tanggal jatuh tempo terhadap hari ini (WIB) yang memicu pengiriman. */
export const REMINDER_SEND_DAYS: Record<number, ReminderStage> = {
  7: "H-7",
  3: "H-3",
  1: "H-1",
  0: "H",
  [-1]: "berakhir",
};

export interface SubscriptionReminder {
  accountId: string;
  name: string;
  role: "mitra" | "pelanggan";
  /** Akhir akses (eksklusif); tagihan berikutnya jatuh tempo pada saat ini. */
  dueAt: number;
  /** Tanggal jatuh tempo (WIB), YYYY-MM-DD. */
  dueDate: string;
  /** Selisih hari kalender: positif = belum jatuh tempo. */
  daysLeft: number;
  stage: ReminderStage;
  /** Hari ini termasuk hari kirim (H-7, H-3, H-1, H, atau sehari sesudah berakhir). */
  sendToday: boolean;
  bonusBalance: number;
  canPayFromBonus: boolean;
  message: string;
}

const dayIndex = (date: string) =>
  Math.round(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
const rp = (x: number) => `Rp${x.toLocaleString("id-ID")}`;
const tgl = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  const BLN = [
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
  return `${d} ${BLN[m - 1]} ${y}`;
};

function stageFor(daysLeft: number): ReminderStage | undefined {
  if (daysLeft > 7 || daysLeft < -1) return undefined;
  if (daysLeft >= 4) return "H-7";
  if (daysLeft >= 2) return "H-3";
  if (daysLeft === 1) return "H-1";
  if (daysLeft === 0) return "H";
  return "berakhir";
}

/**
 * Pengingat untuk satu akun pada waktu `now`, atau undefined bila tidak ada yang perlu diingatkan
 * (tidak memegang Lisensi, jatuh tempo masih lebih dari 7 hari, atau akses sudah berakhir lebih dari sehari).
 * Akses berakhir pada `dueAt` (jam yang sama dengan aktivasi); tanggal jatuh tempo adalah tanggal WIB saat itu.
 */
export function reminderFor(
  engine: MitransEngine,
  accountId: string,
  now: number,
): SubscriptionReminder | undefined {
  const acc = engine.accounts.get(accountId);
  if (
    !acc ||
    acc.terminated ||
    (acc.role !== "mitra" && acc.role !== "pelanggan")
  )
    return undefined;
  const dueAt = engine.accessUntil(accountId);
  if (dueAt === undefined) return undefined;
  const dueDate = wibDate(dueAt);
  const daysLeft = dayIndex(dueDate) - dayIndex(wibDate(now));
  const stage = stageFor(daysLeft);
  if (!stage) return undefined;
  const price = PLAN.subscription.price;
  const bonusBalance =
    acc.role === "mitra" ? engine.bonusBalance(accountId) : 0;
  const canPayFromBonus = acc.role === "mitra" && bonusBalance >= price;
  const when =
    stage === "berakhir"
      ? `Akses aplikasi Anda berakhir pada ${tgl(dueDate)}.`
      : stage === "H"
        ? `Langganan Anda jatuh tempo hari ini, ${tgl(dueDate)}.`
        : `Langganan Anda jatuh tempo pada ${tgl(dueDate)} (${daysLeft} hari lagi).`;
  const how =
    `Perpanjangan ${rp(price)} untuk 30 hari, dibayar ke kanal resmi Perusahaan` +
    (canPayFromBonus
      ? ` atau dipotong dari bonus Anda yang belum ditransfer (saldo ${rp(bonusBalance)}).`
      : ".");
  const note =
    acc.role === "mitra"
      ? " Bonus Level, Pasangan, dan Pembinaan bulan ini dibayar bila akses aktif pada akhir bulan; Bonus Sponsor tetap dibayar."
      : "";
  const tail =
    stage === "berakhir"
      ? " Lisensi Anda tetap berlaku; akses aktif lagi begitu Langganan dibayar. Langganan bersifat pilihan."
      : " Langganan bersifat pilihan dan dapat dihentikan kapan saja.";
  return {
    accountId,
    name: acc.name,
    role: acc.role,
    dueAt,
    dueDate,
    daysLeft,
    stage,
    sendToday: REMINDER_SEND_DAYS[daysLeft] !== undefined,
    bonusBalance,
    canPayFromBonus,
    message: `${when} ${how}${note}${tail}`,
  };
}

/** Semua pengingat yang berlaku pada waktu `now`, urut dari jatuh tempo terdekat. */
export function remindersDue(
  engine: MitransEngine,
  now: number,
): SubscriptionReminder[] {
  const out: SubscriptionReminder[] = [];
  for (const acc of engine.accounts.values()) {
    const r = reminderFor(engine, acc.id, now);
    if (r) out.push(r);
  }
  return out.sort((a, b) => a.dueAt - b.dueAt);
}
