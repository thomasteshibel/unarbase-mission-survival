import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VISUAL_ASSETS } from '../src/data/visualAssetCatalog.js';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('every visual asset is bundled locally with descriptive provenance', () => {
  for (const [key, asset] of Object.entries(VISUAL_ASSETS)) {
    assert.ok(existsSync(resolve(repositoryRoot, 'public', asset.path)), `${key} image exists`);
    assert.ok(asset.alt.trim(), `${key} has alternative text`);
    assert.ok(asset.credit.trim(), `${key} has an image credit`);
    assert.match(asset.sourceUrl, /^https:\/\//, `${key} has an HTTPS source`);
    assert.ok(asset.context.trim(), `${key} explains its limitations`);
  }
});

test('representative crew portraits are distinct and clearly not the fictional crew', () => {
  const portraits = [
    VISUAL_ASSETS.crewCommander,
    VISUAL_ASSETS.crewEngineer,
    VISUAL_ASSETS.crewMedical,
    VISUAL_ASSETS.crewScience
  ];

  assert.equal(new Set(portraits.map((asset) => asset.path)).size, 4);
  assert.ok(portraits.every((asset) => asset.context.includes('not the fictional LunarBase crew member')));
});
