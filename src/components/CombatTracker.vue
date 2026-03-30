<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCombatStore } from '@/stores/combat'
import type { Creature } from '@/types/combat'
import type { ConditionSlug } from '@/lib/pf2e'
import { DAMAGE_TYPES, type DamageType } from '@/lib/pf2e/damage'
import { formatIwrType } from '@/lib/iwr-utils'
import CreatureCard from './CreatureCard.vue'
import XpBudgetBar from './XpBudgetBar.vue'

const props = defineProps<{
  selectedId?: string | null
}>()

const emit = defineEmits<{
  'select': [creatureId: string]
}>()

const combatStore = useCombatStore()

const hasAllActed = computed(() => combatStore.hasAllActed)

// View-local state: selected damage type for cross-IWR preview
const selectedDamageType = ref<DamageType | null>(null)

const handleModifyHp = (id: string, delta: number) => {
  combatStore.modifyHP(id, delta)
}

const handleToggleCondition = (id: string, slug: ConditionSlug) => {
  combatStore.toggleCondition(id, slug)
}

const handleToggleRegeneration = (creatureId: string) => {
  combatStore.toggleRegenerationDisabled(creatureId)
}

const getRegenerationDisabled = (creatureId: string): boolean => {
  return !!combatStore.regenerationDisabled[creatureId]
}

const handleAdvanceRound = () => {
  if (hasAllActed.value) {
    combatStore.advanceRound()
  }
}

const handleNextCreature = () => {
  combatStore.nextCreature()
}

const handleOpenDetail = (creatureId: string) => {
  emit('select', creatureId)
}

const handleSetConditionValue = (id: string, slug: ConditionSlug, value: number) => {
  combatStore.setConditionValue(id, slug, value)
}

const handlePersistentRecover = (creatureId: string) => {
  combatStore.recoverPersistentDamage(creatureId)
}

const handlePersistentContinues = (creatureId: string) => {
  combatStore.dismissPersistentPrompt(creatureId)
}

const dragOverCreatureId = ref<string | null>(null)

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
}

const handleDragEnter = (creatureId: string) => {
  dragOverCreatureId.value = creatureId
}

const handleDragLeave = () => {
  dragOverCreatureId.value = null
}

const handleDrop = (event: DragEvent, targetCreatureId: string) => {
  event.preventDefault()
  const sourceCreatureId = event.dataTransfer?.getData('text/plain')
  dragOverCreatureId.value = null
  if (sourceCreatureId && sourceCreatureId !== targetCreatureId) {
    combatStore.reorderCreature(sourceCreatureId, targetCreatureId)
  }
}
</script>

<template>
  <div>
    <!-- Toolbar -->
    <div class="sticky top-0 z-10 bg-charcoal-900 border-b border-charcoal-500 px-6 py-3 flex items-center justify-between">
      <h1 class="text-xl font-display font-bold text-stone-100">Combat Tracker</h1>
      <div class="flex items-center gap-3">
        <!-- Damage type selector for cross-IWR preview -->
        <select
          v-model="selectedDamageType"
          data-testid="damage-type-selector"
          class="text-xs rounded bg-charcoal-600 border border-charcoal-400 text-stone-200 px-2 py-1"
        >
          <option :value="null">Damage type...</option>
          <option v-for="dt in DAMAGE_TYPES" :key="dt" :value="dt">{{ formatIwrType(dt) }}</option>
        </select>
        <!-- Round badge -->
        <div class="px-3 py-1 rounded-md bg-charcoal-600 border border-charcoal-500 flex items-center gap-2">
          <span class="text-xs text-stone-400 font-normal">Round</span>
          <span class="text-lg font-bold text-gold">{{ combatStore.roundNumber }}</span>
        </div>
        <!-- New Round button -->
        <button
          @click="handleAdvanceRound"
          :disabled="!hasAllActed || combatStore.creatures.length === 0"
          class="px-3 py-1.5 rounded bg-charcoal-500 hover:bg-charcoal-400 border border-charcoal-400 text-sm font-bold text-stone-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          New Round
        </button>
        <!-- Next Creature button -->
        <button
          @click="handleNextCreature"
          :disabled="combatStore.creatures.length === 0"
          class="px-3 py-1.5 rounded bg-charcoal-500 hover:bg-charcoal-400 border border-charcoal-400 text-sm font-bold text-stone-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next Creature
        </button>
      </div>
    </div>

    <!-- XP Budget Overlay -->
    <XpBudgetBar />

    <!-- Empty state -->
    <div v-if="combatStore.creatures.length === 0" class="text-center py-12">
      <h2 class="text-lg font-display font-bold text-stone-300">No Creatures in Combat</h2>
      <p class="text-stone-500 mt-2 text-sm">Add a creature to begin tracking initiative and HP.</p>
    </div>

    <!-- Creature list -->
    <div v-else class="px-6 py-4 space-y-2">
      <div
        v-for="(creature, index) in combatStore.sortedCreatures"
        :key="creature.id"
        @click="handleOpenDetail(creature.id)"
        :class="[
          'cursor-pointer',
          creature.id === props.selectedId
            ? 'border-l-4 border-gold bg-charcoal-700'
            : 'border-l-4 border-transparent',
          { 'ring-1 ring-gold ring-offset-1 ring-offset-charcoal-800 rounded-lg': dragOverCreatureId === creature.id }
        ]"
        @dragover.prevent="handleDragOver"
        @dragenter.prevent="handleDragEnter(creature.id)"
        @dragleave="handleDragLeave"
        @drop="handleDrop($event, creature.id)"
      >
        <CreatureCard
          :creature="(creature as Creature)"
          :is-current-turn="creature.isCurrentTurn"
          :turn-index="index"
          :regeneration-disabled="getRegenerationDisabled(creature.id)"
          :active-damage-type="selectedDamageType"
          :show-persistent-prompt="combatStore.persistentDamagePrompts.has(creature.id)"
          @modify-hp="handleModifyHp"
          @toggle-condition="handleToggleCondition"
          @toggle-regeneration-disabled="handleToggleRegeneration"
          @open-detail="handleOpenDetail"
          @set-condition-value="handleSetConditionValue"
          @persistent-recover="handlePersistentRecover"
          @persistent-continues="handlePersistentContinues"
        />
      </div>
    </div>

  </div>
</template>
