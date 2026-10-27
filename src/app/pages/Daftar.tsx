import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { EngineError, atWib } from "../../engine";
import { dateLabel } from "../format";
import { useDemo } from "../store";
import { ProtoRibbon, TopBar } from "../components/ui";

const DOCS = [
  { id: "rp", label: "Rencana Pemasaran Mitrans-Astra v1.2" },
  { id: "ke", label: "Kode Etik Mitra PLS v1.2" },
  {
    id: "sk",
    label:
      "Syarat dan Ketentuan mitrans.id v1.2, termasuk Ketentuan Kemitraan (Bagian B)",
  },
];

/** Kuis singkat Kode Etik (Rencana Pemasaran Bab 6 butir 7). Soal disusun dari Kode Etik Pasal 4, 12, 17, 18. */
const QUIZ = [
  {
    q: 'Seorang calon Pelanggan bertanya, "Kalau pakai Mitrans-Astra, pasti untung ya?" Jawaban yang benar adalah…',
    o: [
      "Ya, karena platform memberi sinyal beli dan jual.",
      "Tidak. Mitrans-Astra alat analisis dan edukasi, tanpa sinyal beli/jual, dan investasi saham berisiko.",
      "Pasti untung bila ikut workshop.",
    ],
    a: 1,
  },
  {
    q: "Ke mana Pelanggan membayar Lisensi?",
    o: [
      "Ke rekening pribadi Mitra PLS agar lebih cepat.",
      "Ke rekening atau kanal pembayaran resmi Perusahaan saja.",
      "Bebas, asalkan ada bukti transfer.",
    ],
    a: 1,
  },
  {
    q: "Apakah calon Mitra PLS wajib membeli Lisensi untuk mendaftar?",
    o: [
      "Wajib, minimal satu Lisensi.",
      "Tidak. Pendaftaran gratis dan tanpa kewajiban membeli apa pun.",
      "Wajib membayar biaya pelatihan.",
    ],
    a: 1,
  },
  {
    q: "Mana yang DILARANG saat mengajak orang menjadi Mitra PLS?",
    o: [
      "Menjelaskan bahwa penghasilan tidak dijamin.",
      "Menunjukkan bukti transfer bonus dan gaya hidup untuk menarik orang bergabung.",
      "Memberikan dokumen Rencana Pemasaran sebelum mendaftar.",
    ],
    a: 1,
  },
  {
    q: "Untuk menjaga status aktif, bolehkah Anda membeli Lisensi atas nama saudara tanpa sepengetahuannya?",
    o: [
      "Boleh bila saudara setuju kemudian.",
      "Tidak boleh. Itu pelanggaran berat yang dapat berujung pemutusan keanggotaan.",
      "Boleh sekali dalam setahun.",
    ],
    a: 1,
  },
];

type Step = 0 | 1 | 2 | 3 | 4;

function addWorkingDays(t: number, n: number): number {
  let d = new Date(t + 7 * 3600_000);
  let added = 0;
  while (added < n) {
    d = new Date(d.getTime() + 86_400_000);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d.getTime() - 7 * 3600_000;
}

export function Daftar() {
  const { engine, bump } = useDemo();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const sponsors = useMemo(
    () =>
      [...engine.accounts.values()]
        .filter((a) => a.role === "mitra" && a.quizPassed && a.nodeId)
        .slice(0, 40),
    [engine],
  );
  const refCode = params.get("ref");
  const refAcc = refCode
    ? [...engine.accounts.values()].find((a) => a.code === refCode)
    : undefined;

  const [step, setStep] = useState<Step>(0);
  const [read, setRead] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({
    name: "",
    nik: "",
    birth: "",
    phone: "",
    bank: "",
    sponsorId: refAcc?.id ?? sponsors[0]?.id ?? "",
  });
  const [agree, setAgree] = useState({
    terms: false,
    truth: false,
    noIncome: false,
  });
  const [answers, setAnswers] = useState<number[]>(Array(QUIZ.length).fill(-1));
  const [quizTried, setQuizTried] = useState(false);
  const [error, setError] = useState("");
  const [newId, setNewId] = useState<string | null>(null);

  const now = atWib(engine.today, 9);
  const age = form.birth
    ? (now - Date.parse(form.birth)) / (365.25 * 86_400_000)
    : 0;
  const errs = {
    name: form.name.trim().length < 3 ? "Isi nama lengkap sesuai KTP" : "",
    nik: !/^\d{16}$/.test(form.nik) ? "NIK terdiri dari 16 angka" : "",
    birth: !form.birth
      ? "Isi tanggal lahir"
      : age < 18
        ? "Mitra PLS harus berusia paling rendah 18 tahun (Kode Etik Pasal 3)"
        : "",
    phone: !/^(\+62|0)8\d{7,12}$/.test(form.phone.replace(/[\s-]/g, ""))
      ? "Format nomor seluler Indonesia, mis. 0812…"
      : "",
    bank: form.bank.trim().length < 3 ? "Rekening harus atas nama sendiri" : "",
    sponsorId: !form.sponsorId ? "Pilih Sponsor" : "",
  };
  const dataValid = Object.values(errs).every((e) => !e);
  const allRead = DOCS.every((d) => read[d.id]);
  const quizScore = answers.filter((a, i) => a === QUIZ[i].a).length;

  const register = () => {
    setError("");
    try {
      const id = `NEW-${Date.now().toString(36)}`;
      engine.registerMitra({
        id,
        name: form.name.trim(),
        nik: form.nik,
        sponsorId: form.sponsorId,
        at: now,
      });
      setNewId(id);
      bump();
      setStep(3);
    } catch (e) {
      setError(e instanceof EngineError ? e.message : "Pendaftaran gagal");
    }
  };

  const submitQuiz = () => {
    setQuizTried(true);
    if (quizScore === QUIZ.length && newId) {
      engine.passQuiz(newId);
      bump();
      setStep(4);
    }
  };

  const steps = [
    "Penjelasan",
    "Data diri",
    "Persetujuan",
    "Kuis Kode Etik",
    "Selesai",
  ];
  const acc = newId ? engine.accounts.get(newId) : undefined;

  return (
    <>
      <ProtoRibbon />
      <TopBar />
      <div className="page" style={{ maxWidth: 820 }}>
        <div className="page-head">
          <h1>Daftar sebagai Mitra PLS</h1>
          <p className="muted">
            Gratis (Rp0) dan tidak mewajibkan pembelian apa pun. Prototipe:
            jangan memasukkan data pribadi asli.
          </p>
        </div>
        <div className="stepper">
          {steps.map((s, i) => (
            <span
              key={s}
              className={i === step ? "on" : i < step ? "done" : ""}
            >
              {i + 1}. {s}
            </span>
          ))}
        </div>

        {step === 0 && (
          <div className="card">
            <h2>Penjelasan sebelum mendaftar</h2>
            <p>
              Sesuai Kode Etik Pasal 4, baca dokumen berikut sebelum memberi
              persetujuan. Tandai setiap dokumen setelah Anda membacanya.
            </p>
            <div className="callout info" style={{ margin: "12px 0" }}>
              Ringkasan: Mitra PLS adalah pelaku usaha mandiri, bukan karyawan
              Perusahaan. Penghasilan hanya dari penjualan nyata dan tidak
              dijamin. Status aktif memerlukan paling sedikit 1 penjualan baru pribadi per
              bulan. <Link to="/aturan">Baca ringkasan aturan</Link>
            </div>
            {DOCS.map((d) => (
              <label key={d.id} className="check">
                <input
                  type="checkbox"
                  checked={!!read[d.id]}
                  onChange={(e) =>
                    setRead({ ...read, [d.id]: e.target.checked })
                  }
                />
                <span>
                  Saya sudah membaca <b>{d.label}</b>
                </span>
              </label>
            ))}
            <div style={{ marginTop: 16 }}>
              <button
                className="btn-primary"
                disabled={!allRead}
                onClick={() => setStep(1)}
              >
                Lanjut ke data diri
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="card">
            <h2>Data diri</h2>
            <div className="form-grid">
              {(
                [
                  ["name", "Nama lengkap sesuai KTP", "text", ""],
                  [
                    "nik",
                    "NIK (16 angka)",
                    "text",
                    "Satu NIK hanya untuk satu akun",
                  ],
                  ["birth", "Tanggal lahir", "date", ""],
                  [
                    "phone",
                    "Nomor seluler",
                    "tel",
                    "Ditampilkan ke Sponsor langsung hanya dengan persetujuan Anda",
                  ],
                  [
                    "bank",
                    "Bank & nomor rekening atas nama sendiri",
                    "text",
                    "Tidak ditampilkan kepada Mitra PLS lain",
                  ],
                ] as const
              ).map(([k, label, type, hint]) => (
                <div className="field" key={k}>
                  <label htmlFor={k}>{label}</label>
                  <input
                    id={k}
                    type={type}
                    value={form[k]}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    inputMode={k === "nik" ? "numeric" : undefined}
                  />
                  {form[k] && errs[k] ? (
                    <div className="err">{errs[k]}</div>
                  ) : (
                    hint && <div className="hint">{hint}</div>
                  )}
                </div>
              ))}
              <div className="field">
                <label htmlFor="sp">Sponsor</label>
                <select
                  id="sp"
                  value={form.sponsorId}
                  onChange={(e) =>
                    setForm({ ...form, sponsorId: e.target.value })
                  }
                  disabled={!!refAcc}
                >
                  {refAcc && (
                    <option
                      value={refAcc.id}
                    >{`${refAcc.name} (${refAcc.code})`}</option>
                  )}
                  {!refAcc &&
                    sponsors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                </select>
                <div className="hint">
                  {refAcc
                    ? "Dari tautan rujukan"
                    : "Demo: pilih Sponsor dari data sintetis"}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
              <button className="btn-secondary" onClick={() => setStep(0)}>
                Kembali
              </button>
              <button
                className="btn-primary"
                disabled={!dataValid}
                onClick={() => setStep(2)}
              >
                Lanjut
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="card">
            <h2>Persetujuan elektronik</h2>
            <label className="check">
              <input
                type="checkbox"
                checked={agree.terms}
                onChange={(e) =>
                  setAgree({ ...agree, terms: e.target.checked })
                }
              />
              <span>
                Saya telah membaca, memahami, dan menyetujui Syarat dan
                Ketentuan Bagian A dan B, Rencana Pemasaran, dan Kode Etik.
              </span>
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={agree.truth}
                onChange={(e) =>
                  setAgree({ ...agree, truth: e.target.checked })
                }
              />
              <span>
                Data yang saya berikan benar, dan saya berusia paling rendah 18
                tahun.
              </span>
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={agree.noIncome}
                onChange={(e) =>
                  setAgree({ ...agree, noIncome: e.target.checked })
                }
              />
              <span>
                Saya memahami bahwa penghasilan tidak dijamin dan bergantung
                pada penjualan dan pembinaan yang saya lakukan sendiri.
              </span>
            </label>
            <p className="muted" style={{ fontSize: 13 }}>
              Persetujuan elektronik ini memiliki kekuatan hukum yang sama
              dengan tanda tangan basah (Syarat dan Ketentuan Pasal 25).
            </p>
            {error && <div className="callout warn">{error}</div>}
            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <button className="btn-secondary" onClick={() => setStep(1)}>
                Kembali
              </button>
              <button
                className="btn-primary"
                disabled={!agree.terms || !agree.truth || !agree.noIncome}
                onClick={register}
              >
                Daftar tanpa biaya
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="card">
            <h2>Kuis singkat Kode Etik</h2>
            <p className="muted">
              Tautan rujukan Anda aktif setelah semua jawaban benar. Anda dapat
              mengulang tanpa batas dan tanpa biaya.
            </p>
            {QUIZ.map((item, i) => (
              <fieldset
                key={i}
                style={{ border: 0, padding: 0, margin: "16px 0" }}
              >
                <legend style={{ fontWeight: 600, marginBottom: 6 }}>
                  {i + 1}. {item.q}
                </legend>
                {item.o.map((opt, j) => (
                  <label key={j} className="check" style={{ padding: "4px 0" }}>
                    <input
                      type="radio"
                      name={`q${i}`}
                      checked={answers[i] === j}
                      onChange={() =>
                        setAnswers(answers.map((a, k) => (k === i ? j : a)))
                      }
                    />
                    <span>{opt}</span>
                  </label>
                ))}
                {quizTried && answers[i] !== item.a && (
                  <div
                    className="err"
                    style={{ color: "var(--bad)", fontSize: 13 }}
                  >
                    Belum tepat. Baca kembali Kode Etik.
                  </div>
                )}
              </fieldset>
            ))}
            <button
              className="btn-primary"
              disabled={answers.includes(-1)}
              onClick={submitQuiz}
            >
              Periksa jawaban
            </button>
            {quizTried && quizScore < QUIZ.length && (
              <span className="muted" style={{ marginLeft: 12 }}>
                {quizScore}/{QUIZ.length} benar
              </span>
            )}
          </div>
        )}

        {step === 4 && acc && (
          <div className="card">
            <h2>Selamat bergabung, {acc.name}</h2>
            <dl className="kv" style={{ maxWidth: 520 }}>
              <dt>Kode Mitra PLS</dt>
              <dd>{acc.code}</dd>
              <dt>Sponsor</dt>
              <dd>{engine.accounts.get(acc.sponsorId!)?.name}</dd>
              <dt>Masa pertimbangan sampai</dt>
              <dd>{dateLabel(addWorkingDays(acc.joinedAt, 10))}</dd>
              <dt>Masa berlaku keanggotaan</dt>
              <dd>1 tahun, diperpanjang gratis</dd>
            </dl>
            <h3>Tautan rujukan (aktif)</h3>
            <div className="reflink">
              https://affiliatemarketing.network/r/{acc.code}
            </div>
            <div className="callout info" style={{ marginTop: 14 }}>
              Posisi jaringan biner diberikan saat Anda mengaktifkan Lisensi
              pertama. Tanpa Lisensi, Anda tetap boleh memasarkan dan menerima
              Bonus Sponsor serta Bonus Layanan Berkah.
            </div>
            <div style={{ marginTop: 16 }}>
              <button
                className="btn-primary"
                onClick={() => nav(`/mitra?id=${acc.id}`)}
              >
                Buka Kantor Maya
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
