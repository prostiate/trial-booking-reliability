<script setup lang="ts">
import type { EnrichedBooking } from '@trial-booking/shared';
import type { OutcomeNotice } from '~/stores/booking';

defineProps<{
  pendingCheckouts: EnrichedBooking[];
  lastOutcome: OutcomeNotice | null;
  isLoading: boolean;
}>();

const emit = defineEmits<{
  completePayment: [bookingId: string];
}>();
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
        No active pending checkouts.
      </div>

      <div
        v-for="item in pendingCheckouts"
        :key="item.id"
        class="p-3 rounded-lg border border-amber-300 bg-amber-50/60 space-y-2">
        <div class="flex items-center justify-between text-xs gap-2">
          <span class="font-bold text-slate-900">
            {{ item.studentName }} · Seat {{ item.seatNumber }}
          </span>
          <BookingStatusBadge :status="item.status" />
        </div>
        <div class="text-xs text-slate-600">{{ item.classTitle }}</div>
        <UButton
          color="neutral"
          variant="solid"
          size="xs"
          block
          :loading="isLoading"
          @click="emit('completePayment', item.id)">
          Complete Payment
        </UButton>
      </div>

      <UAlert
        v-if="lastOutcome"
        :color="lastOutcome.ok ? 'success' : 'error'"
        variant="subtle"
        :title="
          lastOutcome.errorCode
            ? `${lastOutcome.httpStatus} · ${lastOutcome.errorCode}`
            : `${lastOutcome.httpStatus} · CONFIRMED`
        "
        :description="lastOutcome.message" />
    </div>
  </UCard>
</template>
