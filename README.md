# LunarBase: Mission Survival

LunarBase is a browser-based educational lunar habitat survival simulator. The commander manages oxygen, water, food, electrical reserves, subsystem condition, radiation-risk scenarios, and crew condition across a mission of up to seven simulated days.

## Run locally

```bash
npm install
npm run dev
```

## Available scripts

```bash
npm run dev
npm run build
npm run test
```

## Mission workflow

- Use the persistent sidebar to open mission overview, dashboard, timeline, habitat/resource management, crew profiles and health, lunar environment, NASA Data Explorer, emergency response, decisions, analytics, reports, settings, and help.
- Mission time is fully manual: review the briefing, apply an event response if required, begin operations, then explicitly advance one day. Pause blocks all mission steps. No timer or animation advances resources.
- A new mission stores a scenario seed that reproducibly orders its scripted events. Reloading or loading the save preserves that event schedule.
- Progress is stored locally in the browser. Use Save and Load to manage the current browser save; starting a new mission replaces it.
- The sidebar collapses on desktop and becomes a slide-out drawer on narrow screens.

## Data provenance and scientific assumptions

**SIMULATED DATA — NOT LIVE NASA DATA.** Mission values are educational estimates, not predictions, habitat specifications, flight telemetry, or safety guidance. The NASA Data Explorer includes a bundled, archived NASA PDS Diviner lunar-surface temperature browse image for context only. It is historical visual data, not live numeric mission data, and does not affect the simulation.

The reference product is LRO Diviner’s global high-resolution midnight bolometric-temperature browse mosaic, covering 70°S–70°N. Its PDS label states a collection period of 2009-07-05 through 2022-08-01. The rendered JPEG is not a calibrated numeric table, cabin temperature, or crew exposure measurement. See [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) for source links, provenance, scope, and limitations.

The model assumptions live in `src/data/simulationConfig.js`; day-specific conditions and triggers are in `src/data/simulationDataGenerator.js`. The values are intentionally described as assumptions where a real vehicle specification is unavailable:

| Model input | Illustrative value | Unit / basis |
|---|---:|---|
| Crew oxygen metabolism | 0.84 kg per person-day, converted to about 588 L/person-day | L at standard temperature and pressure; approximately 700 L/kg |
| Gross water use | 3.5 | L/person-day |
| Baseline water recovery | 90% | Scenario assumption; an additional 0.55 L/person-day represents handling/hygiene losses |
| Packaged food | 0.62 | kg/person-day |
| Nominal electrical demand | 84 | kWh/day for the illustrative four-person habitat |
| Solar generation | 25 kW × 4.5 equivalent full-sun hours × 93% ≈ 105 | kWh/day; illustrative array and system factor |
| Cabin control targets | 101.3 kPa and 21 °C | Illustrative indoor targets, not live readings |
| Radiation display | 0–100 relative index | Dimensionless teaching device; not a dose, forecast, or measurement |

Starting inventories (20,000 L oxygen, 110 L water, 22 kg food, 360 kWh operational reserve, and 260 kWh backup battery) are scenario-design choices for a seven-day classroom exercise. In Settings, the commander can edit those starting inventories for a new mission and adjust the active simulation’s oxygen, water, food, power, solar-generation, and recycling assumptions. Model changes update the live baseline preview and affect upcoming operations; past history is preserved. Inputs are range-validated and never represent verified habitat capacities. Oxygen, water, food, and energy flows respond to crew activity, system efficiency, solar generation, and scripted equipment conditions; values are kept finite and non-negative.

Each mission includes nominal operations and a seeded permutation of the scripted solar, water-recovery, communications, oxygen-leak, radiation-risk, and battery scenarios. The seed is stored with the mission, so the sequence is reproducible on reload and differs across newly launched missions. Each event states its trigger, affected systems, duration, and response trade-offs. This is not an event probability model or lunar weather forecast. The radiation and crew-health model is especially simplified and must not be interpreted medically.

Crew fatigue is represented as a 0–100 educational index. High fatigue increases modeled activity demand and can add a small health penalty. The communication-interruption scenario adds modeled crew workload. Specialist profiles expose illustrative crew skills; the flight engineer can reduce the modeled power cost of selected repairs by up to 25%. Neither crew health nor skill is a physiological or engineering-performance prediction.

Exterior surface temperature is displayed as a scenario estimate separate from the habitat’s controlled cabin temperature. An environmental measurement at the lunar surface would not by itself establish conditions inside a shielded habitat.

## Data integration architecture

- `src/data/simulationConfig.js` contains starting inventories, astronaut roster, and explicit assumptions. `src/data/placeholderData.js` remains as a compatibility re-export.
- `src/data/simulationDataProvider.js` selects the local simulation provider.
- `src/data/simulationDataGenerator.js` builds reproducible scenario orders from a stored mission seed.
- `src/data/nasaDataCatalog.js` records provenance for the archived NASA PDS reference image.
- `src/data/nasaDataAdapter.js` accepts external measurements only after explicit verification and required provenance metadata.
- `src/data/dataValidator.js` validates mission state and external dataset metadata.
- `src/data/unitConverter.js` converts a limited set of compatible engineering units.
- `src/data/dataNormalizer.js` maps keyed external measurements to requested internal units.
- `src/simulation/` applies the mission resource, crew, radiation, and emergency models.
- `src/app.js` renders the UI and charts independently of data acquisition.

The NASA Data Explorer truthfully reports one downloaded and locally bundled PDS Diviner browse image. CRaTER and NASA SVS south-pole illumination are linked as external sources, not downloaded or adapted into the app. NASA mission-data mode remains unavailable because no compatible dataset is integrated into mission calculations. The adapter does not invent NASA API responses, measurements, or citations. Dataset details and limitations are in [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md).

## Deployment

The live GitHub Pages site is available at [https://thomasteshibel.github.io/unarbase-mission-survival/](https://thomasteshibel.github.io/unarbase-mission-survival/). Pushes to `main` build and deploy the static site through the GitHub Actions workflow in `.github/workflows/deploy.yml`. For local builds, run `npm run build`; the Pages-specific base path is set by the workflow. The simulator runs client-side and does not require an API server.
