import { ref } from 'vue';
import { runMigrations } from '@/lib/migrations';
import { useEncounterStore } from '@/stores/encounter';

type DbStatus = 'idle' | 'initializing' | 'migrating' | 'ready' | 'error';

const status = ref<DbStatus>('idle');
const statusMessage = ref('');
const error = ref<string | null>(null);
let initialized = false;

export function useDatabase() {
  async function initialize(): Promise<void> {
    if (initialized) return;

    try {
      status.value = 'initializing';
      statusMessage.value = 'Initializing database...';
      error.value = null;

      status.value = 'migrating';
      statusMessage.value = 'Running migrations...';

      await runMigrations((msg) => {
        statusMessage.value = msg;
      });

      statusMessage.value = 'Loading party config...';
      const encounterStore = useEncounterStore();
      await encounterStore.loadConfig();

      status.value = 'ready';
      statusMessage.value = 'Ready.';
      initialized = true;
    } catch (e) {
      status.value = 'error';
      error.value = e instanceof Error ? e.message : String(e);
      statusMessage.value = 'Database initialization failed';
    }
  }

  async function retry(): Promise<void> {
    initialized = false;
    await initialize();
  }

  return {
    status,
    statusMessage,
    error,
    initialize,
    retry,
  };
}
