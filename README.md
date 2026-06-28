# dnd55e-core-rules

The generic **D&D 5.5e (2024) rules engine** for
[ttrpg-codex](https://github.com/pjunak/ttrpg-codex). Addon id: `dnd55e-core-rules`.

It is a **data-driven handler**: it encodes the *system* rules (how proficiency bonus,
ability modifiers, AC, HP, saves, spell slots are computed, and how declarative
grants/modifiers/formulas are interpreted) but contains **no content**. All content comes
from [`dnd55e-compendium`](https://github.com/pjunak/dnd55e-compendium) — a **hard
dependency** consumed via `host.use`. Adding a new class/subclass/item/spell is a compendium
data change and never touches this engine.

It `provide()`s the rules API consumed by `dnd55e-sheets`:

- `list*()` / `getItem()` — passthrough of compendium data for the sheet's dropdowns.
- `hydrate(decisions)` — turns the character's decisions into a fully computed sheet;
  **never throws** (failures accumulate as `warnings`, mirroring Living-scroll's
  error-isolated pipeline).
- `derive.*` — granular stat helpers.

The character sheet *soft-uses* this engine: if `core-rules` is absent the sheet falls back
to hand-filled values, so installing/uninstalling the engine never breaks a sheet.

## Status

**M0:** universal math (ability modifiers, proficiency bonus, initiative) + compendium data
passthrough, proving the provide/use graph. The full hydration pipeline
(species → background → class → derived, ported from
[Living-scroll](https://github.com/pjunak/Living-scroll)'s `rules_engine` + `dnd24_mechanics`)
lands in a later milestone.

## Develop

```sh
node scripts/dev-install-addon.cjs ../dnd_5.5e_ruleset_addon   # from the ttrpg-codex repo
node --test tests/smoke.mjs                                    # assumes ttrpg-codex is a sibling
```

See [`AGENTS.md`](AGENTS.md) for the addon authoring contract.
