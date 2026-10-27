import { useMemo, useState } from "react";
import { BONUS_LABEL } from "../../engine";
import { BuktiPotongView, printBuktiPotong } from "../components/BuktiPotong";
import { Kpi, Panel } from "../components/ui";
import { dateLabel, monthLabel, rp } from "../format";
import { useDemo } from "../store";

/** PPh 21 per masa pajak dan penarikan bonus (clawback) milik Mitra PLS sendiri. */
export function Pajak({ accId }: { accId: string }) {
  const { engine, version } = useDemo();
  const data = useMemo(() => {
    const lines = engine.payoutSchedule(accId);
    const months = [...new Set(lines.map((l) => l.date.slice(0, 7)))]
      .sort()
      .reverse();
    const year = engine.today.slice(0, 4);
    const ytd = lines.filter(
      (l) => l.date.startsWith(year) && l.date <= engine.today,
    );
    return {
      months,
      claws: engine.clawbackStatus(accId),
      outstanding: engine.clawbackOutstanding(accId),
      taxYtd: ytd.reduce((a, l) => a + l.tax, 0),
      taxableYtd: ytd.reduce((a, l) => a + l.taxable, 0),
      year,
    };
  }, [engine, accId, version]);
  const [want, setMonth] = useState<string | undefined>();
  const month = want && data.months.includes(want) ? want : data.months[0];
  const b = month ? engine.buktiPotong(accId, month) : undefined;

  return (
    <>
      <div className="kpis">
        <Kpi
          label={`Bruto kena pajak ${data.year}`}
          value={rp(data.taxableYtd)}
          sub="Sudah ditransfer, setelah penarikan"
        />
        <Kpi
          label={`PPh 21 dipotong ${data.year}`}
          value={rp(data.taxYtd)}
          sub="Kredit pajak di SPT Tahunan"
        />
        <Kpi
          label="Piutang penarikan"
          value={rp(data.outstanding)}
          sub="Dipotong dari bonus berikutnya"
        />
      </div>

      <Panel
        title="Rincian pemotongan PPh 21"
        hint={
          data.months.length ? (
            <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                aria-label="Masa pajak"
              >
                {data.months.map((m) => (
                  <option key={m} value={m}>
                    {monthLabel(m, true)}
                  </option>
                ))}
              </select>
              {b && (
                <button
                  className="btn-secondary"
                  onClick={() => printBuktiPotong(b)}
                >
                  Cetak
                </button>
              )}
            </span>
          ) : undefined
        }
      >
        {b ? (
          <BuktiPotongView b={b} />
        ) : (
          <p className="muted">
            Belum ada transfer bonus, sehingga belum ada pemotongan PPh 21.
          </p>
        )}
      </Panel>

      <Panel
        title="Penarikan bonus (clawback)"
        hint="Atas pembelian yang dibatalkan atau dikembalikan · S&K Pasal 7"
      >
        {data.claws.length ? (
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Jenis</th>
                  <th>Keterangan</th>
                  <th className="r">Nominal</th>
                  <th>Dipotong dari transfer</th>
                  <th className="r">Sisa piutang</th>
                </tr>
              </thead>
              <tbody>
                {data.claws.map((c) => (
                  <tr key={c.entry.id}>
                    <td>{dateLabel(c.entry.accruedAt)}</td>
                    <td>{BONUS_LABEL[c.entry.type]}</td>
                    <td style={{ fontSize: 12.5 }}>{c.entry.note}</td>
                    <td className="r num">{rp(c.amount)}</td>
                    <td>
                      {c.offsets.length
                        ? c.offsets
                            .map(
                              (o) => `${dateLabel(o.date)} (${rp(o.amount)})`,
                            )
                            .join(", ")
                        : "Belum ada transfer"}
                    </td>
                    <td className="r num">
                      {c.outstanding ? rp(c.outstanding) : "Lunas"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Tidak ada penarikan bonus.</p>
        )}
        <p className="muted" style={{ marginTop: 10, fontSize: 12.5 }}>
          Penarikan dipotong dari transfer Jumat berikutnya dan mengurangi bruto
          kena pajak transfer itu, sehingga PPh 21 ikut berkurang. Sisa yang
          belum terpotong tetap menjadi piutang dan tidak dapat dipakai untuk
          membayar Langganan dari bonus.
        </p>
      </Panel>
    </>
  );
}
