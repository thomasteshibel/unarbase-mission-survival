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

- Use the persistent sidebar to open the dashboard, habitat and life-support views, crew and radiation monitoring, emergencies, the mission log, analytics, the final report, data-source information, settings, and help.
- Select an operating plan each day. When a scripted scenario is active, choose a response before advancing.
- Progress is stored locally in the browser. Starting a new mission replaces the currently saved mission.
- The sidebar collapses on desktop and becomes a slide-out drawer on narrow screens.

## Data provenance and scientific assumptions

**SIMULATED DATA — NOT LIVE NASA DATA.** Mission values are deterministic educational estimates, not predictions, habitat specifications, flight telemetry, or safety guidance. The Data Source page includes a bundled, archived NASA PDS Diviner lunar-surface temperature browse image for context only. It is not live or numeric mission data and does not affect the simulation.

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

The event sequence is repeatable rather than random: nominal operations; reduced solar output; reduced water-recovery efficiency; communication interruption; an oxygen-line leak; elevated radiation risk; and reduced battery capacity/discharge capability. Each event states its trigger, one-day modeled duration, and response consequences. This is a fixed teaching sequence—not an event probability model or a lunar weather forecast. The radiation and crew-health model is especially simplified and must not be interpreted medically.

Crew fatigue is represented as a 0–100 educational index. High fatigue increases modeled activity demand and can add a small health penalty. The communication-interruption scenario adds modeled crew workload. These values are not physiological predictions.

Exterior surface temperature is displayed as a scenario estimate separate from the habitat’s controlled cabin temperature. An environmental measurement at the lunar surface would not by itself establish conditions inside a shielded habitat.

## Data integration architecture

- `src/data/simulationConfig.js` contains starting inventories, astronaut roster, and explicit assumptions. `src/data/placeholderData.js` remains as a compatibility re-export.
- `src/data/simulationDataProvider.js` selects the local simulation provider.
- `src/data/simulationDataGenerator.js` generates deterministic daily mission conditions.
- `src/data/nasaDataCatalog.js` records provenance for the archived NASA PDS reference image.
- `src/data/nasaDataAdapter.js` accepts external measurements only after explicit verification and required provenance metadata.
- `src/data/dataValidator.js` validates mission state and external dataset metadata.
- `src/data/unitConverter.js` converts a limited set of compatible engineering units.
- `src/data/dataNormalizer.js` maps keyed external measurements to requested internal units.
- `src/simulation/` applies the mission resource, crew, radiation, and emergency models.
- `src/app.js` renders the UI and charts independently of data acquisition.

NASA mission-data mode remains unavailable because no compatible, verified data source is integrated into the mission calculations. The read-only NASA archive image does not make that mode available. The adapter does not invent NASA API responses, source names, measurements, or citations. Any future dataset must document its exact source and URL, units, collection period, spatial applicability, limitations, and intended use before it can be enabled.

## Deployment

The live GitHub Pages site is available at [https://thomasteshibel.github.io/unarbase-mission-survival/](https://thomasteshibel.github.io/unarbase-mission-survival/). Pushes to `main` build and deploy the static site through the GitHub Actions workflow in `.github/workflows/deploy.yml`. For local builds, run `npm run build`; the Pages-specific base path is set by the workflow. The simulator runs client-side and does not require an API server.
