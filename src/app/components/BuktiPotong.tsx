import { maskNik, type BuktiPotong } from "../../engine";
import { dateLabel, monthLabel, rp } from "../format";

const esc = (s: string) =>
  s.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  );

/** Rincian pemotongan PPh 21 untuk Mitra PLS (bukan formulir resmi DJP). NIK selalu tersamar di layar. */
export function BuktiPotongView({ b }: { b: BuktiPotong }) {
  return (
    <div className="letter">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <b>PT MITRANS · Rincian Pemotongan PPh Pasal 21</b>
        <span className="muted">
          {b.final ? "Masa pajak selesai" : "Sementara: masa pajak berjalan"}
        </span>
      </div>
      <dl className="kv" style={{ marginTop: 10 }}>
        <dt>Nomor internal</dt>
        <dd>{b.number}</dd>
        <dt>Masa pajak</dt>
        <dd>{monthLabel(b.month, true)}</dd>
        <dt>Penerima</dt>
        <dd>
          {b.name} · NIK {maskNik(b.nik)}
          {b.withoutNpwp ? " · tanpa NPWP (tarif 20% lebih tinggi)" : ""}
        </dd>
        <dt>Status penerima</dt>
        <dd>
          Bukan pegawai: distributor penjualan langsung · kode objek pajak{" "}
          {b.objectCode}
        </dd>
      </dl>
      <div className="table-wrap" style={{ marginTop: 10 }}>
        <table className="t">
          <thead>
            <tr>
              <th>Jumat transfer</th>
              <th className="r">Bonus bruto</th>
              <th className="r">Penarikan</th>
              <th className="r">Bruto kena pajak</th>
              <th className="r">DPP (50%)</th>
              <th className="r">PPh 21</th>
            </tr>
          </thead>
          <tbody>
            {b.lines.map((l) => (
              <tr key={l.date}>
                <td>{dateLabel(l.date)}</td>
                <td className="r num">{rp(l.gross)}</td>
                <td className="r num">
                  {l.clawback ? `−${rp(l.clawback)}` : "–"}
                </td>
                <td className="r num">{rp(l.taxable)}</td>
                <td className="r num">{rp(l.dpp)}</td>
                <td className="r num">{rp(l.tax)}</td>
              </tr>
            ))}
            <tr>
              <td>
                <b>Jumlah</b>
              </td>
              <td className="r num">{rp(b.gross)}</td>
              <td className="r num">
                {b.clawback ? `−${rp(b.clawback)}` : "–"}
              </td>
              <td className="r num">{rp(b.taxable)}</td>
              <td className="r num">{rp(b.dpp)}</td>
              <td className="r num">
                <b>{rp(b.tax)}</b>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ marginTop: 10, fontSize: 12.5 }}>
        PPh 21 = 50% bruto × tarif Pasal 17 ayat (1) huruf a UU PPh (PMK
        168/2023), lapisan tarif atas bruto bulan berjalan. Rincian ini bukan
        bukti potong resmi; bukti potong BP21 diterbitkan Perusahaan melalui
        Coretax DJP dan dapat dipakai sebagai kredit pajak di SPT Tahunan.
      </p>
    </div>
  );
}

export function printBuktiPotong(b: BuktiPotong) {
  const w = window.open("", "_blank");
  if (!w) return;
  const row = (cells: string[]) =>
    `<tr>${cells.map((c, i) => `<td${i ? ' class="r"' : ""}>${c}</td>`).join("")}</tr>`;
  w.document
    .write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${esc(b.number)}</title>
<style>body{font-family:Georgia,serif;max-width:760px;margin:40px auto;padding:0 24px;line-height:1.5;color:#111}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:12px}td,th{border-bottom:1px solid #ccc;padding:6px 4px;text-align:left}.r{text-align:right}
.co{font-weight:700;font-size:18px;letter-spacing:.06em}.muted{color:#555;font-size:12px}</style></head><body>
<div class="co">PT MITRANS</div><div>[alamat ●] · NPWP [●] · mitrans.id</div>
<h2 style="font-size:18px">Rincian Pemotongan PPh Pasal 21 · ${esc(monthLabel(b.month, true))}</h2>
<p>Nomor internal: ${esc(b.number)}${b.final ? "" : " (sementara)"}<br>Penerima: ${esc(b.name)} · NIK ${esc(maskNik(b.nik))}<br>
Status: bukan pegawai, distributor penjualan langsung · kode objek pajak ${esc(b.objectCode)}</p>
<table><thead><tr><th>Jumat transfer</th><th class="r">Bonus bruto</th><th class="r">Penarikan</th><th class="r">Bruto kena pajak</th><th class="r">DPP (50%)</th><th class="r">PPh 21</th></tr></thead><tbody>
${b.lines.map((l) => row([dateLabel(l.date), rp(l.gross), l.clawback ? `−${rp(l.clawback)}` : "–", rp(l.taxable), rp(l.dpp), rp(l.tax)])).join("")}
${row(["<b>Jumlah</b>", rp(b.gross), b.clawback ? `−${rp(b.clawback)}` : "–", rp(b.taxable), rp(b.dpp), `<b>${rp(b.tax)}</b>`])}
</tbody></table>
<p class="muted">Rincian ini bukan bukti potong resmi. Bukti potong BP21 diterbitkan melalui Coretax DJP.</p>
</body></html>`);
  w.document.close();
  w.print();
}
