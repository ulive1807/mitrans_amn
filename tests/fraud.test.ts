import { beforeEach, describe, expect, it } from 'vitest';
import { ControlDetector, STRONG_SCORE } from '../src/engine/fraud';
import { MitransEngine } from '../src/engine/engine';
import { PLAN } from '../src/engine/plan';
import { atWib } from '../src/engine/time';
import { demoScenario, runScenario, syntheticNik } from '../src/engine/simulation';

describe('Skor keterkaitan akun', () => {
  const d = new ControlDetector();
  d.addSignal('A', 'bank', 'BCA 123-456-789');
  d.addSignal('A', 'address', 'Jl. Melati No. 5, Bandung');
  d.addSignal('A', 'device', 'dev-1');
  d.addSignal('A', 'phone', '0812 1111 2222');
  d.addSignal('B', 'bank', 'bca123456789'); // format berbeda, rekening sama
  d.addSignal('K', 'address', 'jl melati no 5 bandung'); // keluarga serumah
  d.addSignal('K', 'ip', '10.0.0.1');
  d.addSignal('A', 'ip', '10.0.0.1');
  d.addSignal('P', 'phone', '+62 812-1111-2222');
  d.addSignal('X', 'device', 'dev-1');
  d.addSignal('X', 'address', 'Jl. Melati No. 5 Bandung');

  it('rekening sama (setelah normalisasi) = kuat', () => {
    const r = d.link('A', 'B');
    expect(r.kinds).toEqual(['bank']);
    expect(r.score).toBeGreaterThanOrEqual(STRONG_SCORE);
  });
  it('keluarga serumah (alamat + IP) tidak ditandai', () => {
    const r = d.link('A', 'K');
    expect(r.kinds.sort()).toEqual(['address', 'ip']);
    expect(r.score).toBeLessThan(0.5);
  });
  it('nomor telepon dinormalisasi 0812 = +62812', () => {
    expect(d.link('A', 'P').kinds).toEqual(['phone']);
  });
  it('perangkat + alamat = sedang (perlu dilihat, bukan pemeriksaan otomatis)', () => {
    const r = d.link('A', 'X');
    expect(r.score).toBeGreaterThanOrEqual(0.5);
    expect(r.score).toBeLessThan(STRONG_SCORE);
  });
  it('klaster akun terkait kuat', () => {
    expect(d.clusters().some((c) => c.includes('A') && c.includes('B') && c.includes('P'))).toBe(true);
    expect(d.clusters().some((c) => c.includes('K'))).toBe(false);
  });
});

describe('Pemeriksaan dan konfirmasi di engine', () => {
  let e: MitransEngine;
  const jan = (d: number) => atWib(`2027-01-${String(d).padStart(2, '0')}`, 10);
  beforeEach(() => {
    e = new MitransEngine(atWib('2027-01-01', 0, 1));
    e.registerMitra({ id: 'A', name: 'A', nik: syntheticNik(1), sponsorId: 'MITRANS-002', at: jan(2) });
    e.passQuiz('A');
    e.purchaseLicense({ saleId: 'LA', buyerId: 'A', at: jan(2) });
    e.registerPelanggan({ id: 'P', name: 'P', nik: syntheticNik(2), sellerId: 'A', at: jan(5) });
    e.purchaseLicense({ saleId: 'LP', buyerId: 'P', at: jan(5) });
  });
  const sponsor = () => e.entriesFor('A').find((x) => x.type === 'SPONSOR' && x.saleId === 'LP')!;

  it('pemeriksaan menunda Bonus Sponsor; ditolak -> dibayar tutup bulan berikutnya', () => {
    e.openReview('LP', jan(6), 'Rekening bank sama');
    e.closeThrough('2027-01');
    expect(sponsor().status).toBe('held');
    expect(sponsor().reviewHold).toBe(true);
    expect(e.isActive('A', '2027-01')).toBe(true); // praduga tak bersalah: tetap dihitung selama diperiksa
    e.dismissReview('LP', atWib('2027-02-03', 10));
    e.closeThrough('2027-02');
    expect(sponsor().status).toBe('payable');
    expect(sponsor().note).toMatch(/tanpa pelanggaran/);
  });

  it('tanpa keputusan dalam 30 hari, bonus dibayar (Kode Etik Pasal 9 angka 2)', () => {
    e.openReview('LP', jan(6), 'Perangkat sama');
    e.closeThrough('2027-02');
    expect(sponsor().status).toBe('payable');
    expect(sponsor().note).toMatch(/30 hari/);
  });

  it('konfirmasi sebelum tutup bulan: bonus ditarik dan penjualan tidak dihitung', () => {
    e.openReview('LP', jan(6), 'Rekening bank sama');
    const r = e.confirmControlled('LP', jan(20));
    expect(sponsor().status).toBe('clawback');
    expect(e.personalSales('2027-01').get('A')).toBe(0);
    expect(r.activeRevoked).toBe(false);
    e.closeThrough('2027-01');
    expect(e.isActive('A', '2027-01')).toBe(false);
  });

  it('konfirmasi setelah tutup bulan mencabut status aktif dan menarik Pool Aktif bulan itu', () => {
    e.openReview('LP', jan(6), 'Rekening bank sama');
    e.closeThrough('2027-01');
    const pool = e.entriesFor('A').filter((x) => x.type === 'POOL_AKTIF' && x.status === 'payable').reduce((a, x) => a + x.amount, 0);
    expect(pool).toBeGreaterThan(0);
    const r = e.confirmControlled('LP', atWib('2027-02-05', 10));
    expect(r.activeRevoked).toBe(true);
    expect(e.isActive('A', '2027-01')).toBe(false);
    expect(r.clawedBack).toBe(pool); // Bonus Sponsor masih ditunda, sehingga hanya Pool Aktif yang sudah dibayar
    expect(sponsor().status).toBe('clawback');
  });

  it('pembatalan setelah konfirmasi tidak menarik dua kali', () => {
    e.openReview('LP', jan(6), 'x');
    e.confirmControlled('LP', jan(7));
    const before = e.ledger.length;
    e.refundSale('LP', jan(8));
    expect(e.ledger.length).toBe(before);
  });
});

describe('Detektor pada data demo sintetis', () => {
  const res = runScenario(demoScenario());
  const flags = res.detector!.scan(res.engine);
  const strong = flags.filter((f) => f.level === 'kuat');
  const truth = res.truth!;
  it('semua pembelian oleh akun terkendali tertangkap sebagai kuat', () => {
    const controlled = [...truth].filter(([, t]) => t === 'controlled').map(([id]) => id);
    expect(controlled.length).toBeGreaterThan(0);
    const caught = controlled.filter((id) => strong.some((f) => f.saleId === id) || res.engine.sales.get(id)!.cancelled);
    expect(caught.length).toBe(controlled.length);
  });
  it('tidak ada keluarga serumah yang ditandai kuat', () => {
    const family = [...truth].filter(([, t]) => t === 'family').map(([id]) => id);
    expect(family.length).toBeGreaterThan(0);
    expect(strong.filter((f) => family.includes(f.saleId))).toHaveLength(0);
  });
  it('plafon tetap aman', () => {
    for (const r of res.reports) expect(r.planAPaid - r.rankPaidFromReserve).toBeLessThanOrEqual(r.planACap);
    expect(PLAN.activeMinPersonalSales).toBe(1);
  });
});
