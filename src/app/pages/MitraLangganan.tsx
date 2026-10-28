import { useMemo, useState } from "react";
import { EngineError, PLAN, REMINDER_LABEL, reminderFor } from "../../engine";
import { Kpi, Panel } from "../components/ui";
import { dateLabel, rp } from "../format";
import { useDemo } from "../store";

/** Pengingat tagihan di atas Kantor Maya (H-7 sampai sehari sesudah akses berakhir). */
export function ReminderBanner({
  accId,
  onOpen,
}: {
  accId: string;
  onOpen: () => void;
}) {
  const { engine, now, version } = useDemo();
  const r = useMemo(
    () => reminderFor(engine, accId, now),
    [engine, accId, now, version],
  );
  if (!r) return null;
  const urgent = r.stage === "H" || r.stage === "berakhir";
  return (
    <div
      className={`callout ${urgent ? "warn" : "info"}`}
      role="status"
      style={{
        marginBottom: 14,
        display: "flex",
        gap: 12,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <span>
        <b>Langganan · {REMINDER_LABEL[r.stage]}.</b> {r.message}
      </span>
      <button className="btn-secondary" onClick={onOpen}>
        Kelola Langganan
      </button>
    </div>
  );
}

/** Status akses, pembayaran Langganan (dari bonus atau kanal resmi), jadwal transfer, dan riwayat. */
export function Langganan({ accId }: { accId: string }) {
  const { engine, now, version, bump } = useDemo();
  const [agree, setAgree] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const acc = engine.accounts.get(accId)!;
  const price = PLAN.subscription.price;

  const data = useMemo(() => {
    const until = engine.accessUntil(accId);
    const pending = engine.pendingPayouts(accId);
    const detail = engine.bonusBalanceDetail(accId);
    const balance = detail.available;
    // Pratinjau alokasi potongan: Jumat terdekat lebih dulu, sama dengan engine.
    let left = price;
    const plan: { date: string; amount: number }[] = [];
    for (const r of pending) {
      if (left <= 0) break;
      const take = Math.min(left, Math.max(0, r.net - r.atRisk));
      if (take > 0) {
        plan.push({ date: r.date, amount: take });
        left -= take;
      }
    }
    const history = [...engine.sales.values()]
      .filter((s) => s.kind === "subscription" && s.buyerId === accId)
      .sort((a, b) => b.at - a.at);
    return {
      until,
      pending,
      balance,
      detail,
      plan,
      history,
      reminder: reminderFor(engine, accId, now),
    };
  }, [engine, accId, now, price, version]);

  if (data.until === undefined)
    return (
      <div className="callout info">
        Belum memegang Lisensi. Langganan tersedia setelah Lisensi diaktifkan.
      </div>
    );

  const active = data.until > now;
  const aheadTooFar =
    data.until - now > PLAN.subscription.periodDays * 86_400_000;
  const enough = data.balance >= price;
  // Alasan tombol tidak aktif: dihitung sistem, tombol hanya berfungsi bila semuanya terpenuhi.
  const blockers: string[] = [];
  if (acc.terminated) blockers.push("Keanggotaan sudah diputus.");
  if (aheadTooFar) blockers.push("Langganan periode berikutnya sudah dibayar (paling banyak satu periode di muka).");
  if (!enough) {
    blockers.push(`Saldo bonus yang aman dipakai ${rp(data.balance)}, kurang dari ${rp(price)}.`);
    if (data.detail.atRisk > 0)
      blockers.push(`${rp(data.detail.atRisk)} berasal dari penjualan yang masih dalam masa pembatalan ${PLAN.bonusSafetyDays} hari, sehingga belum dihitung.`);
    if (data.detail.outstanding > 0) blockers.push(`Masih ada piutang penarikan bonus ${rp(data.detail.outstanding)}.`);
    if (data.detail.shortfall > 0) blockers.push(`Masih ada kekurangan transfer sebelumnya ${rp(data.detail.shortfall)}.`);
  }
  const canPay = blockers.length === 0 && agree;

  const pay = () => {
    try {
      const sale = engine.paySubscriptionFromBonus({
        saleId: `SB-${accId}-${data.history.length + 1}`,
        accountId: accId,
        at: now,
      });
      setMsg({
        ok: true,
        text: `Langganan dibayar dari bonus. Akses aktif sampai ${dateLabel(sale.periodEnd! - 1)}; ${rp(price)} dipotong dari transfer ${data.plan.map((p) => dateLabel(p.date)).join(" dan ")}.`,
      });
      setAgree(false);
    } catch (err) {
      setMsg({
        ok: false,
        text: err instanceof EngineError ? err.message : "Pembayaran gagal.",
      });
    }
    bump();
  };

  return (
    <>
      {msg && (
        <div
          className={`callout ${msg.ok ? "info" : "warn"}`}
          role="status"
          style={{ marginBottom: 12 }}
        >
          {msg.text}
        </div>
      )}
      <div className="kpis">
        <Kpi
          label="Akses aplikasi"
          value={active ? "Aktif" : "Berakhir"}
          sub={`${active ? "sampai" : "sejak"} ${dateLabel(data.until - 1)}`}
        />
        <Kpi
          label="Tagihan berikutnya"
          value={rp(price)}
          sub={`Jatuh tempo ${dateLabel(data.until)} · 30 hari`}
        />
        <Kpi
          label="Bonus aman dipakai"
          value={rp(data.balance)}
          sub={`Dari ${rp(data.detail.pending)} belum ditransfer, setelah PPh 21`}
        />
      </div>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <Panel
          title="Bayar dari bonus"
          hint="Dipotong dari transfer Jumat terdekat"
        >
          {blockers.length ? (
            <div className="callout warn" role="status">
              <b>Tombol tidak aktif.</b>
              <ul style={{ margin: "6px 0 0 18px" }}>
                {blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              {!aheadTooFar && !acc.terminated && <div style={{ marginTop: 6 }}>Silakan bayar di atlastrade.io, halaman pembayaran resmi Perusahaan.</div>}
            </div>
          ) : (
            <>
              <p>
                {rp(price)} akan dipotong dari transfer{" "}
                {data.plan.map((p) => `${dateLabel(p.date)} (${rp(p.amount)})`).join(" dan ")}. Akses diperpanjang 30 hari{" "}
                {active ? `sejak ${dateLabel(data.until)}` : "sejak hari ini"}.
              </p>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 10 }}>
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 3 }} />
                <span>Saya setuju {rp(price)} dipotong dari bonus saya yang belum ditransfer untuk membayar Langganan 30 hari.</span>
              </label>
            </>
          )}
          <button
            className="btn-primary"
            style={{ marginTop: 12 }}
            disabled={!canPay}
            aria-disabled={!canPay}
            title={blockers.length ? blockers.join(" ") : agree ? undefined : "Centang persetujuan terlebih dahulu"}
            onClick={() => canPay && pay()}
          >
            Bayar {rp(price)} dari bonus
          </button>
          <p className="muted" style={{ marginTop: 10, fontSize: 12.5 }}>
            Pilihan, bukan kewajiban. Dipotong dari bonus setelah PPh 21; bonus
            bruto dan PPh 21-nya tidak berubah, yang berkurang hanya nilai transfer. Plan B atas Langganan
            ini tetap dihitung untuk upline seperti pembayaran biasa (S&amp;K Pasal 21
            angka 7).
          </p>
        </Panel>
        <Panel
          title="Bayar di atlastrade.io"
          hint="Halaman pembayaran atlastrade.io"
        >
          <p>
            Bayar di atlastrade.io, halaman pembayaran resmi Perusahaan, dengan
            akun yang sama. Jangan membayar melalui rekening pribadi siapa pun.
          </p>
          <button className="btn-secondary" disabled style={{ marginTop: 10 }}>
            Bayar {rp(price)}
          </button>
          <p className="muted" style={{ marginTop: 8, fontSize: 12.5 }}>
            Prototipe: atlastrade.io belum disambungkan; pembayaran dari sana dicatat lewat webhook.
          </p>
        </Panel>
      </div>

      <Panel
        title="Jadwal transfer bonus yang akan datang"
        hint="Bonus yang sudah ditetapkan"
      >
        {data.pending.length ? (
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Jumat</th>
                  <th className="r">Bonus bruto</th>
                  <th className="r">Penarikan</th>
                  <th className="r">PPh 21</th>
                  <th className="r">Potongan Langganan</th>
                  <th className="r">Ditransfer</th>
                </tr>
              </thead>
              <tbody>
                {data.pending.map((r) => (
                  <tr key={r.date}>
                    <td>{dateLabel(r.date)}</td>
                    <td className="r num">{rp(r.gross)}</td>
                    <td className="r num">{r.clawback ? `−${rp(r.clawback)}` : "–"}</td>
                    <td className="r num">−{rp(r.tax)}</td>
                    <td className="r num">
                      {r.deducted ? `−${rp(r.deducted)}` : "–"}
                    </td>
                    <td className="r num">{rp(r.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">
            Belum ada bonus yang dijadwalkan untuk Jumat mendatang.
          </p>
        )}
      </Panel>

      <Panel
        title="Riwayat Langganan"
        hint={`${data.history.length} pembayaran`}
      >
        {data.history.length ? (
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Dibayar</th>
                  <th>Periode akses</th>
                  <th>Cara bayar</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.history.slice(0, 24).map((s) => (
                  <tr key={s.id}>
                    <td>{dateLabel(s.at)}</td>
                    <td>
                      {dateLabel(s.periodStart!)} –{" "}
                      {dateLabel(s.periodEnd! - 1)}
                    </td>
                    <td>
                      {s.paidFrom === "bonus" ? "Potong bonus" : "Kanal resmi"}
                    </td>
                    <td>{s.cancelled ? "Dibatalkan" : "Lunas"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">
            Belum ada pembayaran Langganan. 30 hari pertama sudah termasuk
            Lisensi.
          </p>
        )}
      </Panel>

      <Panel
        title="Pengingat tagihan"
        hint="H-7, H-3, H-1, hari jatuh tempo, dan sehari sesudah akses berakhir"
      >
        <p>
          Pengingat selalu tampil di Kantor Maya. Pengingat lewat surel atau
          WhatsApp hanya dikirim bila Anda menyetujuinya, dan dapat dihentikan
          kapan saja.
        </p>
        <p className="muted" style={{ marginTop: 8, fontSize: 12.5 }}>
          Prototipe: pengiriman surel/WhatsApp belum disambungkan ke penyedia
          pesan.
          {data.reminder
            ? ` Status saat ini: ${REMINDER_LABEL[data.reminder.stage]}.`
            : " Tidak ada tagihan dalam 7 hari ke depan."}
        </p>
      </Panel>
    </>
  );
}
