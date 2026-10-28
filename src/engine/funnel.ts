/**
 * Perjalanan pembeli e-book (CUB) sesudah pembayaran lunas: asesmen → unduh e-book → pilih kelas webinar RT3
 * (Road To Transform360, Selasa/Rabu/Kamis 19.00 WIB) → hadir. Pengingat WhatsApp hanya dikirim kepada pembeli
 * yang menyetujuinya, dan berhenti begitu pembeli membalas BERHENTI.
 *
 * Prototipe: belum ada penyedia WhatsApp; pesan hanya diantrekan. Kelas berlangsung lewat Zoom.
 */
import { EngineError } from "./engine";
import type { EbookOrder, EbookStore } from "./ebook";
import { atWib, wibDate } from "./time";

const HOUR = 3600_000;
const DAY = 24 * HOUR;

export const RT3 = {
  /** Hari kelas: 2 = Selasa, 3 = Rabu, 4 = Kamis. */
  weekdays: [2, 3, 4],
  hourWib: 19,
  /** Kapasitas per kelas (asumsi prototipe; sesuaikan dengan lisensi Zoom). */
  capacity: 1000,
  /** Pemilihan atau penggantian kelas ditutup 60 menit sebelum mulai. */
  closeMinutes: 60,
  /** Dianggap hadir bila total waktu di Zoom paling sedikit 30 menit (asumsi prototipe; tetapkan setelah durasi kelas pasti). */
  minAttendMinutes: 30,
} as const;

const DAY_LABEL: Record<number, string> = {
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
};

export interface Rt3Session {
  id: string;
  date: string;
  dayLabel: string;
  startsAt: number;
}

export function sessionFor(date: string): Rt3Session | undefined {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (!(RT3.weekdays as readonly number[]).includes(dow)) return undefined;
  return {
    id: `RT3-${date}`,
    date,
    dayLabel: DAY_LABEL[dow],
    startsAt: atWib(date, RT3.hourWib),
  };
}

/** Kelas yang masih dapat dipilih dalam `days` hari ke depan. */
export function upcomingSessions(at: number, days = 14): Rt3Session[] {
  const out: Rt3Session[] = [];
  for (let i = 0; i <= days; i++) {
    const s = sessionFor(wibDate(at + i * DAY));
    if (s && s.startsAt - RT3.closeMinutes * 60_000 > at) out.push(s);
  }
  return out;
}

/** Asesmen awal: memetakan kebutuhan belajar keluarga, bukan tes lulus/gagal dan bukan profil risiko investasi. */
export const ASSESSMENT = [
  {
    id: "dana_darurat",
    text: "Apakah keluarga Anda sudah memiliki dana darurat?",
    options: [
      { value: 0, label: "Belum ada" },
      { value: 1, label: "Ada, kurang dari 3 bulan pengeluaran" },
      { value: 2, label: "Ada, 3 bulan pengeluaran atau lebih" },
    ],
  },
  {
    id: "pengalaman",
    text: "Pengalaman Anda dengan pasar modal syariah?",
    options: [
      { value: 0, label: "Belum pernah" },
      { value: 1, label: "Pernah membaca atau ikut kelas" },
      { value: 2, label: "Sudah punya rekening efek" },
    ],
  },
  {
    id: "laporan_keuangan",
    text: "Seberapa paham Anda membaca laporan keuangan perusahaan?",
    options: [
      { value: 0, label: "Belum paham" },
      { value: 1, label: "Paham dasar-dasarnya" },
      { value: 2, label: "Cukup paham" },
    ],
  },
  {
    id: "waktu_belajar",
    text: "Berapa waktu belajar yang bisa Anda sediakan per minggu?",
    options: [
      { value: 0, label: "Kurang dari 1 jam" },
      { value: 1, label: "1 sampai 3 jam" },
      { value: 2, label: "Lebih dari 3 jam" },
    ],
  },
  {
    id: "risiko",
    text: "Mana yang paling sesuai dengan pemahaman Anda?",
    options: [
      { value: 0, label: "Saham syariah pasti untung" },
      { value: 1, label: "Saham syariah bisa naik dan turun" },
      {
        value: 2,
        label: "Harga bisa turun, jadi perlu belajar dan membagi risiko",
      },
    ],
  },
] as const;

export type AssessmentAnswers = Record<string, number>;
export type LearningLevel = "dasar" | "menengah" | "lanjut";
export const LEVEL_LABEL: Record<LearningLevel, string> = {
  dasar: "Mulai dari dasar",
  menengah: "Menengah",
  lanjut: "Siap materi lanjutan",
};

export function levelOf(answers: AssessmentAnswers): LearningLevel {
  const total = ASSESSMENT.reduce((a, q) => a + (answers[q.id] ?? 0), 0);
  return total <= 3 ? "dasar" : total <= 7 ? "menengah" : "lanjut";
}

export type FunnelStage =
  | "menunggu_bayar"
  | "lunas"
  | "asesmen"
  | "kelas_dipilih"
  | "hadir";
export const FUNNEL_LABEL: Record<FunnelStage, string> = {
  menunggu_bayar: "Menunggu bayar",
  lunas: "Lunas · belum asesmen",
  asesmen: "Asesmen selesai · belum pilih kelas",
  kelas_dipilih: "Kelas dipilih",
  hadir: "Hadir di kelas",
};

// ---------------------------------------------------------------------------
// Antrean WhatsApp

/** Nomor WhatsApp tersamar untuk tampilan staf: 0812****890. */
export function maskPhone(n: string): string {
  return n.length <= 7 ? "****" : `${n.slice(0, 4)}****${n.slice(-3)}`;
}

export type WaKind =
  | "pembayaran_lunas"
  | "pengingat_kelas_h1"
  | "pengingat_kelas_1jam";
export interface WaMessage {
  id: string;
  userId: string;
  orderId: string;
  to: string;
  kind: WaKind;
  body: string;
  sendAt: number;
  status: "antre" | "terkirim" | "dibatalkan";
  reason?: string;
}

/** Jam tenang 21.00–07.00 WIB: pesan dijadwalkan ulang ke 07.00. */
function outsideQuietHours(t: number): number {
  const h = new Date(t + 7 * HOUR).getUTCHours();
  if (h >= 21) return atWib(wibDate(t + DAY), 7);
  if (h < 7) return atWib(wibDate(t), 7);
  return t;
}

const STOP = "Balas BERHENTI bila tidak ingin menerima pesan lagi.";

export class WhatsAppQueue {
  readonly messages: WaMessage[] = [];
  readonly optedOut = new Set<string>();

  /** Mengantrekan pesan. Tidak ada pesan bila pembeli tidak menyetujui atau sudah berhenti. */
  enqueue(
    o: EbookOrder,
    kind: WaKind,
    body: string,
    sendAt: number,
  ): WaMessage | undefined {
    if (!o.waConsent || this.optedOut.has(o.userId)) return undefined;
    const m: WaMessage = {
      id: `WA-${String(this.messages.length + 1).padStart(6, "0")}`,
      userId: o.userId,
      orderId: o.id,
      to: o.whatsapp,
      kind,
      body: `${body} ${STOP}`,
      sendAt: outsideQuietHours(sendAt),
      status: "antre",
    };
    this.messages.push(m);
    return m;
  }

  cancel(orderId: string, kinds: WaKind[], reason: string): void {
    for (const m of this.messages)
      if (
        m.orderId === orderId &&
        m.status === "antre" &&
        kinds.includes(m.kind)
      ) {
        m.status = "dibatalkan";
        m.reason = reason;
      }
  }

  /** Balasan masuk dari pembeli. "BERHENTI" (atau STOP) menghentikan semua pesan yang belum terkirim. */
  inbound(userId: string, text: string): boolean {
    if (!/^\s*(berhenti|stop)\s*$/i.test(text)) return false;
    this.optedOut.add(userId);
    for (const m of this.messages)
      if (m.userId === userId && m.status === "antre") {
        m.status = "dibatalkan";
        m.reason = "Pembeli berhenti berlangganan pesan";
      }
    return true;
  }

  due(at: number): WaMessage[] {
    return this.messages.filter((m) => m.status === "antre" && m.sendAt <= at);
  }

  markSent(id: string): void {
    const m = this.messages.find((x) => x.id === id);
    if (m && m.status === "antre") m.status = "terkirim";
  }
}

// ---------------------------------------------------------------------------

export class Funnel {
  readonly assessments = new Map<
    string,
    { answers: AssessmentAnswers; level: LearningLevel; at: number }
  >();
  readonly bookings = new Map<
    string,
    { sessionId: string; at: number; attended?: boolean; minutes?: number }
  >();
  readonly wa = new WhatsAppQueue();

  constructor(
    private readonly ebooks: EbookStore,
    private readonly opts: { capacity?: number } = {},
  ) {}

  private paidOrder(orderId: string, userId: string): EbookOrder {
    const o = this.ebooks.orders.get(orderId);
    if (!o || o.userId !== userId)
      throw new EngineError("Pesanan tidak ditemukan");
    if (o.status !== "lunas") throw new EngineError("Pesanan belum lunas");
    return o;
  }

  /** Dipanggil saat pembayaran e-book lunas: pesan WhatsApp berisi langkah berikutnya (sekali per pesanan). */
  onPaid(orderId: string, at: number): WaMessage | undefined {
    const o = this.ebooks.orders.get(orderId);
    if (!o || o.status !== "lunas") return undefined;
    if (
      this.wa.messages.some(
        (m) => m.orderId === orderId && m.kind === "pembayaran_lunas",
      )
    )
      return undefined;
    const eb = this.ebooks.ebooks.get(o.ebookId)!;
    return this.wa.enqueue(
      o,
      "pembayaran_lunas",
      `Terima kasih, pembayaran e-book "${eb.title}" sudah kami terima. Langkah berikutnya: isi asesmen singkat (5 pertanyaan), lalu unduh e-book dan pilih kelas webinar RT3 di akun Anda.`,
      at,
    );
  }

  submitAssessment(
    orderId: string,
    userId: string,
    answers: AssessmentAnswers,
    at: number,
  ) {
    this.paidOrder(orderId, userId);
    for (const q of ASSESSMENT) {
      const v = answers[q.id];
      if (!q.options.some((o) => o.value === v))
        throw new EngineError(`Jawab pertanyaan: ${q.text}`);
    }
    const clean = Object.fromEntries(
      ASSESSMENT.map((q) => [q.id, answers[q.id]]),
    );
    const r = { answers: clean, level: levelOf(clean), at };
    this.assessments.set(orderId, r);
    return r;
  }

  /** E-book dapat diunduh setelah lunas dan asesmen selesai, selama e-book belum ditarik. */
  canDownload(
    orderId: string,
    userId: string,
  ): { ok: boolean; reason?: string } {
    const o = this.ebooks.orders.get(orderId);
    if (!o || o.userId !== userId)
      return { ok: false, reason: "Pesanan tidak ditemukan" };
    if (o.status !== "lunas")
      return { ok: false, reason: "Pesanan belum lunas" };
    if (!this.assessments.has(orderId))
      return { ok: false, reason: "Isi asesmen terlebih dahulu" };
    const eb = this.ebooks.ebooks.get(o.ebookId);
    if (!eb?.file) return { ok: false, reason: "Berkas belum tersedia" };
    if (eb.status === "ditarik")
      return { ok: false, reason: "E-book ditarik Perusahaan" };
    return { ok: true };
  }

  seatsTaken(sessionId: string): number {
    return [...this.bookings.values()].filter((b) => b.sessionId === sessionId)
      .length;
  }

  /** Memilih atau mengganti kelas. Pengingat lama dibatalkan dan diganti pengingat kelas baru. */
  chooseClass(orderId: string, userId: string, sessionId: string, at: number) {
    const o = this.paidOrder(orderId, userId);
    if (!this.assessments.has(orderId))
      throw new EngineError("Isi asesmen sebelum memilih kelas");
    const s = sessionFor(sessionId.replace(/^RT3-/, ""));
    if (!s || s.id !== sessionId) throw new EngineError("Kelas tidak dikenal");
    if (s.startsAt - RT3.closeMinutes * 60_000 <= at)
      throw new EngineError("Pemilihan kelas ini sudah ditutup");
    const prev = this.bookings.get(orderId);
    if (
      prev?.sessionId !== sessionId &&
      this.seatsTaken(sessionId) >= (this.opts.capacity ?? RT3.capacity)
    )
      throw new EngineError("Kelas sudah penuh; pilih jadwal lain");
    this.bookings.set(orderId, { sessionId, at });
    this.wa.cancel(
      orderId,
      ["pengingat_kelas_h1", "pengingat_kelas_1jam"],
      "Kelas diganti",
    );
    const when = `${s.dayLabel}, ${s.date} pukul 19.00 WIB`;
    this.wa.enqueue(
      o,
      "pengingat_kelas_h1",
      `Pengingat: kelas webinar RT3 Anda besok, ${when}. Tautan Zoom ada di akun Anda.`,
      s.startsAt - DAY,
    );
    this.wa.enqueue(
      o,
      "pengingat_kelas_1jam",
      `Kelas webinar RT3 dimulai satu jam lagi (${when}). Tautan Zoom ada di akun Anda.`,
      s.startsAt - HOUR,
    );
    return { session: s, booking: this.bookings.get(orderId)! };
  }

  /** Kehadiran dicatat penyelenggara kelas setelah sesi selesai. */
  markAttendance(sessionId: string, orderIds: string[], at: number): number {
    const s = sessionFor(sessionId.replace(/^RT3-/, ""));
    if (!s || at < s.startsAt)
      throw new EngineError("Kehadiran dicatat setelah kelas dimulai");
    let n = 0;
    for (const id of orderIds) {
      const b = this.bookings.get(id);
      if (b && b.sessionId === sessionId) {
        b.attended = true;
        n++;
      }
    }
    return n;
  }

  /**
   * Kehadiran otomatis dari laporan peserta Zoom: peserta dicocokkan lewat surel pesanan (tanpa beda huruf besar/kecil),
   * durasi beberapa kali masuk dijumlahkan, dan dianggap hadir bila paling sedikit `RT3.minAttendMinutes` menit.
   */
  importZoomAttendance(sessionId: string, rows: ZoomParticipant[], at: number) {
    const s = sessionFor(sessionId.replace(/^RT3-/, ""));
    if (!s || at < s.startsAt) throw new EngineError("Laporan Zoom diimpor setelah kelas dimulai");
    const minutes = new Map<string, number>();
    for (const r of rows) minutes.set(r.email, (minutes.get(r.email) ?? 0) + r.minutes);
    const matched = new Set<string>();
    const hadir: string[] = [];
    const kurang: { orderId: string; minutes: number }[] = [];
    for (const [orderId, b] of this.bookings) {
      if (b.sessionId !== sessionId) continue;
      const email = this.ebooks.orders.get(orderId)!.email.toLowerCase();
      const m = minutes.get(email);
      if (m === undefined) continue;
      matched.add(email);
      b.minutes = m;
      if (m >= RT3.minAttendMinutes) {
        b.attended = true;
        hadir.push(orderId);
      } else kurang.push({ orderId, minutes: m });
    }
    return { hadir, kurang, tidakTerdaftar: [...minutes.keys()].filter((e) => !matched.has(e)) };
  }

  stage(orderId: string): FunnelStage {
    const o = this.ebooks.orders.get(orderId);
    if (!o || o.status !== "lunas") return "menunggu_bayar";
    const b = this.bookings.get(orderId);
    if (b?.attended) return "hadir";
    if (b) return "kelas_dipilih";
    return this.assessments.has(orderId) ? "asesmen" : "lunas";
  }
}

export interface ZoomParticipant {
  email: string;
  minutes: number;
}

function csvCells(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}

/**
 * Membaca CSV laporan peserta Zoom (Reports → Usage → Participants). Baris judul dicari otomatis: kolom yang memuat
 * "Email" dan kolom "Duration"/"Durasi". Baris tanpa surel diabaikan.
 */
export function parseZoomParticipants(csv: string): ZoomParticipant[] {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  const hi = lines.findIndex((l) => /email/i.test(l) && /(duration|durasi)/i.test(l));
  if (hi < 0) throw new EngineError("Kolom surel dan durasi tidak ditemukan di laporan Zoom");
  const head = csvCells(lines[hi]).map((h) => h.toLowerCase());
  const ei = head.findIndex((h) => h.includes("email"));
  const di = head.findIndex((h) => h.includes("duration") || h.includes("durasi"));
  const out: ZoomParticipant[] = [];
  for (const l of lines.slice(hi + 1)) {
    const c = csvCells(l);
    const email = (c[ei] ?? "").toLowerCase();
    const minutes = Number((c[di] ?? "").replace(",", "."));
    if (email.includes("@") && Number.isFinite(minutes)) out.push({ email, minutes });
  }
  return out;
}
