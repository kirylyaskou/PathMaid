<script setup lang="ts">
import { ref } from 'vue'
import WeakEliteSelector from './WeakEliteSelector.vue'
import type { EntityResult } from '@/lib/entity-query'
import type { WeakEliteTier } from '@/types/entity'

const props = defineProps<{ entity: EntityResult }>()
const emit = defineEmits<{
  add: [payload: { entity: EntityResult; qty: number; tier: WeakEliteTier }]
}>()

const qty = ref(1)
const tier = ref<WeakEliteTier>('normal')

function handleAdd() {
  emit('add', { entity: props.entity, qty: qty.value, tier: tier.value })
  qty.value = 1
  tier.value = 'normal'
}
</script>

<template>
  <div class="border-t border-charcoal-600 bg-charcoal-900 p-3 flex flex-col gap-2">
    <!-- Selected creature name -->
    <div class="text-sm font-display font-bold text-gold truncate">
      {{ entity.name }}
    </div>

    <!-- Tier selector -->
    <WeakEliteSelector
      :level="entity.level ?? 0"
      v-model="tier"
    />

    <!-- Quantity + Add button row -->
    <div class="flex items-center gap-2">
      <label class="text-xs text-stone-400">Qty</label>
      <input
        v-model.number="qty"
        type="number"
        min="1"
        max="20"
        class="w-16 px-2 py-1 text-sm rounded bg-charcoal-700 border border-charcoal-600 text-stone-100
               focus:outline-none focus:ring-1 focus:ring-gold"
      />
      <button
        @click="handleAdd"
        class="flex-1 px-3 py-1.5 rounded bg-gold hover:bg-gold-light text-charcoal-950 text-sm font-bold transition-colors"
      >
        Add to Combat
      </button>
    </div>
  </div>
</template>
