<script setup lang="ts">
import { ref, computed, watch, nextTick, type PropType } from 'vue'
import { useCombatStore } from '@/stores/combat'
import StatBlock from '@/components/StatBlock.vue'
import { db } from '@/lib/database'
import { pf2eEntities } from '@/lib/schema'
import { eq } from 'drizzle-orm'

const props = defineProps({
  creatureId: { type: String as PropType<string | null>, default: null },
})

// ─── State ────────────────────────────────────────────────────────────────────

const combatStore = useCombatStore()
const rawData = ref<any>(null)
const isLoadingRawData = ref(false)
const panelEl = ref<HTMLDivElement | null>(null)
let currentRequestId = 0 // Race condition guard

// ─── Computed ─────────────────────────────────────────────────────────────────

const creature = computed(() => {
  if (!props.creatureId) return null
  return combatStore.creatures.find(c => c.id === props.creatureId) ?? null
})

const hpPercent = computed(() => {
  if (!creature.value || creature.value.maxHP === 0) return 0
  return Math.round((creature.value.currentHP / creature.value.maxHP) * 100)
})

const hpBarColor = computed(() => {
  if (hpPercent.value > 50) return 'bg-gold'
  if (hpPercent.value > 25) return 'bg-amber-600'
  return 'bg-crimson-light'
})

const regenDisabled = computed(() => {
  if (!props.creatureId) return false
  return !!combatStore.regenerationDisabled[props.creatureId]
})

const conditionsWithValues = computed(() => {
  if (!creature.value) return []
  // Version-counter reactivity: read conditionVersion to trigger re-evaluation
  void creature.value.conditionVersion
  return creature.value.conditionManager.getAll().map(c => ({
    name: c.slug,
    value: c.value > 0 ? c.value : null,
  }))
})

// ─── Watch creatureId — fetch rawData from DB ─────────────────────────────────

watch(() => props.creatureId, async (id) => {
  const reqId = ++currentRequestId
  rawData.value = null
  isLoadingRawData.value = false

  if (!id) return

  const c = combatStore.creatures.find(cr => cr.id === id)
  if (!c?.sourceId) {
    // No sourceId — manually added creature, no compendium data
    return
  }

  isLoadingRawData.value = true
  try {
    const results = await db.select().from(pf2eEntities).where(eq(pf2eEntities.slug, c.sourceId))
    if (reqId !== currentRequestId) return // Stale request — discard
    if (results.length > 0) {
      rawData.value = JSON.parse(results[0].rawData)
    }
  } catch {
    // Silently fail — StatBlock shows no-data state
  } finally {
    if (reqId === currentRequestId) {
      isLoadingRawData.value = false
    }
  }

  // Scroll to top
  await nextTick()
  if (panelEl.value && typeof panelEl.value.scrollTo === 'function') {
    panelEl.value.scrollTo(0, 0)
  }
}, { immediate: true })
</script>

<template>
  <div ref="panelEl" class="flex flex-col h-full overflow-y-auto bg-charcoal-800">

    <!-- Empty state: no creature selected -->
    <div v-if="!creatureId" class="flex-1 flex flex-col items-center justify-center text-center py-12">
      <h3 class="text-lg font-display font-bold text-stone-300">No Creature Selected</h3>
      <p class="text-sm text-stone-500 mt-2">Click a row in the combat tracker to view its stat block and live combat state.</p>
    </div>

    <!-- Live content: creature selected -->
    <template v-else-if="creature">

      <!-- LiveCombatOverlay -->
      <div class="bg-charcoal-900 border-b border-charcoal-600 px-4 py-3 space-y-2 flex-shrink-0">

        <!-- Creature name -->
        <h3 class="text-base font-display font-bold text-stone-100">{{ creature.name }}</h3>

        <!-- HP row -->
        <div>
          <span class="text-xs text-stone-400">HP</span>
          <span class="text-lg font-bold text-stone-100 ml-1">{{ creature.currentHP }} / {{ creature.maxHP }}</span>
        </div>

        <!-- HP bar -->
        <div class="w-full h-1.5 rounded-full bg-charcoal-950">
          <div
            :class="['h-full rounded-full transition-all', hpBarColor]"
            :style="{ width: `${Math.min(100, hpPercent)}%` }"
          />
        </div>

        <!-- Initiative -->
        <div>
          <span class="text-xs text-stone-400">Initiative</span>
          <span class="text-sm font-bold text-stone-100 ml-1">{{ creature.initiative }}</span>
        </div>

        <!-- Tier badge (not shown for 'normal') -->
        <span
          v-if="creature.tier && creature.tier !== 'normal'"
          :class="[
            'inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase',
            creature.tier === 'elite' ? 'bg-gold text-charcoal-950' : 'bg-charcoal-500 text-stone-400'
          ]"
        >
          {{ creature.tier }}
        </span>

        <!-- Active conditions -->
        <div v-if="conditionsWithValues.length > 0" class="flex flex-wrap gap-1 mt-1">
          <span
            v-for="cond in conditionsWithValues"
            :key="cond.name"
            class="px-2 py-0.5 rounded-full text-xs bg-charcoal-600 border border-charcoal-500 text-stone-300"
          >
            {{ cond.name }}{{ cond.value !== null ? ` ${cond.value}` : '' }}
          </span>
        </div>

        <!-- Ongoing damage (if > 0) -->
        <div v-if="creature.ongoingDamage && creature.ongoingDamage > 0" class="text-xs text-crimson-light">
          Ongoing: {{ creature.ongoingDamage }} dmg
        </div>

        <!-- Regen status -->
        <div v-if="creature.regenAmount && creature.regenAmount > 0">
          <span :class="['text-xs', regenDisabled ? 'text-crimson-light' : 'text-stone-400']">
            {{ regenDisabled ? 'Regen: OFF' : 'Regen: ON' }}
          </span>
        </div>

        <!-- Fast healing -->
        <div v-if="creature.regenAmount && creature.regenAmount > 0 && !regenDisabled" class="text-xs text-emerald-400">
          Fast Healing: {{ creature.regenAmount }}
        </div>

      </div>

      <!-- StatBlock below overlay -->
      <StatBlock :raw-data="rawData" :is-loading="isLoadingRawData" />

    </template>

  </div>
</template>
