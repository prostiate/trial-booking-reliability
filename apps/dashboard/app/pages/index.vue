<script setup lang="ts">
import { CreateCheckoutInputSchema, type SeatNumber } from '@trial-booking/shared';
import { useBookingStore } from '~/stores/booking';

const bookingStore = useBookingStore();

await useAsyncData('booking-catalog', () => bookingStore.fetchCatalog());

const formState = reactive({
  parentId: bookingStore.selectedParentId,
  studentId: bookingStore.selectedStudentId,
  trialClassId: bookingStore.selectedClassId,
  seatNumber: bookingStore.selectedSeatNumber,
});

watch(
  () => [
    bookingStore.selectedParentId,
    bookingStore.selectedStudentId,
    bookingStore.selectedClassId,
    bookingStore.selectedSeatNumber,
  ],
  ([p, s, c, seat]) => {
    formState.parentId = String(p);
    formState.studentId = String(s);
    formState.trialClassId = String(c);
    formState.seatNumber = Number(seat) as SeatNumber;
  }
);

const parentOptions = computed(() =>
  bookingStore.parents.map((p) => ({
    label: `${p.name} (${p.email})`,
    value: p.id,
  }))
);

const studentOptions = computed(() =>
  bookingStore.filteredStudents.map((s) => ({
    label: `${s.name} (${s.gradeLevel})`,
    value: s.id,
  }))
);

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

async function handleConfirmSeat() {
  const parsed = CreateCheckoutInputSchema.safeParse({
    parentId: bookingStore.selectedParentId,
    studentId: bookingStore.selectedStudentId,
    trialClassId: bookingStore.selectedClassId,
    seatNumber: bookingStore.selectedSeatNumber,
  });
  if (!parsed.success) return;
  await bookingStore.submitBookingAction('hold_pending');
}
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
    <div class="lg:col-span-8 space-y-4">
      <div
        v-if="bookingStore.lastOutcome"
        class="rounded-xl border-2 p-4 shadow-xs transition-all"
        :class="
          bookingStore.lastOutcome.ok
            ? 'border-emerald-500 bg-emerald-50 text-slate-900'
            : 'border-rose-500 bg-rose-50 text-slate-900'
        ">
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-1.5">
            <div class="flex flex-wrap items-center gap-2">
              <UBadge
                :color="bookingStore.lastOutcome.ok ? 'success' : 'error'"
                variant="solid"
                size="sm">
                HTTP {{ bookingStore.lastOutcome.httpStatus }} ·
                {{
                  bookingStore.lastOutcome.errorCode ??
                  bookingStore.lastOutcome.booking?.status?.toUpperCase() ??
                  'OK'
                }}
              </UBadge>
              <span class="text-xs font-mono font-semibold text-slate-700">
                Executed: {{ formatMillisecondTimestamp(bookingStore.lastOutcome.executedAt) }}
              </span>
            </div>

            <p class="text-sm font-semibold text-slate-900">
              {{ bookingStore.lastOutcome.message }}
            </p>

            <div
              v-if="bookingStore.lastOutcome.batchItems?.length"
              class="mt-2 space-y-1.5 pt-2 border-t border-slate-300">
              <div
                v-for="item in bookingStore.lastOutcome.batchItems"
                :key="item.bookingId"
                class="rounded-lg bg-white/90 border border-slate-200 p-2.5 text-xs space-y-1">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <span class="font-bold text-slate-900">
                    {{ item.studentName }} (Seat #{{ item.seatNumber }})
                  </span>
                  <UBadge :color="item.ok ? 'success' : 'error'" variant="subtle" size="xs">
                    HTTP {{ item.httpStatus }} · {{ item.errorCode ?? item.status.toUpperCase() }}
                  </UBadge>
                </div>
                <div class="font-mono text-[11px] text-slate-600">
                  Hold Created: {{ formatMillisecondTimestamp(item.holdCreatedAt) }} · Payment
                  Executed: {{ formatMillisecondTimestamp(item.paymentExecutedAt) }}
                </div>
                <div class="font-medium text-slate-800">{{ item.message }}</div>
              </div>
            </div>
          </div>

          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-x"
            @click="bookingStore.lastOutcome = null" />
        </div>
      </div>

      <UForm :schema="CreateCheckoutInputSchema" :state="formState" class="space-y-4">
        <UCard>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UFormField label="Parent" name="parentId">
              <USelect
                :model-value="bookingStore.selectedParentId"
                :items="parentOptions"
                value-key="value"
                label-key="label"
                class="w-full"
                @update:model-value="(v) => (bookingStore.selectedParentId = String(v))" />
            </UFormField>

            <UFormField label="Child" name="studentId">
              <USelect
                :model-value="bookingStore.selectedStudentId"
                :items="studentOptions"
                value-key="value"
                label-key="label"
                class="w-full"
                @update:model-value="(v) => (bookingStore.selectedStudentId = String(v))" />
            </UFormField>
          </div>
        </UCard>

        <ClassroomSeatPicker
          :classes="bookingStore.classes"
          :selected-class-id="bookingStore.selectedClassId"
          :selected-seat-number="bookingStore.selectedSeatNumber"
          @update:selected-class-id="(id) => (bookingStore.selectedClassId = id)"
          @update:selected-seat-number="(seat) => (bookingStore.selectedSeatNumber = seat)" />

        <UCard>
          <div class="flex items-center justify-between gap-3">
            <span class="text-xs font-medium text-slate-600">
              Selected Seat #{{ bookingStore.selectedSeatNumber }} ·
              {{ bookingStore.selectedClass?.title }}
            </span>

            <UButton
              color="primary"
              size="sm"
              icon="i-lucide-check-circle-2"
              :loading="bookingStore.isLoading"
              @click="handleConfirmSeat">
              Confirm Seat
            </UButton>
          </div>
        </UCard>
      </UForm>
    </div>

    <div class="lg:col-span-4">
      <PendingCheckoutsDock
        :selected-class-title="bookingStore.selectedClass?.title ?? 'Selected Class'"
        :pending-checkouts="bookingStore.selectedClassPendingCheckouts"
        :is-loading="bookingStore.isLoading"
        @complete-payment="(id, outcome) => bookingStore.completePendingPayment(id, outcome)"
        @cancel-booking="(id) => bookingStore.cancelPendingBooking(id)"
        @pay-all="(outcomes) => bookingStore.payAllPendingForSelectedClass(outcomes)"
        @cancel-all="() => bookingStore.cancelAllPendingForSelectedClass()" />
    </div>
  </div>
</template>
