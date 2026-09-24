<script setup lang="ts">
import type { ClassCatalogItem, SeatNumber } from '@trial-booking/shared';

const props = defineProps<{
  classes: ClassCatalogItem[];
  selectedClassId: string;
  selectedSeatNumber: SeatNumber;
}>();

const emit = defineEmits<{
  'update:selectedClassId': [value: string];
  'update:selectedSeatNumber': [value: SeatNumber];
}>();

const currentClass = computed(
  () => props.classes.find((c) => c.id === props.selectedClassId) ?? null
);

const classOptions = computed(() =>
  props.classes.map((c) => ({
    label: `${c.title} · Rp ${c.priceIdr.toLocaleString('id-ID')} (${c.confirmedCount}/${c.maxCapacity} Seats)`,
    value: c.id,
  }))
);

function selectSeat(seatNumber: SeatNumber, isConfirmed: boolean) {
  if (isConfirmed) return;
  emit('update:selectedSeatNumber', seatNumber);
}
</script>

<template>
  <UCard>
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-700">Trial Class &amp; Seat</span>
        <UBadge
          v-if="currentClass"
          :color="currentClass.isFull ? 'error' : 'warning'"
          variant="subtle"
          size="sm">
          {{ currentClass.confirmedCount }} / {{ currentClass.maxCapacity }} Confirmed
        </UBadge>
      </div>

      <USelect
        :model-value="selectedClassId"
        :items="classOptions"
        value-key="value"
        label-key="label"
        class="w-full"
        @update:model-value="(val) => emit('update:selectedClassId', String(val))" />

      <div v-if="currentClass" class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        <button
          v-for="seat in currentClass.seats"
          :key="seat.seatNumber"
          type="button"
          :disabled="seat.isConfirmed"
          class="p-2.5 rounded-lg border text-left transition-all"
          :class="[
            seat.isConfirmed
              ? 'border-slate-200 bg-slate-100 cursor-not-allowed'
              : selectedSeatNumber === seat.seatNumber
                ? 'border-2 border-blue-700 bg-blue-50'
                : 'border-slate-200 bg-white hover:border-blue-400',
          ]"
          @click="selectSeat(seat.seatNumber, seat.isConfirmed)">
          <div
            class="text-xs font-bold"
            :class="
              seat.isConfirmed
                ? 'text-slate-500'
                : selectedSeatNumber === seat.seatNumber
                  ? 'text-blue-800'
                  : 'text-slate-700'
            ">
            Seat {{ seat.seatNumber }}
          </div>
          <div class="text-xs font-semibold text-slate-900 mt-1 truncate">
            {{ seat.isConfirmed ? seat.confirmedStudentName : 'Available' }}
          </div>
          <div class="mt-1 flex flex-wrap gap-1">
            <span
              v-if="seat.isConfirmed"
              class="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
              Confirmed
            </span>
            <span
              v-else-if="selectedSeatNumber === seat.seatNumber"
              class="inline-block px-1.5 py-0.5 rounded bg-blue-700 text-white text-[11px] font-semibold">
              Selected
            </span>
            <span
              v-if="!seat.isConfirmed && seat.pendingCheckoutCount > 0"
              class="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] font-semibold">
              {{ seat.pendingCheckoutCount }} Pending
            </span>
          </div>
        </button>
      </div>
    </div>
  </UCard>
</template>
