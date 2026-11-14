# LunarBase: Mission Simulation Model Specification

**Project:** LunarBase: Mission Survival
**Challenge:** NASA Space Apps Challenge 2026 — Build a Junior Astronaut Mission Trainer
**Document Purpose:** Detailed specification of mathematical models, engineering assumptions, resource dynamics, and data boundaries.

---

## 1. Educational Objectives & Pedagogical Framework

LunarBase is an interactive Junior Astronaut Mission Trainer designed to teach students:
1. **Closed-Loop Life Support (ECLSS):** How mass-balance conservation and recycling efficiency govern human survival on the Moon.
2. **Space Radiation Environment:** The distinction between physical absorbed dose ($\mu\text{Gy}$), biological equivalent dose ($\mu\text{Sv}$), and educational risk indices.
3. **Operational Decision-Making:** How commanders balance consumable conservation, habitat equipment maintenance, and emergency response procedures.
4. **NASA Open Data Literacy:** How real space weather (DONKI), spaceflight biology (OSDR), radiation telemetry (RadLab), and planetary observations (LRO Diviner) inform mission design.

---

## 2. Core Simulation Architecture

### 2.1 Mission Scope & Duration
- **Supported Duration:** Strictly **1 to 7 simulated Earth days**.
- **Crew Complement:** 1 to 4 astronauts (Commander, Flight Engineer, Medical Officer, Science Specialist).
- **Difficulty Profiles:**
  - *Training:* Consumption scaled by $0.8\times$.
  - *Standard:* Nominal consumption ($1.0\times$).
  - *High Risk:* Consumption scaled by $1.2\times$.

### 2.2 Two-Stage Turn-Based Progression
Each mission day proceeds through two deliberate operational stages:
1. **Stage 1 (Briefing):** The commander reviews overnight telemetry, environmental conditions, and any active anomaly. If an emergency occurs, advancement is blocked until an emergency response is selected and applied in the Emergency Center.
2. **Stage 2 (Operations):** The commander selects a daily operational policy (e.g., normal operations, oxygen conservation, water rationing, radiation shelter protocol, crew rest) and commits the turn to advance the calendar.

---

## 3. Mathematical Resource Models

### 3.1 Metabolic Oxygen Model
- **Consumption Rate:** $588\text{ L/person-day}$ at standard temperature and pressure ($\approx 0.84\text{ kg/person-day}$, using $\approx 700\text{ L/kg}$).
- **Formula:**
  $$\text{Daily } \text{O}_2 \text{ Demand} = \text{Crew} \times 588 \times \text{DifficultyFactor} \times \text{ActivityFactor} + (\text{Reserves} \times \text{LeakFraction})$$
- **Starting Reserve:** $20,000\text{ L}$ (cryogenic/pressurized tank inventory).
- **Implementation Note:** Oxygen is modeled as a consumable tank inventory. Flight recycling technologies (electrolysis and Sabatier reduction) are presented as educational concepts in the Field Guide, not functioning simulation loops.

### 3.2 Water Recovery & Make-Up Model
- **Gross Baseline Requirement:** $3.5\text{ L/person-day}$ (hydration, rehydration, and hygiene).
- **Baseline Recycler Recovery:** $90\%$ ($0.90$).
- **Unrecovered Handling & Hygiene Losses:** $0.55\text{ L/person-day}$.
- **Net Daily Make-Up Formula:**
  $$\text{Net Water Make-Up} = \text{Crew} \times \left[ \text{grossWaterRate} \times (1 - \text{recovery}) + 0.55 \right] \times \text{waterUseFactor}$$
- **Nominal Habitat Baseline (4 Crew):**
  $$4 \times [3.5 \times (1 - 0.90) + 0.55] = 4 \times [0.35 + 0.55] = 4 \times 0.90 = \mathbf{3.60\text{ L/day}}.$$
- **Starting Inventory:** $110\text{ L}$.
- **Implementation Note:** The model requires fresh water make-up from storage tanks. Water recycling faults (e.g., Day 3 recycler drop to 45%) increase daily tank drain. Unsupported claims of a $2.5\text{ L/person-day}$ baseline are rejected.

### 3.3 Food & Nutrition Model
- **Ration Rate:** $0.62\text{ kg/person-day}$ of shelf-stable packaged flight rations.
- **Daily Consumption:**
  $$\text{Daily Food Demand} = \text{Crew} \times 0.62 \times \text{DifficultyFactor}$$
- **Starting Inventory:** $22\text{ kg}$.
- **Implementation Note:** Food is strictly a consumable inventory depletion model. There is **no simulated greenhouse, hydroponics, crop growth, or harvest event** in the runtime engine; space botany is presented as an educational topic linked to NASA OSDR plant studies (OSD-120).

### 3.4 Habitat Power & Electrical Energy Balance
- **Base Electrical Demand:** $84\text{ kWh/day}$ for a nominal 4-person habitat ($21\text{ kWh/person-day}$).
- **Solar Generation Model:** $104.625\text{ kWh/day}$ baseline, derived from an illustrative $25\text{ kW}$ photovoltaic array operating for $4.5$ equivalent full-sun hours at $93\%$ system efficiency.
- **Energy Balance:**
  $$\Delta E = \text{Solar Generation} - \text{Habitat Electrical Demand}$$
  - When $\Delta E \ge 0$: Excess energy charges primary reserves and battery storage ($260\text{ kWh}$ capacity).
  - When $\Delta E < 0$: Deficit discharges primary power reserves, then secondary battery strings.
- **Implementation Note:** The 7-day classroom scenario models daytime surface operations with an acute dust-on-array event (Day 2 solar factor: $0.62$). The 354-hour continuous lunar night is presented as an educational concept and LRO Diviner thermal dataset, not a 14-day operational blackout in the 7-day model.

### 3.5 Radiation Risk vs. Physical Dosimetry
- **Simulation Engine Model:** Uses a **dimensionless relative risk index (0–100)** to drive educational gameplay decisions. Shelter decisions reduce index severity.
- **Scientific Reality (NASA RadLab & Chang'e 4 Data):**
  - **Absorbed Dose ($D$, $\mu\text{Gy}$):** Physical energy deposited per unit mass ($1\text{ J/kg}$).
  - **Dose Equivalent ($H$, $\mu\text{Sv}$):** Biological tissue damage weighted by radiation quality factor $Q$ ($H = D \times Q$).
  - **Chang'e 4 LND Measurements (Zhang et al., 2020, DOI: 10.1126/sciadv.aaz1334):**
    - Total absorbed dose rate in silicon: $13.2 \pm 1\,\mu\text{Gy/hour}$ ($316.8\,\mu\text{Gy/day} \approx 0.317\,\text{mGy/day}$).
    - GCR charged-particle dose-equivalent rate converted to water: $57.1 \pm 10.6\,\mu\text{Sv/hour}$ ($1,370.4\,\mu\text{Sv/day} \approx \mathbf{1.37\text{ mSv/day}}$ 24-hour arithmetic extrapolation).
    - Continuous-exposure annual extrapolation: $500.2\text{ mSv/year}$ (daily rate $\times$ 365, not an observed year of operation).
  - **Boundary Note:** The unshielded lunar surface does **not** have an equivalent dose of $0.3–0.5\text{ mSv/day}$ (which confuses absorbed dose in mGy with equivalent dose in mSv, or applies only to heavily shielded habitats). Regolith shielding claims (e.g. 1.5–2 m berms) are unverified educational engineering models requiring complex particle transport codes (e.g., HZETRN).

---

## 4. Scripted 7-Day Scenario Schedule

The mission scenario schedule uses a pseudo-random seed to vary event ordering reproducibly:

| Day | Scenario Identifier | Trigger / Fault Description | Primary Effects |
|---|---|---|---|
| **1** | `nominal-operations` | Habitat checkout complete; all systems within nominal bands. | Baseline consumption; radiation index 18. |
| **2** | `reduced-solar` | Scheduled dust-on-array reduces photovoltaic output. | Solar factor drops to $62\%$ ($0.62$). |
| **3** | `recycler-malfunction` | Filter membrane fouling degrades water recovery. | Recovery drops to $45\%$; $+10\text{ kWh}$ recycler power load. |
| **4** | `communications-interruption` | Relay satellite eclipse handover interrupts contact. | Comms offline; $+8$ crew fatigue points. |
| **5** | `oxygen-leak` | Habitat seal micro-fracture induces cabin line leak. | $1.8\%$ ($0.018$) daily tank reserve loss. |
| **6** | `solar-radiation-event` | Coronal mass ejection shock accelerates solar energetic particles. | Radiation risk index spikes to $82$; shelter protocol indicated. |
| **7** | `battery-degradation` | Subsystem relay fault limits secondary power discharge. | Battery capacity & discharge limited to $70\%$. |

---

## 5. Scoring & Mission Debrief

Upon completing Day 7, `buildMissionReport()` evaluates performance:
- **Status:** `Mission Accomplished` (crew healthy, reserves nominal), `Partial Success` (reserves depleted or crew fatigue elevated), or `Mission Critical`.
- **Score:** Integer score ($0–100$) reflecting resource conservation, response appropriateness, and crew health maintenance.
- **Metrics Displayed:** Total resources consumed, remaining inventories, individual astronaut health/fatigue indices, and pedagogical debrief lessons.
- **Integrity Rule:** No fabricated "survivability percentages" or arbitrary grades are shown.

---

## 6. Verification & Automated Test Coverage

The simulation model is validated by an automated test suite using the Node.js test runner:
- `tests/missionEngine.test.js`: Validates starting states, 1–7 day boundaries, step advancement, deterministic seeding, and report generation.
- `tests/resourceSystem.test.js`: Validates gross/net water calculations ($3.5\text{ L}$ gross, $3.6\text{ L}$ net for 4 crew), non-negative bounds, and parameter updates.
- `tests/radiationSystem.test.js`: Validates relative risk transitions and shelter mitigation.
- `tests/radlabClient.test.js`: Validates Chang'e 4 LND citation (Zhang et al., 2020, DOI: 10.1126/sciadv.aaz1334), native hourly units, and environmental benchmark gradients.
