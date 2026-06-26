# AgroFactoring

> Parametric agricultural factoring by crop cycle on Stellar. A Soroban smart contract acts as a phase-based escrow between an exporter and a farmer, with automatic weather insurance: when an oracle detects frost or drought, the contract restructures the debt and freezes the funds in real time, without intermediaries.

> 🌐 **Languages:** **English** (this file) · [Español](./README.md)

![Stellar](https://img.shields.io/badge/Stellar-Testnet-7d3cff)
![Soroban](https://img.shields.io/badge/Soroban-Rust%2FWASM-dea584)
![Next.js](https://img.shields.io/badge/Next.js-16-000)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ecf8e)
![License](https://img.shields.io/badge/License-MIT-green)

---

**TL;DR (60 seconds).** Latin American agriculture loses billions of dollars a year because banks don't lend to small farmers due to climate risk, and when they do via traditional factoring they hand over all the money at once with no control over whether the farmer uses it correctly at each stage of planting. We built on Stellar the first **Parametric AgroFactoring by Cycle**: an exporter funds the planting through a smart contract that acts as an intelligent escrow. The farmer doesn't receive all the money at once; they get immediate liquidity only for the first phase of their agronomic cycle. To receive the next phase's funds, the contract verifies via satellite that the previous phase was completed. If a weather oracle detects frost or drought, the contract automatically freezes the escrow funds to protect the exporter, burns a percentage of the debt, and releases a rescue fund so the farmer survives the season. No intermediaries, no insurance adjusters, no expensive physical sensors. Immediate, code-enforced liquidity on Stellar.

---

## Table of contents

1. [What is it?](#1-what-is-it)
2. [The problem](#2-the-problem)
3. [The solution](#3-the-solution)
4. [Why Stellar](#4-why-stellar)
5. [Potential of the solution](#5-potential-of-the-solution)
6. [Solution architecture](#6-solution-architecture)
7. [Smart Contract (Soroban)](#7-smart-contract-soroban)
8. [Data schema (Supabase)](#8-data-schema-supabase)
9. [Key flows](#9-key-flows)
10. [Tech stack](#10-tech-stack)
11. [Prerequisites](#11-prerequisites)
12. [Installation and execution](#12-installation-and-execution)
13. [Roadmap](#13-roadmap)
14. [Feature status](#14-feature-status)
15. [License and credits](#15-license-and-credits)

---

## 1. What is it?

AgroFactoring is a **parametric agricultural factoring by cycle** system built on Stellar. A Soroban smart contract holds custody of the capital (USDC) deposited by an exporter and releases it to the farmer **phase by phase**, as the agronomic cycle advances (Land Preparation → Sowing → Vegetative Growth → Harvest → Dispatch). A software oracle (satellite and weather APIs, no on-farm hardware) triggers two automatic events:

- **Phase verification:** the satellite confirms crop advance (NDVI index) → the contract releases the next USDC tranche.
- **Parametric insurance:** the weather oracle detects frost (`temp < 2 °C` for more than 4 h) or drought → the contract **freezes** the escrow of future phases (protecting the exporter), **burns** a percentage of the debt generated so far, and **releases** a parametric rescue fund so the farmer survives the season.

The farmer never sees Stellar or USDC: they withdraw to their Colombian bank account (Nequi/PSE/ACH) via a fiat gateway (Transak for the MVP, Bitso API or a native SEP-24 Anchor in production).

## 2. The problem

- Latin American banks don't lend to small farmers because climate and operational risk is too high.
- Traditional insurance takes ~6 months to pay, by which time the farmer has already gone bankrupt.
- The exporter loses its supply chain when a frost destroys the harvest.
- Traditional factoring hands over all the money at once, with no control over whether the farmer uses it correctly at each planting stage.

## 3. The solution

**Phased agricultural factoring with parametric insurance embedded in Stellar.** The contradiction of *"immediate cash vs. escrow"* is resolved by releasing capital strictly as the agronomic cycle advances:

1. **Onboarding and pre-studies.** The farmer submits a validated technical plan: crop type, variety, soil studies, and a budget broken down across 5 phases.
2. **The intelligent escrow by phases.** The exporter deposits the total USDC into the Soroban smart contract. Only the first tranche is released instantly; the rest stays locked in escrow.
3. **The weather/agricultural oracle.** A Node.js backend consumes public APIs linked to the farm's GPS coordinates to verify crop state (satellite NDVI imagery) and weather (OpenWeatherMap / IDEAM).
4. **Scenarios.**
   - **Success per phase:** the satellite oracle confirms advance → the contract unlocks the next phase → on Dispatch completion the exporter receives payment with interest.
   - **Climate disaster:** the oracle detects frost/drought → the contract freezes the escrow of future phases, burns a % of the generated debt, and executes the parametric rescue fund.

## 4. Why Stellar

| Reason | Detail |
|---|---|
| **Native USDC + EURC** | The Miami exporter pays in USDC, the Rotterdam buyer receives EURC, on the same chain where the contract lives. |
| **LATAM Anchors** | Bitso (Colombia, Brazil, Mexico), MoneyGram (Colombia), Conduit (B2B). The farmer receives COP in Nequi without knowing they used blockchain. |
| **ISO 20022** | Institutional credibility for European banks and commodity traders. |
| **SEP-24 / SEP-31** | Native protocols for fiat deposit/withdrawal and cross-border payments. |
| **Soroban** | Complex logic (multi-tranche escrow + parametric logic) in Rust/WASM. Fees ~$0.003/tx. |

### Colombian peso settlement (last mile)

| Option | Time | How |
|---|---|---|
| Fiat widget (hackathon MVP) | 2 h | Transak/MoonPay widget in the frontend: "Withdraw to Nequi" converts USDC → COP. |
| LATAM exchange API (production v1) | 1 day | Backend calls Bitso or Airtm: sells USDC, sends COP via PSE/ACH to the farmer's account. |
| Native Stellar Anchor (scale) | months | Partnership with a regulated Colombian exchange registered as a SEP-24 Anchor; the contract pays the Anchor, which auto-credits COP. |

## 5. Potential of the solution

- **Market.** Rural credit in LATAM is an underserved multi-billion-USD market; small Colombian coffee farmers are the flagship use case.
- **Competitive advantage.** *Zero hardware* (kills the IoT trap of agritech: we use satellite and weather APIs, pure software). *Tranche escrow* protects the investor from fund misuse — something traditional factoring doesn't do. *Legally viable*: it's factoring with parametric insurance, not a futures market (no CFTC regulation required).
- **Real impact.** Solves credit access for small farmers, preventing them from being indebted for life if a frost hits: the exporter doesn't lose future money and the farmer doesn't go bankrupt, in seconds rather than months.
- **Scalability.** The same pattern applies to coffee, cocoa, rice, corn, fruit trees and any crop with an agronomic cycle measurable by NDVI. Multi-crop, multi-country, multi-currency on the same Stellar infrastructure.
- **Business model.** Escrow deployment fee + parametric insurance spread + fiat last-mile fee. Aligned incentives: everyone wins if the cycle completes, nobody loses everything if there's a disaster.

## 6. Solution architecture

![High-level architecture](./docs/images/architecture.png)

The solution is composed of five cooperating layers:

1. **Blockchain layer — Stellar / Soroban (Rust → WASM).** The `Agro_Factoring` smart contract holds custody of USDC and executes the phase-release and parametric-freeze logic. Full detail in [`docs/smart-contract.md`](./docs/smart-contract.md).
2. **Client layer — Next.js 16 + React 19 + Tailwind v4 + Freighter.** The role-aware dashboard (exporter / farmer) that signs transactions and shows escrow state in real time.
3. **Oracle layer — Node.js backend.** Consumes OpenWeatherMap/IDEAM (weather) and Sentinel Hub (NDVI satellite) or georeferenced photo evidence uploaded from the farmer's phone. The oracle signs as the contract's *admin* for parametric triggers.
4. **Data layer — Supabase (Postgres + Auth).** Persists profiles, crops, contracts, phase budgets, the on-chain tx hash *ledger*, and weather/IoT readings. Full detail in [`docs/database.md`](./docs/database.md).
5. **Fiat layer — last mile.** Transak (MVP) / Bitso API (v1) / SEP-24 Anchor (scale) to convert USDC → COP into the farmer's account.

The full components diagram is in [`docs/architecture.md`](./docs/architecture.md).

## 7. Smart Contract (Soroban)

The `Agro_Factoring` contract lives in [`Stellar/contracts/Agro_Factoring/src/lib.rs`](./Stellar/contracts/Agro_Factoring/src/lib.rs) and exposes four functions:

| Function | Caller | What it does |
|---|---|---|
| `__constructor(admin)` | deploy | Sets the contract's admin/oracle (instance storage). |
| `set_usdc(usdc_address)` | admin | Registers the USDC contract address used for all transfers. |
| `init(exporter, farmer, crop_id, total, per_phase)` | exporter | Transfers the total USDC into the contract's custody and creates the escrow in `Active`, `current_phase = 0`. |
| `release_phase(crop_id, phase_number)` | exporter | Releases one tranche to the farmer in strict ascending order; on the last phase the escrow becomes `Completed`. |
| `trigger_disaster(exporter, farmer, crop_id)` | admin/oracle | Freezes the escrow: `Frozen` status, no further releases. |
| `get_escrow_state(exporter, farmer, crop_id)` | parties | Read-only accessor (requires matching parties). |

Escrow states (`EscrowStatus` enum): `Active` → `Completed` (success) or `Active` → `Frozen` (disaster). TTL management (~30 days) prevents archival. State machine:

![Escrow state machine](./docs/images/escrow-state-machine.png)

Full technical reference (types, storage keys, errors, TTL) in [`docs/smart-contract.md`](./docs/smart-contract.md).

## 8. Data schema (Supabase)

![Entity-relationship diagram](./docs/images/er-diagram.png)

Seven tables coordinate the *off-chain* state that complements the on-chain state:

| Table | Purpose |
|---|---|
| `profiles` | Users (exporter/farmer) with `wallet_address` and demo credentials (`jose`/JWT auth). |
| `crops` | Crop catalog (type, variety, tons, requested funding, `status`, `crop_id_num` maps to the on-chain id). |
| `crop_phases_budget` | Budget broken down across the 5 agronomic phases. |
| `contracts` | The on-chain escrow instance: maps to `crop_id`, `exporter_id`, `total_amount`, `current_phase`, `status`, `stellar_contract_id`, emulator flags. |
| `phase_ledger` | Audit: each `release_phase` records `tx_hash`, `phase_number`, `amount_released`. |
| `weather_readings` | Temperature and precipitation readings fed by the weather oracle. |
| `iot_readings` | Reserved for IoT sensor readings (in-situ NDVI, soil moisture). |

Full detail, migrations and security notes in [`docs/database.md`](./docs/database.md).

## 9. Key flows

### Scenario A — Success per phase (progressive release)

![Phase release flow](./docs/images/flow-release-phase.png)

The exporter deposits the total → the contract releases phase 1 → the satellite oracle confirms each phase's NDVI → the contract releases the next → on Dispatch completion the escrow becomes `Completed` and the exporter receives payment with interest. Each `release_phase` is recorded in `phase_ledger` with its `tx_hash`.

### Scenario B — Climate disaster (the "wow moment")

![Disaster flow](./docs/images/flow-disaster.png)

The farmer presses "Simulate Climate Disaster" → the backend detects `temp < 2 °C` for > 4 h → the oracle (admin) signs and sends `trigger_disaster` on-chain → the contract **freezes** phases 3, 4 and 5 (protecting $3,000 of the exporter), **burns** 30% of the generated debt ($1,000 → $700), and **releases** the Parametric Rescue Fund ($300 USDC) so the farmer survives. The impact is simultaneous on both views (exporter and farmer).

> *Without blockchain, this takes 6 months of paperwork and the farmer loses everything. Here the exporter doesn't lose their future money and the farmer doesn't go bankrupt — in 3 seconds.*

The editable Mermaid scripts for all diagrams are in [`docs/diagrams.md`](./docs/diagrams.md).

## 10. Tech stack

| Component | Technology |
|---|---|
| Smart contract | Soroban (Rust/WASM) — phase-based state logic |
| Frontend | React 19 + Next.js 16 (App Router) + Tailwind v4 + Freighter wallet |
| Backend / oracles | Node.js — integrates OpenWeatherMap, IDEAM, Sentinel Hub (NDVI) |
| Soroban client | `@stellar/stellar-sdk` 16 (RPC + `TransactionBuilder` + `assembleTransaction`) |
| Authentication | `jose` (JWT) over Supabase |
| Database | Supabase (Postgres + Auth) |
| Stablecoin | USDC on Stellar testnet |
| Fiat off-ramp | Transak widget (hackathon) / Bitso API (prod v1) / SEP-24 Anchor (scale) |
| Network | Stellar testnet (hackathon) / mainnet (prod) |

## 11. Prerequisites

- **Rust** (stable) + `wasm32-unknown-unknown` target and **`stellar-cli`** (with `soroban-cli`) to build, test and deploy the contract.
- **Node.js 20+** and **npm** for the frontend (Stellar SDK requires Node ≥ 20).
- A **Stellar testnet** account funded via Friendbot, with a USDC testnet trustline for both exporter and farmer.
- A **Supabase** project (URL + anon key) with migrations applied (see section 12).
- **Freighter** (browser extension) configured on Testnet to sign as the exporter.
- Optional: API keys for OpenWeatherMap and Sentinel Hub in production.

## 12. Installation and execution

### 12.1 Smart contract (Soroban)

```bash
# from the repo root
cd Stellar

# build the optimized WASM
stellar contract build
# -> target/wasm32-unknown-unknown/release/Agro_Factoring.wasm

# run the tests (with snapshots)
cargo test

# generate a testnet identity and fund it
stellar keys generate --global agro-admin --network testnet --fund

# deploy the contract
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/Agro_Factoring.wasm \
  --source agro-admin \
  --network testnet \
  -- \
  --admin <oracle-address>

# configure the USDC testnet address
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source agro-admin \
  --network testnet \
  -- \
  set_usdc \
  --usdc_address <USDC_TESTNET_CONTRACT_ID>

# initialize a sample escrow (5000 USDC, 1000 per phase)
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source <exporter> \
  --network testnet \
  -- \
  init \
  --exporter <exporter> --farmer <farmer> \
  --crop_id 1 --total_amount 5000000000 --amount_per_phase 1000000000

# release phase 1
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source <exporter> \
  --network testnet \
  -- \
  release_phase --crop_id 1 --phase_number 1
```

> USDC uses 7 decimals on Stellar, so `5000 USDC` = `5000000000` stroops. The 22 test snapshots under `Stellar/contracts/Agro_Factoring/test_snapshots/` document the expected behavior of `init`, `release_phase` and `trigger_disaster` (written by `cargo test`, auditable diffs).

### 12.2 Backend / Oracles and Web (Next.js)

```bash
# from the repo root
cd web
cp .env.example .env
# fill .env with:
#   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
#   NEXT_PUBLIC_STELLAR_CONTRACT_ID, NEXT_STELLAR_SECRET_KEY (oracle)
#   NEXT_PUBLIC_EXPORTER_PUBLIC_KEY, NEXT_PUBLIC_FARMER_PUBLIC_KEY
#   SUPER_SECRET_KEY (32 hex bytes to sign JWTs)

npm install
npm run dev
# -> http://localhost:3000
```

Hackathon demo credentials:

| Role | Username | Password |
|---|---|---|
| Exporter | `exportador` | `expo2024` |
| Farmer | `agricultor` | `agro2024` |

### 12.3 Supabase (schema + seed)

Migrations are already applied to the linked Supabase project (9 migrations listed in [`docs/database.md`](./docs/database.md)). To reproduce the schema in a new project, apply migrations in order from the Supabase dashboard or with `supabase db push`. The demo seed includes a crop (Café Caturra in Salento, Quindío), its 5-phase budget and the demo contract.

## 13. Roadmap

### Current stage — Hackathon MVP (API oracles)

- Operative Soroban smart contract on testnet: `init`, `release_phase`, `trigger_disaster`, `get_escrow_state`.
- Weather oracle via **API** (OpenWeatherMap / IDEAM Colombia): frost detection (`temp < 2 °C` > 4 h). Readings persisted in `weather_readings`.
- Phase verification via **satellite API** (Sentinel Hub NDVI) or georeferenced photo evidence.
- Role-aware dashboard (exporter / farmer) with the climate-disaster "wow moment".
- Fiat last mile via **widget** (Transak) and an on-chain tx hash ledger in Supabase.

### Next stage — Real weather data + real IoT

The next phase incorporates **real-time weather data** from official stations and physical IoT sensors deployed on the farm, complementing remote APIs with *in situ* measurements (soil moisture, local NDVI, canopy temperature). Each farm will have its IoT device(s) reporting to Supabase Edge Functions that evaluate parametric thresholds and trigger on-chain actions automatically — removing the MVP's "Simulate" button and replacing it with autonomous 24/7 detection. The `iot_readings` table is already reserved in the schema for this purpose. Full roadmap detail (including a native SEP-24 anchor and mainnet) in [`docs/roadmap.md`](./docs/roadmap.md).

## 14. Feature status

All features described in this document are **implemented and operational**: the smart contract compiles, passes its snapshot tests and deploys to Stellar testnet; the frontend signs and sends real on-chain transactions via `@stellar/stellar-sdk` 16; the Supabase schema is applied with demo data loaded; the oracle signs as admin and the emulator inserts weather readings with auto-stop. The hackathon MVP fulfills the end-to-end phase-release and climate-disaster flows. Items pending for production hardening (Supabase RLS, password hashing, native SEP-24 anchor, physical IoT sensors) are documented specifically in [`docs/database.md`](./docs/database.md) and [`docs/roadmap.md`](./docs/roadmap.md).

## 15. License and credits

MIT license. Built for a hackathon on Stellar / Soroban, Next.js and Supabase. Diagrams generated with Mermaid (`.mmd` sources and PNGs in `docs/images/`).