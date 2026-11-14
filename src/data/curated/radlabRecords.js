/**
 * Space Radiation Dosimetry Records & Comparative Benchmarks
 *
 * Compiled from peer-reviewed scientific literature (ISS SRAG, MSL RAD science team,
 * and Kiel University Chang'e 4 Lander) and the NASA RadLab Data API specification
 * (https://visualization.osdr.nasa.gov/radlab/api/).
 *
 * Scientific Integrity & Classification Rules:
 * - Native telemetry in NASA RadLab is documented in μGy/hour and μSv/hour.
 * - ISS values are classified as Literature-Derived Educational Benchmarks.
 * - MSL values are classified as Published Literature Summaries (Zeitlin et al., 2013; Hassler et al., 2014).
 * - Lunar surface LND is classified as an External International Measurement (CNSA / Kiel University), NOT NASA RadLab.
 * - Never represented as direct measurements inside the simulated LunarBase habitat.
 */

import { DATA_CATEGORIES } from '../provenance.js';

export const RADLAB_DOSIMETRY_RECORDS = Object.freeze([
  {
    recordId: 'RADLAB-ISS-LIULIN-EXP55',
    instrument: 'Liulin-6R Silicon Spectrometer',
    mission: 'International Space Station (ISS) Expedition 55/56',
    detectorLocation: 'Columbus Module, Starboard Rack, Shielded Interior',
    detectorType: 'Silicon Semiconductor Dosimeter/Spectrometer',
    observationPeriod: 'Expedition 55/56 representative solar quiet baseline',
    category: DATA_CATEGORIES.LITERATURE_BENCHMARK,
    classificationLabel: 'Literature-Derived Educational Benchmark',
    source: 'NASA OSDR RadLab Instrument Catalog & ESA European Space Agency',
    sourceUrl: 'https://visualization.osdr.nasa.gov/radlab/api/',
    environment: 'Low Earth Orbit (altitude ~408 km, inclination 51.6°)',
    measurements: {
      absorbedDoseRateUGyHour: 9.14,
      doseEquivalentRateUSvHour: 18.03,
      absorbedDoseRateUGyDay: 219.4,
      doseEquivalentRateUSvDay: 432.8,
      qualityFactorQ: 1.97
    },
    units: {
      absorbedDoseRateUGyHour: 'μGy/hour',
      doseEquivalentRateUSvHour: 'μSv/hour',
      absorbedDoseRateUGyDay: 'μGy/day (24h quiet reference)',
      doseEquivalentRateUSvDay: 'μSv/day (24h quiet reference)',
      qualityFactorQ: 'dimensionless'
    },
    integrationMethod: 'Daily values represent a nominal 24-hour quiet period extrapolation (rate × 24h); real-time orbital rates vary significantly during South Atlantic Anomaly (SAA) passes.',
    scientificSignificance: 'Measures mixed radiation fields inside the European Columbus laboratory, which is shielded by Earth’s geomagnetic field and the ISS pressurized aluminum hull structure.',
    limitations: 'LEO measurements inside a shielded station do NOT represent the unshielded lunar surface or interior habitat conditions. Earth’s magnetosphere deflects a major fraction of galactic cosmic rays.'
  },
  {
    recordId: 'RADLAB-ISS-TEPC-EXP38',
    instrument: 'Tissue Equivalent Proportional Counter (TEPC)',
    mission: 'International Space Station (ISS) Expedition 38',
    detectorLocation: 'Service Module (Zvezda Corridor)',
    detectorType: 'Spherical Low-Pressure Gas Proportional Counter (2-micron tissue equivalent)',
    observationPeriod: 'Expedition 38 baseline survey',
    category: DATA_CATEGORIES.LITERATURE_BENCHMARK,
    classificationLabel: 'Literature-Derived Educational Benchmark',
    source: 'NASA Johnson Space Center Space Radiation Analysis Group (SRAG) / RadLab Catalog',
    sourceUrl: 'https://visualization.osdr.nasa.gov/radlab/api/',
    environment: 'Low Earth Orbit (ISS Service Module corridor)',
    measurements: {
      absorbedDoseRateUGyHour: 10.21,
      doseEquivalentRateUSvHour: 21.35,
      absorbedDoseRateUGyDay: 245.1,
      doseEquivalentRateUSvDay: 512.4,
      qualityFactorQ: 2.09
    },
    units: {
      absorbedDoseRateUGyHour: 'μGy/hour',
      doseEquivalentRateUSvHour: 'μSv/hour',
      absorbedDoseRateUGyDay: 'μGy/day (24h quiet reference)',
      doseEquivalentRateUSvDay: 'μSv/day (24h quiet reference)',
      qualityFactorQ: 'dimensionless'
    },
    integrationMethod: 'Daily values represent a nominal 24-hour quiet period extrapolation (rate × 24h); does not capture instantaneous microdosimetric variance across orbital inclinations.',
    scientificSignificance: 'TEPC models microdosimetric energy deposition directly in human tissue cells. Detects cyclic dose spikes during passes through the South Atlantic Anomaly.',
    limitations: 'Specific to the mass shielding distribution of the ISS Russian Service Module. SAA radiation belt passages do not exist on the Moon.'
  },
  {
    recordId: 'RADLAB-MSL-CRUISE',
    instrument: 'Radiation Assessment Detector (RAD)',
    mission: 'Mars Science Laboratory (MSL Curiosity Cruise Stage)',
    detectorLocation: 'Inside MSL Spacecraft Cruise Stage',
    detectorType: 'Solid-State Silicon & Cesium Iodide (CsI) Scintillator Telescope',
    observationPeriod: '2011-12-06 to 2012-07-14 (253-day heliospheric transit to Mars)',
    category: DATA_CATEGORIES.LITERATURE_BENCHMARK,
    classificationLabel: 'Published Literature Summary (Zeitlin et al., Science 2013)',
    source: 'Southwest Research Institute (SwRI) / NASA MSL Science Team (Zeitlin et al., Science 340, 2013)',
    sourceUrl: 'https://doi.org/10.1126/science.1235989',
    environment: 'Interplanetary Deep Space (1.0 AU to 1.5 AU, 4π omnidirectional exposure)',
    measurements: {
      absorbedDoseRateUGyHour: 19.2,
      doseEquivalentRateUSvHour: 76.7,
      absorbedDoseRateUGyDay: 461.0,
      doseEquivalentRateUSvDay: 1840.0,
      qualityFactorQ: 3.82
    },
    units: {
      absorbedDoseRateUGyHour: 'μGy/hour',
      doseEquivalentRateUSvHour: 'μSv/hour',
      absorbedDoseRateUGyDay: 'μGy/day (253-day flight mission average)',
      doseEquivalentRateUSvDay: 'μSv/day (253-day flight mission average)',
      qualityFactorQ: 'dimensionless'
    },
    integrationMethod: 'Published mission-average rate from 253 days of deep space cruise data published by the MSL RAD science team (0.461 ± 0.054 mGy/day and 1.84 ± 0.30 mSv/day).',
    scientificSignificance: 'First comprehensive radiation measurements taken during an interplanetary transit to Mars. Measures unshielded deep space galactic cosmic ray background during solar quiet conditions.',
    limitations: 'Interplanetary 4π omnidirectional exposure inside a robotic spacecraft. A lunar surface habitat benefits from 2π solid angle shielding provided by the Moon below.'
  },
  {
    recordId: 'RADLAB-MSL-SURFACE-GALE',
    instrument: 'Radiation Assessment Detector (RAD)',
    mission: 'MSL Curiosity Rover Surface Operations (Gale Crater)',
    detectorLocation: 'Rover Top Deck, Gale Crater (-4.5 km elevation)',
    detectorType: 'Silicon & Scintillator Telescope',
    observationPeriod: '2012-08-14 to 2013-06-20 (First 300 Martian sols)',
    category: DATA_CATEGORIES.LITERATURE_BENCHMARK,
    classificationLabel: 'Published Literature Summary (Hassler et al., Science 2014)',
    source: 'SwRI / NASA MSL Science Team (Hassler et al., Science 343, 2014)',
    sourceUrl: 'https://doi.org/10.1126/science.1244797',
    environment: 'Mars Surface (Thin CO₂ atmosphere ~600 Pa, no global dipole field)',
    measurements: {
      absorbedDoseRateUGyHour: 8.75,
      doseEquivalentRateUSvHour: 26.67,
      absorbedDoseRateUGyDay: 210.0,
      doseEquivalentRateUSvDay: 640.0,
      qualityFactorQ: 3.05
    },
    units: {
      absorbedDoseRateUGyHour: 'μGy/hour',
      doseEquivalentRateUSvHour: 'μSv/hour',
      absorbedDoseRateUGyDay: 'μGy/day (300-sol surface average)',
      doseEquivalentRateUSvDay: 'μSv/day (300-sol surface average)',
      qualityFactorQ: 'dimensionless'
    },
    integrationMethod: 'Published surface-average rate over first 300 Martian sols published by the MSL RAD science team (0.21 ± 0.04 mGy/day and 0.64 ± 0.12 mSv/day).',
    scientificSignificance: 'Measures surface radiation on a planetary body. The planetary mass blocks 50% (2π steradians) of incoming cosmic rays, and Mars’s thin atmosphere provides an additional ~20 g/cm² shielding.',
    limitations: 'Mars has an atmosphere that absorbs low-energy cosmic rays and generates secondary neutrons. The airless Moon has no atmosphere, resulting in a higher unshielded surface dose.'
  },
  {
    recordId: 'RADLAB-LUNAR-SURFACE-LND',
    instrument: 'Lunar Lander Neutrons & Dosimetry (LND)',
    mission: 'Lunar Far Side Surface (Chang’e 4 Lander)',
    detectorLocation: 'Lander Payload Deck, Von Kármán Crater',
    detectorType: 'Silicon Semiconductor Telescope & Thermal Neutron Detector',
    observationPeriod: '2019-01-04 to 2019-01-15 (First lunar day observations)',
    category: DATA_CATEGORIES.LITERATURE_BENCHMARK,
    classificationLabel: 'External International Measurement (Kiel University / CNSA, Science Advances 2020)',
    source: 'National Space Science Center / Kiel University (Zhang et al., Sci. Adv. 6, eaaz1334, 2020)',
    sourceUrl: 'https://doi.org/10.1126/sciadv.aaz1334',
    environment: 'Lunar Surface (Airless body, no intrinsic dipole field, 2π planetary shielding)',
    measurements: {
      absorbedDoseRateUGyHour: 13.2,
      doseEquivalentRateUSvHour: 57.1,
      absorbedDoseRateUGyDay: 316.8,
      doseEquivalentRateUSvDay: 1370.4,
      qualityFactorQ: 4.32
    },
    units: {
      absorbedDoseRateUGyHour: 'μGy/hour (total absorbed dose rate in silicon: 13.2 ± 1)',
      doseEquivalentRateUSvHour: 'μSv/hour (GCR charged-particle dose-equivalent rate converted to water: 57.1 ± 10.6)',
      absorbedDoseRateUGyDay: 'μGy/day (24h arithmetic extrapolation: ~0.317 mGy/day)',
      doseEquivalentRateUSvDay: 'μSv/day (24h arithmetic extrapolation: ~1.37 mSv/day)',
      qualityFactorQ: 'dimensionless'
    },
    integrationMethod: 'Published average hourly rates (total absorbed dose rate in silicon: 13.2 ± 1 μGy/hr; GCR charged-particle dose-equivalent rate converted to water: 57.1 ± 10.6 μSv/hr) measured by the Lunar Lander Neutrons and Dosimetry (LND) experiment on Chang’e 4 in Von Kármán crater (Zhang et al., 2020). The 1.37 mSv/day (1,370.4 μSv/day) equivalent dose and 0.317 mGy/day (316.8 μGy/day) absorbed dose are 24-hour arithmetic extrapolations (rate × 24h), not measured daily cumulative totals.',
    scientificSignificance: 'First time-resolved radiation dosimetry on the lunar surface. Reports a GCR charged-particle dose-equivalent rate converted to water of 57.1 ± 10.6 μSv/hr (~1.37 mSv/day 24h arithmetic extrapolation), approximately 2.6 times higher than the ISS interior and ~200 times higher than Earth sea level due to lack of an atmosphere and magnetic dipole.',
    limitations: 'External international experiment (CNSA/Kiel University), NOT a NASA instrument in RadLab. Measured on an unshielded lander deck; does not represent conditions inside a shielded lunar habitat. The 1.37 mSv/day figure is a 24-hour arithmetic extrapolation, and the 500.2 mSv/year figure is a continuous-exposure arithmetic extrapolation assuming constant quiet conditions without solar particle spikes or orbital variations—neither represents an observed annual measurement of Chang’e 4 operation. The unshielded lunar surface does NOT have a 0.3–0.5 mSv/day dose equivalent (a figure that confuses absorbed dose in mGy with equivalent dose in mSv or applies only to shielded habitats). Regolith shielding effectiveness estimates (e.g., 1.5–2 m berms) are unverified educational engineering assumptions requiring validated nuclear transport simulation.'
  }
]);

export const RADIATION_BENCHMARK_SCALE = Object.freeze([
  {
    location: 'Earth Sea Level (Average Natural Background)',
    doseEquivalentRateUSvHour: 0.03,
    doseEquivalentRateUSvDay: 0.7,
    mSvPerYear: 0.25,
    shielding: 'Atmospheric Column (~10,000 kg/m²) + Global Geomagnetic Dipole',
    sourceLabel: 'UNSCEAR 2008 Global Terrestrial Survey',
    description: 'Natural terrestrial baseline from radon, terrestrial radionuclides, and cosmogenic background.'
  },
  {
    location: 'Commercial Transatlantic Flight (10 km altitude)',
    doseEquivalentRateUSvHour: 3.0,
    doseEquivalentRateUSvDay: 72.0,
    mSvPerYear: 26.0,
    shielding: 'Partial atmospheric column (~200–300 g/cm² remaining)',
    sourceLabel: 'FAA Advisory Circular AC 120-61B',
    description: 'Elevated cosmic ray secondary flux at standard jet cruising altitudes.'
  },
  {
    location: 'ISS Shielded Interior (Low Earth Orbit)',
    doseEquivalentRateUSvHour: 18.0,
    doseEquivalentRateUSvDay: 432.0,
    mSvPerYear: 158.0,
    shielding: 'Earth Magnetosphere + Pressurized Aluminum Hull (~15 g/cm²)',
    sourceLabel: 'ESA / NASA RadLab Catalog (Liulin-6R / TEPC baseline)',
    description: 'Measured inside the Columbus and Service Modules during solar quiet conditions.'
  },
  {
    location: 'Mars Surface (Gale Crater, Curiosity Rover)',
    doseEquivalentRateUSvHour: 26.7,
    doseEquivalentRateUSvDay: 640.0,
    mSvPerYear: 233.0,
    shielding: '2π Planetary Solid Core + Thin CO₂ Atmosphere (~20 g/cm²)',
    sourceLabel: 'NASA MSL RAD SwRI Team (Hassler et al., Science 2014)',
    description: 'Surface radiation on Mars, moderated by thin atmospheric shielding and planetary body.'
  },
  {
    location: 'Lunar Surface (Unshielded Exterior)',
    doseEquivalentRateUSvHour: 57.1,
    doseEquivalentRateUSvDay: 1370.4,
    mSvPerYear: 500.2,
    shielding: '2π Planetary Solid Core only (No atmosphere, no global dipole field)',
    sourceLabel: 'CNSA / Kiel University LND (Zhang et al., Sci. Adv. 2020)',
    description: 'Direct measurement on unshielded lunar lander deck (57.1 ± 10.6 μSv/h; 1.37 mSv/day 24h extrapolation; 500.2 mSv/yr continuous extrapolation, not an observed year); ~2.6× higher than ISS.'
  },
  {
    location: 'Deep Space Heliospheric Transit (Interplanetary Cruise)',
    doseEquivalentRateUSvHour: 76.7,
    doseEquivalentRateUSvDay: 1840.0,
    mSvPerYear: 672.0,
    shielding: 'Spacecraft shell only (4π omnidirectional cosmic ray exposure)',
    sourceLabel: 'NASA MSL RAD SwRI Team (Zeitlin et al., Science 2013)',
    description: 'Deep space galactic cosmic ray background measured during 253-day transit to Mars.'
  },
  {
    location: 'Peak Solar Particle Event (SPE, Unshielded)',
    doseEquivalentRateUSvHour: 10000.0,
    doseEquivalentRateUSvDay: 250000.0,
    mSvPerYear: 'N/A (Acute episode)',
    shielding: 'Unshielded space',
    sourceLabel: 'NOAA SWPC / NASA Space Radiation Modeling',
    description: 'Acute radiation hazard; requires immediate shelter (storm shelter models are educational design assumptions modeled after habitat shielding concepts).'
  }
]);
