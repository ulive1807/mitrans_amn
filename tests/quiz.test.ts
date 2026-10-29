import { describe, expect, it } from "vitest";
import { MitransEngine } from "../src/engine/engine";
import { QUIZ, coolingOffEnds, gradeQuiz, takeQuiz, validateBankAccount } from "../src/engine/quiz";
import { syntheticNik } from "../src/engine/simulation";
import { atWib } from "../src/engine/time";

const correct = Object.fromEntries(QUIZ.map((q) => [q.id, q.answer]));

describe("Kuis Kode Etik", () => {
  it("lulus hanya bila semua benar; jawaban salah menunjuk pasalnya; lulus mengaktifkan tautan", () => {
    const r = gradeQuiz({ ...correct, lokapasar: 1 });
    expect(r).toEqual({ passed: false, wrong: [{ id: "lokapasar", basis: "Kode Etik Pasal 18 angka 13" }] });
    const e = new MitransEngine(atWib("2027-01-01", 0, 1));
    e.registerMitra({ id: "A", name: "A", nik: syntheticNik(1), sponsorId: "MITRANS-002", at: atWib("2027-01-02", 10) });
    takeQuiz(e, "A", { ...correct, lokapasar: 1 });
    expect(e.accounts.get("A")!.quizPassed).toBe(false);
    expect(takeQuiz(e, "A", correct).passed).toBe(true);
    expect(e.accounts.get("A")!.quizPassed).toBe(true);
  });
});

describe("Rekening dan masa pertimbangan", () => {
  it("rekening wajib atas nama sendiri", () => {
    expect(validateBankAccount("Siti Pratama", { bank: "BSI", number: "7123 4567 89", holder: "SITI PRATAMA" }, 1)).toMatchObject({ number: "7123456789" });
    expect(() => validateBankAccount("Siti Pratama", { bank: "BSI", number: "7123456789", holder: "Budi" }, 1)).toThrow(/atas nama sendiri/);
    expect(() => validateBankAccount("Siti", { bank: "BSI", number: "12ab", holder: "Siti" }, 1)).toThrow(/6–20 angka/);
  });

  it("10 hari kerja Senin–Jumat", () => {
    // Sabtu 2 Januari 2027 → hari kerja ke-10 jatuh pada Jumat 15 Januari 2027.
    expect(coolingOffEnds(atWib("2027-01-02", 10))).toBe("2027-01-15");
    // Senin 4 Januari 2027 → Senin 18 Januari 2027.
    expect(coolingOffEnds(atWib("2027-01-04", 10))).toBe("2027-01-18");
  });
});
