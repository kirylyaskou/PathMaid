<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import CreatureBrowser from '@/components/CreatureBrowser.vue'
import EncounterAddBar from '@/components/EncounterAddBar.vue'
import XpBudgetBar from '@/components/XpBudgetBar.vue'
import { useEncounterStore } from '@/stores/encounter'
import { useCombatStore } from '@/stores/combat'
import { calculateCreatureXP } from '@/lib/pf2e/xp'
import type { EntityResult } from '@/lib/entity-query'
import type { WeakEliteTier } from '@/types/entity'

const router = useRouter()
const encounterStore = useEncounterStore()
const combatStore = useCombatStore()
const selectedEntity = ref<EntityResult | null>(null)

function totalXpForEntry(effectiveLevel: number, qty: number): string {
  const result = calculateCreatureXP(effectiveLevel, encounterStore.partyLevel, { pwol: encounterStore.pwol })
  if (result.outOfRange) return '\u2014'
  return `${result.xp * qty} XP`
}

const existingCombatCount = computed(() => combatStore.creatures.length)

function handleBrowserSelect(entity: EntityResult) {
  selectedEntity.value = entity
}

function handleAdd(payload: { entity: EntityResult; qty: number; tier: WeakEliteTier }) {
  encounterStore.addToStaging(payload.entity, payload.qty, payload.tier)
}

function handleLaunch() {
  for (const entry of encounterStore.stagingCreatures) {
    combatStore.addFromBrowser(entry.entity, entry.qty, entry.tier)
  }
  encounterStore.clearStaging()
  router.push('/combat')
}

function tierBadgeClasses(tier: WeakEliteTier): string {
  if (tier === 'elite') return 'bg-gold text-charcoal-900 font-bold'
  if (tier === 'weak') return 'bg-charcoal-600 text-stone-400'
  return 'bg-charcoal-500 text-stone-300'
}

function tierLabel(tier: WeakEliteTier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1)
}
</script>

<template>
  <div class="flex h-full overflow-hidden divide-x divide-charcoal-600">
    <!-- Left panel: browser + add bar -->
    <div class="w-2/5 flex flex-col overflow-hidden">
      <CreatureBrowser
        default-entity-type="npc"
        mode="combat"
        :allowed-entity-types="['npc', 'hazard']"
        :selected-id="selectedEntity?.id ?? null"
        :party-level="encounterStore.partyLevel"
        @select="handleBrowserSelect"
        class="flex-1 min-h-0"
      />
      <EncounterAddBar
        v-if="selectedEntity && (selectedEntity.entityType === 'npc' || selectedEntity.entityType === 'hazard')"
        :entity="selectedEntity"
        @add="handleAdd"
      />
    </div>

    <!-- Right panel: XpBudgetBar + composition list + footer -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <XpBudgetBar mode="staging" />

      <!-- Composition list -->
      <div class="flex-1 overflow-y-auto">
        <div
          v-if="encounterStore.stagingCreatures.length === 0"
          data-testid="empty-staging"
          class="flex flex-col items-center justify-center h-full gap-2"
        >
          <p class="text-sm text-stone-400">No creatures added</p>
          <p class="text-xs text-stone-500">Select a creature from the left panel and click Add to Encounter.</p>
        </div>

        <div
          v-for="entry in encounterStore.stagingCreatures"
          :key="entry.id"
          class="h-10 flex items-center gap-2 px-3 bg-charcoal-800 border-b border-charcoal-700 hover:bg-charcoal-700"
        >
          <!-- Name -->
          <span class="flex-1 text-sm text-stone-200 truncate">{{ entry.entity.name }}</span>

          <!-- Tier badge -->
          <span :class="['px-2 py-1 rounded text-xs font-bold min-w-[40px] text-center flex-shrink-0', tierBadgeClasses(entry.tier)]">
            {{ tierLabel(entry.tier) }}
          </span>

          <!-- Qty stepper -->
          <div class="flex items-center flex-shrink-0">
            <button
              class="w-5 h-5 flex items-center justify-center bg-charcoal-700 border border-charcoal-600 rounded-l text-xs text-stone-400 hover:text-stone-200 disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="entry.qty <= 1"
              @click="encounterStore.setQty(entry.id, entry.qty - 1)"
            >-</button>
            <span class="w-8 text-center text-sm font-bold text-stone-200 bg-charcoal-800 border-t border-b border-charcoal-600">
              {{ entry.qty }}
            </span>
            <button
              class="w-5 h-5 flex items-center justify-center bg-charcoal-700 border border-charcoal-600 rounded-r text-xs text-stone-400 hover:text-stone-200 disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="entry.qty >= 20"
              @click="encounterStore.setQty(entry.id, entry.qty + 1)"
            >+</button>
          </div>

          <!-- XP contribution -->
          <span class="text-xs text-stone-400 flex-shrink-0 w-14 text-right">
            {{ totalXpForEntry(entry.effectiveLevel, entry.qty) }}
          </span>

          <!-- Remove button -->
          <button
            @click="encounterStore.removeFromStaging(entry.id)"
            class="w-6 h-6 flex items-center justify-center text-stone-500 hover:text-crimson-light flex-shrink-0"
            data-testid="remove-staging"
          >&times;</button>
        </div>
      </div>

      <!-- Footer: notice + launch button -->
      <div class="border-t border-charcoal-600 bg-charcoal-900 px-4 py-3 flex flex-col gap-2">
        <p
          v-if="existingCombatCount > 0"
          class="text-xs text-amber-400"
          data-testid="existing-combat-notice"
        >Will add to existing combat ({{ existingCombatCount }} creatures)</p>
        <button
          @click="handleLaunch"
          :disabled="encounterStore.stagingCreatures.length === 0"
          class="w-full py-2 rounded bg-gold hover:bg-gold-light text-charcoal-950 text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          data-testid="launch-button"
        >Launch to Combat</button>
      </div>
    </div>
  </div>
</template>
