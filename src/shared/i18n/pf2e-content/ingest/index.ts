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
  isActorPack,
  isSpellPack,
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

const packFiles = import.meta.glob('/vendor/pf2e-locale-ru/pf2e/packs/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, BabelePackFile>

export function collectMonsterTranslations(): MonsterTranslationRow[] {
  // Dedupe by lowercase packKey — the DB primary key uses NOCASE collation
  // on name_key, so monsters with the same name across multiple packs
  // (e.g. "Zombie" appearing in both monster-core and bestiary-1) collapse
  // to a single DB row via INSERT OR REPLACE. Reflecting this here keeps
  // the skip-gate count == DB count.
  const dedup = new Map<string, MonsterTranslationRow>()

  for (const [path, pack] of Object.entries(packFiles)) {
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

export function collectSpellTranslations(): SpellTranslationRow[] {
  const dedup = new Map<string, SpellTranslationRow>()
  const spellPackFiles = packFiles as unknown as Record<
    string,
    BabelePackFile & { entries: Record<string, BabeleSpellEntry> }
  >

  for (const [path, pack] of Object.entries(spellPackFiles)) {
    if (!isSpellPack(pack)) continue

    if (!pack.entries || typeof pack.entries !== 'object') {
      console.warn(`[ingest] ${path}: missing or invalid entries field`)
      continue
    }

    for (const [packKey, entry] of Object.entries(pack.entries)) {
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

  return Array.from(dedup.values())
}

export function collectItemKindTranslations(): ItemTranslationRow[] {
  // Dedupe by (kind, lowercase packKey) — DB primary key uses NOCASE on
  // name_key, so duplicate entry names within a pack collapse to one row.
  const dedup = new Map<string, ItemTranslationRow>()
  const itemPackFiles = packFiles as unknown as Record<
    string,
    BabelePackFile & { entries: Record<string, BabeleItemEntry> }
  >

  for (const [path, pack] of Object.entries(itemPackFiles)) {
    const kind = ITEM_PACK_KIND[path]
    if (!kind) continue

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
