<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { db } from '@/lib/database'
import { syncState } from '@/lib/schema'
import { syncPacks, type SyncProgress, type SyncResult } from '@/lib/sync-service'

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

const STAGES = ['checking', 'downloading', 'extracting', 'importing', 'cleanup', 'done'] as const

type Stage = (typeof STAGES)[number]

const STAGE_LABELS: Record<Stage, string> = {
  checking: 'Checking for updates...',
  downloading: 'Downloading...',
  extracting: 'Extracting...',
  importing: 'Importing...',
  cleanup: 'Cleaning up...',
  done: 'Done!',
}

// ──────────────────────────────────────────────────────────────────────────────
// Reactive state
// ──────────────────────────────────────────────────────────────────────────────

const isSyncing = ref(false)
const progress = ref<SyncProgress | null>(null)
const completedStages = ref<string[]>([])
const result = ref<SyncResult | null>(null)
const error = ref<string | null>(null)
const errorDetails = ref<string | null>(null)
const showErrorDetails = ref(false)
const syncStateData = ref<{
  lastRelease: string | null
  lastSyncAt: string | null
  totalEntities: number | null
} | null>(null)

// ──────────────────────────────────────────────────────────────────────────────
// Computed
// ──────────────────────────────────────────────────────────────────────────────

const progressPercent = computed(() => {
  if (!progress.value || progress.value.stage !== 'importing') return 0
  const { current, total } = progress.value
  if (!current || !total) return 0
  return Math.min(100, Math.round((current / total) * 100))
})

const isDeterminate = computed(() => progress.value?.stage === 'importing')

// ──────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ──────────────────────────────────────────────────────────────────────────────

onMounted(async () => {
  const rows = await db.select().from(syncState).limit(1)
  syncStateData.value = rows[0] ?? null
})

// ──────────────────────────────────────────────────────────────────────────────
// Functions
// ──────────────────────────────────────────────────────────────────────────────

function formatDate(isoString: string | null): string {
  if (!isoString) return 'Unknown'
  try {
    return new Date(isoString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return isoString
  }
}

async function startSync() {
  isSyncing.value = true
  completedStages.value = []
  progress.value = null
  error.value = null
  errorDetails.value = null
  result.value = null
  showErrorDetails.value = false

  try {
    const syncResult = await syncPacks((p: SyncProgress) => {
      if (progress.value && progress.value.stage !== p.stage) {
        completedStages.value = [...completedStages.value, progress.value.stage]
      }
      progress.value = p
    })
    result.value = syncResult
    // Refresh version display from DB
    const rows = await db.select().from(syncState).limit(1)
    syncStateData.value = rows[0] ?? null
    // After 3 seconds, clear result summary to settle to version display
    setTimeout(() => {
      result.value = null
    }, 3000)
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
    errorDetails.value = err instanceof Error ? (err.stack ?? null) : null
  } finally {
    isSyncing.value = false
  }
}

function retrySync() {
  startSync()
}
</script>

<template>
  <div class="px-8 py-8 max-w-lg">
    <!-- Page heading -->
    <h1 class="text-3xl font-display font-bold text-stone-100 mb-2">Sync Data</h1>

    <!-- Idle state: not syncing, no error, no result -->
    <div v-if="!isSyncing && !error && !result">
      <!-- Version info card when data exists -->
      <div
        v-if="syncStateData"
        class="bg-charcoal-600 border border-charcoal-500 rounded-xl p-5 mb-6"
      >
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-normal text-stone-400">Version</span>
            <span class="text-sm font-bold text-stone-100">{{ syncStateData.lastRelease ?? 'Unknown' }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs font-normal text-stone-400">Last synced</span>
            <span class="text-sm font-bold text-stone-100">{{ formatDate(syncStateData.lastSyncAt) }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs font-normal text-stone-400">Entities</span>
            <span class="text-sm font-bold text-stone-100">{{ syncStateData.totalEntities?.toLocaleString() ?? '0' }}</span>
          </div>
        </div>
      </div>
      <!-- Never-synced empty state -->
      <p v-else class="text-sm text-stone-400 mb-6">No PF2e data yet — sync to get started.</p>
    </div>

    <!-- Active sync state -->
    <div v-if="isSyncing" class="mb-6">
      <!-- Stage pipeline list -->
      <ul class="space-y-2 mb-4">
        <li
          v-for="stage in STAGES"
          :key="stage"
          class="flex items-center gap-3 text-sm"
        >
          <!-- Completed: gold checkmark -->
          <span
            v-if="completedStages.includes(stage)"
            class="text-gold font-bold w-4 text-center"
          >&#10003;</span>
          <!-- Active: animated gold dot -->
          <span
            v-else-if="progress?.stage === stage"
            class="inline-block w-2 h-2 rounded-full bg-gold animate-pulse ml-1"
          />
          <!-- Pending: dim gray dot -->
          <span
            v-else
            class="inline-block w-2 h-2 rounded-full bg-charcoal-500 ml-1"
          />
          <span
            :class="[
              completedStages.includes(stage)
                ? 'text-stone-400 line-through'
                : progress?.stage === stage
                  ? 'text-stone-100 font-bold'
                  : 'text-stone-500',
            ]"
          >
            {{ STAGE_LABELS[stage] }}
          </span>
        </li>
      </ul>

      <!-- Progress bar -->
      <div class="h-1.5 w-full rounded-full bg-charcoal-900">
        <div
          v-if="isDeterminate"
          class="h-full rounded-full bg-gold transition-all duration-300"
          :style="{ width: progressPercent + '%' }"
        />
        <div
          v-else
          class="h-full rounded-full bg-gold animate-pulse w-full"
        />
      </div>
    </div>

    <!-- Result summary -->
    <div
      v-if="result && !isSyncing"
      class="bg-charcoal-600 border border-gold/40 rounded-xl p-4 mb-6"
    >
      <p class="text-sm font-bold text-gold">Sync complete! ({{ result.release }})</p>
      <p class="text-xs text-stone-400 mt-1">
        Added: {{ result.added }}, Updated: {{ result.updated }}, Deleted: {{ result.deleted }}
      </p>
    </div>

    <!-- Error state -->
    <div v-if="error && !isSyncing" class="mb-6">
      <p class="text-sm text-crimson-light font-bold">{{ error }}</p>
      <div v-if="errorDetails" class="mt-1">
        <button
          @click="showErrorDetails = !showErrorDetails"
          class="text-xs text-stone-500 underline hover:text-stone-300"
        >
          {{ showErrorDetails ? 'Hide details' : 'Show details' }}
        </button>
        <pre
          v-if="showErrorDetails"
          class="mt-2 text-xs text-crimson-light bg-charcoal-900 border border-crimson/40 rounded p-3 overflow-auto max-h-32 font-mono"
        >{{ errorDetails }}</pre>
      </div>
      <button
        @click="retrySync"
        class="mt-3 px-4 py-2 rounded bg-crimson hover:bg-crimson-light text-stone-100 text-sm font-bold transition-colors"
      >
        Retry Sync
      </button>
    </div>

    <!-- Sync Now button (hidden when error showing — retry button replaces it) -->
    <button
      v-if="!error"
      @click="startSync"
      :disabled="isSyncing"
      class="w-full py-3 rounded-lg bg-gold hover:bg-gold-light text-charcoal-950 font-bold text-base transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {{ isSyncing ? 'Syncing...' : 'Sync Now' }}
    </button>
  </div>
</template>
