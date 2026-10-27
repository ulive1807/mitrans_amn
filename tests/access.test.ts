import { beforeEach, describe, expect, it } from 'vitest';
import { AccessControl, AccessError, PayoutApprovals, demoStaff, maskNik } from '../src/engine/access';

let ac: AccessControl;
const T = Date.parse('2026-11-01T02:00:00Z');
beforeEach(() => {
  ac = new AccessControl();
  for (const u of demoStaff()) ac.addUser(u);
});

describe('Izin per peran', () => {
  it('Kepatuhan dapat membuka kasus tetapi tidak memutus', () => {
    expect(ac.can('u-rina', 'kasus.buka')).toBe(true);
    expect(ac.can('u-rina', 'kasus.putus')).toBe(false);
  });
  it('Admin Sistem tidak dapat memutus kasus atau menyetujui pembayaran', () => {
    expect(ac.can('u-hendra', 'kasus.putus')).toBe(false);
    expect(ac.can('u-hendra', 'pembayaran.setujui')).toBe(false);
  });
  it('percobaan yang ditolak dicatat di log audit', () => {
    expect(() => ac.require('u-nur', 'kasus.putus', 'Putuskan KS-0001', T)).toThrow(AccessError);
    expect(ac.audit.at(-1)).toMatchObject({ userId: 'u-nur', allowed: false, permission: 'kasus.putus' });
  });
  it('pengguna nonaktif tidak punya izin', () => {
    ac.setActive('u-hendra', 'u-dewi', false, T);
    expect(ac.can('u-dewi', 'pembayaran.lihat')).toBe(false);
  });
});

describe('Pemisahan tugas', () => {
  it('Direksi tidak boleh merangkap Pemeriksa Keberatan', () => {
    expect(() => ac.setRoles('u-hendra', 'u-budi', ['direksi', 'pemeriksa_keberatan'], T)).toThrow(/Pasal 21 angka 4/);
    expect(ac.audit.at(-1)).toMatchObject({ allowed: false, action: 'Ubah peran (bentrok pemisahan tugas)' });
  });
  it('tidak dapat mengubah peran diri sendiri', () => {
    expect(() => ac.setRoles('u-hendra', 'u-hendra', ['admin_sistem', 'direksi'], T)).toThrow(/diri sendiri/);
    expect(ac.audit.some((a) => a.action === 'Ubah peran diri sendiri' && !a.allowed)).toBe(true);
  });
  it('Admin Sistem lain dapat mengubah peran dan tercatat', () => {
    ac.setRoles('u-yusuf', 'u-nur', ['layanan_pelanggan', 'kepatuhan'], T);
    expect(ac.can('u-nur', 'kasus.buka')).toBe(true);
    expect(ac.audit.at(-1)!.detail).toMatch(/layanan_pelanggan → layanan_pelanggan, kepatuhan/);
  });
  it('maker-checker: penyiap tidak boleh menyetujui berkasnya sendiri', () => {
    const pa = new PayoutApprovals(ac);
    pa.prepare('2026-11-06', 5_000_000, 12, 'u-dewi', T);
    expect(() => pa.approve('2026-11-06', 'u-dewi', T)).toThrow(/maker-checker/);
    expect(() => pa.approve('2026-11-06', 'u-budi', T)).toThrow(/Akses ditolak/);
    expect(pa.approve('2026-11-06', 'u-arif', T).status).toBe('disetujui');
  });
});

describe('Data identitas', () => {
  it('NIK selalu tersamar', () => {
    expect(maskNik('3171000000000012')).toBe('3171********0012');
  });
});
