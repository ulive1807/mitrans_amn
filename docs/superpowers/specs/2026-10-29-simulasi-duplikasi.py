"""Simulasi duplikasi: setiap Mitra mensponsori 2 Mitra baru per bulan (1 kiri, 1 kanan),
mulai bulan setelah ia bergabung. Rancangan bonus usulan (Fast Start, Pendamping, Balik Modal).
Semua orang dianggap aktif dan membeli 1 Lisensi saat bergabung. Ilustrasi, bukan proyeksi."""
import sys
NET = 6_756_757
SPONSOR, FS, PEND, BALIK = 750_000, 500_000, 100_000, 1_500_000
PAIR, MAXLV = 150_000, 10
PEMB = [0.25, 0.25, 0.25, 0.05, 0.05, 0.05]
MODE = sys.argv[1] if len(sys.argv) > 1 else "terus"   # terus = 2/bulan selamanya; sekali = 2 total
MONTHS = int(sys.argv[2]) if len(sys.argv) > 2 else 3

class N:
    def __init__(s, i, sp, m):
        s.i, s.sp, s.join = i, sp, m
        s.par = None; s.side = None; s.kids = {"L": None, "R": None}
        s.recruits = []; s.carry = {"L": 0, "R": 0}
        s.pay = {}; s.first_sale = None; s.balik = False
nodes = [N(0, None, 0)]
def add(sp, m, side):
    n = N(len(nodes), sp.i, m); nodes.append(n); sp.recruits.append(n.i)
    # tempatkan di ujung terluar kaki 'side' milik sponsor
    cur = sp
    while cur.kids[side] is not None: cur = nodes[cur.kids[side]]
    cur.kids[side] = n.i; n.par = cur.i; n.side = side
    return n
def credit(n, k, v, m): n.pay.setdefault(m, {}); n.pay[m][k] = n.pay[m].get(k, 0) + v
def in90(n, m): return m - n.join <= 3  # penjualan pada 3 bulan pertama sejak bergabung

for m in range(1, MONTHS + 1):
    sellers = [n for n in nodes if n.join < m and (MODE == "terus" or m == n.join + 1)]
    newn = []
    for sp in sellers:
        for side in ("L", "R"):
            n = add(sp, m, side); newn.append(n)
            credit(sp, "Sponsor", SPONSOR, m)
            if in90(sp, m): credit(sp, "Fast Start", FS, m)
            if sp.first_sale is None:
                sp.first_sale = m
                if sp.sp is not None and in90(sp, m): credit(nodes[sp.sp], "Pendamping", PEND, m)
    # volume pasangan 10 level
    vol = {}
    for n in newn:
        c, lv = n, 0
        while c.par is not None and lv < MAXLV:
            p = nodes[c.par]; lv += 1
            vol.setdefault(p.i, {"L": 0, "R": 0})[c.side] += 1
            c = p
    pairpay = {}
    for i, v in vol.items():
        p = nodes[i]
        for s in "LR": p.carry[s] += v[s]
        k = min(p.carry["L"], p.carry["R"])
        p.carry["L"] -= k; p.carry["R"] -= k
        if k: credit(p, "Pasangan", k * PAIR, m); pairpay[i] = k * PAIR
    for i, amt in pairpay.items():
        c, g = nodes[i], 0
        while c.sp is not None and g < 6:
            up = nodes[c.sp]; credit(up, "Pembinaan", amt * PEMB[g], m); c = up; g += 1
    # Balik Modal: 4 pribadi (min 1 tiap kaki) + 4 penjualan tim, dalam 90 hari
    for n in nodes:
        if n.balik or m - n.join > 3: continue
        pri = len(n.recruits)
        tim, stack = 0, list(n.recruits)
        while stack:
            x = nodes[stack.pop()]; tim += len(x.recruits); stack += x.recruits
        if pri >= 4 and tim >= 4: n.balik = True; credit(n, "Balik Modal", BALIK, m)

def tot(n, upto=None):
    return sum(v for mm, d in n.pay.items() if upto is None or mm <= upto for v in d.values())
A = nodes[0]
print(f"MODE={MODE}, {MONTHS} bulan, total orang termasuk A: {len(nodes)}")
print("Jumlah bergabung per bulan:", [sum(1 for n in nodes if n.join == m) for m in range(0, MONTHS + 1)])
for m in range(1, MONTHS + 1):
    d = A.pay.get(m, {})
    print(f"A bulan {m}: " + ", ".join(f"{k} {v:,.0f}" for k, v in d.items()) + f" | jumlah {sum(d.values()):,.0f}")
print(f"A total {MONTHS} bulan: {tot(A):,.0f}")
# hasil 90 hari tiap angkatan (yang sudah lengkap 90 harinya)
for c in range(0, MONTHS - 2):
    coh = [n for n in nodes if n.join == c]
    vals = sorted(tot(n, c + 3) - sum(v for mm, d in n.pay.items() if mm <= c for v in d.values()) for n in coh)
    print(f"Angkatan bulan {c} ({len(coh)} orang): 90 hari min {vals[0]:,.0f} median {vals[len(vals)//2]:,.0f} maks {vals[-1]:,.0f}; >=7,5jt: {sum(v >= 7_500_000 for v in vals)}")
# rasio bonus perusahaan per bulan
for m in range(1, MONTHS + 1):
    omzet = sum(1 for n in nodes if n.join == m) * NET
    bonus = sum(n.pay.get(m, {}).get(k, 0) for n in nodes for k in n.pay.get(m, {}))
    print(f"Bulan {m}: omzet bersih {omzet:,.0f}, bonus {bonus:,.0f} = {bonus / omzet:.1%} (belum termasuk dana peringkat 7% + leadership 5%)")
