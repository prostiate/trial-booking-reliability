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
        :last-outcome="bookingStore.lastOutcome"
        :is-loading="bookingStore.isLoading"
        @complete-payment="(id, outcome) => bookingStore.completePendingPayment(id, outcome)"
        @cancel-booking="(id) => bookingStore.cancelPendingBooking(id)"
        @pay-all="(outcomes) => bookingStore.payAllPendingForSelectedClass(outcomes)"
        @cancel-all="() => bookingStore.cancelAllPendingForSelectedClass()" />
    </div>
  </div>
</template>
