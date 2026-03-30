<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { VList } from 'virtua/vue'
import EntityFilterBar from '@/components/EntityFilterBar.vue'
import { filterEntities } from '@/lib/entity-query'
import { calculateCreatureXP } from '@/lib/pf2e'
import type { EntityFilter, EntityResult } from '@/lib/entity-query'

const props = defineProps<{
  defaultEntityType?: string
  mode?: 'compendium' | 'combat'
  selectedId?: number | null
  partyLevel?: number
  /** Restrict Entity type dropdown to these types only (e.g. ['creature', 'hazard'] in combat mode) */
  allowedEntityTypes?: string[]
}>()

const emit = defineEmits<{
  'row-click': [result: EntityResult]
  'select': [result: EntityResult]
}>()

const results = ref<EntityResult[]>([])
const totalCount = ref(0)
const loading = ref(false)
const error = ref(false)

// Infinite scroll state
const PAGE_SIZE = 200
const currentOffset = ref(0)
const allLoaded = ref(false)
const loadingMore = ref(false)
const sentinel = ref<HTMLDivElement | null>(null)
let observer: IntersectionObserver | null = null
let currentFilter: EntityFilter = {}

// Local partyLevel (from EntityFilterBar party-change emit if not provided via prop)
const localPartyLevel = ref<number>(props.partyLevel ?? 1)
const partyLevel = computed(() => props.partyLevel ?? localPartyLevel.value)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function onFilterChange(filter: EntityFilter) {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => runQuery(filter), 200)
}

function handlePartyChange(payload: { partyLevel: number; partySize: number }) {
  localPartyLevel.value = payload.partyLevel
}

async function runQuery(filter: EntityFilter) {
  currentFilter = filter
  currentOffset.value = 0
  allLoaded.value = false
  loading.value = true
  error.value = false
  try {
    const rows = await filterEntities(filter, PAGE_SIZE, 0)
    results.value = rows
    totalCount.value = rows.length
    allLoaded.value = rows.length < PAGE_SIZE
  } catch {
    error.value = true
    results.value = []
    totalCount.value = 0
  } finally {
    loading.value = false
  }
}

async function loadNextPage() {
  if (loadingMore.value || allLoaded.value) return
  loadingMore.value = true
  try {
    const newOffset = currentOffset.value + PAGE_SIZE
    const rows = await filterEntities(currentFilter, PAGE_SIZE, newOffset)
    if (rows.length > 0) {
      results.value = [...results.value, ...rows]
      currentOffset.value = newOffset
      totalCount.value = results.value.length
    }
    if (rows.length < PAGE_SIZE) {
      allLoaded.value = true
    }
  } catch {
    // Silently fail — user can scroll up and retry
  } finally {
    loadingMore.value = false
  }
}

function handleRowClick(result: EntityResult) {
  emit('row-click', result)
  emit('select', result)
}

// Entity type icon SVG path
function typeIcon(entityType: string): string {
  const icons: Record<string, string> = {
    creature: 'M12 2C8 2 5 5 5 9c0 2.4 1.1 4.5 2.8 5.9L7 17h10l-.8-2.1C17.9 13.5 19 11.4 19 9c0-4-3-7-7-7zm0 2c2.8 0 5 2.2 5 5s-2.2 5-5 5-5-2.2-5-5 2.2-5 5-5zM9 19h6v1H9v-1zm1 2h4v1h-4v-1z',
    spell: 'M12 2L2 12l10 10 10-10L12 2z',
    hazard: 'M12 2L1 21h22L12 2zm0 4l8 13H4l8-13zm-1 5v4h2v-4h-2zm0 5v2h2v-2h-2z',
    item: 'M20 7H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM4 19V9h16v10H4zM2 5h20v2H2z',
    feat: 'M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z',
    action: 'M13 3L4 14h7l-2 7 9-11h-7l2-7z',
    equipment: 'M20 7H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM4 19V9h16v10H4zM2 5h20v2H2z',
  }
  return icons[entityType] ?? icons.creature
}

// Caster detection from rawData
function hasCasting(rawDataStr: string): boolean {
  try {
    const data = JSON.parse(rawDataStr)
    return (data?.items ?? []).some(
      (item: { type: string }) => item.type === 'spellcastingEntry' || item.type === 'spell'
    )
  } catch {
    return false
  }
}

// Level badge color based on delta from partyLevel
function levelBadgeClass(level: number | null): string {
  if (level === null || !partyLevel.value) return 'bg-charcoal-500 text-stone-200'
  const delta = level - partyLevel.value
  if (delta <= -3) return 'bg-stone-600 text-stone-200'         // trivial
  if (delta <= -1) return 'bg-emerald-800 text-emerald-200'     // weak/moderate
  if (delta <= 1) return 'bg-charcoal-500 text-stone-200'       // standard/strong
  if (delta === 2) return 'bg-amber-700 text-amber-100'         // boss
  return 'bg-crimson text-stone-100'                             // severe/solo boss
}

// Initial load on mount + setup IntersectionObserver
onMounted(() => {
  const initialFilter: EntityFilter = {}
  if (props.defaultEntityType) {
    initialFilter.entityType = props.defaultEntityType
  }
  runQuery(initialFilter)

  observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting && !loading.value && !loadingMore.value && !allLoaded.value) {
      loadNextPage()
    }
  }, { threshold: 0.1 })
})

// Watch sentinel ref to attach observer when element appears
watch(sentinel, (el) => {
  if (el && observer) observer.observe(el)
})

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>

<template>
  <div class="flex flex-col h-full bg-charcoal-800">
    <!-- Filter bar -->
    <EntityFilterBar
      :default-entity-type="defaultEntityType"
      :show-party-controls="mode === 'combat'"
      :allowed-entity-types="allowedEntityTypes"
      @filter-change="onFilterChange"
      @party-change="handlePartyChange"
    />

    <!-- Result count -->
    <div class="text-xs text-stone-400 px-3 py-1">
      <span v-if="!loading && !error">
        {{ totalCount }} results{{ allLoaded ? '' : '+' }}
      </span>
    </div>

    <!-- Loading state: skeleton pulse rows -->
    <div v-if="loading" class="flex-1 px-2 py-1 space-y-1">
      <div v-for="i in 5" :key="i" class="animate-pulse bg-charcoal-700 h-10 rounded" />
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="px-4 py-4 text-sm text-crimson-light">
      Could not load results. Try again or restart the app.
    </div>

    <!-- Empty state -->
    <div v-else-if="results.length === 0" class="px-4 py-8 text-center">
      <p class="text-sm font-bold text-stone-300">No matches</p>
      <p class="text-xs text-stone-400 mt-1">No entities match the current filters. Clear a filter to broaden your search.</p>
    </div>

    <!-- Virtualised result list -->
    <VList
      v-else
      :data="results"
      :item-size="40"
      class="flex-1 overflow-y-auto"
    >
      <template #default="{ item }">
        <div
          :class="[
            'h-10 flex items-center gap-2 px-3 border-b border-charcoal-700 cursor-pointer transition-colors',
            item.id === selectedId
              ? 'bg-charcoal-600 ring-1 ring-gold'
              : 'bg-charcoal-800 hover:bg-charcoal-700'
          ]"
          @click="handleRowClick(item)"
        >
          <!-- Type icon 16x16 -->
          <svg class="w-4 h-4 flex-shrink-0 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path :d="typeIcon(item.entityType)" />
          </svg>
          <!-- Caster icon (conditional) -->
          <svg
            v-if="item.entityType === 'npc' && hasCasting(item.rawData)"
            class="w-4 h-4 flex-shrink-0 text-stone-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M15 4V2m0 2v2m0-2h2m-2 0h-2m5 8l1.5-1.5M20 14l2-2m-4.5 4.5L19 18m-1.5-1.5L16 18m4-10l-7.5 7.5L8 11l-4 4" />
          </svg>
          <!-- Name -->
          <span class="flex-1 text-sm text-stone-200 truncate">{{ item.name }}</span>
          <!-- XP badge (npc only, when partyLevel set) -->
          <span
            v-if="item.entityType === 'npc' && partyLevel"
            class="text-xs text-stone-400 flex-shrink-0"
          >
            {{ calculateCreatureXP(item.level ?? 0, partyLevel).xp != null ? `${calculateCreatureXP(item.level ?? 0, partyLevel).xp} XP` : '\u2014' }}
          </span>
          <!-- Level badge -->
          <span
            :class="['px-1.5 py-0.5 rounded text-xs font-bold min-w-[28px] text-center flex-shrink-0', levelBadgeClass(item.level)]"
          >
            {{ item.level ?? '\u2013' }}
          </span>
        </div>
      </template>
    </VList>

    <!-- Infinite scroll sentinel -->
    <div
      v-if="!allLoaded && results.length > 0"
      ref="sentinel"
      class="h-10 flex items-center justify-center"
    >
      <svg
        v-if="loadingMore"
        class="animate-spin w-4 h-4 text-stone-500"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    </div>
  </div>
</template>
