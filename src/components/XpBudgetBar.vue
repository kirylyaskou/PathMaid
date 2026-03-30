<script setup lang="ts">
import { computed } from 'vue'
import { useEncounterStore } from '@/stores/encounter'
import type { ThreatRating } from '@/lib/pf2e/xp'

const props = withDefaults(defineProps<{ mode?: 'combat' | 'staging' }>(), { mode: 'combat' })

const store = useEncounterStore()

// Unified result: switches data source based on mode prop
const result = computed(() => props.mode === 'staging' ? store.stagingResult : store.encounterResult)

// Threat tier color mapping (UI-SPEC color table)
const THREAT_CLASSES: Record<ThreatRating, { pill: string; barFill: string }> = {
  trivial:  { pill: 'bg-charcoal-500 text-stone-400',    barFill: 'bg-stone-400' },
  low:      { pill: 'bg-green-900 text-green-300',        barFill: 'bg-green-300' },
  moderate: { pill: 'bg-amber-900 text-gold',             barFill: 'bg-gold' },
  severe:   { pill: 'bg-crimson-dark text-crimson-light', barFill: 'bg-crimson-light' },
  extreme:  { pill: 'bg-purple-950 text-purple-400',      barFill: 'bg-purple-400' },
}

const threatClasses = computed(() => THREAT_CLASSES[result.value.rating])

// Budget bar fill: percentage of moderate threshold, capped at 100%
const barWidthPercent = computed(() => {
  const moderate = store.budgets.moderate
  if (moderate === 0) return 0
  return Math.min(100, Math.round((result.value.totalXp / moderate) * 100))
})

// Threat label: title-case rating
const threatLabel = computed(() => {
  const r = result.value.rating
  return r.charAt(0).toUpperCase() + r.slice(1)
})

// Out-of-range warnings
const hasOutOfRange = computed(() => result.value.warnings.length > 0)

// Stepper handlers
function incrementLevel() {
  if (store.partyLevel < 20) {
    store.partyLevel++
    store.saveConfig()
  }
}
function decrementLevel() {
  if (store.partyLevel > 1) {
    store.partyLevel--
    store.saveConfig()
  }
}
function incrementSize() {
  if (store.partySize < 8) {
    store.partySize++
    store.saveConfig()
  }
}
function decrementSize() {
  if (store.partySize > 1) {
    store.partySize--
    store.saveConfig()
  }
}
function togglePwol(event: Event) {
  store.pwol = (event.target as HTMLInputElement).checked
  store.saveConfig()
}
</script>

<template>
  <div>
    <!-- Row 1: Controls + badges -->
    <div class="flex items-center justify-between px-6 py-2 bg-charcoal-900 border-b border-charcoal-700">
      <!-- Left cluster: party config controls -->
      <div class="flex items-center gap-3">
        <span class="text-xs text-stone-400">Party</span>

        <!-- Level stepper -->
        <div class="flex items-center">
          <span class="text-xs text-stone-400 mr-1">Lvl</span>
          <button
            data-testid="level-decrement"
            @click="decrementLevel"
            :disabled="store.partyLevel <= 1"
            class="w-5 h-5 flex items-center justify-center bg-charcoal-700 border border-charcoal-600 rounded-l text-xs text-stone-400 hover:text-stone-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >–</button>
          <span
            data-testid="party-level-value"
            class="w-8 text-center text-sm font-bold text-stone-200 bg-charcoal-800 border-t border-b border-charcoal-600"
          >{{ store.partyLevel }}</span>
          <button
            data-testid="level-increment"
            @click="incrementLevel"
            :disabled="store.partyLevel >= 20"
            class="w-5 h-5 flex items-center justify-center bg-charcoal-700 border border-charcoal-600 rounded-r text-xs text-stone-400 hover:text-stone-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >+</button>
        </div>

        <!-- Size stepper -->
        <div class="flex items-center">
          <span class="text-xs text-stone-400 mr-1">Size</span>
          <button
            data-testid="size-decrement"
            @click="decrementSize"
            :disabled="store.partySize <= 1"
            class="w-5 h-5 flex items-center justify-center bg-charcoal-700 border border-charcoal-600 rounded-l text-xs text-stone-400 hover:text-stone-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >–</button>
          <span
            data-testid="party-size-value"
            class="w-8 text-center text-sm font-bold text-stone-200 bg-charcoal-800 border-t border-b border-charcoal-600"
          >{{ store.partySize }}</span>
          <button
            data-testid="size-increment"
            @click="incrementSize"
            :disabled="store.partySize >= 8"
            class="w-5 h-5 flex items-center justify-center bg-charcoal-700 border border-charcoal-600 rounded-r text-xs text-stone-400 hover:text-stone-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >+</button>
        </div>

        <!-- PWOL checkbox -->
        <div class="flex items-center ml-3">
          <input
            id="pwol-checkbox"
            data-testid="pwol-checkbox"
            type="checkbox"
            :checked="store.pwol"
            @change="togglePwol"
            class="accent-gold"
          />
          <label for="pwol-checkbox" class="text-xs text-stone-400 ml-1">PWOL</label>
        </div>
      </div>

      <!-- Right cluster: XP badge + threat pill -->
      <div class="flex items-center gap-2">
        <!-- XP badge -->
        <div class="px-3 py-1 rounded-md bg-charcoal-600 border border-charcoal-500 flex items-center gap-1">
          <span :data-testid="props.mode === 'staging' ? 'staging-xp-value' : 'xp-value'" class="text-sm font-bold text-stone-200">{{ result.totalXp }}</span>
          <span data-testid="xp-unit" class="text-xs text-stone-400">XP</span>
          <span
            v-if="hasOutOfRange"
            data-testid="xp-out-of-range"
            class="text-xs text-amber-400 ml-1"
            title="One or more creatures are beyond the level range and contributed 0 XP"
          >†</span>
        </div>

        <!-- Threat pill -->
        <div
          data-testid="threat-pill"
          :class="['px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1', threatClasses.pill]"
        >
          <span>{{ threatLabel }}</span>
          <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
        </div>
      </div>
    </div>

    <!-- Row 2: Budget bar -->
    <div class="w-full bg-charcoal-600 h-1">
      <div
        data-testid="budget-bar-fill"
        :class="['h-full transition-all duration-300 ease-out', threatClasses.barFill]"
        :style="{ width: barWidthPercent + '%' }"
      ></div>
    </div>
  </div>
</template>
