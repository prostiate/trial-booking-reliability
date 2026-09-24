<script setup lang="ts">
import {
  CreateTrialClassInputSchema,
  type ClassCatalogItem,
  type CreateTrialClassInput,
  type EnrichedBooking,
} from '@trial-booking/shared';
import { useApiClient } from '~/composables/useApiClient';
import { useBookingStore } from '~/stores/booking';

interface ClassRosterGroup {
  trialClass: ClassCatalogItem;
  confirmedCount: number;
  maxCapacity: number;
  confirmedRoster: EnrichedBooking[];
  nonRosterAttempts: EnrichedBooking[];
}

const api = useApiClient();
const bookingStore = useBookingStore();
const rosters = ref<ClassRosterGroup[]>([]);
const isLoading = ref(false);
const showAddClass = ref(false);

const newClassForm = reactive<CreateTrialClassInput>({
  title: 'Robotics & Sensors Lab',
  subject: 'Science',
  gradeRange: 'Grade 4-5',
  teacherName: 'Kak Rina Putri',
  scheduledAt: '2026-10-01T10:00:00.000Z',
  durationMinutes: 45,
  priceIdr: 75000,
});

const subjectOptions = [
  { label: 'Math', value: 'Math' },
  { label: 'Science', value: 'Science' },
];

async function fetchRosters() {
  isLoading.value = true;
  try {
    const res = await api.api.rosters.$get();
    const body = await res.json();
    if (body.ok) {
      rosters.value = body.data;
    }
  } finally {
    isLoading.value = false;
  }
}

async function handleCreateClass() {
  const parsed = CreateTrialClassInputSchema.safeParse(newClassForm);
  if (!parsed.success) return;
  const res = await bookingStore.createTrialClass(parsed.data);
  if (res.ok) {
    showAddClass.value = false;
    await fetchRosters();
  }
}

await useAsyncData('class-rosters', () => fetchRosters());
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-bold text-slate-900">
        Live Class Rosters ({{ rosters.length }} Classes · Max 4 Confirmed Students/Class)
      </span>
      <UButton
        color="primary"
        size="xs"
        :icon="showAddClass ? 'i-lucide-x' : 'i-lucide-plus'"
        @click="showAddClass = !showAddClass">
        {{ showAddClass ? 'Close' : 'Add Class' }}
      </UButton>
    </div>

    <UCard v-if="showAddClass">
      <UForm
        :schema="CreateTrialClassInputSchema"
        :state="newClassForm"
        class="space-y-3"
        @submit="handleCreateClass">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <UFormField label="Class Title" name="title">
            <UInput v-model="newClassForm.title" size="xs" class="w-full" />
          </UFormField>

          <UFormField label="Subject" name="subject">
            <USelect
              v-model="newClassForm.subject"
              :items="subjectOptions"
              value-key="value"
              label-key="label"
              size="xs"
              class="w-full" />
          </UFormField>

          <UFormField label="Grade Range" name="gradeRange">
            <UInput v-model="newClassForm.gradeRange" size="xs" class="w-full" />
          </UFormField>

          <UFormField label="Teacher Name" name="teacherName">
            <UInput v-model="newClassForm.teacherName" size="xs" class="w-full" />
          </UFormField>

          <UFormField label="Schedule (ISO)" name="scheduledAt">
            <UInput v-model="newClassForm.scheduledAt" size="xs" class="w-full" />
          </UFormField>

          <UFormField label="Price (IDR)" name="priceIdr">
            <UInput v-model.number="newClassForm.priceIdr" type="number" size="xs" class="w-full" />
          </UFormField>
        </div>

        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="subtle" size="xs" @click="showAddClass = false">
            Cancel
          </UButton>
          <UButton
            type="submit"
            color="primary"
            size="xs"
            icon="i-lucide-check"
            :loading="bookingStore.isLoading">
            Save Class
          </UButton>
        </div>
      </UForm>
    </UCard>

    <div
      v-for="group in rosters"
      :key="group.trialClass.id"
      class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <UCard class="lg:col-span-8">
        <div class="space-y-3">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-bold text-slate-900">
              {{ group.trialClass.title }} ({{ group.trialClass.teacherName }})
            </span>
            <UBadge
              :color="group.confirmedCount >= group.maxCapacity ? 'success' : 'primary'"
              variant="subtle"
              size="sm">
              {{ group.confirmedCount }} / {{ group.maxCapacity }} Confirmed
            </UBadge>
          </div>

          <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              class="bg-emerald-600 h-2 transition-all"
              :style="{ width: `${(group.confirmedCount / group.maxCapacity) * 100}%` }" />
          </div>

          <div class="overflow-x-auto border border-slate-200 rounded-lg">
            <table class="w-full text-xs text-left">
              <thead class="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th class="py-2 px-3">Seat</th>
                  <th class="py-2 px-3">Student</th>
                  <th class="py-2 px-3">Parent</th>
                  <th class="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                <tr v-for="row in group.confirmedRoster" :key="row.id">
                  <td class="py-2 px-3 font-bold text-slate-900">Seat {{ row.seatNumber }}</td>
                  <td class="py-2 px-3 font-medium text-slate-900">{{ row.studentName }}</td>
                  <td class="py-2 px-3 text-slate-600">{{ row.parentName }}</td>
                  <td class="py-2 px-3">
                    <BookingStatusBadge :status="row.status" />
                  </td>
                </tr>
                <tr v-if="group.confirmedRoster.length === 0">
                  <td colspan="4" class="py-4 text-center text-slate-500">
                    No confirmed students yet.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </UCard>

      <UCard class="lg:col-span-4">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-900">Excluded Attempts</span>
            <UBadge color="neutral" variant="subtle" size="sm">Not on Roster</UBadge>
          </div>

          <div v-if="group.nonRosterAttempts.length === 0" class="text-xs text-slate-500 py-2">
            None
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="attempt in group.nonRosterAttempts"
              :key="attempt.id"
              class="p-2.5 rounded border border-slate-200 bg-slate-50 flex justify-between items-center gap-2 text-xs">
              <div>
                <div class="font-bold text-slate-900">
                  {{ attempt.studentName }} (Seat {{ attempt.seatNumber }})
                </div>
                <div class="font-mono text-[11px] text-slate-600">
                  {{ attempt.conflictReason || attempt.status }}
                </div>
              </div>
              <BookingStatusBadge :status="attempt.status" />
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
