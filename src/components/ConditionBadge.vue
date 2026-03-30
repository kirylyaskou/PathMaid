<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Creature } from '@/types/combat'
import type { ConditionSlug } from '@/lib/pf2e'
import {
  formatCondition,
  conditionHasValue,
  CONDITION_BADGE_CLASSES,
  PICKER_CATEGORIES,
} from '@/composables/useConditions'
import { useCombatStore } from '@/stores/combat'

const props = defineProps<{
  creature: Creature
}>()

const emit = defineEmits<{
  toggleCondition: [slug: ConditionSlug]
  setConditionValue: [slug: ConditionSlug, value: number]
}>()

const combatStore = useCombatStore()

const showPicker = ref(false)
const pickerRef = ref<HTMLElement | null>(null)
const addButtonRef = ref<HTMLElement | null>(null)

// Persistent damage formula input state
const showFormulaInput = ref(false)
const persistentFormulaValue = ref('')

// Collapsed state per category (all expanded by default)
const collapsedCategories = ref<Set<string>>(new Set())

const toggleCategory = (category: string) => {
  if (collapsedCategories.value.has(category)) {
    collapsedCategories.value.delete(category)
  } else {
    collapsedCategories.value.add(category)
  }
}

// Version-counter reactivity: this computed reads conditionVersion to trigger re-evaluation
const activeConditions = computed(() => {
  void props.creature.conditionVersion
  return props.creature.conditionManager.getAll()
})

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node
  if (
    pickerRef.value &&
    !pickerRef.value.contains(target) &&
    addButtonRef.value &&
    !addButtonRef.value.contains(target)
  ) {
    showPicker.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})

const isConditionActive = (slug: ConditionSlug): boolean => {
  void props.creature.conditionVersion
  return props.creature.conditionManager.has(slug)
}

const handleBadgeClick = (slug: ConditionSlug) => {
  if (conditionHasValue(slug)) {
    const currentValue = props.creature.conditionManager.get(slug) ?? 1
    emit('setConditionValue', slug, currentValue - 1)
  } else {
    emit('toggleCondition', slug)
  }
}

const handlePickerSelect = (slug: ConditionSlug) => {
  if (slug === 'persistent-damage' && !isConditionActive(slug)) {
    // Show formula input before confirming the condition
    showFormulaInput.value = true
    return
  }
  emit('toggleCondition', slug)
  showPicker.value = false
}

const confirmPersistentDamage = () => {
  emit('toggleCondition', 'persistent-damage')
  if (persistentFormulaValue.value) {
    combatStore.setPersistentFormula(props.creature.id, persistentFormulaValue.value)
  }
  showFormulaInput.value = false
  persistentFormulaValue.value = ''
  showPicker.value = false
}

const cancelPersistentFormula = () => {
  showFormulaInput.value = false
  persistentFormulaValue.value = ''
}
</script>

<template>
  <div class="flex flex-wrap gap-1 items-center">
    <!-- Active condition badges -->
    <template v-for="cond in activeConditions" :key="cond.slug">
      <button
        @click="handleBadgeClick(cond.slug)"
        :class="['px-2 py-0.5 rounded-full text-xs font-normal cursor-pointer', CONDITION_BADGE_CLASSES[cond.slug]]"
        :title="formatCondition(cond.slug)"
      >
        {{ formatCondition(cond.slug) }}
        <span v-if="conditionHasValue(cond.slug)">
          {{ cond.value }}
        </span>
      </button>
    </template>

    <!-- Add condition button -->
    <div class="relative">
      <button
        ref="addButtonRef"
        @click="showPicker = !showPicker"
        class="w-6 h-6 rounded-full bg-charcoal-500 hover:bg-charcoal-400 text-stone-400 hover:text-stone-200 text-xs flex items-center justify-center transition-colors"
        aria-label="Add condition"
      >
        +
      </button>

      <!-- Condition picker popover -->
      <div
        v-if="showPicker"
        ref="pickerRef"
        class="absolute left-0 top-8 bg-charcoal-600 border border-charcoal-500 rounded-lg p-2 shadow-card z-10 w-64 max-h-80 overflow-y-auto"
      >
        <!-- Persistent damage formula input (shown when persistent-damage is selected) -->
        <div v-if="showFormulaInput" class="p-2">
          <div class="text-xs font-bold text-stone-300 mb-2">Persistent Damage Formula</div>
          <input
            data-testid="persistent-formula-input"
            type="text"
            v-model="persistentFormulaValue"
            placeholder="e.g. 1d6 fire"
            class="w-full text-xs rounded bg-charcoal-500 border border-charcoal-400 text-stone-200 px-2 py-1 mb-2 placeholder-stone-500 focus:outline-none focus:border-gold"
            @keyup.enter="confirmPersistentDamage"
          />
          <div class="flex gap-1">
            <button
              @click="confirmPersistentDamage"
              class="flex-1 px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-stone-100 text-xs font-bold transition-colors"
            >
              Confirm
            </button>
            <button
              @click="cancelPersistentFormula"
              class="px-2 py-1 rounded bg-charcoal-500 hover:bg-charcoal-400 text-stone-300 text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        <!-- Condition list (hidden when formula input shown) -->
        <template v-else>
          <div v-for="(conditions, category) in PICKER_CATEGORIES" :key="category">
            <!-- Category header -->
            <button
              @click="toggleCategory(category)"
              class="w-full flex items-center justify-between sticky top-0 bg-charcoal-600 z-10 pb-1 pt-1"
            >
              <span class="text-[11px] font-bold text-stone-500 uppercase tracking-wider">{{ category }}</span>
              <svg
                :class="['w-3 h-3 text-stone-600 transition-transform', collapsedCategories.has(category) ? '' : 'rotate-180']"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <!-- Condition buttons grid -->
            <div v-if="!collapsedCategories.has(category)" class="grid grid-cols-2 gap-1 mb-2">
              <button
                v-for="slug in conditions"
                :key="slug"
                @click="handlePickerSelect(slug)"
                :class="[
                  'px-2 py-1 rounded text-xs text-left truncate transition-colors',
                  isConditionActive(slug)
                    ? CONDITION_BADGE_CLASSES[slug] + ' opacity-60'
                    : 'bg-charcoal-500 text-stone-400 hover:bg-charcoal-400 hover:text-stone-200'
                ]"
              >
                {{ formatCondition(slug) }}
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
