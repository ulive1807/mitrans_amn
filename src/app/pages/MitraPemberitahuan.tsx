import { useEffect, useState } from 'react';
import { CASE_STATUS_LABEL, SANCTION_LABEL, tanggal } from '../../engine';
import { LetterView } from '../components/Letter';
import { Badge, Panel } from '../components/ui';
import { useDemo } from '../store';
import { statusTone } from './AdminKasus';

/** Peringatan di atas Kantor Maya bila ada surat belum dibaca, kasus berjalan, pembekuan, atau pemutusan. */
export function StatusBanner({ accId, onOpen }: { accId: string; onOpen: () => void }) {
  const { engine, cases, now } = useDemo();
  const acc = engine.accounts.get(accId)!;
  const mine = cases.forAccount(accId);
  const unread = mine.flatMap((c) => c.letters).filter((l) => !l.readAt).length;
  const running = mine.filter((c) => !['final', 'ditutup_tanpa_sanksi'].includes(c.status));
  if (acc.terminated) return <div className="callout warn" style={{ marginBottom: 14 }}>Keanggotaan diputus sejak {tanggal(acc.terminatedAt!)}. Komisi yang sudah menjadi hak tetap dibayar, dan Anda berhak meminta pembelian kembali Lisensi yang belum diaktifkan (Kode Etik Pasal 15).</div>;
  const frozen = acc.frozenUntil && acc.frozenUntil > now;
  if (!unread && !running.length && !frozen) return null;
  return (
    <div className="callout warn" style={{ marginBottom: 14, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <span>
        {frozen ? `Keanggotaan dibekukan sampai ${tanggal(acc.frozenUntil!)}: tautan rujukan tidak dapat dipakai. ` : ''}
        {unread ? `${unread} surat belum dibaca. ` : ''}
        {running.length ? `${running.length} kasus Kode Etik sedang berjalan.` : ''}
      </span>
      <button className="btn-secondary" onClick={onOpen}>
        Buka pemberitahuan
      </button>
    </div>
  );
}

/** Surat dan tanggapan Mitra PLS: penjelasan (Pasal 21 angka 2) dan keberatan (Pasal 21 angka 4). */
export function Pemberitahuan({ accId }: { accId: string }) {
  const { cases, now, bump } = useDemo();
  const mine = cases.forAccount(accId);
  const [text, setText] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  // Surat dianggap dibaca saat halaman pemberitahuan dibuka (tanda terima elektronik).
  useEffect(() => {
    let changed = false;
    for (const c of mine) for (const l of c.letters) if (!l.readAt) (cases.markRead(c.id, l.number, now), (changed = true));
    if (changed) bump();
  }, [accId]); // eslint-disable-line react-hooks/exhaustive-deps
  const run = (fn: () => string) => {
    try {
      setMsg(fn());
      bump();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Gagal');
    }
  };
  if (mine.length === 0) {
    return (
      <Panel title="Pemberitahuan">
        <p className="muted" style={{ margin: 0 }}>
          Tidak ada surat. Surat resmi dari Perusahaan tentang Kode Etik selalu dikirim ke sini dan ke surel Anda. Perusahaan tidak pernah meminta kata sandi
          atau OTP.
        </p>
      </Panel>
    );
  }
  return (
    <>
      {msg && (
        <div className="callout info" style={{ marginBottom: 12 }}>
          {msg}
        </div>
      )}
      {mine.map((c) => (
        <Panel key={c.id} title={`Kasus ${c.id}`} hint={CASE_STATUS_LABEL[c.status]}>
          <p style={{ marginTop: 0 }}>
            <Badge tone={statusTone(c)}>{CASE_STATUS_LABEL[c.status]}</Badge>
            {c.applied.length > 0 && <span className="muted"> · Sanksi: {c.applied.map((s) => SANCTION_LABEL[s]).join('; ')}</span>}
          </p>
          {c.status === 'menunggu_penjelasan' && (
            <div style={{ marginBottom: 14 }}>
              <label htmlFor={`ex-${c.id}`} style={{ fontWeight: 600, fontSize: 13 }}>
                Penjelasan Anda (paling lambat {tanggal(c.explanationDue)})
              </label>
              <textarea id={`ex-${c.id}`} className="ta" value={text[c.id] ?? ''} onChange={(e) => setText({ ...text, [c.id]: e.target.value })} placeholder="Jelaskan kejadiannya dan sebutkan bukti pendukung." />
              <button className="btn-primary" style={{ marginTop: 8 }} onClick={() => run(() => (cases.submitExplanation(c.id, text[c.id] ?? '', now), 'Penjelasan terkirim. Keputusan paling lambat 14 hari lagi.'))}>
                Kirim penjelasan
              </button>
            </div>
          )}
          {c.status === 'masa_keberatan' && !c.objection && (
            <div style={{ marginBottom: 14 }}>
              <label htmlFor={`ob-${c.id}`} style={{ fontWeight: 600, fontSize: 13 }}>
                Keberatan (satu kali, paling lambat {tanggal(c.objectionDue!)})
              </label>
              <textarea id={`ob-${c.id}`} className="ta" value={text[c.id] ?? ''} onChange={(e) => setText({ ...text, [c.id]: e.target.value })} placeholder="Sampaikan alasan keberatan dan buktinya." />
              <button className="btn-primary" style={{ marginTop: 8 }} onClick={() => run(() => (cases.fileObjection(c.id, text[c.id] ?? '', now), 'Keberatan terkirim dan akan diperiksa pejabat yang tidak terlibat dalam keputusan pertama.'))}>
                Ajukan keberatan
              </button>
            </div>
          )}
          {[...c.letters].reverse().map((l) => (
            <LetterView key={l.number} letter={l} />
          ))}
        </Panel>
      ))}
    </>
  );
}
