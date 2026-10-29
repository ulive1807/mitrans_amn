import { useState } from "react";
import {
  EngineError,
  QUIZ,
  coolingOffEnds,
  takeQuiz,
  validateBankAccount,
} from "../../engine";
import { Badge, Panel } from "../components/ui";
import { dateLabel } from "../format";
import { useDemo } from "../store";

/** Kuis Kode Etik, data rekening atas nama sendiri, dan masa pertimbangan 10 hari kerja. */
export function KuisRekening({ accId }: { accId: string }) {
  const { engine, now, access, staffId, bump } = useDemo();
  const acc = engine.accounts.get(accId)!;
  const [ans, setAns] = useState<Record<string, number>>({});
  const [wrong, setWrong] = useState<{ id: string; basis: string }[] | null>(
    null,
  );
  const [bank, setBank] = useState({
    bank: acc.bank?.bank ?? "",
    number: "",
    holder: acc.bank?.holder ?? acc.name,
  });
  const [bankMsg, setBankMsg] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const since = acc.mitraSince ?? acc.joinedAt;
  const ends = coolingOffEnds(since);
  const inCooling = ends >= engine.today;

  const submitQuiz = () => {
    const r = takeQuiz(engine, accId, ans);
    setWrong(r.wrong);
    if (r.passed)
      access.record(staffId || accId, "Lulus kuis Kode Etik", now, accId);
    bump();
  };
  const saveBank = () => {
    try {
      acc.bank = validateBankAccount(acc.name, bank, now);
      setBankMsg({
        ok: true,
        text: `Rekening ${acc.bank.bank} ****${acc.bank.number.slice(-4)} disimpan.`,
      });
      setBank({ ...bank, number: "" });
    } catch (e) {
      setBankMsg({
        ok: false,
        text:
          e instanceof EngineError ? e.message : "Gagal menyimpan rekening.",
      });
    }
    bump();
  };

  return (
    <>
      <div
        className="callout info"
        style={{ marginBottom: 14 }}
      >
        {inCooling ? (
          <>
            <b>Masa pertimbangan</b> berlangsung sampai <b>{dateLabel(ends)}</b>{" "}
            (10 hari kerja sejak pendaftaran). Selama masa ini Anda dapat
            membatalkan keanggotaan tanpa alasan, dan Lisensi yang dibeli serta
            belum diaktifkan dikembalikan dananya 100%.
          </>
        ) : (
          <>
            Masa pertimbangan 10 hari kerja sudah berakhir pada{" "}
            {dateLabel(ends)}.
          </>
        )}
      </div>
      <div className="row2">
        <Panel
          title="Kuis Kode Etik"
          hint={
            acc.quizPassed
              ? "Lulus · tautan rujukan aktif"
              : `${QUIZ.length} pertanyaan · tanpa biaya · dapat diulang`
          }
        >
          {acc.quizPassed ? (
            <div className="callout info">
              <Badge tone="good">✓ Lulus</Badge> Tautan rujukan Anda aktif:{" "}
              <span className="num">
                https://affiliatemarketing.network/r/{acc.code}
              </span>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {QUIZ.map((q, i) => {
                const miss = wrong?.find((w) => w.id === q.id);
                return (
                  <fieldset
                    key={q.id}
                    style={{ border: 0, padding: 0, margin: 0 }}
                  >
                    <legend style={{ fontWeight: 600, marginBottom: 6 }}>
                      {i + 1}. {q.text}
                    </legend>
                    {q.options.map((o, k) => (
                      <label
                        key={k}
                        className="check"
                        style={{ padding: "4px 0" }}
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          id={`q-${q.id}-${k}`}
                          checked={ans[q.id] === k}
                          onChange={() => setAns({ ...ans, [q.id]: k })}
                        />
                        <span>{o}</span>
                      </label>
                    ))}
                    {miss && (
                      <div className="field">
                        <div className="err">
                          Belum tepat. Baca kembali {miss.basis}.
                        </div>
                      </div>
                    )}
                  </fieldset>
                );
              })}
              <button
                className="btn-primary"
                onClick={submitQuiz}
                disabled={Object.keys(ans).length < QUIZ.length}
              >
                Kirim jawaban
              </button>
              {wrong && wrong.length > 0 && (
                <div className="callout warn" role="status">
                  {wrong.length} jawaban belum tepat. Perbaiki lalu kirim lagi.
                </div>
              )}
            </div>
          )}
        </Panel>
        <Panel
          title="Rekening transfer bonus"
          hint="Wajib atas nama sendiri (Kode Etik Pasal 4)"
        >
          {acc.bank && (
            <p style={{ marginBottom: 10 }}>
              Tersimpan: <b>{acc.bank.bank}</b> ****{acc.bank.number.slice(-4)}{" "}
              a.n. {acc.bank.holder} · {dateLabel(acc.bank.savedAt)}
            </p>
          )}
          <div style={{ display: "grid", gap: 12 }}>
            <div className="field">
              <label htmlFor="rk-bank">Nama bank</label>
              <input
                id="rk-bank"
                value={bank.bank}
                onChange={(e) => setBank({ ...bank, bank: e.target.value })}
                placeholder="mis. BSI"
              />
            </div>
            <div className="field">
              <label htmlFor="rk-no">Nomor rekening</label>
              <input
                id="rk-no"
                inputMode="numeric"
                value={bank.number}
                onChange={(e) => setBank({ ...bank, number: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="rk-nama">Nama pemilik rekening</label>
              <input
                id="rk-nama"
                value={bank.holder}
                onChange={(e) => setBank({ ...bank, holder: e.target.value })}
              />
              <div className="hint">
                Harus sama dengan nama Anda: {acc.name}.
              </div>
            </div>
            {bankMsg && (
              <div
                className={`callout ${bankMsg.ok ? "info" : "warn"}`}
                role="status"
              >
                {bankMsg.text}
              </div>
            )}
            <button className="btn-primary" onClick={saveBank}>
              Simpan rekening
            </button>
            <p className="muted" style={{ fontSize: 12.5 }}>
              Prototipe: verifikasi kepemilikan rekening ke bank belum
              disambungkan.
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}
