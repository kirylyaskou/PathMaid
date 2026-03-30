import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { useCombatStore } from './combat'
import { calculateXP, generateEncounterBudgets, type EncounterResult, type ThreatRating } from '@/lib/pf2e/xp'
import { getSqlite } from '@/lib/database'
import type { EntityResult } from '@/lib/entity-query'
import type { WeakEliteTier } from '@/types/entity'

export interface StagingCreature {
  id: string               // uuid v4
  entity: EntityResult     // full browser result
  tier: WeakEliteTier      // 'normal' | 'weak' | 'elite'
  qty: number              // 1-20
  effectiveLevel: number   // tier-adjusted: elite=level+1, weak=level-1, normal=level
}

export const useEncounterStore = defineStore('encounter', () => {
  const partyLevel = ref(1)
  const partySize = ref(4)
  const pwol = ref(false)

  // CRITICAL: useCombatStore() is called INSIDE the computed() callback so Vue
  // tracks reactive changes to creatures and recomputes when the array changes.
  const encounterResult = computed((): EncounterResult => {
    const combatStore = useCombatStore()
    const levels = combatStore.creatures.map(c => c.level ?? 0)
    return calculateXP(levels, [], partyLevel.value, partySize.value, { pwol: pwol.value })
  })

  const budgets = computed((): Record<ThreatRating, number> => {
    return generateEncounterBudgets(partySize.value)
  })

  // Staging state — ephemeral, never written to combat store
  const stagingCreatures = ref<StagingCreature[]>([])

  const stagingResult = computed((): EncounterResult => {
    const levels: number[] = []
    for (const entry of stagingCreatures.value) {
      for (let i = 0; i < entry.qty; i++) {
        levels.push(entry.effectiveLevel)
      }
    }
    return calculateXP(levels, [], partyLevel.value, partySize.value, { pwol: pwol.value })
  })

  function addToStaging(entity: EntityResult, qty: number, tier: WeakEliteTier): void {
    const base = entity.level ?? 0
    const effectiveLevel = tier === 'elite' ? base + 1 : tier === 'weak' ? base - 1 : base
    const existing = stagingCreatures.value.find(e => e.entity.id === entity.id && e.tier === tier)
    if (existing) {
      existing.qty = Math.min(20, existing.qty + qty)
    } else {
      stagingCreatures.value.push({ id: uuidv4(), entity, tier, qty: Math.min(20, qty), effectiveLevel })
    }
  }

  function setQty(id: string, qty: number): void {
    const entry = stagingCreatures.value.find(e => e.id === id)
    if (entry) {
      entry.qty = Math.max(1, Math.min(20, qty))
    }
  }

  function removeFromStaging(id: string): void {
    stagingCreatures.value = stagingCreatures.value.filter(e => e.id !== id)
  }

  function clearStaging(): void {
    stagingCreatures.value = []
  }

  async function loadConfig(): Promise<void> {
    const sqlite = await getSqlite()
    const rows = await sqlite.select<Array<{ party_level: number; party_size: number; pwol: number }>>(
      'SELECT party_level, party_size, pwol FROM party_config WHERE id = 1',
      []
    )
    if (rows.length > 0) {
      partyLevel.value = rows[0].party_level
      partySize.value = rows[0].party_size
      pwol.value = rows[0].pwol === 1
    }
  }

  async function saveConfig(): Promise<void> {
    const sqlite = await getSqlite()
    await sqlite.execute(
      'INSERT OR REPLACE INTO party_config (id, party_level, party_size, pwol) VALUES (1, $1, $2, $3)',
      [partyLevel.value, partySize.value, pwol.value ? 1 : 0]
    )
  }

  return {
    partyLevel, partySize, pwol, encounterResult, budgets, loadConfig, saveConfig,
    stagingCreatures, stagingResult, addToStaging, setQty, removeFromStaging, clearStaging
  }
})
