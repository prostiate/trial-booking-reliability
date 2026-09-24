<script setup lang="ts">
import type { SimulatorScenario, SimulatorStepEvent } from '@trial-booking/shared';
import { useApiClient } from '~/composables/useApiClient';
import { useBookingStore } from '~/stores/booking';

const api = useApiClient();
const bookingStore = useBookingStore();

const activeScenario = ref<SimulatorScenario>('last_seat_race');
const steps = ref<SimulatorStepEvent[]>([]);
const finalConfirmedCount = ref(4);
const maxCapacity = ref(4);
const isRunning = ref(false);

const scenarios: Array<{ id: SimulatorScenario; label: string }> = [
  { id: 'last_seat_race', label: '1. Last-Seat Race (Seat 4)' },
  { id: 'duplicate_booking', label: '2. Duplicate Child + Class' },
  { id: 'overbooking_guard', label: '3. Overbooking (>4 Cap)' },
  { id: 'payment_failure', label: '4. Payment Card Decline' },
];

async function runScenario(scenario: SimulatorScenario) {
  activeScenario.value = scenario;
  isRunning.value = true;
  try {
    const res = await api.api.simulator.run.$post({
      json: {
        scenario,
        resetBeforeRun: true,
      },
    });
    const body = await res.json();
    if (body.ok) {
      steps.value = body.data.steps;
      finalConfirmedCount.value = body.data.finalConfirmedCount;
      maxCapacity.value = body.data.maxCapacity;
      await bookingStore.fetchCatalog();
    }
  } finally {
    isRunning.value = false;
  }
}

await useAsyncData('initial-simulation', () => runScenario('last_seat_race'));
</script>

<template>
  <UCard>
    <div class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
        <button
          v-for="item in scenarios"
          :key="item.id"
          type="button"
          class="p-2.5 rounded-lg border text-xs font-bold text-left transition-colors"
          :class="
            activeScenario === item.id
              ? 'border-2 border-blue-700 bg-blue-50 text-blue-900'
              : 'border-slate-200 bg-white text-slate-800 hover:border-blue-400'
          "
          :disabled="isRunning"
          @click="runScenario(item.id)">
          {{ item.label }}
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          v-for="step in steps"
          :key="step.stepNumber"
          class="p-3 rounded-lg border space-y-2 text-xs"
          :class="
            step.httpStatus >= 400
              ? 'border-rose-300 bg-rose-50/50'
              : step.nextStatus === 'confirmed'
                ? 'border-emerald-300 bg-emerald-50/50'
                : 'border-slate-200 bg-slate-50'
          ">
          <div class="flex items-center justify-between font-mono text-[11px] font-bold">
            <span class="text-slate-600">STEP {{ step.stepNumber }} · {{ step.httpStatus }}</span>
            <span class="text-slate-700">
              {{ step.confirmedRosterCount }}/{{ step.maxCapacity }} Roster
            </span>
          </div>

          <div class="font-bold text-slate-900">{{ step.actor }}</div>
          <div class="text-slate-700">{{ step.action }}</div>

          <div class="flex items-center justify-between pt-1">
            <BookingStatusBadge :status="step.nextStatus" />
            <span v-if="step.errorCode" class="font-mono text-[11px] font-bold text-rose-700">
              {{ step.errorCode }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
