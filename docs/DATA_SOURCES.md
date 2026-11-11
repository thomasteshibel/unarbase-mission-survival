# Data sources and provenance

## Current release

**SIMULATED DATA — NOT LIVE NASA DATA.** The application does not acquire or display NASA measurements. Simulation assumptions are centralized in `src/data/simulationConfig.js`, while `src/data/simulationDataGenerator.js` supplies a deterministic seven-day scenario schedule with explicit triggers and duration.

All current values are illustrative engineering assumptions for an educational exercise. The model assumptions, units, initial inventories, and limitations are documented in the root [README](../README.md) and in the in-app Data Source page. Lunar surface scenario estimates are never presented as cabin conditions.

## NASA Data Mode

NASA Data Mode is unavailable because no compatible, verified dataset or acquisition source is integrated. `src/data/dataConfig.js` keeps the mode disabled; the UI cannot switch simulated output to NASA data.

Before any external dataset can be enabled, document the dataset name, original source, source URL, measurement units, collection period, geographic/spatial applicability, limitations, and how the variable is used. Confirm that environmental measurements are applicable to the intended model variable and do not treat surface measurements as direct habitat readings.

## Integration boundaries

- `src/data/nasaDataAdapter.js` validates and adapts an explicitly verified external dataset; it does not fetch data.
- `src/data/dataValidator.js` checks mission-state invariants and required external provenance metadata.
- `src/data/unitConverter.js` converts a limited set of compatible engineering units.
- `src/data/dataNormalizer.js` maps keyed measurements into requested internal units.
- `src/data/simulationDataProvider.js` provides the local educational simulation separately from external data.

No API response, NASA dataset name, citation, or measurement is fabricated. A future acquisition layer and source-specific compatibility checks must be implemented and tested before NASA Data Mode can be made available.
