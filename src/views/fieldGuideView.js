/**
 * Junior Astronaut Field Guide Components
 *
 * Educational micro-modules providing concise, scientifically accurate explanations:
 * - What it is
 * - Why it matters in space
 * - How it affects a lunar mission
 * - What to observe / practical takeaway
 */

import { escapeHTML } from '../utils/formatting.js';

/**
 * Renders an educational Field Guide panel.
 * @param {Object} options
 * @returns {string} HTML string
 */
export function renderFieldGuideCard({
  title,
  subtitle = 'JUNIOR ASTRONAUT FIELD GUIDE · SCIENTIFIC PRINCIPLES',
  items = [],
  explorerLink = null
}) {
  return `
    <section class="field-guide-card">
      <div class="section-heading">
        <div>
          <p class="eyebrow">${escapeHTML(subtitle)}</p>
          <h2>${escapeHTML(title)}</h2>
        </div>
        <span class="tag tag-green">EDUCATIONAL BRIEFING</span>
      </div>
      <div class="field-guide-grid">
        ${items
          .map(
            (item) => `
          <div class="field-guide-item">
            <h4>${escapeHTML(item.heading)}</h4>
            <p>${escapeHTML(item.content)}</p>
          </div>
        `
          )
          .join('')}
      </div>
      ${
        explorerLink
          ? `
        <div style="margin-top: 14px; display: flex; justify-content: flex-end;">
          <button type="button" class="explorer-btn" data-page="nasa-explorer" data-explorer-target-tab="${escapeHTML(explorerLink.tab)}">
            Explore Genuine NASA Research: ${escapeHTML(explorerLink.label)} →
          </button>
        </div>
      `
          : ''
      }
    </section>
  `;
}

/**
 * Field guide for radiation monitoring page.
 */
export function renderRadiationFieldGuide() {
  return renderFieldGuideCard({
    title: 'Space Radiation & Habitat Shielding Mechanics',
    items: [
      {
        heading: 'What It Is',
        content: 'Space radiation consists of two primary threats: Galactic Cosmic Rays (GCR)—high-energy atomic nuclei originating outside our solar system—and Solar Particle Events (SPE)—intense bursts of relativistic protons driven by solar flares and CMEs.'
      },
      {
        heading: 'Why It Matters in Space',
        content: 'Earth is shielded by a thick atmosphere (~10,000 kg/m²) and a powerful geomagnetic dipole that deflects charged particles. The Moon has no global magnetic field and no atmosphere, exposing the surface to omnidirectional cosmic flux.'
      },
      {
        heading: 'How It Affects a Lunar Base',
        content: 'During quiet solar conditions, the unshielded lunar surface dose equivalent is ~57.1 ± 10.6 μSv/hour (~1,370 μSv/day = 1.37 mSv/day), as measured by Chang’e 4 LND (Zhang et al., Sci. Adv. 2020), while the absorbed dose in silicon is ~13.2 μGy/hour (~0.317 mGy/day). During peak SPEs, flux can exceed 250,000 μSv/day. Lunar habitat concept designs propose regolith shielding and storm shelters as educational architectural models; actual biological protection requires validated particle transport calculations.'
      },
      {
        heading: 'What to Observe',
        content: 'The simulator uses a relative 0–100 index for classroom training. When solar events occur, seeking shelter reduces simulated crew risk. Compare this educational index with real physical measurements in the NASA Data Explorer.'
      }
    ],
    explorerLink: { tab: 'radlab', label: 'NASA RadLab Dosimetry Records' }
  });
}

/**
 * Field guide for crew health and adaptation page.
 */
export function renderCrewHealthFieldGuide() {
  return renderFieldGuideCard({
    title: 'Human Physiological Adaptation to the Lunar Environment',
    items: [
      {
        heading: 'Musculoskeletal & Tissue Adaptation',
        content: 'In reduced gravity (the Moon is 1/6th of Earth gravity, 0.166g), skeletal muscles decondition without mechanical loading (investigated in NASA OSDR fast-twitch EDL muscle study OSD-665), and tissue wound repair kinetics are altered under weightlessness (documented in NASA spaceflight experiment OS-452).'
      },
      {
        heading: 'Circadian Stabilization',
        content: 'The natural lunar day/night cycle lasts 29.5 Earth days (about 14 continuous Earth-days of sunlight followed by 14 of dark). Habitats must enforce strict 24-hour artificial lighting with blue-depleted spectra before sleep to prevent severe cognitive fatigue.'
      },
      {
        heading: 'Endocrine & Immune Stress Response',
        content: 'Spaceflight investigations (such as NASA OSDR radiation endocrine/immune study OSD-566 and hepatic transcriptomics study OSD-379) demonstrate systemic metabolic and stress alterations driven by microgravity, altered sleep, confinement, and ionizing radiation.'
      },
      {
        heading: 'Operational Countermeasures',
        content: 'Astronauts use scheduled daily resistance and aerobic training (similar to ISS ARED and T2 treadmill protocols), balanced nutrition, and strict sleep hygiene to sustain mission readiness.'
      }
    ],
    explorerLink: { tab: 'osdr', label: 'NASA OSDR Space Biology Studies' }
  });
}

/**
 * Field guide for life support (ECLSS) systems.
 */
export function renderLifeSupportFieldGuide() {
  return renderFieldGuideCard({
    title: 'Closed-Loop Environmental Control & Life Support (ECLSS)',
    items: [
      {
        heading: 'Metabolic Oxygen Consumption',
        content: 'An adult astronaut metabolizes approximately 0.84 kg of oxygen per person-day (about 588 L at standard temperature and pressure). In LunarBase, this is modeled as an inventory depletion system; flight technologies like water electrolysis and carbon dioxide Sabatier reduction are educational reference concepts.'
      },
      {
        heading: 'Water Recovery Loop',
        content: 'Gross water baseline is 3.5 L/person-day for drinking, rehydration, and hygiene. With the 90% recycler recovery model and 0.55 L unrecovered hygiene/handling losses, net make-up is 0.90 L/person-day (3.6 L/day for 4 crew). Advanced flight systems (like ISS ECLSS) can recover up to 98% of humidity condensate and urine.'
      },
      {
        heading: 'Cabin Pressure & Chemistry',
        content: 'LunarBase targets an illustrative sea-level baseline (101.3 kPa with 21% O₂ / 78% N₂). Leak faults deplete reserves, requiring pressure sensors and rapid isolation valve management.'
      },
      {
        heading: 'Trade-off Balancing',
        content: 'Every liter of consumable not recycled must be launched from Earth at immense cost. Maintaining life-support system efficiency is the highest operational priority of a habitat commander.'
      }
    ]
  });
}

/**
 * Field guide for lunar surface and sunlight page.
 */
export function renderSurfaceFieldGuide() {
  return renderFieldGuideCard({
    title: 'Lunar South Pole Environment & Thermal Extremes',
    items: [
      {
        heading: 'Extreme Temperature Range',
        content: 'Without an atmosphere to distribute heat, equatorial lunar surfaces swing from -130 °C during night to +120 °C at lunar noon. In polar cold traps, temperatures plummet to 27 Kelvin (-246 °C)—among the coldest places in the solar system.'
      },
      {
        heading: 'Grazing Polar Sunlight',
        content: 'Due to the Moon’s small axial tilt (only 1.54° relative to the ecliptic), the Sun skims along the polar horizon, casting long grazing shadows and creating dramatic terrain-dependent lighting.'
      },
      {
        heading: 'Peaks of Eternal Light & PSRs',
        content: 'Elevated crater rims (such as Shackleton Rim) receive near-continuous illumination (over 70–86% of the year), making them prime solar power sites, while adjacent deep crater interiors remain in permanent shadow, trapping billion-year-old water ice volatiles.'
      },
      {
        heading: 'Lunar Dust (Regolith)',
        content: 'Micrometeorite bombardment has ground surface rocks into jagged, abrasive, electrostatic regolith particles. Mitigating dust intrusion is critical for spacesuit joints and habitat airlocks.'
      }
    ],
    explorerLink: { tab: 'surface', label: 'LRO Diviner & SVS Illumination Data' }
  });
}
