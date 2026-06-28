// English UI strings for dnd55e-core-rules — the source of truth.
// Flat key → string catalog mirroring the host's /i18n/en.json shape.

export default {
  'settings.label':     'Rules Engine',
  'status.title':       'D&D 5.5e Rules Engine',
  'status.connected':   'Compendium connected — {count} classes available. The character sheet can auto-fill stats from class/species/background choices.',
  'status.disconnected':'Compendium not loaded. Install the dnd55e-compendium addon to enable content-driven rules; the character sheet still works hand-filled.',
  'status.intro':       'A generic, data-driven engine that interprets dnd55e-compendium content to compute character stats. It provides the rules API the character sheet consumes; it hard-depends on the compendium for content.',
};
