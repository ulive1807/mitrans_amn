/**
 * Kuis singkat Kode Etik (Rencana Pemasaran Bab 6: tautan rujukan aktif setelah lulus kuis, tanpa biaya), data rekening
 * atas nama sendiri (Kode Etik Pasal 4), dan masa pertimbangan 10 hari kerja (Kode Etik Pasal 5).
 * Setiap pertanyaan merujuk pasal yang sudah ada di Kode Etik v1.4; kuis tidak membuat aturan baru.
 */
import { EngineError, type MitransEngine } from "./engine";
import { atWib, wibDate } from "./time";

export const QUIZ = [
  {
    id: "penghasilan",
    text: "Calon Mitra PLS bertanya berapa penghasilan yang pasti ia dapat. Jawaban yang benar?",
    options: [
      "Sebutkan contoh penghasilan Mitra PLS terbaik",
      "Jelaskan bahwa penghasilan tidak dijamin dan bergantung pada penjualan dan pembinaan sendiri",
      "Janjikan balik modal dalam 3 bulan",
    ],
    answer: 1,
    basis: "Kode Etik Pasal 12 dan Pasal 18 angka 1",
  },
  {
    id: "sinyal",
    text: "Bolehkah Anda memberikan rekomendasi beli/jual saham tertentu atas nama Mitrans-Astra?",
    options: [
      "Boleh, asal saham syariah",
      "Boleh di grup tertutup",
      "Tidak boleh; Mitrans-Astra adalah alat analisis dan edukasi",
    ],
    answer: 2,
    basis: "Kode Etik Pasal 18 angka 2–3",
  },
  {
    id: "pembayaran",
    text: "Pembeli Lisensi ingin membayar. Ke mana pembayaran diarahkan?",
    options: [
      "Ke Halaman Pembayaran atlastrade.io (kanal resmi Perusahaan)",
      "Ke rekening pribadi Anda, lalu Anda teruskan",
      "Ke rekening Sponsor Anda",
    ],
    answer: 0,
    basis: "Kode Etik Pasal 12 dan Pasal 18 angka 15",
  },
  {
    id: "daftar",
    text: "Apakah calon Mitra PLS wajib membeli Lisensi agar bisa mendaftar?",
    options: [
      "Ya, Lisensi adalah syarat pendaftaran",
      "Tidak; pendaftaran gratis dan tidak mewajibkan pembelian",
      "Ya, minimal Langganan satu bulan",
    ],
    answer: 1,
    basis: "Kode Etik Pasal 4 dan Pasal 18 angka 6",
  },
  {
    id: "lokapasar",
    text: "Bolehkah Anda menjual Lisensi melalui lokapasar (online marketplace)?",
    options: [
      "Tidak boleh",
      "Boleh bila harganya sama",
      "Boleh bila mencantumkan kode rujukan",
    ],
    answer: 0,
    basis: "Kode Etik Pasal 18 angka 13",
  },
  {
    id: "pesan_massal",
    text: "Bolehkah mengirim promosi ke grup WhatsApp warga tanpa persetujuan anggotanya?",
    options: [
      "Boleh bila grupnya ramai",
      "Tidak boleh; kirim hanya kepada yang setuju",
      "Boleh sekali seminggu",
    ],
    answer: 1,
    basis: "Kode Etik Pasal 18 angka 19",
  },
  {
    id: "ebook",
    text: "Kapan e-book dan halaman penawaran buatan Anda boleh tayang?",
    options: [
      "Segera setelah selesai dibuat",
      "Setelah disetujui Perusahaan di Agent Marketing",
      "Setelah Sponsor membacanya",
    ],
    answer: 1,
    basis: "Kode Etik Pasal 12",
  },
] as const;

export function gradeQuiz(answers: Record<string, number>): {
  passed: boolean;
  wrong: { id: string; basis: string }[];
} {
  const wrong = QUIZ.filter((q) => answers[q.id] !== q.answer).map((q) => ({
    id: q.id,
    basis: q.basis,
  }));
  return { passed: wrong.length === 0, wrong };
}

/** Menilai kuis dan, bila semua benar, mengaktifkan tautan rujukan. Kuis dapat diulang tanpa batas dan tanpa biaya. */
export function takeQuiz(
  engine: MitransEngine,
  accountId: string,
  answers: Record<string, number>,
) {
  const r = gradeQuiz(answers);
  if (r.passed) engine.passQuiz(accountId);
  return r;
}

export interface BankAccount {
  bank: string;
  number: string;
  holder: string;
  savedAt: number;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

/** Rekening untuk transfer bonus: wajib atas nama Mitra PLS sendiri (Kode Etik Pasal 4). */
export function validateBankAccount(
  name: string,
  input: { bank: string; number: string; holder: string },
  at: number,
): BankAccount {
  const bank = (input.bank ?? "").trim();
  const number = (input.number ?? "").replace(/[\s-]/g, "");
  const holder = (input.holder ?? "").trim();
  if (bank.length < 2 || bank.length > 60)
    throw new EngineError("Nama bank wajib diisi");
  if (!/^\d{6,20}$/.test(number))
    throw new EngineError("Nomor rekening 6–20 angka");
  if (norm(holder) !== norm(name))
    throw new EngineError(
      "Nama pemilik rekening harus sama dengan nama Mitra PLS (rekening atas nama sendiri)",
    );
  return { bank, number, holder, savedAt: at };
}

/** Akhir masa pertimbangan 10 hari kerja (Senin–Jumat) sejak pendaftaran; hari libur nasional belum diperhitungkan. */
export function coolingOffEnds(since: number, workdays = 10): string {
  let d = wibDate(since);
  let n = 0;
  while (n < workdays) {
    d = wibDate(atWib(d, 12) + 86_400_000);
    const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
    if (dow !== 0 && dow !== 6) n++;
  }
  return d;
}
