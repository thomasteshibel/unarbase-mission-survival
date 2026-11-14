/**
 * Authentic NASA Space Biology Studies & Flight Experiments
 *
 * Compiled from the NASA Open Science Data Repository (OSDR: https://osdr.nasa.gov/)
 * and the NASA Life Sciences Data Archive (LSDA: https://lsda.jsc.nasa.gov/).
 *
 * Scientific Integrity & Provenance Rules:
 * - Distinguish NASA study accessions (OSD-xxx) from NASA experiment identifiers (OS-xxx).
 * - Exact official NASA titles without combining separate experiments or inventing phrases.
 * - Accurate organism names (e.g. Rattus norvegicus vs. Mus musculus vs. Arabidopsis thaliana).
 * - Explicit verification status and portal availability documented for every record.
 * - Explicitly labeled as RESEARCH EVIDENCE — not fictional crew medical telemetry.
 */

import { DATA_CATEGORIES } from '../provenance.js';

export const CURATED_OSDR_STUDIES = Object.freeze([
  {
    accession: 'OSD-379',
    identifierType: 'NASA_STUDY_ACCESSION',
    verificationStatus: 'VERIFIED_OFFICIAL_STUDY',
    title: 'Transcriptional profiling of livers from mice flown on Rodent Research Reference Mission-1 (RRRM-1)',
    organism: 'Mus musculus (BALB/cAnNTac mouse)',
    category: DATA_CATEGORIES.RESEARCH_EVIDENCE,
    domain: 'Spaceflight Hepatic Transcriptomics & Aging',
    mission: 'Rodent Research Reference Mission-1 (RRRM-1) / ISS / SpaceX-16',
    tissue: 'Liver',
    collectionPeriod: '2018-12-05 to 2019-01-14',
    spatialApplicability: 'Low Earth Orbit (International Space Station, microgravity environment)',
    sourceUrl: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-379',
    publication: 'NASA Open Science Data Repository / Rodent Research Reference Mission-1',
    keyFindings:
      'Total RNA-Seq profiling of mouse liver tissue revealed age-dependent transcriptional alterations in lipid metabolism, xenobiotic detoxification pathways, and circadian hepatic gene expression when comparing young (10–12 week) and aged (32 week) mice exposed to spaceflight versus ground controls.',
    astronautRelevance:
      'Illustrates how spaceflight induces profound metabolic and hepatic gene regulation changes influenced by crew age and flight duration, emphasizing the need to monitor astronaut metabolic health and drug metabolism kinetics on long lunar missions.',
    limitations:
      'Mouse model in low Earth orbit; examines hepatic metabolic transcriptomics rather than skeletal muscle biomechanics or lunar 1/6th gravity.',
    keywords: ['liver', 'hepatic', 'metabolism', 'aging', 'rrrm-1', 'transcriptomics', 'mouse', 'osd-379']
  },
  {
    accession: 'OS-452',
    identifierType: 'NASA_EXPERIMENT_IDENTIFIER',
    verificationStatus: 'VERIFIED_EXPERIMENT_RECORD',
    title: 'Effect of Weightlessness on Tissue Regeneration in Rodents',
    organism: 'Rattus norvegicus (Rat)',
    category: DATA_CATEGORIES.RESEARCH_EVIDENCE,
    domain: 'Tissue Regeneration & Wound Healing in Weightlessness',
    mission: 'NASA Spaceflight Rodent Research Experiment',
    tissue: 'Cutaneous and connective healing tissues',
    collectionPeriod: 'Archived NASA Life Sciences Experiment',
    spatialApplicability: 'Spaceflight weightlessness analog',
    sourceUrl: 'https://lsda.jsc.nasa.gov/Experiment/exper/452',
    publication: 'NASA Life Sciences Data Archive (LSDA) Experiment OS-452',
    keyFindings:
      'Investigated spaceflight effects on wound repair kinetics, collagen deposition, and growth-factor responses in rats subjected to weightlessness, indicating suppressed healing and impaired connective tissue regeneration under microgravity conditions.',
    astronautRelevance:
      'Underscores the heightened risk of physical trauma and lacerations during lunar EVAs, as weightlessness alters cellular wound repair, growth factor signaling, and collagen synthesis.',
    limitations:
      'NASA Experiment record (OS-452) in a rodent wound model (Rattus norvegicus), not an accessioned OSD study dataset. Human surgical and cutaneous wound healing in lunar 1/6th gravity requires dedicated medical countermeasures.',
    keywords: ['regeneration', 'wound healing', 'collagen', 'growth factor', 'rat', 'os-452', 'tissue repair']
  },
  {
    accession: 'OSD-665',
    identifierType: 'NASA_STUDY_ACCESSION',
    verificationStatus: 'VERIFIED_OFFICIAL_STUDY',
    title:
      'Transcriptional profiling of right extensor digitorum longus muscle from mice flown on the RR-23 mission.',
    organism: 'Mus musculus (Mouse)',
    category: DATA_CATEGORIES.RESEARCH_EVIDENCE,
    domain: 'Skeletal Muscle Fiber Types & Transcriptomic Remodeling',
    mission: 'Rodent Research-23 (RR-23) / ISS / SpaceX-21',
    tissue: 'Right extensor digitorum longus (EDL) skeletal muscle',
    collectionPeriod: '2020-12-06 to 2021-01-13',
    spatialApplicability: 'Low Earth Orbit (International Space Station)',
    sourceUrl: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-665',
    publication: 'NASA Space Biology Program / Rodent Research-23',
    keyFindings:
      'Investigated microgravity-induced transcriptomic alterations specifically in the right extensor digitorum longus (EDL) fast-twitch skeletal muscle from mice flown aboard the ISS during RR-23 compared to ground controls.',
    astronautRelevance:
      'Demonstrates how fast-twitch skeletal muscles experience specific transcriptional remodeling under spaceflight weightlessness, guiding targeted astronaut resistance countermeasures for lunar surface exploration.',
    limitations:
      'Murine model in low Earth orbit. Examines right EDL muscle specifically; does not cover systemic human multi-year atrophy or ocular hydrodynamics directly.',
    keywords: [
      'muscle',
      'edl',
      'extensor digitorum longus',
      'rr-23',
      'microgravity',
      'transcriptomics',
      'mouse',
      'osd-665'
    ]
  },
  {
    accession: 'OSD-566',
    identifierType: 'NASA_STUDY_ACCESSION',
    verificationStatus: 'STUDY_UNAVAILABLE_ON_PORTAL',
    availability:
      'Direct study record currently reported unavailable on NASA OSDR portal; payload title and subject verified from NASA catalog archives.',
    title:
      'Sexual Dimorphism during Integrative Endocrine and Immune Responses to Ionizing Radiation in Mice -- Adrenal data',
    organism: 'Mus musculus (Mouse)',
    category: DATA_CATEGORIES.RESEARCH_EVIDENCE,
    domain: 'Radiation Endocrinology & Neuroendocrine Stress Axis',
    mission: 'NASA Space Radiation Program Investigation',
    tissue: 'Adrenal gland',
    collectionPeriod: 'Archived NASA Space Radiation Program Study',
    spatialApplicability: 'Ground-based space radiation simulation (ionizing radiation)',
    sourceUrl: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-566',
    publication: 'NASA Space Radiation Program Element',
    keyFindings:
      'Investigated sex-dimorphic transcriptional and hormonal responses in mouse adrenal glands following ionizing radiation exposure, exploring sex-specific modulation of corticosterone, adrenal steroidogenesis, and neuroendocrine stress pathways.',
    astronautRelevance:
      'Highlights that space ionizing radiation triggers systemic neuroendocrine and endocrine-immune stress responses that exhibit sexual dimorphism, informing personalized health monitoring for lunar astronauts.',
    limitations:
      'Direct study dataset is marked UNAVAILABLE on the NASA OSDR portal. Metadata and title preserved from official NASA payload records for educational context.',
    keywords: ['radiation', 'adrenal', 'endocrine', 'dimorphism', 'stress', 'immune', 'osd-566']
  },
  {
    accession: 'OSD-120',
    identifierType: 'NASA_STUDY_ACCESSION',
    verificationStatus: 'VERIFIED_OFFICIAL_STUDY',
    title:
      'Genetic dissection of the Arabidopsis spaceflight transcriptome: Are some responses dispensable for the physiological adaptation of plants to spaceflight?',
    organism: 'Arabidopsis thaliana',
    category: DATA_CATEGORIES.RESEARCH_EVIDENCE,
    domain: 'Plant Spaceflight Transcriptomics & Adaptation',
    mission: 'European Modular Cultivation System (EMCS) / ISS Flight Experiment',
    tissue: 'Arabidopsis whole seedling / rosette tissue',
    collectionPeriod: 'Archived NASA OSDR Spaceflight Study',
    spatialApplicability: 'Low Earth Orbit (International Space Station)',
    sourceUrl: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-120',
    publication: 'NASA Open Science Data Repository / Space Biology Program',
    keyFindings:
      'Evaluated whether specific spaceflight-induced transcriptional alterations in Arabidopsis thaliana are essential or dispensable for physiological adaptation to orbital microgravity, dissecting ecotype responses and genetic pathways governing plant survival in space.',
    astronautRelevance:
      'Provides essential genomic insight for engineering and cultivating space crops within lunar habitat bioregenerative life-support systems (BLSS) to supply fresh dietary nutrients and biological oxygen regeneration.',
    limitations:
      'Botanical model organism (Arabidopsis thaliana) in low Earth orbit. Addresses plant physiological adaptation, not human astronaut pathology.',
    keywords: ['plant', 'arabidopsis', 'transcriptomics', 'adaptation', 'emcs', 'blss', 'botany', 'osd-120']
  }
]);
