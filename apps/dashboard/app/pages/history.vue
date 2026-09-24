<script setup lang="ts">
import { BOOKING_STATUSES, type EnrichedBooking } from '@trial-booking/shared';
import { useApiClient } from '~/composables/useApiClient';
import { useBookingStore } from '~/stores/booking';
import { formatMillisecondTimestamp } from '~/utils/date';

const api = useApiClient();
const bookingStore = useBookingStore();

const page = ref(1);
const limit = ref(100);
const statusFilter = ref<string>('all');
const classFilter = ref<string>('all');

const items = ref<EnrichedBooking[]>([]);
const total = ref(0);
const totalPages = ref(1);

const statusOptions = [
  { label: 'All Statuses', value: 'all' },
  ...BOOKING_STATUSES.map((s) => ({ label: s, value: s })),
];

const classOptions = computed(() => [
  { label: 'All Classes', value: 'all' },
  ...bookingStore.classes.map((c) => ({ label: c.title, value: c.id })),
]);

const pageSizeOptions = [
  { label: '10 / page', value: 10 },
  { label: '25 / page', value: 25 },
  { label: '50 / page', value: 50 },
  { label: '100 / page', value: 100 },
  { label: '200 / page', value: 200 },
];

async function fetchHistory() {
  if (bookingStore.classes.length === 0) {
    await bookingStore.fetchCatalog();
  }
  const res = await api.api.bookings.$get({
    query: {
      page: String(page.value),
      limit: String(limit.value),
      status: statusFilter.value,
      trialClassId: classFilter.value,
      parentId: 'all',
    },
  });
  const body = await res.json();
  if (body.ok) {
    items.value = body.data.items;
    total.value = body.data.pagination.total;
    totalPages.value = body.data.pagination.totalPages;
  }
}

watch([page, limit, statusFilter, classFilter], () => {
  fetchHistory();
});

await useAsyncData('booking-history', () => fetchHistory());
</script>

<template>
  <UCard>
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <USelect
            v-model="statusFilter"
            :items="statusOptions"
            value-key="value"
            label-key="label"
            size="xs"
            class="w-44"
            @update:model-value="page = 1" />

          <USelect
            v-model="classFilter"
            :items="classOptions"
            value-key="value"
            label-key="label"
            size="xs"
            class="w-56"
            @update:model-value="page = 1" />

          <USelect
            :model-value="limit"
            :items="pageSizeOptions"
            value-key="value"
            label-key="label"
            size="xs"
            class="w-32"
            @update:model-value="
              (v) => {
                limit = Number(v);
                page = 1;
              }
            " />
        </div>

        <span class="text-xs font-medium text-slate-600">
          Page {{ page }} of {{ totalPages }} ({{ total }} rows)
        </span>
      </div>

      <div class="overflow-x-auto border border-slate-200 rounded-lg">
        <table class="w-full text-xs text-left">
          <thead class="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th class="py-2.5 px-3">Booking ID</th>
              <th class="py-2.5 px-3">Student</th>
              <th class="py-2.5 px-3">Class</th>
              <th class="py-2.5 px-3">Seat</th>
              <th class="py-2.5 px-3">Booking Status</th>
              <th class="py-2.5 px-3">Payment Attempt</th>
              <th class="py-2.5 px-3">Updated</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="row in items" :key="row.id">
              <td class="py-2.5 px-3 tabular-nums text-slate-700">{{ row.id }}</td>
              <td class="py-2.5 px-3 font-semibold text-slate-900">{{ row.studentName }}</td>
              <td class="py-2.5 px-3 text-slate-700">{{ row.classTitle }}</td>
              <td class="py-2.5 px-3 font-semibold text-slate-800">Seat {{ row.seatNumber }}</td>
              <td class="py-2.5 px-3">
                <BookingStatusBadge :status="row.status" />
              </td>
              <td class="py-2.5 px-3 tabular-nums">
                <span v-if="row.paymentAttempts.length > 0" class="text-slate-700">
                  {{ row.paymentAttempts[row.paymentAttempts.length - 1]?.status }} · Rp
                  {{
                    row.paymentAttempts[row.paymentAttempts.length - 1]?.amountIdr.toLocaleString(
                      'id-ID'
                    )
                  }}
                </span>
                <span v-else class="text-slate-500">awaiting_payment</span>
              </td>
              <td class="py-2.5 px-3 tabular-nums text-slate-500">
                {{ formatMillisecondTimestamp(row.updatedAt) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex justify-end">
        <UPagination v-model:page="page" :total="total" :items-per-page="limit" size="xs" />
      </div>
    </div>
  </UCard>
</template>
