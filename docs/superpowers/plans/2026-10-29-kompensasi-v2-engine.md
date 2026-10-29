# Engine Kompensasi v2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ubah engine komisi prototipe dari Rencana Pemasaran v1.2 ke rancangan v2.0 (program 90 hari, 12 peringkat bulanan, dana leadership, plafon 60%, Pool sampai 55%), lalu buktikan lewat uji dan simulasi.

**Architecture:** Engine tetap mesin peristiwa murni TypeScript di `src/engine/`. Parameter baru di `plan.ts`, fungsi murni baru di `calc.ts`, aturan peristiwa dan tutup bulan di `engine.ts`. Bonus Level dan Royalti dihapus; peringkat dihitung ulang setiap tutup bulan dari volume bulanan per kaki.

**Tech Stack:** TypeScript 5.6, Vitest 2.1, Vite 6, React 18 (UI prototipe), tsx untuk skrip.

**Spec:** `docs/superpowers/specs/2026-10-29-rencana-kompensasi-v2-design.md`

## Global Constraints

- Uang dalam Rupiah bulat (integer); PV dalam persepuluh; persentase dalam basis poin (1% = 100 bp).
- Persentase dihitung dari omzet bersih: Lisensi Rp6.756.757, Langganan Rp359.459.
- Plafon Plan A `planACapBp: 6000`; target pengisian Pool `poolTargetBp: 5500`; plafon Plan B `planBCapBp: 4000`.
- Tidak ada bonus dari pendaftaran; pembelian sendiri (`buyerId === sellerId`) dan penjualan yang dibatalkan tidak pernah dihitung.
- "90 hari" = `[licenseActivatedAt, addDays(licenseActivatedAt, 90))` milik Mitra itu; Mitra tanpa Lisensi tidak punya jendela 90 hari.
- `PLAN.version` menjadi `"2.0-draf"`. Teks UI menyebut "Rencana Pemasaran v2.0 (draf)".
- Setiap task meninggalkan `npm run typecheck` dan `npm test` hijau.
- Tidak ada deploy, tidak ada perubahan berkas `.docx`.

## Review Focus

1. Penjualan yang memicu Fast Start atau Balik Modal lalu dibatalkan: bonus itu ditarik, dan Balik Modal bisa diperoleh lagi bila syarat terpenuhi kembali (uji di Task 2).
2. Penjualan tepat di batas hari ke-90 (`licenseActivatedAt + 90 hari`): tidak lagi mendapat Fast Start (uji di Task 2).
3. Mitra tanpa Lisensi yang menjual: Bonus Sponsor saja, tanpa Fast Start, ambang aktif 2 (uji di Task 2).
4. Bulan tanpa penjualan Lisensi: dana peringkat, leadership, dan top-up Pool = 0, tanpa pembagian dengan nol (uji di Task 3 dan Task 5).
5. Bulan tanpa Mitra aktif: top-up Pool tidak dibawa ke bulan berikutnya, hanya sumber Pool asli yang dibawa (uji di Task 3).

---

### Task 0: Persiapan

- [ ] **Step 1:** `npm install` lalu `npm test`. Expected: 54 uji lulus (baseline v1.2). Bila tidak, berhenti dan laporkan.
- [ ] **Step 2:** `npm run typecheck`. Expected: tanpa error.

### Task 1: Parameter v2 dan fungsi murni

**Files:**
- Modify: `src/engine/plan.ts`, `src/engine/calc.ts`, `src/engine/time.ts`
- Test: `tests/calc.test.ts`

**Interfaces:**
- Produces di `plan.ts` (tambahan; field lama `levelBonus`, `levelBonusLifetimeCap`, `royaltyTiers`, `royaltyPersonalMonthlyCap`, `ranks[].smallLeg` dibiarkan dulu, dihapus di Task 3–4):
  - `fastStartBonus: 500_000`, `pendampingBonus: 100_000`, `balikModalBonus: 1_500_000`
  - `program90Days: 90`, `program90HoldUntilDay: 150`
  - `balikModalPersonal: 4`, `balikModalTeam: 4`
  - `activeMinPersonalSales90: 1` (lama `activeMinPersonalSales: 2` tetap)
  - `pembinaanRatesBp: [2500, 2500, 2500, 500, 500, 500]`
  - `rankFundBp: 700`, `leadershipFundBp: 500`, `leadershipPersonalMonthlyCap: 100_000_000`
  - `planACapBp: 6000`, `poolTargetBp: 5500`, `planBCapBp: 4000`
  - `refundWorkdays: 7`
  - `monthlyRanks`: array 12 peringkat sesuai spesifikasi bagian 6, bentuk
    `{ name, personalTx, legPaket, directActive, leaderRank: RankName | null, maintainBp, reward, leadershipWeight }`.
    Nilai: Member `0,0,0,null,0,0,0`; Builder `1,2,2,null,7000,150_000,0`; Executive `2,5,3,"Builder",7000,300_000,0`; Manager `3,12,4,"Executive",7000,600_000,0`; Director `4,25,5,"Manager",8000,1_200_000,1`; Senior Director `5,50,6,"Director",8000,2_400_000,2`; Emerald `6,100,7,"Senior Director",8000,4_000_000,3`; Diamond `8,200,8,"Emerald",8000,7_500_000,4`; Double Diamond `10,400,9,"Diamond",8000,12_500_000,5`; Crown Diamond `12,750,10,"Double Diamond",8000,20_000_000,6`; Ambassador `15,1500,12,"Crown Diamond",8000,35_000_000,7`; Royal Crown `20,3000,15,"Ambassador",8000,50_000_000,8`.
  - `rankVerifyMonths: 3`
  - `RankName` diturunkan dari `monthlyRanks`.
- Produces di `calc.ts`:
  - `rankIndex(rank: RankName): number`
  - `qualifiedRank(input: { personalTx: number; legPaket: { L: number; R: number }; directActive: number; leaderBest: { L: RankName; R: RankName } }): RankName`: peringkat tertinggi yang semua syaratnya terpenuhi; syarat pemimpin terpenuhi bila `rankIndex(leaderBest.L)` dan `rankIndex(leaderBest.R)` ≥ `rankIndex(leaderRank)`.
  - `maintainsRank(rank: RankName, legPaket: { L: number; R: number }): boolean`: kedua kaki ≥ `legPaket × maintainBp / 10000`.
  - `allocateWeightedWithCap(fund: number, holders: { id: string; weight: number }[], personalCap: number): { allocation: Map<string, number>; unassigned: number; overCap: number }`: bagi menurut bobot (dibulatkan ke bawah), kelebihan batas dibagi ulang kepada yang belum mencapai batas, seperti `allocateEqualWithCap`.
  - `perLicenseUpperBounds()` dihitung ulang: `toMitra = (sponsor + fastStart + pendamping + balikModal/4 + 5 × pair × (1 + Σpembinaan)) / net + (rankFundBp + leadershipFundBp)/10000`; `toCustomer` = tanpa pendamping, plus Berkah; `converted = toCustomer`; `subscription` tetap.
- Produces di `time.ts`: `addWorkdays(t: number, n: number): number`: maju n hari kerja (Senin–Jumat WIB), jam tetap.

- [ ] **Step 1: Tulis uji gagal di `tests/calc.test.ts`**
  - `perLicenseUpperBounds().toMitra` ≈ `0.5862` (`toBeCloseTo(0.5862, 3)`), `toCustomer` ≈ `0.5788`, keduanya `< 0.6`.
  - `qualifiedRank({personalTx:1, legPaket:{L:2,R:2}, directActive:2, leaderBest:{L:"Member",R:"Member"}})` = `"Builder"`.
  - Syarat pemimpin: legPaket 5:5, personalTx 2, directActive 3, `leaderBest {L:"Builder", R:"Member"}` → `"Builder"` (bukan Executive); dengan `R:"Builder"` → `"Executive"`.
  - `maintainsRank("Builder", {L:1.4, R:1.4})` true; `{L:1.39, R:5}` false; `maintainsRank("Director", {L:20, R:20})` true, `{L:19.9, R:30}` false.
  - `allocateWeightedWithCap(10_000_000, [{id:"a",weight:1},{id:"b",weight:3}], 100_000_000)` → a 2.500.000, b 7.500.000; dengan batas 5.000.000 → b 5.000.000, a 5.000.000, `overCap` 0; dengan holders `[]` → `unassigned` 10.000.000.
  - Total reward 12 peringkat = 133.650.000.
  - `addWorkdays(atWib("2027-01-08",10), 7)` (Jumat) = `atWib("2027-01-19",10)`.
  - Ganti uji v1.2 yang nilainya berubah (Pembinaan Lampiran B.3, batas atas 48,95%/38,6%/49,7%, total reward 49 jt) dengan nilai v2.
- [ ] **Step 2:** `npx vitest run tests/calc.test.ts`. Expected: FAIL pada fungsi/nilai baru.
- [ ] **Step 3:** Implementasikan parameter dan fungsi di atas.
- [ ] **Step 4:** `npx vitest run tests/calc.test.ts && npm run typecheck`. Expected: PASS. (Uji engine yang memakai Pembinaan 10% boleh gagal di sini; perbaiki angka harapannya di task ini bila hanya karena tarif.)
- [ ] **Step 5:** Commit `feat(engine): parameter dan fungsi murni rencana kompensasi v2.0`.

### Task 2: Program 90 hari

**Files:**
- Modify: `src/engine/types.ts`, `src/engine/engine.ts`
- Test: Create `tests/program90.test.ts` (pakai helper `mitra`/`customer`/`entries` seperti di `tests/engine.test.ts`; pindahkan helper ke `tests/helpers.ts` dan impor dari kedua berkas)

**Interfaces:**
- Consumes: parameter Task 1, `addWorkdays`.
- Produces:
  - `BonusType` tambah `"FAST_START" | "PENDAMPING" | "BALIK_MODAL"`; masuk `PLAN_A_TYPES`; label "Bonus Fast Start", "Bonus Pendamping", "Bonus Balik Modal".
  - `DIRECT_TYPES: BonusType[] = ["SPONSOR", "BERKAH", "FAST_START", "PENDAMPING", "BALIK_MODAL"]` di `types.ts`.
  - `MitransEngine.inProgram90(accountId: string, t: number): boolean`
  - `MitransEngine.program90End(accountId: string): number | undefined`
  - `MitransEngine.program90Progress(accountId: string): { personal: number; team: number; legs: { L: boolean; R: boolean }; achieved: boolean; endsAt?: number }`
  - `isActive` memakai ambang `activeThreshold(accountId, month)`: 1 bila awal bulan < `program90End`, selain itu 2.

Aturan:
- **Fast Start**: di `purchaseLicense`, bila `seller.role === "mitra"`, `buyerId !== sellerId`, dan `inProgram90(seller, at)`, accrue `FAST_START` dengan `saleId`.
- **Pendamping**: pada penjualan Lisensi pertama (tidak dibatalkan, bukan pembelian sendiri) seorang penjual dalam jendela 90 harinya, accrue `PENDAMPING` kepada `seller.sponsorId`, sekali per penjual, `saleId` = penjualan itu.
- **Balik Modal**: setelah volume dicatat, periksa penjual dan setiap leluhur sponsornya yang `inProgram90(·, at)`: personal ≥4 (penjualan Lisensi pribadi dalam jendela), team ≥4 (penjualan Lisensi oleh keturunan sponsor, generasi berapa pun, dalam jendela orang itu), `node.cumLicenses.L ≥ 1` dan `R ≥ 1`. Accrue `BALIK_MODAL` sekali per NIK dengan `saleId` penjualan pemicu. Pembatalan menurunkan hitungan; bila BALIK_MODAL ditarik, NIK boleh memperolehnya lagi.
- **Penyelesaian** (tutup bulan langkah 2): ketiga tipe diperlakukan seperti SPONSOR (syarat Langganan bulan ke-4), tetapi `payoutDate = payoutFriday(addWorkdays(accruedAt, PLAN.refundWorkdays))`. `directPaid` di langkah 4 menjumlah `DIRECT_TYPES`.
- **Masa tunggu diperpanjang**: di `hold()`, bila `inProgram90(accountId, e.accruedAt)`, `holdUntil = max(addMonths(month, 2), wibMonth(addDays(licenseActivatedAt, 150)))`; catatan "Masa tunggu program 90 hari".

- [ ] **Step 1: Tulis uji gagal** di `tests/program90.test.ts`:
  - "Fast Start Rp500.000 untuk Lisensi yang dijual dalam 90 hari": A aktivasi 1 Jan, jual ke B 10 Jan → entri `FAST_START` gross 500.000.
  - "tidak ada Fast Start pada hari ke-90 atau sesudahnya": jual tepat `addDays(aktivasiA, 90)` → tidak ada entri.
  - "Mitra tanpa Lisensi: Sponsor saja, tanpa Fast Start".
  - "pembelian sendiri tidak memberi Fast Start".
  - "Pendamping Rp100.000 sekali ketika Mitra binaan menjual pertama kali": A→B, B menjual ke C dan D → A punya tepat 1 entri `PENDAMPING`.
  - "Balik Modal setelah 4 pribadi (kiri dan kanan) + 4 tim": skenario headline 2 bulan (A menjual 2 di Jan, 2 di Feb; 4 Mitra itu masing-masing menjual 1 di Feb) → tepat 1 `BALIK_MODAL` 1.500.000 untuk A; total bonus A setelah `closeThrough("2027-03")` termasuk Sponsor 4 × 750.000 dan Fast Start 4 × 500.000.
  - "Balik Modal tidak diberikan dengan 3 pribadi".
  - "pembatalan penjualan pemicu menarik Balik Modal dan Fast Start": batalkan sebelum tutup bulan → status `clawback`.
  - "ambang aktif 1 penjualan selama 90 hari, 2 sesudahnya".
  - "bonus tim yang ditahan dalam 90 hari belum hangus sampai bulan hari ke-150".
  - "Fast Start dibayar Jumat setelah 7 hari kerja": `payoutDate` = `payoutFriday(addWorkdays(at, 7))`.
- [ ] **Step 2:** `npx vitest run tests/program90.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implementasikan aturan di atas di `engine.ts` dan tipe di `types.ts`. Penghitung per akun (`program90Counts: Map<accountId, {personal:Set<saleId>, team:Set<saleId>}>`) supaya pembatalan cukup menghapus `saleId`.
- [ ] **Step 4:** `npm test && npm run typecheck`. Expected: PASS. Uji v1.2 yang berubah karena ambang aktif 1 di 90 hari pertama disesuaikan dengan alasan di nama ujinya.
- [ ] **Step 5:** Commit `feat(engine): program 90 hari (Fast Start, Pendamping, Balik Modal, ambang aktif, masa tunggu)`.

### Task 3: Hapus Bonus Level, plafon 60%, Pool sampai 55%

**Files:**
- Modify: `src/engine/plan.ts`, `types.ts`, `engine.ts`, `src/app/pages/KantorMaya.tsx`, `src/app/pages/Aturan.tsx`, `src/app/pages/Admin.tsx`
- Test: `tests/engine.test.ts`, `tests/program90.test.ts`

**Interfaces:**
- Produces: `BonusType` tanpa `"LEVEL"`; `TEAM_TYPES = ["PASANGAN", "PEMBINAAN"]`; `BinaryNode` tanpa `levelMask`, `levelPaidMask`; `PoolSources.topUp: number`; `MonthReport.poolTarget: number`.
- `plan.ts`: hapus `levelBonus`, `levelBonusLifetimeCap`; `DEFAULT_OPTIONS.planACapBp = 6000`.

Aturan Pool (langkah 8 tutup bulan): `topUp = max(0, applyBp(licenseNet, PLAN.poolTargetBp) − planABeforePool − poolSourcesTotal)`. Yang dibagi = `min(poolSourcesTotal + topUp, poolRoom)`. Dibagi dulu dari sumber, lalu top-up. `poolCarry = poolSourcesTotal − bagianSumberYangTerbagi`; sisa top-up tidak dibawa.

- [ ] **Step 1: Tulis/ubah uji gagal**:
  - Hapus uji "Bonus Level kedalaman 1…"; ganti dengan "tidak ada Bonus Level di v2" (tidak ada entri bertipe selain yang terdaftar di `BONUS_LABEL`).
  - "Pool diisi sampai 55% omzet bersih Lisensi": bulan dengan 10 Lisensi dan bonus Plan A di bawah 55% → `report.pool.topUp > 0` dan `planAPaid ≤ applyBp(licenseNet, 5500)` + sumber Pool.
  - "top-up tidak dibawa bila tidak ada Mitra aktif": `report.pool.carryNext` hanya dari sumber asli.
  - "bulan tanpa Lisensi: topUp 0".
  - Uji hangus bonus (`forfeitedTeam`) memakai `PLAN.pairBonus` saja, tanpa `levelBonus`.
- [ ] **Step 2:** `npm test`. Expected: FAIL pada uji baru.
- [ ] **Step 3:** Implementasikan; hapus `markLevel` dan pemanggilnya; ganti referensi UI ke `LEVEL`/`levelBonus` (Admin: jumlah bonus tim = PASANGAN + PEMBINAAN; Aturan dan KantorMaya: hapus baris/teks Level).
- [ ] **Step 4:** `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(engine): hapus Bonus Level, plafon Plan A 60%, Pool Aktif sampai 55%`.

### Task 4: Peringkat bulanan 12 tingkat

**Files:**
- Modify: `src/engine/plan.ts`, `types.ts`, `engine.ts`, `calc.ts`, `src/app/pages/KantorMaya.tsx`, `src/app/pages/Aturan.tsx`, `src/app/store.tsx`
- Test: Create `tests/rank.test.ts`

**Interfaces:**
- Consumes: `qualifiedRank`, `maintainsRank`, `rankIndex` (Task 1).
- Produces:
  - `BinaryNode.monthNet: { L: number; R: number }`: omzet bersih Lisensi dan Langganan dalam 10 level bulan berjalan; ditambah di `addLicenseVolume` (Lisensi) dan `paySubscription` (Langganan); di-reset setelah evaluasi peringkat di tutup bulan.
  - `Account.rankVerify?: { rank: RankName; since: string; months: number }`
  - `Account.ranksAchieved` tetap bentuknya; `at` = waktu verifikasi selesai.
  - `MitransEngine.paidAsRank(accountId: string, month: string): RankName`
  - `MitransEngine.rankInputs(accountId: string, month: string): { personalTx: number; legPaket: {L:number;R:number}; directActive: number; leaderBest: {L:RankName;R:RankName} }` (untuk UI dan uji)
  - Hapus `ranksForSmallLeg`, `checkRanks`, `ranks[].smallLeg`; `rankReward` membaca `monthlyRanks`.

Evaluasi di tutup bulan (langkah 5 baru, sebelum klaim):
1. Urutkan node Mitra dari kedalaman terbesar ke terkecil supaya peringkat pemimpin di bawah sudah dihitung.
2. `legPaket[side] = node.monthNet[side] / PLAN.license.netPrice`; `personalTx` = `personalSales(month)`; `directActive` = jumlah Mitra yang `sponsorId` = akun ini dan aktif bulan itu; `leaderBest[side]` = `paidAsRank` tertinggi di antara Mitra di kaki itu dalam 10 level.
3. `q = qualifiedRank(...)`. `paidAs` = tertinggi dari `q` dan setiap peringkat yang sudah dicapai dengan `maintainsRank` dan aktif.
4. Verifikasi: bila ada `rankVerify` dan (`maintainsRank(rankVerify.rank)` dan aktif), `months++`, selain itu dihapus. Bila `q` lebih tinggi dari `rankVerify?.rank` dan dari peringkat tertinggi yang sudah dicapai, mulai `rankVerify = { rank: q, since: month, months: 1 }`. Bila `months ≥ PLAN.rankVerifyMonths`, tambahkan `rank` dan semua peringkat di bawahnya yang belum dicapai ke `ranksAchieved` (`claimed: false`), lalu hapus `rankVerify`.
5. Klaim dan antrean memakai logika lama dengan dana `rankFundBp` 7%.

- [ ] **Step 1: Tulis uji gagal** di `tests/rank.test.ts`:
  - "Builder dicapai lalu dibayar setelah 3 bulan terverifikasi": A dengan 2 Mitra langsung aktif, volume 2:2 paket di Jan, pemeliharaan ≥1,4:1,4 di Feb dan Mar → `PRESTASI` 150.000 setelah tutup Mar, tidak ada sebelum itu.
  - "verifikasi putus bila pemeliharaan gagal": Feb volume 1:1 → tidak ada bonus setelah Mar.
  - "syarat 2 pemimpin di kaki berbeda": dua Builder di kaki yang sama tidak memberi Executive.
  - "Langganan dihitung dalam volume kaki": 19 Langganan (≈1,01 paket) ikut masuk `monthNet`.
  - "peringkat yang dilompati ikut dicapai sekali".
  - "monthNet di-reset setiap tutup bulan".
- [ ] **Step 2:** `npx vitest run tests/rank.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implementasikan. KantorMaya: ganti progres kaki kecil dengan progres bulan ini terhadap peringkat berikutnya (`rankInputs`) dan status verifikasi (`rankVerify.months / 3`). Aturan: tabel 12 peringkat dari `PLAN.monthlyRanks`.
- [ ] **Step 4:** `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(engine): 12 peringkat bulanan dengan pemeliharaan dan verifikasi 3 bulan`.

### Task 5: Dana leadership 5% (ganti Royalti)

**Files:**
- Modify: `plan.ts`, `types.ts`, `engine.ts`, `src/app/pages/KantorMaya.tsx`, `src/app/pages/Admin.tsx`, `src/app/pages/Aturan.tsx`
- Test: Modify `tests/rank.test.ts`, `tests/calc.test.ts`

**Interfaces:**
- Produces: `BonusType` `"ROYALTI"` → `"LEADERSHIP"` (label "Bonus Leadership"); `PoolSources.royaltyUnassigned/royaltyOverCap` → `leadershipUnassigned/leadershipOverCap`; `MonthReport.royaltyFund` → `leadershipFund`. Hapus `royaltyTiers`, `royaltyPersonalMonthlyCap`.
- Langkah 6 tutup bulan: `fund = applyBp(licenseNet, PLAN.leadershipFundBp)`; holders = Mitra aktif dengan `paidAsRank` berbobot > 0; `allocateWeightedWithCap(fund, holders, PLAN.leadershipPersonalMonthlyCap)`; sisa ke Pool. Anggaran tim = `planACap − directPaid − rankFund − leadershipFund`.

- [ ] **Step 1: Tulis uji gagal**: "dana leadership dibagi menurut bobot" (Director bobot 1 dan Emerald bobot 3 → 25%:75% dari 5% omzet bersih bulan itu); "tanpa pemegang → seluruh dana masuk Pool"; "batas Rp100 juta per orang"; "bulan tanpa Lisensi → dana 0". Hapus uji Royalti Bab 10.3.
- [ ] **Step 2:** `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implementasikan dan perbarui referensi UI.
- [ ] **Step 4:** `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(engine): dana leadership 5% menurut peringkat, ganti Royalti`.

### Task 6: Simulasi skenario headline dan dokumen hasil

**Files:**
- Modify: `src/engine/simulation.ts`, `scripts/simulate.ts`, `tests/simulation.test.ts`
- Regenerate: `docs/HASIL_SIMULASI.md`
- Modify: `docs/RINGKASAN_ATURAN.md`, `README.md`, `docs/ARSITEKTUR_SISTEM.md` (asumsi baru A13–A15: batas jendela 90 hari setengah terbuka, pemimpin dihitung di kaki biner dalam 10 level, kaki Balik Modal memakai `cumLicenses`)

**Interfaces:**
- Produces: `runHeadlineScenario(opts: { growthMonths: number; months: number; mode: "terus" | "sekali" }): SimulationResult`: setiap Mitra menjual 1 Lisensi ke kiri dan 1 ke kanan (`legPreference`) per bulan mulai bulan setelah aktivasi (`"terus"`: setiap bulan sampai `growthMonths`; `"sekali"`: hanya bulan pertamanya); semua membayar Langganan mulai bulan ke-4 dan mengonfirmasi pembinaan.
- `SimulationSummary` tambah `balikModalShare: number` (porsi Mitra yang jendela 90 harinya sudah selesai dan menerima BALIK_MODAL) dan `maxMonthPlanAPctWithFunds`.

- [ ] **Step 1: Tulis uji gagal** di `tests/simulation.test.ts`:
  - "headline terus 4 bulan: Mitra pertama menerima total ≥ Rp7.500.000 dalam 90 hari" (dibandingkan dengan angka spesifikasi Rp11.875.000; selisih karena aturan engine dicatat, bukan dipaksakan sama).
  - Uji plafon yang ada dijalankan juga untuk `runHeadlineScenario({growthMonths:5, months:8, mode:"terus"})`: setiap bulan `planAPaid − cadangan ≤ planACap`.
  - "batas atas per Lisensi < 60%" lewat `perLicenseUpperBounds()`.
- [ ] **Step 2:** `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implementasikan skenario; `scripts/simulate.ts` menambah bagian "Skenario headline" (total 90 hari Mitra pertama, `balikModalShare`, rasio bonus per bulan) dan memakai label v2.0.
- [ ] **Step 4:** `npm test && npm run typecheck && npm run simulate`. Expected: PASS dan `docs/HASIL_SIMULASI.md` diperbarui. Laporkan di commit message: median penghasilan, porsi Mitra tanpa bonus, bulan Plan A tertinggi, `balikModalShare`, apakah plafon pernah terpicu.
- [ ] **Step 5:** Perbarui `RINGKASAN_ATURAN.md` (bagian 3, 5, 6 ke v2.0), README (jumlah uji, "Rencana Pemasaran v2.0 (draf)").
- [ ] **Step 6:** Commit `feat(sim): skenario headline dan hasil simulasi v2.0`.

### Task 7: UI program 90 hari

**Files:**
- Modify: `src/app/pages/KantorMaya.tsx`, `src/app/pages/Aturan.tsx`, `src/app/pages/Landing.tsx`

- [ ] **Step 1:** KantorMaya: kartu "Program 90 Hari" dari `program90Progress`: sisa hari, pribadi x/4, tim x/4, kaki kiri/kanan, status Balik Modal. Headline dan subjudul wajib ditampilkan persis seperti spesifikasi bagian 1.
- [ ] **Step 2:** Aturan: tabel bonus 90 hari, plafon 60% / Pool 55%, 12 peringkat, leadership; seluruh nominal dibaca dari `PLAN`.
- [ ] **Step 3:** Landing: headline + subjudul wajib + kalimat resmi Balik Modal (spesifikasi R3). Tidak ada angka penghasilan lain.
- [ ] **Step 4:** `npm run build`. Expected: sukses. Jalankan `npm run dev` dan periksa `/`, `/aturan`, `/mitra` di peramban (Playwright tangkapan layar ke scratchpad); tidak ada error konsol.
- [ ] **Step 5:** Commit `feat(ui): program 90 hari, headline, dan aturan v2.0`.

### Task 8: Verifikasi akhir

- [ ] **Step 1:** `npm test && npm run typecheck && npm run build`. Expected: semua lulus.
- [ ] **Step 2:** `grep -rn "LEVEL\|ROYALTI\b\|levelBonus\|royaltyTiers\|smallLeg" src tests scripts`. Expected: tidak ada sisa selain `ROYALTI_RO`.
- [ ] **Step 3:** Bandingkan `docs/HASIL_SIMULASI.md` dengan spesifikasi bagian 10–11; tulis selisih di bagian "Catatan pembacaan".
- [ ] **Step 4:** Push ke `main`. Tidak ada deploy.
