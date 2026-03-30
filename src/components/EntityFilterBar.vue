<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { getDistinctFamilies, getDistinctTraits } from '@/lib/entity-query'
import type { EntityFilter } from '@/lib/entity-query'
import type { TagLogic } from '@/types/entity'

const props = withDefaults(defineProps<{
  defaultEntityType?: string
  partyLevel?: number
  partySize?: number
  showPartyControls?: boolean
  /** When set, restricts the Type dropdown to only these entity types */
  allowedEntityTypes?: string[]
}>(), {
  showPartyControls: true,
})

const emit = defineEmits<{
  'filter-change': [filter: EntityFilter]
  'party-change': [payload: { partyLevel: number; partySize: number }]
}>()

// Filter state (all local refs — NO Pinia)
const entityType = ref<string | undefined>(props.defaultEntityType)
const levelMin = ref<number | undefined>()
const levelMax = ref<number | undefined>()
const rarity = ref<string | undefined>()
const family = ref<string | undefined>()
const name = ref('')
const tags = ref<string[]>([])
const tagLogic = ref<TagLogic>('AND')
const tagSearch = ref('')

// Party controls (standalone — not gated behind any toggle)
const partyLevel = ref<number>(props.partyLevel ?? 1)
const partySize = ref<number>(props.partySize ?? 4)

// Dropdown data (loaded from DB on mount)
const familyOptions = ref<string[]>([])
const traitOptions = ref<string[]>([])

const filteredTraitOptions = computed(() => {
  if (!tagSearch.value) return traitOptions.value.slice(0, 50)
  const search = tagSearch.value.toLowerCase()
  return traitOptions.value.filter(t => t.toLowerCase().includes(search)).slice(0, 50)
})

onMounted(async () => {
  try {
    familyOptions.value = await getDistinctFamilies()
    traitOptions.value = await getDistinctTraits()
  } catch {
    // Silently handle — dropdowns will be empty
  }
})

const hasActiveFilters = computed(() => {
  return !!(entityType.value || levelMin.value !== undefined || levelMax.value !== undefined ||
    rarity.value || family.value || tags.value.length > 0 || name.value.length > 0)
})

// Tag management
function addTag(trait: string) {
  if (trait && traitOptions.value.includes(trait) && !tags.value.includes(trait)) {
    tags.value = [...tags.value, trait]
  }
  tagSearch.value = ''
}

function removeTag(trait: string) {
  tags.value = tags.value.filter(t => t !== trait)
}

function handleTagInput(event: Event) {
  const input = event.target as HTMLInputElement
  const value = input.value
  if (traitOptions.value.includes(value)) {
    addTag(value)
  }
}

function handleTagKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    const input = event.target as HTMLInputElement
    addTag(input.value)
  }
}

// Emit on any filter change
function emitFilter() {
  emit('filter-change', {
    name: name.value || undefined,
    // Convert "" (from <option value="">) to undefined so filterEntities ?? null treats it as IS NULL
    entityType: entityType.value || undefined,
    levelMin: levelMin.value,
    levelMax: levelMax.value,
    // Convert "" (from <option value="">) to undefined
    rarity: rarity.value || undefined,
    family: entityType.value === 'npc' ? family.value : undefined,
    tags: tags.value.length ? tags.value : undefined,
    tagLogic: tags.value.length ? tagLogic.value : undefined,
  })
}

watch([name, entityType, levelMin, levelMax, rarity, family, tags, tagLogic], emitFilter, { deep: true })

// When entityType changes away from 'npc', clear family; reload traits
watch(entityType, (newType) => {
  // Treat "" (All types select value) same as undefined for family/traits logic
  const resolvedType = newType || undefined
  if (resolvedType !== 'npc') { family.value = undefined }
  getDistinctTraits(resolvedType).then(t => { traitOptions.value = t }).catch(() => {})
})

// Emit party-change when party controls change
watch([partyLevel, partySize], () => {
  emit('party-change', { partyLevel: partyLevel.value, partySize: partySize.value })
})
</script>

<template>
  <div class="bg-charcoal-600 px-3 py-2 space-y-2">
    <!-- Party level + Party size (shown when showPartyControls is true, default) -->
    <div v-if="showPartyControls" class="flex items-center gap-3">
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

    <!-- Row: Entity type -->
    <div>
      <label class="text-xs text-stone-400 mb-1 block">Type</label>
      <select
        v-model="entityType"
        class="w-full bg-charcoal-700 border border-charcoal-600 rounded px-2 py-1 text-sm text-stone-200 focus:border-gold focus:outline-none"
      >
        <option v-if="!allowedEntityTypes" value="">All types</option>
        <template v-if="allowedEntityTypes">
          <option
            v-for="type in allowedEntityTypes"
            :key="type"
            :value="type"
          >{{ type }}</option>
        </template>
        <template v-else>
          <option value="npc">creature</option>
          <option value="spell">spell</option>
          <option value="hazard">hazard</option>
          <option value="item">item</option>
          <option value="feat">feat</option>
          <option value="action">action</option>
          <option value="equipment">equipment</option>
        </template>
      </select>
    </div>

    <!-- Row: Rarity -->
    <div>
      <label class="text-xs text-stone-400 mb-1 block">Rarity</label>
      <select
        v-model="rarity"
        class="w-full bg-charcoal-700 border border-charcoal-600 rounded px-2 py-1 text-sm text-stone-200 focus:border-gold focus:outline-none"
      >
        <option value="">All rarities</option>
        <option value="common">common</option>
        <option value="uncommon">uncommon</option>
        <option value="rare">rare</option>
        <option value="unique">unique</option>
      </select>
    </div>

    <!-- Row: Level Range -->
    <div>
      <label class="text-xs text-stone-400 mb-1 block">Level Range</label>
      <div class="flex gap-2">
        <input
          type="number"
          v-model.number="levelMin"
          placeholder="Min"
          class="flex-1 bg-charcoal-700 border border-charcoal-600 rounded px-2 py-1 text-sm text-stone-200 focus:border-gold focus:outline-none"
          aria-label="Minimum level"
        />
        <input
          type="number"
          v-model.number="levelMax"
          placeholder="Max"
          class="flex-1 bg-charcoal-700 border border-charcoal-600 rounded px-2 py-1 text-sm text-stone-200 focus:border-gold focus:outline-none"
          aria-label="Maximum level"
        />
      </div>
    </div>

    <!-- Row: Family (conditional, when entityType === 'npc') -->
    <div v-if="entityType === 'npc'">
      <label class="text-xs text-stone-400 mb-1 block">Family</label>
      <select
        v-model="family"
        class="w-full bg-charcoal-700 border border-charcoal-600 rounded px-2 py-1 text-sm text-stone-200 focus:border-gold focus:outline-none"
      >
        <option value="">All families</option>
        <option v-for="f in familyOptions" :key="f" :value="f">{{ f }}</option>
      </select>
    </div>

    <!-- Row: Name search -->
    <div>
      <label class="text-xs text-stone-400 mb-1 block">Name</label>
      <input
        type="text"
        v-model="name"
        placeholder="Search by name..."
        class="w-full bg-charcoal-700 border border-charcoal-600 rounded px-2 py-1 text-sm text-stone-200 focus:border-gold focus:outline-none"
      />
    </div>

    <!-- Row: Traits filter -->
    <div class="flex flex-col gap-1">
      <div class="flex items-center gap-2">
        <label class="text-xs text-stone-400">Traits</label>
        <button
          @click="tagLogic = tagLogic === 'AND' ? 'OR' : 'AND'"
          :class="[
            'text-xs px-2 py-0.5 rounded border transition-colors',
            tagLogic === 'OR'
              ? 'bg-charcoal-700 text-stone-200 border-gold'
              : 'bg-charcoal-600 text-stone-400 border-charcoal-500'
          ]"
        >
          {{ tagLogic === 'AND' ? 'Match all traits' : 'Match any trait' }}
        </button>
      </div>
      <div>
        <input
          type="text"
          v-model="tagSearch"
          :list="'trait-options-list'"
          placeholder="Search traits..."
          class="w-full bg-charcoal-700 border border-charcoal-600 rounded px-2 py-1 text-sm text-stone-200 focus:border-gold focus:outline-none"
          @change="handleTagInput"
          @keydown="handleTagKeydown"
        />
        <datalist id="trait-options-list">
          <option v-for="trait in filteredTraitOptions" :key="trait" :value="trait" />
        </datalist>
      </div>
    </div>

    <!-- Selected tag pills -->
    <div v-if="tags.length > 0" class="flex flex-wrap gap-1">
      <span
        v-for="tag in tags"
        :key="tag"
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-charcoal-700 text-stone-300 border border-charcoal-500"
      >
        {{ tag }}
        <button
          @click="removeTag(tag)"
          class="text-stone-400 hover:text-gold"
          :aria-label="'Remove ' + tag + ' trait'"
        >x</button>
      </span>
    </div>

    <!-- Active filter indicator -->
    <div v-if="hasActiveFilters" class="text-xs text-stone-400">
      Filters active
    </div>
  </div>
</template>
