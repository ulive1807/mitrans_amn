import { MitransEngine } from "../src/engine/engine";
import { atWib } from "../src/engine/time";
import { syntheticNik } from "../src/engine/simulation";
import type { BonusType, Side } from "../src/engine/types";

/** Dunia uji kecil: engine baru beserta helper pendaftaran dan pembelian. */
export function createWorld(startDate = "2027-01-01") {
  const engine = new MitransEngine(atWib(startDate, 0, 1));
  let nik = 1;
  let saleNo = 1;

  function mitra(
    id: string,
    sponsorId: string,
    at: number,
    opts: { quiz?: boolean; buy?: boolean; leg?: Side } = {},
  ) {
    engine.registerMitra({ id, name: id, nik: syntheticNik(nik++), sponsorId, at });
    if (opts.quiz ?? true) engine.passQuiz(id);
    if (opts.buy ?? true)
      engine.purchaseLicense({ saleId: `L-${id}`, buyerId: id, at, legPreference: opts.leg });
  }

  function customer(id: string, sellerId: string, at: number) {
    engine.registerPelanggan({ id, name: id, nik: syntheticNik(nik++), sellerId, at });
    const saleId = `L-${id}`;
    engine.purchaseLicense({ saleId, buyerId: id, at });
    return saleId;
  }

  function buyAgain(buyerId: string, at: number) {
    const saleId = `R-${saleNo++}`;
    engine.purchaseLicense({ saleId, buyerId, at });
    return saleId;
  }

  function entries(accountId: string, type: BonusType) {
    return engine.entriesFor(accountId).filter((e) => e.type === type);
  }

  return { engine, mitra, customer, buyAgain, entries };
}

export const at = (date: string, h = 10) => atWib(date, h);
