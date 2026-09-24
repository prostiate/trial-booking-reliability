<script setup lang="ts">
import type { EnrichedBooking } from '@trial-booking/shared';
import type { OutcomeNotice } from '~/stores/booking';

defineProps<{
  pendingCheckouts: EnrichedBooking[];
  lastOutcome: OutcomeNotice | null;
  isLoading: boolean;
}>();

const emit = defineEmits<{
  completePayment: [bookingId: string, outcome: 'success' | 'fail'];
  cancelBooking: [bookingId: string];
}>();

const selectedOutcomeByBooking = reactive<Record<string, 'success' | 'fail'>>({});

function getOutcome(bookingId: string): 'success' | 'fail' {
  return selectedOutcomeByBooking[bookingId] ?? 'success';
}

function setOutcome(bookingId: string, value: string) {
  selectedOutcomeByBooking[bookingId] = value === 'fail' ? 'fail' : 'success';
}

const cardOptions = [
  { label: 'Visa •••• 4242 (Pay & Confirm)', value: 'success' },
  { label: 'Card •••• 0002 (Simulate Decline)', value: 'fail' },
];
</script>

<template>
  <UCard>
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold text-slate-900">Pending Checkouts</span>
        <UBadge color="warning" variant="subtle" size="sm">
          {{ pendingCheckouts.length }}
        </UBadge>
      </div>

      <div v-if="pendingCheckouts.length === 0" class="text-xs text-slate-500 py-2">
        Select a seat and click Confirm Seat to start checkout.
      </div>

      <div
        v-for="item in pendingCheckouts"
        :key="item.id"
        class="p-3 rounded-lg border border-amber-300 bg-amber-50/60 space-y-2.5">
        <div class="flex items-center justify-between text-xs gap-2">
          <span class="font-bold text-slate-900">
            {{ item.studentName }} · Seat {{ item.seatNumber }}
          </span>
          <BookingStatusBadge :status="item.status" />
        </div>

        <div class="flex items-center justify-between text-xs text-slate-600">
          <span>{{ item.classTitle }}</span>
          <span class="font-semibold text-slate-800">
            Rp {{ item.priceIdr.toLocaleString('id-ID') }}
          </span>
        </div>

        <USelect
          :model-value="getOutcome(item.id)"
          :items="cardOptions"
          value-key="value"
          label-key="label"
          size="xs"
          class="w-full"
          @update:model-value="(v) => setOutcome(item.id, String(v))" />

        <div class="grid grid-cols-2 gap-2">
          <UButton
            color="primary"
            variant="solid"
            size="xs"
            icon="i-lucide-credit-card"
            block
            :loading="isLoading"
            @click="emit('completePayment', item.id, getOutcome(item.id))">
            Pay
          </UButton>

          <UButton
            color="error"
            variant="subtle"
            size="xs"
            icon="i-lucide-x"
            block
            :loading="isLoading"
            @click="emit('cancelBooking', item.id)">
            Cancel
          </UButton>
        </div>
      </div>

      <UAlert
        v-if="lastOutcome"
        :color="lastOutcome.ok ? 'success' : 'error'"
        variant="subtle"
        :title="
          lastOutcome.errorCode
            ? `${lastOutcome.httpStatus} · ${lastOutcome.errorCode}`
            : `${lastOutcome.httpStatus} · ${lastOutcome.booking?.status?.toUpperCase() ?? 'OK'}`
        "
        :description="lastOutcome.message" />
    </div>
  </UCard>
</template>
