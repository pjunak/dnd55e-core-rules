// ═══════════════════════════════════════════════════════════════
//  dnd55e-core-rules — the generic D&D 5.5e rules engine ("handler").
//
//  It encodes the SYSTEM rules (how proficiency bonus / ability modifiers /
//  derived stats are computed and how declarative grants/modifiers/formulas are
//  interpreted) but NO content. All content comes from dnd55e-compendium (a
//  hard dependency) via host.use — so adding a new class/subclass/item/spell is
//  a compendium data change and never touches this engine.
//
//  It provide()s the rules API consumed by dnd55e-sheets:
//    • list*()/getItem()  — passthrough of compendium data for dropdowns
//    • hydrate(decisions) — decisions → computed sheet (NEVER throws)
//    • derive.*           — granular stat helpers
//
//  M0 implements the universal math (ability modifiers, proficiency bonus,
//  initiative) and the data passthrough, proving the provide/use graph. The
//  full hydration pipeline (species → background → class → derived, ported from
//  Living-scroll) lands in M3.
// ═══════════════════════════════════════════════════════════════

import { t } from './i18n.js';

export default function register(host) {
  const { esc } = host.h;
  const ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

  // Lazy handle to the compendium data API. core-rules HARD-depends on it, so
  // load order guarantees it's present by the time anything runs — but we guard
  // so a transient absence degrades to empty/warnings instead of throwing.
  const data = () => { try { return host.use('dnd55e-compendium'); } catch (_) { return null; } };

  // ── Pure system math ─────────────────────────────────────────────
  const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
  const abilityMod = (score) => Math.floor((num(score, 10) - 10) / 2);
  const proficiencyBonus = (level) => 2 + Math.floor((Math.max(1, num(level, 1)) - 1) / 4);

  /**
   * Hydrate player DECISIONS into a computed sheet. Never throws — each piece is
   * guarded and failures accumulate as warnings (mirrors Living-scroll's
   * error-isolated pipeline). M0 = universal math + content lookups; the full
   * pipeline (grants/modifiers/AC/HP from compendium) arrives in M3.
   */
  function hydrate(decisions) {
    const cd = decisions || {};
    const warnings = [];
    const sheet = { abilities: {}, derived: {}, proficiencies: { saves: {}, skills: {} } };
    const scores = cd.abilities || {};

    for (const a of ABILITIES) {
      sheet.abilities[a] = { score: num(scores[a], 10), mod: abilityMod(scores[a]) };
    }
    const level = num(cd.level, 1);
    sheet.derived.proficiencyBonus = proficiencyBonus(level);
    sheet.derived.initiative = abilityMod(scores.DEX);

    // Content lookups (demonstrate the compendium dependency).
    const d = data();
    if (cd.className) {
      const cls = d && d.getItemByName && d.getItemByName('class', cd.className);
      if (cls) { sheet.class = cls; sheet.derived.hitDie = cls.hitDie || null; }
      else if (d) warnings.push('Unknown class: ' + cd.className);
    }
    if (cd.race) {
      const sp = d && d.getItemByName && d.getItemByName('species', cd.race);
      if (sp) sheet.species = sp;
      else if (d) warnings.push('Unknown species: ' + cd.race);
    }
    return { sheet, warnings };
  }

  // ── Provide the rules API (consumed by dnd55e-sheets) ────────────
  host.provide({
    apiVersion: 1,
    // dropdown enumeration — passthrough of compendium data
    listClasses:     () => (data()?.listClasses?.() || []),
    listSubclasses:  (classId) => (data()?.listSubclasses?.(classId) || []),
    listSpecies:     () => (data()?.listSpecies?.() || []),
    listBackgrounds: () => (data()?.listBackgrounds?.() || []),
    listFeats:       () => (data()?.listFeats?.() || []),
    listSpells:      (q) => (data()?.listSpells?.(q) || []),
    listEquipment:   (q) => (data()?.listEquipment?.(q) || []),
    listSkills:      () => (data()?.listSkills?.() || []),
    getItem:         (kind, id) => (data()?.getItem?.(kind, id) || null),
    getItemByName:   (kind, name) => (data()?.getItemByName?.(kind, name) || null),
    // computation
    hydrate,
    derive: {
      proficiencyBonus,
      abilityMod,
      initiative: (cd) => abilityMod(((cd && cd.abilities) || {}).DEX),
    },
  });

  // ── Status tab (Settings → ⚙ Rules Engine) ───────────────────────
  host.registerSettingsTab({
    id: 'status', label: t('settings.label'), icon: '⚙',
    render: () => {
      const d = data();
      const status = d
        ? t('status.connected', { count: (d.listClasses?.() || []).length })
        : t('status.disconnected');
      return `
        <div class="settings-editor-head"><h2>⚙ ${esc(t('status.title'))}</h2></div>
        <div class="settings-panel">
          <p class="settings-hint">${esc(t('status.intro'))}</p>
          <p class="settings-hint" style="color:${d ? 'var(--color-success)' : 'var(--text-muted)'}">${esc(status)}</p>
        </div>`;
    },
  });
}
