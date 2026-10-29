import { useState } from "react";
import {
  EngineError,
  PLAN,
  addDays,
  ageAt,
  atWib,
  parseNik,
  type Account,
  type FamilyBundle,
  type MitransEngine,
  type Side,
} from "../../engine";
import { Badge, Panel } from "../components/ui";
import { dateLabel, rp } from "../format";
import { useDemo } from "../store";

/** NIK hanya ditampilkan sebagian (Rencana Pemasaran 8; data pribadi tidak dibuka penuh). */
function maskNik(nik: string): string {
  return `${nik.slice(0, 6)}••••••${nik.slice(-4)}`;
}

const SIDE_LABEL: Record<Side, string> = {
  L: "Kaki kiri (anak)",
  R: "Kaki kanan (istri)",
};

/** Tab Kantor Maya untuk Lisensi Atlas Family: beli dan daftarkan keluarga, pantau verifikasi kursi. */
export function FamilyTab({
  engine,
  accId,
}: {
  engine: MitransEngine;
  accId: string;
}) {
  const acc = engine.accounts.get(accId)!;
  const bundles = [...engine.familyBundles.values()];
  const asHead = bundles.find((b) => b.headId === accId);
  const sold = bundles.filter((b) => b.sellerId === accId);
  return (
    <>
      {acc.familySeat ? (
        <SeatSelf engine={engine} acc={acc} />
      ) : asHead ? (
        <BundleSeats engine={engine} bundle={asHead} />
      ) : acc.role === "mitra" && !acc.nodeId ? (
        <BuyFamily engine={engine} acc={acc} />
      ) : (
        <Panel title={PLAN.family.name}>
          <p className="muted">
            Paket ini dibeli oleh kursi utama (ayah) yang belum memegang
            Lisensi. Setiap kursi adalah hak usaha tersendiri bagi orang dewasa
            dengan NIK masing-masing.
          </p>
        </Panel>
      )}
      {sold.length > 0 && <SoldBundles engine={engine} bundles={sold} />}
    </>
  );
}

function seatStatus(acc: Account | undefined) {
  if (!acc) return <Badge tone="mute">Kosong</Badge>;
  if (!acc.familySeat || acc.familySeat.status === "aktif")
    return <Badge tone="good">✓ Aktif</Badge>;
  return <Badge tone="warn">⏸ Menunggu verifikasi</Badge>;
}

function deadline(acc: Account | undefined): string {
  if (!acc?.familySeat || acc.familySeat.status !== "menunggu") return "–";
  return dateLabel(
    addDays(acc.familySeat.invitedAt, PLAN.family.seatVerifyDays),
  );
}

/** Pemeriksaan NIK di formulir: sama dengan aturan engine, ditambah NIK ganda di formulir yang sama. */
function nikProblem(
  engine: MitransEngine,
  nik: string,
  now: number,
  others: string[],
): string {
  if (!nik) return "Isi NIK sesuai KTP";
  const info = parseNik(nik, now);
  if ("error" in info) return info.error;
  if (engine.nikTaken(nik) || others.includes(info.nik))
    return "NIK sudah terdaftar. Satu NIK hanya untuk satu akun";
  if (ageAt(info.birthDate, now) < 18)
    return "Anggota kursi Family harus berusia paling rendah 18 tahun";
  return "";
}

function BuyFamily({ engine, acc }: { engine: MitransEngine; acc: Account }) {
  const { bump } = useDemo();
  const now = atWib(engine.today, 9);
  const seller = acc.sponsorId ? engine.accounts.get(acc.sponsorId) : undefined;
  const [m, setM] = useState({
    L: { name: "", nik: "" },
    R: { name: "", nik: "" },
  });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const norm = (s: string) => s.replace(/[\s.-]/g, "");
  const errL = nikProblem(engine, m.L.nik, now, [acc.nik]);
  const errR = nikProblem(engine, m.R.nik, now, [acc.nik, norm(m.L.nik)]);
  const nameErr = (n: string) =>
    n.trim().length < 3 ? "Isi nama lengkap sesuai KTP" : "";
  const valid =
    !errL && !errR && !nameErr(m.L.name) && !nameErr(m.R.name) && consent;

  const submit = () => {
    setError("");
    try {
      const id = `FAM-${Date.now().toString(36)}`;
      engine.purchaseFamily({
        saleId: id,
        headId: acc.id,
        members: {
          L: { id: `${id}-L`, name: m.L.name.trim(), nik: m.L.nik },
          R: { id: `${id}-R`, name: m.R.name.trim(), nik: m.R.nik },
        },
        at: now,
      });
      bump();
    } catch (e) {
      setError(e instanceof EngineError ? e.message : "Pembelian gagal");
    }
  };

  const field = (
    side: Side,
    key: "name" | "nik",
    label: string,
    err: string,
  ) => (
    <div className="field">
      <label>{label}</label>
      <input
        value={m[side][key]}
        inputMode={key === "nik" ? "numeric" : undefined}
        onChange={(e) =>
          setM({ ...m, [side]: { ...m[side], [key]: e.target.value } })
        }
      />
      {m[side][key] && err ? <div className="err">{err}</div> : null}
    </div>
  );

  return (
    <Panel
      title={`Beli ${PLAN.family.name} dan daftarkan keluarga`}
      hint="Simulasi prototipe · jangan isi data asli"
    >
      <p>
        {rp(PLAN.family.price)} untuk {PLAN.family.seats} orang dewasa, akses{" "}
        {PLAN.family.accessMonths} bulan per kursi. Anda menjadi kursi utama.
        Anak ditempatkan langsung di kaki kiri Anda dan istri di kaki kanan
        Anda, dengan Anda sebagai Sponsor. Penjual: <b>{seller?.name ?? "–"}</b>
        .
      </p>
      <div className="row2 even">
        <div>
          <h3>{SIDE_LABEL.L}</h3>
          {field("L", "name", "Nama lengkap", nameErr(m.L.name))}
          {field("L", "nik", "NIK (16 angka)", errL)}
        </div>
        <div>
          <h3>{SIDE_LABEL.R}</h3>
          {field("R", "name", "Nama lengkap", nameErr(m.R.name))}
          {field("R", "nik", "NIK (16 angka)", errR)}
        </div>
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          Anggota keluarga sudah setuju didaftarkan. Mereka akan memverifikasi
          identitas dan menyetujui dokumen sendiri paling lambat{" "}
          {PLAN.family.seatVerifyDays} hari; sebelum itu kursi belum aktif.
        </span>
      </label>
      {error && <div className="callout warn">{error}</div>}
      <button className="btn-primary" disabled={!valid} onClick={submit}>
        Beli dan daftarkan keluarga
      </button>
      <p className="muted" style={{ fontSize: 13 }}>
        Setiap NIK diperiksa sistem: harus sah, belum pernah terdaftar, dan
        berusia paling rendah 18 tahun. NIK yang sudah terdaftar ditolak
        otomatis.
      </p>
    </Panel>
  );
}

function BundleSeats({
  engine,
  bundle,
}: {
  engine: MitransEngine;
  bundle: FamilyBundle;
}) {
  const { bump } = useDemo();
  const now = atWib(engine.today, 9);
  const [replacing, setReplacing] = useState<Side | null>(null);
  const [rep, setRep] = useState({ name: "", nik: "" });
  const [error, setError] = useState("");
  const head = engine.accounts.get(bundle.headId)!;
  const rows: [string, Account | undefined][] = [
    ["Kursi utama (Anda)", head],
    [
      SIDE_LABEL.L,
      bundle.seats.L ? engine.accounts.get(bundle.seats.L) : undefined,
    ],
    [
      SIDE_LABEL.R,
      bundle.seats.R ? engine.accounts.get(bundle.seats.R) : undefined,
    ],
  ];
  const act = (fn: () => void) => {
    setError("");
    try {
      fn();
      bump();
    } catch (e) {
      setError(e instanceof EngineError ? e.message : "Gagal");
    }
  };
  const repErr = nikProblem(engine, rep.nik, now, []);
  return (
    <Panel
      title={`Kursi ${PLAN.family.name}`}
      hint={`Dibeli ${dateLabel(bundle.purchasedAt)}`}
    >
      <table className="t">
        <thead>
          <tr>
            <th>Kursi</th>
            <th>Nama</th>
            <th>NIK</th>
            <th>Status</th>
            <th>Batas verifikasi</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, a]) => (
            <tr key={label}>
              <td>{label}</td>
              <td>{a?.name ?? "–"}</td>
              <td className="num">{a ? maskNik(a.nik) : "–"}</td>
              <td>{seatStatus(a)}</td>
              <td>{deadline(a)}</td>
              <td>
                {a?.familySeat?.status === "menunggu" && (
                  <>
                    <button
                      className="btn-primary"
                      onClick={() =>
                        act(() => engine.verifyFamilyMember(a.id, now))
                      }
                    >
                      Simulasikan verifikasi anggota
                    </button>{" "}
                    <button
                      className="btn-secondary"
                      onClick={() => setReplacing(a.familySeat!.side)}
                    >
                      Ganti anggota
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {replacing && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3>Ganti anggota {SIDE_LABEL[replacing].toLowerCase()}</h3>
          <div className="field">
            <label>Nama lengkap</label>
            <input
              value={rep.name}
              onChange={(e) => setRep({ ...rep, name: e.target.value })}
            />
          </div>
          <div className="field">
            <label>NIK (16 angka)</label>
            <input
              inputMode="numeric"
              value={rep.nik}
              onChange={(e) => setRep({ ...rep, nik: e.target.value })}
            />
            {rep.nik && repErr ? <div className="err">{repErr}</div> : null}
          </div>
          <button
            className="btn-primary"
            disabled={!!repErr || rep.name.trim().length < 3}
            onClick={() =>
              act(() => {
                engine.replaceFamilyMember({
                  accountId: bundle.seats[replacing]!,
                  member: {
                    id: `${bundle.id}-${replacing}-${Date.now().toString(36)}`,
                    name: rep.name.trim(),
                    nik: rep.nik,
                  },
                  at: now,
                });
                setReplacing(null);
                setRep({ name: "", nik: "" });
              })
            }
          >
            Simpan pengganti
          </button>
        </div>
      )}
      {error && <div className="callout warn">{error}</div>}
      <p className="muted" style={{ fontSize: 13 }}>
        Kursi anggota keluarga aktif setelah anggota itu sendiri memverifikasi
        identitas dan menyetujui dokumen di akunnya. Sebelum itu posisinya sudah
        dikunci, tetapi belum ada volume, bonus, atau tautan rujukan. Anggota
        yang belum verifikasi dapat Anda ganti dengan anggota keluarga dewasa
        lain.
      </p>
    </Panel>
  );
}

function SeatSelf({ engine, acc }: { engine: MitransEngine; acc: Account }) {
  const { bump } = useDemo();
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const seat = acc.familySeat!;
  const bundle = engine.familyBundles.get(seat.bundleId)!;
  const head = engine.accounts.get(bundle.headId)!;
  return (
    <Panel title={`Kursi ${PLAN.family.name} Anda`}>
      <p>
        Anda didaftarkan oleh <b>{head.name}</b> di{" "}
        {SIDE_LABEL[seat.side].toLowerCase()} pada {dateLabel(seat.invitedAt)}.
        NIK terdaftar: <span className="num">{maskNik(acc.nik)}</span>.
      </p>
      {seat.status === "aktif" ? (
        <div className="callout info">
          ✓ Terverifikasi {seat.verifiedAt ? dateLabel(seat.verifiedAt) : ""}.
          Kursi Anda aktif.
        </div>
      ) : (
        <>
          <div className="callout warn">
            Kursi belum aktif. Verifikasi identitas Anda dan setujui Rencana
            Pemasaran, Kode Etik, serta Syarat dan Ketentuan paling lambat{" "}
            {deadline(acc)}.
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
            />
            <span>
              Saya sendiri yang melakukan verifikasi ini dan menyetujui ketiga
              dokumen.
            </span>
          </label>
          {error && <div className="callout warn">{error}</div>}
          <button
            className="btn-primary"
            disabled={!agree}
            onClick={() => {
              setError("");
              try {
                engine.verifyFamilyMember(acc.id, atWib(engine.today, 9));
                bump();
              } catch (e) {
                setError(
                  e instanceof EngineError ? e.message : "Verifikasi gagal",
                );
              }
            }}
          >
            Verifikasi dan aktifkan kursi (simulasi e-KYC)
          </button>
        </>
      )}
    </Panel>
  );
}

function SoldBundles({
  engine,
  bundles,
}: {
  engine: MitransEngine;
  bundles: FamilyBundle[];
}) {
  return (
    <Panel title="Paket Family yang Anda jual">
      <table className="t">
        <thead>
          <tr>
            <th>Kursi utama</th>
            <th>Dibeli</th>
            <th>Kaki kiri</th>
            <th>Kaki kanan</th>
          </tr>
        </thead>
        <tbody>
          {bundles.map((b) => (
            <tr key={b.id}>
              <td>{engine.accounts.get(b.headId)?.name}</td>
              <td>{dateLabel(b.purchasedAt)}</td>
              <td>
                {seatStatus(
                  b.seats.L ? engine.accounts.get(b.seats.L) : undefined,
                )}
              </td>
              <td>
                {seatStatus(
                  b.seats.R ? engine.accounts.get(b.seats.R) : undefined,
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted" style={{ fontSize: 13 }}>
        Bonus Sponsor dan Fast Start untuk kursi kiri/kanan timbul saat kursi
        itu diverifikasi oleh anggotanya.
      </p>
    </Panel>
  );
}
