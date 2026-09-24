<script setup lang="ts">
import { useBookingStore } from '~/stores/booking';

const route = useRoute();
const bookingStore = useBookingStore();

const navItems = [
  { label: '1. Book Trial', to: '/' },
  { label: '2. Class Roster', to: '/roster' },
  { label: '3. History', to: '/history' },
  { label: '4. Simulator', to: '/simulator' },
];

async function handleReset() {
  await bookingStore.resetStoreData();
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <header class="border-b border-slate-200 bg-white sticky top-0 z-30">
      <div class="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <div class="flex items-center gap-6">
          <NuxtLink to="/" class="flex items-center gap-2.5">
            <div
              class="w-8 h-8 rounded-lg bg-blue-700 text-white font-bold flex items-center justify-center text-xs">
              OT
            </div>
            <span class="font-bold text-sm text-slate-900">Ottodot Trial Booking</span>
          </NuxtLink>

          <nav class="flex items-center gap-1 text-xs font-semibold">
            <NuxtLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="px-3 py-1.5 rounded-md transition-colors"
              :class="
                route.path === item.to
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100'
              ">
              {{ item.label }}
            </NuxtLink>
          </nav>
        </div>

        <UButton
          color="neutral"
          variant="outline"
          size="xs"
          icon="i-lucide-rotate-ccw"
          :loading="bookingStore.isLoading"
          @click="handleReset">
          Reset Data
        </UButton>
      </div>
    </header>

    <main class="max-w-6xl mx-auto px-6 py-8">
      <slot />
    </main>
  </div>
</template>
