// Client self-test for dnd55e-core-rules against the host test harness.
// Run: node --test tests/smoke.mjs  (assumes ttrpg-codex is a sibling checkout).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dryRunRegister, smokeRegistrations } from '../../ttrpg-codex/web/js/addon-test-harness.mjs';
import register from '../entry.js';

const META = {
  id: 'dnd55e-core-rules',
  permissions: ['ui:settings-tab'],
  dependencies: { 'dnd55e-compendium': { range: '>=0.1.0' } },
};

// A fake compendium API to exercise the use()/passthrough path.
const FAKE_COMPENDIUM = {
  apiVersion: 1,
  listClasses: () => [{ id: 'wizard', name: 'Wizard' }, { id: 'fighter', name: 'Fighter' }],
  getItemByName: (kind, name) =>
    kind === 'class' && String(name).toLowerCase() === 'wizard'
      ? { id: 'wizard', name: 'Wizard', hitDie: 'd6' } : null,
};

test('core-rules: provides a versioned rules API', () => {
  const { ok, rec, error } = dryRunRegister(register, META);
  assert.ok(ok, error);
  assert.ok(rec.provided && rec.provided.apiVersion === 1, 'apiVersion 1');
  assert.equal(typeof rec.provided.hydrate, 'function', 'hydrate()');
  assert.equal(typeof rec.provided.derive.proficiencyBonus, 'function', 'derive.proficiencyBonus()');
  assert.ok(rec.settingsTabs.length >= 1, 'a settings tab');
});

test('core-rules: universal math is correct, with or without compendium', () => {
  const { rec } = dryRunRegister(register, META);
  const { sheet, warnings } = rec.provided.hydrate({ abilities: { STR: 16, DEX: 14 }, level: 5, className: 'Wizard' });
  assert.equal(sheet.abilities.STR.mod, 3, 'STR 16 → +3');
  assert.equal(sheet.derived.proficiencyBonus, 3, 'level 5 → PB +3');
  assert.equal(sheet.derived.initiative, 2, 'DEX 14 → init +2');
  // No compendium wired here → class lookup yields no warning (data() is null).
  assert.ok(Array.isArray(warnings));
});

test('core-rules: passes compendium data through when present', () => {
  const { rec } = dryRunRegister(register, META, { deps: { 'dnd55e-compendium': FAKE_COMPENDIUM } });
  assert.equal(rec.provided.listClasses().length, 2, 'passthrough listClasses');
  const { sheet } = rec.provided.hydrate({ className: 'Wizard', level: 1 });
  assert.equal(sheet.class?.id, 'wizard', 'resolves class via compendium');
  assert.equal(sheet.derived.hitDie, 'd6', 'pulls hitDie from the class record');
});

test('core-rules: renderers survive the smoke pass', () => {
  const { rec } = dryRunRegister(register, META);
  assert.ok(smokeRegistrations(rec).ok, JSON.stringify(smokeRegistrations(rec).failures));
});
