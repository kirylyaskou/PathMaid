<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount, type PropType } from 'vue'
import { resolveCreatureItems } from '@/lib/creature-resolver'
import type { ResolvedCreatureItem } from '@/lib/creature-resolver'
import { sanitizeDescription } from '@/lib/description-sanitizer'
import { db } from '@/lib/database'
import { pf2eEntities } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { DamageCategorization } from '@/lib/pf2e/damage-helpers'
import { DAMAGE_TYPES } from '@/lib/pf2e/damage'
import type { DamageType, DamageCategory } from '@/lib/pf2e/damage'
import { parseIwrData, formatIwrType } from '@/lib/iwr-utils'
import type { IwrData } from '@/lib/iwr-utils'
// NO Pinia imports — this is a pure display component

const props = defineProps({
  rawData: { type: Object as PropType<any>, default: null },
  isLoading: { type: Boolean, default: false },
})

// ─── Local state ──────────────────────────────────────────────────────────────

const panelEl = ref<HTMLDivElement | null>(null)
const resolvedItems = ref<ResolvedCreatureItem[]>([])
const isResolving = ref(false)
const resolveError = ref(false)
const navigationHistory = ref<Array<{ rawData: any; name: string }>>([])
const currentRawData = ref<any>(null)
const currentName = ref('')

// ─── Section config ───────────────────────────────────────────────────────────

const SECTION_CONFIG: Array<{ key: string; label: string; types: string[] }> = [
  { key: 'melee', label: 'Melee Strikes', types: ['melee'] },
  { key: 'ranged', label: 'Ranged Strikes', types: ['ranged'] },
  { key: 'spellcasting', label: 'Spellcasting', types: ['spell', 'spellcastingEntry'] },
  { key: 'actions', label: 'Actions & Abilities', types: ['feat', 'action'] },
  { key: 'equipment', label: 'Equipment', types: ['equipment', 'weapon', 'armor'] },
]

// ─── Computed stats ───────────────────────────────────────────────────────────

const stats = computed(() => {
  const raw = currentRawData.value
  if (!raw?.system?.attributes) return null
  const attrs = raw.system.attributes
  const saves = raw.system?.saves
  return {
    hp: attrs.hp?.max ?? attrs.hp?.value ?? null,
    ac: attrs.ac?.value ?? null,
    perception: raw.system?.perception?.mod ?? null,
    speed: raw.system?.attributes?.speed?.total ?? raw.system?.attributes?.speed?.value ?? null,
    fortitude: saves?.fortitude?.value ?? null,
    reflex: saves?.reflex?.value ?? null,
    will: saves?.will?.value ?? null,
  }
})

const traits = computed(() => {
  const raw = currentRawData.value
  if (!raw?.system?.traits) return { rarity: 'common', size: '', values: [] as string[] }
  const traitValues: string[] = raw.system.traits.value ?? []
  const rarity: string = raw.system.traits.rarity ?? 'common'
  const size: string = raw.system.traits.size?.value ?? ''
  return { rarity, size, values: traitValues }
})

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const

const abilityScores = computed(() => {
  const raw = currentRawData.value
  if (!raw?.system?.abilities) return null
  return ABILITIES.map(key => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    mod: raw.system.abilities[key]?.mod ?? null,
  }))
})

const languages = computed(() => {
  const raw = currentRawData.value
  const langs = raw?.system?.details?.languages?.value ?? raw?.system?.traits?.languages?.value ?? []
  return Array.isArray(langs) ? langs : []
})

const skills = computed(() => {
  const raw = currentRawData.value
  const skillMap = raw?.system?.skills
  if (!skillMap || typeof skillMap !== 'object') return []
  return Object.entries(skillMap)
    .filter(([_, v]: [string, any]) => v && typeof v.value === 'number' && v.value !== 0)
    .map(([key, v]: [string, any]) => ({ name: key, mod: v.value }))
    .sort((a, b) => a.name.localeCompare(b.name))
})

const iwr = computed((): IwrData | null => {
  return parseIwrData(currentRawData.value) ?? null
})

// Group resolved items into ordered sections
const orderedSections = computed(() => {
  if (resolvedItems.value.length === 0) return []
  const typeMap = new Map<string, ResolvedCreatureItem[]>()
  for (const item of resolvedItems.value) {
    const t = item.embedded.type ?? 'other'
    if (!typeMap.has(t)) typeMap.set(t, [])
    typeMap.get(t)!.push(item)
  }
  const sections: Array<{ key: string; label: string; items: ResolvedCreatureItem[] }> = []
  const usedTypes = new Set<string>()
  for (const cfg of SECTION_CONFIG) {
    const items: ResolvedCreatureItem[] = []
    for (const t of cfg.types) {
      if (typeMap.has(t)) { items.push(...typeMap.get(t)!); usedTypes.add(t) }
    }
    if (items.length > 0) sections.push({ key: cfg.key, label: cfg.label, items })
  }
  // Collect uncategorized types into "Other"
  const otherItems: ResolvedCreatureItem[] = []
  for (const [t, items] of typeMap) {
    if (!usedTypes.has(t)) otherItems.push(...items)
  }
  if (otherItems.length > 0) sections.push({ key: 'other', label: 'Other', items: otherItems })
  return sections
})

// ─── Helper functions ─────────────────────────────────────────────────────────

function formatMod(val: number): string {
  return val >= 0 ? `+${val}` : `${val}`
}

function getDescription(item: ResolvedCreatureItem): string {
  const raw = item.canonical
    ? (item.canonical.system?.description?.value ?? '')
    : (item.embedded.system?.description?.value ?? '')
  return sanitizeDescription(raw)
}

function rarityColorClass(rarity: string): string {
  switch (rarity) {
    case 'uncommon': return 'bg-amber-700 text-amber-100'
    case 'rare': return 'bg-blue-700 text-blue-100'
    case 'unique': return 'bg-purple-700 text-purple-100'
    default: return 'bg-stone-600 text-stone-200'
  }
}

function getStrikeDamageEntries(item: ResolvedCreatureItem): Array<{ damageType: string; category: DamageCategory }> {
  const rolls = item.embedded?.system?.damageRolls
  if (!rolls || typeof rolls !== 'object') return []
  return Object.values(rolls as Record<string, any>)
    .filter((r) => r?.damageType && (DAMAGE_TYPES as readonly string[]).includes(r.damageType))
    .map((r) => ({
      damageType: r.damageType as string,
      category: DamageCategorization.getCategory(r.damageType as DamageType),
    }))
}

// ─── Navigation ───────────────────────────────────────────────────────────────

function handleNavigateToCanonical(item: ResolvedCreatureItem) {
  if (!item.canonical) return
  navigationHistory.value = [
    ...navigationHistory.value,
    { rawData: currentRawData.value, name: currentName.value },
  ]
  currentRawData.value = item.canonical
  currentName.value = item.canonical.name ?? item.embedded.name ?? ''
}

function handleBack() {
  if (navigationHistory.value.length === 0) return
  const prev = navigationHistory.value[navigationHistory.value.length - 1]
  navigationHistory.value = navigationHistory.value.slice(0, -1)
  currentRawData.value = prev.rawData
  currentName.value = prev.name
}

// ─── Description link click delegation ───────────────────────────────────────

async function handleDescriptionClick(event: MouseEvent) {
  const link = (event.target as HTMLElement).closest<HTMLElement>('[data-entity-pack]')
  if (!link) return
  event.preventDefault()

  const pack = link.dataset.entityPack
  const id = link.dataset.entityId
  if (!pack || !id) return

  const sourceId = `Compendium.pf2e.${pack}.Item.${id}`
  const results = await db
    .select()
    .from(pf2eEntities)
    .where(eq(pf2eEntities.sourceId, sourceId))
    .limit(1)

  if (results.length === 0) {
    link.classList.remove('text-blue-600', 'underline')
    link.classList.add('text-gray-400', 'cursor-not-allowed', 'no-underline')
    return
  }

  const entity = results[0] as any
  const rawData = JSON.parse(entity.rawData)
  navigationHistory.value = [
    ...navigationHistory.value,
    { rawData: currentRawData.value, name: currentName.value },
  ]
  currentRawData.value = rawData
  currentName.value = rawData.name ?? id
}

// Attach click delegation when panelEl appears
watch(
  panelEl,
  (el) => {
    if (el) {
      el.addEventListener('click', handleDescriptionClick)
    }
  }
)

onBeforeUnmount(() => {
  panelEl.value?.removeEventListener('click', handleDescriptionClick)
})

// ─── Watch props.rawData — reset and resolve when it changes ─────────────────

let currentRequestId = 0

watch(
  () => props.rawData,
  async (rawData) => {
    navigationHistory.value = []
    currentRawData.value = rawData
    currentName.value = rawData?.name ?? ''
    resolveError.value = false

    if (!rawData) {
      resolvedItems.value = []
      return
    }

    const requestId = ++currentRequestId
    isResolving.value = true
    try {
      const items = await resolveCreatureItems(rawData)
      if (requestId !== currentRequestId) return // stale request — discard
      resolvedItems.value = items
    } catch {
      if (requestId !== currentRequestId) return
      resolveError.value = true
      resolvedItems.value = []
    } finally {
      if (requestId === currentRequestId) {
        isResolving.value = false
      }
    }

    // Scroll to top on data change
    await nextTick()
    if (panelEl.value && typeof panelEl.value.scrollTo === 'function') {
      panelEl.value.scrollTo(0, 0)
    }
  },
  { immediate: true }
)
</script>

<template>
  <div ref="panelEl" class="flex flex-col">

    <!-- Loading skeleton state -->
    <div v-if="isLoading || isResolving" class="px-4 py-6 space-y-3">
      <div class="animate-pulse bg-charcoal-500 h-4 rounded w-3/4"></div>
      <div class="animate-pulse bg-charcoal-500 h-4 rounded w-1/2"></div>
      <div class="animate-pulse bg-charcoal-500 h-4 rounded w-2/3"></div>
      <p class="text-sm text-stone-500 mt-2">Loading stat block...</p>
    </div>

    <!-- No data state -->
    <div
      v-else-if="!currentRawData"
      class="px-4 py-4 text-sm text-stone-500 italic"
    >
      No compendium entry found. This creature was added manually without a source ID.
    </div>

    <!-- Error state -->
    <div v-else-if="resolveError" class="px-4 py-6 text-sm text-crimson-light">
      Could not load stat block. The creature data may not be synced yet.
    </div>

    <!-- Main content -->
    <template v-else>
      <!-- Header block -->
      <div class="bg-charcoal-900 border-b border-charcoal-600 px-4 py-3">
        <!-- Back button: shown only when navigation history exists -->
        <button
          v-if="navigationHistory.length > 0"
          @click="handleBack"
          class="text-gold hover:text-gold-light text-sm font-bold mb-1"
        >
          &larr; Back
        </button>

        <!-- Row 1: Entity name -->
        <h2 class="text-xl font-display font-bold text-gold">{{ currentName }}</h2>

        <!-- Row 2: Trait pills -->
        <div class="flex flex-wrap gap-1 mt-1">
          <!-- Rarity pill -->
          <span
            :class="['rounded px-2 py-0.5 text-xs font-bold uppercase', rarityColorClass(traits.rarity)]"
          >{{ traits.rarity }}</span>
          <!-- Size pill (if present) -->
          <span
            v-if="traits.size"
            class="bg-charcoal-500 text-stone-300 border border-charcoal-400 rounded px-2 py-0.5 text-xs font-bold uppercase"
          >{{ traits.size }}</span>
          <!-- Other trait pills -->
          <span
            v-for="trait in traits.values"
            :key="trait"
            class="bg-charcoal-500 text-stone-300 border border-charcoal-400 rounded px-2 py-0.5 text-xs font-bold uppercase"
          >{{ trait }}</span>
        </div>

        <!-- Row 3: Primary stats (HP, AC, Perception, Speed) -->
        <div v-if="stats" class="flex flex-wrap items-baseline gap-0 mt-2">
          <template v-if="stats.hp !== null">
            <span class="text-xs text-stone-400">HP</span>
            <span class="text-base font-bold text-stone-100"> {{ stats.hp }}</span>
          </template>
          <template v-if="stats.ac !== null">
            <span class="text-charcoal-500 mx-2">|</span>
            <span class="text-xs text-stone-400">AC</span>
            <span class="text-base font-bold text-stone-100"> {{ stats.ac }}</span>
          </template>
          <template v-if="stats.perception !== null">
            <span class="text-charcoal-500 mx-2">|</span>
            <span class="text-xs text-stone-400">Perc</span>
            <span class="text-base font-bold text-stone-100"> {{ formatMod(stats.perception) }}</span>
          </template>
          <template v-if="stats.speed !== null">
            <span class="text-charcoal-500 mx-2">|</span>
            <span class="text-xs text-stone-400">Speed</span>
            <span class="text-base font-bold text-stone-100"> {{ stats.speed }}ft</span>
          </template>
        </div>

        <!-- Row 4: Saves (Fort, Ref, Will) -->
        <div v-if="stats" class="flex flex-wrap items-baseline gap-0 mt-1">
          <template v-if="stats.fortitude !== null">
            <span class="text-xs text-stone-400">Fort</span>
            <span class="text-base font-bold text-stone-100"> {{ formatMod(stats.fortitude) }}</span>
          </template>
          <template v-if="stats.reflex !== null">
            <span class="text-charcoal-500 mx-2">|</span>
            <span class="text-xs text-stone-400">Ref</span>
            <span class="text-base font-bold text-stone-100"> {{ formatMod(stats.reflex) }}</span>
          </template>
          <template v-if="stats.will !== null">
            <span class="text-charcoal-500 mx-2">|</span>
            <span class="text-xs text-stone-400">Will</span>
            <span class="text-base font-bold text-stone-100"> {{ formatMod(stats.will) }}</span>
          </template>
        </div>

        <!-- Row 4b: IWR (Immunities, Weaknesses, Resistances) -->
        <div v-if="iwr" class="mt-1">
          <!-- Immunities sub-row -->
          <div v-if="iwr.immunities.length > 0">
            <span class="text-xs text-stone-400">Immunities </span>
            <span v-for="(entry, i) in iwr.immunities" :key="entry.type" class="text-sm text-stone-300">
              <template v-if="i > 0">, </template>
              {{ formatIwrType(entry.type) }}<span v-if="entry.exceptions.length" class="text-xs text-stone-400"> (except {{ entry.exceptions.map(formatIwrType).join(', ') }})</span>
            </span>
          </div>
          <!-- Weaknesses sub-row -->
          <div v-if="iwr.weaknesses.length > 0" class="mt-1">
            <span class="text-xs text-stone-400">Weaknesses </span>
            <span v-for="(entry, i) in iwr.weaknesses" :key="entry.type" class="text-sm text-stone-300">
              <template v-if="i > 0">, </template>
              {{ formatIwrType(entry.type) }}<span class="font-bold text-crimson-light"> {{ entry.value }}</span><span v-if="entry.exceptions.length" class="text-xs text-stone-400"> (except {{ entry.exceptions.map(formatIwrType).join(', ') }})</span>
            </span>
          </div>
          <!-- Resistances sub-row -->
          <div v-if="iwr.resistances.length > 0" class="mt-1">
            <span class="text-xs text-stone-400">Resistances </span>
            <span v-for="(entry, i) in iwr.resistances" :key="entry.type" class="text-sm text-stone-300">
              <template v-if="i > 0">, </template>
              {{ formatIwrType(entry.type) }}<span class="font-bold text-emerald-400"> {{ entry.value }}</span><span v-if="entry.exceptions.length" class="text-xs text-stone-400"> (except {{ entry.exceptions.map(formatIwrType).join(', ') }})</span>
            </span>
          </div>
        </div>

        <!-- Row 5: Languages (if any) -->
        <div v-if="languages.length > 0" class="mt-1">
          <span class="text-xs text-stone-400">Languages </span>
          <span class="text-sm text-stone-300">{{ languages.join(', ') }}</span>
        </div>

        <!-- Row 6: Skills (if any) -->
        <div v-if="skills.length > 0" class="mt-1">
          <span class="text-xs text-stone-400">Skills </span>
          <span class="text-sm text-stone-300">
            {{ skills.map(s => `${s.name} ${formatMod(s.mod)}`).join(', ') }}
          </span>
        </div>

        <!-- Row 7: Ability scores grid -->
        <div v-if="abilityScores" class="grid grid-cols-6 gap-1 mt-2">
          <div v-for="ab in abilityScores" :key="ab.key" class="text-center">
            <div class="text-xs text-stone-400 text-center">{{ ab.label }}</div>
            <div class="text-sm font-bold text-stone-100 text-center">
              {{ ab.mod !== null ? formatMod(ab.mod) : '—' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Body sections -->
      <template v-if="orderedSections.length > 0">
        <template v-for="section in orderedSections" :key="section.key">
          <!-- Section divider -->
          <div class="text-xs font-bold uppercase tracking-wider text-stone-400 bg-charcoal-900 border-b border-t border-charcoal-500 px-4 py-2">
            {{ section.label }}
          </div>
          <!-- Item rows — always expanded, no toggle -->
          <div v-for="item in section.items" :key="item.embedded._id">
            <!-- Item name row -->
            <div class="px-4 py-2 border-b border-charcoal-700 bg-charcoal-800 flex items-center gap-2">
              <span class="text-sm font-bold text-stone-200 flex-1">{{ item.embedded.name }}</span>
              <!-- Damage category icons (melee/ranged only) -->
              <template v-if="section.key === 'melee' || section.key === 'ranged'">
                <span
                  v-for="entry in getStrikeDamageEntries(item)"
                  :key="entry.damageType"
                  class="flex items-center gap-1"
                  :data-category="entry.category"
                >
                  <!-- Physical: sword icon -->
                  <svg v-if="entry.category === 'physical'" class="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                    <line x1="5" y1="19" x2="19" y2="5" />
                    <line x1="15" y1="5" x2="19" y2="5" />
                    <line x1="19" y1="5" x2="19" y2="9" />
                    <line x1="9" y1="15" x2="5" y2="19" />
                    <line x1="7" y1="13" x2="11" y2="17" />
                  </svg>
                  <!-- Energy: flame icon -->
                  <svg v-else-if="entry.category === 'energy'" class="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                    <path d="M12 2c0 4-4 6-4 10a4 4 0 0 0 8 0c0-4-4-6-4-10z" />
                    <path d="M12 18a2 2 0 0 1-2-2c0-2 2-3 2-5c0 2 2 3 2 5a2 2 0 0 1-2 2z" />
                  </svg>
                  <!-- Other: sparkle icon -->
                  <svg v-else class="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                    <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
                  </svg>
                  <span class="text-xs text-stone-400">{{ formatIwrType(entry.damageType) }}</span>
                </span>
              </template>
              <!-- Canonical cross-reference link for non-unique items -->
              <button
                v-if="!item.isUnique"
                @click="handleNavigateToCanonical(item)"
                class="text-gold/70 hover:text-gold p-1"
                aria-label="View canonical entry"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>
            <!-- Description — always visible (no toggle) -->
            <div
              class="bg-charcoal-900 px-4 py-3 text-sm text-stone-300 leading-relaxed border-b border-charcoal-700"
            >
              <div v-html="getDescription(item)"></div>
            </div>
          </div>
        </template>
      </template>

      <!-- Empty sections fallback -->
      <div
        v-else
        class="px-4 py-6 text-sm text-stone-500"
      >
        No abilities loaded. Run a PF2e sync to populate data.
      </div>

    </template>
  </div>
</template>
