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

// A fake compendium API mirroring the real seed shapes, to exercise hydrate.
function makeFake() {
  const store = {
    class: {
      wizard: {
        id: 'wizard', name: 'Wizard', kind: 'class', hitDie: 'd6', savingThrows: ['INT', 'WIS'],
        spellcasting: { ability: 'INT', type: 'full', prepares: 'spellbook', ritual: true },
        weaponMastery: { count: 2 }, acFormulas: [],
        progression: [
          { level: 1, cantripsKnown: 3, preparedSpells: 4, spellSlots: [2] },
          { level: 5, cantripsKnown: 4, preparedSpells: 9, spellSlots: [4, 3, 2] },
        ],
      },
      barbarian: {
        id: 'barbarian', name: 'Barbarian', kind: 'class', hitDie: 'd12', savingThrows: ['STR', 'CON'],
        spellcasting: null, weaponMastery: { count: 2 },
        acFormulas: [{ id: 'ud', base: 10, addAbilities: ['DEX', 'CON'], requires: { noArmor: true } }],
      },
      fighter: {
        id: 'fighter', name: 'Fighter', kind: 'class', hitDie: 'd10', savingThrows: ['STR', 'CON'],
        spellcasting: null, weaponMastery: { count: 3 }, acFormulas: [],
        startingProficiencies: { weapons: ['simple', 'martial'] },
      },
    },
    weapon: {
      longsword: { id: 'longsword', name: 'Longsword', kind: 'weapon', category: 'martial', range: 'melee', damage: '1d8', damageType: 'slashing', properties: ['versatile'], versatileDamage: '1d10', mastery: 'Sap' },
      dagger: { id: 'dagger', name: 'Dagger', kind: 'weapon', category: 'simple', range: 'melee', damage: '1d4', damageType: 'piercing', properties: ['finesse', 'light', 'thrown'], mastery: 'Nick' },
    },
    subclass: {
      'eldritch-knight': {
        id: 'eldritch-knight', name: 'Eldritch Knight', kind: 'subclass', classId: 'fighter',
        spellcasting: { ability: 'INT', type: 'third', prepares: 'list' },
        features: [{ level: 3, id: 'war-bond', name: 'War Bond' }],
        progression: [{ level: 3, cantripsKnown: 2, preparedSpells: 3, spellSlots: [2] }],
      },
      'life-domain': {
        id: 'life-domain', name: 'Life Domain', kind: 'subclass', classId: 'cleric',
        spells: [{ level: 3, ids: ['bless'], alwaysPrepared: true }],
      },
    },
    feat: {
      'fey-touched': { id: 'fey-touched', name: 'Fey Touched', grants: { abilityScoreIncrease: { choose: 1, amount: 1, from: ['INT', 'WIS', 'CHA'] }, spells: [{ ids: ['misty-step'], alwaysPrepared: true, free: '1/long' }] } },
      tough: { id: 'tough', name: 'Tough', grants: { hpPerLevel: 2 } },
    },
    spell: {
      bless: { id: 'bless', name: 'Bless', level: 1, school: 'Enchantment' },
      'misty-step': { id: 'misty-step', name: 'Misty Step', level: 2, school: 'Conjuration' },
      'dancing-lights': { id: 'dancing-lights', name: 'Dancing Lights', level: 0, school: 'Illusion' },
      'faerie-fire': { id: 'faerie-fire', name: 'Faerie Fire', level: 1, school: 'Evocation' },
      darkness: { id: 'darkness', name: 'Darkness', level: 2, school: 'Evocation' },
      druidcraft: { id: 'druidcraft', name: 'Druidcraft', level: 0, school: 'Transmutation' },
    },
    armor: { breastplate: { id: 'breastplate', name: 'Breastplate', kind: 'armor', armorType: 'medium', baseAC: 14, dexCap: 2, acBonus: 0 } },
    species: {
      dwarf: { id: 'dwarf', name: 'Dwarf', kind: 'species', speeds: { walk: 30 }, senses: { darkvision: 120 }, resistances: ['poison'], grants: { hpPerLevel: 1 }, lineages: [{ id: 'hill-dwarf', name: 'Hill Dwarf', grants: { hpPerLevel: 1 } }] },
      elf: { id: 'elf', name: 'Elf', kind: 'species', speeds: { walk: 30 }, senses: { darkvision: 60 }, resistances: [], lineages: [
        { id: 'drow', name: 'Drow', grants: { senses: { darkvision: 120 }, spells: [{ level: 0, ids: ['dancing-lights'], alwaysPrepared: true }, { level: 3, ids: ['faerie-fire'], alwaysPrepared: true, free: '1/long' }, { level: 5, ids: ['darkness'], alwaysPrepared: true, free: '1/long' }] } },
        { id: 'wood-elf', name: 'Wood Elf', grants: { speedBonus: 5, spells: [{ level: 0, ids: ['druidcraft'], alwaysPrepared: true }] } },
      ] },
    },
    background: { sage: { id: 'sage', name: 'Sage', kind: 'background', skillProficiencies: ['arcana', 'history'] } },
  };
  const byName = (kind, name) => Object.values(store[kind] || {}).find((r) => (r.name || '').toLowerCase() === String(name).toLowerCase()) || null;
  return {
    apiVersion: 1,
    listClasses: () => Object.values(store.class).map((c) => ({ id: c.id, name: c.name })),
    listSubclasses: () => Object.values(store.subclass).map((c) => ({ id: c.id, name: c.name, classId: c.classId })),
    listSkills: () => [], listSpells: () => [], listArmor: () => [], listWeapons: () => [],
    getItem: (kind, id) => (store[kind] && store[kind][id]) || null,
    getItemByName: byName,
    getRecords: (kind) => Object.values(store[kind] || {}),
  };
}
const withFake = () => dryRunRegister(register, META, { deps: { 'dnd55e-compendium': makeFake() } });

test('core-rules: provides a versioned rules API', () => {
  const { ok, rec, error } = dryRunRegister(register, META);
  assert.ok(ok, error);
  assert.ok(rec.provided && rec.provided.apiVersion === 1, 'apiVersion 1');
  assert.equal(typeof rec.provided.hydrate, 'function', 'hydrate()');
  assert.equal(typeof rec.provided.derive.proficiencyBonus, 'function', 'derive.proficiencyBonus()');
  assert.equal(typeof rec.provided.derive.maxHp, 'function', 'derive.maxHp()');
  assert.ok(rec.settingsTabs.length >= 1, 'a settings tab');
});

test('core-rules: universal math is correct, with or without compendium', () => {
  const { rec } = dryRunRegister(register, META);
  const { sheet, warnings } = rec.provided.hydrate({ abilities: { STR: 16, DEX: 14 }, level: 5, className: 'Wizard' });
  assert.equal(sheet.abilities.STR.mod, 3, 'STR 16 → +3');
  assert.equal(sheet.derived.proficiencyBonus, 3, 'level 5 → PB +3');
  assert.equal(sheet.derived.initiative, 2, 'DEX 14 → init +2');
  assert.ok(Array.isArray(warnings)); // no compendium → no class-lookup warning (data() is null)
});

test('core-rules: passes compendium data through + resolves the class record', () => {
  const { rec } = withFake();
  assert.equal(rec.provided.listClasses().length, 3, 'passthrough listClasses');
  const { sheet } = rec.provided.hydrate({ className: 'Wizard', level: 1 });
  assert.equal(sheet.class?.id, 'wizard', 'resolves class via compendium');
  assert.equal(sheet.derived.hitDie, 'd6', 'pulls hitDie from the class record');
});

test('core-rules: derives HP / AC / saves / slots / mastery from content', () => {
  const { rec } = withFake();
  const { sheet } = rec.provided.hydrate({
    abilities: { STR: 10, DEX: 14, CON: 14, INT: 16, WIS: 12, CHA: 8 }, level: 5, className: 'Wizard',
  });
  assert.equal(sheet.derived.maxHp, 32, 'd6: 6 + 4×4 + CON(+2)×5 = 32');     // HP-1/HP-2
  assert.equal(sheet.derived.armorClass, 12, 'no armor, no UD → 10 + DEX(+2)'); // AC-1
  assert.equal(sheet.saves.INT.total, 6, 'INT +3 + PB 3 (proficient)');         // PR-4
  assert.equal(sheet.saves.STR.proficient, false, 'STR not a wizard save');
  assert.equal(sheet.spellcasting.perClass[0].preparedLimit, 9, 'L5 wizard prepared');  // SP-2
  assert.equal(sheet.spellcasting.perClass[0].saveDC, 14, '8 + PB 3 + INT +3');          // SP-4
  assert.deepEqual(sheet.spellcasting.slots, [4, 3, 2], 'caster level 5 slots');         // MC-2
  assert.equal(sheet.weaponMastery.slots, 2, 'wizard weapon mastery');                   // EQ-4
});

test('core-rules: AC takes the best eligible base, armor beats Unarmored Defense', () => {
  const { rec } = withFake();
  const abilities = { STR: 14, DEX: 14, CON: 16, INT: 8, WIS: 10, CHA: 8 };
  const unarmored = rec.provided.hydrate({ abilities, level: 5, className: 'Barbarian' }).sheet;
  assert.equal(unarmored.derived.armorClass, 15, 'Unarmored Defense 10 + DEX(+2) + CON(+3)'); // AC-1
  const armored = rec.provided.hydrate({
    abilities, level: 5, className: 'Barbarian', inventory: [{ name: 'Breastplate', location: 'equipped' }],
  }).sheet;
  assert.equal(armored.derived.armorClass, 16, 'Breastplate 14 + DEX capped at 2'); // AC-2
});

test('core-rules: a third-caster subclass (classes[] shape) gets spells from the subclass', () => {
  const { rec } = withFake();
  const { sheet } = rec.provided.hydrate({
    abilities: { INT: 14 }, classes: [{ classId: 'fighter', level: 3, subclass: 'eldritch-knight' }],
  });
  assert.equal(sheet.totalLevel, 3);
  assert.equal(sheet.spellcasting.perClass.length, 1, 'EK grants spellcasting');     // SP-8
  assert.equal(sheet.spellcasting.perClass[0].type, 'third');
  assert.equal(sheet.spellcasting.perClass[0].preparedLimit, 3);
  assert.deepEqual(sheet.spellcasting.slots, [2], 'caster level ⌊3/3⌋ = 1');           // MC-2
  assert.equal(sheet.weaponMastery.slots, 3, 'fighter mastery');
});

test('core-rules: applies resolved skill proficiencies + expertise', () => {
  const { rec } = withFake();
  const { sheet } = rec.provided.hydrate({
    abilities: { DEX: 14, INT: 10 }, className: 'Wizard', level: 5,
    skillProficiencies: ['stealth'], skillExpertise: { stealth: true },
  });
  assert.equal(sheet.skills.stealth.proficient, true);
  assert.equal(sheet.skills.stealth.expertise, true);
  assert.equal(sheet.skills.stealth.total, 8, 'DEX +2 + 2×PB(3) expertise');   // PR-2
  assert.equal(sheet.skills.arcana.proficient, false, 'unchosen skill not proficient');
});

test('core-rules: applies ability grants over base scores, clamped to 20', () => {
  const { rec } = withFake();
  const { sheet } = rec.provided.hydrate({
    baseStats: { STR: 15, CON: 13 }, className: 'Barbarian', level: 1,
    abilityGrants: [{ source: { type: 'background' }, assign: { STR: 2, CON: 1 } }],
  });
  assert.equal(sheet.abilities.STR.base, 15);
  assert.equal(sheet.abilities.STR.score, 17, '15 + 2 (background ASI)');   // AB-1
  assert.equal(sheet.abilities.STR.mod, 3);
  assert.equal(sheet.abilities.CON.score, 14, '13 + 1');
  const capped = rec.provided.hydrate({ baseStats: { STR: 19 }, abilityGrants: [{ assign: { STR: 4 } }], className: 'Barbarian' }).sheet;
  assert.equal(capped.abilities.STR.score, 20, 'clamped at 20');           // AB-2
});

test('core-rules: computes weapon attacks for equipped weapons (EQ-3/4/5)', () => {
  const { rec } = withFake();
  const { sheet } = rec.provided.hydrate({
    abilities: { STR: 16, DEX: 14 }, className: 'Fighter', level: 1,
    inventory: [
      { id: 'w1', ref: 'longsword', location: 'equipped' },
      { id: 'w2', ref: 'dagger', location: 'ready', attuned: true },
      { id: 'w3', ref: 'longsword', location: 'pack' },     // stored → not an attack
    ],
    weaponMasteryChoices: ['longsword'],
  });
  const ls = sheet.weapons.find((x) => x.ref === 'longsword');
  assert.equal(ls.attackBonus, 5, 'STR +3 + PB +2 (proficient martial)');     // EQ-5
  assert.match(ls.damage, /1d8 \+3/, 'damage adds STR mod');
  assert.equal(ls.masteryActive, true, 'longsword is a chosen mastery');        // EQ-4
  assert.equal(sheet.weapons.filter((x) => x.ref === 'longsword').length, 1, 'pack copy excluded');  // EQ-2
  assert.equal(sheet.attunement.count, 1, 'one attuned item');                  // EQ-3
});

test('core-rules: grants always-prepared spells from subclass + feat (provenance)', () => {
  const { rec } = withFake();
  const { sheet } = rec.provided.hydrate({
    abilities: { WIS: 14 }, classes: [{ classId: 'wizard', level: 5, subclass: 'life-domain' }],
    feats: [{ featId: 'fey-touched' }],
  });
  const g = sheet.spellcasting.granted;
  const bless = g.find((x) => x.ref === 'bless');
  assert.ok(bless && bless.alwaysPrepared && bless.source.type === 'subclass', 'subclass grants Bless always-prepared');  // SP-2/SP-12
  assert.equal(bless.name, 'Bless', 'resolves the spell name from the compendium');
  const misty = g.find((x) => x.ref === 'misty-step');
  assert.ok(misty && misty.source.type === 'feat', 'feat grants Misty Step');   // SP-1/SP-10
});

test('core-rules: species grants senses, resistances, and a per-level HP bonus', () => {
  const { rec } = withFake();
  const { sheet } = rec.provided.hydrate({ abilities: { CON: 14 }, level: 5, className: 'Wizard', race: 'Dwarf' });
  assert.equal(sheet.senses.darkvision, 120, 'take-highest darkvision'); // SB-4
  assert.ok(sheet.resistances.includes('poison'));
  assert.equal(sheet.speed, 30);
  assert.equal(sheet.derived.maxHp, 37, '32 base + Dwarven Toughness (+1/level × 5)'); // HP-3
});

test('core-rules: caster surfaces per-level cantrips-known + prepared', () => {
  const { rec } = withFake();
  const { sheet } = rec.provided.hydrate({ abilities: { INT: 16 }, className: 'Wizard', level: 5 });
  assert.equal(sheet.spellcasting.perClass[0].cantripsKnown, 4, 'L5 wizard cantrips');  // SP-7
  assert.equal(sheet.spellcasting.perClass[0].preparedLimit, 9, 'L5 wizard prepared');  // SP-2
});

test('core-rules: selected lineage applies senses / speed / per-level HP', () => {
  const { rec } = withFake();
  const drow = rec.provided.hydrate({ abilities: { CON: 12 }, className: 'Wizard', level: 5, race: 'Elf', lineage: 'drow' }).sheet;
  assert.equal(drow.senses.darkvision, 120, 'drow take-highest 60→120');           // SB-4
  const wood = rec.provided.hydrate({ className: 'Wizard', level: 1, race: 'Elf', lineage: 'wood-elf' }).sheet;
  assert.equal(wood.speed, 35, 'wood-elf +5 speed');                               // SB-3
  const hill = rec.provided.hydrate({ abilities: { CON: 14 }, className: 'Wizard', level: 5, race: 'Dwarf', lineage: 'hill-dwarf' }).sheet;
  assert.equal(hill.derived.maxHp, 42, '32 + (species 1 + lineage 1)/level × 5');  // HP-3
});

test('core-rules: lineage spells are level-gated + provenance-tagged', () => {
  const { rec } = withFake();
  const ids = (lvl) => rec.provided.hydrate({ className: 'Wizard', level: lvl, race: 'Elf', lineage: 'drow' }).sheet.spellcasting.granted.map((g) => g.ref);
  const l1 = ids(1);
  assert.ok(l1.includes('dancing-lights'), 'L0 cantrip granted at level 1');
  assert.ok(!l1.includes('faerie-fire') && !l1.includes('darkness'), 'higher-level lineage spells gated out');
  const l5 = rec.provided.hydrate({ className: 'Wizard', level: 5, race: 'Elf', lineage: 'drow' }).sheet.spellcasting.granted;
  assert.ok(l5.some((g) => g.ref === 'faerie-fire') && l5.some((g) => g.ref === 'darkness'), 'lineage spells unlock by level');
  assert.equal(l5.find((g) => g.ref === 'faerie-fire').source.type, 'species', 'tagged species provenance');
});

test('core-rules: a feat with hpPerLevel (Tough) raises max HP', () => {
  const { rec } = withFake();
  const base = rec.provided.hydrate({ abilities: { CON: 14 }, className: 'Wizard', level: 5 }).sheet.derived.maxHp;
  const tough = rec.provided.hydrate({ abilities: { CON: 14 }, className: 'Wizard', level: 5, feats: [{ featId: 'tough' }] }).sheet.derived.maxHp;
  assert.equal(tough - base, 10, 'Tough = +2/level × 5');
});

test('core-rules: renderers survive the smoke pass', () => {
  const { rec } = dryRunRegister(register, META);
  assert.ok(smokeRegistrations(rec).ok, JSON.stringify(smokeRegistrations(rec).failures));
});
