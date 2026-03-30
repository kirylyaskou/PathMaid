<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  currentHp: number
  maxHp: number
  creatureId: string
}>()

const emit = defineEmits<{
  modifyHp: [delta: number]
}>()

const amount = ref(1)

const handleDamage = () => {
  emit('modifyHp', -amount.value)
}

const handleHeal = () => {
  emit('modifyHp', amount.value)
}
</script>

<template>
  <div class="flex items-center gap-1">
    <button
      @click="handleDamage"
      class="w-8 h-8 rounded bg-crimson hover:bg-crimson-light text-stone-100 text-lg font-bold flex items-center justify-center transition-colors"
      title="Damage"
    >
      -
    </button>
    <input
      v-model.number="amount"
      type="number"
      min="1"
      max="999"
      class="w-12 h-8 rounded bg-charcoal-900 border border-charcoal-500 text-center text-sm text-stone-200 font-mono focus:outline-none focus:border-gold transition-colors"
    />
    <button
      @click="handleHeal"
      class="w-8 h-8 rounded bg-charcoal-500 hover:bg-charcoal-400 border border-gold/50 hover:border-gold text-gold text-lg font-bold flex items-center justify-center transition-colors"
      title="Heal"
    >
      +
    </button>
  </div>
</template>
