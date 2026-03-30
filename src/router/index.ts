import { createRouter, createWebHistory } from 'vue-router';
import CombatView from '@/views/CombatView.vue';
import SyncView from '@/views/SyncView.vue';
import CompendiumView from '@/views/CompendiumView.vue';
import EncounterView from '@/views/EncounterView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/combat' },
    { path: '/combat', name: 'combat', component: CombatView },
    { path: '/sync', name: 'sync', component: SyncView },
    { path: '/compendium', name: 'compendium', component: CompendiumView },
    { path: '/encounter', name: 'encounter', component: EncounterView },
  ],
});

export default router;
