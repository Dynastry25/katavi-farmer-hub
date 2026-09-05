# Katavi E-Kilimo — Awamu ya 2: UI ya Kisasa + Farmer Dashboard ya Kina

Hii ni nyongeza ya maboresho kwa mfumo ulioshapo (`katavi-farmer-hub`), si kuanza upya. Inashughulikia: muundo wa design, dashboards za kina za kila role, mwongozo kamili wa mkulima (shamba hadi soko), ripoti ya kifedha, chat, na uhamishaji wa Vikundi/Mikopo kwenda kwenye panel badala ya website kuu.

---

## A. Muelekeo wa Design (Token System)

**Rangi (Color)** — badala ya green+yellow ya kawaida ya "SaaS ya kilimo", chagua paleti yenye kina zaidi inayotoka kwenye udongo/mazao halisi ya Katavi:
- `#2E4B2F` — kijani cha giza cha majani (msingi, si bright green ya default)
- `#8C5A2B` — brown ya udongo/ardhi (accent ya msingi — inaakisi "shamba", si terracotta ya AI-generic)
- `#D9A441` — njano ya mavuno/mahindi (accent ya pili, kwa alerts/highlights)
- `#F6F3EC` — background ya joto isiyo cream ya kawaida
- `#1B1B18` — near-black yenye joto kidogo (maandishi)
- `#5B8DB8` — bluu ya anga (kwa Weather module pekee, si sehemu nyingine)

**Typography** — jozi mbili tofauti wazi: font ya slab-serif yenye uzito kwa vichwa vya habari (inatoa hisia ya "udongo/mizizi"), na sans-serif safi kwa data/majedwali (kusomeka vizuri kwenye simu). Epuka: all-caps eyebrows, single-word-bold kwenye vichwa, em-dash labels.

**Layout** — kila dashboard ianze na "hero" tofauti kulingana na kazi kuu ya role hiyo, si kadi zinazofanana zote:
- Mkulima → hero ni **Bei ya Leo + Tahadhari ya Hali ya Hewa** (ndiyo maamuzi ya kila siku)
- Mnunuzi → hero ni **Ramani/orodha ya mazao yaliyo karibu yanayopatikana sasa**
- Mtaalamu → hero ni **Foleni ya maswali yanayosubiri majibu**
- Admin → hero ni **Afya ya Jukwaa** (users wapya, miamala, matatizo yanayohitaji hatua)

Epuka: kadi zote za ukubwa/mviringo/kivuli kimoja (SaaS-card look), gradient za mapambo tu, namba zenye lebo ndogo juu bila sababu.

---

## B. Urekebishaji wa Muundo wa Website vs Panels

**Public website** ibaki: Home, Market (kuvinjari tu, si usimamizi), News/Videos, Weather, Advice, Inputs, About, Contact.

**Ondoa kabisa kwenye nav ya public**: "Vikundi vya Wakulima" na "Mikopo ya Kilimo". Vinaonekana tu baada ya kuingia (login), ndani ya panel ya mkulima:
- Farmer Dashboard → tab **"Vikundi Vyangu"** (unda/jiunge/simamia kikundi)
- Farmer Dashboard → tab **"Mikopo Yangu"** (omba, fuatilia hali, ona credit score)

---

## C. Farmer Dashboard — Maelezo ya Kina

### C1. Bei ya Soko (Price Intelligence)
- **Bei ya Leo** kwa kila zao analolima (kutoka `MarketPrice` model iliyopo)
- **Bei ya Wastani ya Sasa Sokoni** (wiki/mwezi) ikilinganishwa na bei ya leo — onyesha % ya tofauti
- **Tahadhari ya Mabadiliko ya Bei**: SMS/push automatic pale bei ikibadilika zaidi ya kiwango fulani (mf. ±10%) kwa zao analolifuatilia
- Chati ya mwenendo wa bei (line chart, Recharts) — historia + eneo

### C2. Mwongozo wa Kilimo — "Shamba Assistant" (kutoka shamba hadi soko)
Hii ni moduli mpya inayounganisha data zilizopo (Weather, Advisory, Crop) kuwa mwongozo mmoja unaofuata hatua za msimu wa kilimo:

1. **Uchaguzi wa eneo/udongo** — jedwali la ushauri wa zao-linalofaa-udongo kwa kata/wilaya (kama hakuna data ya udongo bado, anza na dataset ndogo iliyowekwa na admin/wataalamu kwa kila kata ya Katavi)
2. **Muda sahihi wa kupanda** — kanuni zinazounganisha Weather data + zao: "mvua zinatarajiwa Katavi wiki 2 zijazo — muda mzuri wa kupanda mahindi"
3. **Ratiba ya hatua za shamba** (crop-cycle tracker): Utayarishaji wa shamba → Upandaji → Palizi → Ufuatiliaji wa magonjwa → Uvunaji → Uhifadhi baada ya kuvuna → Uuzaji — kila hatua na vidokezo/tahadhari zake kwa wakati wake
4. **Magonjwa ya Mazao** — muunganiko na AI Crop Disease Detection iliyopo, pamoja na maktaba ya magonjwa ya kawaida kwa kila zao (dalili, kinga, tiba)
5. Dashibodi hii ionyeshe "Uko hatua gani sasa" kwa kila zao analolima, na vidokezo vinavyofaa hatua hiyo pekee (si taarifa zote kwa wakati mmoja)

### C3. Ripoti ya Kifedha ya Mkulima (Farmer P&L Report)
Ripoti ya kitaalamu, ya kipindi (msimu/mwezi):
- **Mapato**: jumla ya mauzo (kutoka Orders zilizokamilika), kwa zao
- **Matumizi**: manunuzi ya pembejeo (Inputs), malipo ya mikopo, na sehemu mpya ya "gharama nyingine" (mkulima anaweza kuongeza mwenyewe — mf. vibarua, mbegu asizonunua ndani ya mfumo)
- **Faida au Hasara**: Mapato − Matumizi, ikionyeshwa wazi na alama (✓ Faida / ✗ Hasara)
- **Mapendekezo ya kuongeza faida**: mfumo wa kanuni (rule-based, si lazima AI ngumu) — mf. "bei ya zao lako imeshuka mkoa wako — fikiria kuuza eneo lingine", "gharama za pembejeo zimeongezeka — angalia msambazaji mwingine mwenye bei nafuu"
- Chati ya faida kwa msimu (trend), na uwezo wa ku-download kama PDF

### C4. Mazungumzo (Chat) ndani ya Panel
- Farmer ↔ Mnunuzi: chat iliyounganishwa na order/bidhaa maalum (tumia ChatSystem/Socket.io iliyopo)
- Farmer ↔ Mtaalamu: chat ya ushauri, iliyounganishwa na ombi la ushauri
- Zote mbili ziwe "inbox" moja ndani ya Farmer Dashboard, tofauti na chat ya ufuatiliaji ya admin

---

## D. Dashboards za Wanunuzi na Wataalamu (kwa ufupi)

**Mnunuzi**: mwenendo wa manunuzi yake, mazao/wauzaji anaowapenda zaidi, tahadhari za bei kwa mazao anayofuatilia.

**Mtaalamu**: takwimu za maswali aliyojibu, rating yake, ratiba ya session, utendaji wa makala alizochapisha (mionekano/kura za "ilisaidia").

---

## E. Admin Dashboard — Analytics ya Kina + Utabiri

Zaidi ya chati za sasa, ongeza:
- **Matokeo Yanayotarajiwa** — utabiri rahisi (moving average) wa bei za wiki zijazo, mahitaji ya mazao, ukuaji wa watumiaji
- Ramani ya joto (heatmap) ya mahitaji kwa kata/wilaya
- Mwenendo wa mapato ya jukwaa (commission), ukuaji wa watumiaji kwa role

---

## F. PROMPT YA KUBORESHA MFUMO ULIOPO (bandika kwenye Claude Code/Cursor)

```
You are enhancing an EXISTING full-stack project called "katavi-farmer-hub"
(React 18 + Vite 7 frontend, Express 5 + MongoDB/Mongoose 8 backend, 24 models,
23 routes, Socket.io chat, JWT auth with role-based access, admin panel with 15
tabs). Do NOT rebuild from scratch — read the existing codebase structure first
(server/models, server/routes, src/components/Dashboards, src/components/Admin)
and extend it. Preserve existing auth, models, and API conventions.

GOAL 1 — VISUAL REDESIGN
Redesign the UI to feel distinctive and grounded in Tanzanian agriculture, not a
generic SaaS template. Use this design direction:
- Color tokens: #2E4B2F (deep leaf green, primary), #8C5A2B (soil brown, accent),
  #D9A441 (harvest gold, alerts/highlights), #F6F3EC (warm background),
  #1B1B18 (near-black text), #5B8DB8 (sky blue — Weather module only)
- Typography: one slab-serif/display family for headings, one clean sans-serif
  for body/data/tables — clearly distinct from each other
- Each dashboard type gets its own hero section reflecting its primary daily task
  (Farmer: today's price + weather alert; Buyer: nearby available produce;
  Expert: pending question queue; Admin: platform health KPIs) — not identical
  card grids across roles
- Avoid generic AI-design tells: no all-identical rounded-card-with-soft-shadow
  grids, no tracked-out all-caps eyebrow labels, no single-word-bold headline
  accents, no decorative gradients without purpose
- Keep mobile-first responsive, accessible focus states, and respect
  prefers-reduced-motion

GOAL 2 — RESTRUCTURE NAVIGATION
Remove "Farmer Groups" and "Loans" from the public website navigation and public
routes entirely. Move them to be accessible ONLY inside the authenticated Farmer
Dashboard as two new tabs: "Vikundi Vyangu" (groups) and "Mikopo Yangu" (loans).
Update route guards accordingly.

GOAL 3 — FARMER DASHBOARD DEEP FEATURES
Build/extend these modules inside the Farmer Dashboard, using existing models
(MarketPrice, Weather, Product, Order, Loan, FarmerGroup, Crop, Advisory) where
possible, adding new schemas only where needed:

1. Price Intelligence widget: today's price and current market average per crop
   the farmer grows, percentage difference, automatic SMS/push alert when price
   moves beyond a configurable threshold (e.g. ±10%), historical price trend
   chart (Recharts line chart)

2. "Shamba Assistant" farming guide module — a crop-cycle tracker covering:
   land/soil suitability recommendations by ward/district (start with an
   admin-curated reference dataset for Katavi wards if no soil API is available),
   planting-time recommendations that combine Weather data with crop type,
   a stage tracker (land prep → planting → weeding → disease watch → harvest →
   post-harvest storage → selling) surfacing only the tips relevant to the
   farmer's current stage per crop, and integration with the existing AI crop
   disease detection endpoint plus a reference library of common diseases per
   crop (symptoms, prevention, treatment)

3. Farmer Financial Report (P&L): aggregate income from completed Orders per
   crop, aggregate expenses from Input purchases and loan repayments, add a new
   "Other Expenses" log the farmer can fill in manually (labor, seed not bought
   on-platform, etc.), compute and clearly display Profit or Loss status per
   period (season/month), generate rule-based recommendations to improve
   profitability (e.g. price drop in their region → suggest alternate market;
   rising input costs → suggest alternate supplier), trend chart of profit over
   time, and PDF export using the existing reporting/export capability

4. Unified in-app chat inbox inside the Farmer Dashboard combining: Farmer↔Buyer
   chat tied to a specific product/order, and Farmer↔Expert advisory chat tied
   to an advisory request — using the existing Socket.io chat system, kept
   separate from the admin's chat monitoring view

GOAL 4 — BUYER & EXPERT DASHBOARD ENHANCEMENTS
- Buyer dashboard: add purchase trend analytics, favorite crops/sellers,
  price-drop alerts for crops they follow
- Expert dashboard: add stats on questions answered, their rating, session
  schedule, and performance of their published advisory articles (views/helpful
  votes)

GOAL 5 — ADMIN ANALYTICS UPGRADE
Add a forecasting section ("Matokeo Yanayotarajiwa") using simple moving-average
projections for near-term crop prices, demand, and user growth; add a demand
heatmap by ward/district; add platform revenue (commission) trend and user
growth by role to the existing Overview tab.

Implement incrementally: (1) design tokens + shared components first,
(2) navigation restructure for Groups/Loans, (3) Farmer Dashboard price +
financial report modules, (4) Shamba Assistant guide module, (5) unified chat
inbox, (6) Buyer/Expert dashboard enhancements, (7) Admin analytics upgrade.
Write tests for new financial calculation logic (profit/loss, price alerts)
since these involve money and must be accurate.
```

---

### Ushauri wa mwisho
Hii ni kazi kubwa — ningependekeza uanze na **Price Intelligence + Farmer P&L Report** (thamani ya haraka na inayoonekana kwa mkulima), kisha **Shamba Assistant**, kabla ya redesign kamili ya UI, ili maboresho ya design yafanyike juu ya features ambazo tayari zimekaa sawa kimantiki.
