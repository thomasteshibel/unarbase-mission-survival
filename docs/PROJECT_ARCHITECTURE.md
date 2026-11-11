# LunarBase architecture

The application uses a modular structure so the mission logic remains separate from presentation.

## Core modules

- `src/data/simulationConfig.js`: educational simulation defaults and documented assumptions.
- `src/data/dataConfig.js`: keeps Simulation Mode active and NASA Data Mode unavailable until verified integration exists.
- `src/data/simulationDataGenerator.js`: deterministic daily scenarios and environmental context.
- `src/data/simulationDataProvider.js`: simulation provider boundary.
- `src/data/nasaDataAdapter.js`: validates explicitly verified external datasets; no acquisition is configured.
- `src/data/dataValidator.js`: mission-state invariants and external dataset provenance checks.
- `src/data/unitConverter.js` and `src/data/dataNormalizer.js`: compatible unit conversion and keyed normalization.
- `src/services/storageService.js`: localStorage save, restore, and recovery logic.
- `src/simulation/resourceSystem.js`: daily resource calculations and consumption logic.
- `src/simulation/radiationSystem.js`: simulated radiation events and response outcomes.
- `src/simulation/emergencySystem.js`: scenario-linked response choices and decision resolution.
- `src/simulation/missionEngine.js`: mission state management, scoring, and progression.
- `src/app.js`: rendering, DOM binding, mission flow, and UI state.
- `src/styles/main.css`: mission control visual design.

## Design principles

- Keep simulation calculations independent from the interface.
- Keep simulated inputs, validation, conversion, normalization, mission calculations, and rendering separate.
- Label all educational outputs as simulated and keep external data disabled until its provenance and compatibility are verified.
- Provide a consistent mission state that can be saved and restored.
- Keep every decision effect traceable and measurable in score and progress logs.
