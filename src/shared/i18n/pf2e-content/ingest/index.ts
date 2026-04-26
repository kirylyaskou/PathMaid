/**
 * Pack ingest orchestrator — reads vendored Babele packs and produces
 * DB-ready translation rows.
 *
 * Splitting orchestration from DB I/O keeps the adapter testable and lets
 * the loader (the entry point that owns the DB handle) drive the INSERT
 * loop in a single pass without holding an open transaction across the
 * glob enumeration. Per-row error tolerance: a malformed entry is logged
 * and skipped — one bad record never aborts seeding of the rest.
 */

import type { MonsterStructuredLoc, SpellStructuredLoc } from '../lib/types'
import {
  adaptBabeleActorEntry,
  adaptBabeleSpellEntry,
  adaptBabeleItemEntry,
  adaptBestiarySpellItem,
  isActorPack,
  isSpellPack,
  isSpellShapedActorItem,
  type BabelePackFile,
  type BabeleSpellEntry,
  type BabeleItemEntry,
} from './pack-adapter'

export type ItemKind = 'action' | 'feat' | 'item' | 'condition'

export interface ItemTranslationRow {
  kind: ItemKind
  packKey: string
  packLabel: string
  packPath: string
  nameLoc: string
  textLoc: string
}

const ITEM_PACK_KIND: Record<string, ItemKind> = {
  '/vendor/pf2e-locale-ru/pf2e/packs/actionspf2e.json': 'action',
  '/vendor/pf2e-locale-ru/pf2e/packs/feats-srd.json': 'feat',
  '/vendor/pf2e-locale-ru/pf2e/packs/equipment-srd.json': 'item',
  '/vendor/pf2e-locale-ru/pf2e/packs/conditionitems.json': 'condition',
  // Effect packs share the item-shape Babele schema (name + description) and
  // ship as item_type='effect' / 'aura' rows in the items table. Routing via
  // kind='item' so the existing list/drawer SQL JOINs (which filter on
  // kind='item') pick them up alongside equipment-srd.
  '/vendor/pf2e-locale-ru/pf2e/packs/equipment-effects.json': 'item',
  '/vendor/pf2e-locale-ru/pf2e/packs/spell-effects.json': 'item',
  '/vendor/pf2e-locale-ru/pf2e/packs/feat-effects.json': 'item',
  '/vendor/pf2e-locale-ru/pf2e/packs/bestiary-effects.json': 'item',
}

export interface MonsterTranslationRow {
  packKey: string
  packLabel: string
  packPath: string
  nameLoc: string
  textLoc: string
  structured: MonsterStructuredLoc
}

export interface SpellTranslationRow {
  packKey: string
  packLabel: string
  packPath: string
  nameLoc: string
  textLoc: string
  structured: SpellStructuredLoc
}

// Lazy glob — files are NOT parsed at module load time. Each dynamic import
// resolves only when the seeder explicitly needs that pack (cold boot).
// On warm boot the guard in loadContentTranslations returns before any
// collect* call fires, so these imports never execute.
const packGlob = import.meta.glob('/vendor/pf2e-locale-ru/pf2e/packs/*.json', {
  import: 'default',
}) as Record<string, () => Promise<BabelePackFile>>

async function loadAllPacks(): Promise<[string, BabelePackFile][]> {
  const isDev = import.meta.env.DEV
  const t0 = isDev ? performance.now() : 0
  const packPaths = Object.keys(packGlob)
  if (isDev) {
    console.log(`[perf] loadAllPacks: ${packPaths.length} packs found by import.meta.glob`)
  }
  const entries = await Promise.all(
    Object.entries(packGlob).map(async ([path, load]) => {
      const tPack = isDev ? performance.now() : 0
      const pack = await load()
      if (isDev) {
        const ms = performance.now() - tPack
        const entryCount = pack.entries ? Object.keys(pack.entries).length : 0
        console.log(`[perf] pack ${path.split('/').pop()}: ${ms.toFixed(1)}ms (${entryCount} entries)`)
      }
      return [path, pack] as [string, BabelePackFile]
    }),
  )
  if (isDev) {
    const total = performance.now() - t0
    console.log(`[perf] loadAllPacks total: ${total.toFixed(1)}ms across ${entries.length} packs`)
  }
  return entries
}

export async function collectMonsterTranslations(): Promise<MonsterTranslationRow[]> {
  // Dedupe by lowercase packKey — the DB primary key uses NOCASE collation
  // on name_key, so monsters with the same name across multiple packs
  // (e.g. "Zombie" appearing in both monster-core and bestiary-1) collapse
  // to a single DB row via INSERT OR REPLACE. Reflecting this here keeps
  // the skip-gate count == DB count.
  const dedup = new Map<string, MonsterTranslationRow>()
  const allPacks = await loadAllPacks()

  for (const [path, pack] of allPacks) {
    if (!isActorPack(pack)) continue

    if (!pack.entries || typeof pack.entries !== 'object') {
      console.warn(`[ingest] ${path}: missing or invalid entries field`)
      continue
    }

    for (const [packKey, entry] of Object.entries(pack.entries)) {
      if (!entry || typeof entry !== 'object') {
        console.warn(`[ingest] ${path}: skipping non-object entry "${packKey}"`)
        continue
      }
      if (typeof entry.name !== 'string' || entry.name.length === 0) {
        console.warn(`[ingest] ${path}: skipping entry "${packKey}" without name`)
        continue
      }

      try {
        const structured = adaptBabeleActorEntry(entry)
        dedup.set(packKey.toLowerCase(), {
          packKey,
          packLabel: pack.label,
          packPath: path,
          nameLoc: entry.name,
          textLoc: entry.description ?? '',
          structured,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`[ingest] ${path}: adapter failed for "${packKey}": ${msg}`)
      }
    }
  }

  return Array.from(dedup.values())
}

export async function collectSpellTranslations(): Promise<SpellTranslationRow[]> {
  const dedup = new Map<string, SpellTranslationRow>()
  const allPacks = await loadAllPacks()

  for (const [path, pack] of allPacks) {
    if (!isSpellPack(pack)) continue

    if (!pack.entries || typeof pack.entries !== 'object') {
      console.warn(`[ingest] ${path}: missing or invalid entries field`)
      continue
    }

    const spellPack = pack as BabelePackFile & { entries: Record<string, BabeleSpellEntry> }

    for (const [packKey, entry] of Object.entries(spellPack.entries)) {
      if (!entry || typeof entry !== 'object') {
        console.warn(`[ingest] ${path}: skipping non-object spell entry "${packKey}"`)
        continue
      }
      if (typeof entry.name !== 'string' || entry.name.length === 0) {
        console.warn(`[ingest] ${path}: skipping spell entry "${packKey}" without name`)
        continue
      }

      try {
        const adapted = adaptBabeleSpellEntry(entry)
        dedup.set(packKey.toLowerCase(), {
          packKey,
          packLabel: pack.label,
          packPath: path,
          nameLoc: adapted.name,
          textLoc: adapted.description,
          structured: adapted.structured,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`[ingest] ${path}: spell adapter failed for "${packKey}": ${msg}`)
      }
    }
  }

  // Pass 2 — bestiary-derived spell-reference rows.
  // Build RU-name → EN-key map from canonical dedup so bestiary items
  // (which carry RU names in the Babele overlay) can resolve to the same
  // EN packKey used by spells-srd. This keeps name_key column EN,
  // matching the engine spell.name lookup in SpellReferenceDrawer.
  const ruNameToEnKey = new Map<string, string>()
  const knownSpellNamesRu = new Set<string>()
  for (const row of dedup.values()) {
    if (typeof row.nameLoc === 'string' && row.nameLoc.length > 0) {
      const key = row.nameLoc.toLowerCase()
      knownSpellNamesRu.add(key)
      ruNameToEnKey.set(key, row.packKey)
    }
  }

  let bestiaryAdded = 0
  let bestiarySuppressed = 0
  const isDev = import.meta.env.DEV

  for (const [path, pack] of allPacks) {
    if (!isActorPack(pack)) continue
    if (!pack.entries || typeof pack.entries !== 'object') continue
    for (const [entryKey, entry] of Object.entries(pack.entries)) {
      if (!entry || typeof entry !== 'object' || !Array.isArray(entry.items)) continue
      for (const item of entry.items) {
        if (!item || typeof item !== 'object') continue
        if (typeof item.id !== 'string' || typeof item.name !== 'string') continue
        if (!isSpellShapedActorItem(item, knownSpellNamesRu)) continue

        // Signal C — collision check: spells-srd canonical row always wins;
        // bestiary alias is only created when EN key is absent from dedup.
        const enKey = ruNameToEnKey.get(item.name.toLowerCase())
        if (!enKey) continue // defensive — Signal A guarantees this exists
        const dedupKey = enKey.toLowerCase()
        if (dedup.has(dedupKey)) {
          bestiarySuppressed++
          if (isDev) {
            console.log(
              `[ingest] spell collision suppressed (canonical wins): "${item.name}" in entry ${entryKey} of ${path}`,
            )
          }
          continue
        }

        try {
          const adapted = adaptBestiarySpellItem(item)
          dedup.set(dedupKey, {
            packKey: enKey,
            packLabel: pack.label,
            packPath: path,
            nameLoc: adapted.name,
            textLoc: adapted.description,
            structured: adapted.structured,
          })
          bestiaryAdded++
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.warn(`[ingest] ${path}: bestiary-spell adapter failed for "${item.name}": ${msg}`)
        }
      }
    }
  }

  if (isDev) {
    console.log(
      `[ingest] bestiary-derived spell rows: added=${bestiaryAdded}, suppressed=${bestiarySuppressed}`,
    )
  }

  return Array.from(dedup.values())
}

export async function collectItemKindTranslations(): Promise<ItemTranslationRow[]> {
  // Dedupe by (kind, lowercase packKey) — DB primary key uses NOCASE on
  // name_key, so duplicate entry names within a pack collapse to one row.
  const dedup = new Map<string, ItemTranslationRow>()
  const allPacks = await loadAllPacks()

  for (const [path, pack] of allPacks) {
    const kind = ITEM_PACK_KIND[path]
    if (!kind) continue

    if (!pack.entries || typeof pack.entries !== 'object') {
      console.warn(`[ingest] ${path}: missing or invalid entries field`)
      continue
    }

    const itemPack = pack as BabelePackFile & { entries: Record<string, BabeleItemEntry> }

    for (const [packKey, entry] of Object.entries(itemPack.entries)) {
      if (!entry || typeof entry !== 'object') {
        console.warn(`[ingest] ${path}: skipping non-object entry "${packKey}"`)
        continue
      }
      if (typeof entry.name !== 'string' || entry.name.length === 0) {
        console.warn(`[ingest] ${path}: skipping entry "${packKey}" without name`)
        continue
      }

      try {
        const adapted = adaptBabeleItemEntry(entry)
        dedup.set(`${kind}:${packKey.toLowerCase()}`, {
          kind,
          packKey,
          packLabel: pack.label,
          packPath: path,
          nameLoc: adapted.name,
          textLoc: adapted.description,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`[ingest] ${path}: item adapter failed for "${packKey}": ${msg}`)
      }
    }
  }

  return Array.from(dedup.values())
}
