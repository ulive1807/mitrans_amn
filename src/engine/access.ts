/**
 * Hak akses per peran untuk staf PT MITRANS, dengan pemisahan tugas dan log audit.
 *
 * Prinsip:
 * - Setiap tindakan diperiksa terhadap izin peran; percobaan yang ditolak juga dicatat.
 * - Pemisahan tugas: Direksi (pemutus) tidak boleh merangkap Pemeriksa Keberatan (Kode Etik Pasal 21 angka 4);
 *   pembayaran Jumat disiapkan dan disetujui oleh dua orang Keuangan yang berbeda (maker-checker).
 * - Tidak seorang pun dapat mengubah peran dirinya sendiri.
 * - Data identitas (NIK) hanya untuk peran yang memerlukannya, dan selalu ditampilkan tersamar.
 *
 * Mitra PLS tidak termasuk di sini: di Kantor Maya, Mitra PLS hanya melihat akunnya sendiri dan data
 * jaringan yang diizinkan Syarat dan Ketentuan Pasal 23.
 */
import { EngineError } from "./engine";

export type Role =
  | "admin_sistem"
  | "kepatuhan"
  | "direksi"
  | "pemeriksa_keberatan"
  | "keuangan"
  | "layanan_pelanggan";

export type Permission =
  | "ikhtisar.lihat"
  | "tutup_bulan.lihat"
  | "pembayaran.lihat"
  | "pembayaran.siapkan"
  | "pembayaran.setujui"
  | "dana.lihat"
  | "mitra.lihat"
  | "mitra.lihat_identitas"
  | "kepatuhan.lihat"
  | "deteksi.lihat"
  | "kasus.lihat"
  | "kasus.buka"
  | "kasus.catat_penjelasan"
  | "kasus.putus"
  | "kasus.putus_keberatan"
  | "simulasi.jalankan"
  | "pengguna.kelola"
  | "audit.lihat"
  | "konten.tinjau";

export const ROLE_LABEL: Record<Role, string> = {
  admin_sistem: "Admin Sistem",
  kepatuhan: "Kepatuhan",
  direksi: "Direksi",
  pemeriksa_keberatan: "Pemeriksa Keberatan",
  keuangan: "Keuangan",
  layanan_pelanggan: "Layanan Pelanggan",
};

export const PERMISSION_LABEL: Record<Permission, string> = {
  "ikhtisar.lihat": "Lihat ikhtisar",
  "tutup_bulan.lihat": "Lihat tutup bulan dan plafon",
  "pembayaran.lihat": "Lihat pembayaran Jumat",
  "pembayaran.siapkan": "Siapkan berkas transfer",
  "pembayaran.setujui": "Setujui berkas transfer",
  "dana.lihat": "Lihat Pool Aktif dan Prestasi",
  "mitra.lihat": "Lihat daftar Mitra PLS",
  "mitra.lihat_identitas": "Lihat NIK (tersamar)",
  "kepatuhan.lihat": "Lihat ringkasan kepatuhan",
  "deteksi.lihat": "Lihat deteksi akun terkendali",
  "kasus.lihat": "Lihat kasus dan surat",
  "kasus.buka": "Buka kasus dan kirim pemberitahuan",
  "kasus.catat_penjelasan": "Catat penjelasan / tanpa penjelasan",
  "kasus.putus": "Putuskan sanksi",
  "kasus.putus_keberatan": "Putuskan keberatan",
  "simulasi.jalankan": "Jalankan simulasi",
  "pengguna.kelola": "Kelola pengguna dan peran",
  "audit.lihat": "Lihat log audit",
  "konten.tinjau": "Periksa dan setujui e-book Mitra PLS",
};

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin_sistem: [
    "ikhtisar.lihat",
    "simulasi.jalankan",
    "pengguna.kelola",
    "audit.lihat",
  ],
  kepatuhan: [
    "ikhtisar.lihat",
    "mitra.lihat",
    "mitra.lihat_identitas",
    "kepatuhan.lihat",
    "deteksi.lihat",
    "kasus.lihat",
    "kasus.buka",
    "kasus.catat_penjelasan",
    "audit.lihat",
    "konten.tinjau",
  ],
  direksi: [
    "ikhtisar.lihat",
    "tutup_bulan.lihat",
    "pembayaran.lihat",
    "dana.lihat",
    "mitra.lihat",
    "kepatuhan.lihat",
    "deteksi.lihat",
    "kasus.lihat",
    "kasus.putus",
    "simulasi.jalankan",
    "audit.lihat",
  ],
  pemeriksa_keberatan: ["kasus.lihat", "kasus.putus_keberatan", "audit.lihat"],
  keuangan: [
    "ikhtisar.lihat",
    "tutup_bulan.lihat",
    "pembayaran.lihat",
    "pembayaran.siapkan",
    "pembayaran.setujui",
    "dana.lihat",
    "mitra.lihat",
    "mitra.lihat_identitas",
  ],
  layanan_pelanggan: ["mitra.lihat", "kasus.lihat"],
};

/** Pasangan peran yang tidak boleh dirangkap satu orang. */
export const CONFLICTING_ROLES: [Role, Role, string][] = [
  [
    "direksi",
    "pemeriksa_keberatan",
    "Pemeriksa keberatan harus tidak terlibat dalam keputusan pertama (Kode Etik Pasal 21 angka 4)",
  ],
  [
    "kepatuhan",
    "pemeriksa_keberatan",
    "Pembuka kasus tidak boleh memeriksa keberatan atas kasus yang sama",
  ],
  [
    "admin_sistem",
    "keuangan",
    "Pengelola hak akses tidak boleh menyetujui pembayaran",
  ],
];

export interface StaffUser {
  id: string;
  name: string;
  title: string;
  roles: Role[];
  active: boolean;
}

export interface AuditEntry {
  at: number;
  userId: string;
  userName: string;
  action: string;
  permission?: Permission;
  allowed: boolean;
  detail?: string;
}

export class AccessError extends EngineError {
  override name = "AccessError";
}

export class AccessControl {
  readonly users = new Map<string, StaffUser>();
  readonly audit: AuditEntry[] = [];

  addUser(u: StaffUser): StaffUser {
    this.validateRoles(u.roles);
    this.users.set(u.id, { ...u, roles: [...u.roles] });
    return this.users.get(u.id)!;
  }

  user(id: string): StaffUser {
    const u = this.users.get(id);
    if (!u) throw new AccessError(`Pengguna ${id} tidak ditemukan`);
    return u;
  }

  /** Nama tampilan pelaku, dipakai di jejak kasus dan surat. */
  actorName(id: string): string {
    const u = this.user(id);
    return `${u.name} (${u.title})`;
  }

  permissions(userId: string): Set<Permission> {
    const u = this.users.get(userId);
    if (!u || !u.active) return new Set();
    return new Set(u.roles.flatMap((r) => ROLE_PERMISSIONS[r]));
  }

  can(userId: string, p: Permission): boolean {
    return this.permissions(userId).has(p);
  }

  /** Periksa izin, catat di log audit, dan lempar galat bila ditolak. */
  require(
    userId: string,
    p: Permission,
    action: string,
    at: number,
    detail?: string,
  ): void {
    const allowed = this.can(userId, p);
    const u = this.users.get(userId);
    this.audit.push({
      at,
      userId,
      userName: u?.name ?? userId,
      action,
      permission: p,
      allowed,
      detail,
    });
    if (!allowed)
      throw new AccessError(
        `Akses ditolak: ${PERMISSION_LABEL[p]} memerlukan peran ${this.rolesWith(
          p,
        )
          .map((r) => ROLE_LABEL[r])
          .join(" atau ")}`,
      );
  }

  /** Catat tindakan yang sudah diperiksa izinnya (mis. melihat halaman). */
  record(userId: string, action: string, at: number, detail?: string): void {
    const u = this.users.get(userId);
    this.audit.push({
      at,
      userId,
      userName: u?.name ?? userId,
      action,
      allowed: true,
      detail,
    });
  }

  rolesWith(p: Permission): Role[] {
    return (Object.keys(ROLE_PERMISSIONS) as Role[]).filter((r) =>
      ROLE_PERMISSIONS[r].includes(p),
    );
  }

  /** Ubah peran pengguna lain. */
  setRoles(
    byUserId: string,
    targetId: string,
    roles: Role[],
    at: number,
  ): void {
    this.require(
      byUserId,
      "pengguna.kelola",
      "Ubah peran",
      at,
      `${targetId}: ${roles.join(", ") || "(tanpa peran)"}`,
    );
    if (byUserId === targetId) {
      this.audit.push({
        at,
        userId: byUserId,
        userName: this.user(byUserId).name,
        action: "Ubah peran diri sendiri",
        allowed: false,
      });
      throw new AccessError(
        "Tidak dapat mengubah peran diri sendiri; minta Admin Sistem lain",
      );
    }
    try {
      this.validateRoles(roles);
    } catch (err) {
      this.audit.push({ at, userId: byUserId, userName: this.user(byUserId).name, action: 'Ubah peran (bentrok pemisahan tugas)', allowed: false, detail: `${targetId}: ${roles.join(', ')}` });
      throw err;
    }
    const t = this.user(targetId);
    const before = t.roles.join(", ") || "-";
    t.roles = [...roles];
    this.record(
      byUserId,
      "Peran diubah",
      at,
      `${t.name}: ${before} → ${roles.join(", ") || "-"}`,
    );
  }

  setActive(
    byUserId: string,
    targetId: string,
    active: boolean,
    at: number,
  ): void {
    this.require(
      byUserId,
      "pengguna.kelola",
      active ? "Aktifkan pengguna" : "Nonaktifkan pengguna",
      at,
      targetId,
    );
    if (byUserId === targetId)
      throw new AccessError("Tidak dapat menonaktifkan diri sendiri");
    this.user(targetId).active = active;
  }

  private validateRoles(roles: Role[]): void {
    for (const [a, b, why] of CONFLICTING_ROLES) {
      if (roles.includes(a) && roles.includes(b))
        throw new AccessError(
          `${ROLE_LABEL[a]} tidak boleh dirangkap dengan ${ROLE_LABEL[b]}: ${why}`,
        );
    }
  }
}

/** Samarkan NIK: 3171********0012. */
export function maskNik(nik: string): string {
  return nik.length === 16
    ? `${nik.slice(0, 4)}********${nik.slice(12)}`
    : "****";
}

export type PayoutStatus = "draf" | "disiapkan" | "disetujui";

export interface PayoutBatch {
  date: string;
  status: PayoutStatus;
  total: number;
  count: number;
  preparedBy?: string;
  preparedAt?: number;
  approvedBy?: string;
  approvedAt?: number;
}

/** Persetujuan berkas transfer Jumat dengan maker-checker. */
export class PayoutApprovals {
  private readonly batches = new Map<string, PayoutBatch>();

  constructor(private readonly access: AccessControl) {}

  get(date: string, total: number, count: number): PayoutBatch {
    const b = this.batches.get(date) ?? {
      date,
      status: "draf" as PayoutStatus,
      total,
      count,
    };
    // Nilai berkas mengikuti engine sampai disiapkan; sesudahnya dikunci.
    if (b.status === "draf") {
      b.total = total;
      b.count = count;
    }
    this.batches.set(date, b);
    return b;
  }

  prepare(
    date: string,
    total: number,
    count: number,
    userId: string,
    at: number,
  ): PayoutBatch {
    this.access.require(
      userId,
      "pembayaran.siapkan",
      "Siapkan berkas transfer",
      at,
      date,
    );
    const b = this.get(date, total, count);
    if (b.status !== "draf") throw new AccessError("Berkas sudah disiapkan");
    b.status = "disiapkan";
    b.preparedBy = userId;
    b.preparedAt = at;
    this.access.record(
      userId,
      "Berkas transfer disiapkan",
      at,
      `${date}: Rp${total.toLocaleString("id-ID")} (${count} entri)`,
    );
    return b;
  }

  approve(date: string, userId: string, at: number): PayoutBatch {
    this.access.require(
      userId,
      "pembayaran.setujui",
      "Setujui berkas transfer",
      at,
      date,
    );
    const b = this.batches.get(date);
    if (!b || b.status !== "disiapkan")
      throw new AccessError("Berkas belum disiapkan");
    if (b.preparedBy === userId) {
      this.access.audit.push({
        at,
        userId,
        userName: this.access.user(userId).name,
        action: "Setujui berkas sendiri",
        allowed: false,
        detail: date,
      });
      throw new AccessError(
        "Penyiap berkas tidak boleh menyetujui berkasnya sendiri (maker-checker)",
      );
    }
    b.status = "disetujui";
    b.approvedBy = userId;
    b.approvedAt = at;
    this.access.record(
      userId,
      "Berkas transfer disetujui",
      at,
      `${date}: Rp${b.total.toLocaleString("id-ID")}`,
    );
    return b;
  }
}

/** Staf contoh untuk demo (data sintetis). */
export function demoStaff(): StaffUser[] {
  return [
    {
      id: "u-hendra",
      name: "Hendra",
      title: "Admin Sistem",
      roles: ["admin_sistem"],
      active: true,
    },
    {
      id: "u-yusuf",
      name: "Yusuf",
      title: "Admin Sistem cadangan",
      roles: ["admin_sistem"],
      active: true,
    },
    {
      id: "u-rina",
      name: "Rina",
      title: "Kepatuhan",
      roles: ["kepatuhan"],
      active: true,
    },
    {
      id: "u-budi",
      name: "Budi",
      title: "Direktur",
      roles: ["direksi"],
      active: true,
    },
    {
      id: "u-sari",
      name: "Sari",
      title: "Komisaris",
      roles: ["pemeriksa_keberatan"],
      active: true,
    },
    {
      id: "u-dewi",
      name: "Dewi",
      title: "Keuangan",
      roles: ["keuangan"],
      active: true,
    },
    {
      id: "u-arif",
      name: "Arif",
      title: "Kepala Keuangan",
      roles: ["keuangan"],
      active: true,
    },
    {
      id: "u-nur",
      name: "Nur",
      title: "Layanan Pelanggan",
      roles: ["layanan_pelanggan"],
      active: true,
    },
  ];
}
