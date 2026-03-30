<script setup lang="ts">
import { watch } from 'vue';

type DbStatus = 'idle' | 'initializing' | 'migrating' | 'ready' | 'error';

const props = defineProps<{
  status: DbStatus;
  statusMessage: string;
  error: string | null;
}>();

const emit = defineEmits<{
  retry: [];
  dismissed: [];
}>();

// When status becomes 'ready', hold for 300ms then emit 'dismissed'
watch(
  () => props.status,
  (newStatus) => {
    if (newStatus === 'ready') {
      setTimeout(() => {
        emit('dismissed');
      }, 300);
    }
  }
);
</script>

<template>
  <Transition name="splash">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-950"
    >
      <div class="flex flex-col items-center gap-6 px-6 text-center">
        <!-- App title -->
        <h1 class="text-2xl font-bold font-display text-white">Pathfinder 2e DM Assistant</h1>

        <!-- Loading state: spinner + status text -->
        <template v-if="status !== 'error'">
          <div
            class="animate-spin rounded-full border-4 border-charcoal-600 border-t-gold h-8 w-8"
          />
          <p class="text-sm text-stone-400">{{ statusMessage }}</p>
        </template>

        <!-- Error state: error card -->
        <template v-else>
          <div class="bg-crimson-dark rounded-lg p-6 max-w-md text-left">
            <h2 class="text-lg font-bold font-display text-crimson-light mb-2">Database initialization failed</h2>
            <p class="text-sm text-stone-300 mb-4">
              The database could not be created or migrated. Close and reopen the app to retry.
            </p>
            <button
              class="bg-gold-dark text-charcoal-950 px-4 py-2 rounded hover:bg-gold transition-colors"
              @click="emit('retry')"
            >
              Retry Initialization
            </button>
          </div>
        </template>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.splash-enter-active {
  transition: opacity 200ms ease-in;
}
.splash-leave-active {
  transition: opacity 300ms ease-out;
}
.splash-enter-from,
.splash-leave-to {
  opacity: 0;
}
</style>
