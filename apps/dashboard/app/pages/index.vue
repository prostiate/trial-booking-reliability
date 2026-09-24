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

async function handleAction(action: 'pay_success' | 'pay_fail' | 'hold_pending') {
  const parsed = CreateCheckoutInputSchema.safeParse({
    parentId: bookingStore.selectedParentId,
    studentId: bookingStore.selectedStudentId,
    trialClassId: bookingStore.selectedClassId,
    seatNumber: bookingStore.selectedSeatNumber,
  });
  if (!parsed.success) return;
  await bookingStore.submitBookingAction(action);
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
          <div class="flex flex-wrap items-center gap-2.5">
            <UButton
              color="primary"
              size="sm"
              icon="i-lucide-credit-card"
              :loading="bookingStore.isLoading"
              @click="handleAction('pay_success')">
              Pay &amp; Confirm (Rp 75.000)
            </UButton>

            <UButton
              color="warning"
              variant="subtle"
              size="sm"
              icon="i-lucide-clock"
              :loading="bookingStore.isLoading"
              @click="handleAction('hold_pending')">
              Hold in Pending Checkout
            </UButton>

            <UButton
              color="error"
              variant="subtle"
              size="sm"
              icon="i-lucide-alert-circle"
              :loading="bookingStore.isLoading"
              @click="handleAction('pay_fail')">
              Simulate Card Decline
            </UButton>
          </div>
        </UCard>
      </UForm>
    </div>

    <div class="lg:col-span-4">
      <PendingCheckoutsDock
        :pending-checkouts="bookingStore.pendingCheckouts"
        :last-outcome="bookingStore.lastOutcome"
        :is-loading="bookingStore.isLoading"
        @complete-payment="(id) => bookingStore.completePendingPayment(id, 'success')" />
    </div>
  </div>
</template>
