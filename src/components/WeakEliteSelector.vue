<script setup lang="ts">
import { computed } from 'vue'
import { getHpAdjustment } from '@/lib/weak-elite'
import type { WeakEliteTier } from '@/types/entity'

const props = defineProps<{ level: number; modelValue?: WeakEliteTier }>()
const emit = defineEmits<{ 'update:modelValue': [tier: WeakEliteTier] }>()

const tier = computed(() => props.modelValue ?? 'normal')

const TIERS: WeakEliteTier[] = ['weak', 'normal', 'elite']

const hpLabel = computed(() => {
  const delta = getHpAdjustment(tier.value, props.level)
  if (delta === 0) return 'Normal'
  return `${tier.value === 'elite' ? 'Elite' : 'Weak'}: ${delta > 0 ? '+' : ''}${delta} HP`
})
</script>

<template>
  <div class="flex items-center gap-1">
    <button
      v-for="t in TIERS"
      :key="t"
      @click="emit('update:modelValue', t)"
      :class="[
        'px-3 py-1 text-sm rounded transition-colors',
        tier === t
          ? 'bg-gold text-charcoal-900 font-bold'
          : 'bg-charcoal-700 text-stone-300 hover:bg-charcoal-600'
      ]"
    >
      {{ t.charAt(0).toUpperCase() + t.slice(1) }}
    </button>
    <span class="ml-2 text-xs text-stone-400">{{ hpLabel }}</span>
  </div>
</template>
