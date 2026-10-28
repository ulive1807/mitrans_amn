/**
 * E-book dan halaman penawaran (LP) buatan Mitra PLS di dasbor Agent Marketing (keputusan A21–A22).
 *
 * - E-book adalah produk milik Mitra PLS, bukan produk Perusahaan: harga Rp25.000–Rp150.000, hasil penjualan
 *   masuk ke rekening Mitra PLS, tanpa PV, tanpa komisi, dan tidak dihitung untuk bonus apa pun. Perusahaan
 *   menyediakan fasilitas Agent Marketing tanpa biaya.
 * - Setiap e-book dan LP wajib diajukan dan disetujui Perusahaan (peran Kepatuhan) sebelum tayang (Kode Etik
 *   Pasal 12). Mengubah e-book yang sudah tayang mengembalikannya ke draf sampai disetujui lagi.
 * - Pembelian e-book mengunci Sponsor calon pengguna baru (CUB): Mitra PLS pemilik e-book. Kunci pertama berlaku
 *   tetap dan dipakai saat CUB membeli Lisensi di atlastrade.io.
 */
import { EngineError, type MitransEngine } from "./engine";

export const EBOOK_PRICE = { min: 25_000, max: 150_000, step: 1_000 } as const;

export type EbookStatus =
  | "draf"
  | "diajukan"
  | "perlu_revisi"
  | "disetujui"
  | "ditolak"
  | "ditarik";

export const EBOOK_STATUS_LABEL: Record<EbookStatus, string> = {
  draf: "Draf",
  diajukan: "Menunggu pemeriksaan",
  perlu_revisi: "Perlu revisi",
  disetujui: "Disetujui · tayang",
  ditolak: "Ditolak",
  ditarik: "Ditarik Perusahaan",
};

export interface EbookInput {
  title: string;
  summary: string;
  price: number;
  lpHeadline: string;
  lpBody: string;
  /** LP menawarkan kelas webinar RT3 (Road To Transform360) setelah pembelian. */
  webinarOffer: boolean;
}

export interface ComplianceFlag {
  /** Teks yang ditemukan. */
  match: string;
  reason: string;
}

export interface EbookEvent {
  at: number;
  by: string;
  action:
    | "dibuat"
    | "diubah"
    | "berkas"
    | "diajukan"
    | "disetujui"
    | "perlu_revisi"
    | "ditolak"
    | "ditarik";
  note?: string;
}

/** Berkas e-book (PDF). Prototipe menyimpan data berkas; penyimpanan berkasnya sendiri belum disambungkan. */
export interface EbookFile {
  name: string;
  /** Ukuran dalam byte. */
  size: number;
  /** SHA-256 heksadesimal, untuk memastikan berkas yang diperiksa sama dengan yang diunduh pembeli. */
  sha256: string;
  uploadedAt: number;
}

export const EBOOK_FILE_MAX_BYTES = 20 * 1024 * 1024;

/** Memeriksa tanda awal berkas PDF ("%PDF-"). */
export function isPdf(bytes: Uint8Array): boolean {
  return bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
}

export interface Ebook extends EbookInput {
  id: string;
  slug: string;
  mitraId: string;
  status: EbookStatus;
  /** Naik setiap kali isi berubah; persetujuan berlaku untuk versi yang diperiksa. */
  version: number;
  approvedVersion?: number;
  flags: ComplianceFlag[];
  history: EbookEvent[];
  file?: EbookFile;
}

export interface EbookBuyer {
  /** ID pengguna Clerk; akun dibuat sekali dengan OTP. */
  userId: string;
  name: string;
  email: string;
  whatsapp: string;
  /** Persetujuan menerima pesan WhatsApp (pengingat kelas). Tanpa ini tidak ada pesan WhatsApp. */
  waConsent: boolean;
}

export interface EbookOrder extends EbookBuyer {
  id: string;
  ebookId: string;
  sellerId: string;
  price: number;
  status: "menunggu" | "lunas";
  createdAt: number;
  paidAt?: number;
}

export interface SponsorLock {
  userId: string;
  sponsorId: string;
  at: number;
  orderId: string;
}

// Kata yang wajib diperiksa ketat. Pemeriksaan otomatis hanya membantu; keputusan tetap di tangan pemeriksa.
const RULES: [RegExp, string][] = [
  [
    /pasti\s+(untung|cuan|profit|kaya|berhasil)/i,
    "Menjanjikan hasil pasti (Kode Etik Pasal 18 angka 1–2)",
  ],
  [
    /\b(dijamin|garansi|jaminan)\s+(untung|cuan|profit|balik modal|penghasilan)/i,
    "Menjamin keuntungan atau penghasilan (Kode Etik Pasal 18 angka 1)",
  ],
  [/(bebas|tanpa)\s+risiko/i, "Mengesankan investasi tanpa risiko"],
  [
    /(cepat|mendadak)\s+kaya|kaya\s+(cepat|mendadak|instan)/i,
    "Janji kaya cepat",
  ],
  [
    /passive\s+income|penghasilan\s+(pasif|tetap|pasti)/i,
    "Klaim penghasilan (Kode Etik Pasal 18 angka 1)",
  ],
  [
    /\b\d+([.,]\d+)?\s*%\s*(per|tiap|setiap|se)\s*(hari|minggu|bulan|tahun)/i,
    "Angka imbal hasil (Kode Etik Pasal 18 angka 2)",
  ],
  [
    /sinyal\s+(beli|jual)|rekomendasi\s+(beli|jual)|wajib\s+(beli|jual)\s+saham/i,
    "Sinyal atau rekomendasi beli/jual (Kode Etik Pasal 18 angka 2–3)",
  ],
  [
    /(diawasi|terdaftar|berizin|izin)\s+(di\s+|oleh\s+)?(OJK|MUI|BEI)/i,
    "Klaim izin atau dukungan lembaga (Kode Etik Pasal 18 angka 4)",
  ],
  [
    /\b(gratis|free)\s+(lisensi|langganan)\b/i,
    "Mengesankan Lisensi atau Langganan gratis",
  ],
];

export function scanCompliance(text: string): ComplianceFlag[] {
  const out: ComplianceFlag[] = [];
  for (const [re, reason] of RULES) {
    const m = re.exec(text);
    if (m) out.push({ match: m[0], reason });
  }
  return out;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Nomor WhatsApp Indonesia: 08… atau +628… / 628…, 10–15 digit. */
const WA = /^(\+?62|0)8\d{8,12}$/;

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "ebook"
  );
}

export class EbookStore {
  readonly ebooks = new Map<string, Ebook>();
  readonly orders = new Map<string, EbookOrder>();
  /** ID pengguna Clerk → Sponsor yang terkunci dari pembelian e-book pertama. */
  readonly sponsorLocks = new Map<string, SponsorLock>();
  private seq = 0;

  constructor(private readonly engine: MitransEngine) {}

  private mitra(id: string) {
    const acc = this.engine.accounts.get(id);
    if (!acc || acc.role !== "mitra")
      throw new EngineError("Hanya Mitra PLS yang dapat membuat e-book");
    return acc;
  }

  /** Mitra PLS dapat menjual: lulus kuis, tidak diputus, tidak sedang dibekukan. */
  canSell(mitraId: string, at: number): boolean {
    const acc = this.engine.accounts.get(mitraId);
    return (
      !!acc &&
      acc.role === "mitra" &&
      acc.quizPassed &&
      !acc.terminated &&
      !(acc.frozenUntil !== undefined && acc.frozenUntil > at)
    );
  }

  private validate(input: EbookInput) {
    const title = input.title?.trim() ?? "";
    if (title.length < 5 || title.length > 120)
      throw new EngineError("Judul e-book 5–120 karakter");
    if (!input.summary?.trim() || input.summary.length > 1000)
      throw new EngineError(
        "Ringkasan wajib diisi, paling panjang 1.000 karakter",
      );
    if (!input.lpHeadline?.trim() || input.lpHeadline.length > 160)
      throw new EngineError(
        "Judul halaman penawaran wajib diisi, paling panjang 160 karakter",
      );
    if (!input.lpBody?.trim() || input.lpBody.length > 5000)
      throw new EngineError(
        "Isi halaman penawaran wajib diisi, paling panjang 5.000 karakter",
      );
    const p = input.price;
    if (
      !Number.isInteger(p) ||
      p < EBOOK_PRICE.min ||
      p > EBOOK_PRICE.max ||
      p % EBOOK_PRICE.step !== 0
    )
      throw new EngineError(
        "Harga e-book Rp25.000–Rp150.000, kelipatan Rp1.000",
      );
  }

  private content(input: EbookInput): EbookInput {
    return {
      title: input.title.trim(),
      summary: input.summary.trim(),
      price: input.price,
      lpHeadline: input.lpHeadline.trim(),
      lpBody: input.lpBody.trim(),
      webinarOffer: !!input.webinarOffer,
    };
  }

  create(mitraId: string, input: EbookInput, at: number): Ebook {
    this.mitra(mitraId);
    this.validate(input);
    const id = `EB-${String(++this.seq).padStart(4, "0")}`;
    let slug = slugify(input.title);
    if ([...this.ebooks.values()].some((e) => e.slug === slug))
      slug = `${slug}-${this.seq}`;
    const c = this.content(input);
    const eb: Ebook = {
      ...c,
      id,
      slug,
      mitraId,
      status: "draf",
      version: 1,
      flags: scanCompliance(this.text(c)),
      history: [{ at, by: mitraId, action: "dibuat" }],
    };
    this.ebooks.set(id, eb);
    return eb;
  }

  private text(e: EbookInput) {
    return [e.title, e.summary, e.lpHeadline, e.lpBody].join("\n");
  }

  private own(id: string, mitraId: string): Ebook {
    const eb = this.ebooks.get(id);
    if (!eb || eb.mitraId !== mitraId)
      throw new EngineError("E-book tidak ditemukan");
    return eb;
  }

  /** Mengubah isi. E-book yang sedang diperiksa tidak dapat diubah; yang sudah tayang kembali ke draf. */
  update(id: string, mitraId: string, input: EbookInput, at: number): Ebook {
    const eb = this.own(id, mitraId);
    if (eb.status === "diajukan")
      throw new EngineError(
        "E-book sedang diperiksa; tunggu keputusan sebelum mengubah",
      );
    if (eb.status === "ditolak" || eb.status === "ditarik")
      throw new EngineError(
        "E-book ini sudah ditolak atau ditarik; buat e-book baru",
      );
    this.validate(input);
    const c = this.content(input);
    Object.assign(eb, c, {
      status: "draf" as const,
      version: eb.version + 1,
      flags: scanCompliance(this.text(c)),
    });
    eb.history.push({ at, by: mitraId, action: "diubah" });
    return eb;
  }

  /**
   * Mengunggah atau mengganti berkas PDF. Seperti mengubah isi: e-book yang sedang diperiksa tidak dapat diubah,
   * dan e-book yang sudah tayang kembali ke draf sampai disetujui lagi.
   */
  attachFile(id: string, mitraId: string, file: { name: string; size: number; sha256: string }, at: number): Ebook {
    const eb = this.own(id, mitraId);
    if (eb.status === "diajukan") throw new EngineError("E-book sedang diperiksa; tunggu keputusan sebelum mengganti berkas");
    if (eb.status === "ditolak" || eb.status === "ditarik") throw new EngineError("E-book ini sudah ditolak atau ditarik; buat e-book baru");
    const name = (file.name ?? "").trim();
    if (!/\.pdf$/i.test(name) || name.length > 160) throw new EngineError("Berkas harus PDF (.pdf)");
    if (!Number.isInteger(file.size) || file.size <= 0 || file.size > EBOOK_FILE_MAX_BYTES) throw new EngineError("Ukuran berkas paling besar 20 MB");
    if (!/^[0-9a-f]{64}$/.test(file.sha256 ?? "")) throw new EngineError("Sidik berkas (SHA-256) tidak sah");
    eb.file = { name, size: file.size, sha256: file.sha256, uploadedAt: at };
    eb.status = "draf";
    eb.version += 1;
    eb.history.push({ at, by: mitraId, action: "berkas", note: name });
    return eb;
  }

  submit(id: string, mitraId: string, at: number): Ebook {
    const eb = this.own(id, mitraId);
    if (!eb.file) throw new EngineError("Unggah berkas PDF e-book sebelum mengajukan");
    if (eb.status !== "draf" && eb.status !== "perlu_revisi")
      throw new EngineError(
        "Hanya draf atau e-book yang perlu revisi yang dapat diajukan",
      );
    if (!this.canSell(mitraId, at))
      throw new EngineError(
        "Pengajuan memerlukan tautan rujukan aktif (kuis Kode Etik lulus, keanggotaan tidak dibekukan atau diputus)",
      );
    eb.status = "diajukan";
    eb.flags = scanCompliance(this.text(eb));
    eb.history.push({ at, by: mitraId, action: "diajukan" });
    return eb;
  }

  /** Keputusan pemeriksa Perusahaan. Catatan wajib untuk revisi dan penolakan. */
  review(
    id: string,
    reviewer: string,
    decision: "setujui" | "revisi" | "tolak",
    note: string | undefined,
    at: number,
  ): Ebook {
    const eb = this.ebooks.get(id);
    if (!eb) throw new EngineError("E-book tidak ditemukan");
    if (eb.status !== "diajukan")
      throw new EngineError(
        "Hanya e-book yang menunggu pemeriksaan yang dapat diputuskan",
      );
    if (reviewer === eb.mitraId)
      throw new EngineError(
        "Pembuat e-book tidak dapat memeriksa e-book sendiri",
      );
    const n = note?.trim();
    if (decision !== "setujui" && !n)
      throw new EngineError(
        "Tuliskan alasan agar Mitra PLS tahu apa yang perlu diperbaiki",
      );
    if (decision === "setujui") {
      eb.status = "disetujui";
      eb.approvedVersion = eb.version;
    } else eb.status = decision === "revisi" ? "perlu_revisi" : "ditolak";
    eb.history.push({
      at,
      by: reviewer,
      action:
        eb.status === "disetujui"
          ? "disetujui"
          : eb.status === "perlu_revisi"
            ? "perlu_revisi"
            : "ditolak",
      note: n,
    });
    return eb;
  }

  /** Perusahaan menurunkan e-book yang sudah tayang (mis. ada pengaduan). */
  withdraw(id: string, reviewer: string, note: string, at: number): Ebook {
    const eb = this.ebooks.get(id);
    if (!eb || eb.status !== "disetujui")
      throw new EngineError(
        "Hanya e-book yang sedang tayang yang dapat ditarik",
      );
    if (!note?.trim()) throw new EngineError("Tuliskan alasan penarikan");
    eb.status = "ditarik";
    eb.history.push({ at, by: reviewer, action: "ditarik", note: note.trim() });
    return eb;
  }

  forMitra(mitraId: string): Ebook[] {
    return [...this.ebooks.values()].filter((e) => e.mitraId === mitraId);
  }

  queue(): Ebook[] {
    return [...this.ebooks.values()].filter((e) => e.status === "diajukan");
  }

  /** LP yang tayang: disetujui, versi yang disetujui, dan pemiliknya masih boleh menjual. */
  live(slug: string, at: number): Ebook | undefined {
    const eb = [...this.ebooks.values()].find((e) => e.slug === slug);
    return eb &&
      eb.status === "disetujui" &&
      eb.approvedVersion === eb.version &&
      this.canSell(eb.mitraId, at)
      ? eb
      : undefined;
  }

  /** CUB memesan e-book dari LP. Pembayaran lewat Xendit; pesanan menunggu sampai kabar lunas. */
  order(slug: string, buyer: EbookBuyer, at: number): EbookOrder {
    const eb = this.live(slug, at);
    if (!eb) throw new EngineError("Halaman penawaran tidak tersedia");
    if (!buyer.userId?.trim())
      throw new EngineError("Masuk dengan OTP terlebih dahulu");
    if (!buyer.name?.trim() || buyer.name.length > 120)
      throw new EngineError("Nama wajib diisi");
    if (!EMAIL.test(buyer.email ?? ""))
      throw new EngineError("Alamat surel tidak sah");
    const wa = (buyer.whatsapp ?? "").replace(/[\s-]/g, "");
    if (!WA.test(wa))
      throw new EngineError("Nomor WhatsApp tidak sah (contoh: 0812xxxxxxxx)");
    const id = `EBO-${String(this.orders.size + 1).padStart(6, "0")}`;
    const o: EbookOrder = {
      id,
      ebookId: eb.id,
      sellerId: eb.mitraId,
      price: eb.price,
      status: "menunggu",
      createdAt: at,
      userId: buyer.userId,
      name: buyer.name.trim(),
      email: buyer.email.trim(),
      whatsapp: wa,
      waConsent: buyer.waConsent === true,
    };
    this.orders.set(id, o);
    return o;
  }

  /**
   * Pembayaran lunas (kabar dari Xendit). Nominal harus sama dengan harga pesanan. Sponsor dikunci untuk pembeli
   * yang belum punya kunci dan belum menjadi akun di sistem Mitra PLS; kunci pertama tidak pernah berubah.
   */
  markPaid(
    orderId: string,
    amount: number,
    at: number,
    opts: { isExistingAccount?: (userId: string) => boolean } = {},
  ): { order: EbookOrder; lock?: SponsorLock; newLock: boolean } {
    const o = this.orders.get(orderId);
    if (!o) throw new EngineError("Pesanan tidak dikenal");
    if (o.status === "lunas")
      return {
        order: o,
        lock: this.sponsorLocks.get(o.userId),
        newLock: false,
      };
    if (amount !== o.price)
      throw new EngineError(
        `Nominal pembayaran ${amount} tidak sama dengan harga ${o.price}`,
      );
    o.status = "lunas";
    o.paidAt = at;
    const existing = this.sponsorLocks.get(o.userId);
    if (existing) return { order: o, lock: existing, newLock: false };
    if (opts.isExistingAccount?.(o.userId))
      return { order: o, newLock: false };
    const lock: SponsorLock = {
      userId: o.userId,
      sponsorId: o.sellerId,
      at,
      orderId: o.id,
    };
    this.sponsorLocks.set(o.userId, lock);
    return { order: o, lock, newLock: true };
  }

  ordersFor(ebookId: string): EbookOrder[] {
    return [...this.orders.values()].filter((o) => o.ebookId === ebookId);
  }

  /** Pembeli e-book milik Mitra PLS ini yang sponsornya terkunci kepadanya. */
  lockedProspects(mitraId: string): SponsorLock[] {
    return [...this.sponsorLocks.values()].filter(
      (l) => l.sponsorId === mitraId,
    );
  }
}
