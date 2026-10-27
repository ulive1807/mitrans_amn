import type { Letter } from '../../engine';
import { tanggal } from '../../engine';

/** Tampilan surat resmi; dapat dicetak atau disimpan sebagai PDF dari peramban. */
export function LetterView({ letter }: { letter: Letter }) {
  return (
    <article className="letter">
      <header>
        <div className="letter-co">PT MITRANS</div>
        <div className="muted">[alamat ●] · mitrans.id</div>
      </header>
      <div className="letter-meta">
        <span>Nomor: {letter.number}</span>
        <span>{tanggal(letter.issuedAt)}</span>
      </div>
      <h3>{letter.title}</h3>
      {letter.body.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      <footer className="muted">
        Dikirim melalui {letter.channels.join(' dan ')}
        {letter.readAt ? ` · dibaca ${tanggal(letter.readAt)}` : ' · belum dibaca'}
      </footer>
      <button className="btn-secondary no-print" onClick={() => printLetter(letter)}>
        Cetak / simpan PDF
      </button>
    </article>
  );
}

function esc(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
}

export function printLetter(letter: Letter) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${esc(letter.number)}</title>
<style>body{font-family:Georgia,serif;max-width:720px;margin:48px auto;padding:0 24px;line-height:1.6;color:#111}
h1{font-size:20px;margin:24px 0 12px}.meta{display:flex;justify-content:space-between;font-size:14px;border-bottom:1px solid #999;padding-bottom:8px}
.co{font-weight:700;font-size:18px;letter-spacing:.06em}</style></head><body>
<div class="co">PT MITRANS</div><div>[alamat ●] · mitrans.id</div>
<div class="meta"><span>Nomor: ${esc(letter.number)}</span><span>${esc(tanggal(letter.issuedAt))}</span></div>
<h1>${esc(letter.title)}</h1>${letter.body.map((p) => `<p>${esc(p)}</p>`).join('')}
</body></html>`);
  w.document.close();
  w.print();
}
