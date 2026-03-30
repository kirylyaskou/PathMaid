<script setup lang="ts">
import { computed } from 'vue'
import type { Creature } from '@/types/combat'
import type { ConditionSlug } from '@/lib/pf2e'
import type { DamageType } from '@/lib/pf2e/damage'
import HPController from './HPController.vue'
import ConditionBadge from './ConditionBadge.vue'

const props = defineProps<{
  creature: Creature
  isCurrentTurn: boolean
  turnIndex: number
  regenerationDisabled: boolean
  activeDamageType?: DamageType | null
  showPersistentPrompt?: boolean
}>()

const canDrag = computed(() => {
  return props.creature.currentHP > 0 && !props.isCurrentTurn
})

const emit = defineEmits<{
  modifyHp: [id: string, delta: number]
  toggleCondition: [id: string, slug: ConditionSlug]
  toggleRegenerationDisabled: [creatureId: string]
  openDetail: [creatureId: string]
  setConditionValue: [id: string, slug: ConditionSlug, value: number]
  persistentRecover: [id: string]
  persistentContinues: [id: string]
}>()

const handleModifyHp = (delta: number) => {
  emit('modifyHp', props.creature.id, delta)
}

const handleToggleCondition = (slug: ConditionSlug) => {
  emit('toggleCondition', props.creature.id, slug)
}

const handleToggleRegeneration = () => {
  emit('toggleRegenerationDisabled', props.creature.id)
}

const handleOpenDetail = () => {
  emit('openDetail', props.creature.id)
}

const handleSetConditionValue = (slug: ConditionSlug, value: number) => {
  emit('setConditionValue', props.creature.id, slug, value)
}

const hpPercent = computed(() => {
  if (props.creature.maxHP === 0) return 0
  return Math.round((props.creature.currentHP / props.creature.maxHP) * 100)
})

const hpBarColor = computed(() => {
  if (hpPercent.value > 50) return 'bg-gold'
  if (hpPercent.value > 25) return 'bg-amber-600'
  return 'bg-crimson-light'
})

type IwrBadge =
  | { kind: 'immune' }
  | { kind: 'weak'; value: number }
  | { kind: 'resist'; value: number }
  | { kind: 'unaffected' }

const iwrBadge = computed((): IwrBadge => {
  if (!props.activeDamageType || !props.creature.iwrData) return { kind: 'unaffected' }
  const { immunities, weaknesses, resistances } = props.creature.iwrData
  const dt = props.activeDamageType
  if (immunities.some(i => i.type === dt)) return { kind: 'immune' }
  const w = weaknesses.find(entry => entry.type === dt)
  if (w) return { kind: 'weak', value: w.value }
  const r = resistances.find(entry => entry.type === dt)
  if (r) return { kind: 'resist', value: r.value }
  return { kind: 'unaffected' }
})
</script>

<template>
  <div
    :class="[
      'rounded-lg p-4 mb-2 flex gap-4 items-start shadow-card transition-colors',
      creature.isDowned && !isCurrentTurn
        ? 'opacity-50 border-l-4 border-crimson-dark bg-charcoal-600'
        : isCurrentTurn
          ? 'border-l-4 border-gold shadow-gold-glow bg-charcoal-600'
          : 'border-l-4 border-charcoal-500 bg-charcoal-600'
    ]"
    :draggable="canDrag"
    @dragstart="canDrag ? $event.dataTransfer?.setData('text/plain', creature.id) : null"
  >
    <!-- Column 1: Initiative Badge -->
    <div
      :class="[
        'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0',
        isCurrentTurn
          ? 'bg-gold text-charcoal-950'
          : 'bg-charcoal-500 text-stone-300'
      ]"
    >
      {{ creature.initiative }}
    </div>

    <!-- Column 2: Creature Info -->
    <div class="flex-1 flex flex-col gap-1">
      <!-- Creature name -->
      <h3 :class="['text-base font-display font-bold', isCurrentTurn ? 'text-gold' : 'text-stone-100']">
        {{ creature.name }}
      </h3>
      <!-- Stats row -->
      <div class="text-xs text-stone-400">
        AC {{ creature.ac }} · Dex {{ creature.dexMod >= 0 ? '+' : '' }}{{ creature.dexMod }}
      </div>
      <!-- Condition badges -->
      <ConditionBadge
        :creature="creature"
        @toggle-condition="handleToggleCondition"
        @set-condition-value="handleSetConditionValue"
      />
      <!-- IWR badge (shown only when a damage type is selected) -->
      <div v-if="props.activeDamageType" class="flex items-center gap-1 mt-1">
        <span
          v-if="iwrBadge.kind === 'immune'"
          data-testid="iwr-badge-immune"
          class="text-xs px-2 py-0.5 rounded font-bold bg-charcoal-500 text-stone-200"
        >Immune</span>
        <span
          v-else-if="iwrBadge.kind === 'weak'"
          data-testid="iwr-badge-weak"
          class="text-xs px-2 py-0.5 rounded font-bold bg-crimson text-stone-100"
        >Weak {{ (iwrBadge as { kind: 'weak'; value: number }).value }}</span>
        <span
          v-else-if="iwrBadge.kind === 'resist'"
          data-testid="iwr-badge-resist"
          class="text-xs px-2 py-0.5 rounded font-bold bg-emerald-700 text-stone-100"
        >Resist {{ (iwrBadge as { kind: 'resist'; value: number }).value }}</span>
        <span
          v-else
          data-testid="iwr-badge-unaffected"
          class="text-xs text-stone-500"
        >—</span>
      </div>
      <!-- Persistent damage prompt (shown at turn end when creature has persistent-damage) -->
      <div
        v-if="showPersistentPrompt && creature.persistentDamageFormula"
        data-testid="persistent-damage-prompt"
        class="mt-2 rounded-md border border-charcoal-400 bg-charcoal-700 p-3 text-sm"
      >
        <div class="font-display font-bold text-stone-200 mb-1">Persistent Damage</div>
        <div class="text-stone-300 mb-1">Formula: <span class="text-gold font-bold">{{ creature.persistentDamageFormula }}</span></div>
        <div class="text-stone-400 text-xs mb-3">DC 15 flat check to recover</div>
        <div class="flex gap-2">
          <button
            data-testid="persistent-recover-btn"
            @click.stop="emit('persistentRecover', creature.id)"
            class="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-stone-100 text-xs font-bold transition-colors"
          >
            Recovered
          </button>
          <button
            data-testid="persistent-continues-btn"
            @click.stop="emit('persistentContinues', creature.id)"
            class="px-3 py-1 rounded bg-charcoal-500 hover:bg-charcoal-400 text-stone-300 text-xs font-bold transition-colors"
          >
            Continues
          </button>
        </div>
      </div>
    </div>

    <!-- Column 3: HP + Controls -->
    <div class="flex flex-col items-end gap-2">
      <!-- HP fraction -->
      <span class="text-sm font-normal text-stone-200">
        {{ creature.currentHP }} / {{ creature.maxHP }}
      </span>
      <!-- HP bar -->
      <div class="w-32 h-1.5 rounded-full bg-charcoal-900">
        <div
          :class="['h-full rounded-full transition-all duration-300', hpBarColor]"
          :style="{ width: hpPercent + '%' }"
        ></div>
      </div>
      <!-- HP controls -->
      <HPController
        :current-hp="creature.currentHP"
        :max-hp="creature.maxHP"
        :creature-id="creature.id"
        @modify-hp="handleModifyHp"
      />
      <!-- Regen + Detail buttons -->
      <div class="flex gap-1">
        <button
          @click="handleToggleRegeneration"
          :class="[
            'px-2 py-1 text-xs rounded font-bold transition-colors',
            props.regenerationDisabled
              ? 'bg-crimson text-stone-100 hover:bg-crimson-light'
              : 'bg-charcoal-500 text-stone-400 hover:bg-charcoal-400'
          ]"
          :title="props.regenerationDisabled ? 'Regeneration disabled' : 'Enable regeneration'"
        >
          {{ props.regenerationDisabled ? 'Regen: OFF' : 'Regen: ON' }}
        </button>
        <button
          v-if="creature.sourceId"
          @click="handleOpenDetail"
          class="px-2 py-1 text-xs rounded font-bold bg-charcoal-500 text-gold hover:bg-charcoal-400 transition-colors"
        >
          View Stat Block
        </button>
      </div>
    </div>
  </div>
</template>
