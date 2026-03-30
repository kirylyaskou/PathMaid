<script setup lang="ts">
</script>

<template>
  <aside class="w-[180px] flex-shrink-0 h-full bg-charcoal-600 border-r border-charcoal-500 flex flex-col">
    <!-- Brand header -->
    <div class="h-16 flex items-center gap-2 px-4">
      <!-- Shield icon -->
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="w-4 h-4 text-gold"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M8 1L2 3.5v4C2 11 5 14 8 15c3-1 6-4 6-7.5v-4L8 1z" />
      </svg>
      <span class="text-sm font-display text-gold">Pathbuddy</span>
    </div>

    <!-- Nav items -->
    <nav class="flex flex-col">
      <RouterLink
        to="/combat"
        class="flex items-center gap-3 h-10 px-4 text-sm text-stone-300 hover:bg-charcoal-700 hover:text-stone-100 transition-colors"
        active-class="border-l-2 border-gold text-gold bg-charcoal-700"
      >
        <!-- Sword icon -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-4 h-4 text-stone-400"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <path d="M13 1L2 12M13 1h-3M13 1v3M9 5L7 7M5 11l-1 1a1 1 0 01-1 0l-1-1a1 1 0 010-1l1-1" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>Combat Tracker</span>
      </RouterLink>

      <RouterLink
        to="/compendium"
        class="flex items-center gap-3 h-10 px-4 text-sm text-stone-300 hover:bg-charcoal-700 hover:text-stone-100 transition-colors"
        active-class="border-l-2 border-gold text-gold bg-charcoal-700"
      >
        <!-- Book icon -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-4 h-4 text-stone-400"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <path d="M2 2.5h4a2 2 0 012 2v9a1.5 1.5 0 00-1.5-1.5H2V2.5zM14 2.5h-4a2 2 0 00-2 2v9a1.5 1.5 0 011.5-1.5H14V2.5z" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>Compendium</span>
      </RouterLink>

      <RouterLink
        to="/encounter"
        class="flex items-center gap-3 h-10 px-4 text-sm text-stone-300 hover:bg-charcoal-700 hover:text-stone-100 transition-colors"
        active-class="border-l-2 border-gold text-gold bg-charcoal-700"
      >
        <!-- Crosshairs icon -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-4 h-4 text-stone-400"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <path d="M8 1v2M8 13v2M1 8h2M13 8h2M8 5a3 3 0 100 6 3 3 0 000-6z" />
        </svg>
        <span>Encounter</span>
      </RouterLink>

      <RouterLink
        to="/sync"
        class="flex items-center gap-3 h-10 px-4 text-sm text-stone-300 hover:bg-charcoal-700 hover:text-stone-100 transition-colors"
        active-class="border-l-2 border-gold text-gold bg-charcoal-700"
      >
        <!-- Arrows-clockwise / refresh icon -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-4 h-4 text-stone-400"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <path d="M13.5 8A5.5 5.5 0 112.5 5.5" stroke-linecap="round" />
          <path d="M2.5 2.5v3h3" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>Sync Data</span>
      </RouterLink>
    </nav>

    <!-- Version footer -->
    <div class="mt-auto pb-4 px-4 text-xs text-stone-500">
      v1.1
    </div>
  </aside>
</template>
