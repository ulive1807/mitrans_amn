import { describe, expect, it } from 'vitest';
import { claimsFromMetadata, normalizeIdentifier, safeNext } from '../src/engine/claims';

describe('Peran dari Clerk publicMetadata (fail-closed)', () => {
  it('peran sah dibaca', () => {
    expect(claimsFromMetadata({ roles: ['kepatuhan'] })).toEqual({ roles: ['kepatuhan'], mitraId: undefined, problems: [] });
  });
  it('tanpa metadata = tanpa akses', () => {
    expect(claimsFromMetadata(undefined).roles).toEqual([]);
    expect(claimsFromMetadata({}).roles).toEqual([]);
  });
  it('peran tidak dikenal diabaikan dan dilaporkan', () => {
    const c = claimsFromMetadata({ roles: ['superadmin', 'keuangan'] });
    expect(c.roles).toEqual(['keuangan']);
    expect(c.problems[0]).toMatch(/superadmin/);
  });
  it('rangkap peran terlarang menolak semua peran', () => {
    const c = claimsFromMetadata({ roles: ['direksi', 'pemeriksa_keberatan'] });
    expect(c.roles).toEqual([]);
    expect(c.problems[0]).toMatch(/tidak boleh dirangkap/);
  });
  it('roles bukan daftar ditolak', () => {
    expect(claimsFromMetadata({ roles: 'direksi' }).roles).toEqual([]);
  });
  it('mitraId divalidasi', () => {
    expect(claimsFromMetadata({ mitraId: 'M123' }).mitraId).toBe('M123');
    expect(claimsFromMetadata({ mitraId: '<script>' }).mitraId).toBeUndefined();
  });
});

describe('Identitas masuk', () => {
  it('surel dan nomor Indonesia', () => {
    expect(normalizeIdentifier(' Rina@Mitrans.ID ')).toEqual({ kind: 'email', value: 'rina@mitrans.id' });
    expect(normalizeIdentifier('0812-3456-7890')).toEqual({ kind: 'phone', value: '+6281234567890' });
    expect(normalizeIdentifier('+62 812 3456 7890')).toEqual({ kind: 'phone', value: '+6281234567890' });
    expect(normalizeIdentifier('12345')).toBeNull();
  });
});

describe('Tujuan setelah masuk', () => {
  it('hanya jalur di situs ini', () => {
    expect(safeNext('/admin')).toBe('/admin');
    expect(safeNext('/mitra?id=M1')).toBe('/mitra?id=M1');
    for (const bad of ['//evil.example', '/\\evil.example', 'https://evil.example', 'javascript:alert(1)', '/\nx', '', null, undefined])
      expect(safeNext(bad)).toBe('/');
  });
});
