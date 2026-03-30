<script setup lang="ts">
import { ref, onMounted } from 'vue'
import CreatureBrowser from '@/components/CreatureBrowser.vue'
import StatBlock from '@/components/StatBlock.vue'
import { db } from '@/lib/database'
import { syncState } from '@/lib/schema'
import type { EntityResult } from '@/lib/entity-query'

const hasSyncedData = ref<boolean | null>(null)
const selectedEntity = ref<EntityResult | null>(null)
const parsedRawData = ref<any>(null)
const partyLevel = ref<number>(1)
const partySize = ref<number>(4)
const statBlockPanel = ref<HTMLDivElement | null>(null)

onMounted(async () => {
  try {
    const rows = await db.select().from(syncState).limit(1)
    hasSyncedData.value = (rows[0]?.totalEntities ?? 0) > 0
  } catch {
    hasSyncedData.value = true
  }
})

function handleEntitySelect(entity: EntityResult) {
  selectedEntity.value = entity
  try {
    parsedRawData.value = JSON.parse(entity.rawData)
  } catch {
    parsedRawData.value = null
  }
  // Scroll right column to top on entity change
  if (statBlockPanel.value && typeof statBlockPanel.value.scrollTo === 'function') {
    statBlockPanel.value.scrollTo(0, 0)
  }
}
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden bg-charcoal-800">
    <!-- Loading skeleton (DB check pending) -->
    <div v-if="hasSyncedData === null" class="flex-1 flex items-center justify-center">
      <div class="animate-pulse bg-charcoal-700 h-4 w-48 rounded" />
    </div>

    <!-- Empty state (no synced data) -->
    <div
      v-else-if="hasSyncedData === false"
      class="flex-1 flex flex-col items-center justify-center gap-3"
    >
      <p class="text-sm font-bold text-stone-300">No data synced yet</p>
      <p class="text-xs text-stone-400">Import PF2e content to browse the Compendium.</p>
      <RouterLink
        to="/sync"
        class="text-gold hover:text-gold-light text-sm font-bold underline"
      >
        Go to Sync Data
      </RouterLink>
    </div>

    <!-- Main 2-column layout -->
    <template v-else>
      <!-- Page heading (slim) -->
      <div class="px-4 py-2 border-b border-charcoal-600 flex-shrink-0">
        <h1 class="text-lg font-display font-bold text-gold">Compendium</h1>
      </div>

      <div class="flex flex-1 min-h-0">
        <!-- Left column (30%): session config + filters + entity list -->
        <div class="w-[30%] min-w-[240px] flex flex-col border-r border-charcoal-600 overflow-hidden">
          <!-- Session config header: party level + party size -->
          <div class="bg-charcoal-900 border-b border-charcoal-600 px-3 py-2 flex items-center gap-3 flex-shrink-0">
            <div>
              <label class="text-xs text-stone-400 mb-1 block">Party Level</label>
              <input
                type="number"
                v-model.number="partyLevel"
                min="1"
                max="20"
                class="w-14 bg-charcoal-700 border border-charcoal-600 rounded px-2 py-1 text-sm text-stone-200 focus:border-gold focus:outline-none"
              />
            </div>
            <div>
              <label class="text-xs text-stone-400 mb-1 block">Party Size</label>
              <input
                type="number"
                v-model.number="partySize"
                min="1"
                max="8"
                class="w-14 bg-charcoal-700 border border-charcoal-600 rounded px-2 py-1 text-sm text-stone-200 focus:border-gold focus:outline-none"
              />
            </div>
          </div>

          <!-- CreatureBrowser with filters + entity list -->
          <!-- mode is not 'combat' so showPartyControls defaults to false in EntityFilterBar -->
          <CreatureBrowser
            :selected-id="selectedEntity?.id ?? null"
            :party-level="partyLevel"
            @select="handleEntitySelect"
            class="flex-1 min-h-0"
          />
        </div>

        <!-- Right column (70%): StatBlock or placeholder -->
        <div ref="statBlockPanel" class="flex-1 overflow-y-auto">
          <div
            v-if="!selectedEntity"
            class="flex items-center justify-center h-full text-stone-500 text-sm"
          >
            Select an entity to view its stat block.
          </div>
          <StatBlock v-else :raw-data="parsedRawData" />
        </div>
      </div>
    </template>
  </div>
</template>
