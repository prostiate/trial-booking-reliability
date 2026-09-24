<script setup lang="ts">
import type { EnrichedBooking } from '@trial-booking/shared';

defineProps<{
  selectedClassTitle: string;
  pendingCheckouts: EnrichedBooking[];
  isLoading: boolean;
}>();

const emit = defineEmits<{
  completePayment: [bookingId: string, outcome: 'success' | 'fail'];
  cancelBooking: [bookingId: string];
  payAll: [outcomesByBookingId: Record<string, 'success' | 'fail'>];
  cancelAll: [];
}>();

const selectedOutcomeByBooking = reactive<Record<string, 'success' | 'fail'>>({});

function getOutcome(bookingId: string): 'success' | 'fail' {
  return selectedOutcomeByBooking[bookingId] ?? 'success';
}

function setOutcome(bookingId: string, value: string) {
  selectedOutcomeByBooking[bookingId] = value === 'fail' ? 'fail' : 'success';
}

function formatMillisecondTimestamp(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const sss = String(d.getMilliseconds()).padStart(3, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}.${sss}`;
}

const cardOptions = [
  { label: 'Visa •••• 4242 (Pay & Confirm)', value: 'success' },
  { label: 'Card •••• 0002 (Simulate Decline)', value: 'fail' },
];
</script>

<template>
  <UCard>
    <div class="space-y-3">
      <div class="flex items-center justify-between gap-2">
        <div>
          <div class="text-xs font-bold text-slate-900">Pending Checkouts</div>
          <div class="text-[11px] font-medium text-slate-500">{{ selectedClassTitle }}</div>
        </div>
        <UBadge color="warning" variant="subtle" size="sm">
          {{ pendingCheckouts.length }}
        </UBadge>
      </div>

      <div v-if="pendingCheckouts.length > 0" class="grid grid-cols-2 gap-2 pt-1">
        <UButton
          color="primary"
          variant="solid"
          size="xs"
          icon="i-lucide-check-check"
          block
          :loading="isLoading"
          @click="emit('payAll', { ...selectedOutcomeByBooking })">
          Pay All ({{ pendingCheckouts.length }})
        </UButton>

        <UButton
          color="error"
          variant="subtle"
          size="xs"
          icon="i-lucide-trash-2"
          block
          :loading="isLoading"
          @click="emit('cancelAll')">
          Cancel All ({{ pendingCheckouts.length }})
        </UButton>
      </div>

      <div v-if="pendingCheckouts.length === 0" class="text-xs text-slate-500 py-2">
        No pending checkouts for {{ selectedClassTitle }}. Select a seat and click Confirm Seat.
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

        <div class="flex items-center justify-between text-[11px] font-mono text-slate-600">
          <span>Hold: {{ formatMillisecondTimestamp(item.createdAt) }}</span>
          <span class="font-sans font-semibold text-slate-800">
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
    </div>
  </UCard>
</template>
