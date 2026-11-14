import assert from 'node:assert/strict';
import test from 'node:test';
import {
  searchOSDRStudies,
  getCuratedStudyByAccession
} from '../src/data/api/osdrClient.js';
import { DATA_CATEGORIES } from '../src/data/provenance.js';

test('searchOSDRStudies returns authentic space biology studies', async () => {
  const result = await searchOSDRStudies('', { offlineOnly: true, forceRefresh: true });

  assert.ok(result);
  assert.equal(result.dataSource, 'curated_nasa_archive');
  assert.ok(result.studies.length >= 5);

  for (const study of result.studies) {
    assert.match(study.accession, /^(OSD|OS)-\d+/);
    assert.ok(study.identifierType);
    assert.ok(study.verificationStatus);
    assert.ok(study.title);
    assert.ok(study.organism);
    assert.ok(study.domain);
    assert.equal(study.category, DATA_CATEGORIES.RESEARCH_EVIDENCE);
    assert.match(study.sourceUrl, /^https:\/\//);
    assert.ok(study.astronautRelevance);
    assert.ok(study.limitations);
  }

  assert.equal(result.provenance.category, DATA_CATEGORIES.RESEARCH_EVIDENCE);
});

test('searchOSDRStudies filters studies by keyword correctly across verified domains', async () => {
  // Test muscle query (matches OSD-665 EDL muscle)
  const muscleResult = await searchOSDRStudies('muscle', { offlineOnly: true, forceRefresh: true });
  assert.ok(muscleResult.studies.length > 0);
  assert.ok(muscleResult.studies.some((s) => s.accession === 'OSD-665'));

  // Test liver query (matches OSD-379 RRRM-1 liver transcriptomics)
  const liverResult = await searchOSDRStudies('liver', { offlineOnly: true, forceRefresh: true });
  assert.ok(liverResult.studies.length > 0);
  assert.ok(liverResult.studies.some((s) => s.accession === 'OSD-379'));

  // Test regeneration query (matches OS-452 tissue regeneration in rats)
  const regenResult = await searchOSDRStudies('regeneration', { offlineOnly: true, forceRefresh: true });
  assert.ok(regenResult.studies.length > 0);
  assert.ok(regenResult.studies.some((s) => s.accession === 'OS-452'));

  // Test radiation/immune query (matches OSD-566 endocrine/immune adrenal data)
  const immuneResult = await searchOSDRStudies('adrenal', { offlineOnly: true, forceRefresh: true });
  assert.ok(immuneResult.studies.length > 0);
  assert.ok(immuneResult.studies.some((s) => s.accession === 'OSD-566'));

  // Test plant query (matches OSD-120 Arabidopsis thaliana)
  const plantResult = await searchOSDRStudies('arabidopsis', { offlineOnly: true, forceRefresh: true });
  assert.ok(plantResult.studies.length > 0);
  assert.ok(plantResult.studies.some((s) => s.accession === 'OSD-120'));
});

test('getCuratedStudyByAccession returns expected study record with exact metadata', () => {
  const study665 = getCuratedStudyByAccession('OSD-665');
  assert.ok(study665);
  assert.equal(study665.accession, 'OSD-665');
  assert.equal(study665.identifierType, 'NASA_STUDY_ACCESSION');
  assert.equal(study665.verificationStatus, 'VERIFIED_OFFICIAL_STUDY');
  assert.equal(
    study665.title,
    'Transcriptional profiling of right extensor digitorum longus muscle from mice flown on the RR-23 mission.'
  );
  assert.doesNotMatch(study665.title, /ocular/i); // Keep ocular separate
  assert.match(study665.tissue, /extensor digitorum longus/i);

  const study452 = getCuratedStudyByAccession('OS-452');
  assert.ok(study452);
  assert.equal(study452.accession, 'OS-452');
  assert.equal(study452.identifierType, 'NASA_EXPERIMENT_IDENTIFIER');
  assert.equal(study452.verificationStatus, 'VERIFIED_EXPERIMENT_RECORD');
  assert.equal(study452.organism, 'Rattus norvegicus (Rat)');
  assert.equal(study452.title, 'Effect of Weightlessness on Tissue Regeneration in Rodents');

  const study379 = getCuratedStudyByAccession('OSD-379');
  assert.ok(study379);
  assert.equal(study379.accession, 'OSD-379');
  assert.equal(study379.verificationStatus, 'VERIFIED_OFFICIAL_STUDY');
  assert.equal(
    study379.title,
    'Transcriptional profiling of livers from mice flown on Rodent Research Reference Mission-1 (RRRM-1)'
  );
  assert.match(study379.tissue, /Liver/i);

  const study566 = getCuratedStudyByAccession('OSD-566');
  assert.ok(study566);
  assert.equal(study566.accession, 'OSD-566');
  assert.equal(study566.verificationStatus, 'STUDY_UNAVAILABLE_ON_PORTAL');
  assert.equal(
    study566.title,
    'Sexual Dimorphism during Integrative Endocrine and Immune Responses to Ionizing Radiation in Mice -- Adrenal data'
  );
  assert.ok(study566.availability);

  const study120 = getCuratedStudyByAccession('OSD-120');
  assert.ok(study120);
  assert.equal(study120.accession, 'OSD-120');
  assert.equal(study120.verificationStatus, 'VERIFIED_OFFICIAL_STUDY');
  assert.equal(
    study120.title,
    'Genetic dissection of the Arabidopsis spaceflight transcriptome: Are some responses dispensable for the physiological adaptation of plants to spaceflight?'
  );
  assert.equal(study120.organism, 'Arabidopsis thaliana');

  assert.equal(getCuratedStudyByAccession('OSD-NONEXISTENT'), null);
});

test('searchOSDRStudies handles mock live API hits', async () => {
  const mockFetch = async () => ({
    ok: true,
    status: 200,
    text: async () =>
      JSON.stringify({
        hits: {
          hits: [
            {
              _id: 'OSD-999',
              _source: {
                Accession: 'OSD-999',
                Study_Title: 'Live Mock Space Biology Study',
                organism: 'Rattus norvegicus',
                Study_Description: 'Evaluation of neuro-ocular syndrome in spaceflight.',
                Study_Factor_Type: 'Ocular Health'
              }
            }
          ]
        }
      })
  });

  const result = await searchOSDRStudies('ocular', {
    fetchFn: mockFetch,
    forceRefresh: true
  });

  assert.equal(result.dataSource, 'live_nasa_api');
  assert.ok(result.studies.some((s) => s.accession === 'OSD-999'));
});
