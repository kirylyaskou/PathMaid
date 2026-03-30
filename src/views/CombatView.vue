<script setup lang="ts">
import { ref } from 'vue'
import CreatureBrowser from '@/components/CreatureBrowser.vue'
import CombatAddBar from '@/components/CombatAddBar.vue'
import CombatTracker from '@/components/CombatTracker.vue'
import CombatDetailPanel from '@/components/CombatDetailPanel.vue'
import { useCombatStore } from '@/stores/combat'
import type { EntityResult } from '@/lib/entity-query'
import type { WeakEliteTier } from '@/types/entity'

const combatStore = useCombatStore()
const selectedEntity = ref<EntityResult | null>(null)
const selectedCombatantId = ref<string | null>(null)

function handleBrowserSelect(entity: EntityResult) {
  selectedEntity.value = entity
}

function handleAddCreatures(payload: { entity: EntityResult; qty: number; tier: WeakEliteTier }) {
  combatStore.addFromBrowser(payload.entity, payload.qty, payload.tier)
}
</script>

<template>
  <div class="grid grid-cols-3 h-full overflow-hidden divide-x divide-charcoal-600">
    <!-- Left panel: creature browser + add bar -->
    <div class="flex flex-col overflow-hidden">
      <CreatureBrowser
        default-entity-type="npc"
        mode="combat"
        :allowed-entity-types="['npc', 'hazard']"
        :selected-id="selectedEntity?.id ?? null"
        @select="handleBrowserSelect"
        class="flex-1 min-h-0"
      />
      <CombatAddBar
        v-if="selectedEntity && (selectedEntity.entityType === 'npc' || selectedEntity.entityType === 'hazard')"
        :entity="selectedEntity"
        @add="handleAddCreatures"
      />
    </div>

    <!-- Center panel: combat tracker -->
    <div class="overflow-y-auto">
      <CombatTracker
        :selected-id="selectedCombatantId"
        @select="selectedCombatantId = $event"
      />
    </div>

    <!-- Right panel: combat detail -->
    <CombatDetailPanel :creature-id="selectedCombatantId" />
  </div>
</template>
