<script setup lang="ts">
import { ref, watch } from 'vue';
import { useDatabase } from '@/composables/useDatabase';
import SplashScreen from '@/components/SplashScreen.vue';
import AppLayout from '@/components/AppLayout.vue';

const { status, statusMessage, error, initialize, retry } = useDatabase();
const showSplash = ref(true);

// Start DB init on setup (not onMounted — runs synchronously during component setup)
initialize();

// When ready, wait 300ms then hide splash
watch(status, (newStatus) => {
  if (newStatus === 'ready') {
    setTimeout(() => {
      showSplash.value = false;
    }, 300);
  }
});
</script>

<template>
  <SplashScreen
    v-if="showSplash"
    :status="status"
    :status-message="statusMessage"
    :error="error"
    @retry="retry"
  />
  <AppLayout v-else />
</template>
